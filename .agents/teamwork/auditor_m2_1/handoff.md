# Forensic Audit Report — Milestone 2

**Work Product**: Milestone 2 (Zustand State Selector Optimization & Timer Isolation)  
**Profile**: General Project  
**Integrity Mode**: Development Mode (from `ORIGINAL_REQUEST.md`)  
**Auditor**: `auditor_m2_1`  
**Verdict**: **CLEAN**

---

## 1. Observation

### 1.1 Source Code Inspection & AST Structure
1. **Headless Timer Controller (`src/components/walk/WalkSessionTimerController.tsx`)**:
   - Lines 10–26:
     ```typescript
     export function WalkSessionTimerController(): null {
       const isSessionActive = useWellnessStore((s) => s.activeWalkSession !== null);

       useEffect(() => {
         if (!isSessionActive) return;

         const intervalId = window.setInterval(() => {
           useWellnessStore.getState().updateWalkSessionTick();
         }, 1000);

         return () => {
           window.clearInterval(intervalId);
         };
       }, [isSessionActive]);

       return null;
     }
     ```
   - Observation: Subscribes exclusively to boolean `isSessionActive`. Runs a single stable `window.setInterval(..., 1000)` and invokes `updateWalkSessionTick()`. Cleanup calls `window.clearInterval(intervalId)`. Returns `null` (0 DOM/JSX elements rendered). Mounted in `src/App.tsx:84`.

2. **Timer Elimination in `src/components/panels/ControlPanel.tsx`**:
   - `setInterval` and `updateWalkSessionTick` are completely absent from `ControlPanel.tsx` (verified via verbatim code search).
   - Line 101: `const activeQuestSessionId = useWellnessStore((s) => s.activeWalkSession?.questId ?? null);`
   - Only a primitive string/null is subscribed to, avoiding re-renders when `elapsedSeconds` or `distanceMeters` changes every second.
   - Line 1225: Delegates active session rendering to `<QuestWalkSessionCard quest={q} />`.

3. **Isolated Leaf Displays**:
   - `src/components/map/widgets/MapWalkSessionBanner.tsx`:
     - Subscribes to `activeWalkSession` and `cancelWalkSession` via `useShallow`.
     - Mounted in `src/components/map/MapContainer.tsx:1289`.
     - `MapContainer` top-level store selector (lines 64–87) no longer subscribes to `activeWalkSession` or `cancelWalkSession`.
   - `src/components/panels/tabs/QuestWalkSessionCard.tsx`:
     - Subscribes to `activeWalkSession` and renders the ticking progress bar, GPS verification status, demo accelerator button, and title claiming button.

4. **Granular `useShallow` Adoption Across Consumers**:
   - `src/App.tsx:18–27`: uses `useShallow` on `useWellnessStore`.
   - `src/components/panels/ControlPanel.tsx:66–98`: uses `useShallow` on `useWellnessStore`.
   - `src/components/map/MapContainer.tsx:63–87`: uses `useShallow` on `useWellnessStore`.
   - `src/components/auth/AuthButton.tsx:7–14`: uses `useShallow` on `useAuthStore` and atomic selector for `equippedTitle`.
   - `src/components/auth/OnboardingModal.tsx:40–47`: uses `useShallow` on `useWellnessStore`.
   - `src/components/common/HealthProfileAlertBanner.tsx:6–12`: uses `useShallow` on `useWellnessStore`.
   - `src/components/common/InfoBar.tsx:4`: atomic selector `useWellnessStore((s) => s.isSupabaseConnected)`.
   - `src/components/common/LocationModal.tsx:66–74`: uses `useShallow` on `useWellnessStore`.
   - `src/components/common/SettingsModal.tsx:48–65`: uses `useShallow` on `useWellnessStore` and atomic selector for `user`.

5. **Store Decoupling**:
   - `src/store/wellnessStore.ts:668–670`: Removed `await import("./authStore")`; replaced with:
     ```typescript
     window.dispatchEvent(
       new CustomEvent("vital-auth-required", { detail: { mode: "signin" } })
     );
     ```
   - `src/store/authStore.ts:289–318`: Removed all dynamic imports of `wellnessStore`.
   - `src/App.tsx:38–53`: Implemented event listener for `"vital-auth-required"` calling `useAuthStore.getState().openModal(mode)` and reactive `useEffect` syncing profile when `authUserId = useAuthStore((s) => s.user?.id)` changes.

### 1.2 Prohibited Patterns & Pre-Populated Artifact Checks
- Hardcoded test results: **None found**.
- Facade / dummy implementations: **None found**.
- Pre-populated test logs / output artifacts: `find . -name '*.log' -o -name '*result*' -o -name '*output*'` returned **0 results**.
- Self-certifying mock tests: **None found**. Tests load actual runtime store via Jiti and assert on real Zustand state slice equality.

### 1.3 Independent Verification Tool Executions
1. `npx tsc -b`:
   - Command: `npx tsc -b`
   - Exit code: `0`
   - Stdout/Stderr: None (clean compilation).
2. `npm run build`:
   - Command: `npm run build`
   - Exit code: `0`
   - Verbatim dynamic import check: 0 warnings regarding dynamic imports of `wellnessStore.ts` or `authStore.ts`.
3. Milestone 2 Re-render Verification Suite:
   - Command: `node -e "import('./tests/helpers/test-harness.mjs').then(async ({ registry }) => { await import('./tests/m2-rerender-verification.test.mjs'); const res = await registry.run({ silent: false }); process.exit(res.failed > 0 ? 1 : 0); });"`
   - Exit code: `0`
   - Results:
     - `✔ PASS M2.1: Walk session ticks update activeWalkSession without mutating other store state (193ms)`
     - `✔ PASS M2.2: MapContainer selector output is shallowly equal across 1-second ticks (ZERO re-renders) (2ms)`
     - `✔ PASS M2.3: ControlPanel selectors output is shallowly equal across 1-second ticks (ZERO re-renders) (2ms)`
     - `✔ PASS M2.4: Headless timer subscriber (isSessionActive) remains strictly boolean true during ticks (1ms)`
     - `✔ PASS M2.5: Leaf subscribers (MapWalkSessionBanner & QuestWalkSessionCard) receive state updates on every tick (1ms)`
     - `✔ PASS M2.6: App-level selector is shallowly equal across walk session ticks (1ms)`
4. E2E Regression Suite:
   - `node tests/run-e2e-tests.mjs --tier 2`: 5/5 PASSED (0 failed).
   - `node tests/run-e2e-tests.mjs --tier 3`: 3/3 PASSED (0 failed).
   - `node tests/run-e2e-tests.mjs --tier 4`: 2/2 PASSED (0 failed).
   - Total Tier 2–4 tests: 10/10 PASSED.

---

## 2. Logic Chain

1. **Root Cause Analysis Verification**:
   - In Zustand v5, omitting a selector causes components to re-render on any store state update. Prior to M2, `ControlPanel`, `MapContainer`, and `App` lacked selectors and re-rendered every 1,000ms.
   - The implementation introduced `WalkSessionTimerController` which evaluates only `(s) => s.activeWalkSession !== null` (a boolean primitive). During session ticks, this boolean remains `true` continuously, preventing controller re-render and preventing interval re-creation.
2. **Re-Render Isolation Verification**:
   - Moving the banner JSX out of `MapContainer` into `<MapWalkSessionBanner />` and the quest timer JSX into `<QuestWalkSessionCard />` isolates `activeWalkSession` object subscriptions to those two leaf components.
   - Empirical test execution in M2.2, M2.3, and M2.6 proved that the selector slices for `MapContainer`, `ControlPanel`, and `App` evaluate to `shallow(before, after) === true` across 5 consecutive ticks, ensuring React bails out of re-rendering.
3. **Decoupling Integrity**:
   - Dynamic imports between `wellnessStore` and `authStore` previously triggered Vite warnings because both modules were also statically imported in `App.tsx`.
   - The decoupling via browser `CustomEvent` (`"vital-auth-required"`) and reactive profile sync via `App.tsx` completely eliminated all dynamic import warnings in `npm run build`.
4. **Authenticity & Integrity Assessment**:
   - No mock overrides, no stubbed returns, no fake bypasses, and no hardcoded test outputs were detected. All components implement real logic satisfying Requirement R2.

---

## 3. Caveats

- **Milestone 3 & 4 Scope Boundary**:
  - `tests/tier1-features.test.mjs` contains assertions for M3 (sub-module decomposition of `MapContainer` and `ControlPanel`) and M4 (ESLint 0 errors, Rollup bundle manualChunks <= 500KB, and `.github/workflows/ci.yml`). Those 4 tests naturally fail because M3 and M4 are scheduled after M2.
  - T1.8 (`WalkSessionTimerController` presence & mount) and T1.9 (store decoupling) in Tier 1 pass with 100% success.
- **Naver Maps Global**:
  - In unit/CLI environments, `window.naver` is absent; components cleanly guard map operations with optional chaining and ref null checks.

---

## 4. Conclusion

Milestone 2 (Zustand State Selector Optimization & Timer Isolation) has been forensically audited and verified:
1. Authentic implementation of `<WalkSessionTimerController />` as a headless timer runner.
2. Complete removal of the pathological timer in `ControlPanel.tsx`.
3. Authentic isolation of 1-second ticking subscribers to leaf components `<MapWalkSessionBanner />` and `<QuestWalkSessionCard />`.
4. Real `useShallow` selectors deployed across all consuming components.
5. Genuine store decoupling between `wellnessStore` and `authStore` with zero Vite dynamic import warnings.
6. Clean TypeScript build (`tsc -b` exit code 0) and 100% passing tests for all M2 and Tier 2–4 regression suites.

**Verdict**: **CLEAN**

---

## 5. Verification Method

### 5.1 Static Verification Commands
```pwsh
# 1. Strict TypeScript Compile Check
npx tsc -b

# 2. Production Build & Dynamic Import Warning Check
npm run build
```

### 5.2 Dynamic Verification Commands
```pwsh
# 1. Milestone 2 Re-render & Selector Isolation Verification
node -e "import('./tests/helpers/test-harness.mjs').then(async ({ registry }) => { await import('./tests/m2-rerender-verification.test.mjs'); const res = await registry.run({ silent: false }); process.exit(res.failed > 0 ? 1 : 0); });"

# 2. Automated Regression Suites
node tests/run-e2e-tests.mjs --tier 2
node tests/run-e2e-tests.mjs --tier 3
node tests/run-e2e-tests.mjs --tier 4
```

### 5.3 Files to Inspect
- `src/components/walk/WalkSessionTimerController.tsx`
- `src/components/map/widgets/MapWalkSessionBanner.tsx`
- `src/components/panels/tabs/QuestWalkSessionCard.tsx`
- `src/components/panels/ControlPanel.tsx`
- `src/components/map/MapContainer.tsx`
- `src/App.tsx`
- `src/store/wellnessStore.ts`
- `src/store/authStore.ts`
- `tests/m2-rerender-verification.test.mjs`

### 5.4 Invalidation Conditions
- Re-introduction of direct subscription to `activeWalkSession` or `updateWalkSessionTick` inside `MapContainer.tsx` or `ControlPanel.tsx`.
- Introduction of cross-store dynamic imports between `wellnessStore.ts` and `authStore.ts`.
- Regression causing `npx tsc -b` or `npm run build` to fail or emit dynamic import warnings.
