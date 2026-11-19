# 🎃 호박 (Hobak) - 우리 동네 따뜻한 중고거래 웹서비스

Supabase Auth/PostgreSQL, Three.js WebGL 3D 입체 뷰어, Antigravity 3D 공간 디자인, Google Maps 현주소 연동이 적용된 중고거래 웹 애플리케이션입니다.

## ✨ 주요 기능
- **상품 목록 (`index.html`)**: 실시간/엔터 검색(띄어쓰기 무시), 카테고리·동네 필터, `판매중만 보기` / `거래 가능 보기(거래완료)`, 거래완료 회색 처리, 판매자별 글 모아보기, 인기 검색어, 3D WebGL 쇼케이스 배너
- **상품 상세 (`detail.html`)**: 다중 이미지 슬라이더, 실제 사진 기반 3D 깊이맵(Depth-Relief) 입체 회전 뷰어, 판매자 프로필 & 매너온도, 작성자 전용 `판매중/예약중/거래완료` 상태 변경·수정·삭제, 호박채팅 모달
- **글쓰기 / 수정 (`write.html`)**: 사진 업로드(최대 5장) & 원클릭 실물 사진 프리셋, 실시간 상세 미리보기, 무료나눔/호박페이 설정, 수정 모드(`?edit={id}`)
- **회원 인증 (Supabase Auth)**: 이메일/비밀번호 로그인 및 닉네임 필수 회원가입, 비로그인 시 글쓰기 가드
- **구글 지도 현주소 연동**: GPS 역지오코딩 및 주소 검색을 통한 동네 자동 적용

## 🗄️ Supabase 데이터베이스 설정
1. [Supabase SQL Editor](https://supabase.com/dashboard)에서 `supabase/schema.sql`을 실행하여 테이블(`profiles`, `products`, `product_images`, `product_likes`, `chat_messages`, `search_keywords`)을 생성합니다.
2. `js/supabase-config.js`에 공개 `url`과 `anonKey`가 설정되어 있습니다. (`SUPABASE_SERVICE_ROLE_KEY`는 `.env`에만 보관하며 절대 저장소에 커밋하지 마세요.)

## 🚀 배포 전 체크리스트
- [x] `.env`, `.eny` 파일 `.gitignore` 등록 확인
- [x] `js/supabase-config.js`에 Service Role Key 미포함 확인 (Public Anon Key만 포함)
- [x] 정적 호스팅(GitHub Pages / Vercel / Netlify) 호환 상대 경로 사용
