/**
 * 호박 (Hobak) 중고거래 웹서비스 - 공통 데이터 및 스토리지 모듈 (실물 사진 버전)
 */

const STORAGE_KEY = 'hobak_products_v2_real_photos';

// 카테고리별 기본 실물 사진 매핑
const DEFAULT_REAL_PHOTO_BY_CATEGORY = {
  '취미/게임/음반': 'image/product_1.jpg',
  '스포츠/레저': 'image/product_2.jpg',
  '여성잡화': 'image/product_3.jpg',
  '여성패션/잡화': 'image/product_3.jpg',
  '생활가전': 'image/product_4.jpg',
  '뷰티/미용': 'image/product_5.jpg',
  '디지털기기': 'image/product_6.jpg',
  '가구/인테리어': 'image/product_9.jpg',
  '도서': 'image/product_10.jpg',
  '기타 중고물품': 'image/product_7.jpg'
};

function createProductSvgDataUri(bg1, bg2, emoji, label, sublabel = '') {
  // 하위 호환성 유지: 텍스트나 카테고리에 맞는 실물 이미지 경로 반환
  if (DEFAULT_REAL_PHOTO_BY_CATEGORY[label]) {
    return DEFAULT_REAL_PHOTO_BY_CATEGORY[label];
  }
  if (DEFAULT_REAL_PHOTO_BY_CATEGORY[sublabel]) {
    return DEFAULT_REAL_PHOTO_BY_CATEGORY[sublabel];
  }
  return 'image/product_1.jpg';
}

const INITIAL_PRODUCTS = [
  {
    id: 1,
    title: '그루퍼너 SJ mz-24 RC 조종기',
    category: '취미/게임/음반',
    timeAgo: '끌올 2시간 전',
    price: 114000,
    isFreeShare: false,
    status: '판매중', // 판매중 | 예약중 | 판매완료
    hobakPay: false,
    seller: {
      nickname: '헤엄치는오리',
      region: '화정동, 대송동',
      mannerTemp: 37.2,
      avatarEmoji: '🦆'
    },
    description: '그루퍼너 SJ의 mz-24 모델 조종기예요. 조종기와 함께 GR-24L 수신기, 배터리, 연결 케이블이 포함되어 있어요. 정밀한 조종이 필요한 RC 비행 취미를 즐기기에 적합한 구성이에요.\n\n직거래는 화정동 또는 대송동 인근에서 가능하고, 파손면책 동의 시 택배 거래도 가능합니다.',
    chats: 0,
    likes: 1,
    views: 21,
    liked: false,
    images: [
      'image/product_1.jpg',
      'image/product_1_sub.jpg'
    ]
  },
  {
    id: 2,
    title: '벨롭 벨로시랩터 전기자전거 풀세트',
    category: '스포츠/레저',
    timeAgo: '15분 전',
    price: 205000,
    isFreeShare: false,
    status: '판매중',
    hobakPay: true,
    seller: {
      nickname: '바람라이더',
      region: '양정동',
      mannerTemp: 41.5,
      avatarEmoji: '🚲'
    },
    description: '출퇴근용으로 아껴 타던 벨롭 전기자전거입니다. 배터리 효율 90% 이상 유지 중이며 전용 충전기, 휴대폰 거치대, 후미등 모두 함께 드립니다. 양정동 주민센터 앞에서 시승 후 직거래 원해요.',
    chats: 3,
    likes: 8,
    views: 112,
    liked: false,
    images: [
      'image/product_2.jpg'
    ]
  },
  {
    id: 3,
    title: '정품 구찌 마몬트 마틀라세 카드지갑 (박스 풀구성)',
    category: '여성잡화',
    timeAgo: '42분 전',
    price: 90000,
    isFreeShare: false,
    status: '판매중',
    hobakPay: true,
    seller: {
      nickname: '호박공주',
      region: '양정동',
      mannerTemp: 39.8,
      avatarEmoji: '👜'
    },
    description: '백화점 정품 구찌 마몬트 카드지갑입니다. 모서리 까짐 거의 없고 가죽 컨디션 아주 좋습니다. 더스트백, 케이스, 쇼핑백까지 풀구성으로 드려요.',
    chats: 2,
    likes: 14,
    views: 189,
    liked: true,
    images: [
      'image/product_3.jpg'
    ]
  },
  {
    id: 4,
    title: '드롱기 데디카 반자동 커피머신 EC685',
    category: '생활가전',
    timeAgo: '1시간 전',
    price: 50000,
    isFreeShare: false,
    status: '판매완료',
    hobakPay: false,
    seller: {
      nickname: '모닝에스프레소',
      region: '염포동',
      mannerTemp: 38.4,
      avatarEmoji: '☕'
    },
    description: '집에서 홈카페용으로 사용하던 드롱기 반자동 머신입니다. 스팀 노즐까지 정상 작동하며 기본 포터필터와 템퍼 같이 챙겨드립니다.',
    chats: 5,
    likes: 9,
    views: 143,
    liked: false,
    images: [
      'image/product_4.jpg'
    ]
  },
  {
    id: 5,
    title: '다이슨 에어랩 멀티 스타일러 컴플리트 롱',
    category: '뷰티/미용',
    timeAgo: '끌올 3시간 전',
    price: 280000,
    isFreeShare: false,
    status: '예약중',
    hobakPay: true,
    seller: {
      nickname: '봄날의햇살',
      region: '양정동',
      mannerTemp: 43.1,
      avatarEmoji: '✨'
    },
    description: '국내 정식 발매품 다이슨 에어랩 컴플리트 롱입니다. 거치대와 모든 배럴 구성품 포함이며 필터 청소까지 깔끔하게 완료해 두었습니다.',
    chats: 7,
    likes: 22,
    views: 310,
    liked: false,
    images: [
      'image/product_5.jpg'
    ]
  },
  {
    id: 6,
    title: '아이패드 프로 11인치 4세대 M2 128G 스페이스그레이',
    category: '디지털기기',
    timeAgo: '3시간 전',
    price: 680000,
    isFreeShare: false,
    status: '판매중',
    hobakPay: true,
    seller: {
      nickname: '테크매니아',
      region: '화정동',
      mannerTemp: 40.2,
      avatarEmoji: '💻'
    },
    description: '배터리 성능 97%, 사이클 38회인 민트급 아이패드 프로 11인치 M2 모델입니다. 구매 직후 종이질감 필름 부착했고 자석 케이스 같이 드립니다.',
    chats: 4,
    likes: 19,
    views: 275,
    liked: false,
    images: [
      'image/product_6.jpg'
    ]
  },
  {
    id: 7,
    title: '감성 캠핑 우드 롤테이블 120 사이즈 (수납가방 포함)',
    category: '스포츠/레저',
    timeAgo: '4시간 전',
    price: 45000,
    isFreeShare: false,
    status: '판매중',
    hobakPay: true,
    seller: {
      nickname: '별빛캠퍼',
      region: '양정동',
      mannerTemp: 37.9,
      avatarEmoji: '⛺'
    },
    description: '감성 캠핑용 원목 우드 롤테이블입니다. 4인 가족이 쓰기에 넉넉한 120cm 사이즈이며 전용 캔버스 수납가방에 넣어 드립니다. 생활 기스 외 상태 훌륭합니다.',
    chats: 1,
    likes: 6,
    views: 84,
    liked: false,
    images: [
      'image/product_7.jpg'
    ]
  },
  {
    id: 8,
    title: '소니 WH-1000XM5 노이즈캔슬링 헤드폰 실버',
    category: '디지털기기',
    timeAgo: '5시간 전',
    price: 230000,
    isFreeShare: false,
    status: '판매중',
    hobakPay: true,
    seller: {
      nickname: '뮤직러버',
      region: '대송동',
      mannerTemp: 36.8,
      avatarEmoji: '🎧'
    },
    description: '소니 플래그십 노이즈캔슬링 헤드폰 XM5 플래티넘 실버 색상입니다. 실내에서만 주로 사용해서 이어패드 헤짐 전혀 없습니다. 하드케이스, 케이블 모두 있어요.',
    chats: 2,
    likes: 11,
    views: 156,
    liked: false,
    images: [
      'image/product_8.jpg'
    ]
  },
  {
    id: 9,
    title: '원목 2단 협탁 사이드테이블 (침대 옆 협탁)',
    category: '가구/인테리어',
    timeAgo: '어제',
    price: 25000,
    isFreeShare: false,
    status: '예약중',
    hobakPay: false,
    seller: {
      nickname: '따뜻한집',
      region: '양정동',
      mannerTemp: 39.0,
      avatarEmoji: '🪑'
    },
    description: '침실 분위기 살려주는 고무나무 원목 2단 협탁입니다. 서랍 레일 부드럽게 잘 열리고 흔들림 없습니다. 직접 가져가실 분 연락 주세요!',
    chats: 3,
    likes: 5,
    views: 92,
    liked: false,
    images: [
      'image/product_9.jpg'
    ]
  },
  {
    id: 10,
    title: '[나눔] 동화책 및 유아 그림책 15권 일괄 나눔해요',
    category: '도서',
    timeAgo: '어제',
    price: 0,
    isFreeShare: true,
    status: '판매중',
    hobakPay: false,
    seller: {
      nickname: '다정한이웃',
      region: '양정동',
      mannerTemp: 46.5,
      avatarEmoji: '📚'
    },
    description: '아이가 커서 더 이상 보지 않는 그림책과 창작동화 15권 깨끗하게 소독해 두었습니다. 필요한 이웃분께 무료 나눔합니다. 문고리 거래 가능해요!',
    chats: 6,
    likes: 15,
    views: 198,
    liked: false,
    images: [
      'image/product_10.jpg'
    ]
  }
];

const HobakStore = {
  getProducts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
        return [...INITIAL_PRODUCTS];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
        return [...INITIAL_PRODUCTS];
      }
      return parsed;
    } catch (e) {
      return [...INITIAL_PRODUCTS];
    }
  },

  saveProducts(products) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save products to localStorage:', e);
    }
  },

  resetProducts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
    return [...INITIAL_PRODUCTS];
  },

  getProductById(id) {
    const numId = Number(id);
    const products = this.getProducts();
    return products.find(p => Number(p.id) === numId) || products[0];
  },

  addProduct(newProductData) {
    const products = this.getProducts();
    const nextId = products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
    const priceNum = Number(newProductData.price) || 0;
    const isFree = Boolean(newProductData.isFreeShare) || priceNum === 0;

    const cat = newProductData.category || '기타 중고물품';
    const fallbackRealImg = DEFAULT_REAL_PHOTO_BY_CATEGORY[cat] || 'image/product_1.jpg';

    const images = (Array.isArray(newProductData.images) && newProductData.images.length > 0)
      ? newProductData.images
      : [fallbackRealImg];

    const product = {
      id: nextId,
      title: newProductData.title || '이름 없는 상품',
      category: cat,
      timeAgo: '방금 전',
      price: isFree ? 0 : priceNum,
      isFreeShare: isFree,
      status: newProductData.status || '판매중',
      hobakPay: Boolean(newProductData.hobakPay),
      seller: {
        nickname: (newProductData.seller && newProductData.seller.nickname) || '호박이웃',
        region: (newProductData.seller && newProductData.seller.region) || '양정동',
        mannerTemp: Number((newProductData.seller && newProductData.seller.mannerTemp) || 37.5),
        avatarEmoji: (newProductData.seller && newProductData.seller.avatarEmoji) || '🎃'
      },
      description: newProductData.description || '',
      chats: 0,
      likes: 0,
      views: 1,
      liked: false,
      images
    };

    products.unshift(product);
    this.saveProducts(products);
    this.markAsMyPost(product.id);
    return product;
  },

  markAsMyPost(id) {
    try {
      const raw = localStorage.getItem('hobak_my_post_ids_v1');
      const ids = raw ? JSON.parse(raw) : [];
      if (!ids.includes(Number(id))) {
        ids.push(Number(id));
        localStorage.setItem('hobak_my_post_ids_v1', JSON.stringify(ids));
      }
    } catch (e) {
      // ignore
    }
  },

  isMyPost(product, currentUserId) {
    if (!product) return false;
    if (currentUserId && product.sellerId && product.sellerId === currentUserId) {
      return true;
    }
    try {
      const raw = localStorage.getItem('hobak_my_post_ids_v1');
      const ids = raw ? JSON.parse(raw) : [];
      return ids.includes(Number(product.id));
    } catch (e) {
      return false;
    }
  },

  updateProduct(id, updatedData) {
    const products = this.getProducts();
    const idx = products.findIndex(p => Number(p.id) === Number(id));
    if (idx === -1) return null;
    const prev = products[idx];
    const priceNum = Number(updatedData.price ?? prev.price) || 0;
    const isFree = Boolean(updatedData.isFreeShare) || priceNum === 0;
    const next = {
      ...prev,
      title: updatedData.title ?? prev.title,
      category: updatedData.category ?? prev.category,
      price: isFree ? 0 : priceNum,
      isFreeShare: isFree,
      hobakPay: updatedData.hobakPay !== undefined ? Boolean(updatedData.hobakPay) : prev.hobakPay,
      description: updatedData.description ?? prev.description,
      images: (Array.isArray(updatedData.images) && updatedData.images.length > 0) ? updatedData.images : prev.images,
      seller: {
        ...prev.seller,
        ...(updatedData.seller || {})
      }
    };
    products[idx] = next;
    this.saveProducts(products);
    return next;
  },

  deleteProduct(id) {
    const products = this.getProducts();
    const filtered = products.filter(p => Number(p.id) !== Number(id));
    this.saveProducts(filtered);
    return true;
  },

  toggleLike(id) {
    const products = this.getProducts();
    const target = products.find(p => Number(p.id) === Number(id));
    if (target) {
      target.liked = !target.liked;
      target.likes = Math.max(0, (target.likes || 0) + (target.liked ? 1 : -1));
      this.saveProducts(products);
    }
    return target;
  },

  incrementView(id) {
    const products = this.getProducts();
    const target = products.find(p => Number(p.id) === Number(id));
    if (target) {
      target.views = (target.views || 0) + 1;
      this.saveProducts(products);
    }
    return target;
  },

  updateStatus(id, status) {
    const products = this.getProducts();
    const target = products.find(p => Number(p.id) === Number(id));
    if (target) {
      target.status = status;
      this.saveProducts(products);
    }
    return target;
  },

  formatPrice(productOrPrice) {
    if (typeof productOrPrice === 'object' && productOrPrice !== null) {
      if (productOrPrice.isFreeShare || Number(productOrPrice.price) === 0) {
        return '나눔🧡';
      }
      return Number(productOrPrice.price).toLocaleString('ko-KR') + '원';
    }
    const num = Number(productOrPrice) || 0;
    if (num === 0) return '나눔🧡';
    return num.toLocaleString('ko-KR') + '원';
  },

  createProductSvgDataUri,
  DEFAULT_REAL_PHOTO_BY_CATEGORY
};

window.HobakStore = HobakStore;
