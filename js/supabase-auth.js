/**
 * 호박 (Hobak) - Supabase Auth 로그인/회원가입 & 헤더/글쓰기 가드 (supabase-auth.js)
 */
(function () {
  'use strict';

  const cfg = window.HOBAK_SUPABASE_CONFIG;
  let sbClient = null;
  let currentUser = null;
  let currentProfile = null;
  let authMode = 'login'; // 'login' | 'signup'
  let pendingAfterLogin = null;

  function getClient() {
    if (sbClient) return sbClient;
    if (window.supabase && cfg && cfg.url && cfg.anonKey) {
      sbClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    }
    return sbClient;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function fetchOrCreateProfile(user) {
    const client = getClient();
    if (!client || !user) return null;

    const metaNick = (user.user_metadata && user.user_metadata.nickname) || '';
    const fallbackNick = metaNick.trim() || (user.email ? user.email.split('@')[0] : '호박이웃');

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        currentProfile = data;
        return data;
      }

      const { data: inserted } = await client
        .from('profiles')
        .upsert(
          {
            id: user.id,
            nickname: fallbackNick,
            region_name: '양정동',
            avatar_emoji: '🎃',
            manner_temp: 36.5
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      currentProfile = inserted || {
        id: user.id,
        nickname: fallbackNick,
        region_name: '양정동',
        avatar_emoji: '🎃',
        manner_temp: 36.5
      };
      return currentProfile;
    } catch (e) {
      currentProfile = {
        id: user.id,
        nickname: fallbackNick,
        region_name: '양정동',
        avatar_emoji: '🎃',
        manner_temp: 36.5
      };
      return currentProfile;
    }
  }

  // 오른쪽 상단 헤더 버튼 상태 전환 (로그인 전: [로그인]만, 로그인 후: [닉네임], [로그아웃]만)
  function renderHeaderAuthUI() {
    const navActions = document.querySelector('.hobak-nav-actions');
    if (!navActions) return;

    let slot = document.getElementById('hobakAuthSlot');
    if (!slot) {
      slot = document.createElement('span');
      slot.id = 'hobakAuthSlot';
      slot.className = 'hobak-auth-slot';
      navActions.appendChild(slot);
    }

    if (currentUser) {
      const nick =
        (currentProfile && currentProfile.nickname) ||
        (currentUser.user_metadata && currentUser.user_metadata.nickname) ||
        (currentUser.email ? currentUser.email.split('@')[0] : '호박이웃');
      const emoji = (currentProfile && currentProfile.avatar_emoji) || '🎃';

      slot.innerHTML = `
        <span class="hobak-user-chip" title="로그인된 계정">
          <span class="hobak-user-chip-emoji">${escapeHtml(emoji)}</span>
          <span>${escapeHtml(nick)}</span>
        </span>
        <button type="button" id="hobakLogoutBtn" class="hobak-auth-btn-logout">로그아웃</button>
      `;

      const logoutBtn = document.getElementById('hobakLogoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', handleSignOut);
      }
    } else {
      slot.innerHTML = `
        <button type="button" id="hobakLoginOpenBtn" class="hobak-auth-btn-login">로그인</button>
      `;

      const loginBtn = document.getElementById('hobakLoginOpenBtn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          pendingAfterLogin = null;
          openAuthModal('login', '이메일과 비밀번호로 호박에 로그인하세요.');
        });
      }
    }

    // 글쓰기 페이지(#sellerNicknameInput)가 있으면 로그인 사용자 닉네임 자동 반영
    syncWriteFormSellerInfo();
  }

  function syncWriteFormSellerInfo() {
    const nickInput = document.getElementById('sellerNicknameInput');
    if (!nickInput || !currentUser) return;

    const nick =
      (currentProfile && currentProfile.nickname) ||
      (currentUser.user_metadata && currentUser.user_metadata.nickname) ||
      '';
    if (nick) {
      nickInput.value = nick;
      nickInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function injectAuthModal() {
    if (document.getElementById('hobakAuthBackdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'hobakAuthBackdrop';
    backdrop.className = 'hobak-auth-backdrop';
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <div class="hobak-auth-modal" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
        <button type="button" class="auth-modal-close" id="authModalCloseBtn" aria-label="닫기">✕</button>
        <div class="auth-modal-brand" id="authModalTitle">
          <span>🎃</span>
          <span>호박 시작하기</span>
        </div>
        <p class="auth-modal-subtitle" id="authModalSubtitle">이메일과 비밀번호로 로그인하거나 회원가입하세요.</p>

        <div class="auth-tabs" role="tablist">
          <button type="button" class="auth-tab-btn active" id="authTabLogin" data-mode="login" role="tab">로그인</button>
          <button type="button" class="auth-tab-btn" id="authTabSignup" data-mode="signup" role="tab">회원가입</button>
        </div>

        <form id="hobakAuthForm" class="auth-form" novalidate>
          <div class="auth-field" id="authNicknameField" hidden>
            <label for="authNicknameInput" class="auth-label">닉네임 <span class="req">*</span></label>
            <input
              type="text"
              id="authNicknameInput"
              class="auth-input"
              maxlength="20"
              placeholder="이웃에게 보여질 닉네임 (예: 호박이웃)"
              autocomplete="nickname"
            />
          </div>

          <div class="auth-field">
            <label for="authEmailInput" class="auth-label">이메일 <span class="req">*</span></label>
            <input
              type="email"
              id="authEmailInput"
              class="auth-input"
              placeholder="example@email.com"
              autocomplete="email"
              required
            />
          </div>

          <div class="auth-field">
            <label for="authPasswordInput" class="auth-label">비밀번호 <span class="req">*</span></label>
            <input
              type="password"
              id="authPasswordInput"
              class="auth-input"
              placeholder="6자 이상 입력하세요"
              autocomplete="current-password"
              required
            />
          </div>

          <div id="authMessageBox" class="auth-message" hidden></div>

          <button type="submit" id="authSubmitBtn" class="auth-submit-btn">로그인</button>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);

    const closeBtn = document.getElementById('authModalCloseBtn');
    const tabLogin = document.getElementById('authTabLogin');
    const tabSignup = document.getElementById('authTabSignup');
    const form = document.getElementById('hobakAuthForm');

    closeBtn.addEventListener('click', closeAuthModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeAuthModal();
    });

    tabLogin.addEventListener('click', () => setAuthMode('login'));
    tabSignup.addEventListener('click', () => setAuthMode('signup'));
    form.addEventListener('submit', handleAuthSubmit);
  }

  function setAuthMode(mode) {
    authMode = mode === 'signup' ? 'signup' : 'login';
    const tabLogin = document.getElementById('authTabLogin');
    const tabSignup = document.getElementById('authTabSignup');
    const nickField = document.getElementById('authNicknameField');
    const submitBtn = document.getElementById('authSubmitBtn');
    const pwInput = document.getElementById('authPasswordInput');

    if (tabLogin) tabLogin.classList.toggle('active', authMode === 'login');
    if (tabSignup) tabSignup.classList.toggle('active', authMode === 'signup');
    if (nickField) nickField.hidden = authMode !== 'signup';
    if (submitBtn) submitBtn.textContent = authMode === 'signup' ? '회원가입 완료' : '로그인';
    if (pwInput) pwInput.autocomplete = authMode === 'signup' ? 'new-password' : 'current-password';

    showAuthMessage('', '');
  }

  function showAuthMessage(text, type) {
    const box = document.getElementById('authMessageBox');
    if (!box) return;
    if (!text) {
      box.hidden = true;
      box.textContent = '';
      box.className = 'auth-message';
      return;
    }
    box.hidden = false;
    box.textContent = text;
    box.className = `auth-message ${type || 'error'}`;
  }

  function openAuthModal(mode = 'login', subtitleText = '') {
    injectAuthModal();
    setAuthMode(mode);

    const subtitleEl = document.getElementById('authModalSubtitle');
    if (subtitleEl && subtitleText) {
      subtitleEl.textContent = subtitleText;
    }

    const backdrop = document.getElementById('hobakAuthBackdrop');
    if (backdrop) {
      backdrop.hidden = false;
      setTimeout(() => {
        const focusEl =
          authMode === 'signup'
            ? document.getElementById('authNicknameInput')
            : document.getElementById('authEmailInput');
        if (focusEl) focusEl.focus();
      }, 60);
    }
  }

  function closeAuthModal() {
    const backdrop = document.getElementById('hobakAuthBackdrop');
    if (backdrop) backdrop.hidden = true;
    showAuthMessage('', '');
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const client = getClient();
    if (!client) {
      showAuthMessage('Supabase Auth 클라이언트를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.', 'error');
      return;
    }

    const email = (document.getElementById('authEmailInput')?.value || '').trim();
    const password = document.getElementById('authPasswordInput')?.value || '';
    const nickname = (document.getElementById('authNicknameInput')?.value || '').trim();
    const submitBtn = document.getElementById('authSubmitBtn');

    if (!email || !email.includes('@')) {
      showAuthMessage('올바른 이메일 주소를 입력해 주세요.', 'error');
      return;
    }
    if (password.length < 6) {
      showAuthMessage('비밀번호는 6자 이상 입력해 주세요.', 'error');
      return;
    }
    if (authMode === 'signup' && nickname.length < 2) {
      showAuthMessage('회원가입 시 닉네임(2자 이상)을 필수로 입력해 주세요.', 'error');
      document.getElementById('authNicknameInput')?.focus();
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = authMode === 'signup' ? '가입 처리 중...' : '로그인 중...';
    }

    try {
      if (authMode === 'signup') {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { nickname }
          }
        });

        if (error) {
          showAuthMessage(error.message || '회원가입에 실패했습니다.', 'error');
          return;
        }

        if (data.session && data.user) {
          currentUser = data.user;
          await fetchOrCreateProfile(data.user);
          renderHeaderAuthUI();
          closeAuthModal();
          window.dispatchEvent(new CustomEvent('hobak:auth-changed', { detail: { user: currentUser, profile: currentProfile } }));
          if (typeof pendingAfterLogin === 'function') {
            const cb = pendingAfterLogin;
            pendingAfterLogin = null;
            cb();
          }
        } else {
          showAuthMessage(
            '가입 확인 이메일을 발송했습니다! 이메일 인증 링크를 클릭한 뒤 로그인 탭에서 로그인해 주세요.',
            'success'
          );
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          showAuthMessage('이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
          return;
        }

        if (data.user) {
          currentUser = data.user;
          await fetchOrCreateProfile(data.user);
          renderHeaderAuthUI();
          closeAuthModal();
          window.dispatchEvent(new CustomEvent('hobak:auth-changed', { detail: { user: currentUser, profile: currentProfile } }));
          if (typeof pendingAfterLogin === 'function') {
            const cb = pendingAfterLogin;
            pendingAfterLogin = null;
            cb();
          }
        }
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = authMode === 'signup' ? '회원가입 완료' : '로그인';
      }
    }
  }

  async function handleSignOut() {
    const client = getClient();
    if (client) {
      await client.auth.signOut();
    }
    currentUser = null;
    currentProfile = null;
    renderHeaderAuthUI();
    window.dispatchEvent(new CustomEvent('hobak:auth-changed', { detail: { user: null, profile: null } }));
  }

  // 비로그인 상태에서 글쓰기 버튼/링크 클릭 시 로그인 모달을 먼저 띄우고 로그인 성공 시 write.html로 이동
  function bindWriteNavigationGuards() {
    document.addEventListener('click', (e) => {
      const writeLink = e.target.closest('a[href*="write.html"]');
      if (!writeLink) return;

      if (!currentUser) {
        e.preventDefault();
        pendingAfterLogin = () => {
          window.location.href = writeLink.getAttribute('href') || 'write.html';
        };
        openAuthModal('login', '글쓰기는 로그인 후 이용할 수 있어요! 로그인하면 바로 글쓰기 화면으로 이동합니다.');
      }
    });
  }

  // write.html 직접 접속 시 비로그인이면 로그인 모달 먼저 표시
  function guardWritePageDirectAccess() {
    const isWritePage = /write\.html$/i.test(window.location.pathname) || Boolean(document.getElementById('productWriteForm'));
    if (isWritePage && !currentUser) {
      pendingAfterLogin = () => {
        syncWriteFormSellerInfo();
      };
      openAuthModal('login', '내 물건 팔기(글쓰기)는 로그인 후 이용할 수 있습니다.');
    }
  }

  async function initAuth() {
    injectAuthModal();
    bindWriteNavigationGuards();

    const client = getClient();
    if (client) {
      const { data } = await client.auth.getSession();
      if (data && data.session && data.session.user) {
        currentUser = data.session.user;
        await fetchOrCreateProfile(currentUser);
      }

      client.auth.onAuthStateChange(async (_event, session) => {
        if (session && session.user) {
          currentUser = session.user;
          await fetchOrCreateProfile(currentUser);
        } else {
          currentUser = null;
          currentProfile = null;
        }
        renderHeaderAuthUI();
      });
    }

    renderHeaderAuthUI();
    guardWritePageDirectAccess();
  }

  window.HobakAuth = {
    getClient,
    getUser: () => currentUser,
    getProfile: () => currentProfile,
    isLoggedIn: () => Boolean(currentUser),
    openAuthModal,
    closeAuthModal,
    signOut: handleSignOut
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }
})();
