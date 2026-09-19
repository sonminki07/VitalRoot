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
  const [activeTab, setActiveTab] = useState<"profile" | "courses" | "map" | "quest">("courses");

  // 스토어 구독
  const {
    profile,
    courses,
    activeCourseId,
    setActiveCourseId,
    toggleCondition,
    completeQuest,
    setSelectedCouponModal,
    selectedCouponModal,
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
    <>
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
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>reColor {profile.recoloredZones}구역 달성</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            만성질환 맞춤 안심식당 + 힐링 산책로 라우팅
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="grid grid-cols-4 border-b border-gray-800 text-xs font-medium bg-gray-950/50">
          <button
            onClick={() => setActiveTab("courses")}
            className={`py-2.5 transition-colors ${
              activeTab === "courses"
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            추천 3선
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-2.5 transition-colors ${
              activeTab === "profile"
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            프로파일링
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
          <button
            onClick={() => setActiveTab("quest")}
            className={`py-2.5 transition-colors ${
              activeTab === "quest"
                ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            퀘스트 보상
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
                      {course.questCoupon.isCompleted && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 whitespace-nowrap">
                          완주완료
                        </span>
                      )}
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
                        <span>도보 {course.walkMinutes}분 ({course.slopeGrade})</span>
                        <span className="text-teal-300">💡 {course.expectedEffect}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCourse(course.id);
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                      >
                        지도에서 보기 ➔
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCouponModal(course.questCoupon);
                        }}
                        className="text-xs bg-gray-700/60 hover:bg-gray-700 text-gray-200 px-2 py-1 rounded"
                      >
                        🎁 쿠폰 확인
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: 듀얼 프로파일링 */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  1. 기저질환 지표 (건강정보 고속도로 연동)
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
                  2. 맞춤형 선호 식단 (주관적 지표)
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
                  3. 당일 건강 컨디션
                </label>
                <input
                  type="text"
                  value={profile.conditionToday}
                  readOnly
                  className="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300">
                ℹ️ 듀얼 프로파일링 조건 변경 시 알고리즘이 실시간으로 1초 이내에 안심식당과 완만 산책로를 자동 재매칭합니다.
              </div>
            </div>
          )}

          {/* TAB 3: 동심원 및 지도 제어 (이미지 원본 기능) */}
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

          {/* TAB 4: 퀘스트 및 바코드 보상 */}
          {activeTab === "quest" && (
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-br from-emerald-950/40 to-gray-800 rounded-xl border border-emerald-500/30">
                <h4 className="font-semibold text-emerald-300 text-xs">
                  🏆 스튜디오 퀘스트 & reColor 시스템
                </h4>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                  안심식당에서 식사 후 연계된 산책로를 완주하면 GPS 인증을 통해 지도의 해당 구역이 활력의 색으로 채워집니다.
                </p>
              </div>

              {courses.map((c) => (
                <div key={c.id} className="p-3 bg-gray-800/50 border border-gray-700/60 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-white">{c.restaurant.name} ➔ {c.trail.name}</span>
                    {c.questCoupon.isCompleted ? (
                      <span className="text-emerald-400 font-bold">인증 완료 ✓</span>
                    ) : (
                      <span className="text-amber-400 font-medium">진행 중</span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    {!c.questCoupon.isCompleted && (
                      <button
                        onClick={() => completeQuest(c.id)}
                        className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors"
                      >
                        📍 현장 GPS 완주 인증
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedCouponModal(c.questCoupon)}
                      className="py-1.5 px-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs transition-colors"
                    >
                      바코드 보기
                    </button>
                  </div>
                </div>
              ))}
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

      {/* 실물 바코드 쿠폰 모달 팝업 */}
      {selectedCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-emerald-500/50 rounded-2xl p-6 max-w-sm w-full text-white shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                  로컬 웰니스 보상 쿠폰
                </span>
                <h3 className="text-base font-bold mt-1 text-white">
                  {selectedCouponModal.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCouponModal(null)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300 mb-6 bg-gray-800/80 p-3 rounded-lg leading-relaxed">
              {selectedCouponModal.discountDesc}
            </p>

            {/* 바코드 시각화 */}
            <div className="bg-white p-4 rounded-xl flex flex-col items-center">
              <div className="h-16 w-full flex items-center justify-center gap-1">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-full bg-black"
                    style={{
                      width: i % 3 === 0 ? "4px" : i % 2 === 0 ? "2px" : "1px",
                      opacity: i % 7 === 0 ? 0.3 : 1,
                    }}
                  />
                ))}
              </div>
              <span className="text-black font-mono text-xs mt-2 tracking-widest font-semibold">
                {selectedCouponModal.barcode}
              </span>
            </div>

            <p className="text-center text-[11px] text-gray-400 mt-4">
              해당 매장 카운터에 제시 시 즉시 할인이 적용됩니다.
            </p>

            <button
              onClick={() => setSelectedCouponModal(null)}
              className="mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold text-white transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
