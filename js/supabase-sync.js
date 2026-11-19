/**
 * 호박 (Hobak) - Supabase REST API 실시간 동기화 모듈 (supabase-sync.js)
 * 정규화된 비식별 DB 스키마(profiles, products, product_images, product_likes, chat_messages, search_keywords)와 연동
 */
(function () {
  'use strict';

  const cfg = window.HOBAK_SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.anonKey || !window.HobakStore) return;

  const REST_BASE = `${cfg.url}/rest/v1`;
  const HEADERS = {
    apikey: cfg.anonKey,
    Authorization: `Bearer ${cfg.anonKey}`,
    'Content-Type': 'application/json'
  };

  // 비식별 방문자 키 (PII 미저장)
  function getVisitorKey() {
    const KEY = 'hobak_visitor_key_v1';
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = 'v_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(KEY, v);
    }
    return v;
  }

  function formatRelativeTime(isoStr) {
    if (!isoStr) return '방금 전';
    const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000));
    if (diffSec < 60) return '방금 전';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    return diffDay === 1 ? '어제' : `${diffDay}일 전`;
  }

  function mapRowToProduct(row, likedSet) {
    const imgs = Array.isArray(row.product_images)
      ? row.product_images
          .slice()
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((i) => i.image_url)
      : [];

    const seller = row.profiles || {};
    return {
      id: Number(row.id),
      sellerId: row.seller_id || null,
      title: row.title,
      category: row.category,
      timeAgo: formatRelativeTime(row.bumped_at || row.created_at),
      price: Number(row.price) || 0,
      isFreeShare: Boolean(row.is_free_share),
      status: row.status || '판매중',
      hobakPay: Boolean(row.hobak_pay),
      seller: {
        nickname: seller.nickname || '호박이웃',
        region: row.trade_region || seller.region_name || '양정동',
        mannerTemp: Number(seller.manner_temp) || 37.5,
        avatarEmoji: seller.avatar_emoji || '🎃'
      },
      description: row.description || '',
      chats: Number(row.chats_count) || 0,
      likes: Number(row.likes_count) || 0,
      views: Number(row.views_count) || 0,
      liked: likedSet ? likedSet.has(Number(row.id)) : false,
      images: imgs.length > 0 ? imgs : ['image/product_1.jpg']
    };
  }

  async function syncProductsFromSupabase() {
    try {
      const visitorKey = getVisitorKey();
      const [prodRes, likeRes] = await Promise.all([
        fetch(`${REST_BASE}/products?select=*,profiles(*),product_images(*)&order=id.desc`, {
          method: 'GET',
          headers: HEADERS
        }),
        fetch(`${REST_BASE}/product_likes?select=product_id&visitor_key=eq.${encodeURIComponent(visitorKey)}`, {
          method: 'GET',
          headers: HEADERS
        })
      ]);

      if (!prodRes.ok) return null;
      const rows = await prodRes.json();
      const likeRows = likeRes.ok ? await likeRes.json() : [];
      const likedSet = new Set(Array.isArray(likeRows) ? likeRows.map((l) => Number(l.product_id)) : []);

      if (Array.isArray(rows)) {
        const mapped = rows.map((r) => mapRowToProduct(r, likedSet));
        if (mapped.length > 0) {
          window.HobakStore.saveProducts(mapped);
        }
        window.dispatchEvent(new CustomEvent('hobak:synced', { detail: { products: mapped } }));
        return mapped;
      }
      return [];
    } catch (e) {
      return null;
    }
  }

  async function getAuthHeaders() {
    const client = window.HobakAuth && window.HobakAuth.getClient ? window.HobakAuth.getClient() : null;
    if (client) {
      const { data } = await client.auth.getSession();
      const token = data && data.session && data.session.access_token;
      if (token) {
        return {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
      }
    }
    return HEADERS;
  }

  async function insertProductToSupabase(product) {
    try {
      const authHeaders = await getAuthHeaders();
      const loggedInUser = window.HobakAuth && window.HobakAuth.getUser ? window.HobakAuth.getUser() : null;
      let sellerId = loggedInUser ? loggedInUser.id : null;

      if (sellerId) {
        // 로그인한 작성자의 프로필 동기화 (닉네임/동네/이모지)
        await fetch(`${REST_BASE}/profiles`, {
          method: 'POST',
          headers: { ...authHeaders, Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({
            id: sellerId,
            nickname: product.seller?.nickname || '호박이웃',
            region_name: product.seller?.region || '양정동',
            avatar_emoji: product.seller?.avatarEmoji || '🎃',
            manner_temp: Number(product.seller?.mannerTemp) || 36.5
          })
        });
      } else {
        // 비로그인 폴백 프로필 생성
        const profRes = await fetch(`${REST_BASE}/profiles`, {
          method: 'POST',
          headers: { ...authHeaders, Prefer: 'return=representation' },
          body: JSON.stringify({
            nickname: product.seller?.nickname || '호박이웃',
            region_name: product.seller?.region || '양정동',
            avatar_emoji: product.seller?.avatarEmoji || '🎃',
            manner_temp: Number(product.seller?.mannerTemp) || 37.5
          })
        });
        if (!profRes.ok) return null;
        const profRows = await profRes.json();
        sellerId = profRows[0]?.id;
      }
      if (!sellerId) return null;

      // 2. 상품 등록 (작성자 seller_id 함께 저장)
      const prodRes = await fetch(`${REST_BASE}/products`, {
        method: 'POST',
        headers: { ...authHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({
          seller_id: sellerId,
          title: product.title,
          category: product.category,
          description: product.description || '',
          price: Number(product.price) || 0,
          is_free_share: Boolean(product.isFreeShare),
          status: product.status || '판매중',
          hobak_pay: Boolean(product.hobakPay),
          trade_region: product.seller?.region || '양정동',
          views_count: 1,
          likes_count: 0,
          chats_count: 0
        })
      });
      if (!prodRes.ok) return null;
      const prodRows = await prodRes.json();
      const newProductId = prodRows[0]?.id;
      if (!newProductId) return null;

      // 3. 이미지 등록
      const imgs = Array.isArray(product.images) ? product.images : [];
      if (imgs.length > 0) {
        await fetch(`${REST_BASE}/product_images`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(
            imgs.map((url, idx) => ({
              product_id: newProductId,
              image_url: url,
              sort_order: idx
            }))
          )
        });
      }

      return Number(newProductId);
    } catch (e) {
      return null;
    }
  }

  /**
   * 글쓰기 페이지에서 await으로 호출: DB 저장 완료 후 실제 DB ID를 반영해 반환
   */
  async function createProductAsync(newProductData) {
    const localCreated = window.HobakStore.addProduct(newProductData);
    const loggedInUser = window.HobakAuth && window.HobakAuth.getUser ? window.HobakAuth.getUser() : null;
    if (loggedInUser) {
      localCreated.sellerId = loggedInUser.id;
    }
    const dbId = await insertProductToSupabase(localCreated);
    if (dbId) {
      const products = window.HobakStore.getProducts();
      const idx = products.findIndex((p) => Number(p.id) === Number(localCreated.id));
      if (idx !== -1) {
        products[idx].id = dbId;
        products[idx].sellerId = loggedInUser ? loggedInUser.id : products[idx].sellerId;
        window.HobakStore.saveProducts(products);
        localCreated.id = dbId;
      }
      window.HobakStore.markAsMyPost(dbId);
    }
    return localCreated;
  }

  async function updateProductAsync(id, updatedData) {
    const localUpdated = window.HobakStore.updateProduct(id, updatedData);
    try {
      const authHeaders = await getAuthHeaders();
      const priceNum = Number(updatedData.price) || 0;
      const isFree = Boolean(updatedData.isFreeShare) || priceNum === 0;
      await fetch(`${REST_BASE}/products?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          title: updatedData.title,
          category: updatedData.category,
          description: updatedData.description,
          price: isFree ? 0 : priceNum,
          is_free_share: isFree,
          hobak_pay: Boolean(updatedData.hobakPay),
          trade_region: updatedData.seller?.region || '양정동'
        })
      });
    } catch (e) {
      // ignore offline
    }
    return localUpdated;
  }

  async function deleteProductAsync(id) {
    window.HobakStore.deleteProduct(id);
    try {
      const authHeaders = await getAuthHeaders();
      await fetch(`${REST_BASE}/products?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders
      });
    } catch (e) {
      // ignore offline
    }
    return true;
  }

  async function syncLikeToSupabase(product) {
    try {
      const visitorKey = getVisitorKey();
      if (product.liked) {
        await fetch(`${REST_BASE}/product_likes`, {
          method: 'POST',
          headers: { ...HEADERS, Prefer: 'resolution=ignore-duplicates' },
          body: JSON.stringify({ product_id: product.id, visitor_key: visitorKey })
        });
      } else {
        await fetch(
          `${REST_BASE}/product_likes?product_id=eq.${encodeURIComponent(product.id)}&visitor_key=eq.${encodeURIComponent(visitorKey)}`,
          { method: 'DELETE', headers: HEADERS }
        );
      }
      await fetch(`${REST_BASE}/products?id=eq.${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ likes_count: product.likes })
      });
    } catch (e) {
      // ignore offline
    }
  }

  async function patchProductInSupabase(id, fields) {
    try {
      await fetch(`${REST_BASE}/products?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(fields)
      });
    } catch (e) {
      // ignore offline
    }
  }

  async function loadChatMessages(productId) {
    try {
      const roomKey = `room_${productId}_${getVisitorKey()}`;
      const res = await fetch(
        `${REST_BASE}/chat_messages?select=*&product_id=eq.${encodeURIComponent(productId)}&room_key=eq.${encodeURIComponent(roomKey)}&order=id.asc`,
        { method: 'GET', headers: HEADERS }
      );
      if (!res.ok) return [];
      const rows = await res.json();
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      return [];
    }
  }

  async function saveChatMessage(productId, senderRole, message, newChatsCount) {
    try {
      const roomKey = `room_${productId}_${getVisitorKey()}`;
      await fetch(`${REST_BASE}/chat_messages`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          product_id: Number(productId),
          room_key: roomKey,
          sender_role: senderRole,
          message
        })
      });
      if (typeof newChatsCount === 'number') {
        await patchProductInSupabase(productId, { chats_count: newChatsCount });
      }
    } catch (e) {
      // ignore offline
    }
  }

  async function fetchPopularKeywords() {
    try {
      const res = await fetch(
        `${REST_BASE}/search_keywords?select=keyword,hit_count&order=hit_count.desc&limit=10`,
        { method: 'GET', headers: HEADERS }
      );
      if (!res.ok) return null;
      const rows = await res.json();
      return Array.isArray(rows) ? rows : null;
    } catch (e) {
      return null;
    }
  }

  async function recordSearchKeyword(keyword) {
    const kw = String(keyword || '').trim();
    if (kw.length < 2) return;
    try {
      const res = await fetch(
        `${REST_BASE}/search_keywords?keyword=eq.${encodeURIComponent(kw)}`,
        { method: 'GET', headers: HEADERS }
      );
      const rows = res.ok ? await res.json() : [];
      if (Array.isArray(rows) && rows[0]) {
        await fetch(`${REST_BASE}/search_keywords?keyword=eq.${encodeURIComponent(kw)}`, {
          method: 'PATCH',
          headers: HEADERS,
          body: JSON.stringify({
            hit_count: (Number(rows[0].hit_count) || 1) + 1,
            updated_at: new Date().toISOString()
          })
        });
      } else {
        await fetch(`${REST_BASE}/search_keywords`, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({ keyword: kw, hit_count: 1 })
        });
      }
    } catch (e) {
      // ignore offline
    }
  }

  const origToggleLike = window.HobakStore.toggleLike.bind(window.HobakStore);
  window.HobakStore.toggleLike = function (id) {
    const updated = origToggleLike(id);
    if (updated) syncLikeToSupabase(updated);
    return updated;
  };

  const origUpdateStatus = window.HobakStore.updateStatus.bind(window.HobakStore);
  window.HobakStore.updateStatus = function (id, status) {
    const updated = origUpdateStatus(id, status);
    if (updated) patchProductInSupabase(updated.id, { status: updated.status });
    return updated;
  };

  const origIncrementView = window.HobakStore.incrementView.bind(window.HobakStore);
  window.HobakStore.incrementView = function (id) {
    const updated = origIncrementView(id);
    if (updated) patchProductInSupabase(updated.id, { views_count: updated.views });
    return updated;
  };

  window.HobakSupabaseSync = {
    syncProductsFromSupabase,
    createProductAsync,
    updateProductAsync,
    deleteProductAsync,
    insertProductToSupabase,
    patchProductInSupabase,
    loadChatMessages,
    saveChatMessage,
    fetchPopularKeywords,
    recordSearchKeyword
  };

  document.addEventListener('DOMContentLoaded', () => {
    syncProductsFromSupabase();
  });
})();
