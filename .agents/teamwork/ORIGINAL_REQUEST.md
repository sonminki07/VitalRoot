# Original User Request

## Initial Request — 2026-09-28T00:41:13Z

# Teamwork Project Prompt — VitalRoot Refactoring & Optimization

> Status: Launched
> Requested team: multi-agent teamwork system (다중 에이전트 팀워크 시스템)

만성질환 맞춤형 웰니스 헬스케어 관광 플랫폼 VitalRoot의 프로덕션 기술 부채를 해소하고, 미사용 라이브러리 제거를 통한 번들 최적화, 완보 타이머 틱에 의한 전역 리렌더링 병목 차단, 모놀리식 컴포넌트 모듈화 및 CI 무결성 파이프라인을 구축합니다.

Working directory: D:\VitalRoot-main\VitalRoot-main
Integrity mode: development

## Requirements

### R1. 미사용 의존성 및 사장 코드(Dead Code) 영구 정리
- 네이버 지도 API 전환 후 소스 코드에서 완전히 미사용 상태인 `mapbox-gl`, `react-map-gl`, `@turf/turf`, `@types/mapbox-gl` 패키지를 `package.json`에서 제거하고 의존성을 정리합니다.
- 가상 식당 생성 버그로 인해 스토어 호출이 완전 제거된 미사용 파일 `src/utils/localCourseSynthesizer.ts` 및 과거 레거시 훅/스토어(`useCircleData.ts`, `useMapFilter.ts`, `circleStore.ts`, `turf.ts`)를 안전하게 정리합니다.

### R2. 전역 상태(Zustand) 구독 셀렉터 최적화
- `ControlPanel.tsx` 및 `MapContainer.tsx`에서 30개 이상의 상태를 한 번에 구독하던 패턴을 Zustand 세부 셀렉터(`useWellnessStore((s) => s.stateName)`) 또는 얕은 비교(`shallow`)로 분리합니다.
- 1초 주기로 호출되는 `updateWalkSessionTick` 완보 타이머 작동 중에도 코스 목록, 지도 마커, 사이드바 등 무관한 컴포넌트의 불필요한 전체 DOM 강제 리렌더링을 차단합니다.

### R3. 대규모 모놀리식 컴포넌트 하위 분할 모듈화
- 1,500줄 분량의 `MapContainer.tsx`를 기능 단위의 하위 모듈(`MapFlightController.ts`, `MapMarkersLayer.tsx`, `MapPolylinesLayer.tsx`, `MapFloatingWidgets.tsx` 등)로 분할합니다.
- 1,500줄 분량의 `ControlPanel.tsx`를 5대 탭 컴포넌트(`CourseTab.tsx`, `MultiDayTab.tsx`, `StayTab.tsx`, `QuestTab.tsx`, `ConditionFilterTab.tsx`)로 하위 모듈화합니다.
- 컴포넌트 간 순환 참조 및 dynamic import 경고를 해소합니다.

### R4. GitHub Actions CI 자동 검증 파이프라인 구축
- `.github/workflows/ci.yml`을 신설하여 PR 및 `main` 푸시 시 `npm run lint`, `tsc -b` (타입 체크), `npm run build` 번들 검증을 자동 수행하도록 워크플로우를 구성합니다.

## Acceptance Criteria

### 번들 및 빌드 무결성
- [ ] `package.json`에서 `mapbox-gl`, `react-map-gl`, `@turf/turf`가 제거되고 `npm install` 후 `npm run build`가 0 에러로 정상 통과해야 함
- [ ] 번들 산출물 크기(`dist/assets/index-*.js`)가 기존 716KB에서 500KB 이하로 감소해야 함
- [ ] `tsc -b` 타입스크립트 컴파일 검사 시 타입 오류가 0건이어야 함
- [ ] `npm run lint` 실행 시 린트 에러가 발생하지 않아야 함

### 렌더링 성능 및 기능 동작
- [ ] 코스 선택, 네이버 도보 길찾기 직행 링크, 2단계 카메라 활공, 영양정보 아코디언 토글이 기존과 동일하게 정상 작동해야 함
- [ ] 도보 완보 세션 진행 중 타이머 틱(1초) 발생 시 `ControlPanel`과 `MapContainer` 전체가 리렌더링되지 않고 타이머 배너/프로그레스만 국소 렌더링되어야 함

### CI/CD 인프라
- [ ] `.github/workflows/ci.yml` 파일이 올바른 GitHub Actions 구문으로 생성되어 있어야 함
