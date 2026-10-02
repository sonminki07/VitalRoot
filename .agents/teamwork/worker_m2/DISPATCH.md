# Dispatch Assignment: Worker M2 (Zustand State Selector Optimization & Timer Isolation)

## 2026-09-28T01:13:00Z
- **Your Role**: teamwork_preview_worker (Implementation Specialist for M2)
- **Working Directory**: D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\worker_m2\
- **Original User Request**: D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\ORIGINAL_REQUEST.md
- **Project Scope Document**: D:\VitalRoot-main\VitalRoot-main\PROJECT.md
- **Survey 2 Handoff Report**: D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\explorer_survey_2\handoff.md
- **Survey 3 Handoff Report**: D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\explorer_survey_3\handoff.md
- **Exclusive Write Ownership**:
  - `src/components/walk/WalkSessionTimerController.tsx` (create new)
  - `src/components/map/widgets/MapWalkSessionBanner.tsx` (create new)
  - `src/components/panels/tabs/QuestWalkSessionCard.tsx` (create new)
  - `src/App.tsx`
  - `src/components/panels/ControlPanel.tsx`
  - `src/components/map/MapContainer.tsx`
  - `src/store/wellnessStore.ts`
  - `src/store/authStore.ts`
  - `src/components/common/HealthProfileAlertBanner.tsx`
  - `src/components/auth/AuthButton.tsx`
  - `src/components/common/InfoBar.tsx`
  - `src/components/common/LocationModal.tsx`
  - `src/components/auth/OnboardingModal.tsx`
  - `src/components/common/SettingsModal.tsx`

### Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Mission
Implement Milestone 2 (R2: Zustand State Selector Optimization & Timer Isolation) per `explorer_survey_2/handoff.md`:

1. **Headless Timer Controller (`src/components/walk/WalkSessionTimerController.tsx`)**:
   - Subscribes only to `isSessionActive: boolean` (`useWellnessStore((s) => s.activeWalkSession !== null)`).
   - When active, runs a stable 1-second `setInterval(() => useWellnessStore.getState().updateWalkSessionTick(), 1000)`.
   - Cleans up interval when inactive.
   - Component returns `null` (headless, 0 UI re-renders).
   - Mount `<WalkSessionTimerController />` inside `src/App.tsx`.

2. **Remove Pathological Timer in `ControlPanel.tsx`**:
   - Remove lines 79–85 (`useEffect` that ran `setInterval` with `[activeWalkSession, updateWalkSessionTick]`).

3. **Isolate High-Frequency Leaf Subscribers**:
   - Create `<MapWalkSessionBanner />` (`src/components/map/widgets/MapWalkSessionBanner.tsx`):
     - Extract the floating walk session banner markup and logic from `MapContainer.tsx`.
     - Subscribes directly to `activeWalkSession` and `cancelWalkSession` or required fields.
     - Mount in `MapContainer.tsx`.
     - Remove `activeWalkSession` from `MapContainer`'s main subscription so `MapContainer` does NOT re-render on each 1-second tick!
   - Create `<QuestWalkSessionCard />` (`src/components/panels/tabs/QuestWalkSessionCard.tsx`):
     - Contains the active walk session timer and progress display for the active quest.
     - Subscribes to `activeWalkSession`.
     - In `ControlPanel.tsx` / `QuestTab`, subscribe only to `activeQuestSessionId = useWellnessStore((s) => s.activeWalkSession?.questId ?? null)` to identify which quest card is active, without subscribing to changing elapsed seconds!

4. **Granular Selectors & `useShallow`**:
   - Convert monolithic `useWellnessStore()` destructuring in all components to granular selectors or `useShallow` from `zustand/react/shallow`:
     - `src/App.tsx`: `useShallow((s) => ({ profile: s.profile, openOnboardingModal: s.openOnboardingModal, themeMode: s.themeMode, userLocation: s.userLocation, loadRegionData: s.loadRegionData }))`
     - `src/components/panels/ControlPanel.tsx`: use `useShallow` for only the fields it actually consumes.
     - `src/components/map/MapContainer.tsx`: use `useShallow` for map fields; ensure `activeWalkSession` is NOT in `MapContainer`'s top-level subscription.
     - `src/components/common/HealthProfileAlertBanner.tsx`, `AuthButton.tsx`, `InfoBar.tsx`, `LocationModal.tsx`, `OnboardingModal.tsx`, `SettingsModal.tsx`.

5. **Decouple Store Circular Dynamic Imports**:
   - In `src/store/wellnessStore.ts:668`: remove `const { useAuthStore } = await import("./authStore"); useAuthStore.getState().openModal("signin");`. Replace with:
     `window.dispatchEvent(new CustomEvent("vital-auth-required", { detail: { mode: "signin" } }));`
     And listen to this event in `App.tsx` or `AuthModal.tsx` to call `useAuthStore.getState().openModal("signin")`.
   - In `src/store/authStore.ts:293, 314`: remove `import("./wellnessStore")`.
     In `src/App.tsx`, sync profile reactively when session changes:
     ```tsx
     useEffect(() => {
       const user = useAuthStore.getState().user;
       if (user?.id) {
         useWellnessStore.getState().syncProfileWithDb(user.id);
       }
     }, [/* subscribe to auth user id */]);
     ```
   - Verify that `npm run build` no longer outputs the Vite dynamic import warnings!

6. **Verification**:
   - `npx tsc -b` (must pass with code 0)
   - `npm run build` (must pass with code 0, no dynamic import warnings)
   - Dynamic re-render test: verify that during an active walk session, timer ticks re-render only `<MapWalkSessionBanner />` and `<QuestWalkSessionCard />`, while `MapContainer` and `ControlPanel` do NOT re-render every second.
   - Write comprehensive handoff report to `D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\worker_m2\handoff.md`.
   - Send completion message to parent orchestrator.
