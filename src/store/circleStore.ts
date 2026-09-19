import { create } from "zustand";
import { DEFAULT_CIRCLE_SETTINGS } from "../config/mapConfig";
import { CircleSettings } from "../types/circle.types";

interface CircleState extends CircleSettings {
  setRadiusKm: (radius: number) => void;
  setColor: (color: string) => void;
  setFillOpacity: (opacity: number) => void;
  setCenter: (center: [number, number]) => void;
  toggleDistanceLabels: () => void;
  toggleAngleLabels: () => void;
  toggleRadialLines: () => void;
  resetSettings: () => void;
}

export const useCircleStore = create<CircleState>((set) => ({
  ...DEFAULT_CIRCLE_SETTINGS,
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setColor: (color) => set({ color }),
  setFillOpacity: (fillOpacity) => set({ fillOpacity }),
  setCenter: (center) => set({ center }),
  toggleDistanceLabels: () =>
    set((state) => ({ showDistanceLabels: !state.showDistanceLabels })),
  toggleAngleLabels: () =>
    set((state) => ({ showAngleLabels: !state.showAngleLabels })),
  toggleRadialLines: () =>
    set((state) => ({ showRadialLines: !state.showRadialLines })),
  resetSettings: () => set({ ...DEFAULT_CIRCLE_SETTINGS }),
}));
