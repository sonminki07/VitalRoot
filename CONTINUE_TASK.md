# VitalRoot 프로젝트 연속 작업 가이드 (Home Continuation Guide)

> **핵심 키워드**: 사용자가 Antigravity에서 **`집에서 이어해줘`** 라고 입력하면, 본 문서를 최우선 기준으로 즉시 남은 작업을 파악하고 이어서 수행합니다.

---

## 1. 프로젝트 개요 & 현 상태 요약

- **프로젝트명**: VitalRoot (만성질환 맞춤형 웰니스 헬스케어 관광 플랫폼)
- **깃허브 저장소**: [https://github.com/sonminki07/VitalRoot](https://github.com/sonminki07/VitalRoot)
- **현재 브랜치**: `main` (최신 커밋 `b5e8cf6 Add GitHub Actions workflow to sync code to Google Docs` 및 로컬 작업 병합 완료)
- **빌드 상태**:
  - `npx tsc -b`: 0 에러 통과
  - `npm run build`: 정상 완료 (`dist/` 생성 성공)

---

## 2. 사용자가 요청한 전체 요구사항

1. **GitHub 최신 코드 동기화**: `https://github.com/sonminki07/VitalRoot` 최신 커밋 반영 (완료됨)
2. **API 키 및 외부 API 구조 변환 (교체 용이성 극대화)**:
   - 현재 및 향후 사용할 API(한국관광공사 Tour API, Naver Maps API, Supabase, 식약처 공공데이터 등)를 추후 다른 키나 엔드포인트, Mock으로 손쉽게 갈아끼울 수 있도록 설정 파일(`src/config/apiConfig.ts`) 및 서비스 어댑터 패턴으로 추상화 및 캡슐화.
3. **`npm run dev` 실행 시 로컬호스트 모바일(핸드폰) 규격 뷰포트 지원**:
   - PC 모니터에서 접속하더라도 스마트폰 규격(아이폰 16 프로 디스플레이 규격)의 목업 프레임/뷰포트 컨테이너로 표시되도록 레이아웃 지원.
   - **참고 이미지 규격 (`docs/images/mobile_screen_spec_reference.png`)**:
     - 해상도: **2622 x 1206** (Super Retina XDR 디스플레이)
     - 화면 크기: **6.3인치**
     - 화소 밀도: **460 ppi**
     - 논리 CSS 뷰포트 기준: **402px (너비) × 874px (높이)** (모바일 프레임 래퍼를 통한 중앙 배치, 토글 기능 포함)
4. **구글 문서 및 `PROJECT.md` 규격에 맞춘 파일/컴포넌트 구조 재편 (모듈화)**:
   - 참고 링크: [Google Docs 기획안](https://docs.google.com/document/d/1GjsCSCtNUQ_ycInXQmmE8dh2UR4LvLe-1A454sP8RE8/edit?tab=t.0)
   - 모놀리식 파일 분할:
     - `src/components/map/MapContainer.tsx` (1,500줄 -> 코디네이터, 레이어, 위젯, 컨트롤러 분리)
       - `src/components/map/controllers/useMapFlightController.ts`
       - `src/components/map/layers/MapMarkersLayer.tsx`
       - `src/components/map/layers/MapPolylinesLayer.tsx`
       - `src/components/map/widgets/MapFloatingWidgets.tsx`
       - `src/components/map/widgets/MapWalkSessionBanner.tsx`
     - `src/components/panels/ControlPanel.tsx` (1,500줄 -> 5개 탭 서브컴포넌트 분리)
       - `src/components/panels/tabs/CourseTab.tsx`
       - `src/components/panels/tabs/CourseNutritionAccordion.tsx`
       - `src/components/panels/tabs/MultiDayTab.tsx`
       - `src/components/panels/tabs/StayTab.tsx`
       - `src/components/panels/tabs/QuestTab.tsx`
       - `src/components/panels/tabs/QuestWalkSessionCard.tsx`
       - `src/components/panels/tabs/ConditionFilterTab.tsx`
5. **작업 완료 단계마다 상시 테스트**:
   - 매 단계마다 `npx tsc -b`, `npm run lint`, `npm run build` 검증 필수 수행.

---

## 3. 남은 작업(TODO) 로드맵 및 실행 순서

집에서 "집에서 이어해줘" 명령 시 아래 순서대로 수행하면 됩니다:

### [Step 1] API 설정 & 추상화 레이어 구축 (`src/config/apiConfig.ts`)
- Naver Cloud Maps Client ID, Tour API Key, Supabase URL/Key, 식약처 API 등 환경변수(`.env`)와 연동
- API 키가 없거나 변경될 때 fallback mock 데이터를 반환하거나 손쉽게 교체할 수 있는 인터페이스 정의
- `tourApi.ts` 및 관련 서비스들이 이 설정을 바라보도록 리팩토링

### [Step 2] 로컬호스트 모바일 뷰포트 프레임 컨테이너 구현
- PC 브라우저(`http://localhost:5173`)로 열었을 때도 이미지 스펙(402 × 874pt, 베젤 및 안전 영역)을 갖춘 모바일 프레임으로 렌더링되도록 래퍼 구현 (또는 데스크톱/모바일 뷰 전환 토글 제공)
- 모바일 디바이스에서 직접 접속할 때는 전체 화면(`100dvh`)을 채우도록 반응형 처리

### [Step 3] 모놀리식 컴포넌트 하위 분할 (파일 구조 개편)
- `MapContainer.tsx` 분할:
  - `controllers/useMapFlightController.ts`
  - `layers/MapMarkersLayer.tsx`
  - `layers/MapPolylinesLayer.tsx`
  - `widgets/MapFloatingWidgets.tsx`
- `ControlPanel.tsx` 분할:
  - `tabs/CourseTab.tsx`
  - `tabs/CourseNutritionAccordion.tsx`
  - `tabs/MultiDayTab.tsx`
  - `tabs/StayTab.tsx`
  - `tabs/QuestTab.tsx`
  - `tabs/ConditionFilterTab.tsx`

### [Step 4] 빌드 및 타입 무결성 검증 & 커밋
- `npx tsc -b` (타입 오류 0건 검증)
- `npm run lint` (린트 오류 해결)
- `npm run build` (번들 빌드 및 청크 최적화 검증)
- 작업 완료 후 GitHub에 푸시

---

## 4. 관련 보관 자료 위치

- **대화 및 에이전트 히스토리**:
  - `docs/antigravity_history/CONVERSATION_LOG.md`
  - `docs/antigravity_history/parent_session_transcript.jsonl`
  - `docs/antigravity_history/subagent_transcript.jsonl`
- **모바일 스펙 참조 이미지**:
  - `docs/images/mobile_screen_spec_reference.png`
- **상세 기획서**:
  - `PROJECT.md`
  - `2026_학술제_기획서_완성본.md`
  - `2026_학술제_기획서_GoogleDocs용.txt`
