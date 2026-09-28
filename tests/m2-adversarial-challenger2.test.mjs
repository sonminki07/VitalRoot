// tests/m2-adversarial-challenger2.test.mjs
// Adversarial Challenger Test Suite for Milestone 2

import { describe, test, expect, beforeEach } from './helpers/test-harness.mjs';
import { resetStore, getWellnessStore, getWellnessData, loadModules } from './helpers/store-loader.mjs';
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
// SUITE 1: Walk Session State Lifecycle & Adverse Invalidation
// =========================================================================
describe('M2 Challenger Suite 1: Walk Session Lifecycle & Invalidation', () => {
  beforeEach(() => {
    resetAllStores();
  });

  test('1.1: Starting with non-existent questId is a safe no-op', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('non-existent-quest-xyz');
    expect(store.getState().activeWalkSession).toBeNull();
  });

  test('1.2: Starting with userLocation = null defaults to 0 distance and valid GPS', () => {
    const store = getWellnessStore();
    store.setState({ userLocation: null });
    store.getState().startWalkSession('quest-1');

    const session = store.getState().activeWalkSession;
    expect(session).not.toBeNull();
    expect(session.distanceMeters).toBe(0);
    expect(session.isGpsValid).toBe(true);
    expect(session.isEligible).toBe(false);
    expect(session.elapsedSeconds).toBe(0);
  });

  test('1.3: Starting > 500m away with simulated user location sets isGpsValid = false', () => {
    const store = getWellnessStore();
    // Set location far away (Busan vs Seoul)
    store.setState({ userLocation: { latitude: 35.1796, longitude: 129.0756 } });
    store.getState().startWalkSession('quest-1');

    const session = store.getState().activeWalkSession;
    expect(session).not.toBeNull();
    expect(session.distanceMeters).toBeGreaterThan(500);
    expect(session.isGpsValid).toBe(false);
  });

  test('1.4: Starting a second walk session cleans up / replaces prior active session without orphan state', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');
    expect(store.getState().activeWalkSession.questId).toBe('quest-1');

    // Start quest-2 while quest-1 is running
    store.getState().startWalkSession('quest-2');
    const session2 = store.getState().activeWalkSession;
    expect(session2).not.toBeNull();
    expect(session2.questId).toBe('quest-2');
    expect(store.getState().activeQuestId).toBe('quest-2');
  });

  test('1.5: Calling updateWalkSessionTick when activeWalkSession is null does not crash or corrupt store', () => {
    const store = getWellnessStore();
    expect(store.getState().activeWalkSession).toBeNull();
    store.getState().updateWalkSessionTick();
    expect(store.getState().activeWalkSession).toBeNull();
  });

  test('1.6: Clock skew / negative elapsed edge case is safely bounded by Math.max(0, ...)', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');

    // Manipulate startTime to future timestamp (e.g., system clock jumped backward)
    store.setState({
      activeWalkSession: {
        ...store.getState().activeWalkSession,
        startTime: Date.now() + 100000,
      },
    });

    store.getState().updateWalkSessionTick();
    const session = store.getState().activeWalkSession;
    expect(session.elapsedSeconds).toBe(0); // Bounded at 0, no negative numbers!
  });

  test('1.7: 100 rapid ticks with elapsed exceeding targetSeconds is strictly capped at targetSeconds', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');
    const targetSec = store.getState().activeWalkSession.targetSeconds;

    // Simulate clock far in the future
    store.setState({
      activeWalkSession: {
        ...store.getState().activeWalkSession,
        startTime: Date.now() - (targetSec + 500) * 1000,
      },
    });

    // 100 rapid ticks
    for (let i = 0; i < 100; i++) {
      store.getState().updateWalkSessionTick();
    }

    const session = store.getState().activeWalkSession;
    expect(session.elapsedSeconds).toBe(targetSec); // Strictly clamped!
    expect(session.elapsedSeconds).not.toBeGreaterThan(targetSec);
  });

  test('1.8: GPS invalidation: elapsed reaches target while GPS invalid -> isEligible is NOT granted', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');

    // Move user 2km away
    store.setState({
      userLocation: { latitude: 37.6000, longitude: 127.1000 },
    });

    // Simulate time passing to completion
    const targetSec = store.getState().activeWalkSession.targetSeconds;
    store.setState({
      activeWalkSession: {
        ...store.getState().activeWalkSession,
        startTime: Date.now() - (targetSec * 1000),
      },
    });

    store.getState().updateWalkSessionTick();
    let session = store.getState().activeWalkSession;
    expect(session.isGpsValid).toBe(false);
    expect(session.elapsedSeconds).toBe(targetSec);
    // Adversarial check: even though elapsedSeconds >= targetSeconds, out of bounds GPS prevents eligibility!
    expect(session.isEligible).toBe(false);

    // Now user returns to within range (< 500m)
    const targetCoords = session.targetCoords;
    store.setState({
      userLocation: { latitude: targetCoords.latitude, longitude: targetCoords.longitude },
    });

    store.getState().updateWalkSessionTick();
    session = store.getState().activeWalkSession;
    expect(session.isGpsValid).toBe(true);
    expect(session.isEligible).toBe(true); // Now eligible!
  });

  test('1.9: Sticky eligibility: Once granted, user leaving the zone does not revoke isEligible', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');
    store.getState().fastForwardWalkSession();

    let session = store.getState().activeWalkSession;
    expect(session.isEligible).toBe(true);

    // User walks away far out of range
    store.setState({
      userLocation: { latitude: 35.0, longitude: 128.0 },
    });

    store.getState().updateWalkSessionTick();
    session = store.getState().activeWalkSession;
    expect(session.isGpsValid).toBe(false);
    expect(session.isEligible).toBe(true); // Still eligible to claim!
  });

  test('1.10: Simulated Pause/Resume lifecycle resiliently tracks wall-clock delta without drift', () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');

    const initialStart = Date.now();
    store.setState({
      activeWalkSession: {
        ...store.getState().activeWalkSession,
        startTime: initialStart,
      },
    });

    // 3 ticks at 1s intervals
    for (let s = 1; s <= 3; s++) {
      store.setState({
        activeWalkSession: {
          ...store.getState().activeWalkSession,
          startTime: initialStart,
        },
      });
      store.getState().updateWalkSessionTick();
    }

    // Simulate pause: 15 seconds pass with NO ticks called
    // Then resume: first tick after 15 seconds
    store.setState({
      activeWalkSession: {
        ...store.getState().activeWalkSession,
        startTime: Date.now() - 15000,
      },
    });
    store.getState().updateWalkSessionTick();

    const session = store.getState().activeWalkSession;
    expect(session.elapsedSeconds).toBe(15); // Accurately reflects 15s elapsed
  });

  test('1.11: Claiming title before eligibility is strictly rejected', async () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');

    const initialTitlesCount = store.getState().earnedTitles.length;
    await store.getState().claimQuestTitle('quest-1');

    expect(store.getState().earnedTitles.length).toBe(initialTitlesCount);
    expect(store.getState().activeWalkSession).not.toBeNull();
  });

  test('1.12: Claiming title for wrong questId is rejected', async () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');
    store.getState().fastForwardWalkSession();

    await store.getState().claimQuestTitle('quest-999');
    expect(store.getState().activeWalkSession).not.toBeNull();
  });

  test('1.13: Successful claim awards title, sets completed, equips title, clears session, and prevents duplicate titles', async () => {
    const store = getWellnessStore();
    store.getState().startWalkSession('quest-1');
    store.getState().fastForwardWalkSession();

    const quest = store.getState().quests.find((q) => q.id === 'quest-1');
    const rewardTitle = quest.titleReward;

    await store.getState().claimQuestTitle('quest-1');

    expect(store.getState().activeWalkSession).toBeNull();
    expect(store.getState().earnedTitles).toContain(rewardTitle);
    expect(store.getState().equippedTitle).toBe(rewardTitle);
    expect(store.getState().quests.find((q) => q.id === 'quest-1').isCompleted).toBe(true);

    // Verify no duplicates if claimed again
    store.getState().startWalkSession('quest-1');
    store.getState().fastForwardWalkSession();
    await store.getState().claimQuestTitle('quest-1');

    const count = store.getState().earnedTitles.filter((t) => t === rewardTitle).length;
    expect(count).toBe(1);
  });
});

// =========================================================================
// SUITE 2: WalkSessionTimerController Lifecycle Verification
// =========================================================================
describe('M2 Challenger Suite 2: WalkSessionTimerController Lifecycle', () => {
  beforeEach(() => {
    resetAllStores();
  });

  test('2.1: Controller starts interval ONLY when isSessionActive is true, and clears it on false', () => {
    const store = getWellnessStore();

    // Mock window.setInterval and window.clearInterval
    let activeIntervals = new Set();
    let intervalCounter = 0;

    const originalSetInterval = globalThis.window.setInterval;
    const originalClearInterval = globalThis.window.clearInterval;

    globalThis.window.setInterval = (fn, ms) => {
      const id = ++intervalCounter;
      activeIntervals.add(id);
      return id;
    };

    globalThis.window.clearInterval = (id) => {
      activeIntervals.delete(id);
    };

    try {
      // Model the WalkSessionTimerController effect hook:
      let cleanup = null;
      let prevIsActive = false;

      const syncControllerEffect = (isActive) => {
        if (isActive === prevIsActive) return; // React does not re-run effect if dep is unchanged
        if (cleanup) {
          cleanup();
          cleanup = null;
        }
        prevIsActive = isActive;
        if (!isActive) return;

        const intervalId = globalThis.window.setInterval(() => {
          store.getState().updateWalkSessionTick();
        }, 1000);

        cleanup = () => {
          globalThis.window.clearInterval(intervalId);
        };
      };

      const isSessionActiveSelector = (s) => s.activeWalkSession !== null;

      // Stage 1: Store is idle -> activeWalkSession is null
      expect(isSessionActiveSelector(store.getState())).toBe(false);
      syncControllerEffect(isSessionActiveSelector(store.getState()));
      expect(activeIntervals.size).toBe(0); // 0 intervals started

      // Stage 2: Start session -> isSessionActive becomes true
      store.getState().startWalkSession('quest-1');
      expect(isSessionActiveSelector(store.getState())).toBe(true);
      syncControllerEffect(isSessionActiveSelector(store.getState()));
      expect(activeIntervals.size).toBe(1); // Exactly 1 interval running

      const activeId = Array.from(activeIntervals)[0];

      // Stage 3: Multiple 1s ticks -> isSessionActive remains true (dep unchanged!)
      for (let i = 0; i < 10; i++) {
        store.getState().updateWalkSessionTick();
        // Selector returns boolean true
        const currentActive = isSessionActiveSelector(store.getState());
        expect(currentActive).toBe(true);
        // In React, since currentActive === prevIsActive (true === true), effect does NOT re-run
        syncControllerEffect(currentActive);
        expect(activeIntervals.size).toBe(1);
        expect(Array.from(activeIntervals)[0]).toBe(activeId); // Stable interval ID!
      }

      // Stage 4: Cancel session -> isSessionActive becomes false
      store.getState().cancelWalkSession();
      expect(isSessionActiveSelector(store.getState())).toBe(false);
      syncControllerEffect(isSessionActiveSelector(store.getState()));
      expect(activeIntervals.size).toBe(0); // Cleanly cleared!

      // Stage 5: Rapid thrashing (start -> cancel -> start -> cancel 20 times)
      for (let j = 0; j < 20; j++) {
        store.getState().startWalkSession('quest-1');
        syncControllerEffect(isSessionActiveSelector(store.getState()));
        expect(activeIntervals.size).toBe(1);

        store.getState().cancelWalkSession();
        syncControllerEffect(isSessionActiveSelector(store.getState()));
        expect(activeIntervals.size).toBe(0);
      }

      expect(activeIntervals.size).toBe(0); // Zero timer leaks!
    } finally {
      globalThis.window.setInterval = originalSetInterval;
      globalThis.window.clearInterval = originalClearInterval;
    }
  });
});

// =========================================================================
// SUITE 3: Custom Event "vital-auth-required" & Decoupled Auth Modal
// =========================================================================
describe('M2 Challenger Suite 3: vital-auth-required Custom Event & Decoupling', () => {
  beforeEach(() => {
    resetAllStores();
  });

  test('3.1: Event listener in App.tsx opens modal with mode signin', () => {
    // Simulate App.tsx event listener
    const handleAuthRequired = (event) => {
      const mode = event.detail?.mode ?? 'signin';
      useAuthStore.getState().openModal(mode);
    };
    globalThis.window.addEventListener('vital-auth-required', handleAuthRequired);

    try {
      expect(useAuthStore.getState().isModalOpen).toBe(false);

      // Dispatch signin mode
      globalThis.window.dispatchEvent(
        new globalThis.CustomEvent('vital-auth-required', { detail: { mode: 'signin' } })
      );

      expect(useAuthStore.getState().isModalOpen).toBe(true);
      expect(useAuthStore.getState().authTab).toBe('signin');
    } finally {
      globalThis.window.removeEventListener('vital-auth-required', handleAuthRequired);
    }
  });

  test('3.2: Event listener opens modal with mode signup', () => {
    const handleAuthRequired = (event) => {
      const mode = event.detail?.mode ?? 'signin';
      useAuthStore.getState().openModal(mode);
    };
    globalThis.window.addEventListener('vital-auth-required', handleAuthRequired);

    try {
      globalThis.window.dispatchEvent(
        new globalThis.CustomEvent('vital-auth-required', { detail: { mode: 'signup' } })
      );

      expect(useAuthStore.getState().isModalOpen).toBe(true);
      expect(useAuthStore.getState().authTab).toBe('signup');
    } finally {
      globalThis.window.removeEventListener('vital-auth-required', handleAuthRequired);
    }
  });

  test('3.3: Event with undefined detail defaults to signin mode', () => {
    const handleAuthRequired = (event) => {
      const mode = event.detail?.mode ?? 'signin';
      useAuthStore.getState().openModal(mode);
    };
    globalThis.window.addEventListener('vital-auth-required', handleAuthRequired);

    try {
      globalThis.window.dispatchEvent(
        new globalThis.CustomEvent('vital-auth-required', {})
      );

      expect(useAuthStore.getState().isModalOpen).toBe(true);
      expect(useAuthStore.getState().authTab).toBe('signin');
    } finally {
      globalThis.window.removeEventListener('vital-auth-required', handleAuthRequired);
    }
  });

  test('3.4: Unauthenticated claimQuestTitle dispatches vital-auth-required and triggers auth modal', async () => {
    const modules = loadModules();
    const originalGetUser = modules.supabase.auth.getUser;

    // Mock unauthenticated user
    modules.supabase.auth.getUser = async () => ({
      data: { user: null },
      error: null,
    });

    let eventReceived = false;
    let eventDetail = null;

    const handleAuthRequired = (event) => {
      eventReceived = true;
      eventDetail = event.detail;
      const mode = event.detail?.mode ?? 'signin';
      useAuthStore.getState().openModal(mode);
    };
    globalThis.window.addEventListener('vital-auth-required', handleAuthRequired);

    try {
      const store = getWellnessStore();
      store.getState().startWalkSession('quest-1');
      store.getState().fastForwardWalkSession();

      await store.getState().claimQuestTitle('quest-1');

      expect(eventReceived).toBe(true);
      expect(eventDetail?.mode).toBe('signin');
      expect(useAuthStore.getState().isModalOpen).toBe(true);
      expect(useAuthStore.getState().authTab).toBe('signin');
    } finally {
      globalThis.window.removeEventListener('vital-auth-required', handleAuthRequired);
      modules.supabase.auth.getUser = originalGetUser;
    }
  });
});
