# Handoff Report — Requirement R2 (Zustand State Optimization & Timer Isolation)

**Author**: `explorer_survey_2` (Survey Specialist 2)  
**Date**: 2026-09-28  
**Working Directory**: `D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\explorer_survey_2\`  
**Target Project**: VitalRoot (`D:\VitalRoot-main\VitalRoot-main`)  
**Handoff Type**: Hard (Investigation complete, actionable architecture and diff specifications produced)

---

## 1. Observation

### 1.1 Store Architecture & Version
- **File**: `D:\VitalRoot-main\VitalRoot-main\package.json`
  - Line 21: `"zustand": "^5.0.2"`
  - Line 17: `"react": "^19.0.0"`
- **File**: `D:\VitalRoot-main\VitalRoot-main\src\store\wellnessStore.ts`
  - Line 1: `import { create } from "zustand";`
  - Line 339: `export const useWellnessStore = create<WellnessState>((set, get) => ({`
  - Lines 230–310: `WellnessState` defines 27 state properties and 21 action methods.
  - Lines 606–641: `updateWalkSessionTick` implementation:
    ```typescript
    updateWalkSessionTick: () => {
      const { activeWalkSession, userLocation } = get();
      if (!activeWalkSession) return;
      const now = Date.now();
      const elapsed = Math.min(
        activeWalkSession.targetSeconds,
        Math.max(0, Math.floor((now - activeWalkSession.startTime) / 1000))
      );
      let dist = activeWalkSession.distanceMeters;
      let isGpsValid = true;
      if (userLocation) {
        dist = Math.round(
          calculateDistanceMeters(
            userLocation.latitude,
            userLocation.longitude,
            activeWalkSession.targetCoords.latitude,
            activeWalkSession.targetCoords.longitude
          )
        );
        isGpsValid = dist <= 500;
      }
      const isEligible = (elapsed >= activeWalkSession.targetSeconds && isGpsValid) || activeWalkSession.isEligible;
      set({
        activeWalkSession: {
          ...activeWalkSession,
          elapsedSeconds: elapsed,
          distanceMeters: dist,
          isGpsValid,
          isEligible,
        },
      });
    },
    ```

### 1.2 Pathological Timer Interval in `ControlPanel.tsx`
- **File**: `D:\VitalRoot-main\VitalRoot-main\src\components\panels\ControlPanel.tsx`
  - Lines 79–85:
    ```typescript
    // 완보 세션 실시간 타이머 틱
    useEffect(() => {
      if (!activeWalkSession) return;
      const interval = setInterval(() => {
        updateWalkSessionTick();
      }, 1000);
      return () => clearInterval(interval);
    }, [activeWalkSession, updateWalkSessionTick]);
    ```
  - `activeWalkSession` changes every second, which forces the `useEffect` cleanup (`clearInterval`) and re-initialization (`setInterval`) every 1,000ms.

### 1.3 Monolithic Destructuring Across Components
- **File**: `D:\VitalRoot-main\VitalRoot-main\src\App.tsx`
  - Line 14: `const { profile, openOnboardingModal, themeMode, userLocation, loadRegionData } = useWellnessStore();`
  - Causes root `App` to re-render every second, reconciling the entire tree.
- **File**: `D:\VitalRoot-main\VitalRoot-main\src\components\panels\ControlPanel.tsx`
  - Lines 39–74: `const { profile, filteredCourses, ... activeWalkSession, updateWalkSessionTick, ... } = useWellnessStore();`
  - Destructures 34 fields directly from `useWellnessStore()` without a selector.
- **File**: `D:\VitalRoot-main\VitalRoot-main\src\components\map\MapContainer.tsx`
  - Lines 39–63: `const { filteredCourses, ... activeWalkSession, cancelWalkSession, ... } = useWellnessStore();`
  - Destructures 23 fields directly without a selector.
- **Other Components Subscribing Monolithically**:
  - `src/components/common/HealthProfileAlertBanner.tsx`: line 5 (`profile`, `openOnboardingModal`, `themeMode`)
  - `src/components/auth/AuthButton.tsx`: line 7 (`equippedTitle`)
  - `src/components/common/InfoBar.tsx`: line 4 (`isSupabaseConnected`)
  - `src/components/common/LocationModal.tsx`: lines 59–65 (6 fields)
  - `src/components/auth/OnboardingModal.tsx`: lines 34–39 (4 fields)
  - `src/components/common/SettingsModal.tsx`: lines 32–47 (13 fields)

---

## 2. Logic Chain

1. **Premise 1 (Zustand v5 Behavior)**: `useWellnessStore()` called without arguments returns the root `WellnessState` object. Zustand uses `Object.is(oldState, newState)` to decide whether to re-render the subscribing component.
2. **Premise 2 (State Mutation)**: During an active walk session, `updateWalkSessionTick()` runs once every second and calls `set({ activeWalkSession: { ... } })`. This produces a new root state object reference every second.
3. **Inference 1 (Re-render Cascade)**:
   - Root `App.tsx` subscribes to the root state -> `App` re-renders every second -> React reconciles `<ControlPanel />`, `<MapContainer />`, and all modals.
   - `ControlPanel.tsx` and `MapContainer.tsx` independently subscribe to the root state -> both re-render every second, re-evaluating 3,000 lines of JSX, recreating inline handlers, re-checking map overlays, and diffing DOM nodes.
4. **Premise 3 (Interval Churn)**:
   - `ControlPanel.tsx` registers `setInterval` inside a `useEffect` that lists `[activeWalkSession, updateWalkSessionTick]` in its dependency array.
   - Because `activeWalkSession` reference changes every second, the effect tears down (`clearInterval`) and restarts (`setInterval`) every 1,000ms.
5. **Deduction (Solution Design)**:
   - To stop the re-render cascade, `App.tsx`, `ControlPanel.tsx`, and `MapContainer.tsx` must NEVER subscribe to the full root state object or directly to the mutating `activeWalkSession` object.
   - By using `useShallow` from `zustand/react/shallow` for sliced properties, components will only re-render if their subscribed fields change.
   - By extracting `activeWalkSession` rendering into `<MapWalkSessionBanner />` and `<QuestActiveSessionTimer />`, only these micro-components re-render every second.
   - By hoisting the timer interval into a headless `<WalkSessionTimerController />` that subscribes only to `isSessionActive: boolean` (`activeWalkSession !== null`), the interval is created once and never torn down until the session concludes, generating zero component re-renders.

---

## 3. Caveats

1. **Interleaving with Requirement R3**:
   Requirement R3 involves modularizing `ControlPanel.tsx` into 5 tabs (`CourseTab`, `MultiDayTab`, `StayTab`, `QuestTab`, `ConditionFilterTab`) and `MapContainer.tsx` into sub-layers. The selector partitioning strategy designed here directly maps onto those sub-modules. The builder agent can implement the selectors either before or during the R3 split.
2. **Quest List Card Highlight**:
   Inside `QuestTab`, to know which quest card has an active session without re-rendering every second, use:
   `const activeQuestSessionId = useWellnessStore((s) => s.activeWalkSession?.questId ?? null);`
   Do not subscribe to the full `activeWalkSession` object in the list.
3. **No Caveats for Dependencies**:
   `zustand/react/shallow` is already present in `node_modules/zustand` and compatible with React 19 and Vite.

---

## 4. Conclusion

The 1-second re-render storm across `ControlPanel` and `MapContainer` is caused by monolithic `useWellnessStore()` subscriptions and coupled interval lifecycles. 

The implementation path is straightforward and verified:
1. **Create `<WalkSessionTimerController />`** (`src/components/walk/WalkSessionTimerController.tsx`):
   Subscribes only to `isSessionActive = useWellnessStore((s) => s.activeWalkSession !== null)` and runs the 1-second interval cleanly. Mount once in `App.tsx`.
2. **Remove the `useEffect` timer from `ControlPanel.tsx`**.
3. **Create `<MapWalkSessionBanner />`** (`src/components/map/MapWalkSessionBanner.tsx`):
   Contains the floating banner markup. Mount in `MapContainer.tsx`. Remove `activeWalkSession` from `MapContainer`'s subscription.
4. **Create `<QuestActiveSessionTimer />`** (`src/components/panels/tabs/QuestActiveSessionTimer.tsx`):
   Contains the quest timer and progress bar markup. Mount in `QuestTab.tsx` / `ControlPanel.tsx`.
5. **Apply `useShallow`** to:
   - `src/App.tsx`
   - `src/components/map/MapContainer.tsx`
   - `src/components/panels/ControlPanel.tsx`
   - `src/components/common/HealthProfileAlertBanner.tsx`
   - `src/components/auth/AuthButton.tsx` (atomic selector)
   - `src/components/common/InfoBar.tsx` (atomic selector)
   - `src/components/common/LocationModal.tsx`
   - `src/components/auth/OnboardingModal.tsx`
   - `src/components/common/SettingsModal.tsx`

---

## 5. Verification Method

### 5.1 Static Verification Commands
```powershell
# Typecheck
npx tsc -b

# Lint
npm run lint

# Build
npm run build
```

### 5.2 Dynamic Re-Render Invalidation Test
In `MapContainer.tsx` and `ControlPanel.tsx`, insert render counters:
```tsx
const renderCount = useRef(0);
renderCount.current += 1;
console.log("[MapContainer Render]", renderCount.current);
```
**Verification Criterion**:
Start a walking session via the Quests tab.
1. `MapWalkSessionBanner` elapsed time increases every second.
2. `[MapContainer Render]` does NOT increment after session start.
3. `[ControlPanel Render]` does NOT increment after session start.
4. Pausing, canceling, or completing the session properly clears the timer.
