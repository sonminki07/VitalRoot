# 🌿 VitalRoot (바이탈루트)

> **2026 관광데이터 활용 공모전**: 만성질환자를 위한 맞춤형 웰니스 헬스케어 관광 플랫폼

---

## 📌 프로젝트 소개
만성질환자(당뇨, 고혈압 등)의 '외식 불안감'을 해소하고 여행 중 건강 관리를 돕기 위해, **의료 지표 및 주관적 컨디션(듀얼 프로파일링)**을 분석하여 『안심 식당 + 완만 산책로』 맞춤 세트 코스를 추천하는 지도 기반 웰니스 플랫폼입니다.

* **프론트엔드**: React 19, TypeScript, Vite, Tailwind CSS v4
* **지도 엔진**: Mapbox GL JS, Turf.js (동심원/방사선 기하 연산)
* **백엔드 & DB**: Supabase (PostgreSQL, Row Level Security)
* **공공 데이터**: 한국관광공사 Tour API (신분류체계정보 연계)
* **배포**: Vercel

---

## 🚀 주요 기능
1. **듀얼 프로파일링 (Dual Profiling)**: 기저질환(당뇨, 고혈압, 이상지질혈증 등) 및 식단 성향 선택
2. **다이내믹 헬스케어 라우팅**: 저염/저탄수화물 안심식당과 식후 30분 완경사(5% 미만) 무장애 산책로 3선 실시간 매칭
3. **인터랙티브 지도 & 동심원 시각화**: 1~5km 탐색 반경 동심원 및 360도 방사선 제어, 거리/각도 라벨 표기
4. **스튜디오 퀘스트 & reColor 보상**: 코스 완주 시 GPS 인증을 통해 지도 구역을 컬러링하고 지역 로컬 할인 쿠폰(바코드) 지급

---

## 🛠️ 실행 및 배포 방법

### 1. 환경 변수 설정 (`.env`)
프로젝트 루트에 `.env` 파일을 생성하거나 확인합니다:
```env
VITE_MAPBOX_ACCESS_TOKEN="your_mapbox_token"
VITE_SUPABASE_URL="https://your_project.supabase.co"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"
VITE_TOUR_API_KEY="your_tour_api_key"
```

### 2. 로컬 실행
```bash
npm install
npm run dev
```

### 3. 빌드 검증
```bash
npm run build
```

### 4. Supabase DB 설정
`supabase_schema.sql`의 SQL 쿼리를 Supabase 대시보드의 **SQL Editor**에 복사하여 실행하면 테이블 및 시드 데이터가 자동 생성됩니다.
