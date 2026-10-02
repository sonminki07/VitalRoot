import React, { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWellnessStore, WaypointFilterType } from "../../../store/wellnessStore";
import { WellnessCourseSet } from "../../../types/wellness.types";
import { AuthButton } from "../../auth/AuthButton";
import { HealthProfileAlertBanner } from "../../common/HealthProfileAlertBanner";
import { MapWalkSessionBanner } from "./MapWalkSessionBanner";
import { calculateDistanceMeters } from "../../../utils/pedestrianRouter";

const RADAR_CATEGORIES: { type: WaypointFilterType; label: string; icon: string }[] = [
  { type: "전체", label: "전체", icon: "🌐" },
  { type: "화장실", label: "화장실", icon: "🚻" },
  { type: "쉼터", label: "쉼터", icon: "🪑" },
  { type: "배리어프리", label: "무장애", icon: "♿" },
];

function formatDistance(meters: number, unit: "auto" | "km" | "m"): string {
  if (unit === "km" || (unit === "auto" && meters >= 1000)) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${meters}m`;
}

interface MapFloatingWidgetsProps {
  activeCourse?: WellnessCourseSet | null;
  actualWalkDistance: number;
  focusActiveCourse: (animate?: boolean) => void;
  handleChangeMapType: (type: "satellite" | "street") => void;
}

export function MapFloatingWidgets({
  activeCourse,
  actualWalkDistance,
  focusActiveCourse,
  handleChangeMapType,
}: MapFloatingWidgetsProps) {
  const {
    activeWaypointFilter,
    setActiveWaypointFilter,
    userLocation,
    setIsLocationModalOpen,
    isPinningHome,
    setIsPinningHome,
    mapType: storeMapType,
    distanceUnit,
    toggleDistanceUnit,
    saveCustomCourse,
    themeMode,
  } = useWellnessStore(
    useShallow((s) => ({
      activeWaypointFilter: s.activeWaypointFilter,
      setActiveWaypointFilter: s.setActiveWaypointFilter,
      userLocation: s.userLocation,
      setIsLocationModalOpen: s.setIsLocationModalOpen,
      isPinningHome: s.isPinningHome,
      setIsPinningHome: s.setIsPinningHome,
      mapType: s.mapType,
      distanceUnit: s.distanceUnit,
      toggleDistanceUnit: s.toggleDistanceUnit,
      saveCustomCourse: s.saveCustomCourse,
      themeMode: s.themeMode,
    }))
  );

  const isLight = themeMode === "light";

  // 사이드바 너비에 따른 레이더 칩 지능형 2단 줄바꿈 상태 (겹침 방지)
  const [isRadarStacked, setIsRadarStacked] = useState(false);

  // 하단 코스 길찾기 바 닫기(X) 상태
  const [isCourseBarDismissed, setIsCourseBarDismissed] = useState(false);

  // 하단 코스 바 자유 드래그 위치 상태
  const [courseBarPos, setCourseBarPos] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("vital_course_bar_pos");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [isDraggingCourseBar, setIsDraggingCourseBar] = useState(false);

  // 상단 바 충돌 감지 및 2단 자동 전환 리스너
  useEffect(() => {
    const checkOverlap = () => {
      if (typeof window === "undefined") return;
      const sidebarWidthStr = getComputedStyle(document.documentElement).getPropertyValue("--vital-sidebar-width");
      const sidebarWidth = parseFloat(sidebarWidthStr) || 380;
      // 우측 컨트롤 버튼 폭(~460px) + 레이더 폭(~330px) + 최소 여유
      const spaceAvailable = window.innerWidth - sidebarWidth - 480;
      setIsRadarStacked(spaceAvailable < 340);
    };

    checkOverlap();
    window.addEventListener("resize", checkOverlap);
    const observer = new MutationObserver(checkOverlap);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => {
      window.removeEventListener("resize", checkOverlap);
      observer.disconnect();
    };
  }, []);

  // UI 초기화 이벤트 리스너 (설정 모달의 UI 초기화 버튼과 연동)
  useEffect(() => {
    const handleResetUI = () => {
      setCourseBarPos(null);
      localStorage.removeItem("vital_course_bar_pos");
    };
    window.addEventListener("vital-reset-ui", handleResetUI);
    return () => window.removeEventListener("vital-reset-ui", handleResetUI);
  }, []);

  // 코스 전환 시 하단 바 복구
  useEffect(() => {
    setIsCourseBarDismissed(false);
  }, [activeCourse?.id]);

  // 하단 코스 길찾기 바 자유 드래그 핸들러
  const handleCourseBarMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    e.preventDefault();
    setIsDraggingCourseBar(true);

    const barEl = e.currentTarget as HTMLElement;
    const rect = barEl.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const barW = rect.width;
      const barH = rect.height;
      const newX = Math.min(Math.max(moveEvent.clientX - offsetX, 8), window.innerWidth - barW - 8);
      const newY = Math.min(Math.max(moveEvent.clientY - offsetY, 8), window.innerHeight - barH - 8);
      setCourseBarPos({ x: newX, y: newY });
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      setIsDraggingCourseBar(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      const barW = rect.width;
      const barH = rect.height;
      const finalX = Math.min(Math.max(upEvent.clientX - offsetX, 8), window.innerWidth - barW - 8);
      const finalY = Math.min(Math.max(upEvent.clientY - offsetY, 8), window.innerHeight - barH - 8);
      const finalPos = { x: finalX, y: finalY };
      setCourseBarPos(finalPos);
      localStorage.setItem("vital_course_bar_pos", JSON.stringify(finalPos));
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // 내 위치로부터의 거리 (m)
  const distFromUserToRest = userLocation && activeCourse
    ? calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        activeCourse.restaurant.latitude,
        activeCourse.restaurant.longitude
      )
    : null;

  // 도보 5분(400m) 초과 여부 -> 대중교통 권장
  const isTransitRecommended = distFromUserToRest !== null && distFromUserToRest > 400;

  // 1) 식당 ➔ 산책로 코스 도보 길찾기
  const naverRestToTrailUrl = activeCourse
    ? `https://map.naver.com/p/directions/${activeCourse.restaurant.longitude},${activeCourse.restaurant.latitude},${encodeURIComponent(
        activeCourse.restaurant.name
      )}/${activeCourse.trail.longitude},${activeCourse.trail.latitude},${encodeURIComponent(
        activeCourse.trail.name
      )}/-/walk?c=15.00,0,0,0,dh`
    : "#";

  // 2) 내 위치 ➔ 식당 도보 길찾기
  const naverUserToRestWalkUrl = userLocation && activeCourse
    ? `https://map.naver.com/p/directions/${userLocation.longitude},${userLocation.latitude},${encodeURIComponent(
        "내 위치"
      )}/${activeCourse.restaurant.longitude},${activeCourse.restaurant.latitude},${encodeURIComponent(
        activeCourse.restaurant.name
      )}/-/walk?c=15.00,0,0,0,dh`
    : "#";

  // 3) 내 위치 ➔ 식당 대중교통 길찾기
  const naverTransitUrl = userLocation && activeCourse
    ? `https://map.naver.com/p/directions/${userLocation.longitude},${userLocation.latitude},${encodeURIComponent(
        "내 위치"
      )}/${activeCourse.restaurant.longitude},${activeCourse.restaurant.latitude},${encodeURIComponent(
        activeCourse.restaurant.name
      )}/-/transit?c=15.00,0,0,0,dh`
    : "#";

  // 4) 내 위치 ➔ 산책로 직통 도보 길찾기
  const naverUserToTrailUrl = userLocation && activeCourse
    ? `https://map.naver.com/p/directions/${userLocation.longitude},${userLocation.latitude},${encodeURIComponent(
        "내 위치"
      )}/${activeCourse.trail.longitude},${activeCourse.trail.latitude},${encodeURIComponent(
        activeCourse.trail.name
      )}/-/walk?c=15.00,0,0,0,dh`
    : "#";

  return (
    <>
      {/* 지도 핀 찍기 가이드 플로팅 배너 */}
      {isPinningHome && (
        <div className="absolute top-16 sm:top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-950/95 border-2 border-amber-400 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-200">
          <span className="text-xl animate-bounce">🎯</span>
          <div className="text-left">
            <p className="font-bold text-amber-300 text-xs sm:text-sm">지도에서 내 집(출발지) 위치를 클릭하세요</p>
            <p className="text-[10px] text-gray-300">클릭하신 위치가 새로운 출발지로 즉시 설정됩니다.</p>
          </div>
          <button
            onClick={() => setIsPinningHome(false)}
            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold ml-1 shrink-0"
          >
            취소
          </button>
        </div>
      )}

      {/* 우측 상단 컨트롤 바 */}
      <div className="absolute top-4 right-3 sm:right-4 z-30 flex items-center justify-end gap-1.5 sm:gap-2">
        {/* 전체 경로 한눈에 보기 맞춤 버튼 */}
        <button
          onClick={() => focusActiveCourse(true)}
          className={`h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 shrink-0 border backdrop-blur-md ${
            isLight
              ? "bg-white/95 hover:bg-slate-50 text-emerald-700 hover:text-emerald-800 border-emerald-500/50 shadow-slate-300/40"
              : "bg-gray-900/90 hover:bg-gray-800 text-emerald-400 hover:text-emerald-300 border-emerald-500/40"
          }`}
          title="선택된 웰니스 코스 전체를 화면 한눈에 포커스합니다."
        >
          <span className="text-sm">⛶</span>
          <span className="hidden 2xl:inline">코스 전체 맞춤</span>
        </button>

        {/* 내 위치 기반 찾기 버튼 */}
        <button
          onClick={() => setIsLocationModalOpen(true)}
          className={`h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 shrink-0 border backdrop-blur-md ${
            userLocation
              ? "bg-sky-600/90 hover:bg-sky-600 text-white border-sky-400/60"
              : "bg-emerald-600/90 hover:bg-emerald-600 text-white border-emerald-400/60 animate-pulse"
          }`}
          title={userLocation ? "내 위치 재설정" : "내 위치 코스 찾기"}
        >
          <span className="text-sm">📍</span>
          <span className="hidden 2xl:inline">
            {userLocation ? "내 위치 재설정" : "내 위치 코스 찾기"}
          </span>
          <span className="2xl:hidden">{userLocation ? "재설정" : "내 위치"}</span>
        </button>

        {/* 내 집 핀 찍기 버튼 */}
        <button
          onClick={() => setIsPinningHome(!isPinningHome)}
          className={`h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 border shrink-0 backdrop-blur-md ${
            isPinningHome
              ? "bg-amber-500 text-gray-950 border-amber-300 animate-pulse ring-2 ring-amber-400"
              : isLight
              ? "bg-white/95 text-amber-800 hover:text-amber-900 border-amber-400/60 hover:bg-amber-50 shadow-slate-300/40"
              : "bg-gray-900/90 text-amber-300 hover:text-amber-200 border-amber-500/40 hover:bg-gray-800"
          }`}
          title="지도 화면을 직접 클릭하여 내 집(출발지) 위치를 지정합니다."
        >
          <span className="text-sm">🎯</span>
          <span className="hidden 2xl:inline">
            {isPinningHome ? "지도 클릭 대기중..." : "집 핀 찍기"}
          </span>
          <span className="2xl:hidden">{isPinningHome ? "대기중" : "집 핀"}</span>
        </button>

        <AuthButton />

        {/* 일반 / 위성 단일 토글 스위치 버튼 */}
        <button
          onClick={() => handleChangeMapType(storeMapType === "NORMAL" ? "satellite" : "street")}
          className={`h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl border text-xs font-semibold shadow-md transition-all active:scale-95 shrink-0 backdrop-blur-md ${
            isLight
              ? "bg-white/95 hover:bg-slate-50 text-slate-800 hover:text-slate-900 border-slate-300 shadow-slate-300/40"
              : "bg-gray-900/90 hover:bg-gray-800 text-gray-200 hover:text-white border-gray-700/70"
          }`}
          title={storeMapType === "NORMAL" ? "위성 지도로 변경" : "일반 도로 지도로 변경"}
        >
          <span className="text-sm">{storeMapType === "NORMAL" ? "🛰️" : "🗺️"}</span>
          <span>{storeMapType === "NORMAL" ? "위성" : "일반"}</span>
        </button>

        {/* 맞춤 건강 프로필 알림 배너 */}
        <HealthProfileAlertBanner />
      </div>

      {/* 상단 편의시설 레이더 필터 칩 */}
      <div
        style={{
          left: typeof window !== "undefined" && window.innerWidth >= 640
            ? "calc(var(--vital-sidebar-width, 390px) + 24px)"
            : undefined,
        }}
        className={`absolute ${
          isRadarStacked ? "top-16 sm:top-16" : "top-16 sm:top-4"
        } left-1/2 -translate-x-1/2 sm:translate-x-0 z-20 flex items-center gap-1 backdrop-blur-md border rounded-2xl p-1 sm:p-1.5 shadow-xl max-w-[95vw] sm:max-w-none overflow-x-auto transition-all duration-200 ease-out ${
          isLight
            ? "bg-white/95 border-slate-300 shadow-slate-300/40"
            : "bg-gray-900/95 border-gray-700/80 shadow-2xl"
        }`}
      >
        <div className={`hidden 2xl:flex items-center gap-1 px-2 text-[11px] font-semibold border-r mr-1 shrink-0 ${
          isLight ? "text-slate-600 border-slate-200" : "text-gray-400 border-gray-700/80"
        }`}>
          <span>🧭</span>
          <span>편의 레이더:</span>
        </div>
        {RADAR_CATEGORIES.map((cat) => (
          <button
            key={cat.type}
            onClick={() => setActiveWaypointFilter(cat.type)}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-medium shrink-0 transition-all ${
              activeWaypointFilter === cat.type
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* 실시간 도보 완보 세션 플로팅 배너 */}
      <MapWalkSessionBanner />

      {/* 지도 하단: 실제 도로 보행로 길찾기 바 */}
      {activeCourse && !isCourseBarDismissed && (
        <div
          onMouseDown={handleCourseBarMouseDown}
          style={
            courseBarPos
              ? {
                  left: `${courseBarPos.x}px`,
                  top: `${courseBarPos.y}px`,
                  bottom: "auto",
                  transform: "none",
                  cursor: isDraggingCourseBar ? "grabbing" : "grab",
                  userSelect: isDraggingCourseBar ? "none" : undefined,
                }
              : {
                  cursor: "grab",
                }
          }
          className={`absolute ${
            courseBarPos
              ? ""
              : "bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 sm:left-[calc(50%+var(--vital-sidebar-width,390px)/2)]"
          } z-30 backdrop-blur-md border rounded-2xl px-3.5 py-2.5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-2 sm:gap-3 text-xs animate-in fade-in select-none group transition-shadow hover:shadow-emerald-500/20 ${
            isLight
              ? "bg-white/98 text-slate-900 border-emerald-600/40 shadow-slate-400/30"
              : "bg-gray-900/95 text-white border-emerald-500/60 shadow-black/60"
          }`}
          title="클릭하고 드래그하여 화면 원하는 위치로 이동할 수 있습니다."
        >
          {/* 드래그 핸들 그립 표시 */}
          <div className="hidden sm:flex items-center text-gray-400/80 group-hover:text-emerald-400 cursor-grab active:cursor-grabbing px-0.5" title="드래그하여 이동">
            <span className="text-sm font-mono tracking-tighter">⠿</span>
          </div>

          {/* 좌측 영역: 코스 저장 핀 버튼 + 코스 정보 */}
          <div className="flex items-center gap-2.5 min-w-0 shrink">
            {/* 코스 저장 (📌 아이콘 단독) */}
            <button
              type="button"
              onClick={() => {
                saveCustomCourse({
                  id: `saved-${Date.now()}`,
                  title: `${activeCourse.restaurant.name} ➔ ${activeCourse.trail.name}`,
                  createdAt: new Date().toLocaleDateString("ko-KR"),
                  restaurantName: activeCourse.restaurant.name,
                  restaurantCoord: [
                    activeCourse.restaurant.longitude,
                    activeCourse.restaurant.latitude,
                  ],
                  trailName: activeCourse.trail.name,
                  trailCoord: [
                    activeCourse.trail.longitude,
                    activeCourse.trail.latitude,
                  ],
                  totalDistanceMeters: actualWalkDistance,
                });
                alert(
                  "📌 [나만의 저장 코스]에 현재 코스가 성공적으로 보관되었습니다!\n설정(⚙️) > 여행 & 길찾기 탭에서 언제든 확인하실 수 있습니다."
                );
              }}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-base shadow-md transition-all active:scale-95 shrink-0"
              title="현재 추천 코스를 나만의 보관함에 영구 저장"
            >
              📌
            </button>

            <div className="min-w-0">
              <div
                className={`font-bold flex items-center gap-1.5 text-xs sm:text-[14px] whitespace-nowrap overflow-hidden ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                {userLocation && (
                  <>
                    <span className={`shrink-0 ${isLight ? "text-sky-700 font-semibold" : "text-sky-300"}`}>내 위치</span>
                    <span className={`shrink-0 ${isLight ? "text-sky-600 font-bold" : "text-sky-400 font-bold"}`}>➔</span>
                  </>
                )}
                <span className="truncate max-w-[120px] sm:max-w-[200px] break-keep" title={activeCourse.restaurant.name}>
                  {activeCourse.restaurant.name}
                </span>
                <span className={`shrink-0 ${isLight ? "text-emerald-700 font-bold" : "text-emerald-400"}`}>➔</span>
                <span className="truncate max-w-[120px] sm:max-w-[200px] break-keep" title={activeCourse.trail.name}>
                  {activeCourse.trail.name}
                </span>
              </div>
              <div
                onClick={toggleDistanceUnit}
                className={`text-[11px] sm:text-xs cursor-pointer transition-colors whitespace-nowrap break-keep ${
                  isLight ? "text-slate-600 hover:text-slate-900" : "text-gray-400 hover:text-gray-200"
                }`}
                title="클릭하여 거리 단위 변경 (m / km)"
              >
                {userLocation ? (
                  <>
                    식당까지{" "}
                    <strong className={isLight ? "text-sky-700 font-bold underline decoration-dotted" : "text-sky-300 font-semibold underline decoration-dotted"}>
                      {formatDistance(distFromUserToRest ?? 0, distanceUnit)}
                    </strong>
                    {isTransitRecommended ? (
                      <span className={isLight ? "text-indigo-700 font-medium ml-1" : "text-indigo-300 font-medium ml-1"}>
                        (대중교통 권장)
                      </span>
                    ) : (
                      <span className={isLight ? "text-emerald-700 font-medium ml-1" : "text-emerald-300 font-medium ml-1"}>
                        (도보 권장)
                      </span>
                    )}{" "}
                    • 산책로{" "}
                    <strong className={isLight ? "text-emerald-700 font-bold underline decoration-dotted" : "text-emerald-400 font-semibold underline decoration-dotted"}>
                      {formatDistance(actualWalkDistance, distanceUnit)}
                    </strong>
                  </>
                ) : (
                  <>
                    도보 거리:{" "}
                    <strong className={isLight ? "text-emerald-700 font-bold underline decoration-dotted" : "text-emerald-400 font-semibold underline decoration-dotted"}>
                      {formatDistance(actualWalkDistance, distanceUnit)}
                    </strong>{" "}
                    • 약{" "}
                    <strong className={isLight ? "text-teal-700 font-bold" : "text-teal-300 font-semibold"}>
                      {Math.round(actualWalkDistance / 70)}분
                    </strong>{" "}
                    ({activeCourse.slopeGrade || "완경사 4.5% 미만"})
                  </>
                )}
              </div>
            </div>
          </div>

          <div className={`hidden md:block h-6 w-px mx-0.5 shrink-0 ${isLight ? "bg-slate-300" : "bg-gray-700/80"}`} />

          {/* 길찾기 버튼 영역 */}
          <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            {userLocation ? (
              <>
                <a
                  href={naverRestToTrailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 shrink-0 border border-emerald-400/40 whitespace-nowrap"
                  title="네이버 지도 도보 길찾기 (식당 ➔ 산책로 힐링 코스)"
                >
                  <span className="text-xs shrink-0">🟢</span>
                  <span className="whitespace-nowrap">도보 길찾기</span>
                </a>

                {isTransitRecommended ? (
                  <a
                    href={naverTransitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 shrink-0 whitespace-nowrap"
                    title="내 위치에서 식당까지 네이버 대중교통(버스/지하철) 길찾기"
                  >
                    <span className="text-xs shrink-0">🚌</span>
                    <span className="whitespace-nowrap">대중교통</span>
                  </a>
                ) : (
                  <a
                    href={naverUserToRestWalkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 shrink-0 whitespace-nowrap"
                    title="내 위치에서 식당까지 도보 길찾기"
                  >
                    <span className="text-xs shrink-0">🚶</span>
                    <span className="whitespace-nowrap">식당 도보</span>
                  </a>
                )}

                <a
                  href={naverUserToTrailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 font-bold text-xs rounded-xl border shadow transition-all active:scale-95 shrink-0 whitespace-nowrap ${
                    isLight
                      ? "bg-slate-100 hover:bg-slate-200 text-teal-800 border-teal-600/30"
                      : "bg-gray-800 hover:bg-gray-700 text-teal-300 hover:text-white border-teal-500/40"
                  }`}
                  title="내 위치에서 산책로까지 직통 도보 길찾기"
                >
                  <span className="text-xs shrink-0">🏁</span>
                  <span className="whitespace-nowrap">산책로 직통</span>
                </a>
              </>
            ) : (
              <a
                href={naverRestToTrailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 shrink-0 whitespace-nowrap"
              >
                <span className="text-xs shrink-0">🟢</span>
                <span className="whitespace-nowrap">도보 길찾기 (식당 ➔ 산책로)</span>
              </a>
            )}

            {/* 코스 바 닫기(X) 버튼 */}
            <button
              type="button"
              onClick={() => setIsCourseBarDismissed(true)}
              className={`p-1.5 rounded-xl text-xs shrink-0 font-bold ml-1 transition-colors ${
                isLight
                  ? "text-slate-400 hover:text-slate-800 hover:bg-slate-200/80"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
              title="하단 코스 길찾기 바 닫기"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
