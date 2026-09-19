// 동심원 및 지도 기하 타입 정의

export interface LabelPosition {
  longitude: number;
  latitude: number;
  bearing: number;
  distance: number;
  label: string;
}

export interface AngleLabel {
  longitude: number;
  latitude: number;
  angle: number;
  label: string;
}

export interface CircleSettings {
  center: [number, number]; // [경도, 위도]
  radiusKm: number;         // 원 반경 (기본 1~5km)
  maxRadiusKm: number;      // 최대 반경
  stepKm: number;           // 동심원 간격 (예: 1km)
  color: string;            // 동심원 테두리 및 채우기 색상 (HEX)
  fillOpacity: number;      // 채우기 투명도 (0.0 ~ 1.0)
  strokeWidth: number;      // 선 두께
  showDistanceLabels: boolean; // 거리 라벨 표시 여부
  showAngleLabels: boolean;    // 각도 라벨 표시 여부
  showRadialLines: boolean;    // 방사선 표시 여부
}
