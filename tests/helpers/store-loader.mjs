// tests/helpers/store-loader.mjs
// Isolated store loader and mock environment for testing Zustand stores in Node.js

import { createJiti } from 'jiti';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Setup mock browser environment
const memoryStorage = new Map();

export const mockLocalStorage = {
  getItem: (key) => memoryStorage.get(key) ?? null,
  setItem: (key, value) => memoryStorage.set(key, String(value)),
  removeItem: (key) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
  get size() {
    return memoryStorage.size;
  },
  dump() {
    return Object.fromEntries(memoryStorage.entries());
  },
};

globalThis.localStorage = mockLocalStorage;

const listeners = new Map();
globalThis.window = {
  dispatchEvent: (event) => {
    const list = listeners.get(event.type) || [];
    for (const cb of list) {
      try {
        cb(event);
      } catch (err) {
        console.error('Error in window event listener:', err);
      }
    }
    return true;
  },
  addEventListener: (type, callback) => {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(callback);
  },
  removeEventListener: (type, callback) => {
    const list = listeners.get(type);
    if (!list) return;
    listeners.set(type, list.filter((cb) => cb !== callback));
  },
  localStorage: mockLocalStorage,
};

globalThis.CustomEvent = class CustomEvent {
  constructor(type, eventInitDict) {
    this.type = type;
    this.detail = eventInitDict?.detail ?? null;
  }
};

globalThis.confirm = () => true;
globalThis.alert = () => {};
globalThis.window.confirm = globalThis.confirm;
globalThis.window.alert = globalThis.alert;

globalThis.document = {
  createElement: () => ({
    setAttribute: () => {},
    appendChild: () => {},
    style: {},
  }),
};

// Initialize Jiti
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': path.resolve(projectRoot, 'src'),
  },
});

let wellnessStoreModule = null;
let wellnessDataModule = null;
let pedestrianRouterModule = null;
let supabaseModule = null;

export function loadModules() {
  if (!supabaseModule) {
    try {
      supabaseModule = jiti(path.resolve(projectRoot, 'src/utils/supabase.ts'));
      if (supabaseModule?.supabase?.auth) {
        supabaseModule.supabase.auth.getUser = async () => ({
          data: { user: { id: 'test-user-e2e', email: 'test@vitalroot.io' } },
          error: null,
        });
      }
    } catch (e) {
      // Supabase mock fallback
    }
  }
  if (!wellnessStoreModule) {
    wellnessStoreModule = jiti(path.resolve(projectRoot, 'src/store/wellnessStore.ts'));
  }
  if (!wellnessDataModule) {
    wellnessDataModule = jiti(path.resolve(projectRoot, 'src/config/wellnessData.ts'));
  }
  if (!pedestrianRouterModule) {
    pedestrianRouterModule = jiti(path.resolve(projectRoot, 'src/utils/pedestrianRouter.ts'));
  }
  return {
    useWellnessStore: wellnessStoreModule.useWellnessStore,
    wellnessData: wellnessDataModule,
    pedestrianRouter: pedestrianRouterModule,
    supabase: supabaseModule?.supabase,
  };
}

export function getWellnessStore() {
  return loadModules().useWellnessStore;
}

export function getWellnessData() {
  return loadModules().wellnessData;
}

export function getPedestrianRouter() {
  return loadModules().pedestrianRouter;
}

/**
 * Resets the Zustand wellness store back to its initial baseline state.
 * Clears localStorage, restores initial courses, quests, stays, and sets activeWalkSession to null.
 */
export function resetStore() {
  mockLocalStorage.clear();
  const { useWellnessStore, wellnessData } = loadModules();

  useWellnessStore.setState({
    profile: { ...wellnessData.INITIAL_USER_PROFILE },
    courses: [...wellnessData.INITIAL_WELLNESS_COURSES],
    filteredCourses: [...wellnessData.INITIAL_WELLNESS_COURSES],
    activeCourseId: wellnessData.INITIAL_WELLNESS_COURSES[0]?.id || 'course-1',
    courseMode: 'local',
    multiDayCourses: [...wellnessData.INITIAL_MULTI_DAY_COURSES],
    activeMultiDayCourseId: wellnessData.INITIAL_MULTI_DAY_COURSES[0]?.id || 'm-course-1',
    activeWaypointFilter: '전체',
    stays: [...wellnessData.INITIAL_WELLNESS_STAYS],
    activeStayId: null,
    stayFilter: { chkcooking: false, roomrefrigerator: false, fitness: false },
    quests: [...wellnessData.INITIAL_WELLNESS_QUESTS],
    activeQuestId: wellnessData.INITIAL_WELLNESS_QUESTS[0]?.id || 'quest-1',
    earnedTitles: [],
    equippedTitle: null,
    activeWalkSession: null,
    userLocation: { latitude: 37.5665, longitude: 126.978 }, // Seoul City Hall default
    isLocationModalOpen: false,
    isPinningHome: false,
    isOnboardingModalOpen: false,
    isSettingsModalOpen: false,
    themeMode: 'dark',
    fontSize: 'large',
    mapType: 'NORMAL',
    distanceUnit: 'auto',
    savedCustomCourses: [],
    isCourseLoading: false,
    isLoading: false,
  });

  return useWellnessStore;
}
