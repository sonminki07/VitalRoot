# Project: VitalRoot Refactoring & Optimization

## Architecture
VitalRoot is a chronic illness wellness & healthcare tourism platform built with React 19, TypeScript, Vite, Tailwind CSS, Zustand v5, and NAVER Maps API.
- **State Layer**: Zustand v5 global store (`src/store/wellnessStore.ts`, `src/store/authStore.ts`). Optimized with atomic selectors and `useShallow` to prevent unnecessary component re-renders. Headless timer controller decouples high-frequency 1s ticks from UI tree.
- **Presentation Layer (Map)**: `MapContainer.tsx` orchestrates child layers:
  - `useMapFlightController`: 2-stage camera morphing & pan/zoom animation.
  - `MapMarkersLayer`: User location, health rest stops, trails, waypoints, stays, quests, collision filtering.
  - `MapPolylinesLayer`: Route paths, walk session track, polyline styling.
  - `MapFloatingWidgets`: Radar filters, top controls, directions bar, and isolated `MapWalkSessionBanner`.
- **Presentation Layer (Panels)**: `ControlPanel.tsx` orchestrates 5 dedicated tab sub-components:
  - `CourseTab`: Recommended course listing with `CourseNutritionAccordion`.
  - `MultiDayTab`: Multi-day wellness itinerary planner.
  - `StayTab`: Healthcare accommodations & booking integration.
  - `QuestTab`: Chronic disease wellness quests with isolated `QuestWalkSessionCard` timer.
  - `ConditionFilterTab`: Hypertension/diabetes condition-specific filtering.
- **CI / Quality Infrastructure**: GitHub Actions (`.github/workflows/ci.yml`), automated linting (`eslint .`), strict TypeScript checking (`tsc -b`), and production bundle optimization (rollup manual chunking <= 500KB).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dead Package Removal | Purge `mapbox-gl`, `react-map-gl`, `@turf/turf`, `@types/mapbox-gl`, `@types/geojson` from `package.json` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Dead Code Cleanup | Delete obsolete files: `localCourseSynthesizer.ts`, `useCircleData.ts`, `useMapFilter.ts`, `src/store/circleStore.ts`, `turf.ts`, `circle.types.ts` | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Collateral Dead Code Edits | Clean references in `src/store/index.ts`, `src/config/mapConfig.ts`, `src/vite-env.d.ts`, `src/components/common/InfoBar.tsx` | M1 | survey_1 |
| 4 | Headless Walk Session Timer | Extract 1s `updateWalkSessionTick` timer from `ControlPanel.tsx` into `<WalkSessionTimerController />` subscribing only to `isSessionActive` | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Isolated Walk Banner / Card | Isolate 1-sec re-rendering leaf subscribers: `<MapWalkSessionBanner />` and `<QuestWalkSessionCard />` | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Granular Zustand Selectors | Convert monolithic `useWellnessStore()` calls to `useShallow` selectors across App, Map, Panel, and Modals | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Store Circular Dependency Decoupling | Break circular dynamic imports between `wellnessStore.ts` and `authStore.ts` via top-level sync and custom event | M2 | survey_2, survey_3 |
| 8 | MapContainer Modularization | Decompose 1,502-line `MapContainer.tsx` into `useMapFlightController`, `MapMarkersLayer`, `MapPolylinesLayer`, `MapFloatingWidgets` | M3 | ORIGINAL_REQUEST §R3 |
| 9 | ControlPanel Modularization | Decompose 1,499-line `ControlPanel.tsx` into 5 tabs (`CourseTab`, `MultiDayTab`, `StayTab`, `QuestTab`, `ConditionFilterTab`) and `CourseNutritionAccordion` | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Functional Parity Guarantee | Ensure course selection, Naver walk routing, 2-stage camera flight, nutrition accordion, and quest flow work seamlessly | M3 | ORIGINAL_REQUEST §Acceptance |
| 11 | Bundle Chunking (<= 500KB) | Configure Rollup `manualChunks` in `vite.config.ts` so `dist/assets/index-*.js` <= 500KB | M4 | ORIGINAL_REQUEST §Acceptance |
| 12 | ESLint Error Resolution | Resolve all 68 ESLint errors (Naver typing, empty catches, unused vars) so `npm run lint` exits code 0 | M4 | ORIGINAL_REQUEST §Acceptance |
| 13 | GitHub Actions CI Pipeline | Create `.github/workflows/ci.yml` running `npm ci`, `npx tsc -b`, `npm run lint`, `npm run build` | M4 | ORIGINAL_REQUEST §R4 |
| 14 | E2E Test Suite & Test Runner | Implement opaque-box automated test harness covering all features, performance assertions, and regression tests | M-TEST | Project Pattern Dual Track |
| 15 | Final Verification & Victory Audit | Run full test suite, bundle verification, tsc, lint, and Forensic Victory Audit | M5 | Project Pattern Final Milestone |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M-TEST | E2E Test Suite & Infra | Implement opaque-box test runner, Tiers 1-4 test cases, publish `TEST_READY.md` | none | DONE |
| M1 | Dead Code & Dependency Removal | Purge dead packages (`mapbox-gl`, etc.) and dead files (`localCourseSynthesizer.ts`, etc.) | none | DONE |
| M2 | Zustand Selector Optimization & Timer Isolation | Headless timer controller, leaf subscribers, `useShallow`, resolve circular store dynamic imports | M1 | IN_PROGRESS |
| M3 | Monolithic Component Modularization | Split `MapContainer.tsx` and `ControlPanel.tsx` into sub-modules while preserving all features | M2 | PLANNED |
| M4 | CI Pipeline, Bundle Optimization & Lint Resolution | Manual vendor chunking (<=500KB), ESLint fixes, `.github/workflows/ci.yml` | M3 | PLANNED |
| M5 | Final Verification & Acceptance Audit | Pass 100% E2E tests, full acceptance verification, and Forensic Victory Audit | M4, M-TEST | PLANNED |

## Interface Contracts

### Store ↔ Walk Session Controller (`src/components/walk/WalkSessionTimerController.tsx`)
- Subscribes: `isSessionActive = useWellnessStore((s) => s.activeWalkSession !== null)`
- Actions called: `useWellnessStore.getState().updateWalkSessionTick()`
- Side effects: Starts 1000ms `setInterval` only when `isSessionActive` becomes true; clears when false. 0 component re-renders.

### Store ↔ Isolated Timer Displays
- `MapWalkSessionBanner`: Subscribes to `activeWalkSession` directly or via selector:
  ```typescript
  const activeWalkSession = useWellnessStore((s) => s.activeWalkSession);
  ```
  Only this component re-renders every 1s during an active walk.
- `QuestWalkSessionCard`: Subscribes to `activeWalkSession` for the active quest ID.

### Map Container Coordinator ↔ Sub-Modules
- `MapContainer.tsx` coordinates:
  - `mapRef`: React ref holding `naver.maps.Map` instance.
  - `useMapFlightController`:
    ```typescript
    useMapFlightController(map: naver.maps.Map | null, activeCourse: Course | null, activeStay: Stay | null);
    ```
  - `MapMarkersLayer`:
    ```typescript
    <MapMarkersLayer map={map} onSelectCourse={(id) => ...} onSelectStay={(id) => ...} />
    ```
  - `MapPolylinesLayer`:
    ```typescript
    <MapPolylinesLayer map={map} activeCourse={activeCourse} />
    ```
  - `MapFloatingWidgets`:
    ```typescript
    <MapFloatingWidgets map={map} />
    ```

### Control Panel Coordinator ↔ Tab Sub-Modules
- `ControlPanel.tsx` maintains active tab state: `"courses" | "multiday" | "stays" | "quests" | "filters"`.
- Each tab component receives required action callbacks or uses `useShallow` selectors directly from `useWellnessStore`.

### Store Decoupling (Auth ↔ Wellness)
- Remove `await import("./authStore")` in `wellnessStore.ts`. In `claimQuestTitle`, dispatch `window.dispatchEvent(new CustomEvent("vital-auth-required", { detail: { mode: "signin" } }))`.
- Remove `import("./wellnessStore")` in `authStore.ts`. In `App.tsx`, sync profile:
  ```typescript
  useEffect(() => {
    if (session?.user?.id) {
      useWellnessStore.getState().syncProfileWithDb(session.user.id);
    }
  }, [session?.user?.id]);
  ```

## Code Layout
```
src/
├── components/
│   ├── auth/
│   │   ├── AuthButton.tsx
│   │   ├── AuthModal.tsx
│   │   └── OnboardingModal.tsx
│   ├── common/
│   │   ├── HealthProfileAlertBanner.tsx
│   │   ├── InfoBar.tsx
│   │   ├── LocationModal.tsx
│   │   └── SettingsModal.tsx
│   ├── map/
│   │   ├── MapContainer.tsx             (Coordinator, <200 lines)
│   │   ├── controllers/
│   │   │   └── useMapFlightController.ts (2-stage morph camera flight)
│   │   ├── layers/
│   │   │   ├── MapMarkersLayer.tsx      (Markers & 70m collision filter)
│   │   │   └── MapPolylinesLayer.tsx    (Route & track polylines)
│   │   └── widgets/
│   │       ├── MapFloatingWidgets.tsx   (Top controls, radar filter, directions bar)
│   │       └── MapWalkSessionBanner.tsx (Isolated 1s walk timer banner)
│   ├── panels/
│   │   ├── ControlPanel.tsx             (Coordinator / Tab host, <150 lines)
│   │   └── tabs/
│   │       ├── CourseTab.tsx            (Course list & selection)
│   │       ├── CourseNutritionAccordion.tsx (Nutrition & health breakdown)
│   │       ├── MultiDayTab.tsx          (Multi-day tour planner)
│   │       ├── StayTab.tsx              (Accommodations)
│   │       ├── QuestTab.tsx             (Wellness quests & active quest timer)
│   │       ├── QuestWalkSessionCard.tsx (Isolated quest timer card)
│   │       └── ConditionFilterTab.tsx   (Health condition filter)
│   └── walk/
│       └── WalkSessionTimerController.tsx (Headless interval runner)
├── store/
│   ├── authStore.ts
│   ├── wellnessStore.ts
│   └── index.ts
├── types/
│   └── naver.d.ts
└── config/
    └── mapConfig.ts
.github/
└── workflows/
    └── ci.yml
```
