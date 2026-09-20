import { create } from "zustand";
import {
  UserProfile,
  WellnessCourseSet,
  ChronicCondition,
  MultiDayCourseSet,
} from "../types/wellness.types";
import {
  INITIAL_USER_PROFILE,
  INITIAL_WELLNESS_COURSES,
  INITIAL_MULTI_DAY_COURSES,
} from "../config/wellnessData";
import { supabase } from "../utils/supabase";

export type WaypointFilterType = "전체" | "화장실" | "쉼터" | "배리어프리";

interface WellnessState {
  profile: UserProfile;
  courses: WellnessCourseSet[];
  activeCourseId: string;
  multiDayCourses: MultiDayCourseSet[];
  activeMultiDayCourseId: string;
  activeWaypointFilter: WaypointFilterType;
  isSupabaseConnected: boolean;
  isLoading: boolean;

  // 액션
  setProfile: (profile: Partial<UserProfile>) => void;
  toggleCondition: (condition: ChronicCondition) => void;
  setActiveCourseId: (id: string) => void;
  setActiveMultiDayCourseId: (id: string) => void;
  setActiveWaypointFilter: (filter: WaypointFilterType) => void;
  fetchSupabaseData: () => Promise<void>;
}

export const useWellnessStore = create<WellnessState>((set) => ({
  profile: INITIAL_USER_PROFILE,
  courses: INITIAL_WELLNESS_COURSES,
  activeCourseId: INITIAL_WELLNESS_COURSES[0]?.id ?? "course-1",
  multiDayCourses: INITIAL_MULTI_DAY_COURSES,
  activeMultiDayCourseId: INITIAL_MULTI_DAY_COURSES[0]?.id ?? "multi-course-1",
  activeWaypointFilter: "전체",
  isSupabaseConnected: false,
  isLoading: false,

  setProfile: (updates) =>
    set((state) => ({ profile: { ...state.profile, ...updates } })),

  toggleCondition: (condition) =>
    set((state) => {
      const exists = state.profile.chronicConditions.includes(condition);
      const newConditions = exists
        ? state.profile.chronicConditions.filter((c) => c !== condition)
        : [...state.profile.chronicConditions, condition];
      return {
        profile: { ...state.profile, chronicConditions: newConditions },
      };
    }),

  setActiveCourseId: (activeCourseId) => set({ activeCourseId }),

  setActiveMultiDayCourseId: (activeMultiDayCourseId) => set({ activeMultiDayCourseId }),

  setActiveWaypointFilter: (activeWaypointFilter) => set({ activeWaypointFilter }),

  fetchSupabaseData: async () => {
    set({ isLoading: true });
    try {
      const { data: places, error: placesErr } = await supabase
        .from("wellness_places")
        .select("*");

      if (!placesErr && places && places.length > 0) {
        set({ isSupabaseConnected: true });
      } else {
        set({ isSupabaseConnected: false });
      }
    } catch {
      set({ isSupabaseConnected: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
