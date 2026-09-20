import { create } from "zustand";
import { DEFAULT_CIRCLE_SETTINGS } from "../config/mapConfig";
import { CircleSettings } from "../types/circle.types";

const STORAGE_KEY_CIRCLE = "vitalroot_circle_settings";

function getSavedCircleSettings(): CircleSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CIRCLE);
    if (saved) {
      return { ...DEFAULT_CIRCLE_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_CIRCLE_SETTINGS;
}

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

const initialSettings = getSavedCircleSettings();

export const useCircleStore = create<CircleState>((set, get) => ({
  ...initialSettings,
  setRadiusKm: (radiusKm) => {
    set({ radiusKm });
    try {
      localStorage.setItem(STORAGE_KEY_CIRCLE, JSON.stringify(get()));
    } catch {}
  },
  setColor: (color) => {
    set({ color });
    try {
      localStorage.setItem(STORAGE_KEY_CIRCLE, JSON.stringify(get()));
    } catch {}
  },
  setFillOpacity: (fillOpacity) => {
    set({ fillOpacity });
    try {
      localStorage.setItem(STORAGE_KEY_CIRCLE, JSON.stringify(get()));
    } catch {}
  },
  setCenter: (center) => {
    set({ center });
    try {
      localStorage.setItem(STORAGE_KEY_CIRCLE, JSON.stringify(get()));
    } catch {}
  },
  toggleDistanceLabels: () => {
    set((state) => ({ showDistanceLabels: !state.showDistanceLabels }));
    try {
      localStorage.setItem(STORAGE_KEY_CIRCLE, JSON.stringify(get()));
    } catch {}
  },
  toggleAngleLabels: () => {
    set((state) => ({ showAngleLabels: !state.showAngleLabels }));
    try {
      localStorage.setItem(STORAGE_KEY_CIRCLE, JSON.stringify(get()));
    } catch {}
  },
  toggleRadialLines: () => {
    set((state) => ({ showRadialLines: !state.showRadialLines }));
    try {
      localStorage.setItem(STORAGE_KEY_CIRCLE, JSON.stringify(get()));
    } catch {}
  },
  resetSettings: () => {
    set({ ...DEFAULT_CIRCLE_SETTINGS });
    try {
      localStorage.removeItem(STORAGE_KEY_CIRCLE);
    } catch {}
  },
}));
