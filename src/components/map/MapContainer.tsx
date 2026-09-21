import { useEffect, useRef, useState } from "react";
import { useWellnessStore, WaypointFilterType } from "../../store/wellnessStore";
import { useMapStore } from "../../store/mapStore";
import { AuthButton } from "../auth/AuthButton";
import { HealthProfileAlertBanner } from "../common/HealthProfileAlertBanner";
import {
  fetchPedestrianRoute,
  calculateDistanceMeters,
} from "../../utils/pedestrianRouter";
import { getNaverMapDetailUrl } from "../../utils/naverMapUtils";

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

export function MapContainer() {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const polylineRef = useRef<naver.maps.Polyline | null>(null);
  const userConnectorPolylineRef = useRef<naver.maps.Polyline | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const userMarkerRef = useRef<naver.maps.Marker | null>(null);
  const infoWindowRef = useRef<naver.maps.InfoWindow | null>(null);
  const prevCourseRef = useRef<{ id: string; lat: number; lng: number } | null>(null);

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
    activeWalkSession,
    cancelWalkSession,
    themeMode,
  } = useWellnessStore();

  const isLight = themeMode === "light";
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
  // 하단 코스 길찾기 바 닫기(X) 상태
  const [isCourseBarDismissed, setIsCourseBarDismissed] = useState(false);

  useEffect(() => {
    setIsCourseBarDismissed(false);
  }, [activeCourseId]);

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

    const baseLat = activeCourse.restaurant.latitude;
    const baseLng = activeCourse.restaurant.longitude;
    const bounds = new window.naver.maps.LatLngBounds(
      new window.naver.maps.LatLng(baseLat, baseLng),
      new window.naver.maps.LatLng(baseLat, baseLng)
    );

    bounds.extend(new window.naver.maps.LatLng(activeCourse.restaurant.latitude, activeCourse.restaurant.longitude));
    bounds.extend(new window.naver.maps.LatLng(activeCourse.trail.latitude, activeCourse.trail.longitude));

    // 집 위치가 코스와 10km 이내(생활권)에 있을 때만 포함하여 전국 단위 과도한 줌아웃 방지
    if (userLocation) {
      const distKm =
        calculateDistanceMeters(
          userLocation.latitude,
          userLocation.longitude,
          activeCourse.restaurant.latitude,
          activeCourse.restaurant.longitude
        ) / 1000;
      if (distKm <= 10) {
        bounds.extend(new window.naver.maps.LatLng(userLocation.latitude, userLocation.longitude));
      }
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
        zoomControl: false,
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

  // 코스 또는 내 위치 변경 시 지도 뷰포트 맞춤 (A ➔ B 전환 시 2단계 연속 활공 시네마틱 애니메이션)
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !window.naver?.maps) return;
    if (!activeCourse) return;

    const currentCourse = {
      id: activeCourse.id,
      lat: activeCourse.restaurant.latitude,
      lng: activeCourse.restaurant.longitude,
    };

    const prev = prevCourseRef.current;

    // 최초 로드 시에는 급격한 축소 없이 자연스럽게 뷰포트 맞춤
    if (!prev) {
      prevCourseRef.current = currentCourse;
      const timer = setTimeout(() => {
        fitCourseAndHomeBounds(false);
      }, 300);
      return () => clearTimeout(timer);
    }

    // 동일한 코스인 경우 (내 집 핀 위치 변경 등)
    if (prev.id === currentCourse.id) {
      const timer = setTimeout(() => {
        fitCourseAndHomeBounds(true);
      }, 300);
      return () => clearTimeout(timer);
    }

    // A 코스에서 B 코스로 변경될 때:
    // [1단계: 축소(Zoom-out) & 중간 지점으로 시점 상승 활공] ➔ [2단계: B 코스로 하강 및 확대(Zoom-in) 착륙]
    prevCourseRef.current = currentCourse;

    const distKm =
      calculateDistanceMeters(
        prev.lat,
        prev.lng,
        currentCourse.lat,
        currentCourse.lng
      ) / 1000;

    const midLat = (prev.lat + currentCourse.lat) / 2;
    const midLng = (prev.lng + currentCourse.lng) / 2;

    // 거리에 따른 적응형 축소(Zoom-out) 레벨 계산
    let zoomOutLevel = 12;
    if (distKm > 150) {
      zoomOutLevel = 7; // 전국 단위 (예: 서울 ↔ 제주, 부산)
    } else if (distKm > 60) {
      zoomOutLevel = 9; // 광역 권역 (예: 서울 ↔ 강원)
    } else if (distKm > 20) {
      zoomOutLevel = 10; // 수도권/대도시권
    } else if (distKm > 5) {
      zoomOutLevel = 12; // 시/구 단위
    } else {
      zoomOutLevel = 13; // 인접 근거리 단위
    }

    const map = mapRef.current;
    const targetCenter = new window.naver.maps.LatLng(
      currentCourse.lat,
      currentCourse.lng
    );

    // 3km 미만 근거리 이동 시에는 줌아웃 없이 목표 지점으로 부드럽게 단일 활공
    if (distKm < 3) {
      if (typeof (map as any).morph === "function") {
        (map as any).morph(targetCenter, 15, { duration: 600 });
      } else {
        map.panTo(targetCenter, { duration: 500 });
      }
      const timer = setTimeout(() => {
        fitCourseAndHomeBounds(false);
      }, 650);
      return () => clearTimeout(timer);
    }

    // 3km 이상 중·원거리 이동:
    // 1단계: A 지점에서 중간 지점으로 시점을 띄우며 부드럽게 축소(Zoom-out) 이동 (500ms)
    if (typeof (map as any).morph === "function") {
      (map as any).morph(
        new window.naver.maps.LatLng(midLat, midLng),
        zoomOutLevel,
        { duration: 500 }
      );
    } else {
      map.setZoom(zoomOutLevel);
      map.panTo(new window.naver.maps.LatLng(midLat, midLng), { duration: 400 });
    }

    // 2단계: 520ms 시점에 B 코스(식당 중심)로 부드럽게 하강(Zoom-in 15)하며 활공 (600ms)
    // (panToBounds/fitBounds로 바로 넘어가면 순간이동 점프가 생기므로 morph로 부드러운 착륙 보장)
    const timer1 = setTimeout(() => {
      if (typeof (map as any).morph === "function") {
        (map as any).morph(targetCenter, 15, { duration: 600 });
      } else {
        map.setZoom(15);
        map.panTo(targetCenter, { duration: 500 });
      }
    }, 520);

    // 3단계: 착륙 애니메이션이 완료된 후(1180ms) 여백 패딩 정밀 피팅 (순간 점프 없음)
    const timer2 = setTimeout(() => {
      fitCourseAndHomeBounds(false);
    }, 1180);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
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
  const lastHandledCenterRef = useRef<string | null>(null);
  useEffect(() => {
    // 최초 기본 좌표 [126.9825, 37.5583] 및 동일 좌표 중복 호출 무시
    const key = `${center[0].toFixed(4)},${center[1].toFixed(4)},${zoom}`;
    if (!lastHandledCenterRef.current) {
      lastHandledCenterRef.current = key;
      return;
    }
    if (lastHandledCenterRef.current === key) return;
    lastHandledCenterRef.current = key;

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
  }, [center[0], center[1], zoom]);

  // 4. 활성 코스의 보행로 렌더링 (공공 도로망 라우터 100% 호출 - 건물/산/물 관통 원천 배제)
  useEffect(() => {
    setRoadRouteCoords([]);
    setUserToRestCoords([]);
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
          <div style="width: 280px; min-width: 280px; max-width: 300px; box-sizing: border-box; word-break: keep-all; white-space: normal;" class="relative text-white p-3.5 font-sans bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-500/50 animate-in fade-in zoom-in-95 duration-150">
            <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2.5 right-2.5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs font-bold transition-colors">✕</button>
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
          <div style="width: 280px; min-width: 280px; max-width: 300px; box-sizing: border-box; word-break: keep-all; white-space: normal;" class="relative text-white p-3.5 font-sans bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-teal-500/50 animate-in fade-in zoom-in-95 duration-150">
            <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2.5 right-2.5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs font-bold transition-colors">✕</button>
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
              <div style="width: 270px; min-width: 270px; max-width: 290px; box-sizing: border-box; word-break: keep-all; white-space: normal;" class="relative text-white p-3 font-sans bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/80 animate-in fade-in zoom-in-95 duration-150">
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

        const popupContent = `
          <div style="width: 270px; min-width: 270px; max-width: 290px; box-sizing: border-box; word-break: keep-all; white-space: normal;" class="relative text-white p-3 font-sans bg-gray-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-teal-500/50 animate-in fade-in zoom-in-95 duration-150">
            <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2 right-2 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs font-bold transition-colors">✕</button>
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

      // 사이드바에서 숙소 선택 시 마커가 자동으로 클릭된 상태로 팝업 오픈
      if (isStayActive) {
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

        const popupContent = `
          <div style="width: 280px; min-width: 280px; max-width: 300px; box-sizing: border-box; word-break: keep-all; white-space: normal;" class="relative text-gray-900 p-3.5 font-sans bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-purple-500/40">
            <button onclick="window.__closeVitalInfoWindow()" class="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-100 text-xs font-bold transition-colors">✕</button>
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

      // 사이드바에서 퀘스트 선택 시 마커가 자동으로 클릭된 상태로 팝업 오픈
      if (isQuestActive) {
        setTimeout(() => {
          (window.naver?.maps?.Event as any)?.trigger(questMarker, "click");
        }, 150);
      }

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

      {/* 우측 상단 컨트롤 바 (전체 경로 맞춤 + 내 위치 찾기 + 집 핀 찍기 + 인증 버튼 + 일반/위성 + 맞춤 건강 알림 뱃지) */}
      <div className="absolute top-4 right-3 sm:right-4 z-30 flex items-center justify-end gap-1.5 sm:gap-2">
        {/* 전체 경로 한눈에 보기 맞춤 버튼 */}
        <button
          onClick={() => fitCourseAndHomeBounds(true)}
          className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl transition-all active:scale-95 shrink-0 border ${
            isLight
              ? "bg-white/95 hover:bg-slate-50 text-emerald-700 hover:text-emerald-800 border-emerald-500/50 shadow-slate-300/40"
              : "bg-gray-900/90 hover:bg-gray-800 text-emerald-400 hover:text-emerald-300 border-emerald-500/40"
          }`}
          title="내 위치와 선택된 코스 전체를 화면 한눈에 포커스합니다."
        >
          <span>⛶</span>
          <span className="hidden 2xl:inline">전체 경로 맞춤</span>
        </button>

        {/* 내 위치 기반 찾기 버튼 */}
        <button
          onClick={() => setIsLocationModalOpen(true)}
          className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl transition-all active:scale-95 shrink-0 ${
            userLocation
              ? "bg-sky-600 hover:bg-sky-500 text-white border border-sky-400/50"
              : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 animate-pulse"
          }`}
          title={userLocation ? "내 위치 재설정" : "내 위치 코스 찾기"}
        >
          <span>📍</span>
          <span className="hidden 2xl:inline">
            {userLocation ? "내 위치 재설정" : "내 위치 코스 찾기"}
          </span>
          <span className="2xl:hidden">{userLocation ? "재설정" : "내 위치"}</span>
        </button>

        {/* 내 집 핀 찍기 버튼 */}
        <button
          onClick={() => setIsPinningHome(!isPinningHome)}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-xl transition-all active:scale-95 border shrink-0 ${
            isPinningHome
              ? "bg-amber-500 text-gray-950 border-amber-300 animate-pulse ring-2 ring-amber-400"
              : isLight
              ? "bg-white/95 text-amber-800 hover:text-amber-900 border-amber-400 hover:bg-amber-50 shadow-slate-300/40"
              : "bg-gray-900/90 text-amber-300 hover:text-white border-amber-500/40 hover:bg-gray-800"
          }`}
          title="지도 화면을 직접 클릭하여 내 집(출발지) 위치를 지정합니다."
        >
          <span>🎯</span>
          <span className="hidden 2xl:inline">
            {isPinningHome ? "지도 클릭 대기중..." : "집 핀 찍기"}
          </span>
          <span className="2xl:hidden">{isPinningHome ? "대기중" : "집 핀"}</span>
        </button>

        <AuthButton />

        {/* 일반 / 위성 단일 토글 스위치 버튼 (공간 낭비 제거) */}
        <button
          onClick={() => handleChangeMapType(storeMapType === "NORMAL" ? "satellite" : "street")}
          className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-medium shadow-xl transition-all active:scale-95 shrink-0 ${
            isLight
              ? "bg-white/95 hover:bg-slate-50 text-slate-800 hover:text-slate-900 border-slate-300 shadow-slate-300/40"
              : "bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border-gray-700/60"
          }`}
          title={storeMapType === "NORMAL" ? "위성 지도로 변경" : "일반 도로 지도로 변경"}
        >
          <span>{storeMapType === "NORMAL" ? "🛰️" : "🗺️"}</span>
          <span>{storeMapType === "NORMAL" ? "위성" : "일반"}</span>
        </button>

        {/* 맞춤 건강 프로필 알림 배너 (상단 바 우측 끝에 동일한 Y 위치로 정렬) */}
        <HealthProfileAlertBanner />
      </div>

      {/* 상단 편의시설 레이더 필터 칩 (데스크톱에서는 사이드바 우측 sm:left-[368px] lg:left-[412px]에 안전하게 위치) */}
      <div className={`absolute top-16 sm:top-4 left-1/2 -translate-x-1/2 sm:left-[368px] lg:left-[412px] sm:translate-x-0 z-20 flex items-center gap-1 backdrop-blur-md border rounded-2xl p-1 sm:p-1.5 shadow-xl max-w-[95vw] sm:max-w-none overflow-x-auto ${
        isLight
          ? "bg-white/95 border-slate-300 shadow-slate-300/40"
          : "bg-gray-900/95 border-gray-700/80 shadow-2xl"
      }`}>
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
      {activeWalkSession && (
        <div className="absolute top-28 sm:top-16 left-1/2 -translate-x-1/2 sm:left-[368px] lg:left-[412px] sm:translate-x-0 z-20 flex items-center gap-2.5 bg-gray-950/95 border border-purple-500/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-2xl text-xs text-white animate-in slide-in-from-top-2 duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="font-bold text-purple-200">
            🏃 {activeWalkSession.targetName}
          </span>
          <span className="font-mono font-bold text-amber-300">
            {Math.floor(activeWalkSession.elapsedSeconds / 60)}:{(activeWalkSession.elapsedSeconds % 60).toString().padStart(2, "0")} / {Math.floor(activeWalkSession.targetSeconds / 60)}:00
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeWalkSession.isEligible
                ? "bg-amber-500 text-gray-950 animate-bounce"
                : activeWalkSession.isGpsValid
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-red-500/20 text-red-300 border border-red-500/40"
            }`}
          >
            {activeWalkSession.isEligible
              ? "🏅 완보 자격 획득!"
              : activeWalkSession.isGpsValid
              ? "현장 체류 정상"
              : "500m 이탈"}
          </span>
          <button
            type="button"
            onClick={cancelWalkSession}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs shrink-0 ml-1 font-bold transition-colors"
            title="도보 완보 세션 닫기/종료"
          >
            ✕
          </button>
        </div>
      )}

      {/* 지도 하단: 실제 도로 보행로 길찾기 바 (가시 영역 정중앙 배치 & 글씨 세로 깨짐 완전 방지) */}
      {activeCourse && !isCourseBarDismissed && (
        <div
          className={`absolute bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 sm:left-[calc(50%+190px)] z-30 backdrop-blur-md border rounded-2xl px-3.5 py-2.5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-2 sm:gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[95vw] sm:max-w-max select-none ${
            isLight
              ? "bg-white/98 text-slate-900 border-emerald-600/40 shadow-slate-400/30"
              : "bg-gray-900/95 text-white border-emerald-500/60 shadow-black/60"
          }`}
        >
          {/* 좌측 영역: 코스 저장 핀 버튼 + 코스 정보 */}
          <div className="flex items-center gap-2.5 min-w-0 shrink">
            {/* 코스 저장 (텍스트 없이 📌 아이콘 단독) */}
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

          {/* 길찾기 버튼 영역 (가로 한 줄 유지 & 버튼 텍스트 세로 깨짐 원천 방지) */}
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

      {/* 네이버 지도 컨테이너 (모달 오픈 시 딤 처리 및 클릭 차단) */}
      <div
        ref={mapElementRef}
        className={`w-full h-full transition-all duration-300 ${
          isLight ? "bg-[#e5e7eb]" : "bg-[#1e293b]"
        } ${
          isModalActive ? "opacity-30 pointer-events-none filter blur-[0.5px]" : "opacity-100"
        }`}
      />
    </div>
  );
}
