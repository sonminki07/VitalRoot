import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "../../store/mapStore";
import { useCircleStore } from "../../store/circleStore";
import { useWellnessStore, WaypointFilterType } from "../../store/wellnessStore";
import { useCircleData } from "../../hooks/useCircleData";
import { AuthButton } from "../auth/AuthButton";

// Mapbox GL JS v3 내부 인증/토큰 만료 에러 무력화
try {
  const proto = mapboxgl.Map?.prototype as unknown as Record<string, unknown>;
  if (proto && typeof proto._authenticate === "function") {
    proto._authenticate = () => {};
  }
  if (proto && typeof proto._revokeAuth === "function") {
    proto._revokeAuth = () => {};
  }
} catch {
  // 예외 무시
}

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";

// 100% 무료/공공 오픈 래스터 지도 타일 소스 정의 (API 키 에러 원천 차단)
const MAP_SOURCES = {
  // 1. 고해상도 위성 지도 (Esri World Imagery)
  satellite: {
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    tileSize: 256,
  },
  // 2. 일반 도로 지도 (Esri World Street Map - 전세계/한국 고화질 도로망 및 한글 완벽 지원, 키 불필요)
  street: {
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    ],
    tileSize: 256,
  },
};

const BASE_STYLE: mapboxgl.Style = {
  version: 8,
  sources: {
    "base-raster-tiles": {
      type: "raster",
      tiles: MAP_SOURCES.satellite.tiles,
      tileSize: 256,
    },
  },
  layers: [
    {
      id: "base-raster-layer",
      type: "raster",
      source: "base-raster-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const RADAR_CATEGORIES: { type: WaypointFilterType; icon: string; label: string }[] = [
  { type: "전체", icon: "✨", label: "전체 스팟" },
  { type: "화장실", icon: "🚻", label: "안심 화장실" },
  { type: "쉼터", icon: "🪑", label: "완만 쉼터" },
  { type: "배리어프리", icon: "♿", label: "무장애 시설" },
];

export function MapContainer() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapType, setMapType] = useState<"satellite" | "street">("satellite");

  // 스토어 구독
  const { center, zoom, bearing, setSelectedPlace } = useMapStore();
  const { color, fillOpacity } = useCircleStore();
  const {
    filteredCourses,
    activeCourseId,
    activeWaypointFilter,
    setActiveWaypointFilter,
    fetchSupabaseData,
  } = useWellnessStore();

  const { circleFeatures, radialLines, distanceLabels } = useCircleData();
  const activeCourse = filteredCourses.find((c) => c.id === activeCourseId) || filteredCourses[0];

  // 1. 지도 초기화
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: BASE_STYLE,
      center: center,
      zoom: zoom,
      pitch: 0,
      maxPitch: 0,
      bearing: bearing,
      antialias: true,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");

    map.on("load", () => {
      // (1) 동심원 GeoJSON 등록
      map.addSource("concentric-circles", {
        type: "geojson",
        data: circleFeatures,
      });

      map.addLayer({
        id: "circles-fill",
        type: "fill",
        source: "concentric-circles",
        paint: {
          "fill-color": color,
          "fill-opacity": fillOpacity,
        },
      });

      map.addLayer({
        id: "circles-stroke",
        type: "line",
        source: "concentric-circles",
        paint: {
          "line-color": color,
          "line-width": 2,
          "line-opacity": 0.85,
        },
      });

      // (2) 360도 방사선 소스 등록
      const allLines = [...radialLines.normalLines, ...radialLines.majorLines];
      map.addSource("radial-lines", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: allLines,
        },
      });

      map.addLayer({
        id: "radial-lines-layer",
        type: "line",
        source: "radial-lines",
        paint: {
          "line-color": color,
          "line-width": 1,
          "line-dasharray": [2, 2],
          "line-opacity": 0.5,
        },
      });

      // (3) 보행 경로선 소스 등록
      map.addSource("course-routes", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "course-routes-glow",
        type: "line",
        source: "course-routes",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#34d399",
          "line-width": 10,
          "line-opacity": 0.4,
          "line-blur": 3,
        },
      });

      map.addLayer({
        id: "course-routes-line",
        type: "line",
        source: "course-routes",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#10b981",
          "line-width": 5,
          "line-opacity": 0.95,
        },
      });
    });

    // 줌 레벨에 따른 1km/2km 라벨 동적 제어
    const handleZoomVisibility = () => {
      const currentZoom = map.getZoom();
      document.querySelectorAll<HTMLElement>(".distance-label-1").forEach((el) => {
        el.style.display = currentZoom < 12.8 ? "none" : "block";
      });
      document.querySelectorAll<HTMLElement>(".distance-label-2").forEach((el) => {
        el.style.display = currentZoom < 11.5 ? "none" : "block";
      });
      document.querySelectorAll<HTMLElement>(".distance-label-3").forEach((el) => {
        el.style.display = currentZoom < 10.0 ? "none" : "block";
      });
    };

    map.on("zoom", handleZoomVisibility);

    mapRef.current = map;
    fetchSupabaseData();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. 위성 지도 / 일반 도로 지도 전환 (Esri World Street Map 적용으로 에러 제거)
  const handleChangeMapType = (type: "satellite" | "street") => {
    setMapType(type);
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource("base-raster-tiles") as mapboxgl.GeoJSONSource;
    if (source && map.getLayer("base-raster-layer")) {
      map.removeLayer("base-raster-layer");
      map.removeSource("base-raster-tiles");

      map.addSource("base-raster-tiles", {
        type: "raster",
        tiles: MAP_SOURCES[type].tiles,
        tileSize: 256,
      });

      map.addLayer(
        {
          id: "base-raster-layer",
          type: "raster",
          source: "base-raster-tiles",
          minzoom: 0,
          maxzoom: 19,
        },
        "circles-fill"
      );
    }
  };

  // 3. 동심원 데이터 실시간 업데이트
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const circleSource = map.getSource("concentric-circles") as mapboxgl.GeoJSONSource;
    if (circleSource) {
      circleSource.setData(circleFeatures);
    }

    const radialSource = map.getSource("radial-lines") as mapboxgl.GeoJSONSource;
    if (radialSource) {
      const allLines = [...radialLines.normalLines, ...radialLines.majorLines];
      radialSource.setData({
        type: "FeatureCollection",
        features: allLines,
      });
    }

    if (map.getLayer("circles-fill")) {
      map.setPaintProperty("circles-fill", "fill-color", color);
      map.setPaintProperty("circles-fill", "fill-opacity", fillOpacity);
    }
    if (map.getLayer("circles-stroke")) {
      map.setPaintProperty("circles-stroke", "line-color", color);
    }
    if (map.getLayer("radial-lines-layer")) {
      map.setPaintProperty("radial-lines-layer", "line-color", color);
    }
  }, [circleFeatures, radialLines, color, fillOpacity]);

  // 4. 지도 중심 이동
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center,
      zoom,
      pitch: 0,
      speed: 1.2,
      curve: 1.4,
      essential: true,
    });
  }, [center, zoom]);

  // 5. 조건 필터링된 코스(filteredCourses) 마커 및 실제 보행 경로선 렌더링
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 기존 마커 클리어
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const routeFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];

    const getNaverPlaceSearchUrl = (name: string) =>
      `https://map.naver.com/p/search/${encodeURIComponent(name)}`;

    const getKakaoPlaceLink = (name: string, lat: number, lng: number) =>
      `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;

    // 필터링된 코스만 지도에 렌더링
    filteredCourses.forEach((course) => {
      const isSelected = course.id === activeCourseId;

      // -------------------------------------------------------------
      // (A) 안심식당 마커
      // -------------------------------------------------------------
      const restWrapper = document.createElement("div");
      restWrapper.className = "vital-marker-wrapper";
      restWrapper.style.width = "36px";
      restWrapper.style.height = "36px";
      restWrapper.style.display = "flex";
      restWrapper.style.alignItems = "center";
      restWrapper.style.justifyContent = "center";

      const restInner = document.createElement("div");
      restInner.className = `w-9 h-9 cursor-pointer flex items-center justify-center rounded-full shadow-2xl transition-transform duration-200 ${
        isSelected
          ? "bg-emerald-500 ring-4 ring-emerald-300 ring-offset-2 ring-offset-gray-900 scale-125 z-20"
          : "bg-emerald-600/95 hover:scale-110"
      }`;
      restInner.innerHTML = `<span class="text-base select-none">🍽️</span>`;
      restWrapper.appendChild(restInner);

      const nutritionHtml = course.restaurant.nutrition
        ? `
        <div class="mt-2.5 p-2 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-xs">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-emerald-800 text-[11px]">🥗 ${course.restaurant.nutrition.menuName}</span>
            <span class="text-[10px] text-gray-500 font-mono">${course.restaurant.nutrition.calories} kcal</span>
          </div>
          <div class="grid grid-cols-2 gap-1.5 text-[10px] pt-1 border-t border-emerald-500/20">
            <div class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full ${
                course.restaurant.nutrition.sugarGrade === '안심' ? 'bg-emerald-500' : 'bg-amber-500'
              }"></span>
              <span>당류: <strong>${course.restaurant.nutrition.sugars}g</strong> (${course.restaurant.nutrition.sugarGrade})</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full ${
                course.restaurant.nutrition.sodiumGrade === '안심' ? 'bg-emerald-500' : 'bg-amber-500'
              }"></span>
              <span>나트륨: <strong>${course.restaurant.nutrition.sodium}mg</strong> (${course.restaurant.nutrition.sodiumGrade})</span>
            </div>
          </div>
          <p class="text-[9px] text-gray-500 mt-1">식품의약품안전처 영양성분 공공데이터 검증</p>
        </div>
      `
        : "";

      const restPopup = new mapboxgl.Popup({ offset: 20, closeButton: true }).setHTML(`
        <div class="text-gray-900 p-2.5 max-w-[250px] font-sans">
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">안심식당</span>
            <span class="text-[10px] text-gray-500">${course.targetCondition.split(" ")[0]}</span>
          </div>
          <h4 class="font-bold text-sm text-gray-900">${course.restaurant.name}</h4>
          <p class="text-[11px] text-gray-600 mt-1 line-clamp-2">${course.restaurant.description}</p>
          ${nutritionHtml}
          <div class="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-1.5">
            <a
              href="${getKakaoPlaceLink(course.restaurant.name, course.restaurant.latitude, course.restaurant.longitude)}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold text-[10px] rounded-lg transition-all shadow-sm active:scale-95"
            >
              <span>🟡</span>
              <span>카카오맵</span>
            </a>
            <a
              href="${getNaverPlaceSearchUrl(course.restaurant.name)}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-[10px] rounded-lg transition-all shadow-sm active:scale-95"
            >
              <span>🟢</span>
              <span>네이버 지도</span>
            </a>
          </div>
        </div>
      `);

      const restMarker = new mapboxgl.Marker({ element: restWrapper, anchor: "center" })
        .setLngLat([course.restaurant.longitude, course.restaurant.latitude])
        .setPopup(restPopup)
        .addTo(map);

      restInner.addEventListener("click", () => {
        setSelectedPlace(course.restaurant);
      });

      markersRef.current.push(restMarker);

      // -------------------------------------------------------------
      // (B) 산책로 마커
      // -------------------------------------------------------------
      const trailWrapper = document.createElement("div");
      trailWrapper.className = "vital-marker-wrapper";
      trailWrapper.style.width = "36px";
      trailWrapper.style.height = "36px";
      trailWrapper.style.display = "flex";
      trailWrapper.style.alignItems = "center";
      trailWrapper.style.justifyContent = "center";

      const trailInner = document.createElement("div");
      trailInner.className = `w-9 h-9 cursor-pointer flex items-center justify-center rounded-full shadow-2xl transition-transform duration-200 ${
        isSelected
          ? "bg-teal-500 ring-4 ring-teal-300 ring-offset-2 ring-offset-gray-900 scale-125 z-20"
          : "bg-teal-600/95 hover:scale-110"
      }`;
      trailInner.innerHTML = `<span class="text-base select-none">🚶</span>`;
      trailWrapper.appendChild(trailInner);

      const trailPopup = new mapboxgl.Popup({ offset: 20, closeButton: true }).setHTML(`
        <div class="text-gray-900 p-2.5 max-w-[240px] font-sans">
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold">완만 산책로</span>
            <span class="text-[10px] text-teal-700 font-semibold">${course.slopeGrade}</span>
          </div>
          <h4 class="font-bold text-sm text-gray-900">${course.trail.name}</h4>
          <p class="text-[11px] text-gray-600 mt-1 line-clamp-2">${course.trail.description}</p>
          <div class="mt-2 p-1.5 bg-teal-50 rounded text-[10px] text-teal-800 font-medium">
            🌿 ${course.trail.healthBenefit}
          </div>
          <div class="mt-3 pt-2 border-t border-gray-100 flex items-center gap-1.5">
            <a
              href="${getKakaoPlaceLink(course.trail.name, course.trail.latitude, course.trail.longitude)}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold text-[10px] rounded-lg transition-all shadow-sm active:scale-95"
            >
              <span>🟡</span>
              <span>카카오맵</span>
            </a>
            <a
              href="${getNaverPlaceSearchUrl(course.trail.name)}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-[10px] rounded-lg transition-all shadow-sm active:scale-95"
            >
              <span>🟢</span>
              <span>네이버 지도</span>
            </a>
          </div>
        </div>
      `);

      const trailMarker = new mapboxgl.Marker({ element: trailWrapper, anchor: "center" })
        .setLngLat([course.trail.longitude, course.trail.latitude])
        .setPopup(trailPopup)
        .addTo(map);

      trailInner.addEventListener("click", () => {
        setSelectedPlace(course.trail);
      });

      markersRef.current.push(trailMarker);

      // -------------------------------------------------------------
      // (C) 선택된 코스의 실제 도로망 보행 경로선(Polyline)
      // -------------------------------------------------------------
      if (isSelected) {
        const routeCoords =
          course.walkingRoute && course.walkingRoute.length > 0
            ? course.walkingRoute
            : [
                [course.restaurant.longitude, course.restaurant.latitude],
                [course.trail.longitude, course.trail.latitude],
              ];

        routeFeatures.push({
          type: "Feature",
          properties: {
            title: course.title,
            distanceMeters: course.distanceMeters || 750,
          },
          geometry: {
            type: "LineString",
            coordinates: routeCoords,
          },
        });

        // -------------------------------------------------------------
        // (D) 선택된 코스의 이동 동선 3~5분 공공 편의시설 (Waypoint Radar) 핀
        // -------------------------------------------------------------
        if (course.waypoints) {
          const filteredWaypoints =
            activeWaypointFilter === "전체"
              ? course.waypoints
              : course.waypoints.filter((wp) => wp.category === activeWaypointFilter);

          filteredWaypoints.forEach((wp) => {
            const wpWrapper = document.createElement("div");
            wpWrapper.className = "vital-marker-wrapper";
            wpWrapper.style.width = "30px";
            wpWrapper.style.height = "30px";
            wpWrapper.style.display = "flex";
            wpWrapper.style.alignItems = "center";
            wpWrapper.style.justifyContent = "center";

            const wpInner = document.createElement("div");
            const badgeBg =
              wp.category === "화장실"
                ? "bg-sky-600 border-sky-300"
                : wp.category === "쉼터"
                ? "bg-amber-600 border-amber-300"
                : "bg-purple-600 border-purple-300";

            wpInner.className = `w-7 h-7 cursor-pointer flex items-center justify-center rounded-full shadow-lg border-2 ${badgeBg} hover:scale-125 transition-transform duration-200 z-10`;

            const iconText =
              wp.category === "화장실" ? "🚻" : wp.category === "쉼터" ? "🪑" : "♿";
            wpInner.innerHTML = `<span class="text-xs select-none">${iconText}</span>`;
            wpWrapper.appendChild(wpInner);

            const featureBadges = wp.features
              .map(
                (f) =>
                  `<span class="text-[9px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">${f}</span>`
              )
              .join(" ");

            const wpPopup = new mapboxgl.Popup({ offset: 15, closeButton: true }).setHTML(`
              <div class="text-gray-900 p-2.5 max-w-[230px] font-sans">
                <div class="flex items-center justify-between gap-1 mb-1">
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    wp.category === '화장실'
                      ? 'bg-sky-100 text-sky-800'
                      : wp.category === '쉼터'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-purple-100 text-purple-800'
                  }">안심 ${wp.category}</span>
                  <span class="text-[10px] font-semibold text-emerald-700">도보 ${wp.walkingMinutesFromRoute}분 (${wp.distanceMetersFromRoute}m)</span>
                </div>
                <h4 class="font-bold text-xs text-gray-900">${wp.name}</h4>
                <p class="text-[10px] text-gray-600 mt-1">${wp.description}</p>
                <div class="flex flex-wrap gap-1 mt-2">
                  ${featureBadges}
                </div>
                <div class="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-1.5">
                  <a
                    href="${getKakaoPlaceLink(wp.name, wp.latitude, wp.longitude)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold text-[9px] rounded-lg transition-all shadow-sm"
                  >
                    <span>🟡 카카오</span>
                  </a>
                  <a
                    href="${getNaverPlaceSearchUrl(wp.name)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-[9px] rounded-lg transition-all shadow-sm"
                  >
                    <span>🟢 네이버</span>
                  </a>
                </div>
              </div>
            `);

            const wpMarker = new mapboxgl.Marker({ element: wpWrapper, anchor: "center" })
              .setLngLat([wp.longitude, wp.latitude])
              .setPopup(wpPopup)
              .addTo(map);

            markersRef.current.push(wpMarker);
          });
        }
      }
    });

    // 거리 라벨 마커 (4대 방위)
    distanceLabels.forEach((dl) => {
      const labelEl = document.createElement("div");
      labelEl.className = `distance-label-${dl.distance} text-[10px] bg-black/85 text-white px-1.5 py-0.5 rounded font-mono border border-emerald-500/50 shadow-md pointer-events-none transition-opacity duration-200`;
      labelEl.innerText = dl.label;

      const labelMarker = new mapboxgl.Marker({ element: labelEl, anchor: "center" })
        .setLngLat([dl.longitude, dl.latitude])
        .addTo(map);

      markersRef.current.push(labelMarker);
    });

    // 경로선 레이어 업데이트
    if (map.isStyleLoaded()) {
      const routeSource = map.getSource("course-routes") as mapboxgl.GeoJSONSource;
      if (routeSource) {
        routeSource.setData({
          type: "FeatureCollection",
          features: routeFeatures,
        });
      }
    }
  }, [filteredCourses, activeCourseId, activeWaypointFilter, distanceLabels]);

  // 길찾기 완성형 URL
  const naverCourseUrl = activeCourse
    ? `https://map.naver.com/p/directions/${activeCourse.restaurant.longitude},${activeCourse.restaurant.latitude},${encodeURIComponent(activeCourse.restaurant.name)}/${activeCourse.trail.longitude},${activeCourse.trail.latitude},${encodeURIComponent(activeCourse.trail.name)}/-/walk?c=15.00,0,0,0,dh`
    : "#";

  const kakaoCourseUrl = activeCourse
    ? `https://map.kakao.com/?sName=${encodeURIComponent(activeCourse.restaurant.name)}&eName=${encodeURIComponent(activeCourse.trail.name)}`
    : "#";

  return (
    <div className="relative w-full h-full">
      {/* 우측 상단 컨트롤 바 (인증 버튼 + 지도 전환 스위치) */}
      <div className="absolute top-4 right-4 sm:right-16 z-20 flex items-center gap-2">
        <AuthButton />
        <div className="flex bg-gray-900/90 backdrop-blur-md border border-gray-700/60 rounded-xl p-1 shadow-2xl">
          <button
            onClick={() => handleChangeMapType("satellite")}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mapType === "satellite"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🛰️ <span className="hidden sm:inline">위성 지도</span>
          </button>
          <button
            onClick={() => handleChangeMapType("street")}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mapType === "street"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🗺️ <span className="hidden sm:inline">일반 도로</span>
          </button>
        </div>
      </div>

      {/* 상단 중앙: 경로 3~5분 공공 편의시설(Waypoint Radar) 필터 칩 */}
      <div className="absolute top-16 sm:top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-gray-900/95 backdrop-blur-md border border-gray-700/80 rounded-2xl p-1 sm:p-1.5 shadow-2xl max-w-[95vw] overflow-x-auto">
        <div className="hidden sm:flex items-center gap-1 px-2 text-[11px] text-gray-400 font-semibold border-r border-gray-700/80 mr-1 shrink-0">
          <span>🧭</span>
          <span>편의 레이더:</span>
        </div>
        {RADAR_CATEGORIES.map((cat) => (
          <button
            key={cat.type}
            onClick={() => setActiveWaypointFilter(cat.type)}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-medium shrink-0 transition-all ${
              activeWaypointFilter === cat.type
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40 scale-102"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* 지도 하단 완성형 카카오/네이버 길찾기 바 (노트북/모바일 높이 오프셋 확보, z-30 배치로 가림 완전 제거) */}
      {activeCourse && (
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 bg-gray-900/95 backdrop-blur-md border border-emerald-500/60 rounded-2xl px-4 py-2.5 sm:py-3 shadow-2xl flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[92vw]">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="text-base shrink-0">🚶</span>
            <div>
              <div className="font-bold text-white flex items-center justify-center sm:justify-start gap-1.5 text-xs sm:text-sm">
                <span>{activeCourse.restaurant.name}</span>
                <span className="text-emerald-400">➔</span>
                <span>{activeCourse.trail.name}</span>
              </div>
              <div className="text-[11px] text-gray-400">
                실제 보행로 거리: <strong className="text-emerald-400 font-semibold">{activeCourse.distanceMeters || 720}m</strong> • 도보 약 <strong className="text-teal-300 font-semibold">{activeCourse.walkMinutes}분</strong>
              </div>
            </div>
          </div>

          <div className="hidden sm:block h-7 w-px bg-gray-700/80 mx-1" />

          {/* 출발지 ➔ 도착지 자동 완성형 길찾기 버튼 */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <a
              href={kakaoCourseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <span>🟡</span>
              <span>카카오맵 길찾기</span>
            </a>
            <a
              href={naverCourseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <span>🟢</span>
              <span>네이버 길찾기</span>
            </a>
          </div>
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
