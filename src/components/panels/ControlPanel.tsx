import { useState } from "react";
import { useWellnessStore } from "../../store/wellnessStore";
import { useCircleStore } from "../../store/circleStore";
import { useMapStore } from "../../store/mapStore";
import { ChronicCondition } from "../../types/wellness.types";

const ALL_CONDITIONS: ChronicCondition[] = [
  "당뇨",
  "고혈압",
  "이상지질혈증",
  "신장질환",
  "관절/근골격계",
];

export function ControlPanel() {
  const [activeTab, setActiveTab] = useState<"courses" | "multiday" | "profile" | "map">("courses");
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
    toggleCondition,
    isSupabaseConnected,
  } = useWellnessStore();

  const {
    radiusKm,
    setRadiusKm,
    color,
    setColor,
    fillOpacity,
    setFillOpacity,
    showDistanceLabels,
    toggleDistanceLabels,
    showAngleLabels,
    toggleAngleLabels,
    showRadialLines,
    toggleRadialLines,
  } = useCircleStore();

  const { flyToPlace } = useMapStore();

  // 코스 선택 핸들러
  const handleSelectCourse = (courseId: string) => {
    setActiveCourseId(courseId);
    const target = courses.find((c) => c.id === courseId);
    if (target) {
      flyToPlace(target.restaurant.longitude, target.restaurant.latitude, 14);
    }
    // 모바일에서는 선택 시 지도가 보이도록 바텀시트 접기
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsMobileExpanded(false);
    }
  };

  // 장기 코스 선택 핸들러
  const handleSelectMultiDayCourse = (courseId: string) => {
    setActiveMultiDayCourseId(courseId);
    const target = multiDayCourses.find((c) => c.id === courseId);
    if (target) {
      flyToPlace(target.stay.longitude, target.stay.latitude, 14);
    }
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsMobileExpanded(false);
    }
  };

  return (
    <div
      className={`fixed sm:absolute z-40 sm:z-20 transition-all duration-300 ease-in-out flex flex-col bg-gray-900/95 sm:bg-gray-900/90 backdrop-blur-md border border-gray-700/60 shadow-2xl text-white overflow-hidden
        bottom-0 left-0 right-0 rounded-t-3xl sm:rounded-2xl
        sm:top-4 sm:left-4 sm:right-auto sm:bottom-auto sm:w-96 sm:max-h-[calc(100vh-2rem)]
        ${isMobileExpanded ? "h-[82vh] sm:h-auto" : "h-14 sm:h-auto"}
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
            <span>코스·필터 보기</span>
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
        <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-emerald-900/40 to-teal-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌿</span>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                VitalRoot
              </h1>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
              관광데이터 시각화
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            만성질환 맞춤 안심식당 + 힐링 산책로 + 편의시설 레이더
          </p>
        </div>

        {/* 4분할 탭 네비게이션 */}
        <div className="grid grid-cols-4 border-b border-gray-800 text-[11px] font-medium bg-gray-950/50">
          <button
            onClick={() => setActiveTab("courses")}
            className={`py-2.5 transition-colors ${
              activeTab === "courses"
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20 font-semibold"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            추천 코스
          </button>
          <button
            onClick={() => setActiveTab("multiday")}
            className={`py-2.5 transition-colors ${
              activeTab === "multiday"
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20 font-semibold"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            장기 코스
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-2.5 transition-colors ${
              activeTab === "profile"
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20 font-semibold"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            조건 필터
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`py-2.5 transition-colors ${
              activeTab === "map"
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20 font-semibold"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            동심원 설정
          </button>
        </div>

        {/* 탭 본문 영역 (스크롤 지원) */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-sm">
          {/* TAB 1: 추천 세트 (당일 코스, filteredCourses 바인딩) */}
          {activeTab === "courses" && (
            <div className="space-y-3">
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
                  const kakaoUrl = `https://map.kakao.com/?sName=${encodeURIComponent(
                    course.restaurant.name
                  )}&eName=${encodeURIComponent(course.trail.name)}`;
                  const naverUrl = `https://map.naver.com/p/directions/${course.restaurant.longitude},${course.restaurant.latitude},${encodeURIComponent(
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

                      <p className="text-[11px] text-emerald-400 mt-1 font-medium">
                        🎯 {course.targetCondition}
                      </p>

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
                              경로 인근 화장실·쉼터 {course.waypoints.length}곳 (3~5분 레이더 연동)
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

                      <div className="mt-2.5 flex items-center justify-between gap-1.5 pt-1.5 border-t border-gray-800/80">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={kakaoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95"
                          >
                            <span>🟡</span>
                            <span>카카오 길찾기</span>
                          </a>
                          <a
                            href={naverUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95"
                          >
                            <span>🟢</span>
                            <span>네이버 길찾기</span>
                          </a>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCourse(course.id);
                          }}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                        >
                          경로 ➔
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        {/* TAB 2: 장기 코스 (1박 2일 다일정 및 안심 숙소 연계) */}
        {activeTab === "multiday" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>국가 공인 & 검증 1박 2일 웰니스 코스</span>
              <span className="text-emerald-400 font-semibold">{multiDayCourses.length}개 프로그램</span>
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
                    <span className="text-[11px] text-gray-400">{mc.targetCondition}</span>
                  </div>
                  <h3 className="font-bold text-sm text-white leading-snug">{mc.title}</h3>
                </div>

                {/* 연계 안심 숙소 카드 */}
                <div className="p-3 rounded-xl bg-gray-900/80 border border-teal-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
                      <span>🏨</span>
                      <span>연계 안심 숙박 (취사 & 인슐린 보관)</span>
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-white">{mc.stay.name}</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{mc.stay.description}</p>
                  
                  {/* 숙소 안심 뱃지 3종 */}
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
                      href={`https://map.kakao.com/link/to/${encodeURIComponent(mc.stay.name)},${mc.stay.latitude},${mc.stay.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:underline font-semibold flex items-center gap-0.5"
                    >
                      숙소 위치 보기 ➔
                    </a>
                  </div>
                </div>

                {/* 1일차 & 2일차 스텝 타임라인 */}
                <div className="space-y-2.5 pt-1">
                  <h4 className="text-xs font-bold text-gray-300">일정별 세부 코스 브레이크다운</h4>
                  {mc.days.map((day) => (
                    <div key={day.day} className="bg-gray-900/50 p-2.5 rounded-lg border border-gray-800 space-y-2">
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
                              <span className="text-[11px] text-gray-400">[{step.type}]</span>
                              <span>{step.name}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 pl-4">{step.description}</p>
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

        {/* TAB 3: 조건 필터링 */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                1. 기저질환 지표 선택
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
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
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
                  <span className="text-emerald-400 font-medium">{profile.dietaryPreference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">알레르기 주의:</span>
                  <span className="text-gray-200 font-medium">{profile.allergies.join(", ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">오늘의 컨디션:</span>
                  <span className="text-teal-300 font-medium">{profile.conditionToday}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300/90 leading-relaxed">
              💡 <strong>스마트 필터 작동 중</strong>: 선택하신 질환에 최적화된 저염·저당 안심식당과 완경사 무장애 산책로가 지도에 우선 추천됩니다.
            </div>
          </div>
        )}

        {/* TAB 4: 동심원 시각화 설정 */}
        {activeTab === "map" && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-300">
                  동심원 반경 (현재: {radiusKm}km)
                </label>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  {radiusKm} km
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                <span>1km</span>
                <span>2km</span>
                <span>3km</span>
                <span>4km</span>
                <span>5km</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-300">
                  구역 투명도 ({Math.round(fillOpacity * 100)}%)
                </label>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.4"
                step="0.05"
                value={fillOpacity}
                onChange={(e) => setFillOpacity(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                테마 컬러
              </label>
              <div className="flex gap-2">
                {[
                  { name: "웰니스 에메랄드", hex: "#10b981" },
                  { name: "힐링 틸", hex: "#14b8a6" },
                  { name: "스카이 블루", hex: "#0ea5e9" },
                  { name: "포레스트 그린", hex: "#22c55e" },
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      color === c.hex
                        ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-gray-900"
                        : "hover:scale-110"
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800 space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-gray-300">거리 라벨 (km) 표시</span>
                <input
                  type="checkbox"
                  checked={showDistanceLabels}
                  onChange={toggleDistanceLabels}
                  className="rounded bg-gray-800 border-gray-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-gray-300">방위각 라벨 (30° 간격) 표시</span>
                <input
                  type="checkbox"
                  checked={showAngleLabels}
                  onChange={toggleAngleLabels}
                  className="rounded bg-gray-800 border-gray-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-gray-300">360도 방사선 보조 그리드</span>
                <input
                  type="checkbox"
                  checked={showRadialLines}
                  onChange={toggleRadialLines}
                  className="rounded bg-gray-800 border-gray-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 하단 Supabase 연동 상태 */}
      <div className="p-3 border-t border-gray-800/80 bg-gray-950/70 text-[11px] flex items-center justify-between text-gray-400">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isSupabaseConnected ? "bg-emerald-400 animate-pulse" : "bg-teal-400"
            }`}
          />
          <span>{isSupabaseConnected ? "Supabase DB 동기화 완료" : "스마트 폴백 시드 데이터 연동"}</span>
        </div>
        <span className="text-gray-500">한국관광공사 Tour API 연계</span>
      </div>
      </div>
    </div>
  );
}
