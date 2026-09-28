// tests/m2-adversarial-challenger1.test.mjs
// Adversarial Challenger 1 Test Suite for Milestone 2

import { describe, test, expect, beforeEach } from './helpers/test-harness.mjs';
import { resetStore, getWellnessStore, loadModules } from './helpers/store-loader.mjs';
import { shallow } from 'zustand/shallow';
import { createJiti } from 'jiti';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const jiti = createJiti(import.meta.url, {
  alias: {
    '@': path.resolve(projectRoot, 'src'),
  },
});

const { useAuthStore } = jiti(path.resolve(projectRoot, 'src/store/authStore.ts'));

function resetAllStores() {
  resetStore();
  useAuthStore.setState({
    user: null,
    session: null,
    isModalOpen: false,
    authTab: 'signin',
    authStep: 'form',
    authView: 'emailInput',
    errorMessage: null,
  });
}

// =========================================================================
// SUITE 1: Universal 9-Component Re-render Immunity Under 1,000 Ticks
// =========================================================================
describe('M2 Challenger 1: Universal 9-Component Re-render Immunity', () => {
  beforeEach(() => {
    resetAllStores();
  });

  test('1.1: All 9 consumer components maintain 100% shallow equality across 1,000 timer ticks', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');

    // 1. MapContainer selector
    const mapContainerSel = (s) => ({
      filteredCourses: s.filteredCourses,
      activeCourseId: s.activeCourseId,
      activeWaypointFilter: s.activeWaypointFilter,
      setActiveWaypointFilter: s.setActiveWaypointFilter,
      stays: s.stays,
      activeStayId: s.activeStayId,
      quests: s.quests,
      activeQuestId: s.activeQuestId,
      userLocation: s.userLocation,
      setUserLocation: s.setUserLocation,
      setIsLocationModalOpen: s.setIsLocationModalOpen,
      isPinningHome: s.isPinningHome,
      setIsPinningHome: s.setIsPinningHome,
      mapType: s.mapType,
      setMapType: s.setMapType,
      distanceUnit: s.distanceUnit,
      toggleDistanceUnit: s.toggleDistanceUnit,
      saveCustomCourse: s.saveCustomCourse,
      isOnboardingModalOpen: s.isOnboardingModalOpen,
      isSettingsModalOpen: s.isSettingsModalOpen,
      themeMode: s.themeMode,
    });

    // 2. ControlPanel main selector
    const controlPanelSel = (s) => ({
      profile: s.profile,
      filteredCourses: s.filteredCourses,
      activeCourseId: s.activeCourseId,
      setActiveCourseId: s.setActiveCourseId,
      multiDayCourses: s.multiDayCourses,
      activeMultiDayCourseId: s.activeMultiDayCourseId,
      setActiveMultiDayCourseId: s.setActiveMultiDayCourseId,
      stays: s.stays,
      activeStayId: s.activeStayId,
      setActiveStayId: s.setActiveStayId,
      stayFilter: s.stayFilter,
      toggleStayFilter: s.toggleStayFilter,
      quests: s.quests,
      activeQuestId: s.activeQuestId,
      setActiveQuestId: s.setActiveQuestId,
      earnedTitles: s.earnedTitles,
      equippedTitle: s.equippedTitle,
      equipTitle: s.equipTitle,
      startWalkSession: s.startWalkSession,
      toggleCondition: s.toggleCondition,
      userLocation: s.userLocation,
      setIsLocationModalOpen: s.setIsLocationModalOpen,
      setIsPinningHome: s.setIsPinningHome,
      courseMode: s.courseMode,
      setCourseMode: s.setCourseMode,
      openSettingsModal: s.openSettingsModal,
      themeMode: s.themeMode,
      currentRegionName: s.currentRegionName,
      isRegionLoading: s.isRegionLoading,
    });

    // 3. ControlPanel activeQuestSessionId atomic selector
    const controlPanelQuestIdSel = (s) => s.activeWalkSession?.questId ?? null;

    // 4. App main selector
    const appSel = (s) => ({
      profile: s.profile,
      openOnboardingModal: s.openOnboardingModal,
      themeMode: s.themeMode,
      userLocation: s.userLocation,
      loadRegionData: s.loadRegionData,
    });

    // 5. HealthProfileAlertBanner selector
    const alertBannerSel = (s) => ({
      profile: s.profile,
      openOnboardingModal: s.openOnboardingModal,
      themeMode: s.themeMode,
    });

    // 6. AuthButton equippedTitle atomic selector
    const authButtonTitleSel = (s) => s.equippedTitle;

    // 7. InfoBar isSupabaseConnected atomic selector
    const infoBarSel = (s) => s.isSupabaseConnected;

    // 8. LocationModal selector
    const locationModalSel = (s) => ({
      isLocationModalOpen: s.isLocationModalOpen,
      setIsLocationModalOpen: s.setIsLocationModalOpen,
      setUserLocation: s.setUserLocation,
      setIsPinningHome: s.setIsPinningHome,
      loadRegionData: s.loadRegionData,
    });

    // 9. OnboardingModal selector
    const onboardingModalSel = (s) => ({
      profile: s.profile,
      updateProfile: s.updateProfile,
      isOnboardingModalOpen: s.isOnboardingModalOpen,
      closeOnboardingModal: s.closeOnboardingModal,
    });

    // 10. SettingsModal selector
    const settingsModalSel = (s) => ({
      profile: s.profile,
      updateProfile: s.updateProfile,
      isSettingsModalOpen: s.isSettingsModalOpen,
      closeSettingsModal: s.closeSettingsModal,
      settingsInitialTab: s.settingsInitialTab,
      userLocation: s.userLocation,
      setIsPinningHome: s.setIsPinningHome,
      earnedTitles: s.earnedTitles,
      themeMode: s.themeMode,
      setThemeMode: s.setThemeMode,
      fontSize: s.fontSize,
      setFontSize: s.setFontSize,
      savedCustomCourses: s.savedCustomCourses,
      removeCustomCourse: s.removeCustomCourse,
    });

    // Capture baselines
    const baselineState = store.getState();
    const baseMap = mapContainerSel(baselineState);
    const baseCP = controlPanelSel(baselineState);
    const baseCPQuestId = controlPanelQuestIdSel(baselineState);
    const baseApp = appSel(baselineState);
    const baseAlert = alertBannerSel(baselineState);
    const baseAuthTitle = authButtonTitleSel(baselineState);
    const baseInfo = infoBarSel(baselineState);
    const baseLoc = locationModalSel(baselineState);
    const baseOnb = onboardingModalSel(baselineState);
    const baseSet = settingsModalSel(baselineState);

    // Run 1,000 consecutive timer ticks
    for (let i = 0; i < 1000; i++) {
      store.getState().updateWalkSessionTick();
      const state = store.getState();

      expect(shallow(baseMap, mapContainerSel(state))).toBe(true);
      expect(shallow(baseCP, controlPanelSel(state))).toBe(true);
      expect(controlPanelQuestIdSel(state)).toBe(baseCPQuestId);
      expect(shallow(baseApp, appSel(state))).toBe(true);
      expect(shallow(baseAlert, alertBannerSel(state))).toBe(true);
      expect(authButtonTitleSel(state)).toBe(baseAuthTitle);
      expect(infoBarSel(state)).toBe(baseInfo);
      expect(shallow(baseLoc, locationModalSel(state))).toBe(true);
      expect(shallow(baseOnb, onboardingModalSel(state))).toBe(true);
      expect(shallow(baseSet, settingsModalSel(state))).toBe(true);
    }

    store.getState().cancelWalkSession();
  });
});

// =========================================================================
// SUITE 2: Zustand External Store Subscription Callback Verification
// =========================================================================
describe('M2 Challenger 1: useSyncExternalStore Notification Emulation', () => {
  beforeEach(() => {
    resetAllStores();
  });

  test('2.1: Subscribers using shallow comparator receive ZERO change notifications on ticks', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');

    // Emulate React's useSyncExternalStoreWithSelector with shallow equality
    const mapContainerSel = (s) => ({
      filteredCourses: s.filteredCourses,
      activeCourseId: s.activeCourseId,
      stays: s.stays,
      quests: s.quests,
      themeMode: s.themeMode,
    });

    let currentMapSlice = mapContainerSel(store.getState());
    let mapRenderCount = 0;

    // Emulate React subscription:
    const unsubscribeMap = store.subscribe((newState) => {
      const nextSlice = mapContainerSel(newState);
      if (!shallow(currentMapSlice, nextSlice)) {
        currentMapSlice = nextSlice;
        mapRenderCount++;
      }
    });

    // Emulate Leaf subscriber (MapWalkSessionBanner)
    let bannerRenderCount = 0;
    let currentBannerSlice = store.getState().activeWalkSession;
    const unsubscribeBanner = store.subscribe((newState) => {
      const nextSlice = newState.activeWalkSession;
      if (nextSlice !== currentBannerSlice) {
        currentBannerSlice = nextSlice;
        bannerRenderCount++;
      }
    });

    // Run 20 ticks
    for (let t = 0; t < 20; t++) {
      store.getState().updateWalkSessionTick();
    }

    // MapContainer re-render count MUST BE EXACTLY ZERO!
    expect(mapRenderCount).toBe(0);

    // Leaf banner re-render count MUST BE EXACTLY 20!
    expect(bannerRenderCount).toBe(20);

    // Now make a legitimate change to map state (e.g. toggle themeMode)
    store.getState().setThemeMode('light');
    expect(mapRenderCount).toBe(1);

    unsubscribeMap();
    unsubscribeBanner();
    store.getState().cancelWalkSession();
  });
});

// =========================================================================
// SUITE 3: WalkSessionTimerController Concurrent / Race Stress
// =========================================================================
describe('M2 Challenger 1: Timer Interval Stability & Race Conditions', () => {
  beforeEach(() => {
    resetAllStores();
  });

  test('3.1: Rapid start/fastForward/cancel cycles preserve clean state transitions', () => {
    const store = getWellnessStore();

    for (let cycle = 0; cycle < 50; cycle++) {
      store.getState().startWalkSession('quest-1');
      expect(store.getState().activeWalkSession).not.toBeNull();
      expect(store.getState().activeWalkSession.isEligible).toBe(false);

      store.getState().updateWalkSessionTick();
      expect(store.getState().activeWalkSession).not.toBeNull();

      store.getState().fastForwardWalkSession();
      expect(store.getState().activeWalkSession.isEligible).toBe(true);

      store.getState().updateWalkSessionTick();
      expect(store.getState().activeWalkSession.isEligible).toBe(true);

      store.getState().cancelWalkSession();
      expect(store.getState().activeWalkSession).toBeNull();

      // Tick while null
      store.getState().updateWalkSessionTick();
      expect(store.getState().activeWalkSession).toBeNull();
    }
  });

  test('3.2: GPS transition during session updates distance and eligibility dynamically', () => {
    const store = getWellnessStore();
    const quest = store.getState().quests.find((q) => q.id === 'quest-1');
    const target = { latitude: quest.latitude, longitude: quest.longitude };

    // Start with user at target
    store.setState({ userLocation: { latitude: target.latitude, longitude: target.longitude } });
    store.getState().startWalkSession('quest-1');

    let session = store.getState().activeWalkSession;
    expect(session.distanceMeters).toBeLessThan(10);
    expect(session.isGpsValid).toBe(true);

    // Fast forward to complete duration
    store.getState().fastForwardWalkSession();
    session = store.getState().activeWalkSession;
    expect(session.isEligible).toBe(true);

    // User moves far away (e.g., 100km away)
    store.setState({ userLocation: { latitude: target.latitude + 1.0, longitude: target.longitude } });
    store.getState().updateWalkSessionTick();

    session = store.getState().activeWalkSession;
    expect(session.distanceMeters).toBeGreaterThan(1000);
    expect(session.isGpsValid).toBe(false);
    // Sticky eligibility: already earned eligibility persists
    expect(session.isEligible).toBe(true);

    store.getState().cancelWalkSession();
  });
});

// =========================================================================
// SUITE 4: Auth Reactive Profile Sync Simulation
// =========================================================================
describe('M2 Challenger 1: Auth Reactive Sync in App.tsx', () => {
  beforeEach(() => {
    resetAllStores();
  });

  test('4.1: User ID transition triggers syncProfileWithDb reactively', async () => {
    const store = getWellnessStore();
    let syncedUserId = null;

    // Intercept syncProfileWithDb
    const originalSync = store.getState().syncProfileWithDb;
    store.setState({
      syncProfileWithDb: async (userId) => {
        syncedUserId = userId;
      },
    });

    try {
      // Simulate App.tsx effect:
      let prevUserId = undefined;
      const simulateAppAuthEffect = (currentUserId) => {
        if (currentUserId && currentUserId !== prevUserId) {
          store.getState().syncProfileWithDb(currentUserId);
        }
        prevUserId = currentUserId;
      };

      // Step 1: Initial load, no user
      simulateAppAuthEffect(undefined);
      expect(syncedUserId).toBeNull();

      // Step 2: User signs in
      simulateAppAuthEffect('user_abc_123');
      expect(syncedUserId).toBe('user_abc_123');

      // Step 3: User signs out
      syncedUserId = null;
      simulateAppAuthEffect(null);
      expect(syncedUserId).toBeNull(); // Not called when null!

      // Step 4: Another user signs in
      simulateAppAuthEffect('user_xyz_789');
      expect(syncedUserId).toBe('user_xyz_789');
    } finally {
      store.setState({ syncProfileWithDb: originalSync });
    }
  });
});
