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

    // 도로망 보행 좌표가 존재할 때 (식당 ➔ 산책로 간 연결선)
    if (roadRouteCoords.length > 0) {
      // [실시간 완보 세션 모드]: 걷기 타이머가 동작 중일 때
      if (activeWalkSession && activeWalkSession.targetSeconds > 0) {
        // 목표 시간 대비 현재 경과 시간 비율 산출 (0.0 ~ 1.0 범위로 clamp)
        const progressRatio = Math.min(
          activeWalkSession.elapsedSeconds / activeWalkSession.targetSeconds,
          1
        );
        // 전체 좌표 배열 길이에 비율을 곱하여 현재 보행자가 도달한 좌표 인덱스(splitIdx) 산출
        const splitIdx = Math.min(
          Math.floor(progressRatio * (roadRouteCoords.length - 1)),
          roadRouteCoords.length - 1
        );

        // 1) 이미 지나온 경로 (Passed Route): 사용자가 걸어온 길을 회색 점선으로 딤드 처리
        if (splitIdx > 0) {
          // 시작점부터 현재 분할 인덱스까지의 좌표 슬라이싱
          const passedPath = roadRouteCoords
            .slice(0, splitIdx + 1)
            .map(([lng, lat]) => new window.naver.maps.LatLng(lat, lng));

          // 네이버 지도 폴리라인 인스턴스 생성 (회색 점선 스타일)
          passedPolylineRef.current = new window.naver.maps.Polyline({
            map,
            path: passedPath,
            strokeColor: "#64748b", // 슬레이트 그레이 색상
            strokeWeight: 4,        // 굵기 4px
            strokeOpacity: 0.4,     // 투명도 40% (은은하게 표시)
            strokeStyle: "shortdash", // 짧은 점선 패턴
            strokeLineCap: "round", // 선 끝 둥글게 처리
          });
        }

        // 2) 앞으로 걸어가야 할 남은 경로 (Remaining Route): 선명한 네온 에메랄드 실선
        // 현재 보행자 위치 인덱스부터 종점까지의 좌표 슬라이싱
        const remainingCoords = roadRouteCoords.slice(splitIdx);
        const remainingPath = remainingCoords.map(
          ([lng, lat]) => new window.naver.maps.LatLng(lat, lng)
        );

        // 남은 보행로 폴리라인 인스턴스 생성
        polylineRef.current = new window.naver.maps.Polyline({
          map,
          path: remainingPath,
          strokeColor: "#10b981", // 활성 에메랄드 그린
          strokeWeight: 6,        // 시인성을 위해 두꺼운 6px
          strokeOpacity: 0.98,    // 98% 불투명도
          strokeLineCap: "round", // 둥근 라인 캡
          strokeLineJoin: "round", // 둥근 조인트 코너
        });
      } else {
        // [일반 탐색 모드]: 활성 코스의 식당과 산책로를 연결하는 보행로 전체를 단일 에메랄드 실선으로 렌더링
        const path = roadRouteCoords.map(
          ([lng, lat]) => new window.naver.maps.LatLng(lat, lng)
        );

        // 일반 보행선 폴리라인 인스턴스 생성
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
    // 기존 호버 폴리라인 메모리 정리
    if (hoveredPolylineRef.current) {
      hoveredPolylineRef.current.setMap(null);
      hoveredPolylineRef.current = null;
    }

    // 호버된 코스가 존재하고 현재 활성 코스와 다를 때만 임시 경로선 노출
    if (hoveredCourseId && hoveredCourseId !== activeCourseId) {
      const hoveredCourse = filteredCourses.find((c) => c.id === hoveredCourseId);
      if (hoveredCourse?.walkingRoute && hoveredCourse.walkingRoute.length > 0) {
        // 호버 대상 코스의 보행 좌표 변환
        const hoverPath = hoveredCourse.walkingRoute.map(
          ([lng, lat]) => new window.naver.maps.LatLng(lat, lng)
        );

        // 네온 보라색 점선 폴리라인 생성 (사용자가 클릭하기 전에 경로를 미리 시각적으로 파악 가능)
        hoveredPolylineRef.current = new window.naver.maps.Polyline({
          map,
          path: hoverPath,
          strokeColor: "#a855f7", // 눈에 띄는 퍼플 네온 컬러
          strokeWeight: 5,        // 5px 굵기
          strokeOpacity: 0.9,     // 90% 투명도
          strokeStyle: "shortdash", // 점선 표기로 현재 선택 코스와 차별화
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
