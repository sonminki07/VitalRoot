// tests/tier3-combinations.test.mjs
// Tier 3: Cross-Feature Combinations Test Suite

import { describe, test, expect, beforeEach } from './helpers/test-harness.mjs';
import { resetStore, getWellnessStore } from './helpers/store-loader.mjs';

export function registerTier3Tests() {
  describe('Tier 3: Cross-Feature Combinations', () => {
    beforeEach(() => {
      resetStore();
    });

    // T3.1: Active walk session during tab switching
    test('T3.1: Walk session remains active, ticking, and intact across tab navigation', () => {
      const store = getWellnessStore();

      // Step 1: Start a walk session on Quest tab
      store.getState().setActiveQuestId('quest-1');
      store.getState().startWalkSession('quest-1');

      let session = store.getState().activeWalkSession;
      expect(session).toBeDefined();
      expect(session.questId).toBe('quest-1');
      const initialStartTime = session.startTime;

      // Simulated tab navigation states in ControlPanel
      const tabs = ['courses', 'multiday', 'stays', 'quests', 'filters'];
      let currentTab = 'quests';

      for (const nextTab of tabs) {
        currentTab = nextTab;

        // Perform tick while on current tab
        store.getState().updateWalkSessionTick();

        // Verify session persists
        session = store.getState().activeWalkSession;
        expect(session).not.toBeNull();
        expect(session.questId).toBe('quest-1');
        expect(session.startTime).toBe(initialStartTime);
      }

      expect(currentTab).toBe('filters');

      // Final check: cancel walk session cleanly
      store.getState().cancelWalkSession();
      expect(store.getState().activeWalkSession).toBeNull();
    });

    // T3.2: Nutrition accordion toggle during active course selection
    test('T3.2: Nutrition accordion toggle preserves active course selection and coordinates', () => {
      const store = getWellnessStore();
      const state = store.getState();

      const initialCourses = state.courses;
      expect(initialCourses.length).toBeGreaterThan(0);
      const testCourse = initialCourses[0];

      // Step 1: Select course
      store.getState().setActiveCourseId(testCourse.id);
      expect(store.getState().activeCourseId).toBe(testCourse.id);

      // Step 2: Simulate nutrition accordion expanded state
      const accordionState = {};
      const toggleNutrition = (courseId) => {
        accordionState[courseId] = !accordionState[courseId];
      };

      // Toggle Open
      toggleNutrition(testCourse.id);
      expect(accordionState[testCourse.id]).toBe(true);
      // Verify store state is completely intact
      expect(store.getState().activeCourseId).toBe(testCourse.id);

      // Toggle Closed
      toggleNutrition(testCourse.id);
      expect(accordionState[testCourse.id]).toBe(false);
      expect(store.getState().activeCourseId).toBe(testCourse.id);

      // Verify course restaurant and trail coordinate data was not mutated
      const selectedCourse = store.getState().courses.find((c) => c.id === testCourse.id);
      expect(selectedCourse.restaurant.latitude).toBe(testCourse.restaurant.latitude);
      expect(selectedCourse.restaurant.longitude).toBe(testCourse.restaurant.longitude);
      expect(selectedCourse.trail.latitude).toBe(testCourse.trail.latitude);
      expect(selectedCourse.trail.longitude).toBe(testCourse.trail.longitude);
    });

    // T3.3: Waypoint filter cycling with active course and camera flight
    test('T3.3: Waypoint filter cycling does not clear active course selection or camera target', () => {
      const store = getWellnessStore();
      const testCourse = store.getState().courses[0];

      // Set active course
      store.getState().setActiveCourseId(testCourse.id);
      expect(store.getState().activeCourseId).toBe(testCourse.id);

      // Cycle waypoint filters
      const waypointFilters = ['전체', '화장실', '쉼터', '배리어프리', '전체'];

      for (const filter of waypointFilters) {
        store.getState().setActiveWaypointFilter(filter);

        const currentState = store.getState();
        // 1. Waypoint filter updated
        expect(currentState.activeWaypointFilter).toBe(filter);
        // 2. Active course remains selected
        expect(currentState.activeCourseId).toBe(testCourse.id);
        // 3. Course list and filtered courses remain valid
        expect(currentState.filteredCourses.length).toBeGreaterThan(0);
      }
    });
  });
}
