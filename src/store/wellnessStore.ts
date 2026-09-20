import { create } from "zustand";
import {
  UserProfile,
  WellnessCourseSet,
  ChronicCondition,
  MultiDayCourseSet,
  WellnessStay,
  WellnessQuest,
  FontSizeSetting,
  AppThemeMode,
  SavedCustomCourse,
} from "../types/wellness.types";
import {
  INITIAL_USER_PROFILE,
  INITIAL_WELLNESS_COURSES,
  INITIAL_MULTI_DAY_COURSES,
  INITIAL_WELLNESS_STAYS,
  INITIAL_WELLNESS_QUESTS,
} from "../config/wellnessData";
import { supabase } from "../utils/supabase";
import { calculateDistanceMeters } from "../utils/pedestrianRouter";

export type WaypointFilterType = "전체" | "화장실" | "쉼터" | "배리어프리";

const STORAGE_KEY_PROFILE = "vitalroot_user_profile";
const STORAGE_KEY_QUESTS = "vitalroot_user_quests";
const STORAGE_KEY_LOCATION = "vitalroot_user_location";
const STORAGE_KEY_THEME = "vitalroot_theme_mode";
const STORAGE_KEY_FONT_SIZE = "vitalroot_font_size";
const STORAGE_KEY_MAP_TYPE = "vitalroot_map_type";
const STORAGE_KEY_DISTANCE_UNIT = "vitalroot_distance_unit";
const STORAGE_KEY_SAVED_COURSES = "vitalroot_saved_courses";

function getSavedLocation(): { latitude: number; longitude: number } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LOCATION);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // fallback
  }
  return null;
}

function getSavedTheme(): AppThemeMode {
  try {
    const s = localStorage.getItem(STORAGE_KEY_THEME);
    if (s === "light" || s === "dark") return s;
  } catch {}
  return "dark";
}

function getSavedFontSize(): FontSizeSetting {
  try {
    const s = localStorage.getItem(STORAGE_KEY_FONT_SIZE);
    if (s === "normal" || s === "large" || s === "xlarge") return s;
  } catch {}
  return "large"; // 기본 폰트 크기 'large' (가독성 향상)
}

function getSavedMapType(): "NORMAL" | "HYBRID" {
  try {
    const s = localStorage.getItem(STORAGE_KEY_MAP_TYPE);
    if (s === "NORMAL" || s === "HYBRID") return s;
  } catch {}
  return "NORMAL";
}

function getSavedDistanceUnit(): "auto" | "km" | "m" {
  try {
    const s = localStorage.getItem(STORAGE_KEY_DISTANCE_UNIT);
    if (s === "auto" || s === "km" || s === "m") return s;
  } catch {}
  return "auto";
}

function getSavedCustomCourses(): SavedCustomCourse[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY_SAVED_COURSES);
    if (s) return JSON.parse(s);
  } catch {}
  return [];
}

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
export function checkIsOnboardingComplete(profile: UserProfile): boolean {
  // 1. 기저질환 지표 1개 이상 선택
  const hasConditions = Boolean(profile.chronicConditions && profile.chronicConditions.length > 0);
  // 2. 복용 의약품 1개 이상 등록 또는 '복용 약물 없음' 명시적 체크
  const hasMedicationInfo = Boolean(
    profile.hasNoMedications || (profile.medications && profile.medications.length > 0)
  );
  // 3. 보행 체력 및 산책 필수 인프라 선호 1개 이상 선택
  const hasFitnessOrInfra = Boolean(
    profile.walkFitnessLevel || (profile.requiredInfra && profile.requiredInfra.length > 0)
  );

  return hasConditions && hasMedicationInfo && hasFitnessOrInfra;
}

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

// 듀얼 모드(내 동네 생활권 vs 테마 명소 여행) 및 GPS 위치 기반 통합 필터링 함수
export function computeFilteredCourses(
  courses: WellnessCourseSet[],
  conditions: ChronicCondition[],
  userLocation: { latitude: number; longitude: number } | null,
  mode: "local" | "theme"
): WellnessCourseSet[] {
  // 1. 질환 조건 필터링
  const conditionFiltered = filterCoursesByConditions(courses, conditions);

  // 2. 테마 명소 여행 모드: 전통 명소(isLocal !== true) 우선 표출
  if (mode === "theme") {
    const themeCourses = conditionFiltered.filter((c) => !c.isLocal);
    const targetList = themeCourses.length > 0 ? themeCourses : conditionFiltered;
    if (userLocation) {
      return [...targetList].sort((a, b) => {
        const distA = calculateDistanceMeters(
          userLocation.latitude,
          userLocation.longitude,
          a.restaurant.latitude,
          a.restaurant.longitude
        );
        const distB = calculateDistanceMeters(
          userLocation.latitude,
          userLocation.longitude,
          b.restaurant.latitude,
          b.restaurant.longitude
        );
        return distA - distB;
      });
    }
    return targetList;
  }

  // 3. 내 동네 생활권 모드 ('local')
  if (userLocation) {
    // 사용자 위치로부터 거리순 정렬
    const sorted = [...conditionFiltered].sort((a, b) => {
      const distA = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        a.restaurant.latitude,
        a.restaurant.longitude
      );
      const distB = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        b.restaurant.latitude,
        b.restaurant.longitude
      );
      return distA - distB;
    });

    // 15km 이내 생활권 코스가 있다면 우선 반환 (안산에 있으면 안산 코스들이 반경 1~3km 내에 위치하므로 100% 매칭!)
    const nearby = sorted.filter((c) => {
      const dist = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        c.restaurant.latitude,
        c.restaurant.longitude
      );
      return dist <= 15000;
    });

    return nearby.length > 0 ? nearby : sorted;
  }

  // 위치 미연동 시 기본 추천 코스 반환
  return conditionFiltered;
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
  courseMode: "local" | "theme";
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
  // 사용자 위치(GPS) 관련
  userLocation: { latitude: number; longitude: number } | null;
  isLocationModalOpen: boolean;
  isPinningHome: boolean;

  // 온보딩 및 설정 모달
  isOnboardingModalOpen: boolean;
  isSettingsModalOpen: boolean;
  settingsInitialTab: "health" | "travel" | "system";

  // 테마, 글자크기, 지도타입, 거리단위, 코스보관함, 트랜지션 로딩
  themeMode: AppThemeMode;
  fontSize: FontSizeSetting;
  mapType: "NORMAL" | "HYBRID";
  distanceUnit: "auto" | "km" | "m";
  savedCustomCourses: SavedCustomCourse[];
  isCourseLoading: boolean;

  isSupabaseConnected: boolean;
  isLoading: boolean;

  // 액션
  setProfile: (updates: Partial<UserProfile>) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  openOnboardingModal: () => void;
  closeOnboardingModal: () => void;
  openSettingsModal: (tab?: "health" | "travel" | "system") => void;
  closeSettingsModal: () => void;
  setThemeMode: (mode: AppThemeMode) => void;
  setFontSize: (size: FontSizeSetting) => void;
  setMapType: (type: "NORMAL" | "HYBRID") => void;
  toggleDistanceUnit: () => void;
  saveCustomCourse: (course: SavedCustomCourse) => void;
  removeCustomCourse: (id: string) => void;
  setIsCourseLoading: (loading: boolean) => void;
  toggleCondition: (condition: ChronicCondition) => void;
  setCourseMode: (mode: "local" | "theme") => void;
  setActiveCourseId: (id: string) => void;
  setActiveMultiDayCourseId: (id: string) => void;
  setActiveWaypointFilter: (filter: WaypointFilterType) => void;
  setActiveStayId: (id: string | null) => void;
  toggleStayFilter: (key: keyof StayFilterOptions) => void;
  setActiveQuestId: (id: string | null) => void;
  completeQuest: (questId: string) => void;
  setUserLocation: (loc: { latitude: number; longitude: number } | null) => void;
  setIsLocationModalOpen: (open: boolean) => void;
  setIsPinningHome: (pinning: boolean) => void;
  fetchSupabaseData: () => Promise<void>;
  syncProfileWithDb: (userId: string) => Promise<void>;
  saveProfileToDb: (userId: string, profile: UserProfile) => Promise<void>;
}

const initialProfile = getSavedProfile();
const initialSavedLoc = getSavedLocation();
const initialFiltered = computeFilteredCourses(
  INITIAL_WELLNESS_COURSES,
  initialProfile.chronicConditions,
  initialSavedLoc,
  "local"
);
const initialQuestData = getSavedQuests();
const initialTheme = getSavedTheme();
const initialFontSize = getSavedFontSize();
const initialMapType = getSavedMapType();
const initialDistUnit = getSavedDistanceUnit();
const initialSavedCourses = getSavedCustomCourses();

export const useWellnessStore = create<WellnessState>((set, get) => ({
  profile: initialProfile,
  courses: INITIAL_WELLNESS_COURSES,
  filteredCourses: initialFiltered,
  activeCourseId: initialFiltered[0]?.id ?? "course-1",
  courseMode: "local",
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
  userLocation: initialSavedLoc,
  isLocationModalOpen: false,
  isPinningHome: false,

  isOnboardingModalOpen: false,
  isSettingsModalOpen: false,
  settingsInitialTab: "health",

  themeMode: initialTheme,
  fontSize: initialFontSize,
  mapType: initialMapType,
  distanceUnit: initialDistUnit,
  savedCustomCourses: initialSavedCourses,
  isCourseLoading: false,

  isSupabaseConnected: false,
  isLoading: false,

  openOnboardingModal: () => set({ isOnboardingModalOpen: true }),
  closeOnboardingModal: () => set({ isOnboardingModalOpen: false }),
  openSettingsModal: (tab = "health") =>
    set({ isSettingsModalOpen: true, settingsInitialTab: tab }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),

  setThemeMode: (themeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, themeMode);
      if (themeMode === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    } catch {}
    set({ themeMode });
  },

  setFontSize: (fontSize) => {
    try {
      localStorage.setItem(STORAGE_KEY_FONT_SIZE, fontSize);
      document.documentElement.setAttribute("data-font-size", fontSize);
    } catch {}
    set({ fontSize });
  },

  setMapType: (mapType) => {
    try {
      localStorage.setItem(STORAGE_KEY_MAP_TYPE, mapType);
    } catch {}
    set({ mapType });
  },

  toggleDistanceUnit: () => {
    const current = get().distanceUnit;
    const next = current === "auto" ? "km" : current === "km" ? "m" : "auto";
    try {
      localStorage.setItem(STORAGE_KEY_DISTANCE_UNIT, next);
    } catch {}
    set({ distanceUnit: next });
  },

  saveCustomCourse: (course) => {
    const saved = [...get().savedCustomCourses, course];
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_COURSES, JSON.stringify(saved));
    } catch {}
    set({ savedCustomCourses: saved });
  },

  removeCustomCourse: (id) => {
    const saved = get().savedCustomCourses.filter((c) => c.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_COURSES, JSON.stringify(saved));
    } catch {}
    set({ savedCustomCourses: saved });
  },

  setIsCourseLoading: (isCourseLoading) => set({ isCourseLoading }),

  setIsLocationModalOpen: (open) => set({ isLocationModalOpen: open }),
  setIsPinningHome: (pinning) => set({ isPinningHome: pinning }),

  updateProfile: (updates) => {
    const current = get().profile;
    const updated: UserProfile = { ...current, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updated));
    } catch {
      // ignore
    }
    const { courses, userLocation, courseMode } = get();
    const filtered = computeFilteredCourses(
      courses,
      updated.chronicConditions,
      userLocation,
      courseMode
    );
    set({
      profile: updated,
      filteredCourses: filtered,
    });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        get().saveProfileToDb(user.id, updated);
      }
    });
  },

  setCourseMode: (mode) => {
    const { courses, profile, userLocation } = get();
    const updated = computeFilteredCourses(courses, profile.chronicConditions, userLocation, mode);
    set({
      courseMode: mode,
      filteredCourses: updated,
      activeCourseId: updated[0]?.id || "course-1",
    });
  },

  setUserLocation: (loc) => {
    try {
      if (loc) {
        localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(loc));
      } else {
        localStorage.removeItem(STORAGE_KEY_LOCATION);
      }
    } catch {
      // ignore
    }
    const { courses, profile, courseMode } = get();
    const updated = computeFilteredCourses(courses, profile.chronicConditions, loc, courseMode);
    set({
      userLocation: loc,
      isPinningHome: false,
      filteredCourses: updated,
      activeCourseId: updated[0]?.id || "course-1",
    });
  },

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

  completeQuest: async (questId) => {
    // 1. 로그인 여부 검증
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("🏅 칭호 획득 및 퀘스트 완보 인증은 로그인 회원만 가능합니다.\n로그인 창으로 이동합니다.");
      const { useAuthStore } = await import("./authStore");
      useAuthStore.getState().openModal("signin");
      return;
    }

    const targetQuest = get().quests.find((q) => q.id === questId);
    if (!targetQuest || targetQuest.isCompleted) return;

    // 2. 현재 GPS/핀 위치와 퀘스트 명소 간 거리 검증 (300m 반경)
    const { userLocation } = get();
    if (userLocation) {
      const dist = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        targetQuest.latitude,
        targetQuest.longitude
      );
      if (dist > 300) {
        const proceed = confirm(
          `📍 현재 위치가 퀘스트 명소(${targetQuest.landmarkName})로부터 약 ${Math.round(dist)}m 떨어져 있습니다.\n(현장 반경 300m 이내 실시간 인증 원칙)\n\n[개발/시연 모드] 모의 현장 체류 인증(15분 완보)으로 칭호를 획득하시겠습니까?`
        );
        if (!proceed) return;
      }
    }

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
    alert(`🎉 축하합니다! [${targetQuest.titleReward}] 웰니스 칭호를 성공적으로 획득하셨습니다!`);
  },

  setProfile: (updates) => {
    const updatedProfile = { ...get().profile, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updatedProfile));
    } catch {
      // ignore
    }

    const { courses, userLocation, courseMode } = get();
    const filtered = computeFilteredCourses(courses, updatedProfile.chronicConditions, userLocation, courseMode);
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
    const { profile, courses, userLocation, courseMode } = get();
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

    const filtered = computeFilteredCourses(courses, newConditions, userLocation, courseMode);
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
          medications: data.medications || [],
          hasNoMedications: data.has_no_medications ?? false,
          allergies: data.allergies || [],
          dietaryPreference: data.dietary_preference || "저염/저탄수화물",
          conditionToday: data.condition_today || "식후 30분 가벼운 평지 산책 희망",
          walkFitnessLevel: data.walk_fitness_level || "식후 30분 가벼운 평지 산책 희망",
          requiredInfra: data.required_infra || ["중간 화장실 필수", "완만한 평지/쉼터 필수"],
        };
        try {
          localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(loadedProfile));
        } catch {
          // ignore
        }

        const { courses, userLocation, courseMode } = get();
        const filtered = computeFilteredCourses(courses, loadedProfile.chronicConditions, userLocation, courseMode);
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
      // 1. 신규 확장 컬럼 포함 저장 시도
      const { error } = await supabase.from("user_profiles").upsert({
        id: userId,
        user_name: profileToSave.userName,
        chronic_conditions: profileToSave.chronicConditions,
        allergies: profileToSave.allergies,
        dietary_preference: profileToSave.dietaryPreference,
        condition_today: profileToSave.conditionToday,
        medications: profileToSave.medications,
        has_no_medications: profileToSave.hasNoMedications,
        walk_fitness_level: profileToSave.walkFitnessLevel,
        required_infra: profileToSave.requiredInfra,
      });

      // 2. 만약 DB에 신규 컬럼이 아직 없어서 에러 발생 시, 기존 기본 스키마 컬럼만으로 세이프티 폴백 저장
      if (error) {
        await supabase.from("user_profiles").upsert({
          id: userId,
          user_name: profileToSave.userName,
          chronic_conditions: profileToSave.chronicConditions,
          allergies: profileToSave.allergies,
          dietary_preference: profileToSave.dietaryPreference,
          condition_today: profileToSave.conditionToday,
        });
      }
    } catch (err) {
      console.warn("Failed to save profile to DB:", err);
    }
  },
}));
