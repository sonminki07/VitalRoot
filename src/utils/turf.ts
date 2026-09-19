// src/utils/turf.ts 분석 요약

// --------------------------------------------------------------------------------
// 1. Import 문
// --------------------------------------------------------------------------------

// 지리 공간 데이터 처리 라이브러리인 turf.js를 임포트합니다.
import * as turf from "@turf/turf";
// GeoJSON 표준 타입들을 임포트합니다.
import type { Feature, Polygon, LineString } from "geojson";
// 커스텀 타입들을 임포트합니다.
import type { LabelPosition, AngleLabel } from "../types/circle.types";

// --------------------------------------------------------------------------------
// 2. 유틸리티 함수 정의
// --------------------------------------------------------------------------------
// 이 파일은 turf.js 라이브러리를 활용하여 지도에 표시될 지리적 데이터(좌표, 선, 라벨 위치)를
// 계산하고 생성하는 함수들을 모아놓은 곳입니다.

/**
 * 원의 테두리에서 특정 방위(0°, 90°, 180°, 270°)에 해당하는 지점의 좌표를 계산합니다.
 * 주로 거리 라벨을 배치할 위치를 결정하는 데 사용됩니다.
 *
 * @param centerLng - 원의 중심 경도.
 * @param centerLat - 원의 중심 위도.
 * @param radiusKm - 원의 반지름 (킬로미터).
 * @returns 계산된 라벨 위치 정보 배열.
 */
export function getCircleLabelPositions(
  centerLng: number,
  centerLat: number,
  radiusKm: number
): LabelPosition[] {
  const center: [number, number] = [centerLng, centerLat]; // turf.js에서 사용할 [경도, 위도] 형식
  const bearings = [0, 90, 180, 270]; // 북, 동, 남, 서 방향의 각도

  // 각 방위에 대해 목적지 좌표를 계산하고 라벨 정보를 반환합니다.
  return bearings.map((bearing) => {
    // turf.destination: 주어진 시작점, 거리, 방위를 기준으로 목적지 좌표를 계산합니다.
    const point = turf.destination(center, radiusKm, bearing, {
      units: "kilometers", // 거리 단위를 킬로미터로 지정
    });
    const coords = point.geometry.coordinates; // 계산된 목적지의 좌표

    return {
      longitude: coords[0] as number, // 경도
      latitude: coords[1] as number, // 위도
      bearing, // 방위
      distance: radiusKm, // 거리
      label: `${radiusKm}km`, // 라벨 텍스트 (예: "1km")
    };
  });
}

/**
 * 두 동심원 사이의 중간 지점에 각도 라벨의 위치를 계산합니다.
 * 30도 간격으로 라벨을 배치합니다.
 *
 * @param centerLng - 원의 중심 경도.
 * @param centerLat - 원의 중심 위도.
 * @param innerRadiusKm - 안쪽 원의 반지름 (킬로미터).
 * @param outerRadiusKm - 바깥쪽 원의 반지름 (킬로미터).
 * @returns 계산된 각도 라벨 위치 정보 배열.
 */
export function getAngleLabels(
  centerLng: number,
  centerLat: number,
  innerRadiusKm: number,
  outerRadiusKm: number
): AngleLabel[] {
  const center: [number, number] = [centerLng, centerLat];
  const labels: AngleLabel[] = [];

  // 두 원의 반지름 평균을 내어 라벨이 위치할 중간 거리를 계산합니다.
  const midRadiusKm = (innerRadiusKm + outerRadiusKm) / 2;

  // 0도부터 360도까지 30도 간격으로 라벨 위치를 계산합니다.
  for (let angle = 0; angle < 360; angle += 30) {
    const point = turf.destination(center, midRadiusKm, angle, {
      units: "kilometers",
    });
    const coords = point.geometry.coordinates;

    labels.push({
      longitude: coords[0] as number,
      latitude: coords[1] as number,
      angle: angle, // 해당 라벨이 나타내는 각도
      label: `${angle}°`, // 라벨 텍스트 (예: "30°")
    });
  }

  return labels;
}

/**
 * (현재 사용되지 않음)
 * 주어진 중심 좌표를 기준으로 1km부터 5km까지의 동심원 GeoJSON 데이터를 생성합니다.
 *
 * @param centerLng - 원의 중심 경도.
 * @param centerLat - 원의 중심 위도.
 * @returns 5개 동심원의 GeoJSON Feature<Polygon> 객체를 담은 객체.
 *
 * @deprecated 이 함수는 현재 'useCircleData.ts'에서 직접 turf.circle을 사용하여
 *             동적으로 반지름을 가져와 원을 생성하므로 사용되지 않습니다.
 *             향후 제거되거나 다른 용도로 사용될 수 있습니다.
 */
export function generateCircles(
  centerLng: number,
  centerLat: number
): {
  circle1km: Feature<Polygon>;
  circle2km: Feature<Polygon>;
  circle3km: Feature<Polygon>;
  circle4km: Feature<Polygon>;
  circle5km: Feature<Polygon>;
} {
  const center: [number, number] = [centerLng, centerLat];

  return {
    circle1km: turf.circle(center, 1, { units: "kilometers" }),
    circle2km: turf.circle(center, 2, { units: "kilometers" }),
    circle3km: turf.circle(center, 3, { units: "kilometers" }),
    circle4km: turf.circle(center, 4, { units: "kilometers" }),
    circle5km: turf.circle(center, 5, { units: "kilometers" }),
  };
}

/**
 * 중심점에서 바깥쪽으로 뻗어나가는 방사형 선들을 생성합니다.
 * 30도 간격으로 선을 생성하며, 주요 각도(0°, 90°, 180°, 270°)의 선은 별도로 분류합니다.
 *
 * @param centerLng - 선의 시작점 경도.
 * @param centerLat - 선의 시작점 위도.
 * @param maxRadiusKm - 선이 뻗어나갈 최대 거리 (킬로미터).
 * @returns 일반 선과 주요 각도 선으로 분류된 GeoJSON LineString Feature 배열.
 */
export function generateRadialLines(
  centerLng: number,
  centerLat: number,
  maxRadiusKm: number
): { normalLines: Feature<LineString>[]; majorLines: Feature<LineString>[] } {
  const center: [number, number] = [centerLng, centerLat];
  const normalLines: Feature<LineString>[] = []; // 일반 각도 선들을 저장할 배열
  const majorLines: Feature<LineString>[] = []; // 주요 각도 선들을 저장할 배열
  const majorAngles = [0, 90, 180, 270]; // 주요 각도 정의

  // 0도부터 360도 미만까지 30도 간격으로 반복하여 선을 생성합니다.
  for (let angle = 0; angle < 360; angle += 30) {
    // turf.destination을 사용하여 중심점에서 특정 각도와 거리만큼 떨어진 끝점 좌표를 계산합니다.
    const endPoint = turf.destination(center, maxRadiusKm, angle, {
      units: "kilometers",
    });
    // 시작점(center)과 끝점(endPoint)을 연결하는 선 GeoJSON 객체를 생성합니다.
    const line = turf.lineString([center, endPoint.geometry.coordinates]);

    // 현재 각도가 주요 각도에 포함되는지 확인하여 선을 분류합니다.
    if (majorAngles.includes(angle)) {
      majorLines.push(line); // 주요 각도 선 배열에 추가
    } else {
      normalLines.push(line); // 일반 각도 선 배열에 추가
    }
  }

  return { normalLines, majorLines }; // 분류된 선 배열들을 반환
}