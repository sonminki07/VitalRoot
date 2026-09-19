import { create } from "zustand";
import {
  UserProfile,
  WellnessCourseSet,
  ChronicCondition,
} from "../types/wellness.types";
import {
  INITIAL_USER_PROFILE,
  INITIAL_WELLNESS_COURSES,
} from "../config/wellnessData";
import { supabase } from "../utils/supabase";

interface WellnessState {
  profile: UserProfile;
  courses: WellnessCourseSet[];
  activeCourseId: string;
  isSupabaseConnected: boolean;
  isLoading: boolean;
  selectedCouponModal: WellnessCourseSet["questCoupon"] | null;

  // 액션
  setProfile: (profile: Partial<UserProfile>) => void;
  toggleCondition: (condition: ChronicCondition) => void;
  setActiveCourseId: (id: string) => void;
  completeQuest: (courseId: string) => void;
  setSelectedCouponModal: (coupon: WellnessCourseSet["questCoupon"] | null) => void;
  fetchSupabaseData: () => Promise<void>;
}

export const useWellnessStore = create<WellnessState>((set) => ({
  profile: INITIAL_USER_PROFILE,
  courses: INITIAL_WELLNESS_COURSES,
  activeCourseId: INITIAL_WELLNESS_COURSES[0]?.id ?? "course-1",
  isSupabaseConnected: false,
  isLoading: false,
  selectedCouponModal: null,

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

  completeQuest: (courseId) =>
    set((state) => {
      const updated = state.courses.map((course) => {
        if (course.id === courseId) {
          return {
            ...course,
            questCoupon: { ...course.questCoupon, isCompleted: true },
          };
        }
        return course;
      });
      return {
        courses: updated,
        profile: {
          ...state.profile,
          recoloredZones: state.profile.recoloredZones + 1,
        },
      };
    }),

  setSelectedCouponModal: (coupon) => set({ selectedCouponModal: coupon }),

  fetchSupabaseData: async () => {
    set({ isLoading: true });
    try {
      // 1. Supabase 테이블 조회 시도
      const { data: places, error: placesErr } = await supabase
        .from("wellness_places")
        .select("*");

      if (!placesErr && places && places.length > 0) {
        set({ isSupabaseConnected: true });
      } else {
        // 테이블이 없거나 비어있는 경우 폴백 유지
        set({ isSupabaseConnected: false });
      }
    } catch {
      set({ isSupabaseConnected: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
