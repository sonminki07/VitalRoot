import { create } from "zustand";
import {
  UserProfile,
  WellnessCourseSet,
  ChronicCondition,
  MultiDayCourseSet,
  WellnessStay,
  WellnessQuest,
} from "../types/wellness.types";
import {
  INITIAL_USER_PROFILE,
  INITIAL_WELLNESS_COURSES,
  INITIAL_MULTI_DAY_COURSES,
  INITIAL_WELLNESS_STAYS,
  INITIAL_WELLNESS_QUESTS,
} from "../config/wellnessData";
import { supabase } from "../utils/supabase";

export type WaypointFilterType = "전체" | "화장실" | "쉼터" | "배리어프리";

const STORAGE_KEY_PROFILE = "vitalroot_user_profile";
const STORAGE_KEY_QUESTS = "vitalroot_user_quests";

// 로컬 스토리지에서 초기 프로필 불러오기 (새로고침 시 유지)
function getSavedProfile(): UserProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // fallback
  }
  return INITIAL_USER_PROFILE;
}

function getSavedQuests(): { completedIds: string[]; earnedTitles: string[] } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_QUESTS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // fallback
  }
  return { completedIds: [], earnedTitles: [] };
}

// 기저질환 조건에 따른 코스 실시간 필터링 함수 (저혈압 식후산책, 고혈압 쉼터, 당뇨 저당)
export function filterCoursesByConditions(
  courses: WellnessCourseSet[],
  conditions: ChronicCondition[]
): WellnessCourseSet[] {
  if (!conditions || conditions.length === 0) {
    return courses;
  }
  const filtered = courses.filter((course) => {
    return conditions.some((cond) => {
      if (cond === "저혈압" && (course.targetCondition.includes("저혈압") || course.targetCondition.includes("혈류"))) return true;
      if (cond === "고혈압" && (course.targetCondition.includes("고혈압") || course.targetCondition.includes("혈관"))) return true;
      if (cond === "당뇨" && (course.targetCondition.includes("당뇨") || course.targetCondition.includes("혈당"))) return true;
      if (
        (cond === "이상지질혈증" || cond === "신장질환" || cond === "관절/근골격계") &&
        (course.targetCondition.includes("대사") || course.targetCondition.includes("혈관"))
      )
        return true;
      return false;
    });
  });

  return filtered.length > 0 ? filtered : courses;
}

interface StayFilterOptions {
  chkcooking: boolean;
  roomrefrigerator: boolean;
  fitness: boolean;
}

interface WellnessState {
  profile: UserProfile;
  courses: WellnessCourseSet[];
  filteredCourses: WellnessCourseSet[];
  activeCourseId: string;
  multiDayCourses: MultiDayCourseSet[];
  activeMultiDayCourseId: string;
  activeWaypointFilter: WaypointFilterType;
  // 안심 숙소 관련
  stays: WellnessStay[];
  activeStayId: string | null;
  stayFilter: StayFilterOptions;
  // 퀘스트 관련
  quests: WellnessQuest[];
  activeQuestId: string | null;
  earnedTitles: string[];

  isSupabaseConnected: boolean;
  isLoading: boolean;

  // 액션
  setProfile: (updates: Partial<UserProfile>) => void;
  toggleCondition: (condition: ChronicCondition) => void;
  setActiveCourseId: (id: string) => void;
  setActiveMultiDayCourseId: (id: string) => void;
  setActiveWaypointFilter: (filter: WaypointFilterType) => void;
  setActiveStayId: (id: string | null) => void;
  toggleStayFilter: (key: keyof StayFilterOptions) => void;
  setActiveQuestId: (id: string | null) => void;
  completeQuest: (questId: string) => void;
  fetchSupabaseData: () => Promise<void>;
  syncProfileWithDb: (userId: string) => Promise<void>;
  saveProfileToDb: (userId: string, profile: UserProfile) => Promise<void>;
}

const initialProfile = getSavedProfile();
const initialFiltered = filterCoursesByConditions(INITIAL_WELLNESS_COURSES, initialProfile.chronicConditions);
const initialQuestData = getSavedQuests();

export const useWellnessStore = create<WellnessState>((set, get) => ({
  profile: initialProfile,
  courses: INITIAL_WELLNESS_COURSES,
  filteredCourses: initialFiltered,
  activeCourseId: initialFiltered[0]?.id ?? "course-1",
  multiDayCourses: INITIAL_MULTI_DAY_COURSES,
  activeMultiDayCourseId: INITIAL_MULTI_DAY_COURSES[0]?.id ?? "multi-course-1",
  activeWaypointFilter: "전체",
  stays: INITIAL_WELLNESS_STAYS,
  activeStayId: INITIAL_WELLNESS_STAYS[0]?.id ?? null,
  stayFilter: {
    chkcooking: false,
    roomrefrigerator: false,
    fitness: false,
  },
  quests: INITIAL_WELLNESS_QUESTS.map((q) => ({
    ...q,
    isCompleted: initialQuestData.completedIds.includes(q.id),
  })),
  activeQuestId: INITIAL_WELLNESS_QUESTS[0]?.id ?? null,
  earnedTitles: initialQuestData.earnedTitles,
  isSupabaseConnected: false,
  isLoading: false,

  setActiveStayId: (id) => set({ activeStayId: id }),

  toggleStayFilter: (key) => {
    set((state) => ({
      stayFilter: {
        ...state.stayFilter,
        [key]: !state.stayFilter[key],
      },
    }));
  },

  setActiveQuestId: (id) => set({ activeQuestId: id }),

  completeQuest: (questId) => {
    const targetQuest = get().quests.find((q) => q.id === questId);
    if (!targetQuest || targetQuest.isCompleted) return;

    const newQuests = get().quests.map((q) =>
      q.id === questId ? { ...q, isCompleted: true } : q
    );
    const newEarnedTitles = Array.from(new Set([...get().earnedTitles, targetQuest.titleReward]));

    set({
      quests: newQuests,
      earnedTitles: newEarnedTitles,
    });

    try {
      localStorage.setItem(
        STORAGE_KEY_QUESTS,
        JSON.stringify({
          completedIds: newQuests.filter((q) => q.isCompleted).map((q) => q.id),
          earnedTitles: newEarnedTitles,
        })
      );
    } catch {
      // ignore
    }
  },

  setProfile: (updates) => {
    const updatedProfile = { ...get().profile, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updatedProfile));
    } catch {
      // ignore
    }

    const filtered = filterCoursesByConditions(get().courses, updatedProfile.chronicConditions);
    const activeCourseExists = filtered.some((c) => c.id === get().activeCourseId);

    set({
      profile: updatedProfile,
      filteredCourses: filtered,
      activeCourseId: activeCourseExists ? get().activeCourseId : filtered[0]?.id ?? "course-1",
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        get().saveProfileToDb(user.id, updatedProfile);
      }
    });
  },

  toggleCondition: (condition) => {
    const { profile, courses } = get();
    const exists = profile.chronicConditions.includes(condition);
    const newConditions = exists
      ? profile.chronicConditions.filter((c) => c !== condition)
      : [...profile.chronicConditions, condition];

    const updatedProfile: UserProfile = { ...profile, chronicConditions: newConditions };
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updatedProfile));
    } catch {
      // ignore
    }

    const filtered = filterCoursesByConditions(courses, newConditions);
    const activeCourseExists = filtered.some((c) => c.id === get().activeCourseId);

    set({
      profile: updatedProfile,
      filteredCourses: filtered,
      activeCourseId: activeCourseExists ? get().activeCourseId : filtered[0]?.id ?? "course-1",
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        get().saveProfileToDb(user.id, updatedProfile);
      }
    });
  },

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

  // 로그인 시 Supabase DB에서 사용자 프로필 복원
  syncProfileWithDb: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data && !error) {
        const loadedProfile: UserProfile = {
          userName: data.user_name || "웰니스 여행자",
          chronicConditions: (data.chronic_conditions as ChronicCondition[]) || ["당뇨"],
          allergies: data.allergies || [],
          dietaryPreference: data.dietary_preference || "저염/저탄수",
          conditionToday: data.condition_today || "평지 산책 희망",
        };
        try {
          localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(loadedProfile));
        } catch {
          // ignore
        }

        const filtered = filterCoursesByConditions(get().courses, loadedProfile.chronicConditions);
        set({
          profile: loadedProfile,
          filteredCourses: filtered,
          activeCourseId: filtered[0]?.id ?? "course-1",
        });
      }
    } catch (err) {
      console.warn("Failed to sync profile from DB:", err);
    }
  },

  // 프로필 변경 시 Supabase DB에 저장 (upsert)
  saveProfileToDb: async (userId: string, profileToSave: UserProfile) => {
    try {
      await supabase.from("user_profiles").upsert({
        id: userId,
        user_name: profileToSave.userName,
        chronic_conditions: profileToSave.chronicConditions,
        allergies: profileToSave.allergies,
        dietary_preference: profileToSave.dietaryPreference,
        condition_today: profileToSave.conditionToday,
      });
    } catch (err) {
      console.warn("Failed to save profile to DB:", err);
    }
  },
}));
