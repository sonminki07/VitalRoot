// React의 생명주기 훅 useEffect 및 변경 감지용 참조 훅 useRef 불러오기
import { useEffect, useRef } from "react";
// Zustand 스토어의 얕은 비교를 지원하여 불필요한 리렌더링을 방지하는 useShallow 불러오기
import { useShallow } from "zustand/react/shallow";
// 네이버 지도 및 관련 레이어 렌더링 컨테이너 컴포넌트 불러오기
import { MapContainer } from "./components/map/MapContainer";
// 좌측/하단 메인 제어 패널(코스, 숙소, 퀘스트 등 탭 제공) 불러오기
import { ControlPanel } from "./components/panels/ControlPanel";
// 사용자 로그인 및 회원가입 모달 팝업 불러오기
import { AuthModal } from "./components/auth/AuthModal";
// 브라우저 위치 권한 허용 안내 모달 불러오기
import { LocationModal } from "./components/common/LocationModal";
// 신규 사용자를 위한 헬스케어 온보딩 모달 불러오기
import { OnboardingModal } from "./components/auth/OnboardingModal";
// 환경설정 및 건강 프로필 관리 모달 불러오기
import { SettingsModal } from "./components/common/SettingsModal";
// 걷기 세션의 1초 주기 타이머 헤드리스 컨트롤러 불러오기
import { WalkSessionTimerController } from "./components/walk/WalkSessionTimerController";
// Supabase 사용자 인증 상태 관리 스토어 불러오기
import { useAuthStore } from "./store/authStore";
// 웰니스 코스 및 프로필 상태 스토어와 온보딩 검증 유틸, 서울시청 기본 좌표 불러오기
import { useWellnessStore, checkIsOnboardingComplete, SEOUL_CITY_HALL } from "./store/wellnessStore";
// 지도 뷰포트 및 이동 상태 제어 스토어 불러오기
import { useMapStore } from "./store/mapStore";

// VitalRoot 메인 애플리케이션 함수형 컴포넌트 선언
function App() {
  // 인증 세션 초기화 함수 가져오기
  const initAuth = useAuthStore((s) => s.initAuth);
  // 현재 로그인된 사용자의 고유 ID 가져오기
  const authUserId = useAuthStore((s) => s.user?.id);

  // 웰니스 전역 상태에서 필요한 상태값과 액션들을 얕은 비교로 안전하게 구독
  const {
    profile,
    openOnboardingModal,
    themeMode,
    userLocation,
    setUserLocation,
    loadRegionData,
    toastMessage,
    showToast,
    hideToast,
  } = useWellnessStore(
    useShallow((s) => ({
      profile: s.profile, // 건강 설문 프로필 데이터
      openOnboardingModal: s.openOnboardingModal, // 온보딩 모달 열기 함수
      themeMode: s.themeMode, // 라이트/다크 테마 모드
      userLocation: s.userLocation, // 현재 사용자 위치 좌표
      setUserLocation: s.setUserLocation, // 사용자 위치 업데이트 함수
      loadRegionData: s.loadRegionData, // 좌표 기반 지역 데이터 로드 함수
      toastMessage: s.toastMessage, // 전역 알림 토스트 메시지
      showToast: s.showToast, // 토스트 팝업 표출 함수
      hideToast: s.hideToast, // 토스트 닫기 함수
    }))
  );

  // 네이버 지도 부드러운 좌표 이동(FlyTo) 함수 가져오기
  const { flyToPlace } = useMapStore();
  // 온보딩 체크 여부를 추적하는 Ref 플래그 (중복 팝업 방지)
  const hasCheckedOnboarding = useRef(false);
  // 위치 권한 체크 여부를 추적하는 Ref 플래그 (중복 요청 방지)
  const hasCheckedGeolocation = useRef(false);

  // 전역 Supabase 세션 리스너 및 OAuth 로그인 복귀 파라미터 초기화
  useEffect(() => {
    // 앱 마운트 시 세션 리스너 등록 후 정리(cleanup) 함수 저장
    const cleanup = initAuth();
    // 컴포넌트 언마운트 시 리스너 해제
    return cleanup;
  }, [initAuth]);

  // 전역 인증 모달 열기 커스텀 이벤트 리스너 등록 (스토어 간 순환 참조 방지)
  useEffect(() => {
    // vital-auth-required 이벤트 수신 핸들러 함수 정의
    const handleAuthRequired = (event: Event) => {
      // 커스텀 이벤트 상세 데이터 파싱 (로그인 모드 또는 회원가입 모드)
      const customEvent = event as CustomEvent<{ mode?: "signin" | "signup" }>;
      // 지정 모드가 없으면 기본 'signin' 모드로 지정
      const mode = customEvent.detail?.mode ?? "signin";
      // 인증 모달 오픈 액션 호출
      useAuthStore.getState().openModal(mode);
    };
    // 윈도우 전역에 커스텀 이벤트 등록
    window.addEventListener("vital-auth-required", handleAuthRequired);
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => window.removeEventListener("vital-auth-required", handleAuthRequired);
  }, []);

  // 인증 사용자 상태(로그인 ID) 변경 시 데이터베이스와 건강 프로필 자동 동기화
  useEffect(() => {
    // 로그인된 사용자가 존재할 경우에만 DB 동기화 실행
    if (authUserId) {
      // 백엔드 Supabase DB와 로컬 프로필 데이터 매핑 동기화
      useWellnessStore.getState().syncProfileWithDb(authUserId);
    }
  }, [authUserId]);

  // 브라우저 위치 권한 요청 처리 및 거부 시 서울시청 좌표 강제 대체 (TC-01 요구사항)
  useEffect(() => {
    // 이미 위치 검사를 마쳤다면 조기 반환
    if (hasCheckedGeolocation.current) return;
    // 첫 1회 실행 플래그 활성화
    hasCheckedGeolocation.current = true;

    // 브라우저 환경 및 Geolocation API 지원 여부 확인
    if (typeof window !== "undefined" && navigator.geolocation) {
      // 로컬 스토리지에 기존 저장된 위치 좌표가 있는지 조회
      const savedLoc = localStorage.getItem("vitalroot_user_location");
      // 저장된 위치가 없다면 브라우저 GPS 위치 요청
      if (!savedLoc) {
        navigator.geolocation.getCurrentPosition(
          // 위치 획득 성공 콜백
          (pos) => {
            const lat = pos.coords.latitude; // 획득 위도
            const lng = pos.coords.longitude; // 획득 경도
            setUserLocation({ latitude: lat, longitude: lng }); // 사용자 위치 갱신
            flyToPlace(lng, lat, 14); // 사용자 위치로 지도 카메라 이동 (줌 14)
          },
          // 위치 획득 실패/거부 콜백
          (err) => {
            console.warn("[App] Geolocation denied or unavailable:", err); // 경고 콘솔 출력
            // TC-01: 위치 권한 거부 시 서울시청으로 강제 설정
            setUserLocation(SEOUL_CITY_HALL);
            // 서울시청 좌표로 지도 카메라 부드러운 비행 이동 (줌 14)
            flyToPlace(SEOUL_CITY_HALL.longitude, SEOUL_CITY_HALL.latitude, 14);
            // 사용자에게 기본 위치 전환 안내 토스트 메시지 표출
            showToast("📍 위치 권한이 거부되어 기본 위치(서울시청)로 안내합니다.");
          },
          // 배터리 절약 모드 및 타임아웃 8초 설정
          { enableHighAccuracy: false, timeout: 8000 }
        );
      } else {
        // 이미 저장된 위치가 있으면 해당 위치 좌표로 지역 데이터 로드
        const lat = userLocation?.latitude ?? SEOUL_CITY_HALL.latitude;
        const lng = userLocation?.longitude ?? SEOUL_CITY_HALL.longitude;
        loadRegionData(lat, lng);
      }
    } else {
      // Geolocation을 지원하지 않는 브라우저일 경우 기본 서울시청으로 설정
      setUserLocation(SEOUL_CITY_HALL);
      flyToPlace(SEOUL_CITY_HALL.longitude, SEOUL_CITY_HALL.latitude, 14);
    }
  }, [setUserLocation, loadRegionData, flyToPlace, showToast, userLocation]);

  // 앱 진입 시 건강 프로필 미작성 상태 감지 시 온보딩 모달 자동 팝업
  useEffect(() => {
    // 온보딩 체크가 아직 실행되지 않았을 때만 진입
    if (!hasCheckedOnboarding.current) {
      // 온보딩 체크 완료 플래그 설정
      hasCheckedOnboarding.current = true;
      // 필수 건강 프로필(나이, 보행 속도 등) 충족 여부 계산
      const isComplete = checkIsOnboardingComplete(profile);
      // 미완료 상태인 경우
      if (!isComplete) {
        // 지도가 렌더링되고 안정화된 후 800ms 뒤 온보딩 모달 자동 실행
        const timer = setTimeout(() => {
          openOnboardingModal();
        }, 800);
        // 클린업 시 타이머 취소
        return () => clearTimeout(timer);
      }
    }
  }, [profile, openOnboardingModal]);

  // 애플리케이션 전체 레이아웃 반환
  return (
    // 테마 모드에 따른 배경색과 뷰포트 전체(w-screen h-screen) 감싸기
    <div
      className={`relative w-screen h-screen ${
        themeMode === "light" ? "bg-slate-100" : "bg-gray-900"
      } overflow-hidden`}
    >
      {/* 전역 상단 토스트 알림 컴포넌트 (알림 메시지가 있을 때만 노출) */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl bg-gray-950/95 text-white border border-emerald-500/50 shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200">
          {/* 토스트 아이콘 */}
          <span className="text-base">📢</span>
          {/* 토스트 메시지 텍스트 */}
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
          {/* 토스트 닫기 버튼 */}
          <button
            onClick={hideToast}
            className="text-gray-400 hover:text-white ml-2 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

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
      {/* 3단계 헬스케어 온보딩 모달 (건강 맞춤형 기초 데이터 수집) */}
      <OnboardingModal />
      {/* VitalRoot 통합 환경 설정 모달 (건강/여행/시스템 확장) */}
      <SettingsModal />
    </div>
  );
}

// 루트 App 컴포넌트 기본 모듈 내보내기
export default App;