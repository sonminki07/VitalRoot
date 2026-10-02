import React from "react";
import { WellnessCourseSet } from "../../../types/wellness.types";
import { CourseNutritionAccordion } from "./CourseNutritionAccordion";
import { calculateDistanceMeters } from "../../../utils/pedestrianRouter";

interface CourseTabProps {
  courseMode: "local" | "theme";
  onModeChange: (mode: "local" | "theme") => void;
  filteredCourses: WellnessCourseSet[];
  activeCourseId: string | null;
  userLocation: { latitude: number; longitude: number } | null;
  isTransitioning: boolean;
  isLight: boolean;
  formatDistance: (meters: number, unit?: "auto" | "km" | "m") => string;
  onSelectCourse: (id: string) => void;
  onHoverCourse: (id: string | null) => void;
  onOpenProfileTab: () => void;
  expandedNutritionCourseIds: Record<string, boolean>;
  onToggleNutritionExpand: (courseId: string, e: React.MouseEvent) => void;
  onFlyToPlace: (lng: number, lat: number, zoom?: number) => void;
  onSetIsPinningHome: (pinning: boolean) => void;
  onSetIsLocationModalOpen: (open: boolean) => void;
}

export function CourseTab({
  courseMode,
  onModeChange,
  filteredCourses,
  activeCourseId,
  userLocation,
  isTransitioning,
  isLight,
  formatDistance,
  onSelectCourse,
  onHoverCourse,
  onOpenProfileTab,
  expandedNutritionCourseIds,
  onToggleNutritionExpand,
  onFlyToPlace,
  onSetIsPinningHome,
  onSetIsLocationModalOpen,
}: CourseTabProps) {
  return (
    <div className="space-y-3">
      {/* 처음 방문한 사용자를 위한 직관적인 3단계 산책 길잡이 */}
      <div
        className={`p-3 rounded-2xl border ${
          isLight
            ? "bg-emerald-50/80 border-emerald-200 text-slate-800"
            : "bg-gradient-to-r from-emerald-950/40 via-purple-950/30 to-slate-900/50 border-emerald-500/30 text-gray-200"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <span className="text-emerald-400">🌿</span>
            <span className={isLight ? "text-emerald-900 font-extrabold" : "text-emerald-300"}>
              VitalRoot 건강 산책 3단계 가이드
            </span>
          </div>
          <span className="text-[10px] text-gray-400">식후 루틴</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
          <div
            className={`p-1.5 rounded-xl border flex flex-col items-center justify-center ${
              isLight
                ? "bg-white border-emerald-300 text-emerald-900 font-bold shadow-xs"
                : "bg-slate-900/80 border-emerald-500/40 text-emerald-300"
            }`}
          >
            <span className="text-[9px] font-black tracking-wider text-emerald-500 mb-0.5">
              STEP 1
            </span>
            <span className="font-bold leading-tight">식후 코스 선택</span>
          </div>
          <div
            className={`p-1.5 rounded-xl border flex flex-col items-center justify-center ${
              isLight
                ? "bg-white border-sky-300 text-sky-900 font-bold shadow-xs"
                : "bg-slate-900/80 border-sky-500/40 text-sky-300"
            }`}
          >
            <span className="text-[9px] font-black tracking-wider text-sky-500 mb-0.5">
              STEP 2
            </span>
            <span className="font-bold leading-tight">편의시설 확인</span>
          </div>
          <div
            className={`p-1.5 rounded-xl border flex flex-col items-center justify-center ${
              isLight
                ? "bg-white border-purple-300 text-purple-900 font-bold shadow-xs"
                : "bg-slate-900/80 border-purple-500/40 text-purple-300"
            }`}
          >
            <span className="text-[9px] font-black tracking-wider text-purple-500 mb-0.5">
              STEP 3
            </span>
            <span className="font-bold leading-tight">명소 완보 도전</span>
          </div>
        </div>
      </div>

      {/* 내 위치 연동 상태 배너 */}
      {!userLocation ? (
        <div className="p-3 bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">📍</span>
            <div className="text-xs">
              <p className="font-bold text-white">내 위치 기반 코스 탐색</p>
              <p className="text-[11px] text-emerald-300">
                가까운 안심식당과 산책로를 자동 정렬합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onSetIsPinningHome(true)}
              className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-[11px] rounded-lg transition-all shadow shrink-0 active:scale-95"
              title="지도 화면을 직접 클릭하여 집 위치를 지정합니다."
            >
              🎯 집 찍기
            </button>
            <button
              onClick={() => onSetIsLocationModalOpen(true)}
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
            <span className="font-semibold text-[11px]">내 위치 기준 가까운 순 정렬 중</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onSetIsPinningHome(true)}
              className="text-[10px] text-amber-300 hover:text-amber-200 font-bold px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-500/40 shrink-0"
            >
              🎯 집 핀 찍기
            </button>
            <button
              onClick={() => onSetIsLocationModalOpen(true)}
              className="text-[11px] text-sky-400 hover:text-sky-300 underline font-medium shrink-0"
            >
              동네 변경
            </button>
          </div>
        </div>
      )}

      {/* 2가지 모드 전환 토글 탭 (내 동네 힐링 / 테마 명소 여행) */}
      <div className="p-1 bg-gray-950/80 border border-gray-800 rounded-xl flex items-center gap-1 shadow-inner">
        <button
          onClick={() => onModeChange("local")}
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
          onClick={() => onModeChange("theme")}
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

      {/* 반경 3km(도보권) 이내 검증 식당 부재 시 정직한 대체 추천 배너 */}
      {userLocation && filteredCourses[0] && (() => {
        const firstCourse = filteredCourses[0];
        const firstDist = calculateDistanceMeters(
          userLocation.latitude,
          userLocation.longitude,
          firstCourse.restaurant.latitude,
          firstCourse.restaurant.longitude
        );
        if (firstDist > 3000) {
          return (
            <div
              className={`p-3 rounded-xl border text-xs space-y-1.5 shadow-sm ${
                isLight
                  ? "bg-amber-50 border-amber-300 text-amber-950"
                  : "bg-amber-950/40 border-amber-500/40 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <span>ℹ️</span>
                <span>현재 위치 인근 안심식당 안내</span>
              </div>
              <p
                className={`text-[11px] leading-relaxed ${
                  isLight ? "text-amber-900" : "text-amber-300/90"
                }`}
              >
                선택하신 위치 반경 3km(도보권) 이내에는 지자체 인증 안심식당이 등록되어 있지 않습니다.
                임의의 가상 식당을 생성하지 않고,{" "}
                <strong>가장 가까운 검증된 웰니스 코스({formatDistance(firstDist)})</strong>
                를 거리순으로 안내합니다. (차량/대중교통 이동 권장)
              </p>
            </div>
          );
        }
        return null;
      })()}

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
            onClick={onOpenProfileTab}
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

          // 네이버 도보/대중교통 길찾기 URL
          const restToTrailNaverUrl = `https://map.naver.com/p/directions/${course.restaurant.longitude},${course.restaurant.latitude},${encodeURIComponent(
            course.restaurant.name
          )}/${course.trail.longitude},${course.trail.latitude},${encodeURIComponent(
            course.trail.name
          )}/-/walk?c=15.00,0,0,0,dh`;

          const userToRestWalkUrl = userLocation
            ? `https://map.naver.com/p/directions/${userLocation.longitude},${userLocation.latitude},${encodeURIComponent(
                "내 위치"
              )}/${course.restaurant.longitude},${course.restaurant.latitude},${encodeURIComponent(
                course.restaurant.name
              )}/-/walk?c=15.00,0,0,0,dh`
            : null;

          const userToRestTransitUrl = userLocation && isTransitRecommended
            ? `https://map.naver.com/p/directions/${userLocation.longitude},${userLocation.latitude},${encodeURIComponent(
                "내 위치"
              )}/${course.restaurant.longitude},${course.restaurant.latitude},${encodeURIComponent(
                course.restaurant.name
              )}/-/transit?c=15.00,0,0,0,dh`
            : null;

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
              onClick={() => onSelectCourse(course.id)}
              onMouseEnter={() => onHoverCourse(course.id)}
              onMouseLeave={() => onHoverCourse(null)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? isLight
                    ? "bg-emerald-50/70 border-emerald-500 shadow-md ring-1 ring-emerald-400/40"
                    : "bg-emerald-950/30 border-emerald-500/70 shadow-lg shadow-emerald-950/50"
                  : isLight
                  ? "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                  : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/80"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    {course.region && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                          isLight
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        }`}
                      >
                        📍 {course.region}
                      </span>
                    )}
                    {course.isLocal && (
                      <span
                        className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${
                          isLight
                            ? "bg-teal-100 text-teal-800 border-teal-200"
                            : "bg-teal-500/20 text-teal-300 border-teal-500/30"
                        }`}
                      >
                        생활권
                      </span>
                    )}
                  </div>
                  <h3
                    className={`font-bold text-sm sm:text-base leading-snug ${
                      isLight ? "text-slate-900" : "text-white"
                    }`}
                  >
                    {course.title}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span
                  className={`text-xs font-bold ${
                    isLight ? "text-emerald-700" : "text-emerald-400"
                  }`}
                >
                  🎯 {course.targetCondition}
                </span>
                {distFromUser !== null && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                      distFromUser > 3000
                        ? isLight
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-amber-950/70 text-amber-300 border-amber-500/40"
                        : isLight
                        ? "bg-sky-100 text-sky-800 border-sky-200"
                        : "bg-sky-950/60 text-sky-300 border-sky-500/30"
                    }`}
                  >
                    {distFromUser > 3000
                      ? `🚗 ${formatDistance(distFromUser)} (차량/대중교통)`
                      : `📍 내 위치에서 ${formatDistance(distFromUser)} (도보권)`}
                  </span>
                )}
              </div>

              <div
                className={`mt-3 space-y-2 p-3 rounded-xl border text-xs sm:text-[13px] ${
                  isLight
                    ? "bg-slate-50 border-slate-200 text-slate-800"
                    : "bg-gray-900/70 border-gray-800 text-gray-200"
                }`}
              >
                {/* 안심식당 헤더 */}
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-1 font-semibold">
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px]">
                      STEP 1
                    </span>
                    <span className={isLight ? "text-slate-700" : "text-gray-300"}>
                      🍽️ 안심 식당:
                    </span>
                  </div>
                  <span className={`font-bold ${isLight ? "text-slate-900" : "text-gray-100"}`}>
                    {course.restaurant.name}
                  </span>
                </div>

                {/* 식약처 영양성분 및 건강 가이드 아코디언 */}
                {course.restaurant.nutrition && (
                  <CourseNutritionAccordion
                    courseId={course.id}
                    nutrition={course.restaurant.nutrition}
                    isExpanded={!!expandedNutritionCourseIds[course.id]}
                    onToggle={onToggleNutritionExpand}
                    isLight={isLight}
                  />
                )}

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-1 font-semibold">
                    <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 font-extrabold text-[10px]">
                      STEP 2
                    </span>
                    <span className={isLight ? "text-slate-700" : "text-gray-300"}>
                      🚶 완만 산책로:
                    </span>
                  </div>
                  <span className={`font-bold ${isLight ? "text-slate-900" : "text-gray-200"}`}>
                    {course.trail.name}
                  </span>
                </div>

                {/* 경로 3~5분 공공 편의시설 보유 안내 */}
                {course.waypoints && (
                  <div
                    className={`text-xs sm:text-[13px] font-bold flex items-center justify-between gap-1.5 p-2 rounded-lg border ${
                      isLight
                        ? "bg-purple-50/70 border-purple-200 text-purple-900"
                        : "bg-purple-950/30 border-purple-500/30 text-purple-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 font-extrabold text-[10px]">
                        STEP 3
                      </span>
                      <span>🧭 안심 편의시설:</span>
                    </div>
                    <span className="font-extrabold text-purple-400">
                      화장실·쉼터 {course.waypoints.length}곳 레이더 안내
                    </span>
                  </div>
                )}

                <div
                  className={`flex items-center justify-between pt-1.5 border-t text-xs sm:text-[13px] ${
                    isLight ? "border-slate-200 text-slate-600" : "border-gray-800 text-gray-400"
                  }`}
                >
                  <span>
                    총 거리:{" "}
                    <strong className={isLight ? "text-slate-900" : "text-white"}>
                      {course.distanceMeters}m
                    </strong>{" "}
                    (약 {course.walkMinutes}분)
                  </span>
                  <span className={`font-bold ${isLight ? "text-teal-700" : "text-teal-300"}`}>
                    {course.slopeGrade}
                  </span>
                </div>
              </div>

              {/* 하단 네이버 길찾기 정돈 버튼 그리드 */}
              <div
                className={`mt-2.5 pt-2 border-t space-y-1.5 ${
                  isLight ? "border-slate-200" : "border-gray-800/80"
                }`}
              >
                {/* 1. 최우선 핵심 버튼: 식당 ➔ 산책로 도보 길찾기 */}
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
                      className={`py-1.5 px-2 font-bold text-[11px] rounded-lg border transition-all flex items-center justify-center gap-1 active:scale-95 ${
                        isLight
                          ? "bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-300"
                          : "bg-gray-800 hover:bg-gray-700 text-teal-300 hover:text-white border-teal-500/40"
                      }`}
                      title="내 위치에서 산책로까지 직통 도보 길찾기"
                    >
                      <span>🏁</span>
                      <span className="truncate">산책로 직통</span>
                    </a>
                  ) : null}

                  {/* 지도 포커스 (식당 중심) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCourse(course.id);
                      onFlyToPlace(course.restaurant.longitude, course.restaurant.latitude, 16);
                    }}
                    className={`py-1.5 px-2 font-bold text-[11px] rounded-lg border transition-all flex items-center justify-center gap-1 active:scale-95 ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                        : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700"
                    }`}
                    title="안심식당(출발지) 중심으로 지도 위치 포커스"
                  >
                    <span>🎯</span>
                    <span className="truncate">지도 위치 ➔</span>
                  </button>

                  {/* 코스 전체 보기 버튼 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCourse(course.id);
                      window.dispatchEvent(
                        new CustomEvent("vital-fit-course", { detail: { courseId: course.id } })
                      );
                    }}
                    className={`py-1.5 px-2 font-bold text-[11px] rounded-lg border transition-all flex items-center justify-center gap-1 active:scale-95 ${
                      isLight
                        ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 hover:text-white border-emerald-500/40"
                    }`}
                    title="코스 전체가 한눈에 보이도록 축소/확대 및 중심 이동"
                  >
                    <span>🗺️</span>
                    <span className="truncate">코스 보기</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
