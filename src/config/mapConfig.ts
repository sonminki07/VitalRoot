import { CircleSettings } from "../types/circle.types";

export const INITIAL_MAP_CONFIG = {
  center: [126.9825, 37.5583] as [number, number], // 서울 중심 (남산 인근)
  zoom: 13.5,
  pitch: 30,
  bearing: 0,
};

export const DEFAULT_CIRCLE_SETTINGS: CircleSettings = {
  center: [126.9825, 37.5583],
  radiusKm: 3,
  maxRadiusKm: 5,
  stepKm: 1,
  color: "#10b981", // 웰니스 에메랄드 그린
  fillOpacity: 0.15,
  strokeWidth: 2,
  showDistanceLabels: true,
  showAngleLabels: true,
  showRadialLines: true,
};
