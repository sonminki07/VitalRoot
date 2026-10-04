import { create } from "zustand";
import { INITIAL_MAP_CONFIG } from "../config/mapConfig";
import { WellnessPlace } from "../types/wellness.types";

export interface FlightTarget {
  longitude: number;
  latitude: number;
  zoom: number;
  timestamp: number;
}

interface MapState {
  center: [number, number]; // [경도, 위도]
  zoom: number;
  pitch: number;
  bearing: number;
  selectedPlace: WellnessPlace | null;
  flightTarget: FlightTarget | null;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setSelectedPlace: (place: WellnessPlace | null) => void;
  flyToPlace: (longitude: number, latitude: number, zoom?: number) => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: INITIAL_MAP_CONFIG.center,
  zoom: INITIAL_MAP_CONFIG.zoom,
  pitch: INITIAL_MAP_CONFIG.pitch,
  bearing: INITIAL_MAP_CONFIG.bearing,
  selectedPlace: null,
  flightTarget: null,
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedPlace: (selectedPlace) => set({ selectedPlace }),
  flyToPlace: (longitude, latitude, zoom = 14) => {
    const targetZoom = Math.round(zoom || 14);
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
