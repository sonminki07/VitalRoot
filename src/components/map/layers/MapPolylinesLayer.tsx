import { useEffect, useRef } from "react";
import { ActiveWalkSession, WellnessCourseSet } from "../../../types/wellness.types";

interface MapPolylinesLayerProps {
  mapRef: React.RefObject<naver.maps.Map | null>;
  isMapLoaded: boolean;
  roadRouteCoords: [number, number][];
  userToRestCoords: [number, number][];
  hoveredCourseId: string | null;
  activeCourseId?: string | null;
  filteredCourses: WellnessCourseSet[];
  activeWalkSession: ActiveWalkSession | null;
}

export function MapPolylinesLayer({
  mapRef,
  isMapLoaded,
  roadRouteCoords,
  userToRestCoords,
  hoveredCourseId,
  activeCourseId,
  filteredCourses,
  activeWalkSession,
}: MapPolylinesLayerProps) {
  const polylineRef = useRef<naver.maps.Polyline | null>(null);
  const passedPolylineRef = useRef<naver.maps.Polyline | null>(null);
  const hoveredPolylineRef = useRef<naver.maps.Polyline | null>(null);
  const userConnectorPolylineRef = useRef<naver.maps.Polyline | null>(null);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !window.naver?.maps) return;
    const map = mapRef.current;

    // (A) 코스 보행로 (식당 ➔ 산책로)
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    if (passedPolylineRef.current) {
      passedPolylineRef.current.setMap(null);
      passedPolylineRef.current = null;
    }

    if (roadRouteCoords.length > 0) {
      if (activeWalkSession && activeWalkSession.targetSeconds > 0) {
        const progressRatio = Math.min(
          activeWalkSession.elapsedSeconds / activeWalkSession.targetSeconds,
          1
        );
        const splitIdx = Math.min(
          Math.floor(progressRatio * (roadRouteCoords.length - 1)),
          roadRouteCoords.length - 1
        );

        // 1) 지나온 경로 (Passed Route): 딤드 회색 점선
        if (splitIdx > 0) {
          const passedPath = roadRouteCoords
            .slice(0, splitIdx + 1)
            .map(([lng, lat]) => new window.naver.maps.LatLng(lat, lng));

          passedPolylineRef.current = new window.naver.maps.Polyline({
            map,
            path: passedPath,
            strokeColor: "#64748b",
            strokeWeight: 4,
            strokeOpacity: 0.4,
            strokeStyle: "shortdash",
            strokeLineCap: "round",
          });
        }

        // 2) 앞으로 걸어갈 남은 경로 (Remaining Route): 선명한 네온 에메랄드 실선 + 보행로 외곽선(Casing)
        const remainingCoords = roadRouteCoords.slice(splitIdx);
        const remainingPath = remainingCoords.map(
          ([lng, lat]) => new window.naver.maps.LatLng(lat, lng)
        );

        polylineRef.current = new window.naver.maps.Polyline({
          map,
          path: remainingPath,
          strokeColor: "#10b981",
          strokeWeight: 6,
          strokeOpacity: 0.98,
          strokeLineCap: "round",
          strokeLineJoin: "round",
        });
      } else {
        // 일반 탐색 모드: 보행자 전용 완만 곡선 폴리라인 (외곽 부드러운 케이싱 + 에메랄드 코어)
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
    }

    // (B) 마우스 호버 시 다른 코스 임시 미리보기 폴리라인 (네온 퍼플 점선)
    if (hoveredPolylineRef.current) {
      hoveredPolylineRef.current.setMap(null);
      hoveredPolylineRef.current = null;
    }

    if (hoveredCourseId && hoveredCourseId !== activeCourseId) {
      const hoveredCourse = filteredCourses.find((c) => c.id === hoveredCourseId);
      if (hoveredCourse?.walkingRoute && hoveredCourse.walkingRoute.length > 0) {
        const hoverPath = hoveredCourse.walkingRoute.map(
          ([lng, lat]) => new window.naver.maps.LatLng(lat, lng)
        );

        hoveredPolylineRef.current = new window.naver.maps.Polyline({
          map,
          path: hoverPath,
          strokeColor: "#a855f7",
          strokeWeight: 5,
          strokeOpacity: 0.9,
          strokeStyle: "shortdash",
          strokeLineCap: "round",
          strokeLineJoin: "round",
        });
      }
    }

    // (C) 사용자 위치 ➔ 식당 연결 보행로 (스카이블루 실선 도로망 길찾기)
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
        strokeOpacity: 0.95,
        strokeLineCap: "round",
        strokeLineJoin: "round",
      });
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
      if (passedPolylineRef.current) {
        passedPolylineRef.current.setMap(null);
      }
      if (hoveredPolylineRef.current) {
        hoveredPolylineRef.current.setMap(null);
      }
      if (userConnectorPolylineRef.current) {
        userConnectorPolylineRef.current.setMap(null);
      }
    };
  }, [
    isMapLoaded,
    roadRouteCoords,
    userToRestCoords,
    hoveredCourseId,
    activeCourseId,
    activeWalkSession?.elapsedSeconds,
    activeWalkSession?.targetSeconds,
    filteredCourses,
  ]);

  return null;
}
