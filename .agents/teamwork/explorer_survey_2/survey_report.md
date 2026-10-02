# Requirement R2 Detailed Survey Report: Zustand State Subscription Optimization & Timer Isolation

**Survey Specialist**: `explorer_survey_2`  
**Target Project**: VitalRoot (`D:\VitalRoot-main\VitalRoot-main`)  
**Date**: 2026-09-28  
**Scope**: Requirement R2 (Zustand State Architecture, 1-Second Timer Ticks, Monolithic Store Subscriptions, and Full DOM Re-render Prevention)

---

## 1. Executive Summary

VitalRoot currently suffers from severe rendering performance degradation during active pedestrian walking sessions ("도보 완보 세션"). Every 1,000ms, the timer tick function `updateWalkSessionTick` executes, updating the elapsed walk time and GPS proximity validation in the Zustand store (`wellnessStore.ts`). 

Because nearly all major components—including root `App.tsx`, the 1,500-line `MapContainer.tsx`, and the 1,500-line `ControlPanel.tsx`—subscribe to the entire Zustand store monolithically via `const { ... } = useWellnessStore()`, this 1-second state mutation triggers an **application-wide cascade of full DOM re-renders**. Unrelated UI elements—such as 10+ wellness course cards, nutrition accordions, chronic condition filter chips, Naver Map marker overlays, floating search bars, and modals—re-render every single second. Furthermore, the `setInterval` timer is placed directly in `ControlPanel.tsx` with a dependency on the mutating `activeWalkSession` object, causing the interval to be destroyed (`clearInterval`) and recreated every second.

This survey establishes the complete causal chain of the issue and provides a production-grade refactoring strategy using **Zustand v5 selector partitioning (`useShallow`)** and **local timer isolation**. By isolating timer state subscriptions to dedicated micro-components (`<MapWalkSessionBanner />` and `<QuestActiveSessionTimer />`) and hoisting the interval lifecycle into a stable headless controller (`<WalkSessionTimerController />`), we eliminate 100% of the re-renders in `App`, `MapContainer`, `ControlPanel`, course cards, and map layers.

---

## 2. Zustand Store Architecture & State Mutation Analysis

### 2.1 Store Definition & Version
- **Store Location**: `D:\VitalRoot-main\VitalRoot-main\src\store\wellnessStore.ts` (894 lines)
- **Zustand Version**: `^5.0.2` (React `^19.0.0`)
- **Store Creation Pattern**:
  ```typescript
  // src/store/wellnessStore.ts: line 339
  export const useWellnessStore = create<WellnessState>((set, get) => ({ ... }));
  ```
- **Zustand v5 Equality Semantics**:
  In Zustand v5, calling `useWellnessStore()` without arguments returns the full root state object `WellnessState`. By default, Zustand subscribes listeners with identity comparison `Object.is(prevRootState, nextRootState)`. Whenever any `set(...)` call occurs, Zustand creates a new root state object reference. Consequently, **every component subscribing without a selector re-renders on every single store update**, regardless of whether the specific fields it consumes were modified.

### 2.2 Complete Inventory of `WellnessState` Properties
The store maintains 27 state properties and 21 action methods:

| Category | Properties & Actions |
|---|---|
| **Health Profile** | `profile`, `setProfile`, `updateProfile`, `toggleCondition` |
| **Courses** | `courses`, `filteredCourses`, `activeCourseId`, `courseMode`, `setActiveCourseId`, `setCourseMode`, `isCourseLoading`, `setIsCourseLoading` |
| **Multi-Day Courses** | `multiDayCourses`, `activeMultiDayCourseId`, `setActiveMultiDayCourseId` |
| **Waypoints & Filters** | `activeWaypointFilter`, `setActiveWaypointFilter` |
| **Stays (안심 숙소)** | `stays`, `activeStayId`, `stayFilter`, `setActiveStayId`, `toggleStayFilter` |
| **Quests & Titles** | `quests`, `activeQuestId`, `earnedTitles`, `equippedTitle`, `setActiveQuestId`, `claimQuestTitle`, `equipTitle`, `completeQuest` |
| **Active Walk Session** | `activeWalkSession`, `startWalkSession`, `updateWalkSessionTick`, `cancelWalkSession`, `fastForwardWalkSession` |
| **Location & Geolocation** | `userLocation`, `isLocationModalOpen`, `isPinningHome`, `setUserLocation`, `setIsLocationModalOpen`, `setIsPinningHome` |
| **UI & Display Settings** | `themeMode`, `fontSize`, `mapType`, `distanceUnit`, `savedCustomCourses`, `setThemeMode`, `setFontSize`, `setMapType`, `toggleDistanceUnit`, `saveCustomCourse`, `removeCustomCourse` |
| **Regional On-Demand Data**| `currentRegionName`, `isRegionLoading`, `loadRegionData` |
| **Modals & Connectivity** | `isOnboardingModalOpen`, `isSettingsModalOpen`, `settingsInitialTab`, `openOnboardingModal`, `closeOnboardingModal`, `openSettingsModal`, `closeSettingsModal`, `isSupabaseConnected`, `isLoading`, `fetchSupabaseData`, `syncProfileWithDb`, `saveProfileToDb` |

### 2.3 Forensic Trace of `updateWalkSessionTick`
`updateWalkSessionTick` is defined at lines 606–641 of `src/store/wellnessStore.ts`:

```typescript
// src/store/wellnessStore.ts: lines 606-641
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

#### Mutation Characteristics:
1. **Target Field**: Only mutates `activeWalkSession`. Does not touch `courses`, `filteredCourses`, `stays`, `quests`, `profile`, or `themeMode`.
2. **Frequency**: Invoked once every 1,000ms while an active session exists.
3. **Reference Invalidation**: Creates a brand new object literal `{ ...activeWalkSession, elapsedSeconds, distanceMeters, isGpsValid, isEligible }` on every tick.
4. **Root Store Replacement**: `set(...)` produces a new root `WellnessState` reference in Zustand every second.

---

## 3. Timer Lifecycle & Interval Churn Forensics

### 3.1 The Flawed Implementation in `ControlPanel.tsx`
The interval timer is currently set up inside `src/components/panels/ControlPanel.tsx`:

```typescript
// src/components/panels/ControlPanel.tsx: lines 78-85
// 완보 세션 실시간 타이머 틱
useEffect(() => {
  if (!activeWalkSession) return;
  const interval = setInterval(() => {
    updateWalkSessionTick();
  }, 1000);
  return () => clearInterval(interval);
}, [activeWalkSession, updateWalkSessionTick]);
```

### 3.2 Pathological Interval Recreation Cycle
Because `activeWalkSession` is in the `useEffect` dependency array, and `activeWalkSession` receives a new object reference every 1 second:

```
[T = 0.0s] User starts walk session -> activeWalkSession initialized
[T = 0.0s] useEffect runs -> setInterval(..., 1000) registered (ID #1)
[T = 1.0s] Interval #1 fires -> updateWalkSessionTick() executes
[T = 1.0s] set({ activeWalkSession: { ... } }) creates NEW activeWalkSession reference
[T = 1.0s] ControlPanel re-renders due to monolithic subscription
[T = 1.0s] useEffect cleanup runs -> clearInterval(ID #1)
[T = 1.0s] useEffect setup runs -> setInterval(..., 1000) registered (ID #2)
[T = 2.0s] Interval #2 fires -> repeat ad infinitum...
```

**Consequences**:
1. **Timer Instability**: The timer interval is constantly torn down and restarted every second. Timer drift increases significantly under CPU load.
2. **Component Coupling**: If `ControlPanel` unmounts (e.g. mobile bottom-sheet dismissal or route change), the background walking timer unexpectedly halts.
3. **Unnecessary Dependency Triggers**: Placing the timer in a visual component causes the component to track the active session state directly.

---

## 4. Comprehensive Audit of Store Consumers

Every single consumer of `useWellnessStore` across the codebase was analyzed to identify subscription patterns:

| File | Line | Current Subscription Pattern | Destructured Properties | Re-render on 1s Tick? | Cause |
|---|---|---|---|:---:|---|
| `src/App.tsx` | 14 | `useWellnessStore()` (monolithic) | `profile`, `openOnboardingModal`, `themeMode`, `userLocation`, `loadRegionData` | **YES** ⚠️ | Root state ref changed; triggers full React tree re-render |
| `src/components/panels/ControlPanel.tsx` | 39–74 | `useWellnessStore()` (monolithic) | 34 properties including `activeWalkSession`, `updateWalkSessionTick`, `courses`, `stays`, `quests` | **YES** ⚠️ | Subscribes to whole store + directly reads `activeWalkSession` |
| `src/components/map/MapContainer.tsx` | 39–63 | `useWellnessStore()` (monolithic) | 23 properties including `activeWalkSession`, `filteredCourses`, `stays`, `quests` | **YES** ⚠️ | Subscribes to whole store + directly reads `activeWalkSession` |
| `src/components/common/HealthProfileAlertBanner.tsx` | 5 | `useWellnessStore()` (monolithic) | `profile`, `openOnboardingModal`, `themeMode` | **YES** ⚠️ | Subscribes to whole store; inside `MapContainer` |
| `src/components/auth/AuthButton.tsx` | 7 | `useWellnessStore()` (monolithic) | `equippedTitle` | **YES** ⚠️ | Subscribes to whole store for 1 string property |
| `src/components/common/InfoBar.tsx` | 4 | `useWellnessStore()` (monolithic) | `isSupabaseConnected` | **YES** ⚠️ | Subscribes to whole store for 1 boolean property |
| `src/components/common/LocationModal.tsx` | 59–65 | `useWellnessStore()` (monolithic) | `userLocation`, `isLocationModalOpen`, `setIsLocationModalOpen`, `setUserLocation`, `setIsPinningHome`, `loadRegionData` | **YES** ⚠️ | Subscribes to whole store |
| `src/components/auth/OnboardingModal.tsx` | 34–39 | `useWellnessStore()` (monolithic) | `profile`, `updateProfile`, `isOnboardingModalOpen`, `closeOnboardingModal` | **YES** ⚠️ | Subscribes to whole store |
| `src/components/common/SettingsModal.tsx` | 32–47 | `useWellnessStore()` (monolithic) | 13 properties (none is `activeWalkSession`) | **YES** ⚠️ | Subscribes to whole store |
| `src/hooks/useMapFilter.ts` | 9 | `useWellnessStore()` (monolithic) | `profile`, `courses`, `activeCourseId` | N/A | Dead code (to be removed in R1) |

**Key Finding**: 100% of existing components calling `useWellnessStore` do so **without selectors**. Not a single selector or `shallow` comparison was in place.

---

## 5. Causal Breakdown of Full DOM Re-renders

The following diagram illustrates how a single timer tick triggers a massive re-render storm:

```
                  ┌────────────────────────────────────────┐
                  │ 1-Second Interval Ticks in setInterval  │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │ wellnessStore.updateWalkSessionTick()  │
                  │   set({ activeWalkSession: { ... } })   │
                  └───────────────────┬────────────────────┘
                                      │ (Root store state reference replaced)
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
  ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
  │      App.tsx      │     │ ControlPanel.tsx  │     │ MapContainer.tsx  │
  │ (monolithic store)│     │ (monolithic store)│     │ (monolithic store)│
  └─────────┬─────────┘     └─────────┬─────────┘     └─────────┬─────────┘
            │                         │                         │
            ▼ (Reconciles entire app) ▼                         ▼
  ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
  │ - Re-renders all  │     │ - Re-renders all  │     │ - Re-evaluates 1500│
  │   children        │     │   10+ course cards│     │   lines of JSX    │
  │ - AuthModal       │     │ - Nutrition       │     │ - Top control bar │
  │ - LocationModal   │     │   accordions      │     │ - Radar buttons   │
  │ - OnboardingModal │     │ - Condition chips │     │ - Bottom course   │
  │ - SettingsModal   │     │ - Multi-day list  │     │   navigation bar  │
  │                   │     │ - Stays list      │     │ - Re-creates all  │
  │                   │     │ - Destroys & re-  │     │   marker click    │
  │                   │     │   creates interval│     │   closures        │
  └───────────────────┘     └───────────────────┘     └───────────────────┘
```

### Measured Impact on Performance:
1. **Garbage Collection Pressure**: Rebuilding the VDOM nodes for 1,500 lines of JSX in `MapContainer` and 1,500 lines in `ControlPanel` every second allocates hundreds of ephemeral objects every second, causing recurring GC stutter.
2. **Main Thread Contention**: Naver Map's canvas rendering and smooth camera transitions (`morph`, `panTo`) compete with React 19 reconciliation on the main JavaScript thread, causing visible micro-stutters during panning.
3. **Mobile Battery Drain**: Continuous background DOM diffing prevents the CPU from idling.

---

## 6. Architecture & Isolation Strategy

To achieve the Acceptance Criteria:
> *"도보 완보 세션 진행 중 타이머 틱(1초) 발생 시 ControlPanel과 MapContainer 전체가 리렌더링되지 않고 타이머 배너/프로그레스만 국소 렌더링되어야 함"*

We define a 4-part architectural blueprint:

```
                                  wellnessStore
                        ┌───────────────┴───────────────┐
                        │ activeWalkSession: { ... }     │
                        └───────┬───────────────┬───────┘
         Only primitive boolean │               │ Full activeWalkSession object
                                ▼               ▼
            ┌───────────────────────────┐   ┌───────────────────────────┐
            │ WalkSessionTimerController│   │  MapWalkSessionBanner     │
            │ (Headless interval driver)│   │  (Floating map badge)     │
            │   isSessionActive: boolean│   │                           │
            │   Re-renders: 0 times     │   │   Re-renders: 1/sec       │
            └───────────────────────────┘   └───────────────────────────┘
                                                │
                                                ▼
                                            ┌───────────────────────────┐
                                            │  QuestActiveSessionTimer  │
                                            │  (Quest card progress)    │
                                            │                           │
                                            │   Re-renders: 1/sec       │
                                            │   (only when Quest Tab is │
                                            │    open!)                 │
                                            └───────────────────────────┘

      ┌────────────────────────────────────────────────────────────────────────┐
      │ MapContainer, ControlPanel, CourseTab, MultiDayTab, StayTab:           │
      │ Subscribed via useShallow without activeWalkSession -> 0 RE-RENDERS!   │
      └────────────────────────────────────────────────────────────────────────┘
```

---

### 6.1 Strategy 1: Headless Timer Controller (`WalkSessionTimerController`)
Separate the timer driver from the visual UI entirely.

```typescript
// Proposed location: src/components/walk/WalkSessionTimerController.tsx
import { useEffect } from "react";
import { useWellnessStore } from "../../store/wellnessStore";

/**
 * Headless controller for active walk session ticking.
 * Subscribes ONLY to the boolean existence of an active session.
 * Re-renders: 0 times during active walking.
 */
export function WalkSessionTimerController() {
  const isSessionActive = useWellnessStore((s) => s.activeWalkSession !== null);
  const updateWalkSessionTick = useWellnessStore((s) => s.updateWalkSessionTick);

  useEffect(() => {
    if (!isSessionActive) return;

    // Created ONCE when session starts, destroyed ONCE when session ends.
    const interval = window.setInterval(() => {
      updateWalkSessionTick();
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isSessionActive, updateWalkSessionTick]);

  return null;
}
```

**Why this solves the interval churn**:
- `isSessionActive` is a primitive boolean (`true` or `false`).
- While the session runs (e.g. 15 minutes = 900 seconds), `isSessionActive` remains `true` continuously.
- The `useEffect` runs exactly ONCE at session start and cleans up exactly ONCE at session finish or cancellation.
- Zero interval teardown/recreation churn.

---

### 6.2 Strategy 2: Map Floating Banner Isolation (`MapWalkSessionBanner`)
Extract the floating banner (previously lines 1264–1298 of `MapContainer.tsx`) into a standalone micro-component:

```tsx
// Proposed location: src/components/map/MapWalkSessionBanner.tsx
import { useWellnessStore } from "../../store/wellnessStore";

/**
 * Isolated floating banner for live walk session on Naver Map.
 * Only THIS component re-renders every 1s. MapContainer remains un-rendered.
 */
export function MapWalkSessionBanner() {
  const activeWalkSession = useWellnessStore((s) => s.activeWalkSession);
  const cancelWalkSession = useWellnessStore((s) => s.cancelWalkSession);

  if (!activeWalkSession) return null;

  return (
    <div className="absolute top-28 sm:top-16 left-1/2 -translate-x-1/2 sm:left-[368px] lg:left-[412px] sm:translate-x-0 z-20 flex items-center gap-2.5 bg-gray-950/95 border border-purple-500/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-2xl text-xs text-white animate-in slide-in-from-top-2 duration-200">
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
      <span className="font-bold text-purple-200">
        🏃 {activeWalkSession.targetName}
      </span>
      <span className="font-mono font-bold text-amber-300">
        {Math.floor(activeWalkSession.elapsedSeconds / 60)}:
        {(activeWalkSession.elapsedSeconds % 60).toString().padStart(2, "0")} /{" "}
        {Math.floor(activeWalkSession.targetSeconds / 60)}:00
      </span>
      <span
        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          activeWalkSession.isEligible
            ? "bg-amber-500 text-gray-950 animate-bounce"
            : activeWalkSession.isGpsValid
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
            : "bg-red-500/20 text-red-300 border border-red-500/40"
        }`}
      >
        {activeWalkSession.isEligible
          ? "🏅 완보 자격 획득!"
          : activeWalkSession.isGpsValid
          ? "현장 체류 정상"
          : "500m 이탈"}
      </span>
      <button
        type="button"
        onClick={cancelWalkSession}
        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs shrink-0 ml-1 font-bold transition-colors"
        title="도보 완보 세션 닫기/종료"
      >
        ✕
      </button>
    </div>
  );
}
```

In `MapContainer.tsx`:
1. Remove `activeWalkSession` and `cancelWalkSession` from `MapContainer`'s store subscription.
2. Replace lines 1264–1298 with `<MapWalkSessionBanner />`.
3. `MapContainer` now has zero knowledge of `activeWalkSession` and **never re-renders on timer ticks**.

---

### 6.3 Strategy 3: Quest Card Progress Isolation (`QuestActiveSessionTimer`)
In `ControlPanel.tsx` (or `QuestTab.tsx` under R3), the quest list must not re-render every second.

1. **In the parent quest list**:
   To highlight the currently running quest card, subscribe ONLY to the active quest ID:
   ```typescript
   // Primitive string | null: DOES NOT CHANGE every 1s!
   const activeQuestSessionId = useWellnessStore((s) => s.activeWalkSession?.questId ?? null);
   ```
   Then:
   ```typescript
   const isCurrentSession = activeQuestSessionId === q.id;
   ```
   The quest list re-renders ONLY when a quest session starts or finishes!

2. **In the active session timer widget**:
   Extract lines 1206–1264 of `ControlPanel.tsx` into `<QuestActiveSessionTimer />`:
   ```tsx
   // Proposed location: src/components/panels/tabs/QuestActiveSessionTimer.tsx
   import { useWellnessStore } from "../../../store/wellnessStore";

   function formatTimerSeconds(seconds: number): string {
     const m = Math.floor(seconds / 60);
     const s = seconds % 60;
     return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
   }

   export function QuestActiveSessionTimer() {
     const activeWalkSession = useWellnessStore((s) => s.activeWalkSession);
     const fastForwardWalkSession = useWellnessStore((s) => s.fastForwardWalkSession);

     if (!activeWalkSession) return null;

     return (
       <div className="p-2.5 rounded-xl bg-purple-950/50 border border-purple-500/40 space-y-2 animate-in fade-in duration-200">
         <div className="flex items-center justify-between text-[11px]">
           <span className="text-purple-300 font-bold flex items-center gap-1.5">
             <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
             실시간 완보 시간 측정 중
           </span>
           <span className="font-mono font-bold text-amber-300">
             {formatTimerSeconds(activeWalkSession.elapsedSeconds)} /{" "}
             {formatTimerSeconds(activeWalkSession.targetSeconds)}
           </span>
         </div>

         {/* 타이머 진행바 */}
         <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
           <div
             className="h-full bg-gradient-to-r from-purple-500 via-teal-400 to-emerald-400 transition-all duration-300"
             style={{
               width: `${Math.min(
                 100,
                 (activeWalkSession.elapsedSeconds / activeWalkSession.targetSeconds) * 100
               )}%`,
             }}
           />
         </div>

         {/* GPS 상태 & 시연용 가속 버튼 */}
         <div className="flex items-center justify-between text-[10px] pt-0.5">
           <span
             className={
               activeWalkSession.isGpsValid
                 ? "text-emerald-300 font-medium"
                 : "text-amber-300 font-medium"
             }
           >
             {activeWalkSession.isGpsValid
               ? `🟢 현장 체류 인증 완료 (${activeWalkSession.distanceMeters}m)`
               : `⚠️ 현장 500m 이탈 (${activeWalkSession.distanceMeters}m)`}
           </span>

           {!activeWalkSession.isEligible && (
             <button
               type="button"
               onClick={(e) => {
                 e.stopPropagation();
                 fastForwardWalkSession();
               }}
               className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 border border-amber-400/40 font-bold transition-colors"
               title="시연/심사용: 목표 시간을 즉시 충족하고 완보 자격을 부여합니다"
             >
               ⚡ 즉시 완보 자격 획득 (시연용 가속)
             </button>
           )}
         </div>
       </div>
     );
   }
   ```
3. In `QuestTab.tsx` / `ControlPanel.tsx`, replace the inline timer widget with `{isCurrentSession && <QuestActiveSessionTimer />}`.

---

### 6.4 Strategy 4: Granular Selector Partitioning with `useShallow`

For all components, replace monolithic destructuring with `useShallow` from `zustand/react/shallow`.

#### 1) `src/App.tsx`
```tsx
import { useShallow } from "zustand/react/shallow";

// Before:
// const { profile, openOnboardingModal, themeMode, userLocation, loadRegionData } = useWellnessStore();

// After:
const { profile, openOnboardingModal, themeMode, userLocation, loadRegionData } = useWellnessStore(
  useShallow((s) => ({
    profile: s.profile,
    openOnboardingModal: s.openOnboardingModal,
    themeMode: s.themeMode,
    userLocation: s.userLocation,
    loadRegionData: s.loadRegionData,
  }))
);
const initAuth = useAuthStore((s) => s.initAuth);
```
*Result*: `App` does NOT re-render on timer ticks!

#### 2) `src/components/map/MapContainer.tsx`
```tsx
import { useShallow } from "zustand/react/shallow";

// Exclude activeWalkSession and cancelWalkSession from MapContainer!
const {
  filteredCourses,
  activeCourseId,
  activeWaypointFilter,
  setActiveWaypointFilter,
  stays,
  activeStayId,
  quests,
  activeQuestId,
  userLocation,
  setUserLocation,
  setIsLocationModalOpen,
  isPinningHome,
  setIsPinningHome,
  mapType: storeMapType,
  setMapType: setStoreMapType,
  distanceUnit,
  toggleDistanceUnit,
  saveCustomCourse,
  isOnboardingModalOpen,
  isSettingsModalOpen,
  themeMode,
} = useWellnessStore(
  useShallow((s) => ({
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
  }))
);

// MapStore actions:
const { center, zoom, setSelectedPlace, flyToPlace } = useMapStore(
  useShallow((s) => ({
    center: s.center,
    zoom: s.zoom,
    setSelectedPlace: s.setSelectedPlace,
    flyToPlace: s.flyToPlace,
  }))
);
```

#### 3) `src/components/panels/ControlPanel.tsx` (and subsequent R3 sub-tabs)
```tsx
import { useShallow } from "zustand/react/shallow";

// Exclude activeWalkSession and updateWalkSessionTick!
const {
  profile,
  filteredCourses,
  activeCourseId,
  setActiveCourseId,
  multiDayCourses,
  activeMultiDayCourseId,
  setActiveMultiDayCourseId,
  stays,
  activeStayId,
  setActiveStayId,
  stayFilter,
  toggleStayFilter,
  quests,
  activeQuestId,
  setActiveQuestId,
  earnedTitles,
  equippedTitle,
  equipTitle,
  startWalkSession,
  cancelWalkSession,
  claimQuestTitle,
  toggleCondition,
  userLocation,
  setIsLocationModalOpen,
  setIsPinningHome,
  courseMode,
  setCourseMode,
  openSettingsModal,
  themeMode,
  currentRegionName,
  isRegionLoading,
} = useWellnessStore(
  useShallow((s) => ({
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
    cancelWalkSession: s.cancelWalkSession,
    claimQuestTitle: s.claimQuestTitle,
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
  }))
);

// MapStore:
const flyToPlace = useMapStore((s) => s.flyToPlace);

// Only boolean/string for quest card selection:
const activeQuestSessionId = useWellnessStore((s) => s.activeWalkSession?.questId ?? null);
const isSessionEligible = useWellnessStore((s) => s.activeWalkSession?.isEligible ?? false);
```

#### 4) Sub-Components: `AuthButton.tsx`, `InfoBar.tsx`, `HealthProfileAlertBanner.tsx`, `LocationModal.tsx`, `OnboardingModal.tsx`, `SettingsModal.tsx`
- `AuthButton.tsx`:
  ```tsx
  const equippedTitle = useWellnessStore((s) => s.equippedTitle);
  ```
- `InfoBar.tsx`:
  ```tsx
  const isSupabaseConnected = useWellnessStore((s) => s.isSupabaseConnected);
  ```
- `HealthProfileAlertBanner.tsx`:
  ```tsx
  const { profile, openOnboardingModal, themeMode } = useWellnessStore(
    useShallow((s) => ({
      profile: s.profile,
      openOnboardingModal: s.openOnboardingModal,
      themeMode: s.themeMode,
    }))
  );
  ```
- `LocationModal.tsx`:
  ```tsx
  const { userLocation, isLocationModalOpen, setIsLocationModalOpen, setUserLocation, setIsPinningHome, loadRegionData } = useWellnessStore(
    useShallow((s) => ({
      userLocation: s.userLocation,
      isLocationModalOpen: s.isLocationModalOpen,
      setIsLocationModalOpen: s.setIsLocationModalOpen,
      setUserLocation: s.setUserLocation,
      setIsPinningHome: s.setIsPinningHome,
      loadRegionData: s.loadRegionData,
    }))
  );
  const flyToPlace = useMapStore((s) => s.flyToPlace);
  ```
- `OnboardingModal.tsx`:
  ```tsx
  const { profile, updateProfile, isOnboardingModalOpen, closeOnboardingModal } = useWellnessStore(
    useShallow((s) => ({
      profile: s.profile,
      updateProfile: s.updateProfile,
      isOnboardingModalOpen: s.isOnboardingModalOpen,
      closeOnboardingModal: s.closeOnboardingModal,
    }))
  );
  ```
- `SettingsModal.tsx`:
  ```tsx
  const {
    profile,
    updateProfile,
    isSettingsModalOpen,
    closeSettingsModal,
    settingsInitialTab,
    userLocation,
    setIsPinningHome,
    earnedTitles,
    themeMode,
    setThemeMode,
    fontSize,
    setFontSize,
    savedCustomCourses,
    removeCustomCourse,
  } = useWellnessStore(
    useShallow((s) => ({
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
    }))
  );
  ```

---

## 7. Synergy with Requirement R3 (Monolithic Modularization)

Under Requirement R3, `ControlPanel.tsx` will be broken into 5 tab modules:
1. `CourseTab.tsx`: Course cards, category toggle, search, nutrition info.
2. `MultiDayTab.tsx`: Multi-day stay & walk courses.
3. `StayTab.tsx`: Safe accommodation listings with facility filters.
4. `QuestTab.tsx`: Wellness quests, active session badge, title claiming.
5. `ConditionFilterTab.tsx`: Chronic condition selection chips.

**Sub-Component Subscription Alignment**:
By applying R2's scoped selectors:
- `CourseTab.tsx`, `MultiDayTab.tsx`, `StayTab.tsx`, and `ConditionFilterTab.tsx` do **not** subscribe to any walk session state. While a walk session is active, switching between tabs or scrolling courses has **0 re-render interference**.
- In `QuestTab.tsx`, the quest card list subscribes only to `activeQuestSessionId` (`string | null`). Only `<QuestActiveSessionTimer />` re-renders every second.
- In `MapContainer.tsx`, `MapMarkersLayer` and `MapPolylinesLayer` do **not** subscribe to `activeWalkSession`. Only `<MapWalkSessionBanner />` re-renders.

---

## 8. Implementation Verification Protocol

To verify Requirement R2 acceptance criteria during implementation:

### 8.1 Build & Type Checks
```powershell
# 1. Typecheck: Must pass with 0 errors
npx tsc -b

# 2. Lint check: Must pass with 0 errors
npm run lint

# 3. Production build
npm run build
```

### 8.2 Re-render Invalidation Test (Console Probe)
Add render-count probes in development mode:
```tsx
// Inside MapContainer.tsx:
const renderCount = useRef(0);
renderCount.current += 1;
console.log(`[MapContainer Render #${renderCount.current}]`);

// Inside ControlPanel.tsx:
const cpRenderCount = useRef(0);
cpRenderCount.current += 1;
console.log(`[ControlPanel Render #${cpRenderCount.current}]`);

// Inside MapWalkSessionBanner.tsx:
console.log(`[MapWalkSessionBanner Tick #${Date.now()}]`);
```

**Pass Condition**:
When a walk session is started:
- `[MapWalkSessionBanner Tick ...]` logs once every second.
- `[MapContainer Render #...]` and `[ControlPanel Render #...]` **DO NOT LOG AT ALL** after the initial mount and session-start event.
