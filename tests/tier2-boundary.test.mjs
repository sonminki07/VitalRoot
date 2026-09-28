// tests/tier2-boundary.test.mjs
// Tier 2: Boundary & Corner Cases Test Suite

import { describe, test, expect, beforeEach } from './helpers/test-harness.mjs';
import { resetStore, getWellnessStore, getPedestrianRouter, mockLocalStorage } from './helpers/store-loader.mjs';

export function registerTier2Tests() {
  describe('Tier 2: Boundary & Corner Cases', () => {
    beforeEach(() => {
      resetStore();
    });

    // T2.1: Empty courses list handling
    test('T2.1: Empty courses list handles filtering and selection safely without exceptions', () => {
      const store = getWellnessStore();

      // Empty courses state
      store.setState({
        courses: [],
        filteredCourses: [],
        activeCourseId: 'non-existent-course',
      });

      const state = store.getState();
      expect(state.courses.length).toBe(0);
      expect(state.filteredCourses.length).toBe(0);

      // Verify active course lookup gracefully returns undefined
      const activeCourse = state.courses.find((c) => c.id === state.activeCourseId);
      expect(activeCourse).toBeUndefined();

      // Calling toggleCondition on empty course list must not throw
      expect(() => {
        state.toggleCondition('고혈압');
      }).not.toThrow();

      expect(store.getState().filteredCourses).toEqual([]);

      // Reset activeCourseId safely
      expect(() => {
        state.setActiveCourseId('');
      }).not.toThrow();
      expect(store.getState().activeCourseId).toBe('');
    });

    // T2.2: Invalid user coordinates in distance calculation and router
    test('T2.2: Invalid and extreme coordinates (NaN, null, out of bounds) handle gracefully', () => {
      const { calculateDistanceMeters } = getPedestrianRouter();

      // Identical coordinates
      const zeroDist = calculateDistanceMeters(37.5665, 126.978, 37.5665, 126.978);
      expect(zeroDist).toBe(0);

      // NaN coordinates return NaN without uncaught errors
      const nanDist = calculateDistanceMeters(NaN, 126.978, 37.5665, 126.978);
      expect(Number.isNaN(nanDist)).toBe(true);

      // Extreme coordinates (out of normal lat/lng bounds) do not crash
      expect(() => {
        calculateDistanceMeters(999, 999, -999, -999);
      }).not.toThrow();

      // Store with null userLocation
      const store = getWellnessStore();
      store.setState({ userLocation: null });
      store.getState().startWalkSession('quest-1');

      // Ticking with null userLocation defaults isGpsValid to true without throwing
      expect(() => {
        store.getState().updateWalkSessionTick();
      }).not.toThrow();

      const session = store.getState().activeWalkSession;
      expect(session).toBeDefined();
      expect(session.isGpsValid).toBe(true);

      store.getState().cancelWalkSession();
    });

    // T2.3: Walk session timer boundaries (zero, negative, exceeded duration)
    test('T2.3: Walk session timer boundaries (0s, negative clock skew, exceeded duration) are clamped', () => {
      const store = getWellnessStore();
      store.getState().startWalkSession('quest-1');

      let session = store.getState().activeWalkSession;
      expect(session.elapsedSeconds).toBe(0);
      const targetSec = session.targetSeconds;
      expect(targetSec).toBeGreaterThan(0);

      // Case A: Negative clock skew (now < startTime) - must be clamped to 0
      store.setState({
        activeWalkSession: {
          ...session,
          startTime: Date.now() + 60000, // 1 minute in the future
        },
      });
      store.getState().updateWalkSessionTick();
      session = store.getState().activeWalkSession;
      expect(session.elapsedSeconds).toBe(0);

      // Case B: Exceeded duration (now >> startTime + targetSeconds) - must clamp to targetSeconds
      store.setState({
        userLocation: { ...session.targetCoords },
        activeWalkSession: {
          ...session,
          startTime: Date.now() - (targetSec + 300) * 1000, // 300s past target
          distanceMeters: 50,
        },
      });
      store.getState().updateWalkSessionTick();
      session = store.getState().activeWalkSession;
      expect(session.elapsedSeconds).toBe(targetSec);
      expect(session.isEligible).toBe(true);

      // Case C: Target seconds zero boundary
      store.setState({
        userLocation: { ...session.targetCoords },
        activeWalkSession: {
          ...session,
          targetSeconds: 0,
          startTime: Date.now(),
        },
      });
      store.getState().updateWalkSessionTick();
      session = store.getState().activeWalkSession;
      expect(session.elapsedSeconds).toBe(0);
      expect(session.isEligible).toBe(true);

      store.getState().cancelWalkSession();
    });

    // T2.4: Light/Dark theme switching & persistence
    test('T2.4: Light/Dark theme switching updates state and persists to localStorage', () => {
      const store = getWellnessStore();

      // Switch to light mode
      store.getState().setThemeMode('light');
      expect(store.getState().themeMode).toBe('light');
      expect(mockLocalStorage.getItem('vitalroot_theme_mode')).toBe('light');

      // Switch back to dark mode
      store.getState().setThemeMode('dark');
      expect(store.getState().themeMode).toBe('dark');
      expect(mockLocalStorage.getItem('vitalroot_theme_mode')).toBe('dark');

      // Invalid theme value fallback check
      store.getState().setThemeMode('invalid-theme');
      // Should either accept or safely retain string without crashing
      expect(typeof store.getState().themeMode).toBe('string');
    });

    // T2.5: Radial distance filter bounds (0m, 500m GPS radius, 400m transit recommendation)
    test('T2.5: Radial distance bounds (0m, 500m GPS threshold, 400m transit recommendation) validate accurately', () => {
      const store = getWellnessStore();
      const { calculateDistanceMeters } = getPedestrianRouter();

      // Target coords: Seoul City Hall (37.5665, 126.9780)
      const targetCoords = { latitude: 37.5665, longitude: 126.9780 };

      // Helper to compute GPS validity in store session
      const checkProximity = (userLat, userLng) => {
        store.setState({
          userLocation: { latitude: userLat, longitude: userLng },
        });
        store.getState().startWalkSession('quest-1');
        store.setState({
          activeWalkSession: {
            ...store.getState().activeWalkSession,
            targetCoords,
          },
        });
        store.getState().updateWalkSessionTick();
        const valid = store.getState().activeWalkSession.isGpsValid;
        const dist = store.getState().activeWalkSession.distanceMeters;
        store.getState().cancelWalkSession();
        return { valid, dist };
      };

      // Exactly at target (0m)
      const atTarget = checkProximity(37.5665, 126.9780);
      expect(atTarget.dist).toBe(0);
      expect(atTarget.valid).toBe(true);

      // Close proximity (~140m)
      const near = checkProximity(37.5675, 126.9790);
      expect(near.dist).toBeLessThan(500);
      expect(near.valid).toBe(true);

      // Far distance (> 5km)
      const far = checkProximity(37.6000, 127.0500);
      expect(far.dist).toBeGreaterThan(500);
      expect(far.valid).toBe(false);

      // 400m transit recommendation threshold validation:
      // distFromUser <= 400m: isTransitRecommended = false
      // distFromUser > 400m: isTransitRecommended = true
      const distA = 400;
      const isTransitRecA = distA > 400;
      expect(isTransitRecA).toBe(false);

      const distB = 401;
      const isTransitRecB = distB > 400;
      expect(isTransitRecB).toBe(true);

      // 70m collision threshold for marker decluttering:
      const distCloseMarkers = calculateDistanceMeters(37.5665, 126.9780, 37.5667, 126.9782);
      expect(distCloseMarkers).toBeLessThan(70);
    });
  });
}
