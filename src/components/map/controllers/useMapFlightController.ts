import { useEffect, useRef } from "react";
import { WellnessCourseSet } from "../../../types/wellness.types";
import { calculateDistanceMeters } from "../../../utils/pedestrianRouter";

interface UseMapFlightControllerProps {
  mapRef: React.RefObject<naver.maps.Map | null>;
  isMapLoaded: boolean;
  activeCourse?: WellnessCourseSet | null;
  center: [number, number];
  zoom: number;
}

export function useMapFlightController({
  mapRef,
  isMapLoaded,
  activeCourse,
  center,
  zoom,
}: UseMapFlightControllerProps) {
  const prevCourseRef = useRef<{ id: string; lat: number; lng: number } | null>(null);
  const flightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHandledCenterRef = useRef<string | null>(null);

  // 1. 코스 간 시네마틱 카메라 비행 컨트롤러
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !activeCourse || !window.naver?.maps) return;

    const targetCenter = new window.naver.maps.LatLng(
      activeCourse.restaurant.latitude,
      activeCourse.restaurant.longitude
    );
    const targetZoom = 15;

    const currentCourse = {
      id: activeCourse.id,
      lat: activeCourse.restaurant.latitude,
      lng: activeCourse.restaurant.longitude,
    };

    const prev = prevCourseRef.current;

    // 최초 코스 로드 시
    if (!prev) {
      prevCourseRef.current = currentCourse;
      const timer = setTimeout(() => {
        if (!mapRef.current) return;
        mapRef.current.setCenter(targetCenter);
        mapRef.current.setZoom(targetZoom);
      }, 100);
      return () => clearTimeout(timer);
    }

    // 동일한 코스인 경우: 재실행 방지 (창 포커스 복귀 시 튐 방지)
    if (prev.id === currentCourse.id) {
      return;
    }

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
    const midCoord = new window.naver.maps.LatLng(midLat, midLng);

    const map = mapRef.current as any;

    // 진행 중인 이전 비행 타이머 정리
    if (flightTimerRef.current) {
      clearTimeout(flightTimerRef.current);
      flightTimerRef.current = null;
    }

    // 1.5km 미만 근거리 코스 이동 시: 고도 유지하면서 부드럽게 활공
    if (distKm < 1.5) {
      if (typeof map.morph === "function") {
        map.morph(targetCenter, targetZoom, {
          duration: 700,
          easing: "easeInOutCubic",
        });
      } else {
        map.panTo(targetCenter, { duration: 500 });
      }
      return;
    }

    // 1.5km 이상 원거리 이동: 구글 어스 스타일 시네마틱 포커스 비행
    let zoomOutLevel: number;
    let t1: number;
    let t2: number;

    if (distKm > 100) {
      zoomOutLevel = 7.5;
      t1 = 700;
      t2 = 850;
    } else if (distKm > 25) {
      zoomOutLevel = 9.5;
      t1 = 600;
      t2 = 720;
    } else if (distKm > 6) {
      zoomOutLevel = 11.5;
      t1 = 500;
      t2 = 620;
    } else {
      zoomOutLevel = 13.5;
      t1 = 420;
      t2 = 520;
    }

    // Phase 1 (상승 비행): A에서 중간 지점으로 이동하며 가속 줌아웃
    if (typeof map.morph === "function") {
      map.morph(midCoord, zoomOutLevel, {
        duration: t1,
        easing: "easeInCubic",
      });
    } else {
      map.setZoom(zoomOutLevel);
      map.panTo(midCoord, { duration: 500 });
    }

    // Phase 2 (하강 착륙): 중간 지점에서 B 코스로 이동하며 감속 줌인
    const handoverDelay = Math.max(t1 - 15, 0);
    flightTimerRef.current = setTimeout(() => {
      if (!mapRef.current) return;
      const currentMap = mapRef.current as any;
      if (typeof currentMap.morph === "function") {
        currentMap.morph(targetCenter, targetZoom, {
          duration: t2,
          easing: "easeOutCubic",
        });
      } else {
        currentMap.setZoom(targetZoom);
        currentMap.panTo(targetCenter, { duration: 500 });
      }
      flightTimerRef.current = null;
    }, handoverDelay);

    return () => {
      if (flightTimerRef.current) {
        clearTimeout(flightTimerRef.current);
        flightTimerRef.current = null;
      }
    };
  }, [activeCourse?.id, isMapLoaded]);

  // 2. 지도 뷰포트 센터 및 줌 연동 (morph로 부드러운 위치/줌 동시 이동)
  useEffect(() => {
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
    const map = mapRef.current as any;

    if (typeof map.morph === "function") {
      map.morph(targetLatLng, targetZoom, { duration: 600 });
    } else {
      map.panTo(targetLatLng, { duration: 500 });
      if (map.getZoom() !== targetZoom) {
        map.setZoom(targetZoom);
      }
    }
  }, [center[0], center[1], zoom]);
}
