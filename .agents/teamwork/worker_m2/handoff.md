# Handoff Report — Milestone 2 (Zustand State Selector Optimization & Timer Isolation)

**Author**: `worker_m2` (Implementation Specialist for M2)  
**Date**: 2026-09-28  
**Working Directory**: `D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\worker_m2\`  
**Target Milestone**: Milestone 2 (Requirement R2)  
**Handoff Type**: Hard (All requirements implemented, verified, tested, and validated)  

---

## 1. Observation

### 1.1 Pathological Timer & Uncontrolled Re-Render Sources Prior to M2
- Prior to M2, `src/components/panels/ControlPanel.tsx` (lines 79–85) registered a local `useEffect` with dependency array `[activeWalkSession, updateWalkSessionTick]`. Because `activeWalkSession` was mutated on every tick, this effect tore down (`clearInterval`) and restarted (`setInterval`) every 1,000ms.
- `src/App.tsx` (line 14), `src/components/panels/ControlPanel.tsx` (lines 39–74), and `src/components/map/MapContainer.tsx` (lines 39–63) called `useWellnessStore()` directly without selectors or `useShallow`, resulting in full component tree re-evaluations whenever any property in `WellnessState` updated.
- `src/components/map/MapContainer.tsx` directly subscribed to `activeWalkSession` solely for rendering the floating session banner at lines 1265–1298, forcing the entire 1,500-line Naver Map orchestration container to re-render on every 1-second timer tick.

### 1.2 Circular Dynamic Imports in Store Layer Prior to M2
- `src/store/wellnessStore.ts:668` executed:
  ```typescript
  const { useAuthStore } = await import("./authStore");
  useAuthStore.getState().openModal("signin");
  ```
- `src/store/authStore.ts:293` & `314` executed:
  ```typescript
  import("./wellnessStore").then(({ useWellnessStore }) => {
    useWellnessStore.getState().syncProfileWithDb(session.user.id);
  });
  ```
- Tool Command: `npm run build` (`tsc -b && vite build`) produced verbatim warnings:
  ```
  [plugin vite:reporter] 
  (!) D:/VitalRoot-main/VitalRoot-main/src/store/wellnessStore.ts is dynamically imported by D:/VitalRoot-main/VitalRoot-main/src/store/authStore.ts, D:/VitalRoot-main/VitalRoot-main/src/store/authStore.ts but also statically imported by D:/VitalRoot-main/VitalRoot-main/src/App.tsx, ... dynamic import will not move module into another chunk.

  [plugin vite:reporter] 
  (!) D:/VitalRoot-main/VitalRoot-main/src/store/authStore.ts is dynamically imported by D:/VitalRoot-main/VitalRoot-main/src/store/wellnessStore.ts but also statically imported by D:/VitalRoot-main/VitalRoot-main/src/App.tsx, ... dynamic import will not move module into another chunk.
  ```

### 1.3 State After M2 Implementation
- **New Headless Controller**: `src/components/walk/WalkSessionTimerController.tsx` created. Subscribes strictly to `isSessionActive: boolean` (`useWellnessStore((s) => s.activeWalkSession !== null)`). Runs a single, stable `setInterval` at 1000ms. Returns `null` (0 UI nodes, 0 component re-renders). Mounted in `src/App.tsx`.
- **Pathological Timer Removed**: The `useEffect` timer in `src/components/panels/ControlPanel.tsx` has been eliminated.
- **Isolated Leaf Subscribers**:
  - `src/components/map/widgets/MapWalkSessionBanner.tsx` created and mounted inside `MapContainer.tsx`. `activeWalkSession` and `cancelWalkSession` were removed from `MapContainer`'s top-level subscriptions.
  - `src/components/panels/tabs/QuestWalkSessionCard.tsx` created and mounted inside `ControlPanel.tsx`. Subscribes to `activeWalkSession`, rendering the live progress bar, GPS verification status, and action buttons.
  - `ControlPanel.tsx` now subscribes only to `activeQuestSessionId = useWellnessStore((s) => s.activeWalkSession?.questId ?? null)` (a primitive string or null).
- **Selector Optimization**: `useShallow` from `zustand/react/shallow` applied across all consumers:
  - `src/App.tsx`
  - `src/components/panels/ControlPanel.tsx`
  - `src/components/map/MapContainer.tsx`
  - `src/components/common/HealthProfileAlertBanner.tsx`
  - `src/components/auth/AuthButton.tsx` (and atomic selector for `equippedTitle`)
  - `src/components/common/InfoBar.tsx` (atomic selector for `isSupabaseConnected`)
  - `src/components/common/LocationModal.tsx`
  - `src/components/auth/OnboardingModal.tsx`
  - `src/components/common/SettingsModal.tsx` (and atomic selector for `user`)
- **Store Decoupling**:
  - In `src/store/wellnessStore.ts:668`, replaced dynamic import with `window.dispatchEvent(new CustomEvent("vital-auth-required", { detail: { mode: "signin" } }))`.
  - In `src/store/authStore.ts`, removed both dynamic imports of `wellnessStore`.
  - In `src/App.tsx`, added event listener for `"vital-auth-required"` and reactive sync of DB profile via `useEffect` observing `authUserId = useAuthStore((s) => s.user?.id)`.
- **Static Verification Outputs**:
  - `npx tsc -b`: Exited with code 0. Clean compilation.
  - `npm run build`: Exited with code 0. Zero Vite dynamic import warnings!
- **Dynamic Verification Output**:
  - `node -e "import('./tests/helpers/test-harness.mjs').then(async ({ registry }) => { await import('./tests/m2-rerender-verification.test.mjs'); const res = await registry.run({ silent: false }); console.log(JSON.stringify({ passed: res.passed, failed: res.failed })); process.exit(res.failed > 0 ? 1 : 0); });"`:
    - 6/6 tests passed (0 failed).
    - `MapContainer` selector output verified shallowly equal across 1-second ticks (`shallow(before, after) === true`).
    - `ControlPanel` selector output verified shallowly equal across 1-second ticks (`shallow(before, after) === true`, `activeQuestSessionId` unchanged).
    - `App.tsx` selector output verified shallowly equal across 1-second ticks (`shallow(before, after) === true`).
    - `WalkSessionTimerController` boolean selector verified strictly identical (`true === true`).
    - `MapWalkSessionBanner` and `QuestWalkSessionCard` verified to receive tick updates.

---

## 2. Logic Chain

1. **Root Cause Analysis (Section 1.1)**:
   - Zustand v5 performs reference equality checks (`Object.is(oldSlice, newSlice)`). Calling `useWellnessStore()` without a selector returns the entire state object. Because `updateWalkSessionTick()` calls `set({ activeWalkSession: { ... } })`, the root state object receives a new reference every 1,000ms.
   - Consequently, `App`, `ControlPanel`, and `MapContainer` re-rendered on every second tick.
2. **Timer Churn Elimination (Section 1.1 & 1.3)**:
   - Hoisting the interval to `<WalkSessionTimerController />` which only observes `isSessionActive: boolean` ensures the `setInterval` is created exactly once upon session activation and cleared upon session termination.
   - Because `isSessionActive` remains `true` throughout the session, the controller does not re-render and does not tear down the timer.
3. **Leaf Component Isolation (Section 1.3)**:
   - Extracting `<MapWalkSessionBanner />` and `<QuestWalkSessionCard />` isolates `activeWalkSession` subscriptions to small leaf components.
   - `MapContainer` does not subscribe to `activeWalkSession` at all; `ControlPanel` only subscribes to primitive `activeQuestSessionId`.
   - On each 1-second tick, only the two leaf components re-render. `MapContainer` (with all Naver Map objects) and `ControlPanel` (with all course lists and accordions) maintain identical selector outputs and skip re-rendering completely.
4. **Decoupling Circular Dynamic Imports (Section 1.2 & 1.3)**:
   - Dynamic imports within modules that are also statically imported cause Vite bundle analysis to flag unavoidable duplicate evaluations.
   - By decoupling via the DOM event `"vital-auth-required"` and coordinating authentication state reactively in `App.tsx`, neither store has any dependency on the other.
   - This eliminates 100% of the Vite dynamic import warnings.

---

## 3. Caveats

- **Milestone 3 Coordination**: Milestone 3 will proceed to decompose `MapContainer.tsx` into `useMapFlightController`, `MapMarkersLayer`, `MapPolylinesLayer`, and `MapFloatingWidgets`, and `ControlPanel.tsx` into 5 separate tabs (`CourseTab`, `MultiDayTab`, `StayTab`, `QuestTab`, `ConditionFilterTab`). The selector isolation implemented here in M2 directly aligns with and facilitates M3's decomposition.
- **Naver Maps Global**: The Naver Maps SDK loads asynchronously in browser environments; all components properly check `window.naver?.maps` before invoking map APIs.

---

## 4. Conclusion

Milestone 2 (Requirement R2) is fully implemented, verified, and complete:
1. `<WalkSessionTimerController />` is operational as a headless 1-second runner mounted in `App.tsx`.
2. The pathological timer in `ControlPanel.tsx` is completely eliminated.
3. `<MapWalkSessionBanner />` and `<QuestWalkSessionCard />` isolate high-frequency timer ticks from `MapContainer` and `ControlPanel`.
4. `useShallow` is deployed across all store consumers in `src/`.
5. Circular dynamic imports between `wellnessStore` and `authStore` are completely decoupled, and Vite build output is 100% warning-free.
6. TypeScript compilation passes with 0 errors (`npx tsc -b`), and all automated re-render regression tests pass.

---

## 5. Verification Method

### 5.1 Static Verification Commands
```pwsh
# 1. TypeScript Strict Typecheck (must exit code 0)
npx tsc -b

# 2. Production Build & Dynamic Import Warning Check (must exit code 0 with 0 dynamic import warnings)
npm run build
```

### 5.2 Dynamic Re-Render & E2E Verification Commands
```pwsh
# 1. Run M2 Dynamic Re-Render & Selector Isolation Suite
node -e "import('./tests/helpers/test-harness.mjs').then(async ({ registry }) => { await import('./tests/m2-rerender-verification.test.mjs'); const res = await registry.run({ silent: false }); process.exit(res.failed > 0 ? 1 : 0); });"

# 2. Run Existing E2E Test Suite (Tiers 2, 3, 4)
node tests/run-e2e-tests.mjs --tier 2
node tests/run-e2e-tests.mjs --tier 3
node tests/run-e2e-tests.mjs --tier 4
```

### 5.3 Files to Inspect
- `src/components/walk/WalkSessionTimerController.tsx`
- `src/components/map/widgets/MapWalkSessionBanner.tsx`
- `src/components/panels/tabs/QuestWalkSessionCard.tsx`
- `src/App.tsx`
- `src/components/panels/ControlPanel.tsx`
- `src/components/map/MapContainer.tsx`
- `src/store/wellnessStore.ts`
- `src/store/authStore.ts`
- `tests/m2-rerender-verification.test.mjs`

### 5.4 Invalidation Conditions
- If `MapContainer.tsx` or `ControlPanel.tsx` re-introduces direct subscription to `activeWalkSession.elapsedSeconds`.
- If `authStore.ts` or `wellnessStore.ts` re-introduces cross-store dynamic imports.
- If `npm run build` emits dynamic import warnings.
