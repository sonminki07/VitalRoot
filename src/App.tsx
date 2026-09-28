// 메인 App 컴포넌트
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { MapContainer } from "./components/map/MapContainer";
import { ControlPanel } from "./components/panels/ControlPanel";
import { AuthModal } from "./components/auth/AuthModal";
import { LocationModal } from "./components/common/LocationModal";
import { OnboardingModal } from "./components/auth/OnboardingModal";
import { SettingsModal } from "./components/common/SettingsModal";
import { WalkSessionTimerController } from "./components/walk/WalkSessionTimerController";
import { useAuthStore } from "./store/authStore";
import { useWellnessStore, checkIsOnboardingComplete } from "./store/wellnessStore";

function App() {
  const initAuth = useAuthStore((s) => s.initAuth);
  const authUserId = useAuthStore((s) => s.user?.id);

  const { profile, openOnboardingModal, themeMode, userLocation, loadRegionData } =
    useWellnessStore(
      useShallow((s) => ({
        profile: s.profile,
        openOnboardingModal: s.openOnboardingModal,
        themeMode: s.themeMode,
        userLocation: s.userLocation,
        loadRegionData: s.loadRegionData,
      }))
    );

  const hasCheckedOnboarding = useRef(false);

  // 전역 Supabase 세션 리스너 및 OAuth 복귀 파라미터 초기화
  useEffect(() => {
    const cleanup = initAuth();
    return cleanup;
  }, [initAuth]);

  // 전역 인증 모달 열기 커스텀 이벤트 리스너 (wellnessStore와 authStore의 순환 참조 방지)
  useEffect(() => {
    const handleAuthRequired = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode?: "signin" | "signup" }>;
      const mode = customEvent.detail?.mode ?? "signin";
      useAuthStore.getState().openModal(mode);
    };
    window.addEventListener("vital-auth-required", handleAuthRequired);
    return () => window.removeEventListener("vital-auth-required", handleAuthRequired);
  }, []);

  // 인증 사용자 상태 변경 시 웰니스 프로필 자동 동기화
  useEffect(() => {
    if (authUserId) {
      useWellnessStore.getState().syncProfileWithDb(authUserId);
    }
  }, [authUserId]);

  // 최초 로드 시 현재 사용자 위치(또는 기본 서울)의 4대 공공 Tour API 데이터 온디맨드 로딩
  useEffect(() => {
    const lat = userLocation?.latitude ?? 37.5583;
    const lng = userLocation?.longitude ?? 126.9825;
    loadRegionData(lat, lng);
  }, []);

  // 최초 진입 시 건강 프로필 미완료(미흡) 상태인 경우 온보딩 팝업 자동 호출
  useEffect(() => {
    if (!hasCheckedOnboarding.current) {
      hasCheckedOnboarding.current = true;
      const isComplete = checkIsOnboardingComplete(profile);
      if (!isComplete) {
        // 지도 및 초기 렌더링 안정화 후 800ms 뒤 자동 팝업
        const timer = setTimeout(() => {
          openOnboardingModal();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [profile, openOnboardingModal]);

  return (
    <div
      className={`relative w-screen h-screen ${
        themeMode === "light" ? "bg-slate-100" : "bg-gray-900"
      } overflow-hidden`}
    >
      {/* 완보 세션 실시간 1초 틱 헤드리스 컨트롤러 (0 UI 렌더링, 전역 격리) */}
      <WalkSessionTimerController />
      {/* 반응형 컨트롤 패널 (데스크톱: 좌측 플로팅 / 모바일: 하단 바텀 시트) */}
      <ControlPanel />
      {/* 지도 컴포넌트 & 상단 유틸 바 & 하단 코스 요약/길찾기 바 */}
      <MapContainer />
      {/* 로그인 / 회원가입 오버레이 모달 */}
      <AuthModal />
      {/* 사용자 위치(GPS) 사용 동의 모달 */}
      <LocationModal />
      {/* 3단계 헬스케어 온보딩 모달 (이미지 2 기반) */}
      <OnboardingModal />
      {/* VitalRoot 통합 환경 설정 모달 (건강/여행/시스템 확장) */}
      <SettingsModal />
    </div>
  );
}

export default App;