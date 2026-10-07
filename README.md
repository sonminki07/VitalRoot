# 🌿 VitalRoot (바이탈루트)

> **2026 관광데이터 활용 공모전 출품작**  
> **만성질환자를 위한 맞춤형 웰니스 헬스케어 관광 플랫폼**  
> *"외식과 여행의 불안을 안심으로 바꾸는 데이터 기반 맞춤형 힐링 코스"*

---

## 🏛️ 1. 시스템 아키텍처 (프론트엔드 & 백엔드 구조)

VitalRoot는 **반응형 클라이언트-BaaS(Backend-as-a-Service) 아키텍처**를 기반으로 작동하며, 다수의 공공데이터와 지리정보(GIS) 엔진을 결합하여 실시간으로 개인 맞춤형 코스를 합성합니다.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        [ 사용자 디바이스 (Client) ]                     │
│  - React 19 + TypeScript + Tailwind CSS v4                             │
│  - Zustand v5 전역 상태 관리 (Map, Wellness, Auth)                      │
│  - NAVER Maps API v3 실시간 인터랙티브 지도 & 커스텀 마커 레이어           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  [ BaaS 백엔드 & DB ]  │ │  [ 공공데이터 수집 엔진 ]  │ │  [ 지리/경로 엔진 ]    │
│  Supabase            │ │  한국관광공사 Tour API │ │  OSRM / Tmap         │
│  - PostgreSQL DB     │ │  식약처 DUR 안전 API   │ │  - 2.0m 법선 오프셋  │
│  - GoTrue Auth       │ │  식품영양성분 DB       │ │  - 2-Pass 스무딩     │
│  - Row Level Security│ │  - 24h 그리드 캐싱     │ │  - L자형 격자 보간   │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

### 🔹 프론트엔드 (Frontend)
* **Single Page Application (SPA)**: Vite 번들러 기반 초고속 HMR 및 경량 빌드 환경 제공.
* **단일 화면 통합 뷰포트**: 네이버 지도 캔버스를 풀스크린 배경으로 두고, 반응형 컨트롤 패널(데스크톱: 3방향 리사이즈 사이드바 / 모바일: 드래그 바텀시트)을 오버레이 배치.
* **실시간 인터랙션**: 
  - 걷기 타이머 세션의 진행률에 따라 보행 경로 폴리라인을 실시간 분할(지나온 길: 회색 점선 / 남은 길: 에메랄드 실선).
  - 마우스 호버 시 대상 코스 미리보기(보라색 점선), 70m 근접 마커 클러스터링 및 무장애/의료 거점 자동 보호.
* **상태 관리**: Zustand v5의 얕은 비교(`useShallow`)를 적용하여 1초 주기 타이머 틱에 의한 불필요한 UI 리렌더링 원천 차단.

### 🔹 백엔드 (Backend / BaaS)
* **Supabase (BaaS)**: 클라우드 기반 완전 관리형 백엔드 인프라 활용.
  - **Database**: PostgreSQL 15+ 관계형 데이터베이스 (`user_profiles`, `saved_courses`, `completed_quests` 등).
  - **인증 (Authentication)**: Supabase GoTrue Auth (Google OAuth 2.0 소셜 로그인 및 이메일 6자리 OTP 인증 지원).
  - **보안 (RLS)**: Row Level Security 정책을 적용하여 본인 소유의 건강 프로필 및 저장 코스만 CRUD 가능하도록 격리.
* **프론트-백엔드 DTO 규약**: Envelope Pattern(`ApiResponse<T>`) 기반의 단일 진실 공급원([`src/types/contract.types.ts`](./src/types/contract.types.ts))을 공유하여 API 데이터 규격 일관성 유지.

---

## 💻 2. 사용 언어 (Languages)

| 언어 | 용도 및 범위 |
| :--- | :--- |
| **TypeScript (v5.8+)** | 프론트엔드 전역 타입 안정성 보장, DTO 인터페이스, Zustand 스토어 상태 모델링 |
| **JavaScript (ES Modules)** | 빌드 스크립트, Vite/ESLint 설정 파일, 공공 API 진단 테스트 스크립트 |
| **SQL (PostgreSQL)** | Supabase 테이블 스키마 정의, RLS 보안 정책, 트리거 및 시드 데이터 초기화 |
| **HTML5** | 시맨틱 웹 마크업, 네이버 지도 커스텀 오버레이 마커 템플릿 |
| **CSS3** | Tailwind CSS v4 스타일링, 글래스모피즘(Backdrop Filter), 다크/라이트 테마 |

---

## 📚 3. 사용 프레임워크 & 라이브러리 (Libraries & Frameworks)

### 🔹 핵심 프레임워크 & 런타임
* **React (v19.0.0)**: 최신 리액트 함수형 컴포넌트, Concurrent 기능, 커스텀 훅 기반 UI 구성.
* **Vite (v7.2.2)**: 차세대 프론트엔드 빌드 툴, 초고속 개발 서버 및 프로덕션 번들링.

### 🔹 상태 관리 (State Management)
* **Zustand (v5.0.2)**: 
  - 보일러플레이트 없는 경량 전역 상태 관리.
  - `mapStore` (지도 뷰포트, flyTo 비행), `wellnessStore` (질환 필터, 코스/숙소/퀘스트), `authStore` (Supabase 인증 세션).
  - `zustand/react/shallow`: 렌더링 최적화를 위한 얕은 비교 셀렉터.

### 🔹 UI 및 스타일링 (Styling)
* **Tailwind CSS (v4.1.17)**: 최신 v4 엔진 기반 고성능 유틸리티 클래스 스타일링.
* **@tailwindcss/vite (v4.1.17)**: Vite 전용 공식 Tailwind 플러그인.
* **커스텀 디자인 시스템**: 
  - Glassmorphism 플로팅 위젯 (`backdrop-blur-md`).
  - 시니어 및 야외 보행자를 위한 3단계 동적 글자 크기(normal, large, xlarge).
  - 고대비 다크 모드 / 소프트 라이트 모드 테마.

### 🔹 백엔드 클라이언트 SDK
* **@supabase/supabase-js (v2.49.1)**: Supabase PostgreSQL 통신, GoTrue 인증, 세션 리스너 제어.

### 🔹 코드 품질 및 개발 도구
* **TypeScript (v5.8.3)**: 엄격한 정적 타입 검사.
* **ESLint (v9.39.1)** & **typescript-eslint**: 코드 무결성 및 React Hooks 규칙 검증.

---

## 🌐 4. 사용 API 목록 (APIs)

VitalRoot는 **총 15개 이상의 오픈 API 및 외부 서비스**를 융합하여 작동합니다:

### ① 지도 & 공간정보 API
* **NAVER Maps Open API v3**
  - 고해상도 벡터 타일 지도 렌더링 및 하이브리드(위성+도로) 뷰 전환.
  - WGS84 좌표계 기반 `LatLng` 변환, 커스텀 HTML 마커 및 인포윈도우 표출.
  - `morph` 및 `panTo` 기반 시네마틱 카메라 비행 애니메이션.

### ② 한국관광공사 Tour API (4대 공공데이터 서비스)
* **KorService2 (한국어 일반 관광정보 API)**: 전국 관광지, 힐링 산책로, 문화시설, 공공 코스 데이터.
* **KorWithService2 (무장애 열린관광지 API)**: 휠체어 경사로, 점자 블록, 보행 약자 편의시설 정보.
* **MdclTursmService (의료관광정보 API)**: 전국 상급종합병원, 응급의료센터, 안심 클리닉 위치 정보.
* **WellnessTursmService (추천 웰니스 관광지 API)**: 자연·숲치유, 힐링·스파, 한방 등 한국형 웰니스 거점.

### ③ 식품의약품안전처 의약품안전사용서비스 (DUR 7대 API)
공공데이터포털(data.go.kr) 식약처 공공 API를 실시간 연동하여 만성질환 약물 복용자의 7대 안전 주의보 판정:
1. **usjntTaboo (병용금기)**: 두 약물 병용 시 치명적 상호작용 위험 성분 검사.
2. **pwnmTaboo (임부금기)**: 임산부 투여 금기 성분 판정.
3. **odsnAtent (노인주의)**: 65세 이상 고령층 투여 주의 성분.
4. **cpctyAtent (용량주의)**: 1일 최대 권장 복용량 초과 위험 판정.
5. **spcifyAgrdeTaboo (특정연령대금기)**: 소아/청소년 등 연령대 제한 성분.
6. **efcyDplct (효능군중복)**: 동일 효능 약물의 중복 처방 방지.
7. **mdctnPdAtent (투여기간주의)**: 연속 장기 투여 시 부작용 주의보.

### ④ 보행로 라우팅 & 보행 안전 엔진 API
* **OSRM (Open Source Routing Machine) API**
  - 공공 포장도로망 기반 보행자 도로망 비동기 라우팅.
  - 차도 중앙선 좌표에 대해 **우측 보행로(인도) 방향 2.0m 단위 법선 벡터 오프셋** 및 **3점 가중 이동평균(0.25, 0.5, 0.25) 2-Pass 필터**를 자체 적용하여 완만한 산책로 폴리라인 자동 합성.
* **Tmap 도보 경로 API (선택적 연동 지원)**: 계단, 경사로, 횡단보도 정밀 보행자 경로.

### ⑤ 식품영양 데이터베이스 API
* **식품의약품안전처 식품영양성분 DB API**: 안심식당 메뉴의 나트륨, 당류, 열량, 탄수화물 영양소 정보 연계 분석.

### ⑥ 백엔드 BaaS API
* **Supabase REST & Auth API**: 사용자 건강 프로필 동기화, 맞춤 코스 북마크, 퀘스트 완보 칭호 저장.

---

## 🚀 5. 시작하기 및 실행 방법

### 1) 환경 변수 설정 (`.env`)
프로젝트 루트 경로에 `.env` 파일을 구성합니다:
```env
# 네이버 지도 클라이언트 ID
VITE_NAVER_MAP_CLIENT_ID="your_naver_map_client_id"

# 한국관광공사 공공데이터 API 키 (Tour API 4.0)
VITE_TOUR_API_KEY="your_public_tour_api_key"

# Supabase 백엔드 연동 정보
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"

# (선택) Tmap 도보 라우팅 API 키
VITE_TMAP_API_KEY=""
```

### 2) 패키지 설치
```bash
npm install
```

### 3) 개발 서버 실행
```bash
npm run dev
```
* 브라우저에서 `http://localhost:5173`으로 접속합니다.

### 4) 프로덕션 빌드 및 타입 검사
```bash
npm run build
```
* TypeScript 컴파일(`tsc -b`) 및 Vite 프로덕션 번들링 검증 완료.

---

## 📄 6. 프로젝트 문서 링크
* **[팀원 인수인계 가이드](./docs/TEAM_CODEBASE_GUIDE.md)**: 전체 시스템 4단계 흐름 및 핵심 알고리즘 해설
* **[API 연동 변수 명세서](./docs/api_spec_for_planning.md)**: 공공데이터 및 프론트-백엔드 공유 DTO 명세
* **[DB 스키마 정의서](./supabase_schema.sql)**: Supabase PostgreSQL 테이블 및 RLS 보안 스크립트
