import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "../../store/mapStore";
import { useCircleStore } from "../../store/circleStore";
import { useWellnessStore } from "../../store/wellnessStore";
import { useCircleData } from "../../hooks/useCircleData";
import { AuthButton } from "../auth/AuthButton";

// Mapbox GL JS v3 내부 인증/토큰 만료 에러 무력화 (공공 래스터 타일 사용 환경 보장)
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

// 무료/공공 오픈 래스터 지도 타일 소스 정의
const MAP_SOURCES = {
  // 1. 고해상도 위성 지도 (Esri World Imagery)
  satellite: {
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    tileSize: 256,
  },
  // 2. 일반 도로 지도 (CartoDB Voyager - 선명한 한글/도로망 지원)
  street: {
    tiles: [
      "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
    ],
    tileSize: 256,
  },
};

// Mapbox GL 기본 스타일 스키마 (배경 래스터 타일)
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

export function MapContainer() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapType, setMapType] = useState<"satellite" | "street">("satellite");

  // 스토어 구독
  const { center, zoom, bearing, setSelectedPlace } = useMapStore();
  const { color, fillOpacity } = useCircleStore();
  const { courses, activeCourseId, fetchSupabaseData } = useWellnessStore();

  // 커스텀 훅: 동심원 및 방사선 GeoJSON 연산 (useMemo 캐싱)
  const { circleFeatures, radialLines, distanceLabels } = useCircleData();

  // 현재 선택된 활성 코스
  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

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
      // (1) 동심원 GeoJSON 소스 & 레이어 등록
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

      // (2) 360도 방사선 소스 & 레이어 등록
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

      // (3) 실제 도로망 보행 경로(Routing Polyline) 소스 등록
      map.addSource("course-routes", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      // 보행 경로 외곽 글로우 효과
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

      // 보행 경로 메인 선
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

    // 줌 레벨에 따라 1km, 2km 거리 라벨 가시성 제어 (중앙 뭉침 완벽 방지)
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

  // 2. 위성 지도 / 일반 도로 지도 전환
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

  // 3. 동심원 데이터 및 스타일 실시간 업데이트
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

  // 4. 지도 중심 및 줌 이동 반응
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

  // 5. 마커 렌더링 (래퍼 분리하여 줌아웃 위치 흔들림 완벽 차단) 및 실제 도로망 경로선
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 기존 마커 클리어
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const routeFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];

    courses.forEach((course) => {
      const isSelected = course.id === activeCourseId;

      // 카카오맵 & 네이버 지도 길찾기 URL 생성 유틸
      const getKakaoLink = (name: string, lat: number, lng: number) =>
        `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
      const getNaverLink = (name: string, lat: number, lng: number) =>
        `https://map.naver.com/v5/directions/-/${lng},${lat},${encodeURIComponent(name)},,/walk`;

      // -------------------------------------------------------------
      // (A) 안심식당 마커: 래퍼(위치 고정) + 이너(비주얼 & 애니메이션) 분리
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

      const restPopup = new mapboxgl.Popup({ offset: 20, closeButton: true }).setHTML(`
        <div class="text-gray-900 p-2.5 max-w-[240px] font-sans">
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">안심식당</span>
            <span class="text-[10px] text-gray-500">${course.targetCondition.split(" ")[0]}</span>
          </div>
          <h4 class="font-bold text-sm text-gray-900">${course.restaurant.name}</h4>
          <p class="text-[11px] text-gray-600 mt-1 line-clamp-2">${course.restaurant.description}</p>
          <div class="mt-2 p-1.5 bg-emerald-50 rounded text-[10px] text-emerald-800 font-medium">
            💡 ${course.restaurant.healthBenefit}
          </div>
          <div class="mt-3 pt-2 border-t border-gray-100 flex items-center gap-1.5">
            <a
              href="${getKakaoLink(course.restaurant.name, course.restaurant.latitude, course.restaurant.longitude)}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold text-[10px] rounded-lg transition-all shadow-sm active:scale-95"
            >
              <span>🟡</span>
              <span>카카오 길찾기</span>
            </a>
            <a
              href="${getNaverLink(course.restaurant.name, course.restaurant.latitude, course.restaurant.longitude)}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-[10px] rounded-lg transition-all shadow-sm active:scale-95"
            >
              <span>🟢</span>
              <span>네이버 길찾기</span>
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
      // (B) 완만 산책로 마커: 래퍼(위치 고정) + 이너(비주얼 & 애니메이션) 분리
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
              href="${getKakaoLink(course.trail.name, course.trail.latitude, course.trail.longitude)}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold text-[10px] rounded-lg transition-all shadow-sm active:scale-95"
            >
              <span>🟡</span>
              <span>카카오 길찾기</span>
            </a>
            <a
              href="${getNaverLink(course.trail.name, course.trail.latitude, course.trail.longitude)}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-[10px] rounded-lg transition-all shadow-sm active:scale-95"
            >
              <span>🟢</span>
              <span>네이버 길찾기</span>
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
      }
    });

    // -------------------------------------------------------------
    // (D) 거리 라벨 마커 (4대 방위, 줌아웃 시 뭉침 방지 클래스 적용)
    // -------------------------------------------------------------
    distanceLabels.forEach((dl) => {
      const labelEl = document.createElement("div");
      labelEl.className = `distance-label-${dl.distance} text-[10px] bg-black/85 text-white px-1.5 py-0.5 rounded font-mono border border-emerald-500/50 shadow-md pointer-events-none transition-opacity duration-200`;
      labelEl.innerText = dl.label;

      const labelMarker = new mapboxgl.Marker({ element: labelEl, anchor: "center" })
        .setLngLat([dl.longitude, dl.latitude])
        .addTo(map);

      markersRef.current.push(labelMarker);
    });

    // 경로선 레이어 데이터 업데이트
    if (map.isStyleLoaded()) {
      const routeSource = map.getSource("course-routes") as mapboxgl.GeoJSONSource;
      if (routeSource) {
        routeSource.setData({
          type: "FeatureCollection",
          features: routeFeatures,
        });
      }
    }
  }, [courses, activeCourseId, distanceLabels]);

  return (
    <div className="relative w-full h-full">
      {/* 우측 상단 컨트롤 바 (인증 버튼 + 지도 전환 스위치) */}
      <div className="absolute top-4 right-16 z-20 flex items-center gap-2.5">
        <AuthButton />
        <div className="flex bg-gray-900/90 backdrop-blur-md border border-gray-700/60 rounded-xl p-1 shadow-2xl">
          <button
            onClick={() => handleChangeMapType("satellite")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mapType === "satellite"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🛰️ 위성 지도
          </button>
          <button
            onClick={() => handleChangeMapType("street")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mapType === "street"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🗺️ 일반 도로
          </button>
        </div>
      </div>

      {/* 지도 하단 보행 경로 요약 및 카카오/네이버 다이렉트 길찾기 바 */}
      {activeCourse && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-gray-900/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="text-base">🚶</span>
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>{activeCourse.restaurant.name}</span>
                <span className="text-emerald-400">➔</span>
                <span>{activeCourse.trail.name}</span>
              </div>
              <div className="text-[11px] text-gray-400">
                실제 보행로 거리: <strong className="text-emerald-400 font-semibold">{activeCourse.distanceMeters || 720}m</strong> • 도보 약 <strong className="text-teal-300 font-semibold">{activeCourse.walkMinutes}분</strong>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-gray-700/80 mx-1" />

          {/* 원클릭 길찾기 앱 버튼 그룹 */}
          <div className="flex items-center gap-1.5">
            <a
              href={`https://map.kakao.com/link/to/${encodeURIComponent(activeCourse.trail.name)},${activeCourse.trail.latitude},${activeCourse.trail.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold text-[11px] rounded-xl shadow-sm transition-all active:scale-95"
            >
              <span>🟡</span>
              <span>카카오맵 길찾기</span>
            </a>
            <a
              href={`https://map.naver.com/v5/directions/-/${activeCourse.trail.longitude},${activeCourse.trail.latitude},${encodeURIComponent(activeCourse.trail.name)},,/walk`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-[11px] rounded-xl shadow-sm transition-all active:scale-95"
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
