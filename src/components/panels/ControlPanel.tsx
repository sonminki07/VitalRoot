import { useState, useEffect } from "react";
import { useWellnessStore } from "../../store/wellnessStore";
import { useMapStore } from "../../store/mapStore";
import { ChronicCondition } from "../../types/wellness.types";
import { calculateDistanceMeters } from "../../utils/pedestrianRouter";
import { getNaverMapDetailUrl } from "../../utils/naverMapUtils";

const ALL_CONDITIONS: ChronicCondition[] = [
  "당뇨",
  "고혈압",
  "저혈압",
  "이상지질혈증",
  "신장질환",
  "관절/근골격계",
];

function formatTimerSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function ControlPanel() {
  const [activeTab, setActiveTab] = useState<
    "courses" | "multiday" | "stays" | "quests" | "profile"
  >("courses");
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // 스토어 구독
  const {
    profile,
    courses,
    filteredCourses,
    activeCourseId,
    setActiveCourseId,
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
    activeWalkSession,
    startWalkSession,
    updateWalkSessionTick,
    cancelWalkSession,
    claimQuestTitle,
    fastForwardWalkSession,
    toggleCondition,
    userLocation,
    setIsLocationModalOpen,
    setIsPinningHome,
    courseMode,
    setCourseMode,
    openSettingsModal,
  } = useWellnessStore();

  // 완보 세션 실시간 타이머 틱
  useEffect(() => {
    if (!activeWalkSession) return;
    const interval = setInterval(() => {
      updateWalkSessionTick();
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWalkSession, updateWalkSessionTick]);

  const { flyToPlace } = useMapStore();
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${meters}m`;
  };

  // 코스 선택 핸들러
  const handleSelectCourse = (courseId: string) => {
    setActiveCourseId(courseId);
    const target = courses.find((c) => c.id === courseId);
    if (target) {
      flyToPlace(target.restaurant.longitude, target.restaurant.latitude, 15);
    }
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsMobileExpanded(false);
    }
  };

  // 장기 코스 선택 핸들러
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

  // 안심 숙소 선택 핸들러
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

  // 퀘스트 선택 핸들러
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

  // 필터링된 숙소 리스트
  const filteredStays = stays.filter((stay) => {
    if (stayFilter.chkcooking && !stay.chkcooking) return false;
    if (stayFilter.roomrefrigerator && !stay.roomrefrigerator) return false;
    if (stayFilter.fitness && !stay.fitness) return false;
    return true;
  });

  return (
    <div
      className={`fixed sm:absolute z-40 sm:z-20 transition-all duration-300 ease-in-out flex flex-col bg-gray-900/95 sm:bg-gray-900/90 backdrop-blur-md border border-gray-700/60 shadow-2xl text-white overflow-hidden
        bottom-0 left-0 right-0 rounded-t-3xl sm:rounded-2xl
        sm:top-3 sm:left-3 sm:right-auto sm:bottom-auto sm:w-[350px] lg:w-96 sm:max-h-[calc(100vh-1.5rem)]
        ${isMobileExpanded ? "h-[85vh] sm:h-auto" : "h-14 sm:h-auto"}
      `}
    >
      {/* 모바일 접힘 상태 퀵 바 (sm:hidden) */}
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

      {/* 내부 콘텐츠 (모바일 펼침 시 또는 데스크톱에서 항상 표시) */}
      <div
        className={
          !isMobileExpanded
            ? "hidden sm:flex flex-col flex-1 overflow-hidden"
            : "flex flex-col flex-1 overflow-hidden"
        }
      >
        {/* 모바일 상단 드래그 핸들 및 닫기 버튼 */}
        <div className="sm:hidden relative flex items-center justify-center pt-2.5 pb-2 border-b border-gray-800 bg-gray-950/60">
          <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
          <button
            onClick={() => setIsMobileExpanded(false)}
            className="absolute right-3 top-2 text-[11px] text-gray-300 hover:text-white px-2.5 py-1 rounded-lg bg-gray-800/80 border border-gray-700 font-medium"
          >
            ▼ 지도 보기
          </button>
        </div>

        {/* 상단 헤더 */}
        <div className="p-3.5 sm:p-4 border-b border-gray-800 bg-gradient-to-r from-emerald-900/40 to-teal-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌿</span>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                VitalRoot
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => openSettingsModal("health")}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-gray-800/90 hover:bg-gray-700 border border-gray-700 text-gray-200 hover:text-white transition-colors shadow-sm"
                title="통합 환경 설정 및 건강 프로필 관리"
              >
                <span>⚙️</span>
                <span>설정</span>
              </button>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                네이버 지도 연동
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            만성질환 맞춤 안심식당 + 힐링 산책로 + 안심 숙소 & 퀘스트
          </p>
        </div>

        {/* 5개 탭 네비게이션 */}
        <div className="grid grid-cols-5 border-b border-gray-800 text-[10px] sm:text-[11px] font-medium bg-gray-950/60">
          <button
            onClick={() => setActiveTab("courses")}
            className={`py-2.5 transition-colors text-center ${
              activeTab === "courses"
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/30 font-semibold"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            추천 코스
          </button>
          <button
            onClick={() => setActiveTab("multiday")}
            className={`py-2.5 transition-colors text-center ${
              activeTab === "multiday"
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/30 font-semibold"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            장기 코스
          </button>
          <button
            onClick={() => setActiveTab("stays")}
            className={`py-2.5 transition-colors text-center ${
              activeTab === "stays"
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/30 font-semibold"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            안심 숙소
          </button>
          <button
            onClick={() => setActiveTab("quests")}
            className={`py-2.5 transition-colors text-center ${
              activeTab === "quests"
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/30 font-semibold"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            퀘스트
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-2.5 transition-colors text-center ${
              activeTab === "profile"
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/30 font-semibold"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            조건 필터
          </button>
        </div>

        {/* 탭 본문 영역 (스크롤 지원) */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-sm custom-scrollbar">
          {/* TAB 1: 추천 코스 */}
          {activeTab === "courses" && (
            <div className="space-y-3">
              {/* 내 위치 연동 상태 배너 */}
              {!userLocation ? (
                <div className="p-3 bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📍</span>
                    <div className="text-xs">
                      <p className="font-bold text-white">
                        내 위치 기반 코스 탐색
                      </p>
                      <p className="text-[11px] text-emerald-300">
                        가까운 안심식당과 산책로를 자동 정렬합니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setIsPinningHome(true)}
                      className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-[11px] rounded-lg transition-all shadow shrink-0 active:scale-95"
                      title="지도 화면을 직접 클릭하여 집 위치를 지정합니다."
                    >
                      🎯 집 찍기
                    </button>
                    <button
                      onClick={() => setIsLocationModalOpen(true)}
                      className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-[11px] rounded-lg transition-all shadow shrink-0 active:scale-95"
                    >
                      위치 연동
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-sky-950/50 border border-sky-500/40 rounded-xl flex items-center justify-between gap-2 shadow-sm text-xs">
                  <div className="flex items-center gap-1.5 text-sky-200">
                    <span className="text-sm animate-pulse">📍</span>
                    <span className="font-semibold text-[11px]">
                      내 위치 기준 가까운 순 정렬 중
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setIsPinningHome(true)}
                      className="text-[10px] text-amber-300 hover:text-amber-200 font-bold px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-500/40 shrink-0"
                    >
                      🎯 집 핀 찍기
                    </button>
                    <button
                      onClick={() => setIsLocationModalOpen(true)}
                      className="text-[11px] text-sky-400 hover:text-sky-300 underline font-medium shrink-0"
                    >
                      동네 변경
                    </button>
                  </div>
                </div>
              )}

              {/* 생활권 vs 수도권 테마 명소 듀얼 모드 토글 */}
              <div className="bg-gray-950/80 p-1 rounded-xl border border-gray-800 flex gap-1 shadow-inner">
                <button
                  onClick={() => handleModeChange("local")}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    courseMode === "local"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-950 shadow-md font-bold"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-900/50"
                  }`}
                >
                  <span className="text-sm">🏡</span>
                  <div className="flex flex-col items-start leading-tight">
                    <span>내 동네 힐링</span>
                    <span
                      className={`text-[9px] ${
                        courseMode === "local"
                          ? "text-emerald-950 font-bold"
                          : "text-gray-500"
                      }`}
                    >
                      내 위치 거리순 (전국)
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => handleModeChange("theme")}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    courseMode === "theme"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-950 shadow-md font-bold"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-900/50"
                  }`}
                >
                  <span className="text-sm">🏛️</span>
                  <div className="flex flex-col items-start leading-tight">
                    <span>테마 명소 여행</span>
                    <span
                      className={`text-[9px] ${
                        courseMode === "theme"
                          ? "text-emerald-950 font-bold"
                          : "text-gray-500"
                      }`}
                    >
                      전국 대표 명소
                    </span>
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {courseMode === "local"
                    ? "🏡 내 주변 생활권 맞춤 코스 (거리순)"
                    : "🏛️ 전국 테마 웰니스 명소 코스"}
                </span>
                <span className="text-emerald-400 font-semibold">
                  총 {filteredCourses.length}개 코스
                </span>
              </div>

              {isTransitioning && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-2 text-xs text-emerald-300 animate-pulse">
                  <span className="animate-spin">🌀</span>
                  <span>맞춤 웰니스 코스를 새롭게 정렬하고 있습니다...</span>
                </div>
              )}

              {filteredCourses.length === 0 ? (
                <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 text-center text-xs text-gray-400 space-y-2">
                  <p className="text-gray-300 font-semibold">
                    🔍 조건에 맞는 추천 코스가 없습니다.
                  </p>
                  <p className="text-[11px]">기저질환 필터를 조정해보세요.</p>
                  <button
                    onClick={() => setActiveTab("profile")}
                    className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                  >
                    조건 필터 변경하기
                  </button>
                </div>
              ) : (
                filteredCourses.map((course) => {
                  const isActive = course.id === activeCourseId;
                  const distFromUser = userLocation
                    ? calculateDistanceMeters(
                        userLocation.latitude,
                        userLocation.longitude,
                        course.restaurant.latitude,
                        course.restaurant.longitude
                      )
                    : null;
                  const isTransitRecommended = distFromUser !== null && distFromUser > 400; // 도보 5분(400m) 초과 시 대중교통 추천

                  // 네이버 도보/대중교통 길찾기 URL (네이버 지도 100% 지원 2개 지점 순수 도보/대중교통 URL)
                  // 1) 식당 ➔ 산책로 (추천 웰니스 코스 도보 길찾기)
                  const restToTrailNaverUrl = `https://map.naver.com/p/directions/${course.restaurant.longitude},${course.restaurant.latitude},${encodeURIComponent(
                    course.restaurant.name
                  )}/${course.trail.longitude},${course.trail.latitude},${encodeURIComponent(
                    course.trail.name
                  )}/-/walk?c=15.00,0,0,0,dh`;

                  // 2) 내 위치 ➔ 식당 도보
                  const userToRestWalkUrl = userLocation
                    ? `https://map.naver.com/p/directions/${userLocation.longitude},${userLocation.latitude},${encodeURIComponent(
                        "내 위치"
                      )}/${course.restaurant.longitude},${course.restaurant.latitude},${encodeURIComponent(
                        course.restaurant.name
                      )}/-/walk?c=15.00,0,0,0,dh`
                    : null;

                  // 3) 내 위치 ➔ 식당 대중교통
                  const userToRestTransitUrl = userLocation && isTransitRecommended
                    ? `https://map.naver.com/p/directions/${userLocation.longitude},${userLocation.latitude},${encodeURIComponent(
                        "내 위치"
                      )}/${course.restaurant.longitude},${course.restaurant.latitude},${encodeURIComponent(
                        course.restaurant.name
                      )}/-/transit?c=15.00,0,0,0,dh`
                    : null;

                  // 4) 내 위치 ➔ 산책로 직통 도보
                  const userToTrailWalkUrl = userLocation
                    ? `https://map.naver.com/p/directions/${userLocation.longitude},${userLocation.latitude},${encodeURIComponent(
                        "내 위치"
                      )}/${course.trail.longitude},${course.trail.latitude},${encodeURIComponent(
                        course.trail.name
                      )}/-/walk?c=15.00,0,0,0,dh`
                    : null;

                  return (
                    <div
                      key={course.id}
                      onClick={() => handleSelectCourse(course.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? "bg-emerald-950/30 border-emerald-500/70 shadow-lg shadow-emerald-950/50"
                          : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/80"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            {course.region && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-semibold px-2 py-0.5 rounded-md border border-emerald-500/20">
                                📍 {course.region}
                              </span>
                            )}
                            {course.isLocal && (
                              <span className="text-[10px] bg-teal-500/20 text-teal-300 font-semibold px-1.5 py-0.5 rounded-md border border-teal-500/30">
                                생활권
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-white text-xs leading-snug">
                            {course.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[11px] text-emerald-400 font-medium">
                          🎯 {course.targetCondition}
                        </span>
                        {distFromUser !== null && (
                          <span className="text-[10px] text-sky-300 font-semibold bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-500/30">
                            📍 내 위치에서 {formatDistance(distFromUser)}
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 space-y-1.5 bg-gray-900/60 p-2.5 rounded-lg text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">🍽️ 안심식당:</span>
                          <span className="text-gray-200 font-medium">
                            {course.restaurant.name}
                          </span>
                        </div>

                        {/* 식약처 영양성분 뱃지 */}
                        {course.restaurant.nutrition && (
                          <div className="p-1.5 bg-emerald-950/40 rounded border border-emerald-500/20 text-[10px] flex items-center justify-between">
                            <span className="text-emerald-300 font-medium truncate">
                              🥗 {course.restaurant.nutrition.menuName}
                            </span>
                            <span className="text-emerald-400 font-mono shrink-0 ml-1">
                              당 {course.restaurant.nutrition.sugars}g 🟢 • 나트륨{" "}
                              {course.restaurant.nutrition.sodium}mg 🟢
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">🚶 힐링산책:</span>
                          <span className="text-gray-200 font-medium">
                            {course.trail.name}
                          </span>
                        </div>

                        {/* 경로 3~5분 공공 편의시설 보유 안내 */}
                        {course.waypoints && (
                          <div className="text-[10px] text-sky-400 flex items-center gap-1">
                            <span>🧭</span>
                            <span>
                              경로 3~5분 안심 편의시설:{" "}
                              <strong>{course.waypoints.length}곳</strong> 레이더 안내
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-gray-800 text-[11px]">
                          <span className="text-gray-400">
                            총 거리: <strong>{course.distanceMeters}m</strong> (약{" "}
                            {course.walkMinutes}분)
                          </span>
                          <span className="text-teal-300 font-medium">
                            {course.slopeGrade}
                          </span>
                        </div>
                      </div>

                      {/* 하단 네이버 길찾기 정돈 버튼 그리드 */}
                      <div className="mt-2.5 pt-2 border-t border-gray-800/80 space-y-1.5">
                        {/* 1. 최우선 핵심 버튼: 식당 ➔ 산책로 도보 길찾기 (네이버 도보 100% 직행) */}
                        <a
                          href={restToTrailNaverUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-full py-2 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-emerald-400/40"
                          title="네이버 지도 도보 길찾기 (식당 ➔ 산책로 힐링 코스)"
                        >
                          <span className="text-sm">🟢</span>
                          <span>식당 ➔ 산책로 도보 길찾기</span>
                        </a>

                        {/* 2. 세부 구간 이동 버튼 (2열 그리드) */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {/* 식당까지 대중교통 또는 도보 */}
                          {userLocation && isTransitRecommended && userToRestTransitUrl ? (
                            <a
                              href={userToRestTransitUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-1 active:scale-95"
                              title="네이버 지도 대중교통(버스/지하철) 길찾기"
                            >
                              <span>🚌</span>
                              <span>식당 대중교통</span>
                            </a>
                          ) : userLocation && userToRestWalkUrl ? (
                            <a
                              href={userToRestWalkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="py-1.5 px-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-1 active:scale-95"
                              title="내 위치에서 식당까지 도보 길찾기"
                            >
                              <span>🚶</span>
                              <span>식당 도보</span>
                            </a>
                          ) : null}

                          {/* 내 집 ➔ 산책로 직통 도보 */}
                          {userLocation && userToTrailWalkUrl ? (
                            <a
                              href={userToTrailWalkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="py-1.5 px-2 bg-gray-800 hover:bg-gray-700 text-teal-300 hover:text-white font-bold text-[11px] rounded-lg border border-teal-500/40 transition-all flex items-center justify-center gap-1 active:scale-95"
                              title="내 위치에서 산책로까지 직통 도보 길찾기"
                            >
                              <span>🏁</span>
                              <span className="truncate">산책로 직통</span>
                            </a>
                          ) : null}

                          {/* 지도 포커스 */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCourse(course.id);
                            }}
                            className={`py-1.5 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-[11px] rounded-lg border border-gray-700 transition-all flex items-center justify-center gap-1 active:scale-95 ${
                              !userLocation ? "col-span-2" : ""
                            }`}
                          >
                            <span>🎯</span>
                            <span>지도 위치 ➔</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: 장기 코스 (1박 2일) */}
          {activeTab === "multiday" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>국가 공인 1박 2일 웰니스 코스</span>
                <span className="text-emerald-400 font-semibold">
                  {multiDayCourses.length}개 프로그램
                </span>
              </div>

              {multiDayCourses.map((mc) => {
                const isSelected = mc.id === activeMultiDayCourseId;
                return (
                  <div
                    key={mc.id}
                    onClick={() => handleSelectMultiDayCourse(mc.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-emerald-500/70 bg-emerald-950/30 shadow-lg shadow-emerald-950/50"
                        : "border-emerald-500/30 bg-emerald-950/10 hover:bg-emerald-950/20"
                    } space-y-3`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                          {mc.duration} 프로그램
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {mc.targetCondition}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-white leading-snug">
                        {mc.title}
                      </h3>
                    </div>

                    {/* 연계 안심 숙소 카드 */}
                    <div className="p-3 rounded-xl bg-gray-900/80 border border-teal-500/40 space-y-2">
                      <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
                        <span>🏨</span>
                        <span>연계 안심 숙박 (취사 & 인슐린 보관)</span>
                      </span>
                      <h4 className="font-semibold text-xs text-white">
                        {mc.stay.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        {mc.stay.description}
                      </p>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {mc.stay.safeBadges.map((badge, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-teal-950/60 border border-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[11px]">
                        <span className="text-gray-500">문의: {mc.stay.contact}</span>
                        <a
                          href={getNaverMapDetailUrl(mc.stay)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:underline font-semibold flex items-center gap-0.5"
                        >
                          네이버 검색 ➔
                        </a>
                      </div>
                    </div>

                    {/* 1일차 & 2일차 스텝 타임라인 */}
                    <div className="space-y-2.5 pt-1">
                      <h4 className="text-xs font-bold text-gray-300">
                        일정별 세부 코스 브레이크다운
                      </h4>
                      {mc.days.map((day) => (
                        <div
                          key={day.day}
                          className="bg-gray-900/50 p-2.5 rounded-lg border border-gray-800 space-y-2"
                        >
                          <div className="font-semibold text-xs text-emerald-400 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-emerald-600/40 flex items-center justify-center text-[10px] text-white font-bold">
                              {day.day}
                            </span>
                            <span>{day.title}</span>
                          </div>
                          <div className="space-y-1.5 pl-2 border-l-2 border-emerald-800/50 ml-2">
                            {day.steps.map((step, sIdx) => (
                              <div key={sIdx} className="text-xs">
                                <div className="flex items-center gap-1.5 text-gray-200 font-medium">
                                  <span className="text-[11px] text-gray-400">
                                    [{step.type}]
                                  </span>
                                  <span>{step.name}</span>
                                </div>
                                <p className="text-[10px] text-gray-500 pl-4">
                                  {step.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: 안심 숙소 (취사, 냉장고, 피트니스 필터 지원) */}
          {activeTab === "stays" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  🏨 헬스케어 맞춤 숙소 필터
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => toggleStayFilter("chkcooking")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      stayFilter.chkcooking
                        ? "bg-teal-500/20 border-teal-500 text-teal-300 font-semibold"
                        : "bg-gray-800/60 border-gray-700 text-gray-400"
                    }`}
                  >
                    {stayFilter.chkcooking ? "✓ " : "+ "}🍳 객실 내 취사
                  </button>
                  <button
                    onClick={() => toggleStayFilter("roomrefrigerator")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      stayFilter.roomrefrigerator
                        ? "bg-teal-500/20 border-teal-500 text-teal-300 font-semibold"
                        : "bg-gray-800/60 border-gray-700 text-gray-400"
                    }`}
                  >
                    {stayFilter.roomrefrigerator ? "✓ " : "+ "}❄️ 인슐린 냉장고
                  </button>
                  <button
                    onClick={() => toggleStayFilter("fitness")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      stayFilter.fitness
                        ? "bg-teal-500/20 border-teal-500 text-teal-300 font-semibold"
                        : "bg-gray-800/60 border-gray-700 text-gray-400"
                    }`}
                  >
                    {stayFilter.fitness ? "✓ " : "+ "}🏋️ 피트니스 센터
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>안심 숙박 시설 목록</span>
                  <span className="text-teal-400 font-semibold">
                    {filteredStays.length}곳
                  </span>
                </div>

                {filteredStays.map((stay) => {
                  const isSelected = stay.id === activeStayId;
                  return (
                    <div
                      key={stay.id}
                      onClick={() => handleSelectStay(stay.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? "bg-teal-950/40 border-teal-500/80 shadow-lg shadow-teal-950/50"
                          : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/80"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-bold text-xs text-white">
                          {stay.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-gray-400">{stay.address}</p>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        {stay.description}
                      </p>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {stay.safeBadges.map((b, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-teal-950/70 border border-teal-500/40 text-teal-200 px-1.5 py-0.5 rounded"
                          >
                            {b}
                          </span>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">
                          📞 {stay.contact || "문의 예약 가능"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={getNaverMapDetailUrl(stay)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 bg-[#03C75A] text-white rounded text-[10px] font-bold"
                          >
                            네이버 상세
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectStay(stay.id);
                            }}
                            className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
                          >
                            지도 위치 ➔
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: 웰니스 퀘스트 & 칭호 리워드 */}
          {activeTab === "quests" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* 내 획득 칭호 보관함 및 칭호 장착(Equip) 영역 */}
              <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-emerald-950/30 to-purple-950/30 border border-amber-500/30 rounded-2xl space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>👑</span>
                    <span>내 획득 웰니스 칭호</span>
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {earnedTitles.length}개 보유
                  </span>
                </div>

                {earnedTitles.length === 0 ? (
                  <p className="text-[11px] text-gray-400">
                    아직 획득한 칭호가 없습니다. 명소 산책 퀘스트를 완보해보세요!
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {earnedTitles.map((title, idx) => {
                      const isEquipped = equippedTitle === title;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => equipTitle(title)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-xl font-bold transition-all active:scale-95 border ${
                            isEquipped
                              ? "bg-emerald-600 text-white border-emerald-300 shadow-md ring-2 ring-emerald-400/50 scale-105"
                              : "bg-gray-900/80 hover:bg-gray-800 text-amber-200 border-amber-500/40 hover:border-amber-300"
                          }`}
                          title={isEquipped ? "클릭하여 칭호 장착 해제" : "클릭하여 이 칭호 장착"}
                        >
                          <span>🏅</span>
                          <span>{title}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              isEquipped
                                ? "bg-emerald-950 text-emerald-200"
                                : "bg-gray-800 text-gray-400"
                            }`}
                          >
                            {isEquipped ? "장착 중 ✓" : "장착"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 퀘스트 목록 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>지역 명소 스탬프 & 완보 퀘스트</span>
                  <span className="text-purple-400 font-semibold">
                    {quests.length}개 챌린지
                  </span>
                </div>

                {quests.map((q) => {
                  const isSelected = q.id === activeQuestId;
                  const isCurrentSession = activeWalkSession?.questId === q.id;

                  return (
                    <div
                      key={q.id}
                      onClick={() => handleSelectQuest(q.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? "bg-purple-950/30 border-purple-500/80 shadow-lg shadow-purple-950/50 ring-1 ring-purple-400/30"
                          : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/80"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{q.badgeIcon}</span>
                          <h4 className="font-bold text-xs text-white">
                            {q.landmarkName}
                          </h4>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            q.isCompleted
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : isCurrentSession
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                              : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                          }`}
                        >
                          {q.isCompleted
                            ? "완보 완료 ✅"
                            : isCurrentSession
                            ? "완보 진행 중 🚶"
                            : "도전 가능 🏃"}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        {q.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] p-2 bg-gray-900/60 rounded-xl border border-gray-800">
                        <span className="text-gray-400">
                          목표: 도보 {q.targetDurationMinutes}분 완보
                        </span>
                        <span className="text-amber-300 font-bold">
                          🏅 {q.titleReward}
                        </span>
                      </div>

                      {/* 실시간 진행 중 위젯 */}
                      {isCurrentSession && (
                        <div className="p-2.5 rounded-xl bg-purple-950/50 border border-purple-500/40 space-y-2 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-purple-300 font-bold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                              실시간 완보 시간 측정 중
                            </span>
                            <span className="font-mono font-bold text-amber-300">
                              {formatTimerSeconds(activeWalkSession.elapsedSeconds)} /{" "}
                              {formatTimerSeconds(activeWalkSession.targetSeconds)}
                            </span>
                          </div>

                          {/* 타이머 진행바 */}
                          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 via-teal-400 to-emerald-400 transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (activeWalkSession.elapsedSeconds /
                                    activeWalkSession.targetSeconds) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>

                          {/* GPS 상태 & 시연용 임시 가속 버튼 */}
                          <div className="flex items-center justify-between text-[10px] pt-0.5">
                            <span
                              className={
                                activeWalkSession.isGpsValid
                                  ? "text-emerald-300 font-medium"
                                  : "text-amber-300 font-medium"
                              }
                            >
                              {activeWalkSession.isGpsValid
                                ? `🟢 현장 체류 인증 완료 (${activeWalkSession.distanceMeters}m)`
                                : `⚠️ 현장 500m 이탈 (${activeWalkSession.distanceMeters}m)`}
                            </span>

                            {/* === [DEMO_ACCELERATOR: 시연/심사용 임시 가속 버튼 - 차후 즉시 삭제 가능] === */}
                            {!activeWalkSession.isEligible && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fastForwardWalkSession();
                                }}
                                className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 border border-amber-400/40 font-bold transition-colors"
                                title="심사 및 시연용: 1분 목표 완보 시간을 즉시 충족합니다"
                              >
                                ⚡ 시연용 1분 가속
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 퀘스트 하단 액션 버튼 */}
                      {isCurrentSession ? (
                        activeWalkSession.isEligible ? (
                          <div className="pt-1 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelWalkSession();
                              }}
                              className="text-xs text-gray-400 hover:text-gray-200 px-2"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                claimQuestTitle(q.id);
                              }}
                              className="w-full py-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:brightness-110 text-gray-950 font-black text-xs rounded-xl shadow-xl animate-bounce border-2 border-amber-300 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <span>🏅</span>
                              <span>완보 자격 획득! 칭호 획득하기</span>
                            </button>
                          </div>
                        ) : (
                          <div className="pt-1 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelWalkSession();
                              }}
                              className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded-lg hover:bg-red-500/10"
                            >
                              도전 취소 ✕
                            </button>
                            <span className="text-[11px] text-gray-400 font-medium animate-pulse">
                              목표 시간까지 현장 완보 진행 중...
                            </span>
                          </div>
                        )
                      ) : q.isCompleted ? (
                        <div className="pt-1 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectQuest(q.id);
                            }}
                            className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                          >
                            명소 위치 ➔
                          </button>
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-800 text-emerald-400/80 cursor-default border border-emerald-500/30"
                          >
                            완보 완료 ✅ (칭호 보유)
                          </button>
                        </div>
                      ) : (
                        <div className="pt-1 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectQuest(q.id);
                            }}
                            className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                          >
                            명소 위치 ➔
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startWalkSession(q.id);
                            }}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/50 transition-all active:scale-95 flex items-center gap-1"
                          >
                            <span>⏱️</span>
                            <span>도보 완보 시작 ({q.targetDurationMinutes}분)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: 조건 필터링 (저혈압, 고혈압, 당뇨) */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  1. 기저질환 지표 선택 (다중 선택 가능)
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CONDITIONS.map((cond) => {
                    const selected = profile.chronicConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        onClick={() => toggleCondition(cond)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          selected
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold"
                            : "bg-gray-800/60 border-gray-700 text-gray-400 hover:border-gray-600"
                        }`}
                      >
                        {selected ? "✓ " : "+ "}
                        {cond}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 복용 중인 의약품 및 식약처 DUR 요약 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-300">
                    2. 복용 의약품 & 식약처 DUR 분석
                  </label>
                  <button
                    onClick={() => openSettingsModal("health")}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    + 약물 관리/추가 ➔
                  </button>
                </div>

                {profile.hasNoMedications ? (
                  <div className="p-2.5 bg-gray-900/60 rounded-xl border border-gray-800 text-xs text-gray-400">
                    ✓ 복용 중인 약물이 없습니다 (식단·운동 맞춤 케어)
                  </div>
                ) : (profile.medications && profile.medications.length > 0) ? (
                  <div className="space-y-1.5">
                    {profile.medications.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 bg-gray-900/60 rounded-xl border border-gray-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">• {m.name}</span>
                          <span className="text-[10px] text-gray-400">{m.timing}</span>
                        </div>
                        <p className="text-[11px] text-amber-300">{m.cautionNote}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-950/20 rounded-xl border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
                    <span>⚠️ 등록된 복용 약물이 없습니다.</span>
                    <button
                      onClick={() => openSettingsModal("health")}
                      className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-gray-950 rounded text-[10px] font-bold"
                    >
                      DUR 등록
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  3. 여행자 건강 프로필
                </label>
                <div className="space-y-2 text-xs bg-gray-900/60 p-3 rounded-xl border border-gray-800">
                  <div className="flex justify-between">
                    <span className="text-gray-400">식단 선호:</span>
                    <span className="text-emerald-400 font-medium">
                      {profile.dietaryPreference}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">알레르기 주의:</span>
                    <span className="text-gray-200 font-medium">
                      {profile.allergies.join(", ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">보행 체력 수준:</span>
                    <span className="text-teal-300 font-medium truncate ml-2">
                      {profile.walkFitnessLevel || profile.conditionToday}
                    </span>
                  </div>
                </div>
              </div>

              {/* 설정 열기 버튼 */}
              <button
                onClick={() => openSettingsModal("health")}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl text-xs font-bold border border-gray-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>⚙️</span>
                <span>상세 건강 프로필 & DUR 의약품 설정 열기</span>
              </button>

              {/* 기저질환별 스마트 알고리즘 가이드 안내 */}
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs space-y-1.5 text-emerald-300/90 leading-relaxed">
                <p className="font-bold text-emerald-300">💡 스마트 질환 맞춤 알고리즘</p>
                <p>• <strong>저혈압 환자</strong>: 식후 혈압 급강하 방지를 위해 밥집 바로 근처 평지 산책로 우선 추천</p>
                <p>• <strong>고혈압 환자</strong>: 보행 부담을 덜기 위해 중간 안심 쉼터/화장실 다수 보유 완만 단축 코스 추천</p>
                <p>• <strong>당뇨 환자</strong>: 식약처 저GI·저당 안심식단과 식후 혈당 강하 숲길 완보 코스 추천</p>
              </div>
            </div>
          )}
        </div>

        {/* 하단 네이버 지도 연동 상태 */}
        <div className="p-3 border-t border-gray-800/80 bg-gray-950/70 text-[11px] flex items-center justify-between text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>NAVER Maps API v3 연동 완료</span>
          </div>
          <span className="text-gray-500">한국관광공사 Tour API</span>
        </div>
      </div>
    </div>
  );
}
