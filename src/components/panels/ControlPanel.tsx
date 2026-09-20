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
  const [activeTab, setActiveTab] = useState<"courses" | "profile" | "map">("courses");

  // 스토어 구독
  const {
    profile,
    courses,
    activeCourseId,
    setActiveCourseId,
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
  };

  return (
    <div className="absolute top-4 left-4 z-20 w-96 max-h-[calc(100vh-2rem)] flex flex-col bg-gray-900/90 backdrop-blur-md border border-gray-700/60 rounded-2xl shadow-2xl text-white overflow-hidden">
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
          만성질환 맞춤 안심식당 + 힐링 산책로 라우팅
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="grid grid-cols-3 border-b border-gray-800 text-xs font-medium bg-gray-950/50">
        <button
          onClick={() => setActiveTab("courses")}
          className={`py-2.5 transition-colors ${
            activeTab === "courses"
              ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          추천 코스
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`py-2.5 transition-colors ${
            activeTab === "profile"
              ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          조건 필터
        </button>
        <button
          onClick={() => setActiveTab("map")}
          className={`py-2.5 transition-colors ${
            activeTab === "map"
              ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          동심원 설정
        </button>
      </div>

      {/* 탭 본문 영역 (스크롤 지원) */}
      <div className="p-4 overflow-y-auto space-y-4 flex-1 text-sm">
        {/* TAB 1: 추천 세트 3선 */}
        {activeTab === "courses" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>내 질환 맞춤 큐레이션 코스</span>
              <span className="text-emerald-400 font-semibold">{courses.length}개 세트</span>
            </div>

            {courses.map((course) => {
              const isActive = course.id === activeCourseId;
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
                      <span className="text-gray-200 font-medium">{course.restaurant.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">🚶 힐링산책:</span>
                      <span className="text-gray-200 font-medium">{course.trail.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-800">
                      <span>보행로 {course.distanceMeters || 720}m • 도보 {course.walkMinutes}분</span>
                      <span className="text-teal-300 font-medium">{course.slopeGrade}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-1.5 pt-1.5 border-t border-gray-800/80">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://map.kakao.com/link/to/${encodeURIComponent(course.trail.name)},${course.trail.latitude},${course.trail.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1"
                      >
                        <span>🟡</span>
                        <span>카카오 길찾기</span>
                      </a>
                      <a
                        href={`https://map.naver.com/v5/directions/-/${course.trail.longitude},${course.trail.latitude},${encodeURIComponent(course.trail.name)},,/walk`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1"
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
            })}
          </div>
        )}

        {/* TAB 2: 조건 필터링 */}
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
                2. 선호 식단 성향
              </label>
              <input
                type="text"
                value={profile.dietaryPreference}
                readOnly
                className="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                3. 당일 희망 활동
              </label>
              <input
                type="text"
                value={profile.conditionToday}
                readOnly
                className="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none"
              />
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300">
              ℹ️ 선택한 건강 지표 조건에 맞는 안심식당과 산책로를 지도의 반경 내에서 즉각 매칭합니다.
            </div>
          </div>
        )}

        {/* TAB 3: 동심원 및 지도 제어 */}
        {activeTab === "map" && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1.5">
                <span>안심 탐색 반경</span>
                <span className="font-bold text-emerald-400">{radiusKm} km</span>
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
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>1km</span>
                <span>3km</span>
                <span>5km (최대)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1.5">
                <span>채우기 투명도 (Opacity)</span>
                <span className="font-bold text-emerald-400">{Math.round(fillOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={fillOpacity}
                onChange={(e) => setFillOpacity(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                동심원 테마 색상
              </label>
              <div className="flex gap-2">
                {["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      color === c ? "scale-110 border-white" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-800">
              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className="text-gray-300">4대 방위 거리 라벨 표시</span>
                <input
                  type="checkbox"
                  checked={showDistanceLabels}
                  onChange={toggleDistanceLabels}
                  className="accent-emerald-500 rounded"
                />
              </label>
              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className="text-gray-300">30° 각도 라벨 표시</span>
                <input
                  type="checkbox"
                  checked={showAngleLabels}
                  onChange={toggleAngleLabels}
                  className="accent-emerald-500 rounded"
                />
              </label>
              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className="text-gray-300">360° 방사선 표시</span>
                <input
                  type="checkbox"
                  checked={showRadialLines}
                  onChange={toggleRadialLines}
                  className="accent-emerald-500 rounded"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 하단 Supabase 및 배포 상태 바 */}
      <div className="p-2.5 bg-gray-950 border-t border-gray-800 text-[11px] flex justify-between items-center text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConnected ? "bg-emerald-400" : "bg-teal-400"}`} />
          <span>{isSupabaseConnected ? "Supabase DB 동기화됨" : "스마트 폴백 가동 중"}</span>
        </span>
        <span className="text-gray-500">Vercel Ready</span>
      </div>
    </div>
  );
}
