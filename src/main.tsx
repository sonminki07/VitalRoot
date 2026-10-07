// React 핵심 라이브러리에서 StrictMode 불러오기 (잠재적 문제 검사 및 이중 렌더링 검증)
import { StrictMode } from 'react'
// React 18+ 클라이언트 DOM 렌더러 생성 함수 불러오기
import { createRoot } from 'react-dom/client'
// 프로젝트 전역 CSS 스타일시트 (Tailwind CSS 포함) 적용
import './index.css'
// 애플리케이션의 최상위 루트 컴포넌트 불러오기
import App from './App.tsx'

// index.html의 'root' DOM 엘리먼트를 찾아 React 렌더 트리의 진입점 생성
createRoot(document.getElementById('root')!).render(
  // 개발 모드에서 부작용(Side Effects) 검사를 수행하는 StrictMode 감싸기
  <StrictMode>
    {/* 메인 루트 애플리케이션 컴포넌트 마운트 */}
    <App />
  </StrictMode>,
)