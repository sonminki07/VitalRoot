// 메인 App 컴포넌트
import { useEffect } from "react";
import { MapContainer } from "./components/map/MapContainer";
import { ControlPanel } from "./components/panels/ControlPanel";
import { AuthModal } from "./components/auth/AuthModal";
import { useAuthStore } from "./store/authStore";

function App() {
  const { initAuth } = useAuthStore();

  // 전역 Supabase 세션 리스너 및 OAuth 복귀 파라미터 초기화
  useEffect(() => {
    const cleanup = initAuth();
    return cleanup;
  }, [initAuth]);

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden">
      {/* 반응형 컨트롤 패널 (데스크톱: 좌측 플로팅 / 모바일: 하단 바텀 시트) */}
      <ControlPanel />
      {/* 지도 컴포넌트 & 상단 유틸 바 & 하단 코스 요약/길찾기 바 */}
      <MapContainer />
      {/* 로그인 / 회원가입 오버레이 모달 */}
      <AuthModal />
    </div>
  );
}

export default App;