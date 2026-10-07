// React 핵심 상태 및 생명주기 훅 불러오기
import { useState, useEffect } from "react";
// Zustand 스토어 구독 시 불필요한 리렌더링을 차단하는 shallow 비교 유틸
import { useShallow } from "zustand/react/shallow";
// 웰니스 코스 및 질환/프로필 전역 상태 관리 스토어 불러오기
import { useWellnessStore } from "../../store/wellnessStore";
// 네이버 지도 뷰포트 이동 및 포커스 제어 스토어 불러오기
import { useMapStore } from "../../store/mapStore";
// 만성질환 타입 선언 불러오기
import { ChronicCondition } from "../../types/wellness.types";
// 추천 웰니스 코스 탭 뷰 컴포넌트 불러오기
import { CourseTab } from "./tabs/CourseTab";
// 1박 2일 장기 코스 탭 뷰 컴포넌트 불러오기
import { MultiDayTab } from "./tabs/MultiDayTab";
// 안심 숙소 탭 뷰 컴포넌트 불러오기
import { StayTab } from "./tabs/StayTab";
// 웰니스 퀘스트 및 칭호 리워드 탭 뷰 컴포넌트 불러오기
import { QuestTab } from "./tabs/QuestTab";
// 질환별 필터 설정 탭 뷰 컴포넌트 불러오기
import { ConditionFilterTab } from "./tabs/ConditionFilterTab";
// 식약처 DUR 복약 주의보 상시 요약 카드 컴포넌트 불러오기
import { DurWarningSummaryCard } from "./DurWarningSummaryCard";

// 지원하는 6대 만성질환 전체 목록 상수
const ALL_CONDITIONS: ChronicCondition[] = [
  "당뇨",
  "고혈압",
  "저혈압",
  "이상지질혈증",
  "신장질환",
  "관절/근골격계",
];

// 통합 제어 사이드바/바텀시트 패널 컴포넌트 선언
export function ControlPanel() {
  // 현재 활성화된 탭 상태 ("courses" | "multiday" | "stays" | "quests" | "profile")
  const [activeTab, setActiveTab] = useState<
    "courses" | "multiday" | "stays" | "quests" | "profile"
  >("courses");
  // 모바일 뷰에서 바텀시트가 위로 펼쳐졌는지 여부 상태
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  // 코스별 영양소 세부 정보 아코디언 펼침/접힘 상태 맵
  const [expandedNutritionCourseIds, setExpandedNutritionCourseIds] = useState<Record<string, boolean>>({});

  // 데스크톱 패널 가로 너비 상태 (로컬 스토리지에서 복원 또는 기본 380px)
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 380;
    const saved = localStorage.getItem("vital_panel_width");
    return saved ? Math.min(Math.max(Number(saved), 280), 750) : 380;
  });
  // 데스크톱 패널 세로 높이 상태 (로컬 스토리지에서 복원 또는 화면 전체)
  const [panelHeight, setPanelHeight] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("vital_panel_height");
    return saved ? Math.max(Number(saved), 360) : null;
  });
  // 사이드바 완전 접힘 모드 여부
  const [isCollapsed, setIsCollapsed] = useState(false);
  // 마우스 드래그로 크기 조절 중인지 여부 플래그
  const [isResizing, setIsResizing] = useState(false);

  // CSS 전역 변수(--vital-sidebar-width)에 패널 너비를 실시간 동기화하여 지도 위젯 위치 자동 연동
  useEffect(() => {
    if (typeof document !== "undefined") {
      const effectiveWidth = isCollapsed ? 0 : panelWidth;
      document.documentElement.style.setProperty(
        "--vital-sidebar-width",
        `${effectiveWidth}px`
      );
    }
  }, [panelWidth, isCollapsed]);

  // 설정 모달 등에서 'UI 기본값 초기화' 이벤트 발생 시 사이드바 크기 원복
  useEffect(() => {
    const handleResetUI = () => {
      setPanelWidth(380);
      setPanelHeight(null);
      setIsCollapsed(false);
      localStorage.removeItem("vital_panel_width");
      localStorage.removeItem("vital_panel_height");
      document.documentElement.style.setProperty("--vital-sidebar-width", "380px");
    };
    window.addEventListener("vital-reset-ui", handleResetUI);
    return () => window.removeEventListener("vital-reset-ui", handleResetUI);
  }, []);

  // 사이드바 테두리 드래그 시 3방향(가로, 세로, 대각선) 리사이즈 시작 핸들러
  const handleStartResize = (direction: "horizontal" | "vertical" | "both") => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = panelWidth;
    const startH = panelHeight ?? (window.innerHeight - 24);

    // 마우스 이동 시 실시간 크기 계산 및 적용
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (direction === "horizontal" || direction === "both") {
        // 지도 우측 조작 영역(최소 450px) 보장
        const maxW = Math.max(Math.min(window.innerWidth - 450, 750), 380);
        const nextW = Math.min(Math.max(startW + (moveEvent.clientX - startX), 280), maxW);
        setPanelWidth(nextW);
        localStorage.setItem("vital_panel_width", String(nextW));
        document.documentElement.style.setProperty("--vital-sidebar-width", `${nextW}px`);
      }
      if (direction === "vertical" || direction === "both") {
        const maxH = window.innerHeight - 24;
        const nextH = Math.min(Math.max(startH + (moveEvent.clientY - startY), 360), maxH);
        setPanelHeight(nextH);
        localStorage.setItem("vital_panel_height", String(nextH));
      }
    };

    // 마우스 버튼 뗐을 때 리사이즈 이벤트 제거
    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // 특정 코스의 식단 영양소 카드 펼치기/접기 토글
  const toggleNutritionExpand = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNutritionCourseIds((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  // 웰니스 전역 스토어 상태 및 조작 함수들을 얕은 비교로 안전하게 구독
  const {
    profile,
    filteredCourses,
    activeCourseId,
    setActiveCourseId,
    setHoveredCourseId,
    multiDayCourses,
    activeMultiDayCourseId,
    setActiveMultiDayCourseId,
    stays,
    activeStayId,
    setActiveStayId,
    stayFilter,
    toggleStayFilter,
    quests,
    activeQuestId,
    setActiveQuestId,
    earnedTitles,
    equippedTitle,
    equipTitle,
    startWalkSession,
    toggleCondition,
    userLocation,
    setIsLocationModalOpen,
    setIsPinningHome,
    courseMode,
    setCourseMode,
    openSettingsModal,
    themeMode,
    currentRegionName,
    isRegionLoading,
  } = useWellnessStore(
    useShallow((s) => ({
      profile: s.profile, // 건강 프로필 데이터
      filteredCourses: s.filteredCourses, // 질환 맞춤 필터링된 코스 목록
      activeCourseId: s.activeCourseId, // 선택된 코스 고유 ID
      setActiveCourseId: s.setActiveCourseId, // 코스 선택 변경 함수
      setHoveredCourseId: s.setHoveredCourseId, // 마우스 호버 코스 ID 설정
      multiDayCourses: s.multiDayCourses, // 1박 2일 코스 목록
      activeMultiDayCourseId: s.activeMultiDayCourseId, // 선택된 장기 코스 ID
      setActiveMultiDayCourseId: s.setActiveMultiDayCourseId, // 장기 코스 선택 함수
      stays: s.stays, // 안심 숙소 목록
      activeStayId: s.activeStayId, // 선택된 숙소 ID
      setActiveStayId: s.setActiveStayId, // 숙소 선택 함수
      stayFilter: s.stayFilter, // 취사/냉장고/피트니스 편의시설 필터
      toggleStayFilter: s.toggleStayFilter, // 편의시설 필터 토글 함수
      quests: s.quests, // 웰니스 퀘스트 목록
      activeQuestId: s.activeQuestId, // 선택된 퀘스트 ID
      setActiveQuestId: s.setActiveQuestId, // 퀘스트 선택 함수
      earnedTitles: s.earnedTitles, // 획득한 칭호 리스트
      equippedTitle: s.equippedTitle, // 현재 장착 중인 칭호
      equipTitle: s.equipTitle, // 칭호 장착 함수
      startWalkSession: s.startWalkSession, // 실시간 완보 걷기 세션 시작
      toggleCondition: s.toggleCondition, // 질환 선택 토글 함수
      userLocation: s.userLocation, // 사용자 위치 좌표
      setIsLocationModalOpen: s.setIsLocationModalOpen, // 위치 모달 표시 여부
      setIsPinningHome: s.setIsPinningHome, // 출발지 핀 찍기 활성화
      courseMode: s.courseMode, // 지역 기반 vs 테마 기반 추천 모드
      setCourseMode: s.setCourseMode, // 추천 모드 변경 함수
      openSettingsModal: s.openSettingsModal, // 환경설정 모달 열기 함수
      themeMode: s.themeMode, // 라이트/다크 테마
      currentRegionName: s.currentRegionName, // 현재 선택된 행정구역 이름
      isRegionLoading: s.isRegionLoading, // 지역 데이터 로딩 중 여부
    }))
  );

  // 진행 중인 퀘스트 세션 ID (타이머 틱으로 인한 리렌더링을 방지하기 위해 원시값으로만 별도 구독)
  const activeQuestSessionId = useWellnessStore((s) => s.activeWalkSession?.questId ?? null);

  // 라이트 테마 플래그
  const isLight = themeMode === "light";

  // 지도 이동 액션 함수
  const { flyToPlace } = useMapStore();
  // 추천 모드 전환 시 부드러운 페이드 효과를 위한 상태
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 지역 중심 추천 ↔ 전국 테마 추천 간 모드 변경 핸들러
  const handleModeChange = (mode: "local" | "theme") => {
    if (courseMode === mode) return;
    setIsTransitioning(true);
    setCourseMode(mode);
    setTimeout(() => {
      const currentFiltered = useWellnessStore.getState().filteredCourses;
      const first = currentFiltered[0];
      if (first) {
        flyToPlace(first.restaurant.longitude, first.restaurant.latitude, 14);
      }
      setTimeout(() => {
        setIsTransitioning(false);
      }, 200);
    }, 150);
  };

  // 거리 단위 변환 유틸 함수 (미터 ➔ km 표기)
  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${meters}m`;
  };

  // 코스 카드 클릭 시 선택 처리 핸들러
  const handleSelectCourse = (courseId: string) => {
    setActiveCourseId(courseId);
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsMobileExpanded(false); // 모바일에서는 선택 시 지도를 볼 수 있게 바텀시트 축소
    }
  };

  // 장기(1박 2일) 코스 선택 시 해당 숙소로 지도 비행 이동
  const handleSelectMultiDayCourse = (courseId: string) => {
    setActiveMultiDayCourseId(courseId);
    const target = multiDayCourses.find((c) => c.id === courseId);
    if (target) {
      flyToPlace(target.stay.longitude, target.stay.latitude, 15);
    }
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsMobileExpanded(false);
    }
  };

  // 안심 숙소 카드 클릭 시 해당 숙소 좌표로 지도 이동
  const handleSelectStay = (stayId: string) => {
    setActiveStayId(stayId);
    const target = stays.find((s) => s.id === stayId);
    if (target) {
      flyToPlace(target.longitude, target.latitude, 15);
    }
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsMobileExpanded(false);
    }
  };

  // 퀘스트 카드 클릭 시 해당 목적지로 지도 이동
  const handleSelectQuest = (questId: string) => {
    setActiveQuestId(questId);
    const target = quests.find((q) => q.id === questId);
    if (target) {
      flyToPlace(target.longitude, target.latitude, 15);
    }
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsMobileExpanded(false);
    }
  };

  // 편의시설 체크박스(취사, 냉장고, 피트니스) 조건에 맞춘 숙소 목록 필터링
  const filteredStays = stays.filter((stay) => {
    if (stayFilter.chkcooking && !stay.chkcooking) return false;
    if (stayFilter.roomrefrigerator && !stay.roomrefrigerator) return false;
    if (stayFilter.fitness && !stay.fitness) return false;
    return true;
  });

  // 사이드바가 완전히 접혀 있는 상태일 때의 미니 토글 버튼 렌더링
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className={`hidden sm:flex fixed sm:absolute z-40 sm:z-20 sm:top-3 sm:left-3 items-center gap-2 px-3.5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md font-bold text-xs transition-all active:scale-95 border ${
          isLight
            ? "bg-white/95 text-emerald-700 hover:text-emerald-800 border-emerald-500/40 shadow-slate-300/50"
            : "bg-gray-900/95 text-emerald-400 hover:text-emerald-300 border-emerald-500/50 shadow-black/80"
        }`}
        title="VitalRoot 사이드바 펼치기"
      >
        <span className="text-base">🌿</span>
        <span>패널 열기</span>
        <span className="text-[11px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-400 font-bold">▶</span>
      </button>
    );
  }

  // 기본 제어 패널 UI 렌더링
  return (
    <div
      style={{
        width: typeof window !== "undefined" && window.innerWidth >= 640 ? `${panelWidth}px` : undefined,
        height: typeof window !== "undefined" && window.innerWidth >= 640 && panelHeight ? `${panelHeight}px` : undefined,
        transition: isResizing ? "none" : undefined,
      }}
      className={`fixed sm:absolute z-40 sm:z-20 transition-all duration-300 ease-in-out flex flex-col backdrop-blur-md shadow-2xl
        bottom-0 left-0 right-0 rounded-t-3xl sm:rounded-2xl
        sm:top-3 sm:left-3 sm:right-auto sm:bottom-auto sm:max-h-[calc(100vh-1.5rem)]
        ${
          isLight
            ? "bg-white/98 border border-slate-200 text-slate-900"
            : "bg-gray-900/95 sm:bg-gray-900/90 border border-gray-700/60 text-white"
        }
        ${isMobileExpanded ? "h-[85vh] sm:h-auto" : "h-14 sm:h-auto"}
      `}
    >
      {/* 모바일 접힘 상태 퀵 바 (모바일에서 축소 시 한 줄 바로 노출) */}
      {!isMobileExpanded && (
        <div
          onClick={() => setIsMobileExpanded(true)}
          className="sm:hidden flex items-center justify-between px-4 h-14 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🌿</span>
            <span className="font-bold text-sm bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              VitalRoot
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium">
              추천 {filteredCourses.length}개
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/70 px-3 py-1.5 rounded-xl border border-emerald-500/40">
            <span>메뉴·필터 보기</span>
            <span>▲</span>
          </div>
        </div>
      )}

      {/* 내부 콘텐츠 컨테이너 (모바일 펼침 시 또는 데스크톱에서 항시 노출) */}
      <div
        className={
          !isMobileExpanded
            ? "hidden sm:flex flex-col flex-1 overflow-hidden"
            : "flex flex-col flex-1 overflow-hidden"
        }
      >
        {/* 모바일 상단 드래그 인디케이터 핸들 및 닫기 버튼 */}
        <div className="sm:hidden relative flex items-center justify-center pt-2.5 pb-2 border-b border-gray-800 bg-gray-950/60">
          <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
          <button
            onClick={() => setIsMobileExpanded(false)}
            className="absolute right-3 top-2 text-[11px] text-gray-300 hover:text-white px-2.5 py-1 rounded-lg bg-gray-800/80 border border-gray-700 font-medium"
          >
            ▼ 지도 보기
          </button>
        </div>

        {/* 패널 상단 브랜드 헤더 */}
        <div
          className={`p-3.5 sm:p-4 border-b ${
            isLight
              ? "bg-gradient-to-r from-emerald-50 to-teal-50/40 border-slate-200"
              : "border-gray-800 bg-gradient-to-r from-emerald-900/40 to-teal-900/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌿</span>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
                VitalRoot
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              {/* 데스크톱 사이드바 접기 버튼 */}
              <button
                onClick={() => setIsCollapsed(true)}
                className={`hidden sm:flex items-center justify-center w-7 h-7 rounded-lg border text-xs transition-colors shadow-sm ${
                  isLight
                    ? "bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                    : "bg-gray-800/90 hover:bg-gray-700 border-gray-700 text-gray-400 hover:text-white"
                }`}
                title="사이드바 접기 (지도 넓게 보기)"
              >
                ◀
              </button>
              {/* 환경 설정 모달 열기 버튼 */}
              <button
                onClick={() => openSettingsModal("health")}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors shadow-sm ${
                  isLight
                    ? "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 font-bold"
                    : "bg-gray-800/90 hover:bg-gray-700 border-gray-700 text-gray-200 hover:text-white"
                }`}
                title="통합 환경 설정 및 건강 프로필 관리"
              >
                <span>⚙️</span>
                <span>설정</span>
              </button>
              {/* 네이버 지도 연동 뱃지 */}
              <span
                className={`text-xs px-2.5 py-1 rounded-full border font-bold ${
                  isLight
                    ? "bg-emerald-100/80 border-emerald-300 text-emerald-800"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                }`}
              >
                네이버 지도 연동
              </span>
            </div>
          </div>
          {/* 서비스 한 줄 설명 문구 */}
          <p
            className={`text-xs mt-1 ${
              isLight ? "text-slate-500 font-medium" : "text-gray-400"
            }`}
          >
            만성질환 맞춤 안심식당 + 힐링 산책로 + 안심 숙소 & 퀘스트
          </p>
        </div>

        {/* 5개 메인 탭 전환 네비게이션 바 */}
        <div
          className={`grid grid-cols-5 border-b text-[11px] sm:text-xs font-semibold ${
            isLight
              ? "bg-slate-100/90 border-slate-200"
              : "bg-gray-950/80 border-gray-800"
          }`}
        >
          {/* 1. 추천 코스 탭 */}
          <button
            onClick={() => setActiveTab("courses")}
            className={`py-2.5 transition-colors text-center ${
              activeTab === "courses"
                ? isLight
                  ? "text-emerald-700 border-b-2 border-emerald-600 bg-white font-bold shadow-sm"
                  : "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/30 font-semibold"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            추천 코스
          </button>
          {/* 2. 장기 코스 탭 */}
          <button
            onClick={() => setActiveTab("multiday")}
            className={`py-2.5 transition-colors text-center ${
              activeTab === "multiday"
                ? isLight
                  ? "text-emerald-700 border-b-2 border-emerald-600 bg-white font-bold shadow-sm"
                  : "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/30 font-semibold"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            장기 코스
          </button>
          {/* 3. 안심 숙소 탭 */}
          <button
            onClick={() => setActiveTab("stays")}
            className={`py-2.5 transition-colors text-center ${
              activeTab === "stays"
                ? isLight
                  ? "text-emerald-700 border-b-2 border-emerald-600 bg-white font-bold shadow-sm"
                  : "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/30 font-semibold"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            안심 숙소
          </button>
          {/* 4. 퀘스트 탭 */}
          <button
            onClick={() => setActiveTab("quests")}
            className={`py-2.5 transition-colors text-center ${
              activeTab === "quests"
                ? isLight
                  ? "text-emerald-700 border-b-2 border-emerald-600 bg-white font-bold shadow-sm"
                  : "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/30 font-semibold"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            퀘스트
          </button>
          {/* 5. 조건 필터 탭 */}
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-2.5 transition-colors text-center ${
              activeTab === "profile"
                ? isLight
                  ? "text-emerald-700 border-b-2 border-emerald-600 bg-white font-bold shadow-sm"
                  : "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/30 font-semibold"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            조건 필터
          </button>
        </div>

        {/* 탭 본문 스크롤 영역 */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-sm custom-scrollbar">
          {/* 식약처 DUR 복약 안전 주의보 상시 노출 요약 카드 (TC-07) */}
          <DurWarningSummaryCard
            medications={profile.medications || []}
            isLight={isLight}
            onOpenSettingsModal={openSettingsModal}
          />

          {/* TAB 1: 추천 코스 본문 */}
          {activeTab === "courses" && (
            <CourseTab
              courseMode={courseMode}
              onModeChange={handleModeChange}
              filteredCourses={filteredCourses}
              activeCourseId={activeCourseId}
              userLocation={userLocation}
              isTransitioning={isTransitioning}
              isLight={isLight}
              formatDistance={formatDistance}
              onSelectCourse={handleSelectCourse}
              onHoverCourse={setHoveredCourseId}
              onOpenProfileTab={() => setActiveTab("profile")}
              expandedNutritionCourseIds={expandedNutritionCourseIds}
              onToggleNutritionExpand={toggleNutritionExpand}
              onFlyToPlace={flyToPlace}
              onSetIsPinningHome={setIsPinningHome}
              onSetIsLocationModalOpen={setIsLocationModalOpen}
            />
          )}

          {/* TAB 2: 장기 코스 본문 (1박 2일) */}
          {activeTab === "multiday" && (
            <MultiDayTab
              multiDayCourses={multiDayCourses}
              activeMultiDayCourseId={activeMultiDayCourseId}
              onSelectMultiDayCourse={handleSelectMultiDayCourse}
              isLight={isLight}
            />
          )}

          {/* TAB 3: 안심 숙소 본문 (취사, 냉장고, 피트니스 필터 지원) */}
          {activeTab === "stays" && (
            <StayTab
              filteredStays={filteredStays}
              activeStayId={activeStayId}
              stayFilter={stayFilter}
              onToggleStayFilter={toggleStayFilter}
              onSelectStay={handleSelectStay}
              isLight={isLight}
            />
          )}

          {/* TAB 4: 웰니스 퀘스트 & 칭호 리워드 본문 */}
          {activeTab === "quests" && (
            <QuestTab
              quests={quests}
              activeQuestId={activeQuestId}
              activeQuestSessionId={activeQuestSessionId}
              earnedTitles={earnedTitles}
              equippedTitle={equippedTitle}
              currentRegionName={currentRegionName}
              isRegionLoading={isRegionLoading}
              onSelectQuest={handleSelectQuest}
              onStartWalkSession={startWalkSession}
              onEquipTitle={equipTitle}
            />
          )}

          {/* TAB 5: 조건 필터링 본문 (저혈압, 고혈압, 당뇨 등) */}
          {activeTab === "profile" && (
            <ConditionFilterTab
              profile={profile}
              allConditions={ALL_CONDITIONS}
              onToggleCondition={toggleCondition}
              onOpenSettingsModal={openSettingsModal}
              isLight={isLight}
            />
          )}
        </div>

        {/* 패널 최하단 공공데이터 API 연동 상태 바 */}
        <div
          className={`p-3 border-t text-[11px] flex items-center justify-between ${
            isLight
              ? "bg-slate-100/90 border-slate-200 text-slate-600 font-semibold"
              : "border-gray-800/80 bg-gray-950/70 text-gray-400"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={isLight ? "text-slate-800 font-bold" : ""}>NAVER Maps API v3 연동 완료</span>
          </div>
          <span className={isLight ? "text-slate-500 font-medium" : "text-gray-500"}>한국관광공사 Tour API</span>
        </div>
      </div>

      {/* 데스크톱 3방향 자유 리사이즈 핸들 (너비 조절, 높이 조절, 대각선 조절) */}
      <div className="hidden sm:block select-none pointer-events-auto">
        {/* 1. 우측 세로 테두리 핸들 (가로 폭 조절) */}
        <div
          onMouseDown={handleStartResize("horizontal")}
          className="absolute top-0 right-0 w-2.5 h-full cursor-ew-resize hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors z-50 group"
          title="마우스로 좌우 드래그하여 패널 너비 조절"
        >
          <div className="absolute top-1/2 -translate-y-1/2 right-0.5 w-1 h-12 rounded-full bg-gray-500/30 group-hover:bg-emerald-400 group-active:bg-emerald-400 transition-colors" />
        </div>

        {/* 2. 하단 가로 테두리 핸들 (세로 높이 조절) */}
        <div
          onMouseDown={handleStartResize("vertical")}
          className="absolute bottom-0 left-0 h-2.5 w-full cursor-ns-resize hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors z-50 group"
          title="마우스로 상하 드래그하여 패널 높이 조절"
        >
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0.5 h-1 w-12 rounded-full bg-gray-500/30 group-hover:bg-emerald-400 group-active:bg-emerald-400 transition-colors" />
        </div>

        {/* 3. 우측 하단 대각선 코너 핸들 (가로+세로 동시 조절) */}
        <div
          onMouseDown={handleStartResize("both")}
          className="absolute bottom-0.5 right-0.5 w-5 h-5 cursor-nwse-resize z-50 flex items-end justify-end p-1 text-gray-400/80 hover:text-emerald-400 active:text-emerald-300 transition-colors"
          title="마우스로 대각선 드래그하여 패널 크기 동시 조절"
        >
          <svg className="w-3.5 h-3.5 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 22h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4h-2v-2h2v2zm8-8h-2v-2h2v2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
