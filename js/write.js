/**
 * 호박 (Hobak) 중고거래 웹서비스 - 내 물건 팔기 (write.js)
 * 좌측 입력 폼 제어 + 우측 실시간 상품 상세 미리보기 + HobakStore.addProduct 등록
 */

(function () {
  'use strict';

  const MAX_IMAGES = 5;
  const editParams = new URLSearchParams(window.location.search);
  const editProductId = editParams.get('edit') ? Number(editParams.get('edit')) : null;

  // 상태 관리 객체
  const state = {
    images: [],
    activePreviewIdx: 0,
    title: '',
    category: '취미/게임/음반',
    isFreeShare: false,
    price: 114000,
    hobakPay: true,
    sellerNickname: '헤엄치는오리',
    sellerEmoji: '🦆',
    sellerRegion: '화정동, 대송동',
    mannerTemp: 37.2,
    description: ''
  };

  // 카테고리별 기본 실물 사진 (이미지 미등록 시 실시간 미리보기용)
  const CATEGORY_REAL_PHOTO = {
    '디지털기기': 'image/product_6.jpg',
    '생활가전': 'image/product_4.jpg',
    '가구/인테리어': 'image/product_9.jpg',
    '여성잡화': 'image/product_3.jpg',
    '뷰티/미용': 'image/product_5.jpg',
    '스포츠/레저': 'image/product_2.jpg',
    '취미/게임/음반': 'image/product_1.jpg',
    '도서': 'image/product_10.jpg',
    '기타 중고물품': 'image/product_7.jpg'
  };

  // 원클릭 실물 사진 프리셋 정의
  const IMAGE_PRESETS = {
    game: () => 'image/product_1.jpg',
    digital: () => 'image/product_6.jpg',
    bike: () => 'image/product_2.jpg',
    fashion: () => 'image/product_3.jpg',
    appliance: () => 'image/product_4.jpg'
  };

  // DOM 요소 참조
  const els = {
    form: document.getElementById('productWriteForm'),
    headerSubmitBtn: document.getElementById('headerSubmitBtn'),
    fillDemoBtn: document.getElementById('fillDemoBtn'),

    // 이미지 업로드
    imageFileInput: document.getElementById('imageFileInput'),
    imageDropZone: document.getElementById('imageDropZone'),
    uploadedImageList: document.getElementById('uploadedImageList'),
    imageCountText: document.getElementById('imageCountText'),
    boxImageCount: document.getElementById('boxImageCount'),
    presetBtns: document.querySelectorAll('.preset-img-btn'),

    // 제목 & 카테고리
    titleInput: document.getElementById('titleInput'),
    titleCharCount: document.getElementById('titleCharCount'),
    titleError: document.getElementById('titleError'),
    categoryPills: document.querySelectorAll('.category-pill'),
    selectedCategoryText: document.getElementById('selectedCategoryText'),

    // 거래 방식 & 가격
    modeSellBtn: document.getElementById('modeSellBtn'),
    modeFreeBtn: document.getElementById('modeFreeBtn'),
    hobakPayInput: document.getElementById('hobakPayInput'),
    priceInputWrap: document.getElementById('priceInputWrap'),
    priceInput: document.getElementById('priceInput'),
    priceError: document.getElementById('priceError'),

    // 판매자 & 동네
    sellerEmojiSelect: document.getElementById('sellerEmojiSelect'),
    sellerNicknameInput: document.getElementById('sellerNicknameInput'),
    sellerRegionInput: document.getElementById('sellerRegionInput'),
    regionChips: document.querySelectorAll('.region-chip'),

    // 상세 설명
    descInput: document.getElementById('descInput'),
    descCharCount: document.getElementById('descCharCount'),
    descError: document.getElementById('descError'),

    // 우측 실시간 미리보기
    previewBreadcrumbCat: document.getElementById('previewBreadcrumbCat'),
    previewBreadcrumbTitle: document.getElementById('previewBreadcrumbTitle'),
    previewMainImage: document.getElementById('previewMainImage'),
    previewImgCountBadge: document.getElementById('previewImgCountBadge'),
    previewThumbDots: document.getElementById('previewThumbDots'),
    previewSellerEmoji: document.getElementById('previewSellerEmoji'),
    previewSellerName: document.getElementById('previewSellerName'),
    previewSellerRegion: document.getElementById('previewSellerRegion'),
    previewMannerTemp: document.getElementById('previewMannerTemp'),
    previewHobakPayBadge: document.getElementById('previewHobakPayBadge'),
    previewTitle: document.getElementById('previewTitle'),
    previewCategoryLink: document.getElementById('previewCategoryLink'),
    previewPrice: document.getElementById('previewPrice'),
    previewDescription: document.getElementById('previewDescription')
  };

  // 숫자 천단위 콤마 포맷팅
  function formatWithCommas(value) {
    const digits = String(value).replace(/[^\d]/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('ko-KR');
  }

  function parseNumericPrice(value) {
    const digits = String(value).replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  }

  // 이미지 추가 공통 함수 (최대 5장)
  function addImageDataUri(dataUri) {
    if (state.images.length >= MAX_IMAGES) {
      alert(`상품 이미지는 최대 ${MAX_IMAGES}장까지 등록할 수 있어요.`);
      return false;
    }
    state.images.push(dataUri);
    state.activePreviewIdx = state.images.length - 1;
    renderUploadedThumbnails();
    updateLivePreview();
    return true;
  }

  // 로컬 이미지 파일 읽기 (FileReader -> DataURL)
  function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    const remaining = MAX_IMAGES - state.images.length;
    if (remaining <= 0) {
      alert(`상품 이미지는 최대 ${MAX_IMAGES}장까지 등록할 수 있어요.`);
      return;
    }

    const filesToRead = Array.from(fileList).slice(0, remaining);
    filesToRead.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          addImageDataUri(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // 등록된 썸네일 목록 렌더링
  function renderUploadedThumbnails() {
    const count = state.images.length;
    els.imageCountText.textContent = String(count);
    els.boxImageCount.textContent = String(count);
    els.uploadedImageList.innerHTML = '';

    state.images.forEach((src, idx) => {
      const item = document.createElement('div');
      item.className = 'uploaded-thumb-item' + (idx === state.activePreviewIdx ? ' active-thumb' : '');
      item.title = '클릭하여 미리보기에서 확인';

      const img = document.createElement('img');
      img.src = src;
      img.alt = `등록 이미지 ${idx + 1}`;
      item.appendChild(img);

      if (idx === 0) {
        const badge = document.createElement('span');
        badge.className = 'thumb-rep-badge';
        badge.textContent = '대표 사진';
        item.appendChild(badge);
      }

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'thumb-remove-btn';
      removeBtn.setAttribute('aria-label', `이미지 ${idx + 1} 삭제`);
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.images.splice(idx, 1);
        if (state.activePreviewIdx >= state.images.length) {
          state.activePreviewIdx = Math.max(0, state.images.length - 1);
        }
        renderUploadedThumbnails();
        updateLivePreview();
      });

      item.addEventListener('click', () => {
        state.activePreviewIdx = idx;
        renderUploadedThumbnails();
        updateLivePreview();
      });

      item.appendChild(removeBtn);
      els.uploadedImageList.appendChild(item);
    });
  }

  // 우측 실시간 상세 미리보기 업데이트
  function updateLivePreview() {
    const displayTitle = state.title.trim() || '그루퍼너 SJ mz-24 RC 조종기';
    const displayCategory = state.category || '취미/게임/음반';
    const displayDesc =
      state.description.trim() ||
      '그루퍼너 SJ의 mz-24 모델 조종기예요. 조종기와 함께 GR-24L 수신기, 배터리, 연결 케이블이 포함되어 있어요. 정밀한 조종이 필요한 RC 비행 취미를 즐기기에 적합한 구성이에요.\n\n직거래는 화정동 또는 대송동 인근에서 가능하고, 파손면책 동의 시 택배 거래도 가능합니다.';

    // 브레드크럼 & 본문 텍스트
    els.previewBreadcrumbCat.textContent = displayCategory;
    els.previewBreadcrumbTitle.textContent = displayTitle;
    els.previewTitle.textContent = displayTitle;
    els.previewCategoryLink.textContent = displayCategory;
    els.previewDescription.textContent = displayDesc;

    // 판매자 정보
    els.previewSellerEmoji.textContent = state.sellerEmoji || '🦆';
    els.previewSellerName.textContent = state.sellerNickname.trim() || '헤엄치는오리';
    els.previewSellerRegion.textContent = state.sellerRegion.trim() || '화정동, 대송동';
    els.previewMannerTemp.textContent = `${state.mannerTemp.toFixed(1)}°C`;

    // 호박페이 배지
    if (state.hobakPay) {
      els.previewHobakPayBadge.style.display = 'inline-flex';
    } else {
      els.previewHobakPayBadge.style.display = 'none';
    }

    // 가격 표시
    if (state.isFreeShare || state.price === 0) {
      els.previewPrice.textContent = '나눔🧡';
      els.previewPrice.classList.add('free-share');
    } else {
      els.previewPrice.textContent = state.price.toLocaleString('ko-KR') + '원';
      els.previewPrice.classList.remove('free-share');
    }

    // 대표 이미지 및 인디케이터 점 렌더링
    els.previewThumbDots.innerHTML = '';
    if (state.images.length > 0) {
      const safeIdx = Math.min(state.activePreviewIdx, state.images.length - 1);
      els.previewMainImage.src = state.images[safeIdx];
      els.previewImgCountBadge.textContent = `${safeIdx + 1} / ${state.images.length}`;

      state.images.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'preview-dot' + (idx === safeIdx ? ' active' : '');
        dot.setAttribute('aria-label', `${idx + 1}번 이미지 보기`);
        dot.addEventListener('click', () => {
          state.activePreviewIdx = idx;
          renderUploadedThumbnails();
          updateLivePreview();
        });
        els.previewThumbDots.appendChild(dot);
      });
    } else {
      const autoPhoto = CATEGORY_REAL_PHOTO[displayCategory] || 'image/product_1.jpg';
      els.previewMainImage.src = autoPhoto;
      els.previewImgCountBadge.textContent = '실물 사진 미리보기';
    }
  }

  // 거래 방식 (판매하기 / 무료나눔) 전환
  function setTradeMode(mode) {
    if (mode === 'free') {
      state.isFreeShare = true;
      state.price = 0;
      els.modeFreeBtn.classList.add('active');
      els.modeSellBtn.classList.remove('active');
      els.priceInput.value = '0';
      els.priceInput.disabled = true;
      els.priceInputWrap.classList.add('disabled');
      clearFieldError(els.priceInput, els.priceError);
    } else {
      state.isFreeShare = false;
      els.modeSellBtn.classList.add('active');
      els.modeFreeBtn.classList.remove('active');
      els.priceInput.disabled = false;
      els.priceInputWrap.classList.remove('disabled');
      if (els.priceInput.value === '0') {
        els.priceInput.value = '';
        state.price = 0;
      }
    }
    updateLivePreview();
  }

  // 에러 표시/해제 헬퍼
  function showFieldError(inputEl, errorEl, message) {
    if (inputEl) inputEl.classList.add('input-invalid');
    if (errorEl) {
      if (message) errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  }

  function clearFieldError(inputEl, errorEl) {
    if (inputEl) inputEl.classList.remove('input-invalid');
    if (errorEl) errorEl.classList.remove('visible');
  }

  // 예시 데이터 자동 채우기 (그루퍼너 SJ mz-24 RC 조종기)
  function fillDemoData() {
    state.title = '그루퍼너 SJ mz-24 RC 조종기';
    state.category = '취미/게임/음반';
    state.isFreeShare = false;
    state.price = 114000;
    state.hobakPay = true;
    state.sellerNickname = '헤엄치는오리';
    state.sellerEmoji = '🦆';
    state.sellerRegion = '화정동, 대송동';
    state.description =
      '그루퍼너 SJ의 mz-24 모델 조종기예요. 조종기와 함께 GR-24L 수신기, 배터리, 연결 케이블이 포함되어 있어요. 정밀한 조종이 필요한 RC 비행 취미를 즐기기에 적합한 구성이에요.\n\n직거래는 화정동 또는 대송동 인근에서 가능하고, 파손면책 동의 시 택배 거래도 가능합니다.';

    state.images = [
      'image/product_1.jpg',
      'image/product_1_sub.jpg'
    ];
    state.activePreviewIdx = 0;

    // 폼 입력값 동기화
    els.titleInput.value = state.title;
    els.titleCharCount.textContent = `${state.title.length} / 60`;

    els.categoryPills.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.category === state.category);
    });
    els.selectedCategoryText.textContent = state.category;

    setTradeMode('sell');
    els.priceInput.value = formatWithCommas(state.price);
    els.hobakPayInput.checked = state.hobakPay;

    els.sellerEmojiSelect.value = state.sellerEmoji;
    els.sellerNicknameInput.value = state.sellerNickname;
    els.sellerRegionInput.value = state.sellerRegion;
    els.regionChips.forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.region === state.sellerRegion);
    });

    els.descInput.value = state.description;
    els.descCharCount.textContent = `${state.description.length} / 1000`;

    clearFieldError(els.titleInput, els.titleError);
    clearFieldError(els.priceInput, els.priceError);
    clearFieldError(els.descInput, els.descError);

    renderUploadedThumbnails();
    updateLivePreview();
  }

  // 폼 검증 및 상품 등록 제출 (Supabase DB 비동기 저장 후 상세 페이지 이동)
  async function handleFormSubmit(e) {
    if (e) e.preventDefault();

    let isValid = true;
    const titleVal = els.titleInput.value.trim();
    const descVal = els.descInput.value.trim();
    const priceVal = state.isFreeShare ? 0 : parseNumericPrice(els.priceInput.value);

    // 1. 제목 검증
    if (titleVal.length < 2) {
      showFieldError(els.titleInput, els.titleError, '상품 제목을 2자 이상 입력해 주세요.');
      if (isValid) els.titleInput.focus();
      isValid = false;
    } else {
      clearFieldError(els.titleInput, els.titleError);
    }

    // 2. 가격 검증 (판매하기 모드일 때)
    if (!state.isFreeShare && (!els.priceInput.value.trim() || priceVal <= 0)) {
      showFieldError(els.priceInput, els.priceError, '판매 가격을 입력하거나 무료나눔을 선택해 주세요.');
      if (isValid) els.priceInput.focus();
      isValid = false;
    } else {
      clearFieldError(els.priceInput, els.priceError);
    }

    // 3. 상세 설명 검증
    if (descVal.length < 5) {
      showFieldError(els.descInput, els.descError, '이웃이 알기 쉽게 상품 설명을 5자 이상 작성해 주세요.');
      if (isValid) els.descInput.focus();
      isValid = false;
    } else {
      clearFieldError(els.descInput, els.descError);
    }

    if (!isValid) return;

    const payload = {
      title: titleVal,
      category: state.category,
      price: priceVal,
      isFreeShare: state.isFreeShare || priceVal === 0,
      status: '판매중',
      hobakPay: Boolean(els.hobakPayInput.checked),
      seller: {
        nickname: els.sellerNicknameInput.value.trim() || '헤엄치는오리',
        region: els.sellerRegionInput.value.trim() || '양정동',
        mannerTemp: state.mannerTemp,
        avatarEmoji: els.sellerEmojiSelect.value || '🦆'
      },
      description: descVal,
      images: state.images
    };

    const bottomBtn = document.getElementById('bottomSubmitBtn');
    if (bottomBtn) {
      bottomBtn.disabled = true;
      bottomBtn.textContent = editProductId ? '⏳ 수정 내용 저장 중...' : '⏳ Supabase에 등록 중...';
    }
    if (els.headerSubmitBtn) {
      els.headerSubmitBtn.disabled = true;
    }

    let savedProduct;
    if (editProductId) {
      if (window.HobakSupabaseSync && typeof window.HobakSupabaseSync.updateProductAsync === 'function') {
        savedProduct = await window.HobakSupabaseSync.updateProductAsync(editProductId, payload);
      } else {
        savedProduct = window.HobakStore.updateProduct(editProductId, payload);
      }
      window.location.href = `detail.html?id=${editProductId}`;
      return;
    }

    if (window.HobakSupabaseSync && typeof window.HobakSupabaseSync.createProductAsync === 'function') {
      savedProduct = await window.HobakSupabaseSync.createProductAsync(payload);
    } else {
      savedProduct = window.HobakStore.addProduct(payload);
    }

    // 등록된 상품 상세 페이지로 즉시 이동
    window.location.href = `detail.html?id=${savedProduct.id}`;
  }

  // 이벤트 바인딩 초기화
  function initEvents() {
    // 로컬 파일 업로드
    els.imageFileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      e.target.value = '';
    });

    // 드래그 앤 드롭 업로드 지원
    ['dragenter', 'dragover'].forEach((evtName) => {
      els.imageDropZone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        els.imageDropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((evtName) => {
      els.imageDropZone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        els.imageDropZone.classList.remove('dragover');
      });
    });

    els.imageDropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    });

    // 원클릭 프리셋 이미지 버튼
    els.presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.preset;
        const generator = IMAGE_PRESETS[key];
        if (generator) {
          addImageDataUri(generator());
        }
      });
    });

    // 제목 입력
    els.titleInput.addEventListener('input', () => {
      state.title = els.titleInput.value;
      els.titleCharCount.textContent = `${state.title.length} / 60`;
      if (state.title.trim().length >= 2) {
        clearFieldError(els.titleInput, els.titleError);
      }
      updateLivePreview();
    });

    // 카테고리 알약 선택
    els.categoryPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        els.categoryPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        state.category = pill.dataset.category;
        els.selectedCategoryText.textContent = state.category;
        updateLivePreview();
      });
    });

    // 거래 방식 토글
    els.modeSellBtn.addEventListener('click', () => setTradeMode('sell'));
    els.modeFreeBtn.addEventListener('click', () => setTradeMode('free'));

    // 가격 입력 (천단위 콤마 자동 포맷)
    els.priceInput.addEventListener('input', () => {
      if (state.isFreeShare) return;
      const formatted = formatWithCommas(els.priceInput.value);
      els.priceInput.value = formatted;
      state.price = parseNumericPrice(formatted);
      if (state.price > 0) {
        clearFieldError(els.priceInput, els.priceError);
      }
      updateLivePreview();
    });

    // 호박페이 체크박스
    els.hobakPayInput.addEventListener('change', () => {
      state.hobakPay = els.hobakPayInput.checked;
      updateLivePreview();
    });

    // 판매자 이모지 / 닉네임 / 동네
    els.sellerEmojiSelect.addEventListener('change', () => {
      state.sellerEmoji = els.sellerEmojiSelect.value;
      updateLivePreview();
    });

    els.sellerNicknameInput.addEventListener('input', () => {
      state.sellerNickname = els.sellerNicknameInput.value;
      updateLivePreview();
    });

    els.sellerRegionInput.addEventListener('input', () => {
      state.sellerRegion = els.sellerRegionInput.value;
      const regionName = state.sellerRegion.trim() || '양정동';
      els.descInput.placeholder = `${regionName} 이웃에게 올릴 게시글 내용을 작성해 주세요. 구매 시기, 브랜드/모델명, 제품의 상태(사용감, 하자 유무) 등을 입력하면 빠른 거래에 도움이 돼요.`;
      els.regionChips.forEach((chip) => {
        chip.classList.toggle('active', chip.dataset.region === state.sellerRegion.trim());
      });
      updateLivePreview();
    });

    els.regionChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const region = chip.dataset.region;
        els.sellerRegionInput.value = region;
        state.sellerRegion = region;
        els.regionChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        els.descInput.placeholder = `${region} 이웃에게 올릴 게시글 내용을 작성해 주세요. 구매 시기, 브랜드/모델명, 제품의 상태(사용감, 하자 유무) 등을 입력하면 빠른 거래에 도움이 돼요.`;
        updateLivePreview();
      });
    });

    // 자세한 설명 입력
    els.descInput.addEventListener('input', () => {
      state.description = els.descInput.value;
      els.descCharCount.textContent = `${state.description.length} / 1000`;
      if (state.description.trim().length >= 5) {
        clearFieldError(els.descInput, els.descError);
      }
      updateLivePreview();
    });

    // 예시 자동채우기 버튼
    els.fillDemoBtn.addEventListener('click', fillDemoData);

    // 폼 제출 & 상단 헤더 '작성 완료' 버튼 연동
    els.form.addEventListener('submit', handleFormSubmit);
    els.headerSubmitBtn.addEventListener('click', handleFormSubmit);
  }

  function loadEditProductIfNeeded() {
    if (!editProductId || !window.HobakStore) return;
    const target = window.HobakStore.getProductById(editProductId);
    if (!target) return;

    state.title = target.title || '';
    state.category = target.category || '취미/게임/음반';
    state.isFreeShare = Boolean(target.isFreeShare) || Number(target.price) === 0;
    state.price = Number(target.price) || 0;
    state.hobakPay = Boolean(target.hobakPay);
    state.sellerNickname = (target.seller && target.seller.nickname) || '호박이웃';
    state.sellerEmoji = (target.seller && target.seller.avatarEmoji) || '🎃';
    state.sellerRegion = (target.seller && target.seller.region) || '양정동';
    state.description = target.description || '';
    state.images = Array.isArray(target.images) ? [...target.images] : [];
    state.activePreviewIdx = 0;

    els.titleInput.value = state.title;
    els.titleCharCount.textContent = `${state.title.length} / 60`;
    els.categoryPills.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.category === state.category);
    });
    els.selectedCategoryText.textContent = state.category;
    setTradeMode(state.isFreeShare ? 'free' : 'sell');
    if (!state.isFreeShare) els.priceInput.value = formatWithCommas(state.price);
    els.hobakPayInput.checked = state.hobakPay;
    els.sellerEmojiSelect.value = state.sellerEmoji;
    els.sellerNicknameInput.value = state.sellerNickname;
    els.sellerRegionInput.value = state.sellerRegion;
    els.descInput.value = state.description;
    els.descCharCount.textContent = `${state.description.length} / 1000`;

    const headerTitle = document.querySelector('.write-header-title');
    if (headerTitle) headerTitle.textContent = '게시글 수정하기';
    const bottomBtn = document.getElementById('bottomSubmitBtn');
    if (bottomBtn) bottomBtn.textContent = '✏️ 수정 완료 및 저장하기';
    if (els.headerSubmitBtn) els.headerSubmitBtn.textContent = '수정 완료';
  }

  // 초기 실행
  document.addEventListener('DOMContentLoaded', () => {
    els.priceInput.value = formatWithCommas(state.price);
    initEvents();
    loadEditProductIfNeeded();
    renderUploadedThumbnails();
    updateLivePreview();
  });
})();
