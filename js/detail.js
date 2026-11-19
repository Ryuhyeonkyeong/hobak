/**
 * 호박 (Hobak) 중고거래 웹서비스 - 상품 상세 페이지 스크립트 (detail.js)
 */

(function () {
  'use strict';

  // URL 쿼리 파라미터에서 상품 ID 파싱 (기본값: 1 - '그루퍼너 SJ mz-24 RC 조종기')
  const urlParams = new URLSearchParams(window.location.search);
  const rawId = urlParams.get('id');
  const productId = rawId ? Number(rawId) : 1;

  let currentProduct = null;
  let currentSlideIndex = 0;
  let toastTimer = null;

  // DOM 요소 참조
  const els = {
    headerSearchForm: document.getElementById('headerSearchForm'),
    headerSearchInput: document.getElementById('headerSearchInput'),

    sliderTrack: document.getElementById('sliderTrack'),
    sliderPrevBtn: document.getElementById('sliderPrevBtn'),
    sliderNextBtn: document.getElementById('sliderNextBtn'),
    sliderDots: document.getElementById('sliderDots'),
    viewerAppBtn: document.getElementById('viewerAppBtn'),

    sellerAvatar: document.getElementById('sellerAvatar'),
    sellerNickname: document.getElementById('sellerNickname'),
    sellerRegion: document.getElementById('sellerRegion'),
    mannerTempValue: document.getElementById('mannerTempValue'),
    mannerGaugeFill: document.getElementById('mannerGaugeFill'),
    mannerFaceIcon: document.getElementById('mannerFaceIcon'),
    mannerTempHelpBtn: document.getElementById('mannerTempHelpBtn'),
    mannerTooltip: document.getElementById('mannerTooltip'),

    statusBadgeGroup: document.getElementById('statusBadgeGroup'),
    statusSelectWrap: document.getElementById('statusSelectWrap'),
    authorStatusBtns: document.getElementById('authorStatusBtns'),
    editPostBtn: document.getElementById('editPostBtn'),
    deletePostBtn: document.getElementById('deletePostBtn'),
    sellerProfileLink: document.getElementById('sellerProfileLink'),
    productTitle: document.getElementById('productTitle'),
    productCategoryLink: document.getElementById('productCategoryLink'),
    productTimeAgo: document.getElementById('productTimeAgo'),
    productPrice: document.getElementById('productPrice'),
    hobakPayBadge: document.getElementById('hobakPayBadge'),
    productDescription: document.getElementById('productDescription'),
    productMetaCounts: document.getElementById('productMetaCounts'),

    likeToggleBtn: document.getElementById('likeToggleBtn'),
    likeHeartIcon: document.getElementById('likeHeartIcon'),
    actionBarPrice: document.getElementById('actionBarPrice'),
    actionBarSub: document.getElementById('actionBarSub'),
    chatOpenBtn: document.getElementById('chatOpenBtn'),

    relatedGrid: document.getElementById('relatedGrid'),

    chatModalBackdrop: document.getElementById('chatModalBackdrop'),
    chatModalAvatar: document.getElementById('chatModalAvatar'),
    chatModalTitle: document.getElementById('chatModalTitle'),
    chatModalTemp: document.getElementById('chatModalTemp'),
    chatModalCloseBtn: document.getElementById('chatModalCloseBtn'),
    chatModalThumb: document.getElementById('chatModalThumb'),
    chatModalProductName: document.getElementById('chatModalProductName'),
    chatModalProductPrice: document.getElementById('chatModalProductPrice'),
    chatMessagesArea: document.getElementById('chatMessagesArea'),
    chatQuickChips: document.getElementById('chatQuickChips'),
    chatInputForm: document.getElementById('chatInputForm'),
    chatMessageInput: document.getElementById('chatMessageInput'),

    hobakToast: document.getElementById('hobakToast')
  };

  /**
   * 토스트 메시지 표시
   */
  function showToast(message) {
    if (!els.hobakToast) return;
    els.hobakToast.textContent = message;
    els.hobakToast.hidden = false;

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.hobakToast.hidden = true;
    }, 2600);
  }

  /**
   * 매너온도에 따른 색상 및 표정 아이콘 계산
   */
  function getMannerTempStyle(temp) {
    const val = Number(temp) || 36.5;
    if (val >= 42) {
      return { color: '#FF6F0F', face: '😍' };
    }
    if (val >= 37.0) {
      return { color: '#FF6F0F', face: '😊' };
    }
    if (val >= 36.0) {
      return { color: '#0D6EFD', face: '🙂' };
    }
    return { color: '#868B94', face: '😐' };
  }

  /**
   * 상단 이미지 슬라이더 렌더링 및 전환
   */
  function renderImageSlider(product) {
    const images = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [window.HobakStore.createProductSvgDataUri('#ea580c', '#f97316', '🎃', product.title, product.category)];

    currentSlideIndex = 0;

    // 슬라이드 트랙 구성
    els.sliderTrack.innerHTML = images
      .map(
        (src, idx) => `
        <div class="slider-slide">
          <img src="${src}" alt="${escapeHtml(product.title)} 이미지 ${idx + 1}" />
        </div>
      `
      )
      .join('');

    // 인디케이터 점(dot) 구성
    els.sliderDots.innerHTML = images
      .map(
        (_, idx) => `
        <button
          type="button"
          class="slider-dot ${idx === 0 ? 'active' : ''}"
          data-index="${idx}"
          aria-label="${idx + 1}번 이미지 보기"
        ></button>
      `
      )
      .join('');

    // 이미지가 1장일 때도 하단 중앙 인디케이터 점 표시 (참고 이미지 반영), 화살표는 다중 이미지일 때 활성화
    const hasMultiple = images.length > 1;
    els.sliderPrevBtn.hidden = !hasMultiple;
    els.sliderNextBtn.hidden = !hasMultiple;

    updateSliderPosition(images.length);
  }

  function updateSliderPosition(totalCount) {
    els.sliderTrack.style.transform = `translateX(-${currentSlideIndex * 100}%)`;

    const dots = els.sliderDots.querySelectorAll('.slider-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentSlideIndex);
    });

    if (totalCount > 1) {
      els.sliderPrevBtn.style.opacity = currentSlideIndex === 0 ? '0.45' : '1';
      els.sliderNextBtn.style.opacity = currentSlideIndex === totalCount - 1 ? '0.45' : '1';
    }
  }

  /**
   * 거래 상태 배지 및 작성자 관리 버튼 업데이트
   */
  function renderStatusBadge(status) {
    let badgeClass = 'selling';
    let label = status || '판매중';
    if (status === '예약중') badgeClass = 'reserved';
    else if (status === '판매완료' || status === '거래완료') {
      badgeClass = 'sold';
      label = '거래완료';
    }

    els.statusBadgeGroup.innerHTML = `<span class="status-badge ${badgeClass}">${escapeHtml(label)}</span>`;

    // 작성자 본인 글일 때만 수정/삭제/상태 버튼 노출
    const user = window.HobakAuth && window.HobakAuth.getUser ? window.HobakAuth.getUser() : null;
    const isMine = window.HobakStore && window.HobakStore.isMyPost(currentProduct, user ? user.id : null);
    if (els.statusSelectWrap) {
      els.statusSelectWrap.hidden = !isMine;
    }

    if (els.authorStatusBtns) {
      const canonical = (status === '거래완료') ? '판매완료' : (status || '판매중');
      els.authorStatusBtns.querySelectorAll('.author-status-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.status === canonical);
      });
    }
  }

  /**
   * 하단 메타 카운트 및 관심 하트 버튼 업데이트
   */
  function renderMetaAndLike(product) {
    els.productMetaCounts.textContent = `채팅 ${product.chats || 0} · 관심 ${product.likes || 0} · 조회 ${product.views || 0}`;

    const isLiked = Boolean(product.liked);
    els.likeToggleBtn.classList.toggle('liked', isLiked);
    els.likeHeartIcon.textContent = isLiked ? '♥' : '♡';
    els.likeToggleBtn.setAttribute('aria-pressed', String(isLiked));
  }

  /**
   * 상품 상세 정보 전체 렌더링
   */
  function renderProductDetail(product) {
    document.title = `${product.title} | 호박 중고거래`;

    // 1. 이미지 뷰어
    renderImageSlider(product);

    // 2. 판매자 프로필 영역
    const seller = product.seller || {
      nickname: '헤엄치는오리',
      region: '화정동, 대송동',
      mannerTemp: 37.2,
      avatarEmoji: '🦆'
    };

    // 기본 인물 아이콘 + 이모지 뱃지 조합 또는 아바타 표시
    els.sellerAvatar.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="#ADB5BD" aria-hidden="true">
        <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/>
      </svg>
    `;
    els.sellerAvatar.title = `${seller.nickname} (${seller.avatarEmoji || '🎃'})`;

    els.sellerNickname.textContent = seller.nickname;
    els.sellerRegion.textContent = seller.region;

    const tempVal = Number(seller.mannerTemp || 37.2).toFixed(1);
    const tempStyle = getMannerTempStyle(tempVal);
    els.mannerTempValue.textContent = `${tempVal}°C`;
    els.mannerTempValue.style.color = tempStyle.color;
    els.mannerGaugeFill.style.width = `${Math.min(100, Math.max(10, Number(tempVal)))}%`;
    els.mannerGaugeFill.style.backgroundColor = tempStyle.color;
    els.mannerFaceIcon.textContent = tempStyle.face;

    // 3. 상품 본문 정보 영역
    renderStatusBadge(product.status || '판매중');
    els.productTitle.textContent = product.title;

    els.productCategoryLink.textContent = product.category || '취미/게임/음반';
    els.productCategoryLink.href = `index.html?category=${encodeURIComponent(product.category || '')}`;
    els.productTimeAgo.textContent = product.timeAgo || '방금 전';

    const formattedPrice = window.HobakStore.formatPrice(product);
    els.productPrice.textContent = formattedPrice;
    els.hobakPayBadge.hidden = !product.hobakPay;

    els.productDescription.textContent = product.description || '';

    // 4. 메타 카운트 및 하단 액션바
    renderMetaAndLike(product);
    els.actionBarPrice.textContent = formattedPrice;
    els.actionBarSub.textContent = product.hobakPay ? '🎃 호박페이 안전결제 가능' : '가격 제안 불가';
  }

  /**
   * 함께 본 상품 / 다른 중고거래 추천 섹션 (3~4개 미니 카드)
   */
  function renderRelatedProducts(currentId) {
    const allProducts = window.HobakStore.getProducts();
    const others = allProducts.filter((p) => Number(p.id) !== Number(currentId)).slice(0, 4);

    els.relatedGrid.innerHTML = others
      .map((item) => {
        const thumb = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : '';
        const priceText = window.HobakStore.formatPrice(item);
        const region = (item.seller && item.seller.region) || '양정동';

        return `
          <a href="detail.html?id=${encodeURIComponent(item.id)}" class="related-card">
            <div class="related-thumb-wrap">
              <img src="${thumb}" alt="${escapeHtml(item.title)}" loading="lazy" />
            </div>
            <div class="related-card-body">
              <div class="related-card-title">${escapeHtml(item.title)}</div>
              <div class="related-card-price">${escapeHtml(priceText)}</div>
              <div class="related-card-meta">${escapeHtml(region)} · 관심 ${item.likes || 0}</div>
            </div>
          </a>
        `;
      })
      .join('');
  }

  const CHAT_STORAGE_PREFIX = 'hobak_chat_history_v1_';

  function getLocalChatHistory(id) {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_PREFIX + id);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function appendLocalChatHistory(id, role, message) {
    try {
      const list = getLocalChatHistory(id);
      list.push({ sender_role: role, message, created_at: new Date().toISOString() });
      localStorage.setItem(CHAT_STORAGE_PREFIX + id, JSON.stringify(list));
    } catch (e) {
      // ignore
    }
  }

  function formatChatTime(isoStr) {
    const d = isoStr ? new Date(isoStr) : new Date();
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  function appendChatBubble(role, message, timeIso) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role === 'buyer' ? 'buyer' : 'seller'}`;
    bubble.innerHTML = `
      <div class="chat-bubble-text">${escapeHtml(message)}</div>
      <span class="chat-bubble-time">${formatChatTime(timeIso)}</span>
    `;
    els.chatMessagesArea.appendChild(bubble);
    els.chatMessagesArea.scrollTop = els.chatMessagesArea.scrollHeight;
  }

  function generateSmartSellerReply(userMsg, product) {
    const msg = userMsg.toLowerCase();
    const seller = product.seller || {};
    const region = seller.region || '양정동';
    const priceText = window.HobakStore.formatPrice(product);
    const status = product.status || '판매중';

    if (msg.includes('가능') || msg.includes('팔렸') || msg.includes('있나요')) {
      if (status === '판매완료') {
        return `아쉽지만 "${product.title}" 상품은 방금 판매완료되었어요 😢 다른 상품도 둘러봐 주세요!`;
      }
      if (status === '예약중') {
        return `현재 다른 이웃분과 예약중이에요! 혹시 거래가 불발되면 바로 연락드릴게요 😊`;
      }
      return `네! "${product.title}" 지금 바로 구매 가능합니다 😊 가격은 ${priceText}입니다.`;
    }
    if (msg.includes('어디') || msg.includes('위치') || msg.includes('직거래') || msg.includes('동네')) {
      return `직거래는 ${region} 인근에서 편하신 시간 맞춰 진행 가능해요! 정확한 장소는 약속 확정 시 알려드릴게요 📍`;
    }
    if (msg.includes('네고') || msg.includes('할인') || msg.includes('깎') || msg.includes('얼마')) {
      return `현재 ${priceText}에 올려두었고 상태가 좋아서 큰 네고는 어렵지만, 쿨거래하시면 조금 맞춰드릴 수 있어요 👍`;
    }
    if (msg.includes('상태') || msg.includes('하자') || msg.includes('구성')) {
      return `사용감 거의 없이 깔끔하게 관리했습니다! ${product.hobakPay ? '🎃 호박페이 안전결제도 가능해요.' : '직거래 시 직접 상태 확인하고 가져가셔도 됩니다.'}`;
    }
    if (msg.includes('페이') || msg.includes('안전결제') || msg.includes('택배')) {
      return product.hobakPay
        ? `네, 🎃 호박페이 안전결제와 택배 거래 모두 가능합니다! 원하시는 거래 방식을 말씀해 주세요.`
        : `직거래 우선으로 진행하고 있어요. ${region} 쪽으로 오실 수 있으신가요?`;
    }
    return `네, 확인했습니다! ${region} 인근 직거래 가능하며 궁금한 점 있으시면 편하게 더 물어보세요 🙌`;
  }

  /**
   * 호박채팅 모달 열기 및 메시지 전송 시 채팅 수 증가
   */
  async function openChatModal() {
    if (!currentProduct) return;
    const seller = currentProduct.seller || { nickname: '헤엄치는오리', mannerTemp: 37.2, avatarEmoji: '🦆' };
    const thumb = Array.isArray(currentProduct.images) && currentProduct.images.length > 0
      ? currentProduct.images[0]
      : '';

    els.chatModalAvatar.textContent = seller.avatarEmoji || '🦆';
    els.chatModalTitle.textContent = seller.nickname;
    els.chatModalTemp.textContent = `매너온도 ${Number(seller.mannerTemp || 37.2).toFixed(1)}°C`;
    els.chatModalThumb.src = thumb;
    els.chatModalThumb.alt = currentProduct.title;
    els.chatModalProductName.textContent = currentProduct.title;
    els.chatModalProductPrice.textContent = window.HobakStore.formatPrice(currentProduct);

    els.chatModalBackdrop.hidden = false;
    setTimeout(() => els.chatMessageInput.focus(), 50);

    // 기본 안내 메시지 초기화 (비어 있을 때만) + Supabase / localStorage 이전 대화 불러오기
    if (els.chatMessagesArea.children.length === 0) {
      els.chatMessagesArea.innerHTML = `
        <div class="chat-bubble seller">
          <div class="chat-bubble-text">안녕하세요! <strong>${escapeHtml(seller.nickname)}</strong>입니다. "${escapeHtml(currentProduct.title)}" 상품에 관심 있으신가요? 편하게 문의 남겨주세요 😊</div>
          <span class="chat-bubble-time">${formatChatTime()}</span>
        </div>
      `;

      let history = [];
      if (window.HobakSupabaseSync && typeof window.HobakSupabaseSync.loadChatMessages === 'function') {
        history = await window.HobakSupabaseSync.loadChatMessages(currentProduct.id);
      }
      if (!Array.isArray(history) || history.length === 0) {
        history = getLocalChatHistory(currentProduct.id);
      }
      if (Array.isArray(history) && history.length > 0) {
        history.forEach((msg) => {
          appendChatBubble(msg.sender_role, msg.message, msg.created_at);
        });
      }
    }
  }

  function closeChatModal() {
    els.chatModalBackdrop.hidden = true;
  }

  function sendChatMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || !currentProduct) return;

    // 내 메시지 말풍선 추가 + localStorage 저장
    appendChatBubble('buyer', trimmed);
    appendLocalChatHistory(currentProduct.id, 'buyer', trimmed);

    // 스토어 내 상품 채팅 카운트 +1 반영 및 저장
    const products = window.HobakStore.getProducts();
    const target = products.find((p) => Number(p.id) === Number(currentProduct.id));
    let nextChatsCount = (currentProduct.chats || 0) + 1;
    if (target) {
      target.chats = (target.chats || 0) + 1;
      nextChatsCount = target.chats;
      window.HobakStore.saveProducts(products);
      currentProduct = target;
      renderMetaAndLike(currentProduct);
    }

    // Supabase chat_messages 및 chats_count 저장
    if (window.HobakSupabaseSync && typeof window.HobakSupabaseSync.saveChatMessage === 'function') {
      window.HobakSupabaseSync.saveChatMessage(currentProduct.id, 'buyer', trimmed, nextChatsCount);
    }

    showToast('💬 호박채팅 메시지가 전송되었습니다! (채팅 수 +1)');

    // 입력 중(...) 인디케이터 표시 후 상품 맞춤 판매자 자동 답장
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-bubble seller chat-typing-indicator';
    typingEl.textContent = `${(currentProduct.seller && currentProduct.seller.nickname) || '판매자'}님이 입력 중...`;
    els.chatMessagesArea.appendChild(typingEl);
    els.chatMessagesArea.scrollTop = els.chatMessagesArea.scrollHeight;

    const replyText = generateSmartSellerReply(trimmed, currentProduct);
    setTimeout(() => {
      typingEl.remove();
      appendChatBubble('seller', replyText);
      appendLocalChatHistory(currentProduct.id, 'seller', replyText);

      if (window.HobakSupabaseSync && typeof window.HobakSupabaseSync.saveChatMessage === 'function') {
        window.HobakSupabaseSync.saveChatMessage(currentProduct.id, 'seller', replyText);
      }
    }, 650);
  }

  /**
   * HTML 이스케이프 헬퍼
   */
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 이벤트 리스너 바인딩
   */
  function bindEvents() {
    // 1. 상단 검색창 엔터 시 index.html?q=검색어 이동
    els.headerSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = els.headerSearchInput.value.trim();
      if (q) {
        window.location.href = `index.html?q=${encodeURIComponent(q)}`;
      } else {
        window.location.href = 'index.html';
      }
    });

    // 2. 앱에서 보기 배지 버튼 클릭 시 토스트 안내
    els.viewerAppBtn.addEventListener('click', () => {
      showToast('🎃 호박 모바일 앱에서 열기를 준비 중이에요!');
    });

    // 3. 이미지 슬라이더 좌/우 화살표 및 하단 인디케이터 점(dot) 클릭
    els.sliderPrevBtn.addEventListener('click', () => {
      if (!currentProduct || !Array.isArray(currentProduct.images)) return;
      const total = currentProduct.images.length;
      currentSlideIndex = (currentSlideIndex - 1 + total) % total;
      updateSliderPosition(total);
    });

    els.sliderNextBtn.addEventListener('click', () => {
      if (!currentProduct || !Array.isArray(currentProduct.images)) return;
      const total = currentProduct.images.length;
      currentSlideIndex = (currentSlideIndex + 1) % total;
      updateSliderPosition(total);
    });

    els.sliderDots.addEventListener('click', (e) => {
      const dot = e.target.closest('.slider-dot');
      if (!dot || !currentProduct) return;
      const idx = Number(dot.dataset.index);
      const total = Array.isArray(currentProduct.images) ? currentProduct.images.length : 1;
      if (!Number.isNaN(idx) && idx >= 0 && idx < total) {
        currentSlideIndex = idx;
        updateSliderPosition(total);
      }
    });

    // 4. 매너온도 텍스트 클릭 시 설명 툴팁 및 토스트 표시
    els.mannerTempHelpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = els.mannerTooltip.hidden;
      els.mannerTooltip.hidden = !isHidden;
      if (isHidden) {
        showToast('🌡️ 매너온도는 첫 온도 36.5°C에서 시작하는 호박 이웃 매너 지표예요.');
      }
    });

    document.addEventListener('click', (e) => {
      if (!els.mannerTooltip.hidden && !e.target.closest('.seller-right')) {
        els.mannerTooltip.hidden = true;
      }
    });

    // 5. 작성자 상태 변경 버튼 ('판매중', '예약중', '거래완료') + 수정/삭제 버튼
    if (els.authorStatusBtns) {
      els.authorStatusBtns.addEventListener('click', (e) => {
        const btn = e.target.closest('.author-status-btn');
        if (!btn || !currentProduct) return;
        const newStatus = btn.dataset.status;
        const updated = window.HobakStore.updateStatus(currentProduct.id, newStatus);
        if (updated) {
          currentProduct = updated;
          renderStatusBadge(updated.status);
          const label = newStatus === '판매완료' ? '거래완료' : newStatus;
          showToast(`✅ 거래 상태가 '${label}'(으)로 변경되었습니다.`);
        }
      });
    }

    if (els.editPostBtn) {
      els.editPostBtn.addEventListener('click', () => {
        if (!currentProduct) return;
        window.location.href = `write.html?edit=${encodeURIComponent(currentProduct.id)}`;
      });
    }

    if (els.deletePostBtn) {
      els.deletePostBtn.addEventListener('click', async () => {
        if (!currentProduct) return;
        if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
        if (window.HobakSupabaseSync && typeof window.HobakSupabaseSync.deleteProductAsync === 'function') {
          await window.HobakSupabaseSync.deleteProductAsync(currentProduct.id);
        } else {
          window.HobakStore.deleteProduct(currentProduct.id);
        }
        window.location.href = 'index.html';
      });
    }

    // 5-1. 판매자 클릭 시 해당 판매자가 올린 글 목록으로 이동
    if (els.sellerProfileLink) {
      const goToSellerPosts = () => {
        if (!currentProduct || !currentProduct.seller) return;
        window.location.href = `index.html?seller=${encodeURIComponent(currentProduct.seller.nickname)}`;
      };
      els.sellerProfileLink.addEventListener('click', goToSellerPosts);
      els.sellerProfileLink.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') goToSellerPosts();
      });
    }

    // 6. 관심 하트 토글 버튼
    els.likeToggleBtn.addEventListener('click', () => {
      if (!currentProduct) return;
      const updated = window.HobakStore.toggleLike(currentProduct.id);
      if (updated) {
        currentProduct = updated;
        renderMetaAndLike(updated);
        showToast(
          updated.liked
            ? '🧡 관심 목록에 추가했어요!'
            : '관심 목록에서 해제했어요.'
        );
      }
    });

    // 7. 호박채팅 하기 모달 열기/닫기 및 전송
    els.chatOpenBtn.addEventListener('click', openChatModal);
    els.chatModalCloseBtn.addEventListener('click', closeChatModal);
    els.chatModalBackdrop.addEventListener('click', (e) => {
      if (e.target === els.chatModalBackdrop) {
        closeChatModal();
      }
    });

    els.chatQuickChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chat-chip');
      if (!chip) return;
      sendChatMessage(chip.textContent || '');
    });

    els.chatInputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = els.chatMessageInput.value;
      els.chatMessageInput.value = '';
      sendChatMessage(msg);
    });
  }

  /**
   * 초기화 실행
   */
  function init() {
    if (!window.HobakStore) {
      console.error('HobakStore 모듈을 찾을 수 없습니다.');
      return;
    }

    // 상품 조회 후 조회수 +1 증가 반영
    const found = window.HobakStore.getProductById(productId);
    const incremented = window.HobakStore.incrementView(found.id);
    currentProduct = incremented || found;

    renderProductDetail(currentProduct);
    renderRelatedProducts(currentProduct.id);
    bindEvents();

    // ?chat=1 쿼리 시 바로 호박채팅 모달 열기
    if (urlParams.get('chat') === '1') {
      openChatModal();
    }
  }

  // 로그인 상태 변경 시 작성자 관리 버튼 다시 평가
  window.addEventListener('hobak:auth-changed', () => {
    if (currentProduct) renderStatusBadge(currentProduct.status || '판매중');
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Supabase 동기화 완료 시 최신 DB 데이터 반영
  window.addEventListener('hobak:synced', () => {
    if (!window.HobakStore) return;
    const fresh = window.HobakStore.getProductById(productId);
    if (fresh) {
      currentProduct = fresh;
      renderProductDetail(currentProduct);
      renderRelatedProducts(currentProduct.id);
    }
  });
})();
