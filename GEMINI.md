# Antigravity Workspace Guidelines for VitalRoot

## 🎯 세션 복원 및 대화창 불러오기 규칙 (Session Restoration Rule)

사용자가 아래 문구 중 하나를 입력하면:
- **"안그래비티 대화창 불러와줘"**
- **"안티그래비티 대화창 불러와줘"**
- **"대화창 불러와줘"**
- **"대화 세션 불러와줘"**
- **"집에서 이어해줘"**

Antigravity 에이전트는 **즉시 아래 4단계 절차를 자동 수행**합니다:

### 1단계: 환경 및 의존성 복원 (React 19, Vite, TypeScript)
- `node_modules/` 폴더가 없으면 즉시 `npm install`을 실행하여 모든 의존성을 설치합니다.
- `.env` 파일이 없으면 `.env.example`을 복사하여 기본 환경 변수를 준비합니다.
- `npx tsc -b`를 실행하여 컴파일 무결성을 확인합니다.

### 2단계: 대화 세션 및 맥락 복원
- `docs/antigravity_history/FULL_SESSION_SUMMARY.md` 및 `CONTINUE_TASK.md`를 열람하여 이전 대화의 모든 내용, 사용자 요청, 기술 결정사항을 파악합니다.
- 사용자에게 이전 대화 세션 복원 완료 브리핑(4대 요구사항 요약 및 현재 코드 상태)을 제공합니다.

### 3단계: 전용 스킬 및 도구 로드
- 프로젝트 전용 스킬 `vitalroot-dev`(`.gemini/skills/vitalroot-dev/SKILL.md`)을 활성화합니다.

### 4단계: 남은 개발 작업 즉시 착수
- 불필요한 질문 없이 다음 미완료 단계(1. API 추상화 레이어 -> 2. 모바일 뷰포트 프리뷰 -> 3. 컴포넌트 모듈화)를 이어서 수행합니다.
- 매 단계 완료 시마다 `npx tsc -b`, `npm run lint`, `npm run build`를 실행합니다.

---

## 📱 모바일 뷰포트 스펙
- 디스플레이 규격: 2622 x 1206 (iPhone 16 Pro, 6.3", 460ppi)
- CSS 논리 뷰포트: **402px (너비) × 874px (높이)**
- `npm run dev` 시 PC 화면에서도 모바일 기기 프레임 안에서 렌더링되도록 지원.
