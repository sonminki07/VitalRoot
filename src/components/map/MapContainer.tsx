import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "../../store/mapStore";
import { useCircleStore } from "../../store/circleStore";
import { useWellnessStore } from "../../store/wellnessStore";
import { useCircleData } from "../../hooks/useCircleData";

// 무료/공공 오픈 래스터 지도 타일 소스 정의
const MAP_SOURCES = {
  // 1. 고해상도 위성 지도 (Esri World Imagery - 키 없이 전 세계 고화질 위성 사진 제공)
  satellite: {
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    tileSize: 256,
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
  // 2. 일반 도로 지도 (OpenStreetMap / CartoDB Voyager - 선명한 한글/도로망 지원)
  street: {
    tiles: [
      "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
    ],
    tileSize: 256,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  },
};

// Mapbox GL 기본 스타일 스키마 (외부 토큰 종속성 제거)
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
  const { center, zoom, pitch, bearing, setSelectedPlace } = useMapStore();
  const { color, fillOpacity } = useCircleStore();
  const { courses, activeCourseId, fetchSupabaseData } = useWellnessStore();

  // 커스텀 훅: 동심원 및 방사선 GeoJSON 연산 (useMemo 캐싱)
  const { circleFeatures, radialLines, distanceLabels } = useCircleData();

  // 1. 지도 초기화
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: BASE_STYLE,
      center: center,
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

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

      // (3) 코스 연결선 소스 & 레이어 등록
      map.addSource("course-routes", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "course-routes-line",
        type: "line",
        source: "course-routes",
        paint: {
          "line-color": "#38bdf8",
          "line-width": 4,
          "line-dasharray": [3, 1],
          "line-opacity": 0.95,
        },
      });
    });

    mapRef.current = map;

    // 초기 Supabase 데이터 연동 시도
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
      // 기존 레이어 및 소스 교체
      map.removeLayer("base-raster-layer");
      map.removeSource("base-raster-tiles");

      map.addSource("base-raster-tiles", {
        type: "raster",
        tiles: MAP_SOURCES[type].tiles,
        tileSize: 256,
      });

      // 동심원 레이어 아래에 배경 타일 배치
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
      speed: 1.2,
      curve: 1.4,
      essential: true,
    });
  }, [center, zoom]);

  // 5. 안심식당 & 산책로 마커 및 연결 경로 렌더링
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 기존 마커 클리어
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const routeFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];

    courses.forEach((course) => {
      const isSelected = course.id === activeCourseId;

      // 안심식당 마커 엘리먼트
      const restEl = document.createElement("div");
      restEl.className = `cursor-pointer flex items-center justify-center p-2 rounded-full shadow-2xl transition-all ${
        isSelected
          ? "bg-emerald-500 ring-4 ring-emerald-300 scale-125 z-10"
          : "bg-emerald-600/90 hover:scale-110"
      }`;
      restEl.innerHTML = `<span class="text-sm">🍽️</span>`;

      const restPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="text-gray-900 p-2 max-w-[210px]">
          <span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">안심식당</span>
          <h4 class="font-bold text-xs mt-1">${course.restaurant.name}</h4>
          <p class="text-[11px] text-gray-600 mt-1">${course.restaurant.description}</p>
          <p class="text-[10px] text-emerald-700 font-semibold mt-1">💡 ${course.restaurant.healthBenefit}</p>
        </div>
      `);

      const restMarker = new mapboxgl.Marker(restEl)
        .setLngLat([course.restaurant.longitude, course.restaurant.latitude])
        .setPopup(restPopup)
        .addTo(map);

      restEl.addEventListener("click", () => {
        setSelectedPlace(course.restaurant);
      });

      markersRef.current.push(restMarker);

      // 산책로 마커 엘리먼트
      const trailEl = document.createElement("div");
      trailEl.className = `cursor-pointer flex items-center justify-center p-2 rounded-full shadow-2xl transition-all ${
        isSelected
          ? "bg-teal-500 ring-4 ring-teal-300 scale-125 z-10"
          : "bg-teal-600/90 hover:scale-110"
      }`;
      trailEl.innerHTML = `<span class="text-sm">🚶</span>`;

      const trailPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="text-gray-900 p-2 max-w-[210px]">
          <span class="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold">완만 산책로</span>
          <h4 class="font-bold text-xs mt-1">${course.trail.name}</h4>
          <p class="text-[11px] text-gray-600 mt-1">${course.trail.description}</p>
          <p class="text-[10px] text-teal-700 font-semibold mt-1">🌿 ${course.trail.healthBenefit}</p>
        </div>
      `);

      const trailMarker = new mapboxgl.Marker(trailEl)
        .setLngLat([course.trail.longitude, course.trail.latitude])
        .setPopup(trailPopup)
        .addTo(map);

      trailEl.addEventListener("click", () => {
        setSelectedPlace(course.trail);
      });

      markersRef.current.push(trailMarker);

      // 선택된 코스의 경로선 추가
      if (isSelected) {
        routeFeatures.push({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [course.restaurant.longitude, course.restaurant.latitude],
              [course.trail.longitude, course.trail.latitude],
            ],
          },
        });
      }
    });

    // 거리 라벨 마커 (4대 방위)
    distanceLabels.forEach((dl) => {
      const labelEl = document.createElement("div");
      labelEl.className =
        "text-[10px] bg-black/80 text-white px-1.5 py-0.5 rounded font-mono border border-emerald-500/50 shadow-md pointer-events-none";
      labelEl.innerText = dl.label;

      const labelMarker = new mapboxgl.Marker({ element: labelEl, anchor: "center" })
        .setLngLat([dl.longitude, dl.latitude])
        .addTo(map);

      markersRef.current.push(labelMarker);
    });

    // 경로선 업데이트
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
      {/* 지도 타일 전환 스위치 (위성 vs 일반 도로 지도) */}
      <div className="absolute top-4 right-14 z-20 flex bg-gray-900/90 backdrop-blur-md border border-gray-700/60 rounded-xl p-1 shadow-xl">
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

      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
