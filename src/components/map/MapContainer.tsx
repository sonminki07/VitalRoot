import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWellnessStore } from "../../store/wellnessStore";
import { useMapStore } from "../../store/mapStore";
import {
  fetchPedestrianRoute,
  calculateDistanceMeters,
} from "../../utils/pedestrianRouter";
import { useMapFlightController } from "./controllers/useMapFlightController";
import { MapPolylinesLayer } from "./layers/MapPolylinesLayer";
import { MapMarkersLayer } from "./layers/MapMarkersLayer";
import { MapFloatingWidgets } from "./widgets/MapFloatingWidgets";

export function MapContainer() {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // 스토어 구독 (useShallow를 적용하여 불필요한 리렌더링 차단)
  const {
    filteredCourses,
    activeCourseId,
    hoveredCourseId,
    activeWaypointFilter,
    stays,
    activeStayId,
    quests,
    activeQuestId,
    activeWalkSession,
    userLocation,
    setUserLocation,
    isPinningHome,
    setIsPinningHome,
    mapType: storeMapType,
    setMapType: setStoreMapType,
    isOnboardingModalOpen,
    isSettingsModalOpen,
    themeMode,
  } = useWellnessStore(
    useShallow((s) => ({
      filteredCourses: s.filteredCourses,
      activeCourseId: s.activeCourseId,
      hoveredCourseId: s.hoveredCourseId,
      activeWaypointFilter: s.activeWaypointFilter,
      stays: s.stays,
      activeStayId: s.activeStayId,
      quests: s.quests,
      activeQuestId: s.activeQuestId,
      activeWalkSession: s.activeWalkSession,
      userLocation: s.userLocation,
      setUserLocation: s.setUserLocation,
      isPinningHome: s.isPinningHome,
      setIsPinningHome: s.setIsPinningHome,
      mapType: s.mapType,
      setMapType: s.setMapType,
      isOnboardingModalOpen: s.isOnboardingModalOpen,
      isSettingsModalOpen: s.isSettingsModalOpen,
      themeMode: s.themeMode,
    }))
  );

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

      mapRef.current = map;
      setIsMapLoaded(true);

      setTimeout(() => {
        focusActiveCourse(false);
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

  // 2. 카메라 비행 컨트롤러 (시네마틱 활공 및 center/zoom 연동)
  useMapFlightController({
    mapRef,
    isMapLoaded,
    activeCourse,
    center,
    zoom,
  });

  // 3. 지도 클릭 이벤트 (내 집 핀 찍기 모드)
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

  // 4. 일반 지도 / 위성 지도(HYBRID) 전환
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

  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    mapRef.current.setMapTypeId(
      storeMapType === "HYBRID"
        ? window.naver.maps.MapTypeId.HYBRID
        : window.naver.maps.MapTypeId.NORMAL
    );
  }, [storeMapType]);

  // 5. 활성 코스 중심 맞춤 포커스
  const focusActiveCourse = (animate = true, overrideZoom?: number) => {
    if (!mapRef.current || !window.naver?.maps || !activeCourse) return;
    const map = mapRef.current;

    const restLat = activeCourse.restaurant.latitude;
    const restLng = activeCourse.restaurant.longitude;
    const trailLat = activeCourse.trail.latitude;
    const trailLng = activeCourse.trail.longitude;

    const midLat = (restLat + trailLat) / 2;
    const midLng = (restLng + trailLng) / 2;

    const dist = calculateDistanceMeters(restLat, restLng, trailLat, trailLng);
    const targetZoom = overrideZoom ?? (dist > 1500 ? 14 : dist > 700 ? 15 : 16);

    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 640;
    const targetLng = isDesktop ? midLng - 0.0025 : midLng;
    const targetCenter = new window.naver.maps.LatLng(midLat, targetLng);

    if (animate && typeof (map as any).morph === "function") {
      (map as any).morph(targetCenter, targetZoom, { duration: 600 });
    } else if (animate) {
      map.setZoom(targetZoom);
      map.panTo(targetCenter, { duration: 500 });
    } else {
      map.setCenter(targetCenter);
      map.setZoom(targetZoom);
    }
  };

  // '코스 보기' 커스텀 이벤트 수신 시 코스 전경 부드러운 포커스
  useEffect(() => {
    const handleFitCourse = (e: any) => {
      const targetCourseId = e.detail?.courseId || activeCourseId;
      const targetCourse =
        filteredCourses.find((c) => c.id === targetCourseId) || activeCourse;
      if (!targetCourse || !mapRef.current || !window.naver?.maps) return;

      const map = mapRef.current;
      const restLat = targetCourse.restaurant.latitude;
      const restLng = targetCourse.restaurant.longitude;
      const trailLat = targetCourse.trail.latitude;
      const trailLng = targetCourse.trail.longitude;

      const midLat = (restLat + trailLat) / 2;
      const midLng = (restLng + trailLng) / 2;

      const dist = calculateDistanceMeters(restLat, restLng, trailLat, trailLng);
      const optimalZoom = dist > 1500 ? 14 : dist > 700 ? 15 : 16;

      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 640;
      const targetLng = isDesktop ? midLng - 0.0025 : midLng;
      const targetCoord = new window.naver.maps.LatLng(midLat, targetLng);

      if (typeof (map as any).morph === "function") {
        (map as any).morph(targetCoord, optimalZoom, { duration: 700 });
      } else {
        map.setZoom(optimalZoom);
        map.panTo(targetCoord, { duration: 500 });
      }
    };

    window.addEventListener("vital-fit-course", handleFitCourse);
    return () => window.removeEventListener("vital-fit-course", handleFitCourse);
  }, [activeCourse, activeCourseId, filteredCourses]);

  // 6. 활성 코스의 보행로 렌더링
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

  // 7. 사용자 위치 ➔ 식당 실제 도로망 보행로 OSRM 조회
  useEffect(() => {
    if (!userLocation || !activeCourse) {
      setUserToRestCoords([]);
      return;
    }

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

  return (
    <div className="relative w-full h-full">
      {/* 폴리라인 레이어 */}
      <MapPolylinesLayer
        mapRef={mapRef}
        isMapLoaded={isMapLoaded}
        roadRouteCoords={roadRouteCoords}
        userToRestCoords={userToRestCoords}
        hoveredCourseId={hoveredCourseId}
        activeCourseId={activeCourseId}
        filteredCourses={filteredCourses}
        activeWalkSession={activeWalkSession}
      />

      {/* 마커 및 인포윈도우 레이어 */}
      <MapMarkersLayer
        mapRef={mapRef}
        isMapLoaded={isMapLoaded}
        userLocation={userLocation}
        filteredCourses={filteredCourses}
        activeCourse={activeCourse}
        activeWaypointFilter={activeWaypointFilter}
        stays={stays}
        activeStayId={activeStayId}
        quests={quests}
        activeQuestId={activeQuestId}
        setSelectedPlace={setSelectedPlace}
      />

      {/* 플로팅 컨트롤 / 레이더 필터 칩 / 길찾기 내비게이션 바 */}
      <MapFloatingWidgets
        activeCourse={activeCourse}
        actualWalkDistance={actualWalkDistance}
        focusActiveCourse={focusActiveCourse}
        handleChangeMapType={handleChangeMapType}
      />

      {/* 네이버 지도 캔버스 컨테이너 */}
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
