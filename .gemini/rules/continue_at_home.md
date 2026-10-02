---
description: Rule to seamlessly continue VitalRoot work when user says '집에서 이어해줘'
globs: ["*"]
---

# Home Continuation Rule (집에서 이어해줘 감지 규칙)

사용자가 **"집에서 이어해줘"** (또는 이와 유사한 작업 재개/이어하기 요청)를 입력했을 때, Antigravity는 아래 지침을 즉시 따릅니다:

1. **상태 확인**: `CONTINUE_TASK.md`와 `PROJECT.md`를 열람하여 미완료 작업 목록 및 진행 상황을 파악합니다.
2. **모드 설정**: 이전 요청에서 지정된 `/boost`, `/plan`, `/goal` 기조에 맞춰 단계별 계획을 수립하고, 각 단계마다 테스트(`npx tsc -b`, `npm run lint`, `npm run build`)를 수행합니다.
3. **핵심 작업 4대 영역**:
   - **API 교체 용이성**: `src/config/apiConfig.ts` 및 관련 API 어댑터 구조화
   - **모바일 뷰포트**: `npm run dev` 시 아이폰 16 프로 규격(402×874 pt, `docs/images/mobile_screen_spec_reference.png`) 뷰포트 프레임 렌더링
   - **컴포넌트 구조 분할**: `MapContainer.tsx` 및 `ControlPanel.tsx` 모듈화 (Google Docs / `PROJECT.md` 구조 반영)
   - **상시 검증**: 각 단계 완료 시마다 빌드 및 타입 검사 통과 확인
4. 불필요하게 처음부터 되묻지 않고 바로 다음 미완료 단계(Step 1: API 설정 & 어댑터 레이어 구축)부터 작업을 시작합니다.
