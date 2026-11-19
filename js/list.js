/**
 * 호박 (🎃 호박) - 상품 목록 페이지 스크립트 (list.js)
 */

(function () {
  'use strict';

  // 상태 관리
  const state = {
    keyword: '',
    seller: '',
    category: '전체',
    region: '양정동 외 근처 동네',
    onlyAvailable: false,
    onlyCompleted: false,
    currentPage: 1
  };

  // DOM 요소 참조
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const categorySelect = document.getElementById('categorySelect');
  const regionSelect = document.getElementById('regionSelect');
  const onlyAvailableBtn = document.getElementById('onlyAvailableBtn');
  const onlyCompletedBtn = document.getElementById('onlyCompletedBtn');
  const resetFilterBtn = document.getElementById('resetFilterBtn');
  const emptyResetBtn = document.getElementById('emptyResetBtn');
  const productGrid = document.getElementById('productGrid');
  const emptyState = document.getElementById('emptyState');
  const totalCountEl = document.getElementById('totalCount');
  const regionLabelEl = document.getElementById('regionLabel');
  const activeFilterSummary = document.getElementById('activeFilterSummary');
  const activeFilterText = document.getElementById('activeFilterText');
  const clearKeywordBtn = document.getElementById('clearKeywordBtn');
  const popularKeywordsWrap = document.getElementById('popularKeywords');
  const toastEl = document.getElementById('toastMessage');

  let toastTimer = null;

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2200);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // URL 쿼리 파라미터(`?q=`, `?category=`, `?region=`, `?seller=`) 초기 반영
  function initFromQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || params.get('keyword');
    const cat = params.get('category');
    const reg = params.get('region');
    const seller = params.get('seller');

    if (q && q.trim()) {
      state.keyword = q.trim();
      if (searchInput) searchInput.value = state.keyword;
    }

    if (seller && seller.trim()) {
      state.seller = seller.trim();
    }

    if (cat && categorySelect) {
      const exists = Array.from(categorySelect.options).some(opt => opt.value === cat);
      if (exists) {
        state.category = cat;
        categorySelect.value = cat;
      }
    }

    if (reg && regionSelect) {
      const exists = Array.from(regionSelect.options).some(opt => opt.value === reg);
      if (exists) {
        state.region = reg;
        regionSelect.value = reg;
      }
    }
  }

  // 상태 배지 HTML 생성 (판매중 -> 파랑, 예약중 -> 초록, 거래완료 -> 회색)
  function createStatusBadgeHtml(status) {
    if (status === '예약중') {
      return '<span class="status-badge reserved">예약중</span>';
    }
    if (status === '판매완료' || status === '거래완료') {
      return '<span class="status-badge sold">거래완료</span>';
    }
    return '<span class="status-badge selling">판매중</span>';
  }

  // 필터링 수행
  function getFilteredProducts() {
    const allProducts = window.HobakStore ? window.HobakStore.getProducts() : [];
    const kw = state.keyword.trim().toLowerCase();

    return allProducts.filter(product => {
      // 1. 검색어 필터 (제목, 설명, 카테고리, 동네, 작성자 닉네임, 나눔 키워드 — 띄어쓰기 무시 포함)
      if (kw) {
        const kwNoSpace = kw.replace(/\s+/g, '');
        const matches = (val) => {
          const lower = String(val || '').toLowerCase();
          return lower.includes(kw) || lower.replace(/\s+/g, '').includes(kwNoSpace);
        };

        const titleMatch = matches(product.title);
        const descMatch = matches(product.description);
        const catMatch = matches(product.category);
        const regionMatch = matches(product.seller && product.seller.region);
        const nickMatch = matches(product.seller && product.seller.nickname);
        const shareMatch = kw === '나눔' && (product.isFreeShare || Number(product.price) === 0);

        if (!titleMatch && !descMatch && !catMatch && !regionMatch && !nickMatch && !shareMatch) {
          return false;
        }
      }

      // 2. 카테고리 필터
      if (state.category !== '전체') {
        if (product.category !== state.category) {
          return false;
        }
      }

      // 3. 동네 필터
      if (state.region !== '양정동 외 근처 동네') {
        const sellerRegion = (product.seller && product.seller.region) || '';
        if (!sellerRegion.includes(state.region)) {
          return false;
        }
      }

      // 3-1. 판매자 필터
      if (state.seller) {
        const nick = (product.seller && product.seller.nickname) || '';
        if (nick !== state.seller) {
          return false;
        }
      }

      // 4. 판매중만 보기 ('판매중' 상태만)
      if (state.onlyAvailable && product.status !== '판매중') {
        return false;
      }

      // 5. 거래 가능 보기 ('판매완료'/'거래완료' 상태만)
      if (state.onlyCompleted && product.status !== '판매완료' && product.status !== '거래완료') {
        return false;
      }

      return true;
    });
  }

  // 상단 타이틀, 인기 검색어 활성 상태, 검색어 요약 칩 업데이트
  function updateHeaderAndFilterUI(filteredCount) {
    if (totalCountEl) {
      totalCountEl.textContent = String(filteredCount);
    }

    if (regionLabelEl) {
      regionLabelEl.textContent =
        state.region === '양정동 외 근처 동네' ? '양정동' : state.region;
    }

    // 인기 검색어 버튼 활성 상태 동기화
    if (popularKeywordsWrap) {
      const buttons = popularKeywordsWrap.querySelectorAll('.keyword-tag');
      buttons.forEach(btn => {
        const tagKw = btn.getAttribute('data-keyword') || '';
        btn.classList.toggle(
          'active',
          state.keyword.trim().toLowerCase() === tagKw.toLowerCase()
        );
      });
    }

    // 검색어 / 판매자 요약 칩 표시
    if (activeFilterSummary && activeFilterText) {
      if (state.seller) {
        activeFilterText.innerHTML = `👤 <strong>'${escapeHtml(state.seller)}'</strong> 판매자가 올린 글입니다.`;
        activeFilterSummary.classList.remove('hidden');
      } else if (state.keyword.trim()) {
        activeFilterText.innerHTML = `<strong>'${escapeHtml(state.keyword.trim())}'</strong> 검색 결과입니다.`;
        activeFilterSummary.classList.remove('hidden');
      } else {
        activeFilterSummary.classList.add('hidden');
      }
    }
  }

  // 상품 그리드 렌더링
  function renderProducts() {
    const filtered = getFilteredProducts();
    updateHeaderAndFilterUI(filtered.length);

    if (!productGrid || !emptyState) return;

    if (filtered.length === 0) {
      productGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    productGrid.innerHTML = filtered
      .map(product => {
        const thumbSrc =
          product.images && product.images.length > 0
            ? product.images[0]
            : '';
        const statusBadge = createStatusBadgeHtml(product.status);
        const formattedPrice = window.HobakStore
          ? window.HobakStore.formatPrice(product)
          : `${Number(product.price).toLocaleString('ko-KR')}원`;
        const isFree = Boolean(product.isFreeShare) || Number(product.price) === 0;
        const isSold = product.status === '판매완료' || product.status === '거래완료';
        const sellerNickname = (product.seller && product.seller.nickname) || '호박이웃';
        const regionText = (product.seller && product.seller.region) || '양정동';
        const timeAgoText = product.timeAgo || '방금 전';
        const isLiked = Boolean(product.liked);

        const heartSvg = isLiked
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="#ff4b4b" stroke="#ff4b4b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;

        return `
          <article class="product-card ${isSold ? 'is-sold' : ''}" data-product-id="${product.id}" tabindex="0" role="link" aria-label="${escapeHtml(product.title)} 상세 보기">
            <div class="product-thumb-wrap">
              <img
                src="${thumbSrc}"
                alt="${escapeHtml(product.title)}"
                class="product-thumb-img"
                loading="lazy"
              />
              ${statusBadge ? `<div class="thumb-status-badge-wrap">${statusBadge}</div>` : ''}
              <button
                type="button"
                class="quick-like-btn ${isLiked ? 'liked' : ''}"
                data-like-id="${product.id}"
                aria-label="관심상품 ${isLiked ? '해제' : '등록'}"
                title="관심상품 ${isLiked ? '해제' : '등록'}"
              >
                ${heartSvg}
              </button>
            </div>

            <div class="product-info">
              <h3 class="product-title">${escapeHtml(product.title)}</h3>
              <div class="product-price-row">
                <span class="product-price ${isFree ? 'free-share' : ''}">${escapeHtml(formattedPrice)}</span>
              </div>
              <p class="product-meta">
                <button type="button" class="card-seller-btn" data-seller="${escapeHtml(sellerNickname)}" title="${escapeHtml(sellerNickname)}님이 올린 글 모두 보기">👤 ${escapeHtml(sellerNickname)}</button>
                · ${escapeHtml(regionText)} · ${escapeHtml(timeAgoText)}
              </p>
              <div class="product-bottom-row">
                <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
                  ${product.hobakPay ? '<span class="status-badge hobak-pay">🎃 호박페이</span>' : ''}
                  <button type="button" class="card-talk-btn" data-talk-id="${product.id}">💬 톡하기</button>
                </div>
                <div class="product-stats">
                  ${product.chats > 0 ? `<span class="stat-item">💬 ${product.chats}</span>` : ''}
                  ${product.likes > 0 ? `<span class="stat-item">🤍 ${product.likes}</span>` : ''}
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  // 모든 필터 초기화
  function resetAllFilters(resetStorage = false) {
    state.keyword = '';
    state.seller = '';
    state.category = '전체';
    state.region = '양정동 외 근처 동네';
    state.onlyAvailable = false;
    state.onlyCompleted = false;

    if (searchInput) searchInput.value = '';
    if (categorySelect) categorySelect.value = '전체';
    if (regionSelect) regionSelect.value = '양정동 외 근처 동네';
    if (onlyAvailableBtn) {
      onlyAvailableBtn.classList.remove('active');
      onlyAvailableBtn.setAttribute('aria-pressed', 'false');
    }
    if (onlyCompletedBtn) {
      onlyCompletedBtn.classList.remove('active');
      onlyCompletedBtn.setAttribute('aria-pressed', 'false');
    }

    if (resetStorage && window.HobakStore) {
      window.HobakStore.resetProducts();
      showToast('🎃 필터 및 기본 상품 목록이 초기화되었습니다.');
    } else {
      showToast('검색 및 필터 조건이 초기화되었습니다.');
    }

    renderProducts();
  }

  // 이벤트 바인딩
  function bindEvents() {
    // 1. 검색창 실시간 입력 및 엔터 검색
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        state.keyword = e.target.value;
        renderProducts();
      });
    }

    if (searchForm) {
      searchForm.addEventListener('submit', e => {
        e.preventDefault();
        state.keyword = searchInput ? searchInput.value : '';
        renderProducts();

        const trimmedKw = state.keyword.trim();
        if (trimmedKw) {
          if (window.HobakSupabaseSync && typeof window.HobakSupabaseSync.recordSearchKeyword === 'function') {
            window.HobakSupabaseSync.recordSearchKeyword(trimmedKw);
          }
          const resultEl = document.getElementById('resultTitle');
          if (resultEl) {
            const top = resultEl.getBoundingClientRect().top + window.scrollY - 135;
            window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
          }
        }
      });
    }

    // 2. 카테고리 드롭다운 변경
    if (categorySelect) {
      categorySelect.addEventListener('change', e => {
        state.category = e.target.value;
        renderProducts();
      });
    }

    // 3. 동네 드롭다운 변경
    if (regionSelect) {
      regionSelect.addEventListener('change', e => {
        state.region = e.target.value;
        renderProducts();
      });
    }

    // 4. 판매중만 보기 토글
    if (onlyAvailableBtn) {
      onlyAvailableBtn.addEventListener('click', () => {
        state.onlyAvailable = !state.onlyAvailable;
        if (state.onlyAvailable) {
          state.onlyCompleted = false;
          if (onlyCompletedBtn) {
            onlyCompletedBtn.classList.remove('active');
            onlyCompletedBtn.setAttribute('aria-pressed', 'false');
          }
        }
        onlyAvailableBtn.classList.toggle('active', state.onlyAvailable);
        onlyAvailableBtn.setAttribute('aria-pressed', String(state.onlyAvailable));
        renderProducts();
      });
    }

    // 4-1. 거래 가능 보기 (거래완료된 글만 보기) 토글
    if (onlyCompletedBtn) {
      onlyCompletedBtn.addEventListener('click', () => {
        state.onlyCompleted = !state.onlyCompleted;
        if (state.onlyCompleted) {
          state.onlyAvailable = false;
          if (onlyAvailableBtn) {
            onlyAvailableBtn.classList.remove('active');
            onlyAvailableBtn.setAttribute('aria-pressed', 'false');
          }
        }
        onlyCompletedBtn.classList.toggle('active', state.onlyCompleted);
        onlyCompletedBtn.setAttribute('aria-pressed', String(state.onlyCompleted));
        renderProducts();
      });
    }

    // 5. 초기화 버튼 (필터가 걸려있으면 필터 해제, 아니면 스토리지 초기 데이터 복원)
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        const hasActiveFilter =
          state.keyword.trim() !== '' ||
          state.seller !== '' ||
          state.category !== '전체' ||
          state.region !== '양정동 외 근처 동네' ||
          state.onlyAvailable ||
          state.onlyCompleted;

        resetAllFilters(!hasActiveFilter);
      });
    }

    if (emptyResetBtn) {
      emptyResetBtn.addEventListener('click', () => {
        resetAllFilters(false);
      });
    }

    if (clearKeywordBtn) {
      clearKeywordBtn.addEventListener('click', () => {
        state.keyword = '';
        state.seller = '';
        if (searchInput) searchInput.value = '';
        renderProducts();
      });
    }

    // 6. 인기 검색어 태그 클릭 시 즉시 필터링 (재클릭 시 해제)
    if (popularKeywordsWrap) {
      popularKeywordsWrap.addEventListener('click', e => {
        const tagBtn = e.target.closest('.keyword-tag');
        if (!tagBtn) return;

        const clickedKw = tagBtn.getAttribute('data-keyword') || '';
        if (state.keyword.trim().toLowerCase() === clickedKw.toLowerCase()) {
          state.keyword = '';
        } else {
          state.keyword = clickedKw;
        }

        if (searchInput) searchInput.value = state.keyword;
        renderProducts();
      });
    }

    // 7. 상품 카드 클릭 & 우하단 하트(관심) 빠른 토글 이벤트 위임
    if (productGrid) {
      productGrid.addEventListener('click', e => {
        const likeBtn = e.target.closest('.quick-like-btn');
        if (likeBtn) {
          e.preventDefault();
          e.stopPropagation();
          const likeId = Number(likeBtn.getAttribute('data-like-id'));
          if (window.HobakStore && likeId) {
            const updated = window.HobakStore.toggleLike(likeId);
            renderProducts();
            if (updated) {
              showToast(
                updated.liked
                  ? '🧡 관심 목록에 추가했어요!'
                  : '관심 목록에서 해제했어요.'
              );
            }
          }
          return;
        }

        const sellerBtn = e.target.closest('.card-seller-btn');
        if (sellerBtn) {
          e.preventDefault();
          e.stopPropagation();
          const sellerName = sellerBtn.getAttribute('data-seller') || '';
          state.seller = sellerName;
          renderProducts();
          showToast(`👤 '${sellerName}' 판매자가 올린 글을 표시합니다.`);
          return;
        }

        const talkBtn = e.target.closest('.card-talk-btn');
        if (talkBtn) {
          e.preventDefault();
          e.stopPropagation();
          const talkId = talkBtn.getAttribute('data-talk-id');
          if (talkId) {
            window.location.href = `detail.html?id=${encodeURIComponent(talkId)}&chat=1`;
          }
          return;
        }

        const card = e.target.closest('.product-card');
        if (card) {
          const productId = card.getAttribute('data-product-id');
          if (productId) {
            window.location.href = `detail.html?id=${encodeURIComponent(productId)}`;
          }
        }
      });

      // 키보드 엔터 접근성 지원
      productGrid.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.target.closest('.quick-like-btn')) {
          const sellerBtn = e.target.closest('.card-seller-btn');
        if (sellerBtn) {
          e.preventDefault();
          e.stopPropagation();
          const sellerName = sellerBtn.getAttribute('data-seller') || '';
          state.seller = sellerName;
          renderProducts();
          showToast(`👤 '${sellerName}' 판매자가 올린 글을 표시합니다.`);
          return;
        }

        const talkBtn = e.target.closest('.card-talk-btn');
        if (talkBtn) {
          e.preventDefault();
          e.stopPropagation();
          const talkId = talkBtn.getAttribute('data-talk-id');
          if (talkId) {
            window.location.href = `detail.html?id=${encodeURIComponent(talkId)}&chat=1`;
          }
          return;
        }

        const card = e.target.closest('.product-card');
          if (card) {
            const productId = card.getAttribute('data-product-id');
            if (productId) {
              window.location.href = `detail.html?id=${encodeURIComponent(productId)}`;
            }
          }
        }
      });
    }

    // 8. 상단 서비스 카테고리 알약 탭 클릭
    const serviceTabs = document.querySelectorAll('.service-pill');
    serviceTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const service = tab.getAttribute('data-service');
        serviceTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        if (service === 'all' || service === 'market') {
          renderProducts();
        } else {
          showToast(`${tab.textContent.trim()} 서비스는 곧 오픈 예정이에요! 현재 중고거래 매물을 보여드려요.`);
        }
      });
    });

    // 9. 페이지네이션 버튼 클릭 인터랙션
    const pageButtons = document.querySelectorAll('.pagination-nav .page-btn');
    pageButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-page');
        if (target === 'prev') {
          state.currentPage = Math.max(1, state.currentPage - 1);
        } else if (target === 'next') {
          state.currentPage = Math.min(5, state.currentPage + 1);
        } else {
          state.currentPage = Number(target) || 1;
        }

        pageButtons.forEach(b => {
          const p = Number(b.getAttribute('data-page'));
          b.classList.toggle('active', p === state.currentPage);
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // 초기화 실행
  document.addEventListener('DOMContentLoaded', () => {
    initFromQueryParams();
    bindEvents();
    renderProducts();

    // Supabase 인기 검색어 동기화
    if (window.HobakSupabaseSync && popularKeywordsWrap) {
      window.HobakSupabaseSync.fetchPopularKeywords().then((rows) => {
        if (Array.isArray(rows) && rows.length > 0) {
          popularKeywordsWrap.innerHTML = rows
            .map(
              (r) =>
                `<button type="button" class="keyword-tag" data-keyword="${escapeHtml(r.keyword)}">#${escapeHtml(r.keyword)}</button>`
            )
            .join('');
          updateHeaderAndFilterUI(getFilteredProducts().length);
        }
      });
    }
  });

  // Supabase 데이터 동기화 완료 시 자동 재렌더링
  window.addEventListener('hobak:synced', () => {
    renderProducts();
  });
})();
