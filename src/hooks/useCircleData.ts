import { useMemo } from "react";
import * as turf from "@turf/turf";
import type { Feature, Polygon, FeatureCollection } from "geojson";
import { useCircleStore } from "../store/circleStore";
import {
  getCircleLabelPositions,
  getAngleLabels,
  generateRadialLines,
} from "../utils/turf";

/**
 * 동심원 및 방사선 GeoJSON 데이터와 라벨 좌표를 useMemo로 계산 및 캐싱하는 훅
 */
export function useCircleData() {
  const {
    center,
    radiusKm,
    stepKm,
    showDistanceLabels,
    showAngleLabels,
    showRadialLines,
  } = useCircleStore();

  // 1. 동심원 다각형(Polygon) FeatureCollection 연산 캐싱
  const circleFeatures = useMemo(() => {
    const features: Feature<Polygon>[] = [];
    // 1km부터 최대 radiusKm까지 stepKm 단위로 원 생성
    for (let r = stepKm; r <= radiusKm; r += stepKm) {
      const c = turf.circle(center, r, {
        units: "kilometers",
        properties: { radius: r },
      });
      features.push(c);
    }
    const collection: FeatureCollection<Polygon> = {
      type: "FeatureCollection",
      features,
    };
    return collection;
  }, [center, radiusKm, stepKm]);

  // 2. 360도 방사선 LineString 연산 캐싱
  const radialLines = useMemo(() => {
    if (!showRadialLines) return { normalLines: [], majorLines: [] };
    return generateRadialLines(center[0], center[1], radiusKm);
  }, [center, radiusKm, showRadialLines]);

  // 3. 거리 라벨 좌표 연산 캐싱
  const distanceLabels = useMemo(() => {
    if (!showDistanceLabels) return [];
    const labels = [];
    for (let r = stepKm; r <= radiusKm; r += stepKm) {
      labels.push(...getCircleLabelPositions(center[0], center[1], r));
    }
    return labels;
  }, [center, radiusKm, stepKm, showDistanceLabels]);

  // 4. 각도 라벨 좌표 연산 캐싱
  const angleLabels = useMemo(() => {
    if (!showAngleLabels || radiusKm < 2) return [];
    return getAngleLabels(center[0], center[1], 1, radiusKm);
  }, [center, radiusKm, showAngleLabels]);

  return {
    circleFeatures,
    radialLines,
    distanceLabels,
    angleLabels,
  };
}
