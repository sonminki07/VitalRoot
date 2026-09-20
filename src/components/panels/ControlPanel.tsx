import { useState } from "react";
import { useWellnessStore } from "../../store/wellnessStore";
import { useMapStore } from "../../store/mapStore";
import { ChronicCondition } from "../../types/wellness.types";
import { calculateDistanceMeters } from "../../utils/pedestrianRouter";

const ALL_CONDITIONS: ChronicCondition[] = [
  "당뇨",
  "고혈압",
  "저혈압",
  "이상지질혈증",
  "신장질환",
  "관절/근골격계",
];

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
    completeQuest,
    earnedTitles,
    toggleCondition,
    userLocation,
    setIsLocationModalOpen,
  } = useWellnessStore();

  const { flyToPlace } = useMapStore();

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
        sm:top-4 sm:left-4 sm:right-auto sm:bottom-auto sm:w-96 sm:max-h-[calc(100vh-2rem)]
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
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
              네이버 지도 연동
            </span>
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
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-sm">
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
                  <button
                    onClick={() => setIsLocationModalOpen(true)}
                    className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs rounded-lg transition-all shadow shrink-0 active:scale-95"
                  >
                    위치 연동
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-sky-950/50 border border-sky-500/40 rounded-xl flex items-center justify-between gap-2 shadow-sm text-xs">
                  <div className="flex items-center gap-1.5 text-sky-200">
                    <span className="text-sm animate-pulse">📍</span>
                    <span className="font-semibold text-[11px]">
                      내 위치 기준 가까운 순 정렬 중
                    </span>
                  </div>
                  <button
                    onClick={() => setIsLocationModalOpen(true)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 underline font-medium shrink-0"
                  >
                    위치 재설정
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>내 질환 맞춤 당일 힐링 코스</span>
                <span className="text-emerald-400 font-semibold">
                  {filteredCourses.length}개 세트
                </span>
              </div>

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

                  // 네이버 도보 길찾기 URL:
                  // 1) 내 위치 -> 안심식당
                  const userToRestNaverUrl = userLocation
                    ? `https://map.naver.com/p/directions/${userLocation.longitude},${userLocation.latitude},${encodeURIComponent(
                        "내 위치"
                      )}/${course.restaurant.longitude},${course.restaurant.latitude},${encodeURIComponent(
                        course.restaurant.name
                      )}/-/walk?c=15.00,0,0,0,dh`
                    : null;

                  // 2) 안심식당 -> 산책로
                  const restToTrailNaverUrl = `https://map.naver.com/p/directions/${course.restaurant.longitude},${course.restaurant.latitude},${encodeURIComponent(
                    course.restaurant.name
                  )}/${course.trail.longitude},${course.trail.latitude},${encodeURIComponent(
                    course.trail.name
                  )}/-/walk?c=15.00,0,0,0,dh`;

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
                        <h3 className="font-semibold text-white text-xs leading-snug">
                          {course.title}
                        </h3>
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
                              경로 인근 화장실·쉼터 {course.waypoints.length}곳 (3~5분 레이더)
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-800">
                          <span>
                            보행로 {course.distanceMeters || 720}m • 도보 {course.walkMinutes}분
                          </span>
                          <span className="text-teal-300 font-medium">
                            {course.slopeGrade}
                          </span>
                        </div>
                      </div>

                      {/* 하단 네이버 도보 길찾기 버튼 영역 */}
                      <div className="mt-2.5 flex flex-col gap-1.5 pt-1.5 border-t border-gray-800/80">
                        <div className="flex items-center justify-between gap-1.5">
                          {userToRestNaverUrl ? (
                            <div className="flex flex-wrap items-center gap-1.5 flex-1">
                              <a
                                href={userToRestNaverUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-2.5 py-1.5 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-[10px] sm:text-[11px] rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95"
                              >
                                <span>🟢</span>
                                <span>내 위치 ➔ 식당</span>
                              </a>
                              <a
                                href={restToTrailNaverUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] sm:text-[11px] rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95"
                              >
                                <span>🚶</span>
                                <span>식당 ➔ 산책로</span>
                              </a>
                            </div>
                          ) : (
                            <a
                              href={restToTrailNaverUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-3 py-1.5 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-[11px] rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95"
                            >
                              <span>🟢</span>
                              <span>네이버 도보 길찾기</span>
                            </a>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCourse(course.id);
                            }}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5 shrink-0 ml-auto"
                          >
                            지도 위치 ➔
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
                          href={`https://map.naver.com/p/search/${encodeURIComponent(mc.stay.name)}`}
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
                            href={`https://map.naver.com/p/search/${encodeURIComponent(stay.name)}`}
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
              {/* 내 획득 칭호 보관함 */}
              <div className="p-3 bg-gradient-to-r from-amber-950/40 to-emerald-950/30 border border-amber-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <span>👑</span>
                    <span>내 획득 웰니스 칭호</span>
                  </span>
                  <span className="text-[10px] font-mono text-amber-400">
                    {earnedTitles.length}개 보유
                  </span>
                </div>
                {earnedTitles.length === 0 ? (
                  <p className="text-[11px] text-gray-400">
                    아직 획득한 칭호가 없습니다. 명소 산책 퀘스트를 완보해보세요!
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {earnedTitles.map((title, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-amber-500/20 text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold shadow-sm"
                      >
                        {title}
                      </span>
                    ))}
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
                  return (
                    <div
                      key={q.id}
                      onClick={() => handleSelectQuest(q.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? "bg-purple-950/30 border-purple-500/80 shadow-lg shadow-purple-950/50"
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
                              : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                          }`}
                        >
                          {q.isCompleted ? "완보 완료 ✅" : "도전 가능 🏃"}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        {q.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] p-2 bg-gray-900/60 rounded-lg border border-gray-800">
                        <span className="text-gray-400">목표: 도보 {q.targetDurationMinutes}분 완보</span>
                        <span className="text-amber-300 font-bold">
                          🏅 {q.titleReward}
                        </span>
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectQuest(q.id);
                          }}
                          className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                        >
                          명소 위치 ➔
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            completeQuest(q.id);
                          }}
                          disabled={q.isCompleted}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            q.isCompleted
                              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-purple-600 to-emerald-600 hover:brightness-110 text-white shadow-md active:scale-95"
                          }`}
                        >
                          {q.isCompleted ? "칭호 획득 완료" : "완보 퀘스트 인증 🏅"}
                        </button>
                      </div>
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

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  2. 여행자 건강 프로필
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
                    <span className="text-gray-400">오늘의 컨디션:</span>
                    <span className="text-teal-300 font-medium">
                      {profile.conditionToday}
                    </span>
                  </div>
                </div>
              </div>

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
