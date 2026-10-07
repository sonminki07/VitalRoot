// 상태 관리 라이브러리 Zustand의 스토어 생성 함수 불러오기
import { create } from "zustand";
// 초기 지도 기본값 설정 (서울 중심 좌표, 기본 줌 레벨, 각도 등)
import { INITIAL_MAP_CONFIG } from "../config/mapConfig";
// 웰니스 관광지 데이터 타입 인터페이스 불러오기
import { WellnessPlace } from "../types/wellness.types";

// 지도 카메라 비행(flyTo) 이동 타겟 인터페이스 정의
export interface FlightTarget {
  // 타겟 경도 (Longitude)
  longitude: number;
  // 타겟 위도 (Latitude)
  latitude: number;
  // 타겟 줌 레벨 (Zoom Level)
  zoom: number;
  // 이동 요청 발생 시각 타임스탬프 (상태 변화 감지용)
  timestamp: number;
}

// 네이버 지도 전역 상태 관리 인터페이스 정의
interface MapState {
  // 현재 지도 중심 좌표 [경도, 위도]
  center: [number, number];
  // 현재 지도 확대/축소 레벨
  zoom: number;
  // 지도 기울기 (3D 뷰)
  pitch: number;
  // 지도 회전 각도
  bearing: number;
  // 현재 지도상에서 선택된 웰니스 장소 정보
  selectedPlace: WellnessPlace | null;
  // 지도 비행 애니메이션 대상 좌표 및 줌 정보
  flightTarget: FlightTarget | null;
  // 지도 중심 좌표 변경 함수
  setCenter: (center: [number, number]) => void;
  // 지도 줌 레벨 변경 함수
  setZoom: (zoom: number) => void;
  // 선택된 장소 상태 업데이트 함수
  setSelectedPlace: (place: WellnessPlace | null) => void;
  // 특정 경도/위치/줌으로 부드럽게 지도를 이동(비행)시키는 함수
  flyToPlace: (longitude: number, latitude: number, zoom?: number) => void;
}

// Zustand 지도 전역 상태 스토어 생성 및 export
export const useMapStore = create<MapState>((set) => ({
  // 기본 설정에 정의된 초기 중심 좌표 지정
  center: INITIAL_MAP_CONFIG.center,
  // 기본 설정에 정의된 초기 줌 레벨 지정
  zoom: INITIAL_MAP_CONFIG.zoom,
  // 기본 설정에 정의된 초기 틸트 기울기 지정
  pitch: INITIAL_MAP_CONFIG.pitch,
  // 기본 설정에 정의된 초기 방위각 지정
  bearing: INITIAL_MAP_CONFIG.bearing,
  // 초기 선택 장소는 없음(null)
  selectedPlace: null,
  // 초기 비행 대상은 없음(null)
  flightTarget: null,
  // 중심 좌표 상태 갱신
  setCenter: (center) => set({ center }),
  // 줌 레벨 상태 갱신
  setZoom: (zoom) => set({ zoom }),
  // 선택된 장소 상태 갱신
  setSelectedPlace: (selectedPlace) => set({ selectedPlace }),
  // 지정 좌표로 지도 비행 이동 트리거
  flyToPlace: (longitude, latitude, zoom = 14) => {
    // 줌 레벨 정수 반올림 보정
    const targetZoom = Math.round(zoom || 14);
    // 새로운 중심 좌표, 줌 레벨, 비행 타겟 타임스탬프 갱신
    set({
      center: [longitude, latitude],
      zoom: targetZoom,
      flightTarget: {
        longitude,
        latitude,
        zoom: targetZoom,
        timestamp: Date.now(),
      },
    });
  },
}));
