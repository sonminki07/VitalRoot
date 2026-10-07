// React 훅 (생명주기, DOM/인스턴스 참조, 내부 상태) 불러오기
import { useEffect, useRef, useState } from "react";
// Zustand 스토어의 불필요한 리렌더링을 차단하는 얕은 비교 훅 불러오기
import { useShallow } from "zustand/react/shallow";
// 웰니스 코스 및 시스템 전역 상태 관리 스토어 불러오기
import { useWellnessStore } from "../../store/wellnessStore";
// 지도 카메라 제어 및 선택 장소 상태 스토어 불러오기
import { useMapStore } from "../../store/mapStore";
// 보행자 경로 탐색 API 및 두 좌표 간 거리(미터) 계산 유틸 불러오기
import {
  fetchPedestrianRoute,
  calculateDistanceMeters,
} from "../../utils/pedestrianRouter";
// 지도 부드러운 이동(카메라 비행) 제어 커스텀 훅 불러오기
import { useMapFlightController } from "./controllers/useMapFlightController";
// 지도 경로선(보행로 폴리라인) 렌더링 서브 레이어 컴포넌트 불러오기
import { MapPolylinesLayer } from "./layers/MapPolylinesLayer";
// 지도 마커(식당, 산책로, 숙소, 퀘스트 등) 렌더링 서브 레이어 컴포넌트 불러오기
import { MapMarkersLayer } from "./layers/MapMarkersLayer";
// 지도 위 플로팅 위젯들(상단 헤더, 레이더 칩, 하단 길찾기 바) 불러오기
import { MapFloatingWidgets } from "./widgets/MapFloatingWidgets";

// 네이버 지도 통합 뷰 컨테이너 컴포넌트 선언
export function MapContainer() {
  // 네이버 지도 캔버스가 마운트될 DOM 엘리먼트 참조 Ref
  const mapElementRef = useRef<HTMLDivElement>(null);
  // 생성된 네이버 지도 인스턴스를 저장하는 Ref
  const mapRef = useRef<naver.maps.Map | null>(null);
  // 지도 스크립트 로딩 및 인스턴스 초기화 완료 여부 상태
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Zustand 스토어에서 지도 및 웰니스 연동 상태를 얕은 비교로 구독
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
      filteredCourses: s.filteredCourses, // 현재 필터링된 코스 목록
      activeCourseId: s.activeCourseId, // 선택된 활성 코스 ID
      hoveredCourseId: s.hoveredCourseId, // 마우스 호버된 코스 ID
      activeWaypointFilter: s.activeWaypointFilter, // 의료/약국/안심 편의시설 필터
      stays: s.stays, // 연계 숙소 목록
      activeStayId: s.activeStayId, // 선택된 숙소 ID
      quests: s.quests, // 웰니스 퀘스트 목록
      activeQuestId: s.activeQuestId, // 선택된 퀘스트 ID
      activeWalkSession: s.activeWalkSession, // 실시간 완보 걷기 세션 정보
      userLocation: s.userLocation, // 현재 사용자 위치 좌표
      setUserLocation: s.setUserLocation, // 사용자 위치 갱신 함수
      isPinningHome: s.isPinningHome, // 출발지/집 핀 찍기 활성화 모드 플래그
      setIsPinningHome: s.setIsPinningHome, // 핀 찍기 모드 변경 함수
      mapType: s.mapType, // 지도 유형 (NORMAL 또는 HYBRID)
      setMapType: s.setMapType, // 지도 유형 변경 함수
      isOnboardingModalOpen: s.isOnboardingModalOpen, // 온보딩 모달 열림 여부
      isSettingsModalOpen: s.isSettingsModalOpen, // 환경설정 모달 열림 여부
      themeMode: s.themeMode, // 라이트/다크 테마 모드
    }))
  );

  // 라이트 테마 여부 계산
  const isLight = themeMode === "light";
  // 백그라운드 흐림 효과를 위한 모달 활성화 여부
  const isModalActive = isOnboardingModalOpen || isSettingsModalOpen;

  // 지도 스토어의 중심점, 줌 레벨, 선택 장소, 비행 이동 액션 가져오기
  const { center, zoom, setSelectedPlace, flyToPlace } = useMapStore();

  // 현재 활성화된 코스 객체 추출 (없을 경우 목록의 첫 번째 코스로 대체)
  const activeCourse =
    filteredCourses.find((c) => c.id === activeCourseId) || filteredCourses[0];

  // 식당 ➔ 산책로 간 실제 도로망 보행자 경로 좌표 목록 상태
  const [roadRouteCoords, setRoadRouteCoords] = useState<[number, number][]>([]);
  // 사용자 위치 ➔ 식당 간 보행자 접근 경로 좌표 목록 상태
  const [userToRestCoords, setUserToRestCoords] = useState<[number, number][]>([]);
  // OSRM 실제 도보 거리 상태 (기본값: 코스 기본 거리 또는 750m)
  const [actualWalkDistance, setActualWalkDistance] = useState<number>(
    activeCourse?.distanceMeters || 750
  );

  // 1. 네이버 지도 스크립트 준비 감지 및 지도 인스턴스 초기화 생명주기
  useEffect(() => {
    // 지도 API 미로드 시 주기적 폴링을 위한 타이머 ID 변수
    let checkInterval: number | undefined;

    // 네이버 지도 생성 내부 함수 정의
    const initNaverMap = () => {
      // API 객체나 DOM 노드가 없으면 생성 중단
      if (!window.naver || !window.naver.maps || !mapElementRef.current) return;

      // 초기 위도 결정 (사용자 위치 우선 -> 활성 코스 식당 -> 전역 center)
      const initialLat = userLocation
        ? userLocation.latitude
        : activeCourse
        ? activeCourse.restaurant.latitude
        : center[1];
      // 초기 경도 결정 (사용자 위치 우선 -> 활성 코스 식당 -> 전역 center)
      const initialLng = userLocation
        ? userLocation.longitude
        : activeCourse
        ? activeCourse.restaurant.longitude
        : center[0];
      // 네이버 지도 LatLng 좌표 객체 생성
      const initialCenter = new window.naver.maps.LatLng(initialLat, initialLng);

      // 네이버 지도 인스턴스 생성 및 옵션 바인딩
      const map = new window.naver.maps.Map(mapElementRef.current, {
        center: initialCenter, // 지도 중심점
        zoom: Math.round(zoom || 14), // 기본 줌 배율
        minZoom: 10, // 최소 축소 줌
        maxZoom: 19, // 최대 확대 줌
        mapTypeId:
          storeMapType === "HYBRID"
            ? window.naver.maps.MapTypeId.HYBRID
            : window.naver.maps.MapTypeId.NORMAL, // 일반 지도 또는 위성 하이브리드 지도
        zoomControl: false, // 기본 줌 컨트롤 UI 숨김 (커스텀 위젯 사용)
        scaleControl: true, // 축척 바 표시
        logoControl: false, // 네이버 로고 간소화
        mapDataControl: false, // 지도 데이터 저작권 컨트롤 숨김
      });

      // 지도 인스턴스 저장
      mapRef.current = map;
      // 지도 로드 완료 플래그 true 설정
      setIsMapLoaded(true);
    };

    // 네이버 지도 SDK가 이미 로드되어 있으면 바로 초기화
    if (window.naver && window.naver.maps) {
      initNaverMap();
    } else {
      // 아직 로드되지 않았다면 200ms 주기로 로드 완료 폴링
      checkInterval = window.setInterval(() => {
        if (window.naver && window.naver.maps) {
          clearInterval(checkInterval); // 폴링 중단
          initNaverMap(); // 지도 초기화 실행
        }
      }, 200);
    }

    // 컴포넌트 언마운트 시 클린업 로직
    return () => {
      if (checkInterval) clearInterval(checkInterval); // 인터벌 타이머 해제
      if (mapRef.current) {
        mapRef.current.destroy(); // 네이버 지도 인스턴스 메모리 해제
        mapRef.current = null; // 참조 초기화
      }
    };
  }, []);

  // 2. 부드러운 지도 카메라 비행 및 시네마틱 이동 컨트롤러 연결
  useMapFlightController({
    mapRef,
    isMapLoaded,
    activeCourse,
    center,
    zoom,
  });

  // 3. 지도 클릭 이벤트 리스너 (사용자 맞춤 집/출발지 핀 찍기 모드)
  useEffect(() => {
    // 지도 인스턴스가 없으면 리스너 등록 생략
    if (!mapRef.current || !window.naver?.maps) return;
    const map = mapRef.current;

    // 네이버 지도 클릭 이벤트 바인딩
    const clickListener = window.naver.maps.Event.addListener(
      map,
      "click",
      (e: any) => {
        // 핀 찍기 모드가 활성화된 상태인 경우
        if (isPinningHome) {
          const lat = e.coord.lat(); // 클릭한 지점 위도
          const lng = e.coord.lng(); // 클릭한 지점 경도
          setUserLocation({ latitude: lat, longitude: lng }); // 사용자 위치로 설정
          setIsPinningHome(false); // 핀 찍기 모드 종료
          flyToPlace(lng, lat, 15); // 설정된 좌표로 지도 이동 (줌 15)
        }
      }
    );

    // 핀 찍기 모드 여부에 따른 마우스 커서 스타일(십자선/기본) 변경
    if (mapElementRef.current) {
      mapElementRef.current.style.cursor = isPinningHome ? "crosshair" : "default";
    }

    // 언마운트 또는 상태 변경 시 클릭 리스너 제거
    return () => {
      window.naver.maps.Event.removeListener(clickListener);
    };
  }, [isPinningHome, isMapLoaded]);

  // 커스텀 이벤트: 다른 모달 등에서 위치 재설정(핀 찍기) 요청 수신
  useEffect(() => {
    // 핀 찍기 모드 활성화 핸들러 함수
    const handleRepin = () => setIsPinningHome(true);
    // 윈도우 전역 이벤트 등록
    window.addEventListener("vital-repin-home", handleRepin);
    // 컴포넌트 정리 시 이벤트 제거
    return () => window.removeEventListener("vital-repin-home", handleRepin);
  }, []);

  // 4. 일반 지도 / 위성 지도(HYBRID) 타입 전환 핸들러
  const handleChangeMapType = (type: "satellite" | "street") => {
    // 요청 타입에 따라 네이버 지도 타입 문자열 결정
    const nextType = type === "satellite" ? "HYBRID" : "NORMAL";
    // 스토어 상태 갱신
    setStoreMapType(nextType);
    // 지도 인스턴스가 존재할 때 지도 타입 즉시 변경 적용
    if (!mapRef.current || !window.naver?.maps) return;
    mapRef.current.setMapTypeId(
      nextType === "HYBRID"
        ? window.naver.maps.MapTypeId.HYBRID
        : window.naver.maps.MapTypeId.NORMAL
    );
  };

  // 스토어의 지도 유형 변경 감지 시 지도 인스턴스 동기화
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    mapRef.current.setMapTypeId(
      storeMapType === "HYBRID"
        ? window.naver.maps.MapTypeId.HYBRID
        : window.naver.maps.MapTypeId.NORMAL
    );
  }, [storeMapType]);

  // 5. 활성화된 코스를 지도 화면 중앙에 완벽히 맞추는 포커스 함수
  const focusActiveCourse = (animate = true, overrideZoom?: number) => {
    // 지도 인스턴스 또는 활성 코스가 없으면 조기 반환
    if (!mapRef.current || !window.naver?.maps || !activeCourse) return;
    const map = mapRef.current;

    // 코스 내 식당 좌표
    const restLat = activeCourse.restaurant.latitude;
    const restLng = activeCourse.restaurant.longitude;
    // 코스 내 산책로 좌표
    const trailLat = activeCourse.trail.latitude;
    const trailLng = activeCourse.trail.longitude;

    // 두 지점의 중간 위경도 좌표 계산
    const midLat = (restLat + trailLat) / 2;
    const midLng = (restLng + trailLng) / 2;

    // 두 지점 사이의 실제 직선거리(m) 산출
    const dist = calculateDistanceMeters(restLat, restLng, trailLat, trailLng);
    // 거리에 비례한 최적 줌 배율 자동 계산 (오버라이드 줌 우선)
    const targetZoom = overrideZoom ?? (dist > 1500 ? 14 : dist > 700 ? 15 : 16);

    // 데스크톱 환경에서는 좌측 사이드바 패널을 고려하여 중심점을 우측으로 미세 보정
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 640;
    const targetLng = isDesktop ? midLng - 0.0025 : midLng;
    const targetCenter = new window.naver.maps.LatLng(midLat, targetLng);

    // 애니메이션 morph 함수 지원 시 부드러운 전환 연출
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

  // '코스 보기' 커스텀 이벤트 수신 시 코스 전경 부드러운 포커스 실행
  useEffect(() => {
    const handleFitCourse = (e: any) => {
      // 이벤트 디테일에 담긴 대상 코스 ID 또는 활성 코스 ID 추출
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

      // 거리 기반 최적 줌 배율
      const dist = calculateDistanceMeters(restLat, restLng, trailLat, trailLng);
      const optimalZoom = dist > 1500 ? 14 : dist > 700 ? 15 : 16;

      // 좌측 패널 오프셋 적용
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 640;
      const targetLng = isDesktop ? midLng - 0.0025 : midLng;
      const targetCoord = new window.naver.maps.LatLng(midLat, targetLng);

      // 시네마틱 화면 전환
      if (typeof (map as any).morph === "function") {
        (map as any).morph(targetCoord, optimalZoom, { duration: 700 });
      } else {
        map.setZoom(optimalZoom);
        map.panTo(targetCoord, { duration: 500 });
      }
    };

    // 커스텀 이벤트 리스너 등록
    window.addEventListener("vital-fit-course", handleFitCourse);
    // 컴포넌트 정리 시 이벤트 리스너 해제
    return () => window.removeEventListener("vital-fit-course", handleFitCourse);
  }, [activeCourse, activeCourseId, filteredCourses]);

  // 6. 활성 코스의 식당 ➔ 산책로 간 실제 보행 도로망(OSRM) 경로 데이터 비동기 요청
  useEffect(() => {
    // 기존 도로망 좌표 초기화
    setRoadRouteCoords([]);
    setUserToRestCoords([]);
    // 활성 코스가 없으면 중단
    if (!activeCourse) return;

    let isMounted = true;
    // OSRM 기반 도보 길찾기 API 비동기 호출
    fetchPedestrianRoute(
      activeCourse.restaurant.longitude,
      activeCourse.restaurant.latitude,
      activeCourse.trail.longitude,
      activeCourse.trail.latitude
    ).then((res) => {
      // 마운트 상태일 때만 좌표 및 실제 거리 갱신
      if (isMounted) {
        setRoadRouteCoords(res.coordinates);
        setActualWalkDistance(res.distanceMeters);
      }
    });

    // 클린업 시 언마운트 플래그 설정
    return () => {
      isMounted = false;
    };
  }, [activeCourse?.id]);

  // 7. 사용자 현재 위치 ➔ 코스 시작 식당 간 접근 도보 경로 비동기 요청
  useEffect(() => {
    // 위치 정보나 코스가 없으면 경로 초기화 후 반환
    if (!userLocation || !activeCourse) {
      setUserToRestCoords([]);
      return;
    }

    // 사용자와 식당 간의 직선거리 산출
    const distToRest = calculateDistanceMeters(
      userLocation.latitude,
      userLocation.longitude,
      activeCourse.restaurant.latitude,
      activeCourse.restaurant.longitude
    );
    // 도보 이동 범위를 초과하는 원거리(15km 이상)일 경우 도보선 생략
    if (distToRest > 15000) {
      setUserToRestCoords([]);
      return;
    }

    let isMounted = true;
    // 사용자 위치에서 식당까지 보행로 API 호출
    fetchPedestrianRoute(
      userLocation.longitude,
      userLocation.latitude,
      activeCourse.restaurant.longitude,
      activeCourse.restaurant.latitude
    ).then((res) => {
      if (isMounted) {
        const coords = [...res.coordinates];
        // 마지막 좌표를 정확히 식당 좌표에 스냅(일치)시킴
        if (coords.length > 0) {
          coords[coords.length - 1] = [
            activeCourse.restaurant.longitude,
            activeCourse.restaurant.latitude,
          ];
        }
        setUserToRestCoords(coords);
      }
    });

    // 클린업 시 언마운트 플래그 설정
    return () => {
      isMounted = false;
    };
  }, [userLocation, activeCourse?.id]);

  // 지도 UI 전체 렌더링
  return (
    // 지도 전체 영역 상대 배치 컨테이너
    <div className="relative w-full h-full">
      {/* 도로망 보행 경로선 및 접근선 렌더링 서브 레이어 */}
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

      {/* 식당, 산책로, 숙소, 퀘스트 마커 및 인포윈도우 렌더링 서브 레이어 */}
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

      {/* 상단 컨트롤, 레이더 필터 칩, 하단 길찾기 내비게이션 바 등 플로팅 위젯 */}
      <MapFloatingWidgets
        activeCourse={activeCourse}
        actualWalkDistance={actualWalkDistance}
        focusActiveCourse={focusActiveCourse}
        handleChangeMapType={handleChangeMapType}
      />

      {/* 네이버 지도가 그려지는 실제 캔버스 DOM 엘리먼트 */}
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
