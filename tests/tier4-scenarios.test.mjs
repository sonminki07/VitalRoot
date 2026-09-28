// tests/tier4-scenarios.test.mjs
// Tier 4: Real-World Application Scenarios Test Suite

import { describe, test, expect, beforeEach } from './helpers/test-harness.mjs';
import { resetStore, getWellnessStore, getWellnessData } from './helpers/store-loader.mjs';
import { validateNaverDirectionsUrl } from './helpers/url-validator.mjs';

export function registerTier4Tests() {
  describe('Tier 4: Real-World Application Scenarios', () => {
    beforeEach(() => {
      resetStore();
    });

    // T4.1: Full walk session workflow simulation with zero unrelated store mutation
    test('T4.1: Complete walk session workflow simulation with zero unrelated store mutation', async () => {
      const store = getWellnessStore();

      // 1. Quest Selection
      const quests = store.getState().quests;
      expect(quests.length).toBeGreaterThan(0);
      const targetQuest = quests[0];
      store.getState().setActiveQuestId(targetQuest.id);
      expect(store.getState().activeQuestId).toBe(targetQuest.id);

      // 2. Start Walk Session
      store.getState().startWalkSession(targetQuest.id);
      let session = store.getState().activeWalkSession;
      expect(session).not.toBeNull();
      expect(session.questId).toBe(targetQuest.id);
      expect(session.elapsedSeconds).toBe(0);
      expect(session.targetSeconds).toBe(targetQuest.targetDurationMinutes * 60);
      expect(session.isEligible).toBe(false);

      // 3. Snapshot Unrelated Store State before tick
      const preTickState = store.getState();
      const snapshot = {
        profile: preTickState.profile,
        courses: preTickState.courses,
        filteredCourses: preTickState.filteredCourses,
        activeCourseId: preTickState.activeCourseId,
        multiDayCourses: preTickState.multiDayCourses,
        stays: preTickState.stays,
        stayFilter: preTickState.stayFilter,
        themeMode: preTickState.themeMode,
        fontSize: preTickState.fontSize,
        mapType: preTickState.mapType,
        distanceUnit: preTickState.distanceUnit,
        savedCustomCourses: preTickState.savedCustomCourses,
      };

      // 4. Simulate 1-second ticks
      // Simulate advance of clock by 1.5 seconds
      store.setState({
        activeWalkSession: {
          ...store.getState().activeWalkSession,
          startTime: Date.now() - 1500,
        },
      });

      store.getState().updateWalkSessionTick();

      const postTickState = store.getState();
      const updatedSession = postTickState.activeWalkSession;
      expect(updatedSession).not.toBeNull();
      expect(updatedSession.elapsedSeconds).toBe(1);

      // 5. Assert ZERO unrelated store mutation
      expect(postTickState.profile).toBe(snapshot.profile);
      expect(postTickState.courses).toBe(snapshot.courses);
      expect(postTickState.filteredCourses).toBe(snapshot.filteredCourses);
      expect(postTickState.activeCourseId).toBe(snapshot.activeCourseId);
      expect(postTickState.multiDayCourses).toBe(snapshot.multiDayCourses);
      expect(postTickState.stays).toBe(snapshot.stays);
      expect(postTickState.stayFilter).toBe(snapshot.stayFilter);
      expect(postTickState.themeMode).toBe(snapshot.themeMode);
      expect(postTickState.fontSize).toBe(snapshot.fontSize);
      expect(postTickState.mapType).toBe(snapshot.mapType);
      expect(postTickState.distanceUnit).toBe(snapshot.distanceUnit);
      expect(postTickState.savedCustomCourses).toBe(snapshot.savedCustomCourses);

      // 6. Fast-forward / Full duration reached
      store.getState().fastForwardWalkSession();
      session = store.getState().activeWalkSession;
      expect(session.elapsedSeconds).toBe(session.targetSeconds);
      expect(session.isEligible).toBe(true);

      // 7. Complete Walk Session / Claim Title
      await store.getState().claimQuestTitle(targetQuest.id);
      expect(store.getState().earnedTitles).toContain(targetQuest.titleReward);
      expect(store.getState().activeWalkSession).toBeNull();

      // 8. Cancellation Scenario
      const secondQuest = quests[1] || quests[0];
      store.getState().startWalkSession(secondQuest.id);
      expect(store.getState().activeWalkSession).not.toBeNull();

      store.getState().cancelWalkSession();
      expect(store.getState().activeWalkSession).toBeNull();
    });

    // T4.2: Course Selection -> Naver Walking Directions URL Generation & Validation
    test('T4.2: Course selection generates compliant Naver Maps walking and transit directions URLs', () => {
      const { INITIAL_WELLNESS_COURSES } = getWellnessData();
      expect(INITIAL_WELLNESS_COURSES.length).toBeGreaterThan(0);

      const userLocation = { latitude: 37.5665, longitude: 126.9780 };

      for (const course of INITIAL_WELLNESS_COURSES.slice(0, 5)) {
        // 1. Restaurant to Trail walking directions
        const restToTrailUrl = `https://map.naver.com/p/directions/${course.restaurant.longitude},${course.restaurant.latitude},${encodeURIComponent(
          course.restaurant.name
        )}/${course.trail.longitude},${course.trail.latitude},${encodeURIComponent(
          course.trail.name
        )}/-/walk?c=15.00,0,0,0,dh`;

        const restToTrailResult = validateNaverDirectionsUrl(restToTrailUrl, 'walk');
        expect(restToTrailResult.isValid).toBe(true);
        expect(restToTrailResult.details.mode).toBe('walk');
        expect(restToTrailResult.details.start.name).toBe(course.restaurant.name);
        expect(restToTrailResult.details.end.name).toBe(course.trail.name);

        // 2. User to Restaurant walking directions
        const userToRestWalkUrl = `https://map.naver.com/p/directions/${userLocation.longitude},${userLocation.latitude},${encodeURIComponent(
          '내 위치'
        )}/${course.restaurant.longitude},${course.restaurant.latitude},${encodeURIComponent(
          course.restaurant.name
        )}/-/walk?c=15.00,0,0,0,dh`;

        const userToRestResult = validateNaverDirectionsUrl(userToRestWalkUrl, 'walk');
        expect(userToRestResult.isValid).toBe(true);
        expect(userToRestResult.details.start.name).toBe('내 위치');

        // 3. User to Restaurant transit directions
        const userToRestTransitUrl = `https://map.naver.com/p/directions/${userLocation.longitude},${userLocation.latitude},${encodeURIComponent(
          '내 위치'
        )}/${course.restaurant.longitude},${course.restaurant.latitude},${encodeURIComponent(
          course.restaurant.name
        )}/-/transit?c=15.00,0,0,0,dh`;

        const transitResult = validateNaverDirectionsUrl(userToRestTransitUrl, 'transit');
        expect(transitResult.isValid).toBe(true);
        expect(transitResult.details.mode).toBe('transit');
      }

      // Adversarial test: Names with tricky special characters, slashes, and Korean spaces
      const adversarialNames = [
        '솔잎 가든 (본점)',
        '힐링&치유 길/산책로 #1',
        '맛있는 밥상? [강추]',
        '정원 "들꽃"',
      ];

      for (const name of adversarialNames) {
        const url = `https://map.naver.com/p/directions/126.978,37.5665,${encodeURIComponent(
          name
        )}/127.001,37.5700,${encodeURIComponent('도착지')}/-/walk?c=15.00,0,0,0,dh`;

        const res = validateNaverDirectionsUrl(url, 'walk');
        expect(res.isValid).toBe(true);
        expect(res.details.start.name).toBe(name);
      }
    });
  });
}
