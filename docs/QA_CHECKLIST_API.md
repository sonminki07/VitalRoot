# VitalRoot 공공데이터 7대 API 기능 무결성 검증 QA 점검표 (QA Checklist)

> **문서 버전**: v2.0.0 (2026.10 릴리스 대비 최신 개정판)  
> **대상 프로젝트**: VitalRoot (시니어·만성질환자 맞춤형 스마트 웰니스 여행 솔루션)  
> **검증 대상 인증키**: `403b2fe19eec414cb6ba3fbdaed716ee3a54adb732b82e1c9aca7e2d1835e9d7`  
> **테스트 자동화 커맨드**: `npm run test:api`  
> **빌드 및 타입 검증 커맨드**: `cmd /c "npx tsc -b"` & `cmd /c "npm run build"`

---

## 1. 개요 및 7대 공공데이터 API 연동 규격 현황

VitalRoot는 한국관광공사 공식 4대 기술 문서(v4.1~v4.4), 신분류체계(10대 대분류/240대 소분류), 그리고 식품의약품안전처 3대 API를 결합하여 맞춤형 웰니스 코스 및 복약·영양 안전 관리 기능을 제공합니다.

| 번호 | 서비스명 (공식 명칭) | 주관 기관 | 기본 Base URL | 주요 오퍼레이션 | 프로젝트 내 담당 파일 | 상태 |
| :---: | :--- | :---: | :--- | :--- | :--- | :---: |
| **1** | 한국관광공사국문 관광정보 서비스_GW | 한국관광공사 | `https://apis.data.go.kr/B551011/KorService2` | `locationBasedList2`, `searchKeyword2`, `areaBasedList2` | `src/utils/tourApi.ts` | **정상 연동 (200 OK)** |
| **2** | 한국관광공사무장애 여행 정보 | 한국관광공사 | `https://apis.data.go.kr/B551011/KorWithService2` | `locationBasedList2`, `detailWithTour2`, `searchKeyword2` | `src/utils/tourApi.ts` | **정상 연동 (200 OK)** |
| **3** | 한국관광공사웰니스관광정보 | 한국관광공사 | `https://apis.data.go.kr/B551011/WellnessTursmService` | `locationBasedList`, `searchKeyword` (`langDivCd=KOR`) | `src/utils/tourApi.ts` | **정상 연동 (200 OK)** |
| **4** | 한국관광공사의료관광정보 | 한국관광공사 | `https://apis.data.go.kr/B551011/MdclTursmService` | `locationBasedList`, `searchKeyword` (`langDivCd=KOR`/`ENG`) | `src/utils/tourApi.ts` | **정상 연동 (200 OK)** |
| **5** | [개발계정]식품의약품안전처_묶음의약품정보서비스 | 식품의약품안전처 | `https://apis.data.go.kr/1471000/DrbBundleInfoService02` | `getDrbBundleList02` (`cnsgnItemName`, `trustItemName`) | `src/utils/durService.ts` | **정상 연동 (200 OK)** |
| **6** | 식품의약품안전처의약품안전사용서비스(DUR)성분정보 | 식품의약품안전처 | `https://apis.data.go.kr/1471000/DURIrdntInfoService03` | 7대 안전 카테고리 엔드포인트 (`...02`) | `src/utils/durService.ts` | **정상 연동 (200 OK)** |
| **7** | 식품의약안전처식품영양성분DB정보 | 식품의약품안전처 | `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03` | `getFoodNtrCpntDbInq03` (`FOOD_NM_KR`) | `src/utils/foodNutritionApi.ts` | **정상 연동 (200 OK)** |

---

## 2. API별 상세 QA 테스트 매트릭스

### API-01. 한국관광공사국문 관광정보 서비스_GW (`KorService2`)
* **목적**: 사용자 주변 위치(GPS) 기준 최인접 음식점(contentTypeId=39) 및 관광명소(contentTypeId=12/14) 실시간 조회
* **연동 오퍼레이션**: `/locationBasedList2`, `/searchKeyword2`
* **주요 정렬 옵션**: `arrange: "E"` (거리순 - 위치기반 권장 기본값), `"C"` (수정일순), `"A"` (제목순)

| TC ID | 테스트 시나리오 | 파라미터 / 사전조건 | 기대 결과 (Expected) | 검증 방법 | 중요도 |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **TC-01-01** | 거리순(`arrange=E`) 최인접 안심 식당 조회 | `mapX=126.9816`, `mapY=37.5684`, `radius=3000`, `contentTypeId=39`, `arrange=E` | HTTP 200, `resultCode=0000`, 사용자 최인접(100m 이내) 식당이 최상단 반환됨 확인 | 자동화/실시간 | **P0** |
| **TC-01-02** | 국문 키워드 통합 검색 (`searchKeyword2`) | `keyword="비빔밥"`, `arrange=A` | HTTP 200, 비빔밥 전문점 2건 이상 정상 수신 확인 | 자동화/실시간 | **P1** |
| **TC-01-03** | 신분류체계(lclsSystm1/2/3) 필터링 | `lclsSystm1=FD`, `lclsSystm2=FD01` (한식) | 한식 범주에 매칭되는 음식점만 필터링되어 반환 | 단위테스트 | **P1** |
| **TC-01-04** | 잘못된/만료된 키 입력 시 예외 처리 | 유효하지 않은 `serviceKey` 전달 | `SERVICE_KEY_IS_NOT_REGISTERED_ERROR` 감지 후 로컬 캐시 또는 안전 안내 반환 | 예외 테스트 | **P1** |
| **TC-01-05** | 망망대해/도서지역 좌표 조회 (결과 0건) | `mapX=125.0`, `mapY=36.0`, `radius=100` | 에러 없이 빈 배열 `[]` 반환, 크래시 미발생 | 경계값 | **P2** |
| **TC-01-06** | 응답 소문자 좌표(mapx, mapy) 부동소수점 파싱 | `mapx="126.9816"`, `mapy="37.5684"` 문자열 수신 | `parseFloat` 후 유효한 숫자 위경도 객체 매핑 확인 | 데이터타입 | **P0** |

---

### API-02. 한국관광공사무장애 여행 정보 (`KorWithService2`)
* **목적**: 휠체어·어르신 보행 약자를 위한 무장애 여행지 위치 목록 및 상세 편의시설(경사로, 전용 화장실, 엘리베이터 등) 정보 제공
* **연동 오퍼레이션**: `/locationBasedList2`, `/detailWithTour2`, `/searchKeyword2`

| TC ID | 테스트 시나리오 | 파라미터 / 사전조건 | 기대 결과 (Expected) | 검증 방법 | 중요도 |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **TC-02-01** | 거리순(`arrange=E`) 무장애 명소 목록 조회 | `mapX=126.9816`, `mapY=37.5684`, `radius=3000`, `arrange=E` | HTTP 200, `resultCode=0000`, 최인접 무장애 명소(150m 이내) 정상 반환 | 자동화/실시간 | **P0** |
| **TC-02-02** | 무장애 상세 편의시설 조회 (`detailWithTour2`) | `contentId="1304864"` | `parking`(장애인주차장), `restroom`(장애인화장실), `wheelchair`(휠체어), `braileblock` 필드 파싱 | 자동화/실시간 | **P0** |
| **TC-02-03** | 무장애 키워드 검색 (`searchKeyword2`) | `keyword="숲길"` | HTTP 200, 무장애 데크로 및 숲길 명소 목록 수신 | 자동화/실시간 | **P1** |
| **TC-02-04** | 지도 레이더 필터 연동 (배리어프리) | 지도 위젯에서 `[무장애 ♿]` 클릭 | 장애인 화장실 및 무장애 쉼터 웨이포인트 핀 정상 필터링 표출 | UI/마커 | **P0** |

---

### API-03. 한국관광공사웰니스관광정보 (`WellnessTursmService`)
* **목적**: 자연 치유, 힐링 명상, 온천/스파, 한방 체험 등 만성질환자 맞춤형 웰니스 테마 스팟 제공
* **연동 오퍼레이션**: `/locationBasedList`, `/searchKeyword` (`langDivCd=KOR`)

| TC ID | 테스트 시나리오 | 파라미터 / 사전조건 | 기대 결과 (Expected) | 검증 방법 | 중요도 |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **TC-03-01** | 수도권 반경 25km 내 웰니스 스팟 거리순 조회 | `mapX=126.9816`, `mapY=37.5684`, `radius=25000`, `langDivCd=KOR`, `arrange=E` | HTTP 200, 대문자 좌표(`mapX`, `mapY`) 및 `contentId`, `baseAddr` 정상 매핑 | 자동화/실시간 | **P0** |
| **TC-03-02** | 웰니스 테마 코드 한글 레이블 변환 | `wellnessThemaCd="EX050100"` or `"EX050400"` | 각각 `온천/스파`, `힐링 명상` 등으로 직관적 한글 카테고리 표출 | UI/유닛 | **P1** |
| **TC-03-03** | 테마별 단독 필터 쿼리 | `wellnessThemaCd="EX050100"` (온천/스파) | 해당 테마 스팟만 정확히 필터링되어 반환 | 기능 테스트 | **P2** |
| **TC-03-04** | 웰니스 키워드 검색 (`searchKeyword`) | `keyword="스파"` | HTTP 200, 스파/치유 테마 스팟 정상 수신 | 기능 테스트 | **P2** |

---

### API-04. 한국관광공사의료관광정보 (`MdclTursmService`)
* **목적**: 보행 중 저혈당/혈압 응급 상황 대비 및 시니어 헬스케어 인프라 위치 제공
* **연동 오퍼레이션**: `/locationBasedList`, `/searchKeyword` (`langDivCd=KOR` / `ENG`)

| TC ID | 테스트 시나리오 | 파라미터 / 사전조건 | 기대 결과 (Expected) | 검증 방법 | 중요도 |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **TC-04-01** | 국문(`langDivCd=KOR`) 의료관광 인프라 조회 | `mapX=126.9816`, `mapY=37.5684`, `radius=25000`, `langDivCd=KOR`, `arrange=E` | HTTP 200, 최인접 의료 인프라 스팟 배열 반환 (`category: "의료·헬스케어 인프라"`) | 자동화/실시간 | **P0** |
| **TC-04-02** | 영문(`langDivCd=ENG`) 다국어 지원 확인 | `langDivCd=ENG` 전달 | 영문 표기된 의료기관명 및 주소 정상 수신 확인 | 자동화/실시간 | **P1** |
| **TC-04-03** | 의료 키워드 검색 (`searchKeyword`) | `keyword="병원"`, `langDivCd=KOR` | HTTP 200, 병원/헬스케어 명소 목록 반환 | 기능 테스트 | **P2** |

---

### API-05. [개발계정]식품의약품안전처_묶음의약품정보서비스 (`DrbBundleInfoService02`)
* **목적**: 만성질환자가 복용 중인 의약품 검색 시 위탁/수탁 품목명과 주성분, ATC 코드를 매칭하여 질환 자동 추론
* **연동 오퍼레이션**: `/getDrbBundleList02` (`cnsgnItemName`, `trustItemName`)
* **기술적 주의사항**: 본 서비스는 `itemName` 파라미터를 지원하지 않으며, 반드시 `cnsgnItemName`(위탁품목명) 또는 `trustItemName`(수탁품목명)으로 질의해야 정밀 필터링됩니다.

| TC ID | 테스트 시나리오 | 파라미터 / 사전조건 | 기대 결과 (Expected) | 검증 방법 | 중요도 |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **TC-05-01** | 수탁품목명(`trustItemName`) 실시간 검색 | `trustItemName="아스피린"` | HTTP 200, `header.resultCode="00"`, `totalCount=19` 정상 수신, 주성분 추출 | 자동화/실시간 | **P0** |
| **TC-05-02** | 위탁품목명(`cnsgnItemName`) 실시간 검색 | `cnsgnItemName="노바스크"` | HTTP 200, `header.resultCode="00"`, `totalCount=3` 정상 수신, 품목명 추출 | 자동화/실시간 | **P0** |
| **TC-05-03** | 단독 라이브 검색 (`searchMedicationsLiveOnly`) | 로컬 DB 사전 병합 없이 순수 공공 API만 질의 | 실제 공공 API 서버 응답 아이템만 반환되어 실시간 연결 상태 입증 | 단위 테스트 | **P0** |
| **TC-05-04** | 검색 결과 바탕 기저질환 역추론 연동 | "다이아벡스", "메트포르민" 검색 후 선택 | `inferredCondition`이 자동으로 "당뇨"로 선택되고 프로필에 동기화 | 통합 시나리오 | **P0** |
| **TC-05-05** | 네트워크 타임아웃 / CORS 차단 시 로컬 폴백 | 오프라인 또는 API 서버 응답 지연 (4000ms 초과) | `POPULAR_MEDICATIONS` 로컬 마스터 데이터셋 즉시 반환 | 회복력 테스트 | **P0** |

---

### API-06. 식품의약품안전처의약품안전사용서비스(DUR)성분정보 (`DURIrdntInfoService03`)
* **목적**: 7대 DUR 안전 카테고리(병용금기, 특정연령금기, 임부금기, 용량주의, 투여기간주의, 노인주의, 효능군중복) 실시간 점검
* **연동 오퍼레이션**: 7개 전용 엔드포인트 (`...02`)
* **기술적 주의사항**: 병용금기(`getUsjntTabooInfoList02`)는 파라미터명이 `ingrKorName`이며, 나머지 6개 오퍼레이션은 `ingrName`을 사용합니다.

| TC ID | 테스트 시나리오 | 파라미터 / 사전조건 | 기대 결과 (Expected) | 검증 방법 | 중요도 |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **TC-06-01** | 임부금기 성분 점검 (`getPwnmTabooInfoList02`) | `ingrName="아토르바스타틴"` | HTTP 200, `totalCount=4`, `PROHBT_CONTENT` 금기 사유 수신 확인 | 자동화/실시간 | **P0** |
| **TC-06-02** | 병용금기 성분 점검 (`getUsjntTabooInfoList02`) | `ingrKorName="심바스타틴"` | HTTP 200, `totalCount=42`, `MIXTURE_INGR_KOR_NAME` 매칭 확인 | 자동화/실시간 | **P0** |
| **TC-06-03** | 노인주의 성분 점검 (`getOdsnAtentInfoList02`) | `ingrName="디아제팜"` | HTTP 200, `totalCount=1`, 노인 운동실조·진정 주의 사유 수신 | 자동화/실시간 | **P0** |
| **TC-06-04** | 용량주의 성분 점검 (`getCpctyAtentInfoList02`) | `ingrName="트리아졸람"` | HTTP 200, `MAX_QTY` (1일 최대 용량) 안내 수신 | 자동화/실시간 | **P1** |
| **TC-06-05** | 복합 성분 동시 병렬 점검 (`checkLiveDurWarnings`) | "아토르바스타틴" 7개 오퍼레이션 동시 호출 | `isLiveSuccess=true`, 7개 항목 점검 완료 및 태그 배열 조합 | 통합 테스트 | **P0** |
| **TC-06-06** | 안전한 성분 (주의사항 없음) 점검 | 유효하지만 금기 대상이 아닌 성분 입력 | 빈 경고 태그 배열 반환 및 '안전' 상태 판정 | 경계값 | **P1** |

---

### API-07. 식품의약안전처식품영양성분DB정보 (`FoodNtrCpntDbInfo03`)
* **목적**: 안심식당 메뉴에 대한 공인 칼로리, 탄수화물, 단백질, 당류, 나트륨 영양 성분 조회 및 안전 등급 판정
* **연동 오퍼레이션**: `/getFoodNtrCpntDbInq03`

| TC ID | 테스트 시나리오 | 파라미터 / 사전조건 | 기대 결과 (Expected) | 검증 방법 | 중요도 |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **TC-07-01** | 대표 식단 '비빔밥' 영양성분 단건 조회 | `FOOD_NM_KR="비빔밥"` | HTTP 200, `AMT_NUM1`(142kcal), `AMT_NUM8`(당류 2g), `AMT_NUM14`(나트륨 73mg) 파싱 | 자동화/실시간 | **P0** |
| **TC-07-02** | 당뇨 환자 기준 당류 안전 등급 산정 | 당류 8g 이하 / 15g 이하 / 15g 초과 | 각각 `안심` / `보통` / `주의` 등급 정확히 계산 | 유닛 테스트 | **P0** |
| **TC-07-03** | 고혈압 환자 기준 나트륨 안전 등급 산정 | 나트륨 500mg 이하 / 900mg 이하 / 900mg 초과 | 각각 `안심` / `보통` / `주의` 등급 정확히 계산 | 유닛 테스트 | **P0** |
| **TC-07-04** | 미등록 메뉴 또는 특수 음식명 검색 | `FOOD_NM_KR="우주식량외계밥"` | 에러 없이 `null` 반환 후 스마트 기본 영양 가이드로 안전 폴백 | 예외 테스트 | **P1** |
| **TC-07-05** | 다건 유사 메뉴 검색 (`searchFoodNutritionList`) | `FOOD_NM_KR="샐러드"`, `numOfRows=5` | 최대 5개 연관 메뉴의 영양 성분 배열 반환 | 기능 테스트 | **P1** |

---

## 3. 사용자 여정 기반 통합 기능 QA 시나리오

```
[사용자 위치 감지] ───► [4대 Tour API 병렬 수집 (거리순 E)] ───► [무장애·웰니스 가중치 코스 생성]
       │
       ▼
[의약품 등록] ──────► [식약처 묶음의약품/DUR 점검] ────────────► [질환 맞춤 보행 가이드 & 쉼터 레이더]
       │
       ▼
[안심 식당 선택] ───► [식약처 식품영양성분DB] ────────────────► [당류/나트륨 안전 등급 뱃지 표시]
```

### 시나리오 1. 위치 기반 4대 Tour API 앙상블 렌더링 검증
1. 앱 진입 시 사용자의 위경도 좌표(기본값: 서울 시청 인근)를 취득한다.
2. `fetchComprehensiveRegionalTourData`가 실행되어 4대 API(국문·무장애·웰니스·의료)가 `arrange="E"`(거리순)로 병렬 호출되는지 확인한다.
3. 일부 API에서 일시적 지연이 발생하더라도 `Promise.allSettled`에 의해 가용한 데이터가 지도에 정상 마커로 표출되는지 검증한다.
4. 동일 좌표 재방문 시 `vitalroot_tour_cache_*` 로컬 스토리지에 캐싱된 데이터가 즉시 로딩되어 네트워크 트래픽을 절감하는지 확인한다.

### 시나리오 2. 의약품 검색 및 DUR 실시간 경고 연동 검증
1. 설정 모달 또는 온보딩 모달의 의약품 검색창에 "아스피린" 또는 "다이아"를 입력한다.
2. 식약처 묶음의약품 API 및 로컬 DB 매칭으로 추천 품목이 검색 결과에 표시되는지 확인한다.
3. 약물을 클릭하여 복용 목록에 추가했을 때 기저질환(예: 당뇨, 고혈압)이 자동으로 체크되고 연동되는지 검증한다.
4. "아토르바스타틴" 등 복용 시 임부금기 및 노인주의 경고 태그가 정상 부착되는지 확인한다.

### 시나리오 3. 안심 식당 영양성분 안전 등급 산정 검증
1. 코스 내 추천된 안심식당 카드의 대표 메뉴(예: 비빔밥, 곤드레밥)를 확인한다.
2. 식약처 식품영양성분DB 조회 결과에 따라 당류 `안심` (초록색 뱃지), 나트륨 `안심` 뱃지가 정확히 계산되어 표출되는지 검증한다.
3. 영양 팁 문구에 공인 식약처 기준치 안내가 정상 렌더링되는지 확인한다.

### 시나리오 4. 설정 모달 내 실시간 API 진단기(Diagnostics) 검증
1. 지도 우측 상단 톱니바퀴 [⚙️ 설정] 버튼을 클릭한다.
2. 세 번째 탭인 `[시스템 / 디바이스]` 탭을 선택한다.
3. `[공공데이터 7대 API 실시간 무결성 진단]` 영역의 `[전수 점검 실행]` 버튼을 누른다.
4. 버튼이 로딩 스피너로 전환된 후 약 1~2초 이내에 7개 API의 상태가 모두 초록색 `정상` 뱃지와 응답 시간(ms)으로 표출되는지 확인한다.

---

## 4. 자동화 테스트 실행 및 빌드 검증 매뉴얼

### 4.1 터미널 자동화 검증 커맨드

```powershell
# 1. 환경 변수 경로 확인 (PowerShell 환경)
$env:Path = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;" + $env:Path

# 2. 7대 공공데이터 API 실시간 무결성 심층 검증 (Zero Mock, 10개 시나리오)
cmd /c "npm run test:api"

# 3. TypeScript 타입 체크 무결성 검증
cmd /c "npx tsc -b"

# 4. Vite 프로덕션 빌드 무결성 검증
cmd /c "npm run build"
```

### 4.2 실제 테스트 수행 결과 로그

```text
> react-map-js@0.0.0 test:api
> node tests/api-verification.test.mjs

================================================================
   VitalRoot 7대 공공데이터 API 실시간 무결성 심층 검증 슈트   
================================================================

  Testing 1. 한국관광공사국문 관광정보 서비스_GW (KorService2/locationBasedList2 - 거리순 arrange=E) ... ✔ PASS (143ms) - resultCode 0000, 3건 수신, 최인접 거리=75m (인천집)
  Testing 1-1. 국문 관광정보 키워드 검색 (KorService2/searchKeyword2) ... ✔ PASS (207ms) - resultCode 0000, 키워드 '비빔밥' 매칭 2건 (강릉꼬막비빔밥풍호맛뜨락)
  Testing 2. 한국관광공사무장애 여행 정보 (KorWithService2/locationBasedList2 - 거리순 arrange=E) ... ✔ PASS (156ms) - resultCode 0000, 무장애 명소 3건, 최인접 거리=148m (영풍문고 종각종로본점)
  Testing 2-1. 무장애 상세 편의시설 조회 (KorWithService2/detailWithTour2) ... ✔ PASS (79ms) - resultCode 0000, contentId=1304864 편의시설 [장애인주차장, 장애인화장실]
  Testing 3. 한국관광공사웰니스관광정보 (WellnessTursmService/locationBasedList - KOR & 거리순 arrange=E) ... ✔ PASS (180ms) - resultCode 0000, 웰니스 치유스팟 3건 (후암별채, 테마코드: EX050400)
  Testing 4. 한국관광공사의료관광정보 (MdclTursmService/locationBasedList - langDivCd=KOR & ENG) ... ✔ PASS (171ms) - resultCode 0000, KOR/ENG 양방향 정상 수신 (Mediround.Corp (주식회사 메디라운드))
  Testing 5. [개발계정]식품의약품안전처_묶음의약품정보서비스 (DrbBundleInfoService02 - 수탁/위탁 품목명 실시간 쿼리) ... ✔ PASS (614ms) - NORMAL SERVICE, 아스피린(수탁)=19건, 노바스크(위탁)=3건 (주성분: 라베프라졸나트륨)
  Testing 6. 식품의약품안전처의약품안전사용서비스(DUR)성분정보 (DURIrdntInfoService03 - 임부금기, 병용금기, 노인주의) ... ✔ PASS (266ms) - NORMAL SERVICE, 임부금기(아토르바스타틴)=4건, 병용금기(심바스타틴)=42건, 노인주의(디아제팜)=1건
  Testing 7. 식품의약안전처식품영양성분DB정보 (FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03) ... ✔ PASS (793ms) - NORMAL SERVICE, 비빔밥: 142kcal, 당류 2g(안심), 나트륨 73mg(안심)
  Testing 8. [예외/회복력] 잘못된 인증키 거부 및 비정상 좌표 방어 검증 ... ✔ PASS (105ms) - 오류 인증키 식별 차단 및 망망대해 0건 안전 반환 확인 완료

----------------------------------------------------------------
검증 결과 요약: 총 10개 중 10개 통과, 0개 실패
----------------------------------------------------------------

🎉 모든 7대 공공데이터 API 연동 및 품질 규격 검증이 완벽히 성공했습니다!
```

---

## 5. 비상 대응 및 결함 격리 (Failover & Resilience) 정책

1. **공공데이터포털 서버 일시 장애 (HTTP 500, 503, 점검 시간대)**
   - API 호출부마다 4,000ms ~ 5,000ms의 `AbortSignal.timeout`이 기본 적용되어 브라우저 메인 스레드 멈춤 현상을 원천 차단합니다.
   - 타임아웃 발생 시 로컬 캐시(`localStorage`) 또는 사전 임베딩된 마스터 데이터셋(`POPULAR_MEDICATIONS`)으로 무중단 자동 전환됩니다.

2. **CORS (Cross-Origin Resource Sharing) 제약 방어**
   - 개발 및 로컬 테스트 환경에서는 공공데이터포털 CORS 헤더 허용 정책에 따라 정상 통신되며, 브라우저 차단 발생 시에도 로컬 인텔리전스 엔진이 스마트 대체 동작을 수행합니다.

3. **신분류체계 (lclsSystm1/2/3) 호환성 보장**
   - 신규 분류체계 코드(EX: 체험/웰니스, FD: 음식, NA: 자연공원 등)와 기존 `contentTypeId` (39: 음식점, 12: 관광지 등)를 동시 지원하여 구형 API 응답 규격과 신형 규격 모두 100% 매핑됩니다.
