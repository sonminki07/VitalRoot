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

export function MapContainer() {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const polylineRef = useRef<naver.maps.Polyline | null>(null);
  const userConnectorPolylineRef = useRef<naver.maps.Polyline | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const userMarkerRef = useRef<naver.maps.Marker | null>(null);
  const infoWindowRef = useRef<naver.maps.InfoWindow | null>(null);

  const [mapType, setMapType] = useState<"street" | "satellite">("street");
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
    setIsLocationModalOpen,
  } = useWellnessStore();

  const { center, zoom, setSelectedPlace } = useMapStore();

  const activeCourse =
    filteredCourses.find((c) => c.id === activeCourseId) || filteredCourses[0];

  // 실제 도로망(OSRM) 보행자 좌표셋 상태
  const [roadRouteCoords, setRoadRouteCoords] = useState<[number, number][]>(
    activeCourse?.walkingRoute || []
  );
  const [userToRestCoords, setUserToRestCoords] = useState<[number, number][]>([]);
  const [actualWalkDistance, setActualWalkDistance] = useState<number>(
    activeCourse?.distanceMeters || 750
  );

  // 1. 네이버 지도 스크립트 대기 및 지도 인스턴스 초기화
  useEffect(() => {
    let checkInterval: number | undefined;

    const initNaverMap = () => {
      if (!window.naver || !window.naver.maps || !mapElementRef.current) return;

      const initialCenter = new window.naver.maps.LatLng(center[1], center[0]);
      const map = new window.naver.maps.Map(mapElementRef.current, {
        center: initialCenter,
        zoom: Math.round(zoom || 14),
        minZoom: 10,
        maxZoom: 19,
        mapTypeId:
          mapType === "satellite"
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

  // 2. 일반 지도 / 위성 지도(HYBRID) 전환
  const handleChangeMapType = (type: "satellite" | "street") => {
    setMapType(type);
    if (!mapRef.current || !window.naver?.maps) return;

    mapRef.current.setMapTypeId(
      type === "satellite"
        ? window.naver.maps.MapTypeId.HYBRID
        : window.naver.maps.MapTypeId.NORMAL
    );
  };

  // 3. 지도 뷰포트 센터 및 줌 연동 (flyTo)
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    const targetLatLng = new window.naver.maps.LatLng(center[1], center[0]);
    mapRef.current.panTo(targetLatLng, { duration: 500 });
  }, [center, zoom]);

  // 4. 활성 코스의 보행로 렌더링 (네이버 공식 정밀 보행로 우선 바인딩)
  useEffect(() => {
    if (!activeCourse) return;

    // 코스에 이미 검증된 네이버 공식 정밀 도보 경로선이 있는 경우 즉시 적용 (OSRM 왜곡 덮어쓰기 방지)
    if (activeCourse.walkingRoute && activeCourse.walkingRoute.length >= 2) {
      setRoadRouteCoords(activeCourse.walkingRoute);
      setActualWalkDistance(activeCourse.distanceMeters || 1000);
      return;
    }

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

    // (B) 사용자 위치 ➔ 식당 연결 보행로 (스카이블루 점선)
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
        strokeWeight: 5,
        strokeOpacity: 0.9,
        strokeStyle: "shortdash",
        strokeLineCap: "round",
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

    // 📍 (0) 사용자 현재 위치 GPS 펄스 마커
    if (userLocation) {
      const userContent = document.createElement("div");
      userContent.className = "vital-marker-wrapper cursor-pointer relative flex items-center justify-center";
      userContent.innerHTML = `
        <span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-sky-400 opacity-75"></span>
        <div class="relative w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-400 border-2 border-white shadow-2xl flex items-center justify-center text-sm text-white font-bold">
          📍
        </div>
      `;

      const userMarker = new window.naver.maps.Marker({
        map,
        position: new window.naver.maps.LatLng(userLocation.latitude, userLocation.longitude),
        icon: {
          content: userContent,
          anchor: new window.naver.maps.Point(16, 16),
        },
        zIndex: 120,
      });

      window.naver.maps.Event.addListener(userMarker, "click", () => {
        const popupContent = `
          <div class="text-gray-900 p-3 max-w-[220px] font-sans bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-sky-500/50">
            <span class="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">실시간 GPS</span>
            <h4 class="font-bold text-xs text-gray-900 mt-1">📍 내 현재 위치</h4>
            <p class="text-[11px] text-gray-600 mt-0.5">이 위치를 기준으로 가장 가까운 안심식당과 산책로가 추천되었습니다.</p>
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

      // 안심식당 마커
      const restContent = document.createElement("div");
      restContent.className = "vital-marker-wrapper cursor-pointer";
      restContent.innerHTML = `
        <div class="w-9 h-9 flex items-center justify-center rounded-full shadow-2xl transition-transform duration-200 ${
          isSelected
            ? "bg-emerald-500 ring-4 ring-emerald-300 ring-offset-2 ring-offset-gray-900 scale-125 z-30"
            : "bg-emerald-600/95 hover:scale-110"
        }">
          <span class="text-base select-none">🍽️</span>
        </div>
      `;

      const restMarker = new window.naver.maps.Marker({
        map,
        position: new window.naver.maps.LatLng(
          course.restaurant.latitude,
          course.restaurant.longitude
        ),
        icon: {
          content: restContent,
          anchor: new window.naver.maps.Point(18, 18),
        },
        zIndex: isSelected ? 100 : 20,
      });

      window.naver.maps.Event.addListener(restMarker, "click", () => {
        setSelectedPlace(course.restaurant);

        const nutrition = course.restaurant.nutrition;
        const nutritionHtml = nutrition
          ? `
          <div class="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
            <div class="flex items-center justify-between text-[11px] font-semibold text-emerald-800">
              <span>🥗 ${nutrition.menuName}</span>
              <span class="text-[10px] text-gray-500 font-mono">${nutrition.calories} kcal</span>
            </div>
            <div class="grid grid-cols-2 gap-1 text-[10px] pt-1 mt-1 border-t border-emerald-200/60">
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full ${
                  nutrition.sugarGrade === "안심" ? "bg-emerald-500" : "bg-amber-500"
                }"></span>
                <span>당류: <strong>${nutrition.sugars}g</strong> (${nutrition.sugarGrade})</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full ${
                  nutrition.sodiumGrade === "안심" ? "bg-emerald-500" : "bg-amber-500"
                }"></span>
                <span>나트륨: <strong>${nutrition.sodium}mg</strong> (${nutrition.sodiumGrade})</span>
              </div>
            </div>
            <p class="text-[9px] text-emerald-700 mt-1">${nutrition.nutritionTip || "식약처 안심 영양성분 검증"}</p>
          </div>
        `
          : "";

        const naverSearchUrl = getNaverMapDetailUrl(course.restaurant);

        const popupContent = `
          <div class="text-gray-900 p-3 max-w-[260px] font-sans bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-500/40 animate-in fade-in zoom-in-95 duration-150">
            <div class="flex items-center justify-between gap-1 mb-1">
              <span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">안심식당</span>
              <span class="text-[10px] text-gray-500 font-medium">${course.targetCondition.split(" ")[0]}</span>
            </div>
            <h4 class="font-bold text-sm text-gray-900 leading-snug">${course.restaurant.name}</h4>
            <p class="text-[11px] text-gray-600 mt-1 line-clamp-2">${course.restaurant.description}</p>
            ${nutritionHtml}
            <div class="mt-2.5 pt-2 border-t border-gray-100">
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

      // 완만 산책로 마커
      const trailContent = document.createElement("div");
      trailContent.className = "vital-marker-wrapper cursor-pointer";
      trailContent.innerHTML = `
        <div class="w-9 h-9 flex items-center justify-center rounded-full shadow-2xl transition-transform duration-200 ${
          isSelected
            ? "bg-teal-500 ring-4 ring-teal-300 ring-offset-2 ring-offset-gray-900 scale-125 z-30"
            : "bg-teal-600/95 hover:scale-110"
        }">
          <span class="text-base select-none">🚶</span>
        </div>
      `;

      const trailMarker = new window.naver.maps.Marker({
        map,
        position: new window.naver.maps.LatLng(
          course.trail.latitude,
          course.trail.longitude
        ),
        icon: {
          content: trailContent,
          anchor: new window.naver.maps.Point(18, 18),
        },
        zIndex: isSelected ? 100 : 20,
      });

      window.naver.maps.Event.addListener(trailMarker, "click", () => {
        setSelectedPlace(course.trail);

        const naverSearchUrl = getNaverMapDetailUrl(course.trail);

        const popupContent = `
          <div class="text-gray-900 p-3 max-w-[260px] font-sans bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-teal-500/40 animate-in fade-in zoom-in-95 duration-150">
            <div class="flex items-center justify-between gap-1 mb-1">
              <span class="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold">완만 산책로</span>
              <span class="text-[10px] text-teal-700 font-semibold">${course.slopeGrade}</span>
            </div>
            <h4 class="font-bold text-sm text-gray-900 leading-snug">${course.trail.name}</h4>
            <p class="text-[11px] text-gray-600 mt-1 line-clamp-2">${course.trail.description}</p>
            <div class="mt-2 p-1.5 bg-teal-50 rounded-lg text-[10px] text-teal-800 font-medium">
              🌿 ${course.trail.healthBenefit}
            </div>
            <div class="mt-2.5 pt-2 border-t border-gray-100">
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
              <div class="text-gray-900 p-2.5 max-w-[240px] font-sans bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
                <div class="flex items-center justify-between gap-1 mb-1">
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    wp.category === "화장실"
                      ? "bg-sky-100 text-sky-800"
                      : wp.category === "쉼터"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-purple-100 text-purple-800"
                  }">안심 ${wp.category}</span>
                  <span class="text-[10px] font-semibold text-emerald-700">도보 ${wp.walkingMinutesFromRoute}분 (${wp.distanceMetersFromRoute}m)</span>
                </div>
                <h4 class="font-bold text-xs text-gray-900">${wp.name}</h4>
                <p class="text-[10px] text-gray-600 mt-1">${wp.description}</p>
                <div class="flex flex-wrap gap-1 mt-2">${featureBadges}</div>
                <div class="mt-2.5 pt-2 border-t border-gray-100">
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
              `<span class="text-[9px] bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded">${b}</span>`
          )
          .join(" ");

        const popupContent = `
          <div class="text-gray-900 p-2.5 max-w-[240px] font-sans bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-teal-500/40">
            <span class="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded">안심 숙소</span>
            <h4 class="font-bold text-xs text-gray-900 mt-1">${stay.name}</h4>
            <p class="text-[10px] text-gray-600 mt-0.5">${stay.description}</p>
            <div class="flex flex-wrap gap-1 mt-1.5">${badgesHtml}</div>
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

  // 단일 네이버 도보 길찾기 완성형 URL (내 위치가 있으면 내 위치 ➔ 식당, 없으면 식당 ➔ 산책로)
  const naverCourseUrl = userLocation && activeCourse
    ? `https://map.naver.com/p/directions/${userLocation.longitude},${userLocation.latitude},내현재위치/${activeCourse.restaurant.longitude},${activeCourse.restaurant.latitude},${encodeURIComponent(
        activeCourse.restaurant.name
      )}/-/walk?c=15.00,0,0,0,dh`
    : activeCourse
    ? `https://map.naver.com/p/directions/${activeCourse.restaurant.longitude},${activeCourse.restaurant.latitude},${encodeURIComponent(
        activeCourse.restaurant.name
      )}/${activeCourse.trail.longitude},${activeCourse.trail.latitude},${encodeURIComponent(
        activeCourse.trail.name
      )}/-/walk?c=15.00,0,0,0,dh`
    : "#";

  return (
    <div className="relative w-full h-full">
      {/* 우측 상단 컨트롤 바 (내 위치 찾기 + 인증 버튼 + 일반/위성 전환 스위치) */}
      <div className="absolute top-4 right-4 sm:right-16 z-20 flex items-center gap-2">
        {/* 내 위치 기반 찾기 버튼 */}
        <button
          onClick={() => setIsLocationModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl transition-all active:scale-95 ${
            userLocation
              ? "bg-sky-600 hover:bg-sky-500 text-white border border-sky-400/50"
              : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 animate-pulse"
          }`}
        >
          <span>📍</span>
          <span className="hidden sm:inline">
            {userLocation ? "내 위치 활성화됨" : "내 위치 코스 찾기"}
          </span>
          <span className="sm:hidden">내 위치</span>
        </button>

        <AuthButton />

        <div className="flex bg-gray-900/90 backdrop-blur-md border border-gray-700/60 rounded-xl p-1 shadow-2xl">
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
        </div>
      </div>

      {/* 상단 중앙: 경로 3~5분 공공 편의시설 레이더 필터 칩 */}
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
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* 지도 하단: 실제 도로 보행로 길찾기 바 */}
      {activeCourse && (
        <div className="absolute bottom-16 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 bg-gray-900/95 backdrop-blur-md border border-emerald-500/60 rounded-2xl px-4 py-2.5 sm:py-3 shadow-2xl flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[92vw]">
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
              <div className="text-[11px] text-gray-400">
                {userLocation ? (
                  <>
                    내 위치에서 식당까지 도보{" "}
                    <strong className="text-sky-300 font-semibold">
                      {distFromUserToRest}m
                    </strong>{" "}
                    • 식당 ➔ 산책로 보행로{" "}
                    <strong className="text-emerald-400 font-semibold">
                      {actualWalkDistance}m
                    </strong>{" "}
                    (도로망 실제 보행로)
                  </>
                ) : (
                  <>
                    실제 도로 보행 거리:{" "}
                    <strong className="text-emerald-400 font-semibold">
                      {actualWalkDistance}m
                    </strong>{" "}
                    • 도보 약{" "}
                    <strong className="text-teal-300 font-semibold">
                      {Math.round(actualWalkDistance / 70)}분
                    </strong>{" "}
                    ({activeCourse.slopeGrade})
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="hidden sm:block h-7 w-px bg-gray-700/80 mx-1" />

          {/* 100% 검증된 네이버 도보 길찾기 단일 버튼 */}
          <a
            href={naverCourseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 shrink-0"
          >
            <span className="text-sm">🟢</span>
            <span>
              {userLocation ? "내 위치에서 길찾기" : "네이버 도보 길찾기"}
            </span>
            <span className="text-[10px] opacity-80">(출발·도착 자동)</span>
          </a>
        </div>
      )}

      {/* 네이버 지도 컨테이너 */}
      <div ref={mapElementRef} className="w-full h-full" />
    </div>
  );
}
