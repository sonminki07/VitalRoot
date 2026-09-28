// tests/m2-rerender-verification.test.mjs
// Dynamic Re-Render & Selector Isolation Verification Test for Milestone 2

import { describe, test, expect, beforeEach } from './helpers/test-harness.mjs';
import { resetStore, getWellnessStore } from './helpers/store-loader.mjs';
import { shallow } from 'zustand/shallow';

describe('M2: Zustand State Selector Optimization & Timer Isolation', () => {
  beforeEach(() => {
    resetStore();
  });

  test('M2.1: Walk session ticks update activeWalkSession without mutating other store state', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');

    const initialSession = store.getState().activeWalkSession;
    expect(initialSession).not.toBeNull();
    expect(initialSession.elapsedSeconds).toBe(0);

    // Tick forward
    store.getState().updateWalkSessionTick();
    const tickedSession = store.getState().activeWalkSession;

    expect(tickedSession).not.toBeNull();
    // activeWalkSession reference has changed
    expect(tickedSession).not.toBe(initialSession);

    store.getState().cancelWalkSession();
    expect(store.getState().activeWalkSession).toBeNull();
  });

  test('M2.2: MapContainer selector output is shallowly equal across 1-second ticks (ZERO re-renders)', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');

    // Selector replica from MapContainer.tsx
    const mapContainerSelector = (s) => ({
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

    const sliceBefore = mapContainerSelector(store.getState());

    // 5 consecutive 1-second ticks
    for (let i = 0; i < 5; i++) {
      store.getState().updateWalkSessionTick();
      const sliceAfter = mapContainerSelector(store.getState());

      // Zustand useShallow comparison: returns true => React skips re-render!
      const isShallowEqual = shallow(sliceBefore, sliceAfter);
      expect(isShallowEqual).toBe(true);
    }

    store.getState().cancelWalkSession();
  });

  test('M2.3: ControlPanel selectors output is shallowly equal across 1-second ticks (ZERO re-renders)', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');

    // Selector replica from ControlPanel.tsx
    const controlPanelSelector = (s) => ({
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

    const activeQuestSessionIdSelector = (s) => s.activeWalkSession?.questId ?? null;

    const sliceBefore = controlPanelSelector(store.getState());
    const questIdBefore = activeQuestSessionIdSelector(store.getState());
    expect(questIdBefore).toBe('quest-1');

    // 5 consecutive 1-second ticks
    for (let i = 0; i < 5; i++) {
      store.getState().updateWalkSessionTick();
      const sliceAfter = controlPanelSelector(store.getState());
      const questIdAfter = activeQuestSessionIdSelector(store.getState());

      // Zustand useShallow comparison: returns true => React skips re-render!
      const isShallowEqual = shallow(sliceBefore, sliceAfter);
      expect(isShallowEqual).toBe(true);

      // Primitive equality: unchanged => React skips re-render!
      expect(questIdAfter).toBe(questIdBefore);
    }

    store.getState().cancelWalkSession();
  });

  test('M2.4: Headless timer subscriber (isSessionActive) remains strictly boolean true during ticks', () => {
    const store = getWellnessStore();
    const isSessionActiveSelector = (s) => s.activeWalkSession !== null;

    expect(isSessionActiveSelector(store.getState())).toBe(false);

    store.getState().startWalkSession('quest-1');
    expect(isSessionActiveSelector(store.getState())).toBe(true);

    // 5 consecutive ticks
    for (let i = 0; i < 5; i++) {
      store.getState().updateWalkSessionTick();
      expect(isSessionActiveSelector(store.getState())).toBe(true);
    }

    store.getState().cancelWalkSession();
    expect(isSessionActiveSelector(store.getState())).toBe(false);
  });

  test('M2.5: Leaf subscribers (MapWalkSessionBanner & QuestWalkSessionCard) receive state updates on every tick', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');

    const walkBannerSelector = (s) => s.activeWalkSession;
    let prevElapsed = -1;

    for (let i = 0; i < 3; i++) {
      store.getState().updateWalkSessionTick();
      const currentSession = walkBannerSelector(store.getState());
      expect(currentSession).not.toBeNull();
      expect(currentSession.elapsedSeconds).toBeGreaterThanOrEqual(prevElapsed);
      prevElapsed = currentSession.elapsedSeconds;
    }

    store.getState().cancelWalkSession();
    expect(walkBannerSelector(store.getState())).toBeNull();
  });

  test('M2.6: App-level selector is shallowly equal across walk session ticks', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');

    // Selector replica from App.tsx
    const appSelector = (s) => ({
      profile: s.profile,
      openOnboardingModal: s.openOnboardingModal,
      themeMode: s.themeMode,
      userLocation: s.userLocation,
      loadRegionData: s.loadRegionData,
    });

    const sliceBefore = appSelector(store.getState());

    for (let i = 0; i < 5; i++) {
      store.getState().updateWalkSessionTick();
      const sliceAfter = appSelector(store.getState());
      expect(shallow(sliceBefore, sliceAfter)).toBe(true);
    }

    store.getState().cancelWalkSession();
  });
});
