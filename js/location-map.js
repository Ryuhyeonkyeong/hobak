/**
 * 호박 (Hobak) - 구글 지도 기반 현주소 감지 및 적용 모듈 (location-map.js)
 */
(function () {
  'use strict';

  const LOCATION_STORAGE_KEY = 'hobak_current_location_v1';

  let currentLoc = loadSavedLocation() || {
    dong: '양정동',
    fullAddress: '울산광역시 북구 양정동',
    lat: 35.5438,
    lng: 129.3895
  };

  let modalCallback = null;

  function loadSavedLocation() {
    try {
      const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveLocation(loc) {
    currentLoc = loc;
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
    } catch (e) {
      // ignore
    }
  }

  function buildGoogleMapEmbedUrl(queryOrCoords) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(queryOrCoords)}&hl=ko&z=16&output=embed`;
  }

  function buildGoogleMapLinkUrl(queryOrCoords) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryOrCoords)}`;
  }

  // 역지오코딩 (GPS 위도/경도 -> 한국어 행정동/도로명 주소)
  async function reverseGeocodeKorean(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=ko`
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const dong =
          addr.quarter ||
          addr.suburb ||
          addr.neighbourhood ||
          addr.village ||
          addr.town ||
          addr.city_district ||
          addr.borough ||
          '현재 위치';
        const city = addr.city || addr.province || addr.state || '';
        const district = addr.city_district || addr.county || addr.borough || '';
        const fullAddress = [city, district, dong].filter(Boolean).join(' ') || data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        return { dong, fullAddress };
      }
    } catch (e) {
      // fallback below
    }

    try {
      const res2 = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=ko`
      );
      if (res2.ok) {
        const d2 = await res2.json();
        const dong = d2.locality || d2.city || '현재 위치';
        const fullAddress = [d2.principalSubdivision, d2.city, d2.locality].filter(Boolean).join(' ') || dong;
        return { dong, fullAddress };
      }
    } catch (e) {
      // ignore
    }

    return {
      dong: '현재 위치',
      fullAddress: `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`
    };
  }

  // 주소 텍스트로 위경도 검색 (Nominatim)
  async function geocodeAddress(query) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&accept-language=ko&limit=1`
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows[0]) {
          const lat = Number(rows[0].lat);
          const lng = Number(rows[0].lon);
          const parts = String(rows[0].display_name || query).split(',').map((s) => s.trim());
          const dongMatch = query.match(/([가-힣0-9]+(동|읍|면))/);
          const dong = dongMatch ? dongMatch[1] : parts[0] || query;
          return { dong, fullAddress: query, lat, lng };
        }
      }
    } catch (e) {
      // ignore
    }
    return { dong: query, fullAddress: query, lat: currentLoc.lat, lng: currentLoc.lng };
  }

  function injectGoogleMapModal() {
    if (document.getElementById('gmapModalBackdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'gmapModalBackdrop';
    backdrop.className = 'gmap-modal-backdrop';
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <div class="gmap-modal" role="dialog" aria-modal="true" aria-labelledby="gmapModalTitle">
        <div class="gmap-modal-header">
          <h3 class="gmap-modal-title" id="gmapModalTitle">🗺️ 구글 지도로 현주소 설정</h3>
          <button type="button" class="gmap-modal-close" id="gmapModalCloseBtn" aria-label="닫기">✕</button>
        </div>

        <form id="gmapSearchForm" class="gmap-search-row">
          <input
            type="text"
            id="gmapSearchInput"
            class="gmap-search-input"
            placeholder="동네 또는 주소 검색 (예: 서울 강남구 역삼동)"
          />
          <button type="submit" class="hobak-btn hobak-btn-outline" style="height: 40px;">검색</button>
          <button type="button" id="gmapGpsDetectBtn" class="gmap-gps-btn">🎯 현위치 찾기</button>
        </form>

        <div class="gmap-frame-wrap">
          <iframe
            id="gmapEmbedIframe"
            class="gmap-iframe"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            title="구글 지도 현위치"
          ></iframe>
        </div>

        <div class="gmap-status-box">
          <span class="gmap-detected-label" id="gmapStatusLabel">선택된 구글 지도 위치</span>
          <strong class="gmap-detected-address" id="gmapDetectedAddress">${currentLoc.fullAddress}</strong>
          <span class="gmap-detected-coords" id="gmapDetectedCoords">동네명: ${currentLoc.dong}</span>
        </div>

        <div class="gmap-modal-actions">
          <a id="gmapExternalLink" href="#" target="_blank" rel="noopener noreferrer" class="gmap-external-link">
            구글 지도에서 크게 보기 ↗
          </a>
          <button type="button" id="gmapApplyBtn" class="gmap-apply-btn">이 현주소 적용하기</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    document.getElementById('gmapModalCloseBtn').addEventListener('click', closeGoogleMapModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeGoogleMapModal();
    });

    document.getElementById('gmapGpsDetectBtn').addEventListener('click', detectCurrentLocationOnMap);
    document.getElementById('gmapSearchForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = (document.getElementById('gmapSearchInput').value || '').trim();
      if (!q) return;
      document.getElementById('gmapStatusLabel').textContent = '구글 지도에서 주소를 검색하는 중...';
      const found = await geocodeAddress(q);
      updateMapPreview(found);
    });

    document.getElementById('gmapApplyBtn').addEventListener('click', () => {
      saveLocation(currentLoc);
      applyLocationToCurrentPage(currentLoc);
      if (typeof modalCallback === 'function') {
        modalCallback(currentLoc);
      }
      closeGoogleMapModal();
    });
  }

  function updateMapPreview(loc) {
    currentLoc = loc;
    const iframe = document.getElementById('gmapEmbedIframe');
    const addrEl = document.getElementById('gmapDetectedAddress');
    const coordsEl = document.getElementById('gmapDetectedCoords');
    const extLink = document.getElementById('gmapExternalLink');
    const labelEl = document.getElementById('gmapStatusLabel');

    const mapQuery =
      loc.lat && loc.lng && loc.fullAddress && !loc.fullAddress.startsWith('위도')
        ? `${loc.lat},${loc.lng}`
        : loc.fullAddress || `${loc.lat},${loc.lng}`;

    if (iframe) iframe.src = buildGoogleMapEmbedUrl(mapQuery);
    if (extLink) extLink.href = buildGoogleMapLinkUrl(mapQuery);
    if (addrEl) addrEl.textContent = loc.fullAddress;
    if (coordsEl) {
      coordsEl.textContent = `적용될 동네명: ${loc.dong}` + (loc.lat ? ` (${Number(loc.lat).toFixed(4)}, ${Number(loc.lng).toFixed(4)})` : '');
    }
    if (labelEl) labelEl.textContent = '구글 지도 위치 확인 완료';
  }

  function detectCurrentLocationOnMap() {
    const labelEl = document.getElementById('gmapStatusLabel');
    if (!navigator.geolocation) {
      if (labelEl) labelEl.textContent = '이 브라우저는 GPS 위치 감지를 지원하지 않습니다. 위에서 주소를 검색해 주세요.';
      return;
    }

    if (labelEl) labelEl.textContent = '📡 현재 GPS 위치와 주소를 가져오는 중...';

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const geo = await reverseGeocodeKorean(lat, lng);
        updateMapPreview({
          dong: geo.dong,
          fullAddress: geo.fullAddress,
          lat,
          lng
        });
      },
      () => {
        if (labelEl) {
          labelEl.textContent = '위치 권한이 거부되었거나 가져올 수 없습니다. 위 검색창에서 동네를 직접 검색해 보세요.';
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function openGoogleMapModal(initialQueryOrNull, onApplyCallback) {
    injectGoogleMapModal();
    modalCallback = onApplyCallback || null;

    const backdrop = document.getElementById('gmapModalBackdrop');
    if (backdrop) backdrop.hidden = false;

    if (initialQueryOrNull) {
      document.getElementById('gmapSearchInput').value = initialQueryOrNull;
      geocodeAddress(initialQueryOrNull).then(updateMapPreview);
    } else {
      updateMapPreview(currentLoc);
      detectCurrentLocationOnMap();
    }
  }

  function closeGoogleMapModal() {
    const backdrop = document.getElementById('gmapModalBackdrop');
    if (backdrop) backdrop.hidden = true;
  }

  // 현재 열려있는 페이지 UI에 현주소 반영
  function applyLocationToCurrentPage(loc) {
    // 1. 상품 목록 페이지 (index.html)
    const regionLabel = document.getElementById('regionLabel');
    const regionSelect = document.getElementById('regionSelect');
    if (regionLabel && regionSelect) {
      regionLabel.textContent = loc.dong;
      let opt = Array.from(regionSelect.options).find((o) => o.value === loc.dong);
      if (!opt) {
        opt = document.createElement('option');
        opt.value = loc.dong;
        opt.textContent = `📍 ${loc.dong} (현주소)`;
        regionSelect.insertBefore(opt, regionSelect.options[1] || null);
      }
      // 현주소가 기존 샘플 동네가 아니면 필터는 전체로 두되 라벨에 현주소 표시하거나 선택 가능하게
      const hasMatchingProducts = Array.from(document.querySelectorAll('.product-meta')).some((el) =>
        el.textContent.includes(loc.dong)
      );
      if (hasMatchingProducts) {
        regionSelect.value = loc.dong;
        regionSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // 2. 글쓰기 페이지 (write.html)
    const sellerRegionInput = document.getElementById('sellerRegionInput');
    if (sellerRegionInput) {
      sellerRegionInput.value = loc.dong;
      sellerRegionInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // 각 페이지에 구글 지도 현주소 버튼 자동 배치
  function mountLocationButtons() {
    // 1. 목록 페이지: 필터 바에 "🎯 현주소 (구글 지도)" 버튼 추가
    const filterLeft = document.querySelector('.filter-controls-left');
    if (filterLeft && !document.getElementById('listGmapBtn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'listGmapBtn';
      btn.className = 'hobak-gmap-trigger-btn';
      btn.innerHTML = '<span>🎯 현재 위치 (구글 지도)</span>';
      btn.addEventListener('click', () => openGoogleMapModal(null));
      filterLeft.appendChild(btn);

      // 저장된 현주소가 있으면 초기 라벨 반영
      const saved = loadSavedLocation();
      if (saved && saved.dong) {
        const regionLabel = document.getElementById('regionLabel');
        if (regionLabel) regionLabel.textContent = saved.dong;
      }
    }

    // 2. 글쓰기 페이지: 거래 희망 동네 옆에 "🗺️ 구글 지도 현주소" 버튼 추가
    const regionChips = document.querySelector('.region-quick-chips');
    if (regionChips && !document.getElementById('writeGmapBtn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'writeGmapBtn';
      btn.className = 'hobak-gmap-inline-btn';
      btn.innerHTML = '🗺️ 구글 지도 현주소 적용';
      btn.addEventListener('click', () => openGoogleMapModal(null));
      regionChips.appendChild(btn);

      const saved = loadSavedLocation();
      if (saved && saved.dong) {
        const sellerRegionInput = document.getElementById('sellerRegionInput');
        if (sellerRegionInput) {
          sellerRegionInput.value = saved.dong;
          sellerRegionInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }

    // 3. 상세 페이지: 판매자 동네 옆에 "🗺️ 구글 지도 보기" 버튼 추가
    const sellerRegionEl = document.getElementById('sellerRegion');
    if (sellerRegionEl && !document.getElementById('detailGmapBtn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'detailGmapBtn';
      btn.className = 'hobak-gmap-inline-btn';
      btn.style.marginTop = '4px';
      btn.innerHTML = '🗺️ 구글 지도에서 위치 보기';
      btn.addEventListener('click', () => {
        const regionText = (sellerRegionEl.textContent || '양정동').split(',')[0].trim();
        openGoogleMapModal(regionText);
      });
      sellerRegionEl.parentElement.appendChild(btn);
    }
  }

  window.HobakLocation = {
    openGoogleMapModal,
    getCurrentLocation: () => currentLoc
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountLocationButtons);
  } else {
    mountLocationButtons();
  }
})();
