# Antigravity Full Session History & State Reconstruction

> **용도**: 새로운 컴퓨터에서 Antigravity 세션을 복원하거나 "안그래비티 대화창 불러와줘" / "집에서 이어해줘" 명령을 받았을 때 현재 대화의 모든 맥락, 히스토리, 요구사항을 완벽히 복원하기 위한 통합 문서입니다.

---

## 1. 프로젝트 기본 정보
- **프로젝트명**: VitalRoot (만성질환 맞춤형 웰니스 헬스케어 관광 플랫폼)
- **저장소**: `https://github.com/sonminki07/VitalRoot`
- **핵심 기술 스택**: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand v5, Naver Maps API v3, Supabase, 한국관광공사 Tour API v4.3

---

## 2. 대화 세션 히스토리 전체 타임라인

### [Round 1] 사용자 최초 지시
- **사용자 입력**:
  ```text
  지금 이 폴더에 있는 파일을 https://github.com/sonminki07/VitalRoot 이거 최신으로 받아오고
  그리고 지금 API 키들이랑 다른 것들을 변환을 해야해
  API는 차후에 다시 올테니까 api를 바꿀 경우 교체가 쉽게 되도로 수정하고
  그리고 그 규격? npm run dev를 할떄 로컬 호스트에 나오는 그 규격? 모습을 pc가 아니라 핸드폰으로 해야하는 데 그 규격은 저 이미지로 참고하고
  그리고 https://docs.google.com/document/d/1GjsCSCtNUQ_ycInXQmmE8dh2UR4LvLe-1A454sP8RE8/edit?tab=t.0
  파일 구조는 저렇게 수정을 해줘
  /boost /plan /goal api가 쉽게 교체 할 수 있도록 하고, 규격이 핸드폰으로 나오게 하고 파일 구조는 docs에 맞춰서 작동이 되도록 작업이 다 될때 마다 테스트
  ```
- **첨부 이미지 정보 (`docs/images/mobile_screen_spec_reference.png`)**:
  - 디스플레이 상세 정보
  - 해상도: 2622 x 1206 (Super Retina XDR 디스플레이 - iPhone 16 Pro)
  - 화면 크기: 6.3인치
  - 화소 밀도: 460 ppi
  - CSS 논리 뷰포트 비율: 약 402px 너비 × 874px 높이
- **에이전트 조치**:
  - Delegation Routine 개시: DeepCoder 서브에이전트 소환하여 전체 작업 위임.

### [Round 2] 서버 재시작 및 서브에이전트 재개
- **상황**: Antigravity 소프트웨어 업데이트로 인한 백엔드 재시작.
- **사용자 입력**:
  ```text
  그 방금 안티그래비티 업데이트 하는 것 떄문에 서브 에이전트가 날라간거 같은 데 다시 해줘
  ```
- **에이전트 조치**:
  - 서브에이전트에 원본 작업 내용 및 참고 이미지 정보를 재전송하여 작업 재개.

### [Round 3] 퇴근 및 집에서 이어서 작업하기 위한 준비
- **사용자 입력**:
  ```text
  그 내가 집에서 이거 안티그래비티 돌려야 할 거 같아
  이거 중단? 하고 그 깃허브에다가 안티그래비티 이거 대화랑 프로젝트들 까지 한번에 올려줘
  집에서 이어해줘 라고 말을 하면 다시 작업이 이어서 작업이 되도록
  ```
- **에이전트 조치**:
  - 서브에이전트 작업 안전 종료 (`kill_all`).
  - `git stash` -> `git pull origin main` (최신 커밋 `b5e8cf6 Add GitHub Actions workflow to sync code to Google Docs` 병합) -> `git stash pop`.
  - 빌드 무결성 검증: `npx tsc -b` (0 에러 통과), `npm run build` (정상 통과).
  - 참조 이미지 및 트랜스크립트 저장 (`docs/images/`, `docs/antigravity_history/`).
  - `CONTINUE_TASK.md`, `.gemini/rules/continue_at_home.md` 작성.
  - 커밋 및 GitHub `origin/main` 푸시 완료.

### [Round 4] 새 컴퓨터에서 원클릭 복원 요청
- **사용자 입력**:
  ```text
  추가적으로 따로 내가 새로운 컴퓨터에서 저 깃허브 링크를 주고
  안그래비티 대화창 불러와줘 라고 하면
  리액트랑 다른 것들이랑 바이트랑 지금 이 대화 세션이랑 스킬들이 모두 다 불러와 지도록 해줘
  ```
- **에이전트 조치**:
  - 새 컴퓨터에서 깃허브 주소를 입력하고 `"안그래비티 대화창 불러와줘"`라고 입력했을 때,
    1) React/Vite 의존성 설치 (`npm install`)
    2) 대화 세션 및 상태 전면 복원
    3) Antigravity 스킬 및 규칙 자동 로드
    4) 현재 남은 개발 과업 즉시 실행 모드로 진입하도록 구조 구축.

---

## 3. 남은 핵심 과업 (Pending Tasks Checklist)

1. **[과업 1] 외부 API 추상화 및 교체 모듈화 (`src/config/apiConfig.ts`)**:
   - Tour API, Naver Maps API, Supabase, 식약처 공공데이터 키와 엔드포인트를 하나의 설정 모듈로 관리.
   - 키가 변경되거나 Mock으로 전환할 때 컴포넌트나 비즈니스 로직 수정 없이 `.env`나 `apiConfig.ts`만 수정하면 즉시 반영되도록 구현.
2. **[과업 2] `npm run dev` 시 아이폰 16 프로 규격 모바일 프레임 뷰포트 지원**:
   - 해상도 2622x1206 (6.3인치, 460ppi -> CSS 402px x 874px).
   - PC 웹 브라우저에서 접속 시 실제 스마트폰 디바이스 목업 프레임 내에 화면이 표시되도록 컨테이너 래퍼 구현 (모바일 디바이스 접속 시는 100% 전체 화면).
3. **[과업 3] 구글 문서 및 `PROJECT.md` 규격에 맞춘 파일 구조 재편**:
   - `MapContainer.tsx` (1,500줄) -> `controllers/useMapFlightController.ts`, `layers/MapMarkersLayer.tsx`, `layers/MapPolylinesLayer.tsx`, `widgets/MapFloatingWidgets.tsx`, `widgets/MapWalkSessionBanner.tsx` 분할.
   - `ControlPanel.tsx` (1,500줄) -> `tabs/CourseTab.tsx`, `tabs/CourseNutritionAccordion.tsx`, `tabs/MultiDayTab.tsx`, `tabs/StayTab.tsx`, `tabs/QuestTab.tsx`, `tabs/ConditionFilterTab.tsx` 분할.
4. **[과업 4] 단계별 상시 무결성 테스트**:
   - 각 작업 완료 시마다 `npx tsc -b`, `npm run lint`, `npm run build` 검증 필수 수행.
