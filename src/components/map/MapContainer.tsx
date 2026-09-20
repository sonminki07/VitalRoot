import { useEffect, useRef, useState } from "react";
import { useWellnessStore, WaypointFilterType } from "../../store/wellnessStore";
import { useMapStore } from "../../store/mapStore";
import { AuthButton } from "../auth/AuthButton";
import {
  fetchPedestrianRoute,
  calculateDistanceMeters,
} from "../../utils/pedestrianRouter";
import { getNaverMapDetailUrl } from "../../utils/naverMapUtils";

const RADAR_CATEGORIES: { type: WaypointFilterType; label: string; icon: string }[] = [
  { type: "전체", label: "전체", icon: "🌐" },
  { type: "화장실", label: "안심 화장실", icon: "🚻" },
  { type: "쉼터", label: "완만 쉼터", icon: "🪑" },
  { type: "배리어프리", label: "무장애 시설", icon: "♿" },
];

function formatDistance(meters: number, unit: "auto" | "km" | "m"): string {
  if (unit === "km" || (unit === "auto" && meters >= 1000)) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${meters}m`;
}

export function MapContainer() {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const polylineRef = useRef<naver.maps.Polyline | null>(null);
  const userConnectorPolylineRef = useRef<naver.maps.Polyline | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const userMarkerRef = useRef<naver.maps.Marker | null>(null);
  const infoWindowRef = useRef<naver.maps.InfoWindow | null>(null);

  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // 스토어 구독
  const {
    filteredCourses,
    activeCourseId,
    activeWaypointFilter,
    setActiveWaypointFilter,
    stays,
    activeStayId,
    quests,
    activeQuestId,
    userLocation,
    setUserLocation,
    setIsLocationModalOpen,
    isPinningHome,
    setIsPinningHome,
    mapType: storeMapType,
    setMapType: setStoreMapType,
    distanceUnit,
    toggleDistanceUnit,
    saveCustomCourse,
    isOnboardingModalOpen,
    isSettingsModalOpen,
  } = useWellnessStore();

  const isModalActive = isOnboardingModalOpen || isSettingsModalOpen;

  const { center, zoom, setSelectedPlace, flyToPlace } = useMapStore();

  const activeCourse =
    filteredCourses.find((c) => c.id === activeCourseId) || filteredCourses[0];

  // 실제 도로망 보행자 좌표셋 상태
  const [roadRouteCoords, setRoadRouteCoords] = useState<[number, number][]>([]);
  const [userToRestCoords, setUserToRestCoords] = useState<[number, number][]>([]);
  const [actualWalkDistance, setActualWalkDistance] = useState<number>(
    activeCourse?.distanceMeters || 750
  );

  // 전역 인포윈도우 닫기 함수 바인딩
  useEffect(() => {
    (window as any).__closeVitalInfoWindow = () => {
      infoWindowRef.current?.close();
    };
    return () => {
      delete (window as any).__closeVitalInfoWindow;
    };
  }, []);

  // 지도 클릭 이벤트 (내 집 핀 찍기 모드)
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    const map = mapRef.current;

    const clickListener = window.naver.maps.Event.addListener(
      map,
      "click",
      (e: any) => {
        if (isPinningHome) {
          const lat = e.coord.lat();
          const lng = e.coord.lng();
          setUserLocation({ latitude: lat, longitude: lng });
          setIsPinningHome(false);
          flyToPlace(lng, lat, 15);
        }
      }
    );

    if (mapElementRef.current) {
      mapElementRef.current.style.cursor = isPinningHome ? "crosshair" : "default";
    }

    return () => {
      window.naver.maps.Event.removeListener(clickListener);
    };
  }, [isPinningHome, isMapLoaded]);

  // 커스텀 이벤트 (팝업에서 재핀 찍기 요청 시)
  useEffect(() => {
    const handleRepin = () => setIsPinningHome(true);
    window.addEventListener("vital-repin-home", handleRepin);
    return () => window.removeEventListener("vital-repin-home", handleRepin);
  }, []);

  // 🗺️ 내 위치(출발지) + 식당 + 산책로 전체 경로 맞춤 포커스 (fitBounds)
  const fitCourseAndHomeBounds = (animate = true) => {
    if (!mapRef.current || !window.naver?.maps || !activeCourse) return;
    const map = mapRef.current;

    const baseLat = userLocation ? userLocation.latitude : activeCourse.restaurant.latitude;
    const baseLng = userLocation ? userLocation.longitude : activeCourse.restaurant.longitude;
    const bounds = new window.naver.maps.LatLngBounds(
      new window.naver.maps.LatLng(baseLat, baseLng),
      new window.naver.maps.LatLng(baseLat, baseLng)
    );

    bounds.extend(new window.naver.maps.LatLng(activeCourse.restaurant.latitude, activeCourse.restaurant.longitude));
    bounds.extend(new window.naver.maps.LatLng(activeCourse.trail.latitude, activeCourse.trail.longitude));

    if (userLocation) {
      bounds.extend(new window.naver.maps.LatLng(userLocation.latitude, userLocation.longitude));
    }

    if (roadRouteCoords && roadRouteCoords.length > 0) {
      roadRouteCoords.forEach(([lng, lat]) => {
        bounds.extend(new window.naver.maps.LatLng(lat, lng));
      });
    }

    if (userToRestCoords && userToRestCoords.length > 0) {
      userToRestCoords.forEach(([lng, lat]) => {
        bounds.extend(new window.naver.maps.LatLng(lat, lng));
      });
    }

    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 640;
    const padding = {
      top: 80,
      right: 60,
      bottom: 140,
      left: isDesktop ? (window.innerWidth >= 1024 ? 420 : 370) : 30,
    };

    if (animate && typeof (map as any).panToBounds === "function") {
      (map as any).panToBounds(bounds, padding);
    } else {
      map.fitBounds(bounds, padding);
    }
  };

  // 1. 네이버 지도 스크립트 대기 및 지도 인스턴스 초기화
  useEffect(() => {
    let checkInterval: number | undefined;

    const initNaverMap = () => {
      if (!window.naver || !window.naver.maps || !mapElementRef.current) return;

      const initialLat = userLocation
        ? userLocation.latitude
        : activeCourse
        ? activeCourse.restaurant.latitude
        : center[1];
      const initialLng = userLocation
        ? userLocation.longitude
        : activeCourse
        ? activeCourse.restaurant.longitude
        : center[0];
      const initialCenter = new window.naver.maps.LatLng(initialLat, initialLng);

      const map = new window.naver.maps.Map(mapElementRef.current, {
        center: initialCenter,
        zoom: Math.round(zoom || 14),
        minZoom: 10,
        maxZoom: 19,
        mapTypeId:
          storeMapType === "HYBRID"
            ? window.naver.maps.MapTypeId.HYBRID
            : window.naver.maps.MapTypeId.NORMAL,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT,
        },
        scaleControl: true,
        logoControl: false,
        mapDataControl: false,
      });

      infoWindowRef.current = new window.naver.maps.InfoWindow({
        content: "",
        backgroundColor: "transparent",
        borderColor: "transparent",
        borderWidth: 0,
        disableAnchor: true,
      });

      mapRef.current = map;
      setIsMapLoaded(true);

      setTimeout(() => {
        fitCourseAndHomeBounds(false);
      }, 200);
    };

    if (window.naver && window.naver.maps) {
      initNaverMap();
    } else {
      checkInterval = window.setInterval(() => {
        if (window.naver && window.naver.maps) {
          clearInterval(checkInterval);
          initNaverMap();
        }
      }, 200);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  // 코스 또는 내 위치 변경 시 지도 뷰포트 자동 맞춤
  useEffect(() => {
    if (!isMapLoaded) return;
    const timer = setTimeout(() => {
      fitCourseAndHomeBounds(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [activeCourse?.id, userLocation?.latitude, userLocation?.longitude]);

  // 2. 일반 지도 / 위성 지도(HYBRID) 전환 (스토어 및 로컬스토리지 영속화)
  const handleChangeMapType = (type: "satellite" | "street") => {
    const nextType = type === "satellite" ? "HYBRID" : "NORMAL";
    setStoreMapType(nextType);
    if (!mapRef.current || !window.naver?.maps) return;
    mapRef.current.setMapTypeId(
      nextType === "HYBRID"
        ? window.naver.maps.MapTypeId.HYBRID
        : window.naver.maps.MapTypeId.NORMAL
    );
  };

  // 스토어의 mapType 변경 감지 시 지도 타입 동기화
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    mapRef.current.setMapTypeId(
      storeMapType === "HYBRID"
        ? window.naver.maps.MapTypeId.HYBRID
        : window.naver.maps.MapTypeId.NORMAL
    );
  }, [storeMapType]);

  // 3. 지도 뷰포트 센터 및 줌 연동 (flyTo - morph로 부드러운 위치/줌 동시 이동)
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    const targetLatLng = new window.naver.maps.LatLng(center[1], center[0]);
    const targetZoom = Math.round(zoom || 14);

    if (typeof (mapRef.current as any).morph === "function") {
      (mapRef.current as any).morph(targetLatLng, targetZoom, { duration: 600 });
    } else {
      mapRef.current.panTo(targetLatLng, { duration: 500 });
      if (mapRef.current.getZoom() !== targetZoom) {
        mapRef.current.setZoom(targetZoom);
      }
    }
  }, [center, zoom]);

  // 4. 활성 코스의 보행로 렌더링 (공공 도로망 라우터 100% 호출 - 건물/산/물 관통 원천 배제)
  useEffect(() => {
    if (!activeCourse) return;

    let isMounted = true;
    fetchPedestrianRoute(
      activeCourse.restaurant.longitude,
      activeCourse.restaurant.latitude,
      activeCourse.trail.longitude,
      activeCourse.trail.latitude
    ).then((res) => {
      if (isMounted) {
        setRoadRouteCoords(res.coordinates);
        setActualWalkDistance(res.distanceMeters);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeCourse?.id]);

  // 5. 사용자 현재 위치 ➔ 안심식당까지의 실제 도로망 보행로 OSRM 조회 (식당 마커 완벽 스냅)
  useEffect(() => {
    if (!userLocation || !activeCourse) {
      setUserToRestCoords([]);
      return;
    }

    // 직선 거리가 15km 초과인 경우 (예: 안산에서 서울 코스 선택 시) 고속도로를 가로지르는 비정상적인 점선 연결 차단
    const distToRest = calculateDistanceMeters(
      userLocation.latitude,
      userLocation.longitude,
      activeCourse.restaurant.latitude,
      activeCourse.restaurant.longitude
    );
    if (distToRest > 15000) {
      setUserToRestCoords([]);
      return;
    }

    let isMounted = true;
    fetchPedestrianRoute(
      userLocation.longitude,
      userLocation.latitude,
      activeCourse.restaurant.longitude,
      activeCourse.restaurant.latitude
    ).then((res) => {
      if (isMounted) {
        const coords = [...res.coordinates];
        // 종점을 식당 마커 좌표에 정확히 스냅
        if (coords.length > 0) {
          coords[coords.length - 1] = [
            activeCourse.restaurant.longitude,
            activeCourse.restaurant.latitude,
          ];
        }
        setUserToRestCoords(coords);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userLocation, activeCourse?.id]);

  // 6. 보행 경로선 (Polyline) 네이버 지도에 렌더링
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    const map = mapRef.current;

    // (A) 코스 보행로 (식당 ➔ 산책로, 실제 도로를 따라 꺾어지는 에메랄드 라인)
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (roadRouteCoords.length > 0) {
      const path = roadRouteCoords.map(
        ([lng, lat]) => new window.naver.maps.LatLng(lat, lng)
      );

      polylineRef.current = new window.naver.maps.Polyline({
        map,
        path,
        strokeColor: "#10b981",
        strokeWeight: 6,
        strokeOpacity: 0.95,
        strokeLineCap: "round",
        strokeLineJoin: "round",
      });
    }

    // (B) 사용자 위치 ➔ 식당 연결 보행로 (스카이블루 실선 도로망 길찾기)
    if (userConnectorPolylineRef.current) {
      userConnectorPolylineRef.current.setMap(null);
      userConnectorPolylineRef.current = null;
    }

    if (userToRestCoords.length > 0) {
      const userPath = userToRestCoords.map(
        ([lng, lat]) => new window.naver.maps.LatLng(lat, lng)
      );

      userConnectorPolylineRef.current = new window.naver.maps.Polyline({
        map,
        path: userPath,
        strokeColor: "#0284c7",
        strokeWeight: 6,
        strokeOpacity: 0.95,
        strokeLineCap: "round",
        strokeLineJoin: "round",
      });
    }
  }, [isMapLoaded, roadRouteCoords, userToRestCoords]);

  // 7. 마커 렌더링 (내 위치, 안심식당, 산책로, 공공편의시설, 숙소, 퀘스트)
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    const map = mapRef.current;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    // 📍 (0) 1단계: 사용자 출발지 캡슐 뱃지
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
          <div class="text-gray-900 p-3 max-w-[240px] font-sans bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-sky-500/50">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">① 출발 지점</span>
            </div>
            <h4 class="font-bold text-xs text-gray-900 mt-1">📍 내 위치 (출발지)</h4>
            <p class="text-[11px] text-gray-600 mt-0.5">이 위치에서 출발하여 안심식당으로 이동하는 보행 코스입니다.</p>
            <div class="mt-2.5 pt-2 border-t border-gray-100">
              <button
                onclick="window.dispatchEvent(new CustomEvent('vital-repin-home'))"
                class="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold text-center shadow transition-all"
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

      // 2단계: 안심식당 캡슐 뱃지
      const restContent = document.createElement("div");
      restContent.className = "vital-journey-marker cursor-pointer flex flex-col items-center select-none";
      
      const restStepNum = userLocation ? "2" : "1";
      const restStepLabel = userLocation ? "식사" : "출발";

      if (isSelected) {
        restContent.innerHTML = `
          <div class="-translate-x-1/2 -translate-y-full flex flex-col items-center select-none pointer-events-auto">
            <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/95 border-2 border-emerald-400 shadow-2xl text-white text-xs font-bold whitespace-nowrap scale-110 z-30 transition-transform">
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
        zIndex: isSelected ? 120 : 30,
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

        const popupContent = `
          <div class="relative text-white p-3.5 max-w-[270px] font-sans bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-500/50 animate-in fade-in zoom-in-95 duration-150">
            <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2.5 right-2.5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs font-bold transition-colors">✕</button>
            <div class="flex items-center justify-between gap-1 mb-1 pr-6">
              <span class="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">안심식당</span>
              <span class="text-[10px] text-gray-400 font-medium">${course.targetCondition.split(" ")[0]}</span>
            </div>
            <h4 class="font-bold text-sm text-white leading-snug">${course.restaurant.name}</h4>
            <p class="text-[11px] text-gray-300 mt-1 line-clamp-2">${course.restaurant.description}</p>
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

      // 3단계: 완만 산책로 캡슐 뱃지
      const trailContent = document.createElement("div");
      trailContent.className = "vital-journey-marker cursor-pointer flex flex-col items-center select-none";

      const trailStepNum = userLocation ? "3" : "2";

      if (isSelected) {
        trailContent.innerHTML = `
          <div class="-translate-x-1/2 -translate-y-full flex flex-col items-center select-none pointer-events-auto">
            <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/95 border-2 border-rose-400 shadow-2xl text-white text-xs font-bold whitespace-nowrap scale-110 z-30 transition-transform">
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
        zIndex: isSelected ? 120 : 30,
      });

      window.naver.maps.Event.addListener(trailMarker, "click", () => {
        setSelectedPlace(course.trail);

        const naverSearchUrl = getNaverMapDetailUrl(course.trail);

        const popupContent = `
          <div class="relative text-white p-3.5 max-w-[270px] font-sans bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-teal-500/50 animate-in fade-in zoom-in-95 duration-150">
            <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2.5 right-2.5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs font-bold transition-colors">✕</button>
            <div class="flex items-center justify-between gap-1 mb-1 pr-6">
              <span class="text-[10px] bg-teal-950 text-teal-300 border border-teal-500/40 px-1.5 py-0.5 rounded font-bold">완만 산책로</span>
              <span class="text-[10px] text-teal-300 font-semibold">${course.slopeGrade}</span>
            </div>
            <h4 class="font-bold text-sm text-white leading-snug">${course.trail.name}</h4>
            <p class="text-[11px] text-gray-300 mt-1 line-clamp-2">${course.trail.description}</p>
            <div class="mt-2 p-1.5 bg-teal-950/60 border border-teal-500/30 rounded-lg text-[10px] text-teal-200 font-medium">
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

      // 선택된 코스의 이동 동선 3~5분 공공 편의시설 핀
      if (isSelected && course.waypoints) {
        const filteredWaypoints =
          activeWaypointFilter === "전체"
            ? course.waypoints
            : course.waypoints.filter((wp) => wp.category === activeWaypointFilter);

        filteredWaypoints.forEach((wp) => {
          const wpContent = document.createElement("div");
          wpContent.className = "vital-marker-wrapper cursor-pointer";

          const badgeBg =
            wp.category === "화장실"
              ? "bg-sky-600 border-sky-300"
              : wp.category === "쉼터"
              ? "bg-amber-600 border-amber-300"
              : "bg-purple-600 border-purple-300";

          const iconText =
            wp.category === "화장실" ? "🚻" : wp.category === "쉼터" ? "🪑" : "♿";

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

            const popupContent = `
              <div class="relative text-white p-3 max-w-[260px] font-sans bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/80 animate-in fade-in zoom-in-95 duration-150">
                <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2 right-2 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs font-bold transition-colors">✕</button>
                <div class="flex items-center justify-between gap-1 mb-1 pr-6">
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    wp.category === "화장실"
                      ? "bg-sky-950 text-sky-300 border border-sky-500/40"
                      : wp.category === "쉼터"
                      ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                      : "bg-purple-950 text-purple-300 border border-purple-500/40"
                  }">안심 ${wp.category}</span>
                  <span class="text-[10px] font-semibold text-emerald-400">도보 ${wp.walkingMinutesFromRoute}분 (${wp.distanceMetersFromRoute}m)</span>
                </div>
                <h4 class="font-bold text-xs text-white">${wp.name}</h4>
                <p class="text-[10px] text-gray-300 mt-1">${wp.description}</p>
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

        const popupContent = `
          <div class="relative text-white p-3 max-w-[260px] font-sans bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-teal-500/50 animate-in fade-in zoom-in-95 duration-150">
            <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2 right-2 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs font-bold transition-colors">✕</button>
            <div class="flex items-center justify-between gap-1 mb-1 pr-6">
              <span class="text-[10px] bg-teal-950 text-teal-300 border border-teal-500/40 font-bold px-1.5 py-0.5 rounded">안심 숙소</span>
            </div>
            <h4 class="font-bold text-xs text-white mt-1">${stay.name}</h4>
            <p class="text-[10px] text-gray-300 mt-0.5">${stay.description}</p>
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

        const popupContent = `
          <div class="text-gray-900 p-2.5 max-w-[240px] font-sans bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-purple-500/40">
            <span class="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">관광명소 퀘스트</span>
            <h4 class="font-bold text-xs text-gray-900 mt-1">${quest.landmarkName}</h4>
            <p class="text-[10px] text-gray-600 mt-0.5">${quest.description}</p>
            <div class="mt-2 p-1.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-900 font-bold flex items-center gap-1">
              <span>🏅 칭호:</span>
              <span>${quest.titleReward}</span>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-100">
              <a
                href="${naverSearchUrl}"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full flex items-center justify-center gap-1 py-1 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-[10px] rounded-lg transition-all"
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

      markersRef.current.push(questMarker);
    });
  }, [
    isMapLoaded,
    userLocation,
    filteredCourses,
    activeCourse?.id,
    activeWaypointFilter,
    stays,
    activeStayId,
    quests,
    activeQuestId,
    setSelectedPlace,
  ]);

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

  // 1) 식당 ➔ 산책로 코스 도보 길찾기 (검증된 웰니스 완보 구간 - 네이버 지도 100% 도보 모드)
  const naverRestToTrailUrl = activeCourse
    ? `https://map.naver.com/p/directions/${activeCourse.restaurant.longitude},${activeCourse.restaurant.latitude},${encodeURIComponent(
        activeCourse.restaurant.name
      )}/${activeCourse.trail.longitude},${activeCourse.trail.latitude},${encodeURIComponent(
        activeCourse.trail.name
      )}/-/walk?c=15.00,0,0,0,dh`
    : "#";

  // 2) 내 위치 ➔ 식당 도보 길찾기 (2개 지점 순수 도보)
  const naverUserToRestWalkUrl = userLocation && activeCourse
    ? `https://map.naver.com/p/directions/${userLocation.longitude},${userLocation.latitude},${encodeURIComponent(
        "내 위치"
      )}/${activeCourse.restaurant.longitude},${activeCourse.restaurant.latitude},${encodeURIComponent(
        activeCourse.restaurant.name
      )}/-/walk?c=15.00,0,0,0,dh`
    : "#";

  // 3) 내 위치 ➔ 식당 대중교통 길찾기 (400m 초과 시 제공)
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
    <div className="relative w-full h-full">
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

      {/* 우측 상단 컨트롤 바 (전체 경로 맞춤 + 내 위치 찾기 + 집 핀 찍기 + 인증 버튼 + 일반/위성 전환 스위치) */}
      <div className="absolute top-4 right-3 sm:right-14 z-20 flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 max-w-[calc(100vw-420px)]">
        {/* 전체 경로 한눈에 보기 맞춤 버튼 */}
        <button
          onClick={() => fitCourseAndHomeBounds(true)}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl transition-all active:scale-95 bg-gray-900/90 hover:bg-gray-800 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40"
          title="내 위치와 선택된 코스 전체를 화면 한눈에 포커스합니다."
        >
          <span>⛶</span>
          <span className="hidden xl:inline">전체 경로 맞춤</span>
          <span className="xl:hidden">맞춤</span>
        </button>

        {/* 내 위치 기반 찾기 버튼 */}
        <button
          onClick={() => setIsLocationModalOpen(true)}
          className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl transition-all active:scale-95 ${
            userLocation
              ? "bg-sky-600 hover:bg-sky-500 text-white border border-sky-400/50"
              : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 animate-pulse"
          }`}
        >
          <span>📍</span>
          <span className="hidden xl:inline">
            {userLocation ? "내 위치 재설정" : "내 위치 코스 찾기"}
          </span>
          <span className="xl:hidden">내 위치</span>
        </button>

        {/* 내 집 핀 찍기 버튼 */}
        <button
          onClick={() => setIsPinningHome(!isPinningHome)}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-xl transition-all active:scale-95 border ${
            isPinningHome
              ? "bg-amber-500 text-gray-950 border-amber-300 animate-pulse ring-2 ring-amber-400"
              : "bg-gray-900/90 text-amber-300 hover:text-white border-amber-500/40 hover:bg-gray-800"
          }`}
          title="지도 화면을 직접 클릭하여 내 집(출발지) 위치를 지정합니다."
        >
          <span>🎯</span>
          <span className="hidden xl:inline">
            {isPinningHome ? "지도 클릭 대기중..." : "집 핀 찍기"}
          </span>
          <span className="xl:hidden">집 핀</span>
        </button>

        <AuthButton />

        <div className="flex bg-gray-900/90 backdrop-blur-md border border-gray-700/60 rounded-xl p-0.5 sm:p-1 shadow-2xl">
          <button
            onClick={() => handleChangeMapType("street")}
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              storeMapType === "NORMAL"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🗺️ <span className="hidden xl:inline">일반 도로</span>
          </button>
          <button
            onClick={() => handleChangeMapType("satellite")}
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              storeMapType === "HYBRID"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🛰️ <span className="hidden xl:inline">위성 지도</span>
          </button>
        </div>
      </div>

      {/* 상단 편의시설 레이더 필터 칩 (데스크톱에서는 사이드바 우측 sm:left-[368px] lg:left-[412px]에 안전하게 위치) */}
      <div className="absolute top-16 sm:top-4 left-1/2 -translate-x-1/2 sm:left-[368px] lg:left-[412px] sm:translate-x-0 z-20 flex items-center gap-1 bg-gray-900/95 backdrop-blur-md border border-gray-700/80 rounded-2xl p-1 sm:p-1.5 shadow-2xl max-w-[95vw] sm:max-w-none overflow-x-auto">
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
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* 지도 하단: 실제 도로 보행로 길찾기 바 (사이드바 우측 sm:left-[368px] lg:left-[412px]에 격리하여 겹침 원천 차단) */}
      {activeCourse && (
        <div className="absolute bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 sm:left-[368px] lg:left-[412px] sm:translate-x-0 sm:max-w-[calc(100vw-390px)] lg:max-w-[calc(100vw-430px)] z-30 bg-gray-900/95 backdrop-blur-md border border-emerald-500/60 rounded-2xl px-3.5 py-2 sm:py-2.5 shadow-2xl flex flex-col xl:flex-row items-center justify-between gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[95vw]">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <span className="text-xl shrink-0">
              {userLocation ? "📍" : "🌿"}
            </span>
            <div>
              <div className="font-bold text-white flex items-center justify-center sm:justify-start gap-1.5 text-xs sm:text-sm">
                {userLocation && (
                  <>
                    <span className="text-sky-300">내 현재 위치</span>
                    <span className="text-sky-400 font-bold">➔</span>
                  </>
                )}
                <span>{activeCourse.restaurant.name}</span>
                <span className="text-emerald-400">➔</span>
                <span>{activeCourse.trail.name}</span>
              </div>
              <div
                onClick={toggleDistanceUnit}
                className="text-[11px] text-gray-400 cursor-pointer hover:text-gray-200 transition-colors"
                title="클릭하여 거리 단위 변경 (m / km)"
              >
                {userLocation ? (
                  <>
                    내 위치 ➔ 식당{" "}
                    <strong className="text-sky-300 font-semibold underline decoration-dotted">
                      {formatDistance(distFromUserToRest ?? 0, distanceUnit)}
                    </strong>
                    {isTransitRecommended ? (
                      <span className="text-indigo-300 font-medium ml-1">
                        (도보 5분 초과 • 대중교통 권장)
                      </span>
                    ) : (
                      <span className="text-emerald-300 font-medium ml-1">
                        (도보 5분 이내 초근접)
                      </span>
                    )}{" "}
                    • 식당 ➔ 산책로{" "}
                    <strong className="text-emerald-400 font-semibold underline decoration-dotted">
                      {formatDistance(actualWalkDistance, distanceUnit)}
                    </strong>
                  </>
                ) : (
                  <>
                    실제 도로 보행 거리:{" "}
                    <strong className="text-emerald-400 font-semibold underline decoration-dotted">
                      {formatDistance(actualWalkDistance, distanceUnit)}
                    </strong>{" "}
                    • 도보 약{" "}
                    <strong className="text-teal-300 font-semibold">
                      {Math.round(actualWalkDistance / 70)}분
                    </strong>{" "}
                    ({activeCourse.slopeGrade})
                  </>
                )}
                <span className="ml-1 text-[10px] text-gray-500 font-normal">
                  [단위: {distanceUnit === "auto" ? "자동(m/km)" : distanceUnit}]
                </span>
              </div>
            </div>
          </div>

          <div className="hidden sm:block h-7 w-px bg-gray-700/80 mx-1" />

          {/* 길찾기 및 나만의 코스 저장 버튼 영역 */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
              className="flex items-center justify-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 shrink-0"
              title="현재 추천 코스를 나만의 보관함에 영구 저장"
            >
              <span>📌</span>
              <span className="hidden sm:inline">코스 저장</span>
            </button>

            {userLocation ? (
              <>
                {/* 1. 최우선 핵심: 식당 ➔ 산책로 웰니스 도보 길찾기 (네이버 도보 100% 직행) */}
                <a
                  href={naverRestToTrailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 shrink-0 border border-emerald-400/40"
                  title="네이버 지도 도보 길찾기 (식당 ➔ 산책로 힐링 코스)"
                >
                  <span className="text-sm">🟢</span>
                  <span>식당 ➔ 산책로 도보 길찾기</span>
                </a>

                {/* 2. 대중교통 또는 식당까지 도보 */}
                {isTransitRecommended ? (
                  <a
                    href={naverTransitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 shrink-0"
                    title="내 위치에서 식당까지 네이버 대중교통(버스/지하철) 길찾기로 연결"
                  >
                    <span className="text-sm">🚌</span>
                    <span>식당까지 대중교통</span>
                  </a>
                ) : (
                  <a
                    href={naverUserToRestWalkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 shrink-0"
                    title="내 위치에서 식당까지 도보 길찾기"
                  >
                    <span className="text-sm">🚶</span>
                    <span>식당 도보</span>
                  </a>
                )}

                {/* 3. 내 집 ➔ 산책로 직통 도보 */}
                <a
                  href={naverUserToTrailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-gray-800 hover:bg-gray-700 text-teal-300 hover:text-white font-bold text-xs rounded-xl border border-teal-500/40 shadow-lg transition-all active:scale-95 shrink-0"
                  title="내 위치에서 산책로까지 직통 도보 길찾기"
                >
                  <span className="text-sm">🏁</span>
                  <span>산책로 직통 도보</span>
                </a>
              </>
            ) : (
              <a
                href={naverRestToTrailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 shrink-0"
              >
                <span className="text-sm">🟢</span>
                <span>네이버 도보 길찾기 (식당 ➔ 산책로)</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* 네이버 지도 컨테이너 (모달 오픈 시 딤 처리 및 클릭 차단) */}
      <div
        ref={mapElementRef}
        className={`w-full h-full transition-all duration-300 ${
          isModalActive ? "opacity-30 pointer-events-none filter blur-[0.5px]" : "opacity-100"
        }`}
      />
    </div>
  );
}
