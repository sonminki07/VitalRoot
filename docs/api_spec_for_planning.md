# VitalRoot 프론트-백엔드 연동 데이터 규약 및 변수 명세서

> **통신 기본 규칙**: 모든 JSON 키는 `camelCase`로 통일하며, 응답은 `{ "success": true, "data": ..., "error": null }` 공통 래퍼로 전달됩니다.

---

## 화면 1. 회원가입 및 온보딩 건강 프로필 (Auth & Health Profile)
* **API**: `GET /api/user/profile` (조회) | `PUT /api/user/profile` (수정)

| 변수명 (JSON Key) | 한글명 & UI 표시 위치 | 상세 설명 & 비즈니스 로직 | 예시값 |
| :--- | :--- | :--- | :--- |
| `userId` *(string, 필수)* | 사용자 ID (시스템) | 사용자 고유 UUID (Supabase Auth ID) | `"usr_a1b2c3"` |
| `userName` *(string, 필수)* | 닉네임 / 본명 (헤더/프로필) | 마이페이지 및 상단 환영 문구 표출명 | `"김민기"` |
| `chronicConditions` *(string[], 필수)* | 만성질환 (온보딩 선택 칩) | 맞춤 코스/식당 필터링 기준 (당뇨, 고혈압, 저혈압, 이상지질혈증, 신장질환, 관절/근골격계) | `["당뇨", "고혈압"]` |
| `medications` *(object[], 선택)* | 복용 약물 리스트 (마이페이지) | 식약처 DUR 연계 복용 의약품 정보 | 하단 상세 참조 |
| └ `name` *(string, 필수)* | 약품명 (약품 카드) | 복용 중인 의약품 이름 | `"다이아벡스정"` |
| └ `ingredientName` *(string, 필수)* | 성분명 (DUR 대조 뱃지) | 식약처 DUR 성분 매칭 기준 주성분명 | `"메트포르민"` |
| └ `cautionNote` *(string, 필수)* | 보행 가이드 (주의 배너) | 약물 복용자의 보행 시 주의사항 (저혈당 대비 등) | `"식후 30분 완보"` |
| └ `durWarningTags` *(string[], 필수)* | DUR 경고 태그 (경고 뱃지) | 식약처 7대 안전 경고 (노인주의, 용량주의 등) | `["노인주의"]` |
| `walkFitnessLevel` *(string, 선택)* | 보행 체력 (슬라이더) | 코스 난이도 추천 기준 ("초급(완만)", "중급", "고급") | `"초급(완만)"` |
| `requiredInfra` *(string[], 선택)* | 필수 편의시설 (체크박스) | 산책 시 필수 인프라 ("화장실", "쉼터", "엘리베이터", "약국") | `["화장실", "쉼터"]` |

---

## 화면 2. 메인 탐색 & 지도 주변 안심 장소/식당 (Map & Places)
* **API**: `GET /api/places/nearby?latitude=37.315&longitude=126.834&radiusMeters=3000`

| 변수명 (JSON Key) | 한글명 & UI 표시 위치 | 상세 설명 & 비즈니스 로직 (공공데이터 출처) | 예시값 |
| :--- | :--- | :--- | :--- |
| `id` *(string, 필수)* | 장소 ID (장소 카드 키) | 장소 고유 식별자 (TourAPI `contentid`) | `"129619"` |
| `name` *(string, 필수)* | 장소/식당명 (카드 헤더) | 관광지 또는 식당 명칭 (TourAPI `title`) | `"안산 호수공원"` |
| `category` *(string, 필수)* | 분류 (카테고리 뱃지) | 장소 유형 ("안심식당", "산책로", "관광지", "의료") | `"산책로"` |
| `address` *(string, 필수)* | 주소 (상세 정보 텍스트) | 도로명/지번 주소 (TourAPI `addr1`) | `"경기도 안산시..."` |
| `latitude` *(number, 필수)* | 위도 GPS (지도 마커 핀) | Y축 좌표 (TourAPI `mapy` 정제) | `37.301248` |
| `longitude` *(number, 필수)* | 경도 GPS (지도 마커 핀) | X축 좌표 (TourAPI `mapx` 정제) | `126.834192` |
| `imageUrl` *(string \| null, 선택)* | 사진 (대표 썸네일) | 대표 이미지 URL (없을 시 null 처리 및 기본 이미지 대체) | `"https://..."` |
| `safeTags` *(string[], 필수)* | 안심 태그 (안심 칩) | 검증된 안심 시설 태그 (TourAPI 무장애 연계) | `["무장애 경사로"]` |
| `nutrition` *(object \| null, 선택)* | 영양 정보 (식당 아코디언) | 식약처 식품영양 DB (열량, 당류, 나트륨, 안심 등급) | 당 3g, 나트륨 420mg |

---

## 화면 3. 질환 맞춤형 식후 걷기 추천 코스 (Course Recommendation)
* **API**: `GET /api/courses/recommend?condition=당뇨`

| 변수명 (JSON Key) | 한글명 & UI 표시 위치 | 상세 설명 & 비즈니스 로직 | 예시값 |
| :--- | :--- | :--- | :--- |
| `id` *(string, 필수)* | 코스 ID (코스 식별자) | 코스 세트 고유 ID | `"course_01"` |
| `title` *(string, 필수)* | 코스 제목 (카드 상단 헤더) | 기획된 웰니스 코스 명칭 | `"호수공원 완보길"` |
| `targetCondition` *(string, 필수)* | 타겟 질환 (질환 뱃지) | 추천 대상 만성질환 ("당뇨", "고혈압") | `"당뇨"` |
| `totalDistanceMeters` *(number, 필수)* | 총 보행 거리 (거리 표기) | TMap 보행자 API 기반 실제 보행 도로망 거리 (단위: m) | `1850` (1.8km) |
| `walkMinutes` *(number, 필수)* | 소요 시간 (시간 표기) | 시니어 보행 속도 기준 예상 완보 시간 (단위: 분) | `28` (28분) |
| `slopeGrade` *(string, 필수)* | 난이도 (경사도 뱃지) | 지형 경사도 등급 ("완만(무장애)", "보통", "도전") | `"완만(무장애)"` |
| `walkingRoute` *(number[][], 필수)* | 보행 경로 (지도 폴리라인 선) | GeoJSON 표준 도로망 좌표 배열: `[[경도, 위도], ...]` | `[[126.8, 37.3], ...]` |
| `waypoints` *(object[], 선택)* | 중간 편의시설 (지도 아이콘) | 경로 3~5분 내 화장실, 쉼터, 무장애 시설 목록 | 화장실 2곳, 쉼터 1곳 |

---

## 화면 4. 1박 2일 웰니스 안심 숙소 (Wellness Stays)
* **API**: `GET /api/stays`

| 변수명 (JSON Key) | 한글명 & UI 표시 위치 | 상세 설명 & 비즈니스 로직 (공공데이터 출처) | 예시값 |
| :--- | :--- | :--- | :--- |
| `id` *(string, 필수)* | 숙소 ID (카드 고유 키) | 숙소 식별자 (TourAPI `contentid`) | `"stay_102"` |
| `name` *(string, 필수)* | 숙소명 (타이틀 텍스트) | 숙박 시설 이름 (TourAPI `title`) | `"해솔길 한옥스테이"` |
| `chkCooking` *(boolean, 필수)* | 자가 취사 (안심 뱃지) | 객실 내 취사 가능 여부 (저염식 자가 조리 안심) | `true` |
| `roomRefrigerator` *(boolean, 필수)* | 냉장고 구비 (안심 뱃지) | **인슐린 보관용 냉장고 보유 여부 (당뇨 환자 필수)** | `true` |
| `hasFitness` *(boolean, 필수)* | 피트니스 (안심 뱃지) | 식후 혈당 조절용 피트니스/운동 시설 보유 여부 | `false` |

---

## 화면 5. 관광명소 퀘스트 & 실시간 GPS 완보 세션 (Quest & Walk Session)
* **API**: `POST /api/walk-session/ping` (동기화) | `POST /api/walk-session/complete` (완료)

| 변수명 (JSON Key) | 한글명 & UI 표시 위치 | 상세 설명 & 비즈니스 로직 | 예시값 |
| :--- | :--- | :--- | :--- |
| `questId` *(string, 필수)* | 퀘스트 ID (퀘스트 카드 키) | 퀘스트 고유 식별자 | `"qst_lake_01"` |
| `targetName` *(string, 필수)* | 목표 명소명 (상단 위젯 타이틀) | 완보 목표 관광지 명칭 | `"갈대습지공원"` |
| `targetDurationMinutes` *(number, 필수)* | 목표 시간 (목표 시간 라벨) | 완보 인정 최소 체류/보행 시간 (단위: 분) | `20` |
| `titleReward` *(string, 필수)* | 보상 칭호 (리워드 뱃지) | 완보 시 프로필에 장착되는 리워드 칭호명 | `"습지 생태 지킴이"` |
| `elapsedSeconds` *(number, 필수)* | 경과 시간 (타이머 숫자) | 실시간 누적 보행 시간 (단위: 초) | `720` (12분) |
| `isGpsValid` *(boolean, 필수)* | GPS 정상 (신호등 상태창) | 사용자가 명소 반경 500m 이내 정상 체류 중인지 여부 | `true` |
| `isEligible` *(boolean, 필수)* | 완보 버튼 활성화 (인증 버튼) | 목표 시간 충족 여부 (경과 시간 ≥ 목표 시간) | `false` |
