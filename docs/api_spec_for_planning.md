# [기획서용] VitalRoot 프론트엔드-백엔드 연동 변수 및 통신 명세서

본 문서는 **구글 닥스 기획서**에 그대로 복사하여 사용할 수 있도록 정리된 최종 변수 및 API 명세 청사진입니다.

---

## 1. 전사 공통 통신 규칙 (Global Communication Standards)

1. **표준 표기법 (Naming Convention)**: 모든 JSON Key는 **`camelCase`**로 통일합니다.
2. **공통 응답 래퍼 (Envelope Pattern)**:
   ```json
   {
     "success": true,
     "data": { ... },
     "error": null
   }
   ```
   * 실패 시:
   ```json
   {
     "success": false,
     "data": null,
     "error": {
       "code": "NOT_FOUND",
       "message": "해당 조건에 맞는 코스를 찾을 수 없습니다."
     }
   }
   ```
3. **좌표 표기 규약 (Geolocation)**:
   * 객체 전달 시: `{ "latitude": 37.315891, "longitude": 126.852391 }`
   * 지도 폴리라인(선) 배열 시: `[ [126.852391, 37.315891], ... ]` (GeoJSON 표준: `[경도, 위도]`)
4. **Enum 값 규약**: 국내 웰니스/만성질환 케어 특성에 맞춰 **직관적인 한글 문자열** 사용 (`"당뇨"`, `"고혈압"`, `"화장실"`, `"쉼터"`, `"안심"` 등).

---

## 2. 화면/기능별 API 및 변수 명세 (기획서 복사용 표)

### [기능 1] 회원가입 및 건강 프로필 설정 (Auth & Health Profile)

#### API: 사용자 건강 프로필 조회/수정
* **Endpoint**: `GET /api/user/profile`, `PUT /api/user/profile`
* **설명**: 사용자의 만성질환, 복용 약물, 보행 체력, 필수 인프라 요구사항을 관리합니다.

| 변수명 (JSON Key) | 타입 | 필수 | 한글 설명 | 허용값 / 예시값 | 비고 (내부 연계) |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `userId` | string | O | 사용자 고유 ID | `"usr_98a7f21c"` | Supabase Auth UUID |
| `userName` | string | O | 사용자 이름/닉네임 | `"김민기"` |  |
| `chronicConditions` | string[] | O | 보유 만성질환 목록 | `["당뇨", "고혈압"]` | 허용: 당뇨, 고혈압, 저혈압, 이상지질혈증, 신장질환, 관절/근골격계 |
| `medications` | object[] | X | 복용 의약품 목록 | (하단 의약품 상세 객체) | 식약처 DUR API 연계 |
| └ `id` | string | O | 의약품 식별 ID | `"med_01"` |  |
| └ `name` | string | O | 약품명 | `"다이아벡스정 500mg"` |  |
| └ `ingredientName` | string | O | 주요 성분명 | `"메트포르민염산염"` | DUR 성분 대조용 |
| └ `timing` | string | O | 복용 시점 | `"아침 식후"` |  |
| └ `cautionNote` | string | O | 여행/보행 가이드 | `"식후 30분 내 가벼운 완보"` |  |
| └ `durWarningTags` | string[] | O | 식약처 DUR 주의 태그 | `["노인주의", "용량주의"]` |  |
| `walkFitnessLevel` | string | X | 보행 체력 수준 | `"초급(완만)"` | 허용: 초급(완만), 중급, 고급 |
| `requiredInfra` | string[] | X | 보행 시 필수 편의시설 | `["화장실", "쉼터", "엘리베이터"]` | 무장애 시설 매칭용 |

---

### [기능 2] 맞춤형 안심 웰니스 장소 검색 (Wellness Places)

#### API: 주변 안심 장소/식당/산책로 조회
* **Endpoint**: `GET /api/places/nearby`
* **요청 변수 (Query Params)**:
  * `latitude` (number, 필수): 현재 위도 (예: `37.315891`)
  * `longitude` (number, 필수): 현재 경도 (예: `126.852391`)
  * `radiusMeters` (number, 선택): 반경 거리 (기본값: `3000`)
  * `category` (string, 선택): `'안심식당' | '산책로' | '관광지' | '의료'`
  * `condition` (string, 선택): `'당뇨' | '고혈압'`

* **응답 변수 (Response `data` 배열)**:

| 변수명 (JSON Key) | 타입 | 필수 | 한글 설명 | 허용값 / 예시값 | 공공데이터 매핑 필드 |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | string | O | 장소 고유 식별자 | `"129619"` | TourAPI `contentid` |
| `name` | string | O | 장소/식당명 | `"안산 호수공원"` | TourAPI `title` |
| `category` | string | O | 장소 분류 | `"산책로"` | `contentTypeId` / `cat3` |
| `address` | string | O | 기본 주소 | `"경기도 안산시 단원구 광덕동로 25"` | TourAPI `addr1` |
| `latitude` | number | O | 위도 (GPS) | `37.301248` | TourAPI `mapy` |
| `longitude` | number | O | 경도 (GPS) | `126.834192` | TourAPI `mapx` |
| `imageUrl` | string | X | 대표 이미지 링크 | `"https://tong.visitkorea.or.kr/..."` | TourAPI `firstimage` |
| `tel` | string | X | 대표 전화번호 | `"031-481-3168"` | TourAPI `tel` |
| `safeTags` | string[] | O | 안심 검증 태그 | `["무장애 경사로", "저염식 제공"]` | 무장애/안심식당 분석 |
| `nutrition` | object | X | 식당 대표메뉴 영양정보 | (하단 영양 상세 객체) | 식약처 영양성분 API |
| └ `menuName` | string | O | 대표 메뉴명 | `"보리밥 정식"` |  |
| └ `calories` | number | O | 열량 (kcal) | `520` |  |
| └ `carbohydrate` | number | O | 탄수화물 (g) | `75.2` |  |
| └ `sugars` | number | O | 당류 (g) | `3.1` |  |
| └ `sodium` | number | O | 나트륨 (mg) | `680` |  |
| └ `sugarGrade` | string | O | 당뇨 안심 등급 | `"안심"` | 허용: 안심, 보통, 주의 |
| └ `sodiumGrade` | string | O | 고혈압 안심 등급 | `"안심"` | 허용: 안심, 보통, 주의 |

---

### [기능 3] 식후 맞춤형 추천 코스 (Wellness Course Sets)

#### API: 당뇨/고혈압 맞춤형 걷기 코스 추천
* **Endpoint**: `GET /api/courses/recommend`
* **요청 변수 (Query Params)**:
  * `condition` (string, 필수): 타겟 질환 (`"당뇨"`, `"고혈압"`)
  * `region` (string, 선택): 지역명 (`"안산"`, `"서울 도심"`)

* **응답 변수 (Response `data` 배열)**:

| 변수명 (JSON Key) | 타입 | 필수 | 한글 설명 | 허용값 / 예시값 | 비고 |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | string | O | 코스 세트 고유 ID | `"course_ansan_01"` |  |
| `title` | string | O | 코스 제목 | `"식후 혈당 케어 안산 호수공원 완보길"` |  |
| `targetCondition`| string | O | 추천 타겟 질환 | `"당뇨"` |  |
| `restaurant` | object | O | 코스 출발 안심식당 | (장소 객체) |  |
| `trail` | object | O | 코스 도착 산책로 | (장소 객체) |  |
| `totalDistanceMeters`| number | O | 실제 보행 거리 (m) | `1850` | TMap 보행자 API |
| `walkMinutes` | number | O | 예상 소요 시간 (분) | `28` |  |
| `slopeGrade` | string | O | 코스 경사도 등급 | `"완만(무장애)"` | 허용: 완만(무장애), 보통, 도전 |
| `walkingRoute` | [number, number][] | O | 보행 경로 좌표선 | `[[126.83, 37.30], ...]` | 네이버 지도 렌더링용 |
| `waypoints` | object[] | X | 경로 3~5분 편의시설 | (하단 편의시설 객체) | TourAPI `detailWithTour2` |
| └ `id` | string | O | 편의시설 식별 ID | `"wp_rest_01"` |  |
| └ `name` | string | O | 편의시설 명칭 | `"호수공원 중앙 공중화장실"` |  |
| └ `category` | string | O | 시설 구분 | `"화장실"` | 허용: 화장실, 쉼터, 배리어프리, 의료 |
| └ `walkingMinutesFromRoute`| number | O | 경로에서 이탈 도보 시간(분)| `2` |  |
| └ `distanceMetersFromRoute`| number | O | 경로에서 이탈 거리 (m) | `120` |  |
| └ `features` | string[] | O | 시설 상세 특징 | `["장애인 화장실", "비데", "냉난방"]` |  |

---

### [기능 4] 1박 2일 웰니스 안심 숙소 (Wellness Stays)

#### API: 저염식 조리 & 인슐린 보관 가능 안심 숙소 조회
* **Endpoint**: `GET /api/stays`
* **응답 변수 (Response `data` 배열)**:

| 변수명 (JSON Key) | 타입 | 필수 | 한글 설명 | 허용값 / 예시값 | 공공데이터 매핑 필드 |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | string | O | 숙소 식별 ID | `"stay_30491"` | TourAPI `contentid` |
| `name` | string | O | 숙소명 | `"대부도 해솔길 한옥스테이"` | TourAPI `title` |
| `address` | string | O | 도로명 주소 | `"경기도 안산시 단원구 대부황금로..."`| TourAPI `addr1` |
| `latitude` | number | O | 위도 (GPS) | `37.241029` | TourAPI `mapy` |
| `longitude` | number | O | 경도 (GPS) | `126.589102` | TourAPI `mapx` |
| `chkCooking` | boolean| O | 객실 취사 가능 여부 | `true` | `detailIntro2.chkcooking` (1:가능) |
| `roomRefrigerator`| boolean| O | 객실 냉장고 보유 여부 | `true` | `detailIntro2.roomrefrigerator` (인슐린 보관용) |
| `hasFitness` | boolean| O | 피트니스 시설 여부 | `false` | `detailIntro2.fitness` |
| `safeBadges` | string[]| O | 안심 인증 뱃지 목록 | `["인슐린 냉장보관 안심", "자가 취사 가능"]` |  |

---

### [기능 5] 명소 퀘스트 및 실시간 완보 세션 (Quests & Live Walk Session)

#### API: 실시간 GPS 완보 세션 동기화
* **Endpoint**: `POST /api/walk-session/ping`, `POST /api/walk-session/complete`
* **설명**: 사용자가 명소 반경 500m 이내에서 목표 시간 동안 체류/완보했는지 검증하고 칭호를 지급합니다.

| 변수명 (JSON Key) | 타입 | 필수 | 한글 설명 | 허용값 / 예시값 | 비고 |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `questId` | string | O | 대상 퀘스트 ID | `"qst_ansan_lake"` |  |
| `targetName` | string | O | 목표 관광 명소명 | `"안산 갈대습지공원"` |  |
| `targetDurationMinutes`| number | O | 목표 완보 시간 (분) | `20` |  |
| `titleReward` | string | O | 완보 시 획득할 칭호 | `"갈대습지 생태 지킴이"` |  |
| `elapsedSeconds` | number | O | 현재 누적 경과 시간 (초)| `1200` | 프론트-백엔드 실시간 동기화 |
| `isGpsValid` | boolean| O | 현장 반경(500m) 체류 여부 | `true` | GPS 거리 검증 결과 |
| `isEligible` | boolean| O | 목표 달성 여부 | `true` | 경과시간 ≥ 목표시간 |
| `distanceMeters` | number | O | 현재 위치-명소 간 남은 거리| `45` |  |
