// 메인 App 컴포넌트
import { useEffect } from "react";
import { MapContainer } from "./components/map/MapContainer";
import { ControlPanel } from "./components/panels/ControlPanel";
import { InfoBar } from "./components/common/InfoBar";
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
      <ControlPanel /> {/* 왼쪽 상단 패널 */}
      <MapContainer /> {/* 지도 컴포넌트 & 우측 상단 인증/지도 전환 바 */}
      <InfoBar /> {/* 하단 정보 바 */}
      <AuthModal /> {/* 로그인 / 회원가입 오버레이 모달 */}
    </div>
  );
}

export default App;