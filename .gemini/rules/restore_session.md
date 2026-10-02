---
description: Automatically restore session, environment, React/Vite, and skills when user says '안그래비티 대화창 불러와줘' or '집에서 이어해줘'
globs: ["*"]
---

# Session & Environment Restoration Rule

사용자가 **"안그래비티 대화창 불러와줘"**, **"안티그래비티 대화창 불러와줘"**, **"대화창 불러와줘"**, **"대화 세션 불러와줘"**, 또는 **"집에서 이어해줘"**라고 말했을 때 실행하는 규칙입니다.

## 처리 절차
1. **환경 확인 및 복원**:
   - `node_modules` 존재 여부를 확인하고 없으면 `npm install` 실행
   - `.env`가 없으면 `.env.example`을 복사하여 `.env` 생성
   - `npx tsc -b` 실행하여 빌드 무결성 확인
2. **대화 히스토리 및 세션 복원**:
   - `docs/antigravity_history/FULL_SESSION_SUMMARY.md`와 `CONTINUE_TASK.md`를 로드
   - 지금까지 나눈 대화 세션의 핵심 내용(요청 사항, API 요구사항, 모바일 뷰포트 규격, 구글 문서 구조)을 사용자에게 요약 브리핑하여 대화창 상태 복원 완료를 안내
3. **스킬 활성화**:
   - `vitalroot-dev` 스킬 활성화
4. **작업 이어서 진행**:
   - `/boost`, `/plan`, `/goal` 플로우에 맞춰 남은 작업(API 레이어화, 모바일 프레임 프리뷰, 컴포넌트 하위 분할)을 단계별로 착수
