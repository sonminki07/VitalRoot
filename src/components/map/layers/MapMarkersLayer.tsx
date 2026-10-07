import { useEffect, useRef } from "react";
import {
  WellnessCourseSet,
  WellnessStay,
  WellnessQuest,
  WellnessPlace,
} from "../../../types/wellness.types";
import { WaypointFilterType, useWellnessStore } from "../../../store/wellnessStore";
import { calculateDistanceMeters } from "../../../utils/pedestrianRouter";
import { getNaverMapDetailUrl } from "../../../utils/naverMapUtils";
import { getCategoryPlaceholder } from "../../../utils/placePlaceholders";

interface MapMarkersLayerProps {
  mapRef: React.RefObject<naver.maps.Map | null>;
  isMapLoaded: boolean;
  userLocation: { latitude: number; longitude: number } | null;
  filteredCourses: WellnessCourseSet[];
  activeCourse?: WellnessCourseSet | null;
  activeWaypointFilter: WaypointFilterType;
  stays: WellnessStay[];
  activeStayId: string | null;
  quests: WellnessQuest[];
  activeQuestId: string | null;
  setSelectedPlace: (place: WellnessPlace | null) => void;
}

function cleanHtmlText(text?: string): string {
  if (!text) return "";
  return text
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function MapMarkersLayer({
  mapRef,
  isMapLoaded,
  userLocation,
  filteredCourses,
  activeCourse,
  activeWaypointFilter,
  stays,
  activeStayId,
  quests,
  activeQuestId,
  setSelectedPlace,
}: MapMarkersLayerProps) {
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const userMarkerRef = useRef<naver.maps.Marker | null>(null);
  const infoWindowRef = useRef<naver.maps.InfoWindow | null>(null);
  const prevActiveQuestIdRef = useRef<string | null>(null);
  const prevActiveStayIdRef = useRef<string | null>(null);

  const medicalPlaces = useWellnessStore((s) => s.medicalPlaces);

  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.naver.maps.InfoWindow({
        content: "",
        backgroundColor: "transparent",
        borderColor: "transparent",
        borderWidth: 0,
        disableAnchor: true,
        pixelOffset: new window.naver.maps.Point(0, -10),
      });

      // 전역 인포윈도우 닫기 헬퍼 등록
      (window as any).__closeVitalInfoWindow = () => {
        infoWindowRef.current?.close();
      };
    }
  }, [isMapLoaded]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !window.naver?.maps) return;
    const map = mapRef.current;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    // 📍 (0) 사용자 출발지 캡슐 뱃지
    if (userLocation) {
      const userContent = document.createElement("div");
      userContent.className = "vital-journey-marker cursor-pointer flex flex-col items-center select-none";
      userContent.innerHTML = `
        <div class="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 border-2 border-sky-400 shadow-2xl text-white text-xs font-bold whitespace-nowrap hover:scale-105 transition-transform">
          <span class="w-4 h-4 rounded-full bg-sky-400 flex items-center justify-center text-[10px] text-slate-950 font-black shrink-0">1</span>
          <span class="text-sky-300 font-extrabold text-[11px]">출발</span>
          <span class="text-[11px] text-gray-200">내 위치</span>
          <span class="animate-ping absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-400 opacity-75"></span>
        </div>
        <div class="w-2.5 h-2.5 -mt-1 rotate-45 bg-slate-900 border-r-2 border-b-2 border-sky-400"></div>
        <div class="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-lg -mt-0.5"></div>
      `;

      const userMarker = new window.naver.maps.Marker({
        map,
        position: new window.naver.maps.LatLng(userLocation.latitude, userLocation.longitude),
        icon: {
          content: userContent,
          anchor: new window.naver.maps.Point(45, 34),
        },
        zIndex: 150,
      });

      window.naver.maps.Event.addListener(userMarker, "click", () => {
        const popupContent = `
          <div style="width: 270px; min-width: 270px; max-width: 280px; box-sizing: border-box; word-break: keep-all; white-space: normal;" class="relative text-gray-900 p-3.5 font-sans bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-sky-500/50">
            <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-100 text-xs font-bold transition-colors">✕</button>
            <div class="flex items-center justify-between mb-1 pr-6">
              <span class="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">① 출발 지점</span>
            </div>
            <h4 class="font-bold text-xs text-gray-900 mt-1" style="word-break: keep-all;">📍 내 위치 (출발지)</h4>
            <p class="text-[11px] text-gray-600 mt-1 leading-snug" style="word-break: keep-all;">이 위치에서 출발하여 안심식당으로 이동하는 맞춤 보행 코스입니다.</p>
            <div class="mt-2.5 pt-2 border-t border-gray-100">
              <button
                onclick="window.dispatchEvent(new CustomEvent('vital-repin-home'))"
                class="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold text-center shadow transition-all cursor-pointer"
              >
                🎯 내 집 핀 위치 변경하기
              </button>
            </div>
          </div>
        `;
        infoWindowRef.current?.setContent(popupContent);
        infoWindowRef.current?.open(map, userMarker);
      });

      userMarkerRef.current = userMarker;
    }

    // (A) 안심식당 & 산책로 마커 렌더링
    filteredCourses.forEach((course) => {
      const isSelected = course.id === activeCourse?.id;

      let skipRest = false;
      // [마커 겹침 방지 필터링]: 현재 활성화된 코스가 아닐 때 주변 핀들과의 거리 검사
      let skipTrail = false;

      if (!isSelected && activeCourse) {
        // 비활성 코스의 산책로와 현재 활성 코스 산책로 간 거리(m) 계산
        const distTrailToActiveTrail = calculateDistanceMeters(
          course.trail.latitude,
          course.trail.longitude,
          activeCourse.trail.latitude,
          activeCourse.trail.longitude
        );
        // 비활성 코스의 산책로와 현재 활성 코스 식당 간 거리(m) 계산
        const distTrailToActiveRest = calculateDistanceMeters(
          course.trail.latitude,
          course.trail.longitude,
          activeCourse.restaurant.latitude,
          activeCourse.restaurant.longitude
        );
        // [보호 거점 판별]: 보행 약자/응급 환자에게 필수적인 핵심 거점(박물관, 무장애 시설, 휠체어 전용로, 병원 등)은
        // 70m 이내로 인접하더라도 지도에서 숨기지 않고 항상 온전히 표출
        const isProtectedTrail =
          course.trail.name.includes("박물관") ||
          course.trail.name.includes("무장애") ||
          course.trail.name.includes("의료") ||
          course.trail.name.includes("병원") ||
          (course.trail.safeTags &&
            course.trail.safeTags.some(
              (t) => t.includes("무장애") || t.includes("휠체어")
            ));

        // 보호 대상이 아니고 70m 이내로 과도하게 밀집된 경우 지도 가독성을 위해 마커 렌더링 스킵
        if (!isProtectedTrail && (distTrailToActiveTrail < 70 || distTrailToActiveRest < 70)) {
          skipTrail = true;
        }

        // 비활성 코스 식당과 현재 활성 식당 간 거리 계산
        const distRestToActiveRest = calculateDistanceMeters(
          course.restaurant.latitude,
          course.restaurant.longitude,
          activeCourse.restaurant.latitude,
          activeCourse.restaurant.longitude
        );
        // 비활성 코스 식당과 현재 활성 산책로 간 거리 계산
        const distRestToActiveTrail = calculateDistanceMeters(
          course.restaurant.latitude,
          course.restaurant.longitude,
          activeCourse.trail.latitude,
          activeCourse.trail.longitude
        );
        // 식당 역시 의료/복지/무장애 관련 핵심 시설인 경우 보호 처리
        const isProtectedRest =
          course.restaurant.name.includes("박물관") ||
          course.restaurant.name.includes("무장애") ||
          course.restaurant.name.includes("의료") ||
          course.restaurant.name.includes("병원") ||
          course.restaurant.name.includes("국립중앙박물관");

        // 70m 이내 일반 식당 마커 스킵 처리
        if (!isProtectedRest && (distRestToActiveRest < 70 || distRestToActiveTrail < 70)) {
          skipRest = true;
        }
      }

      // 2단계: 안심식당 캡슐 뱃지
      if (!skipRest) {
        const restContent = document.createElement("div");
        restContent.className = "vital-journey-marker cursor-pointer flex flex-col items-center select-none";

        const restStepNum = userLocation ? "2" : "1";
        const restStepLabel = userLocation ? "식사" : "출발";

        if (isSelected) {
          restContent.innerHTML = `
            <div class="-translate-x-1/2 -translate-y-full flex flex-col items-center select-none pointer-events-auto">
              <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950 border-2 border-emerald-400 shadow-2xl text-white text-xs font-bold whitespace-nowrap scale-110 z-30 transition-transform">
                <span class="w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center text-[10px] text-slate-950 font-black shrink-0">${restStepNum}</span>
                <span class="text-emerald-300 font-extrabold text-[11px]">${restStepLabel} 🥗</span>
                <span class="text-[11px] text-white truncate max-w-[130px]">${course.restaurant.name}</span>
              </div>
              <div class="w-2.5 h-2.5 -mt-1 rotate-45 bg-emerald-950 border-r-2 border-b-2 border-emerald-400"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg -mt-0.5"></div>
            </div>
          `;
        } else {
          restContent.innerHTML = `
            <div class="-translate-x-1/2 -translate-y-full flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-950/90 border border-emerald-500/50 shadow-lg text-[11px] text-emerald-200 opacity-85 hover:opacity-100 hover:scale-105 transition-all">
              <span>🥗</span>
              <span class="truncate max-w-[100px]">${course.restaurant.name}</span>
            </div>
          `;
        }

        const restMarker = new window.naver.maps.Marker({
          map,
          position: new window.naver.maps.LatLng(
            course.restaurant.latitude,
            course.restaurant.longitude
          ),
          icon: {
            content: restContent,
            anchor: new window.naver.maps.Point(0, 0),
          },
          zIndex: isSelected ? 190 : 30,
        });

        window.naver.maps.Event.addListener(restMarker, "click", () => {
          setSelectedPlace(course.restaurant);

          const nutrition = course.restaurant.nutrition;
          const nutritionHtml = nutrition
            ? `
            <div class="mt-2 p-2 bg-emerald-950/60 rounded-lg border border-emerald-500/40">
              <div class="flex items-center justify-between text-[11px] font-semibold text-emerald-300">
                <span>🥗 ${nutrition.menuName}</span>
                <span class="text-[10px] text-gray-400 font-mono">${nutrition.calories} kcal</span>
              </div>
              <div class="grid grid-cols-2 gap-1 text-[10px] pt-1 mt-1 border-t border-emerald-500/20">
                <div class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full ${
                    nutrition.sugarGrade === "안심" ? "bg-emerald-400" : "bg-amber-400"
                  }"></span>
                  <span class="text-gray-200">당류: <strong>${nutrition.sugars}g</strong> (${nutrition.sugarGrade})</span>
                </div>
                <div class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full ${
                    nutrition.sodiumGrade === "안심" ? "bg-emerald-400" : "bg-amber-400"
                  }"></span>
                  <span class="text-gray-200">나트륨: <strong>${nutrition.sodium}mg</strong> (${nutrition.sodiumGrade})</span>
                </div>
              </div>
              <p class="text-[9px] text-emerald-400 mt-1">${nutrition.nutritionTip || "식약처 안심 영양성분 검증"}</p>
            </div>
          `
            : "";

          const naverSearchUrl = getNaverMapDetailUrl(course.restaurant);

          const restPlaceholder = getCategoryPlaceholder("음식점", course.restaurant.name);
          const popupContent = `
            <div style="width: 280px; min-width: 280px; max-width: 300px; box-sizing: border-box; word-break: keep-all; white-space: normal;" class="relative text-white p-3.5 font-sans bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-500/50 animate-in fade-in zoom-in-95 duration-150">
              <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2.5 right-2.5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs font-bold transition-colors">✕</button>
              
              <div class="w-full h-24 mb-2.5 rounded-xl overflow-hidden border border-emerald-500/30 bg-gray-900">
                <img
                  src="${course.restaurant.imageUrl || restPlaceholder}"
                  alt="${course.restaurant.name}"
                  class="w-full h-full object-cover"
                  onerror="this.onerror=null; this.src='${restPlaceholder}';"
                />
              </div>

              <div class="flex items-center justify-between gap-1 mb-1 pr-6">
                <span class="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">안심식당</span>
                <span class="text-[10px] text-gray-400 font-medium">${course.targetCondition.split(" ")[0]}</span>
              </div>
              <h4 class="font-bold text-sm text-white leading-snug" style="word-break: keep-all;">${course.restaurant.name}</h4>
              <p class="text-[11px] text-gray-300 mt-1 leading-snug" style="word-break: keep-all;">${course.restaurant.description}</p>
              ${nutritionHtml}
              <div class="mt-2.5 pt-2 border-t border-gray-800">
                <a
                  href="${naverSearchUrl}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full flex items-center justify-center gap-1 py-1.5 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                >
                  <span>🟢</span>
                  <span>네이버 지도 상세 보기</span>
                </a>
              </div>
            </div>
          `;

          infoWindowRef.current?.setContent(popupContent);
          infoWindowRef.current?.open(map, restMarker);
        });

        markersRef.current.push(restMarker);
      }

      // 3단계: 완만 산책로 캡슐 뱃지
      if (!skipTrail) {
        const trailContent = document.createElement("div");
        trailContent.className = "vital-journey-marker cursor-pointer flex flex-col items-center select-none";

        const trailStepNum = userLocation ? "3" : "2";

        if (isSelected) {
          trailContent.innerHTML = `
            <div class="-translate-x-1/2 -translate-y-full flex flex-col items-center select-none pointer-events-auto">
              <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950 border-2 border-rose-400 shadow-2xl text-white text-xs font-bold whitespace-nowrap scale-110 z-30 transition-transform">
                <span class="w-4 h-4 rounded-full bg-rose-400 flex items-center justify-center text-[10px] text-slate-950 font-black shrink-0">${trailStepNum}</span>
                <span class="text-rose-300 font-extrabold text-[11px]">도착 🏁</span>
                <span class="text-[11px] text-white truncate max-w-[130px]">${course.trail.name}</span>
              </div>
              <div class="w-2.5 h-2.5 -mt-1 rotate-45 bg-rose-950 border-r-2 border-b-2 border-rose-400"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-lg -mt-0.5"></div>
            </div>
          `;
        } else {
          trailContent.innerHTML = `
            <div class="-translate-x-1/2 -translate-y-full flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-950/90 border border-teal-500/50 shadow-lg text-[11px] text-teal-200 opacity-85 hover:opacity-100 hover:scale-105 transition-all">
              <span>👟</span>
              <span class="truncate max-w-[100px]">${course.trail.name}</span>
            </div>
          `;
        }

        const trailMarker = new window.naver.maps.Marker({
          map,
          position: new window.naver.maps.LatLng(
            course.trail.latitude,
            course.trail.longitude
          ),
          icon: {
            content: trailContent,
            anchor: new window.naver.maps.Point(0, 0),
          },
          zIndex: isSelected ? 200 : 30,
        });

        window.naver.maps.Event.addListener(trailMarker, "click", () => {
          setSelectedPlace(course.trail);

          const naverSearchUrl = getNaverMapDetailUrl(course.trail);

          const trailPlaceholder = getCategoryPlaceholder("산책로", course.trail.name);
          const popupContent = `
            <div style="width: 280px; min-width: 280px; max-width: 300px; box-sizing: border-box; word-break: keep-all; white-space: normal;" class="relative text-white p-3.5 font-sans bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-teal-500/50 animate-in fade-in zoom-in-95 duration-150">
              <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2.5 right-2.5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs font-bold transition-colors">✕</button>
              
              <div class="w-full h-24 mb-2.5 rounded-xl overflow-hidden border border-teal-500/30 bg-gray-900">
                <img
                  src="${course.trail.imageUrl || trailPlaceholder}"
                  alt="${course.trail.name}"
                  class="w-full h-full object-cover"
                  onerror="this.onerror=null; this.src='${trailPlaceholder}';"
                />
              </div>

              <div class="flex items-center justify-between gap-1 mb-1 pr-6">
                <span class="text-[10px] bg-teal-950 text-teal-300 border border-teal-500/40 px-1.5 py-0.5 rounded font-bold">완만 산책로</span>
                <span class="text-[10px] text-teal-300 font-semibold">${course.slopeGrade}</span>
              </div>
              <h4 class="font-bold text-sm text-white leading-snug" style="word-break: keep-all;">${course.trail.name}</h4>
              <p class="text-[11px] text-gray-300 mt-1 leading-snug" style="word-break: keep-all;">${course.trail.description}</p>
              <div class="mt-2 p-1.5 bg-teal-950/60 border border-teal-500/30 rounded-lg text-[10px] text-teal-200 font-medium" style="word-break: keep-all;">
                🌿 ${course.trail.healthBenefit}
              </div>
              <div class="mt-2.5 pt-2 border-t border-gray-800">
                <a
                  href="${naverSearchUrl}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full flex items-center justify-center gap-1 py-1.5 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                >
                  <span>🟢</span>
                  <span>네이버 지도 상세 보기</span>
                </a>
              </div>
            </div>
          `;

          infoWindowRef.current?.setContent(popupContent);
          infoWindowRef.current?.open(map, trailMarker);
        });

        markersRef.current.push(trailMarker);
      }

      // 공공 편의시설 핀
      if (isSelected && course.waypoints) {
        const filteredWaypoints =
          activeWaypointFilter === "전체"
            ? course.waypoints
            : course.waypoints.filter((wp) => {
                if (activeWaypointFilter === "배리어프리") {
                  return (
                    wp.category === "배리어프리" ||
                    (wp.features &&
                      wp.features.some(
                        (f) =>
                          f.includes("장애인") ||
                          f.includes("무장애") ||
                          f.includes("휠체어") ||
                          f.includes("자동문")
                      ))
                  );
                }
                if (activeWaypointFilter === "의료") {
                  return (
                    wp.category === "의료" ||
                    wp.name.includes("병원") ||
                    wp.name.includes("약국") ||
                    wp.name.includes("의료")
                  );
                }
                return wp.category === activeWaypointFilter;
              });

        filteredWaypoints.forEach((wp) => {
          const wpDistToTrail = calculateDistanceMeters(
            wp.latitude,
            wp.longitude,
            course.trail.latitude,
            course.trail.longitude
          );
          const wpDistToRest = calculateDistanceMeters(
            wp.latitude,
            wp.longitude,
            course.restaurant.latitude,
            course.restaurant.longitude
          );
          // 국립중앙박물관 및 배리어프리/의료 거점 마커는 70m 이내여도 스킵하지 않고 온전히 유지
          const isProtectedWp =
            wp.category === "배리어프리" ||
            wp.category === "의료" ||
            wp.name.includes("국립중앙박물관") ||
            wp.name.includes("박물관") ||
            wp.name.includes("무장애") ||
            wp.name.includes("의료") ||
            wp.name.includes("병원") ||
            (wp.features &&
              wp.features.some(
                (f) =>
                  f.includes("무장애") ||
                  f.includes("장애인") ||
                  f.includes("휠체어") ||
                  f.includes("자동문")
              ));

          if (!isProtectedWp && (wpDistToTrail < 70 || wpDistToRest < 70)) {
            return;
          }

          const wpContent = document.createElement("div");
          wpContent.className = "vital-marker-wrapper cursor-pointer";

          const badgeBg =
            wp.category === "화장실"
              ? "bg-sky-600 border-sky-300"
              : wp.category === "쉼터"
              ? "bg-amber-600 border-amber-300"
              : wp.category === "의료"
              ? "bg-red-600 border-red-300"
              : "bg-purple-600 border-purple-300";

          const iconText =
            wp.category === "화장실"
              ? "🚻"
              : wp.category === "쉼터"
              ? "🪑"
              : wp.category === "의료"
              ? "🏥"
              : "♿";

          wpContent.innerHTML = `
            <div class="w-7 h-7 flex items-center justify-center rounded-full shadow-lg border-2 ${badgeBg} hover:scale-125 transition-transform duration-200 z-10">
              <span class="text-xs select-none">${iconText}</span>
            </div>
          `;

          const wpMarker = new window.naver.maps.Marker({
            map,
            position: new window.naver.maps.LatLng(wp.latitude, wp.longitude),
            icon: {
              content: wpContent,
              anchor: new window.naver.maps.Point(14, 14),
            },
            zIndex: 40,
          });

          window.naver.maps.Event.addListener(wpMarker, "click", () => {
            const naverSearchUrl = getNaverMapDetailUrl(wp);
            const featureBadges = wp.features
              .map(
                (f) =>
                  `<span class="text-[9px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">${f}</span>`
              )
              .join(" ");

            const wpPlaceholder = getCategoryPlaceholder(wp.category, wp.name);
            const popupContent = `
              <div style="width: 270px; min-width: 270px; max-width: 290px; box-sizing: border-box; word-break: keep-all; white-space: normal;" class="relative text-white p-3 font-sans bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/80 animate-in fade-in zoom-in-95 duration-150">
                <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2 right-2 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs font-bold transition-colors">✕</button>
                
                <div class="w-full h-20 mb-2 rounded-xl overflow-hidden border border-gray-700 bg-gray-900">
                  <img
                    src="${wp.imageUrl || wpPlaceholder}"
                    alt="${wp.name}"
                    class="w-full h-full object-cover"
                    onerror="this.onerror=null; this.src='${wpPlaceholder}';"
                  />
                </div>

                <div class="flex items-center justify-between gap-1 mb-1 pr-6">
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    wp.category === "화장실"
                      ? "bg-sky-950 text-sky-300 border border-sky-500/40"
                      : wp.category === "쉼터"
                      ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                      : wp.category === "의료"
                      ? "bg-red-950 text-red-300 border border-red-500/40"
                      : "bg-purple-950 text-purple-300 border border-purple-500/40"
                  }">안심 ${wp.category}</span>
                  <span class="text-[10px] font-semibold text-emerald-400">도보 ${wp.walkingMinutesFromRoute}분 (${wp.distanceMetersFromRoute}m)</span>
                </div>
                <h4 class="font-bold text-xs text-white" style="word-break: keep-all;">${wp.name}</h4>
                <p class="text-[10px] text-gray-300 mt-1 leading-snug" style="word-break: keep-all;">${wp.description}</p>
                <div class="flex flex-wrap gap-1 mt-2">${featureBadges}</div>
                <div class="mt-2.5 pt-2 border-t border-gray-800">
                  <a
                    href="${naverSearchUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-full flex items-center justify-center gap-1 py-1 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-[10px] rounded-lg transition-all shadow-sm active:scale-95"
                  >
                    <span>🟢</span>
                    <span>네이버 지도 상세</span>
                  </a>
                </div>
              </div>
            `;

            infoWindowRef.current?.setContent(popupContent);
            infoWindowRef.current?.open(map, wpMarker);
          });

          markersRef.current.push(wpMarker);
        });
      }
    });

    // (B) 헬스케어 안심 숙소 마커
    stays.forEach((stay) => {
      const isStayActive = stay.id === activeStayId;
      const stayContent = document.createElement("div");
      stayContent.className = "vital-marker-wrapper cursor-pointer";
      stayContent.innerHTML = `
        <div class="w-8 h-8 flex items-center justify-center rounded-full shadow-lg border-2 ${
          isStayActive
            ? "bg-teal-500 border-white scale-125 ring-2 ring-teal-400 z-30"
            : "bg-teal-800 border-teal-300 hover:scale-110"
        } transition-all">
          <span class="text-xs select-none">🏨</span>
        </div>
      `;

      const stayMarker = new window.naver.maps.Marker({
        map,
        position: new window.naver.maps.LatLng(stay.latitude, stay.longitude),
        icon: {
          content: stayContent,
          anchor: new window.naver.maps.Point(16, 16),
        },
        zIndex: isStayActive ? 90 : 15,
      });

      window.naver.maps.Event.addListener(stayMarker, "click", () => {
        const naverSearchUrl = getNaverMapDetailUrl(stay);
        const badgesHtml = stay.safeBadges
          .map(
            (b) =>
              `<span class="text-[9px] bg-teal-950 text-teal-300 border border-teal-500/40 px-1.5 py-0.5 rounded">${b}</span>`
          )
          .join(" ");

        const stayPlaceholder = getCategoryPlaceholder("숙소", stay.name);
        const popupContent = `
          <div style="width: 270px; min-width: 270px; max-width: 290px; box-sizing: border-box; word-break: keep-all; white-space: normal;" class="relative text-white p-3 font-sans bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-teal-500/50 animate-in fade-in zoom-in-95 duration-150">
            <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2 right-2 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs font-bold transition-colors">✕</button>
            
            <div class="w-full h-24 mb-2 rounded-xl overflow-hidden border border-teal-500/30 bg-gray-900">
              <img
                src="${stay.imageUrl || stayPlaceholder}"
                alt="${stay.name}"
                class="w-full h-full object-cover"
                onerror="this.onerror=null; this.src='${stayPlaceholder}';"
              />
            </div>

            <div class="flex items-center justify-between gap-1 mb-1 pr-6">
              <span class="text-[10px] bg-teal-950 text-teal-300 border border-teal-500/40 font-bold px-1.5 py-0.5 rounded">안심 숙소</span>
            </div>
            <h4 class="font-bold text-xs text-white mt-1" style="word-break: keep-all;">${stay.name}</h4>
            <p class="text-[10px] text-gray-300 mt-0.5 leading-snug" style="word-break: keep-all;">${stay.description}</p>
            <div class="flex flex-wrap gap-1 mt-1.5">${badgesHtml}</div>
            <div class="mt-2 pt-2 border-t border-gray-800">
              <a
                href="${naverSearchUrl}"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full flex items-center justify-center gap-1 py-1.5 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-[10px] rounded-lg transition-all active:scale-95"
              >
                <span>🟢</span>
                <span>네이버 지도 상세</span>
              </a>
            </div>
          </div>
        `;

        infoWindowRef.current?.setContent(popupContent);
        infoWindowRef.current?.open(map, stayMarker);
      });

      // [사이드바 연동 자동 인포윈도우 팝업]: 사용자가 사이드바 패널의 '안심 숙소' 탭에서 카드를 클릭했을 때,
      // 지도가 해당 좌표로 비행(flyTo) 이동하는 시간(약 150ms)을 대기한 뒤,
      // 프로그래밍 방식으로 마커의 'click' 이벤트를 강제 트리거하여 상세 인포윈도우를 자동으로 열어줌
      if (isStayActive && prevActiveStayIdRef.current !== activeStayId) {
        prevActiveStayIdRef.current = activeStayId;
        setTimeout(() => {
          (window.naver?.maps?.Event as any)?.trigger(stayMarker, "click");
        }, 150);
      }

      markersRef.current.push(stayMarker);
    });

    // (C) 웰니스 관광명소 퀘스트 마커
    quests.forEach((quest) => {
      const isQuestActive = quest.id === activeQuestId;
      const questContent = document.createElement("div");
      questContent.className = "vital-marker-wrapper cursor-pointer";
      questContent.innerHTML = `
        <div class="w-8 h-8 flex items-center justify-center rounded-full shadow-lg border-2 ${
          quest.isCompleted
            ? "bg-amber-500 border-amber-200"
            : isQuestActive
            ? "bg-purple-600 border-white scale-125 ring-2 ring-purple-400"
            : "bg-purple-800 border-purple-300 hover:scale-110"
        } transition-all">
          <span class="text-xs select-none">${quest.badgeIcon}</span>
        </div>
      `;

      const questMarker = new window.naver.maps.Marker({
        map,
        position: new window.naver.maps.LatLng(quest.latitude, quest.longitude),
        icon: {
          content: questContent,
          anchor: new window.naver.maps.Point(16, 16),
        },
        zIndex: isQuestActive ? 95 : 18,
      });

      window.naver.maps.Event.addListener(questMarker, "click", () => {
        const naverSearchUrl = getNaverMapDetailUrl({
          name: quest.landmarkName,
          address: quest.address,
          naverPlaceName: quest.naverPlaceName,
        });

        const questPlaceholder = getCategoryPlaceholder("관광지", quest.landmarkName);
        const popupContent = `
          <div style="width: 280px; min-width: 280px; max-width: 300px; box-sizing: border-box; word-break: keep-all; white-space: normal;" class="relative text-gray-900 p-3.5 font-sans bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-purple-500/40">
            <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-100 text-xs font-bold transition-colors">✕</button>
            
            <div class="w-full h-24 mb-2 rounded-xl overflow-hidden border border-purple-200 bg-purple-50">
              <img
                src="${quest.imageUrl || questPlaceholder}"
                alt="${quest.landmarkName}"
                class="w-full h-full object-cover"
                onerror="this.onerror=null; this.src='${questPlaceholder}';"
              />
            </div>

            <div class="flex items-center justify-between gap-1 mb-1 pr-6">
              <span class="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">관광명소 퀘스트</span>
            </div>
            <h4 class="font-bold text-sm text-gray-900 mt-1 leading-snug" style="word-break: keep-all;">${quest.landmarkName}</h4>
            <p class="text-[11px] text-gray-600 mt-1 leading-snug" style="word-break: keep-all;">${quest.description}</p>
            <div class="mt-2 p-1.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-900 font-bold flex items-center gap-1">
              <span>🏅 칭호:</span>
              <span class="font-extrabold text-purple-700" style="word-break: keep-all;">${quest.titleReward}</span>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-100">
              <a
                href="${naverSearchUrl}"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full flex items-center justify-center gap-1 py-1.5 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-xs rounded-lg transition-all"
              >
                <span>🟢</span>
                <span>네이버 지도 상세</span>
              </a>
            </div>
          </div>
        `;

        infoWindowRef.current?.setContent(popupContent);
        infoWindowRef.current?.open(map, questMarker);
      });

      if (isQuestActive && prevActiveQuestIdRef.current !== activeQuestId) {
        prevActiveQuestIdRef.current = activeQuestId;
        setTimeout(() => {
          (window.naver?.maps?.Event as any)?.trigger(questMarker, "click");
        }, 150);
      }

      markersRef.current.push(questMarker);
    });

    // (D) 의료/병원 인프라 마커 렌더링 (TC-08 및 TC-03)
    if (activeWaypointFilter === "의료" || activeWaypointFilter === "전체") {
      medicalPlaces.forEach((med) => {
        const medContent = document.createElement("div");
        medContent.className = "vital-marker-wrapper cursor-pointer select-none";
        const cleanTitle = med.title.replace(/<[^>]*>/g, "").trim();
        medContent.innerHTML = `
          <div class="group relative flex flex-col items-center">
            <div class="w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center text-sm font-bold text-white hover:scale-125 transition-transform duration-200 ring-2 ring-red-400">
              <span>🏥</span>
            </div>
            <div class="w-2 h-2 -mt-0.5 rotate-45 bg-red-600 border-r border-b border-white"></div>
            <div class="hidden group-hover:flex absolute -top-7 px-2 py-0.5 rounded-md bg-gray-950/90 text-white text-[10px] whitespace-nowrap border border-red-500/40 font-bold shadow-lg">
              ${cleanTitle}
            </div>
          </div>
        `;

        const medMarker = new window.naver.maps.Marker({
          map,
          position: new window.naver.maps.LatLng(med.latitude, med.longitude),
          icon: {
            content: medContent,
            anchor: new window.naver.maps.Point(16, 16),
          },
          zIndex: 85,
        });

        window.naver.maps.Event.addListener(medMarker, "click", () => {
          const cleanAddress = cleanHtmlText(med.address);
          const rawTelClean = cleanHtmlText(med.tel);
          const cleanTel = rawTelClean || "안내 전화 정보 없음";

          setSelectedPlace({
            id: med.id,
            name: cleanTitle,
            category: "의료",
            description: med.category || "응급·의료기관 인프라",
            address: cleanAddress,
            latitude: med.latitude,
            longitude: med.longitude,
            safeTags: ["응급의료", "병원"],
            healthBenefit: "응급의료 및 진료 연계",
            imageUrl: med.imageUrl,
          });

          const naverSearchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(cleanTitle)}`;
          const placeholderImg = getCategoryPlaceholder("의료", cleanTitle);

          const popupContent = `
            <div style="width: 280px; min-width: 280px; max-width: 300px; box-sizing: border-box; word-break: keep-all; white-space: normal;" class="relative text-white p-3.5 font-sans bg-gray-950/95 backdrop-blur-md rounded-2xl shadow-2xl border border-red-500/60 animate-in fade-in zoom-in-95 duration-150">
              <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2.5 right-2.5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs font-bold transition-colors">✕</button>
              
              <div class="w-full h-24 mb-2.5 rounded-xl overflow-hidden border border-red-500/30 bg-gray-900">
                <img
                  src="${med.imageUrl || placeholderImg}"
                  alt="${cleanTitle}"
                  class="w-full h-full object-cover"
                  onerror="this.onerror=null; this.src='${placeholderImg}';"
                />
              </div>

              <div class="flex items-center justify-between gap-1 mb-1 pr-6">
                <span class="text-[10px] bg-red-950 text-red-300 border border-red-500/50 px-2 py-0.5 rounded font-extrabold flex items-center gap-1">
                  <span>🏥</span>
                  <span>응급·의료기관</span>
                </span>
                <span class="text-[10px] text-red-300 font-semibold">${med.category || "의료 인프라"}</span>
              </div>

              <h4 class="font-bold text-sm text-white leading-snug mt-1" style="word-break: keep-all;">${cleanTitle}</h4>
              <p class="text-[11px] text-gray-300 mt-1 leading-snug" style="word-break: keep-all;">📍 ${cleanAddress}</p>

              <div class="mt-2 p-2 bg-red-950/60 rounded-xl border border-red-500/30 text-[11px] text-red-200 font-medium flex items-center gap-1.5">
                <span class="text-xs">📞</span>
                <span class="font-bold font-mono">${cleanTel}</span>
              </div>

              <div class="mt-2.5 pt-2 border-t border-gray-800">
                <a
                  href="${naverSearchUrl}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full flex items-center justify-center gap-1 py-1.5 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                >
                  <span>🟢</span>
                  <span>네이버 지도 병원 상세</span>
                </a>
              </div>
            </div>
          `;

          infoWindowRef.current?.setContent(popupContent);
          infoWindowRef.current?.open(map, medMarker);
        });

        markersRef.current.push(medMarker);
      });
    }

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }
    };
  }, [
    isMapLoaded,
    userLocation,
    filteredCourses,
    activeCourse?.id,
    activeWaypointFilter,
    medicalPlaces,
    stays,
    activeStayId,
    quests,
    activeQuestId,
    setSelectedPlace,
  ]);

  return null;
}
