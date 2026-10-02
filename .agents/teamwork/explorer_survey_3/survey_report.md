# VitalRoot Codebase Survey Report: R3 (Modularization) & R4 (GitHub Actions CI)

- **Date**: 2026-09-28
- **Specialist**: explorer_survey_3 (Survey Specialist 3)
- **Scope**: Requirement R3 (Monolithic component modularization, circular dependencies, dynamic imports) & Requirement R4 (GitHub Actions CI pipeline)
- **Repository Root**: `D:\VitalRoot-main\VitalRoot-main`

---

## 1. Executive Summary

VitalRoot currently suffers from two major 1,500-line monolithic components (`MapContainer.tsx` at 1,502 lines and `ControlPanel.tsx` at 1,499 lines). Both components destructured 20–34 Zustand state fields at top-level, including `activeWalkSession`. This causes full DOM re-rendering every 1,000ms during an active walk session.

In addition, an architectural circular dependency between `src/store/wellnessStore.ts` and `src/store/authStore.ts` uses dynamic imports (`import()`) to bypass circular module loading, which triggers Vite build warnings and bundle pollution.

Finally, while `tsc -b` passes with 0 errors, `npm run lint` fails with **79 problems (68 errors, 11 warnings)** across the codebase, and the production bundle size stands at **716.26 kB** (exceeding Vite's 500 kB chunk threshold). Establishing a working GitHub Actions CI pipeline requires addressing these lint failures alongside clean CI workflow configuration.

---

## 2. Requirement R3: `MapContainer.tsx` Analysis & Modularization Plan

### 2.1 Current State & File Metrics
- **Location**: `src/components/map/MapContainer.tsx`
- **Total Lines**: 1,502 lines (68,181 bytes)
- **Store Subscriptions**: 23 fields destructured directly from `useWellnessStore()` (lines 39–63) + 4 fields from `useMapStore()` (line 68).

```tsx
// Lines 39-63 in src/components/map/MapContainer.tsx:
const {
  filteredCourses, activeCourseId, activeWaypointFilter, setActiveWaypointFilter,
  stays, activeStayId, quests, activeQuestId, userLocation, setUserLocation,
  setIsLocationModalOpen, isPinningHome, setIsPinningHome, mapType: storeMapType,
  setMapType: setStoreMapType, distanceUnit, toggleDistanceUnit, saveCustomCourse,
  isOnboardingModalOpen, isSettingsModalOpen, activeWalkSession, cancelWalkSession,
  themeMode,
} = useWellnessStore();
```

### 2.2 Functional Responsibilities Map
`MapContainer.tsx` currently combines 5 distinct sub-systems in a single file:

1. **Naver Map Instance Lifecycle & Initialization (Lines 26–37, 199–267, 377–423)**:
   - Polling check for `window.naver.maps` script availability.
   - Instantiation of `new window.naver.maps.Map(...)` and `new window.naver.maps.InfoWindow(...)`.
   - `mapType` (NORMAL vs HYBRID) sync between store and Naver API.
   - Camera center & zoom synchronization with `useMapStore` (`lastHandledCenterRef`).
   - Map click event listener for "Pin my home" mode (`isPinningHome` -> `setUserLocation`).
   - Window event listener for `"vital-repin-home"`.
   - Global HTML window closer binding: `(window as any).__closeVitalInfoWindow = () => infoWindowRef.current?.close()`.

2. **Camera Flight Controller (Lines 131–197, 269–374)**:
   - `focusActiveCourse(animate, overrideZoom)`: Computes centroid between restaurant and trail, applies desktop sidebar offset (`targetLng = isDesktop ? midLng - 0.0025 : midLng`), and triggers smooth morphing or panning.
   - Event listener: `"vital-fit-course"`, dispatched when user clicks "코스 보기" from sidebar.
   - **2-Stage Camera Flight Animation** on course change:
     - Distance < 2km: Single morph flight (700ms).
     - Distance >= 2km: Phase 1 zoom-out morph to midpoint (650ms, zoom level adapted: 전국 7, 수도권-지방 9, 시도 10, 시군구 12) followed by Phase 2 zoom-in landing morph to destination (750ms at 680ms timeout).
     - Guard: Avoids re-execution if `prev.id === currentCourse.id`.

3. **Polyline Routing Layer (Lines 425–541)**:
   - Calls `fetchPedestrianRoute()` for active course (Restaurant ➔ Trail) and stores `roadRouteCoords` (rendered as emerald line `#10b981`, stroke 6, round cap/join).
   - Calls `fetchPedestrianRoute()` from User ➔ Restaurant (capped at 15km, end snapped to restaurant coordinates) and stores `userToRestCoords` (rendered as skyblue line `#0284c7`, stroke 6, round cap/join).
   - Manages Naver `Polyline` instances in `polylineRef` and `userConnectorPolylineRef`.

4. **Markers Layer (Lines 543–1092)**:
   - Maintains `markersRef` and `userMarkerRef`. Clears and re-creates DOM markers on dependencies change.
   - **User Marker** (Step 1 출발지, cyan capsule badge, anchor Point(45, 34)).
   - **Restaurant Markers** (Step 1/2 식사, emerald badge, anchor Point(0, 0), opens popup with menu, calories, sugars, sodium grade, Naver search link).
   - **Trail Markers** (Step 2/3 도착, rose badge, anchor Point(0, 0), opens popup with slope grade, health benefits, Naver search link).
   - **Waypoints Markers** (3~5 min public toilets, benches, barrier-free, filtered by `activeWaypointFilter`, anchor Point(14, 14)).
   - **Stays Markers** (🏨 teal circle badge, anchor Point(16, 16), safe badges popup, auto-triggers click when `stay.id === activeStayId`).
   - **Quests Markers** (purple circle badge with icon, anchor Point(16, 16), title reward popup, auto-triggers click when `quest.id === activeQuestId`).
   - **Marker Collision Avoidance**: Skips rendering non-selected restaurants, trails, or waypoints if within 70m of the active course restaurant or trail.

5. **Floating Widgets & Controls (Lines 1145–1488)**:
   - `MapPinningGuide`: Floating top banner when `isPinningHome` is true.
   - `MapTopControls`: Top-right button cluster (Course fit `⛶`, Location find `📍`, Home pin `🎯`, `AuthButton`, Map type toggle `🛰️/🗺️`, `HealthProfileAlertBanner`).
   - `MapRadarFilter`: Top convenience radar filter chip (전체, 화장실, 쉼터, 배리어프리).
   - `MapWalkSessionBanner`: Active walk session live floating banner (targetName, elapsed / target timer, GPS status, cancel button).
   - `MapDirectionsBar`: Bottom navigation bar (route summary, actual walk distance with m/km toggle, direct Naver walk/transit links, save custom course `📌`, dismiss `✕`).

### 2.3 Proposed Decomposition Architecture for `MapContainer`
We propose dividing `MapContainer.tsx` into clean, single-responsibility modules under `src/components/map/`:

```
src/components/map/
├── MapContainer.tsx                  # Main coordinator (< 150 lines)
├── controllers/
│   └── useMapFlightController.ts     # 2-stage camera flight & viewport focus hook (~180 lines)
├── layers/
│   ├── MapMarkersLayer.tsx           # Marker management (User, Rest, Trail, WP, Stays, Quests) (~400 lines)
│   └── MapPolylinesLayer.tsx         # Pedestrian route fetching & polyline rendering (~120 lines)
└── widgets/
    ├── MapFloatingWidgets.tsx        # Widget container (~50 lines)
    ├── MapTopControls.tsx            # Top-right utility buttons (~90 lines)
    ├── MapRadarFilter.tsx            # Waypoint category filter chips (~50 lines)
    ├── MapWalkSessionBanner.tsx      # Isolated live walk session banner (< 60 lines) [R2 KEY]
    ├── MapPinningGuide.tsx           # Home pinning banner (~40 lines)
    └── MapDirectionsBar.tsx          # Bottom Naver directions & route summary bar (~160 lines)
```

#### Detailed Sub-Module Responsibilities & Interfaces:

| Module | Type | Responsibilities | Key Dependencies / Props |
|---|---|---|---|
| `MapContainer.tsx` | Component | Mounts Naver map DOM ref, initializes map instance & infoWindow, handles map click for pinning mode, composes sub-layers. | `useMapStore`, `useWellnessStore` (selective) |
| `useMapFlightController.ts` | Custom Hook | Handles 2-stage flight animation (<2km single, >=2km dual morph), `vital-fit-course` event listener, center/zoom sync with `mapStore`. | `mapRef`, `isMapLoaded`, `activeCourse` |
| `MapMarkersLayer.tsx` | Component | Creates and clears all Naver markers (User, Rest, Trail, WP, Stay, Quest), handles popup infoWindows and 70m collision avoidance. | `map`, `infoWindow`, `isMapLoaded` |
| `MapPolylinesLayer.tsx` | Component | Fetches routes via `fetchPedestrianRoute`, renders emerald course line and skyblue user connector line, reports `actualWalkDistance`. | `map`, `isMapLoaded`, `activeCourse`, `userLocation`, `onDistanceCalculated` |
| `MapWalkSessionBanner.tsx` | Component | Subscribes to `activeWalkSession` independently; renders live timer & GPS status. **Isolates 1-sec tick re-rendering from map!** | `useWellnessStore((s) => s.activeWalkSession)`, `cancelWalkSession` |
| `MapDirectionsBar.tsx` | Component | Renders bottom route summary, direct Naver Walk/Transit links, save custom course button, unit toggle. | `activeCourse`, `userLocation`, `actualWalkDistance`, `distanceUnit` |
| `MapTopControls.tsx` | Component | Renders course fit, GPS find, home pin, AuthButton, mapType toggle, HealthProfileAlertBanner. | `onFocusCourse`, `storeMapType`, `onToggleMapType` |

---

## 3. Requirement R3: `ControlPanel.tsx` Analysis & Modularization Plan

### 3.1 Current State & File Metrics
- **Location**: `src/components/panels/ControlPanel.tsx`
- **Total Lines**: 1,499 lines (76,738 bytes)
- **Store Subscriptions**: 34 fields destructured from `useWellnessStore()` at lines 39–74!
- **Tick Interval**: Runs `updateWalkSessionTick()` every 1,000ms at lines 79–85, forcing full re-render of `ControlPanel` and all children every second.

### 3.2 Functional Responsibilities Map
1. **Container & Mobile Responsive Wrapper (Lines 166–265, 1481–1497)**:
   - Bottom sheet for mobile (`h-14` collapsed, `h-[85vh]` expanded).
   - Floating left sidebar for desktop (`sm:w-[350px] lg:w-96`, `max-h-[calc(100vh-1.5rem)]`).
   - Header with VitalRoot branding, settings modal trigger (`openSettingsModal("health")`), and API badges.
   - Footer with Naver Maps API v3 and Tour API credit.

2. **Tab 1: Recommended Courses (`CourseTab.tsx`, Lines 350–858)**:
   - Location sync banner (unlinked vs linked, '집 찍기', '위치 연동', '동네 변경').
   - Dual mode switcher: 'local' (내 동네 힐링) vs 'theme' (테마 명소 여행) with 150ms transition.
   - 3km fallback notification banner if nearest restaurant > 3000m.
   - Course cards:
     - Region badge, local badge, title, target condition, user distance badge.
     - Restaurant info & **Nutrition Accordion** (`expandedNutritionCourseIds`, calories, carbs, protein, sugars, sodium, nutrition tip).
     - Trail info, slope grade, waypoint count.
     - Direct Naver Walk/Transit links (Rest ➔ Trail walk, User ➔ Rest transit/walk, User ➔ Trail walk).
     - Map focus buttons ("지도 위치 ➔", "코스 보기" via `vital-fit-course` event).

3. **Tab 2: Multi-day Courses (`MultiDayTab.tsx`, Lines 860–971)**:
   - 1박 2일 국가 공인 웰니스 프로그램 목록.
   - Associated healthcare accommodation card (`stay.name`, `safeBadges`, contact, Naver link).
   - Day 1 and Day 2 step breakdown timeline (meal, trail, activity steps).
   - Selection triggers `flyToPlace` to the stay location.

4. **Tab 3: Healthcare Stays (`StayTab.tsx`, Lines 973–1085)**:
   - Stay filter chips: `chkcooking` (객실 내 취사), `roomrefrigerator` (인슐린 냉장고), `fitness` (피트니스 센터).
   - Stay card listing with safe badges, address, description, contact, Naver search link, and map focus.

5. **Tab 4: Wellness Quests & Live Walk Session (`QuestTab.tsx`, Lines 1087–1359)**:
   - Earned titles showcase (`earnedTitles`, `equippedTitle`, `equipTitle`).
   - Region-based quest challenge list (`currentRegionName`, `isRegionLoading`, `quests`).
   - **Live Walk Session Progress Card**:
     - Real-time timer: `formatTimerSeconds(elapsedSeconds) / formatTimerSeconds(targetSeconds)`.
     - Visual progress bar (`0%` to `100%`).
     - GPS stay validity check (within 500m vs out of bound).
     - Demo accelerator button (`fastForwardWalkSession`).
     - Start session (`startWalkSession`), Cancel (`cancelWalkSession`), Claim Title (`claimQuestTitle`).

6. **Tab 5: Condition & Medication Filters (`ConditionFilterTab.tsx`, Lines 1361–1478)**:
   - 6 chronic condition toggle chips (`ALL_CONDITIONS`: 당뇨, 고혈압, 저혈압, 이상지질혈증, 신장질환, 관절/근골격계).
   - Prescription medication list & DUR interaction summary (`profile.medications`, `profile.hasNoMedications`).
   - Traveler health profile summary (diet, allergies, walkFitnessLevel).
   - Smart disease algorithm explanation banner.

### 3.3 Proposed Decomposition Architecture for `ControlPanel`
We propose dividing `ControlPanel.tsx` into modular components under `src/components/panels/`:

```
src/components/panels/
├── ControlPanel.tsx                  # Shell & tab router (< 120 lines)
├── components/
│   ├── CourseNutritionAccordion.tsx  # Collapsible nutrition card (~90 lines)
│   ├── QuestWalkSessionCard.tsx      # Real-time walk session progress widget (~80 lines)
│   └── PanelHeader.tsx               # Header with settings & mode info (~50 lines)
└── tabs/
    ├── CourseTab.tsx                 # Recommended courses tab (~220 lines)
    ├── MultiDayTab.tsx               # 1박 2일 long-stay programs tab (~110 lines)
    ├── StayTab.tsx                   # Safe accommodation tab with filters (~110 lines)
    ├── QuestTab.tsx                  # Quests & title showcase tab (~160 lines)
    └── ConditionFilterTab.tsx        # Chronic condition & DUR medication tab (~120 lines)
```

#### Detailed Sub-Module Responsibilities & Interfaces:

| Module | Type | Responsibilities | State Subscriptions (Selective) |
|---|---|---|---|
| `ControlPanel.tsx` | Component | Manages `activeTab` and `isMobileExpanded`. Renders Header, Tab bar, active Tab component, and Footer. | `themeMode` |
| `CourseTab.tsx` | Component | Course list, local/theme mode switch, location banners, Naver links. | `filteredCourses`, `activeCourseId`, `setActiveCourseId`, `userLocation`, `courseMode`, `setCourseMode` |
| `CourseNutritionAccordion.tsx` | Component | Manages local expanded state for nutrition cards (`expandedNutritionCourseIds`). | None (receives `course` as prop) |
| `MultiDayTab.tsx` | Component | Multi-day courses list, stay linkage, day timeline. | `multiDayCourses`, `activeMultiDayCourseId`, `setActiveMultiDayCourseId`, `flyToPlace` |
| `StayTab.tsx` | Component | Stay filter chips, filtered stays list, Naver detail links. | `stays`, `activeStayId`, `setActiveStayId`, `stayFilter`, `toggleStayFilter`, `flyToPlace` |
| `QuestTab.tsx` | Component | Earned titles, quest challenge list, start/cancel/claim handlers. Mounts `QuestWalkSessionCard`. | `quests`, `activeQuestId`, `setActiveQuestId`, `earnedTitles`, `equippedTitle`, `equipTitle`, `currentRegionName`, `isRegionLoading` |
| `QuestWalkSessionCard.tsx` | Component | Subscribes to `activeWalkSession` for live timer bar and GPS validity. | `activeWalkSession`, `cancelWalkSession`, `claimQuestTitle`, `fastForwardWalkSession` |
| `ConditionFilterTab.tsx` | Component | Condition toggle chips, medication list & DUR cautions, health profile. | `profile`, `toggleCondition`, `openSettingsModal` |

---

## 4. Requirement R2/R3: Re-rendering Bottleneck & Circular Dependency Analysis

### 4.1 Timer Tick Re-Rendering Bottleneck (R2 Connection)
- **Problem**:
  In `ControlPanel.tsx`:
  ```tsx
  // Lines 79-85:
  useEffect(() => {
    if (!activeWalkSession) return;
    const interval = setInterval(() => {
      updateWalkSessionTick();
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWalkSession, updateWalkSessionTick]);
  ```
  Every 1 second, `updateWalkSessionTick()` mutates `activeWalkSession.elapsedSeconds` in `useWellnessStore`.
  Because `ControlPanel` and `MapContainer` both destructure `activeWalkSession` at their component roots:
  - The entire `ControlPanel` tree (all tabs, course lists, nutrition cards) re-renders every 1s.
  - The entire `MapContainer` tree (all refs, event listeners, bottom bar) re-renders every 1s.
- **Solution**:
  1. Extract the timer `setInterval` to a headless ticker hook `useWalkSessionTicker()` or mount it inside `App.tsx` (or inside the ticker widget itself).
  2. Subscribe to `activeWalkSession` **only** inside leaf components that display the timer:
     - `MapWalkSessionBanner.tsx` in `MapContainer`
     - `QuestWalkSessionCard.tsx` in `QuestTab`
  3. Change all other component subscriptions to fine-grained Zustand selectors:
     `const filteredCourses = useWellnessStore((s) => s.filteredCourses);`
     `const activeCourseId = useWellnessStore((s) => s.activeCourseId);`

### 4.2 Circular Dependency & Dynamic Import Analysis
- **Problem**:
  During `npm run build`, Vite produces two explicit build warnings:
  ```
  [plugin vite:reporter] 
  (!) D:/VitalRoot-main/VitalRoot-main/src/store/wellnessStore.ts is dynamically imported by D:/VitalRoot-main/VitalRoot-main/src/store/authStore.ts, D:/VitalRoot-main/VitalRoot-main/src/store/authStore.ts but also statically imported by D:/VitalRoot-main/VitalRoot-main/src/App.tsx, ... dynamic import will not move module into another chunk.

  [plugin vite:reporter] 
  (!) D:/VitalRoot-main/VitalRoot-main/src/store/authStore.ts is dynamically imported by D:/VitalRoot-main/VitalRoot-main/src/store/wellnessStore.ts but also statically imported by D:/VitalRoot-main/VitalRoot-main/src/App.tsx, ... dynamic import will not move module into another chunk.
  ```
- **Code Locations**:
  1. `src/store/wellnessStore.ts:668`:
     ```ts
     const { useAuthStore } = await import("./authStore");
     useAuthStore.getState().openModal("signin");
     ```
  2. `src/store/authStore.ts:293 & 314`:
     ```ts
     import("./wellnessStore").then(({ useWellnessStore }) => {
       useWellnessStore.getState().syncProfileWithDb(session.user.id);
     });
     ```
- **Root Cause**:
  `wellnessStore` and `authStore` need each other's actions, leading developers to use dynamic `import()` to avoid static circular initialization errors.
- **Clean Decoupling Solution**:
  1. **From `authStore` -> `wellnessStore`**:
     Remove the dynamic import. Instead, in `App.tsx` (which already subscribes to both stores and initializes auth), observe `session?.user?.id`:
     ```ts
     const user = useAuthStore((s) => s.user);
     const syncProfileWithDb = useWellnessStore((s) => s.syncProfileWithDb);
     useEffect(() => {
       if (user?.id) {
         syncProfileWithDb(user.id);
       }
     }, [user?.id, syncProfileWithDb]);
     ```
  2. **From `wellnessStore` -> `authStore`**:
     In `claimQuestTitle`, instead of importing `useAuthStore`, dispatch a custom event:
     `window.dispatchEvent(new CustomEvent("vital-auth-required", { detail: "signin" }));`
     or handle authentication checks in `QuestTab.tsx` before invoking `claimQuestTitle`.
  3. **Result**: Both dynamic imports are removed, the circular dependency is broken, and Vite emits 0 warnings!

---

## 5. Requirement R4: GitHub Actions CI Pipeline Analysis

### 5.1 Project Infrastructure Audit
- **Package Manager**: npm (lockfile: `package-lock.json` v3, 233 KB)
- **Node Environment**: Tested on Node `v24.14.0`, npm `11.9.0`. Recommended CI Node version: `20` or `22` LTS.
- **TypeScript**: `typescript@5.8.3`
  - Command: `npx tsc -b`
  - Current Status: **PASSED (0 errors, exit code 0)**.
- **Vite**: `vite@7.2.2` (Vite runner `v7.3.6`)
  - Command: `npm run build` (`tsc -b && vite build`)
  - Current Status: **PASSED (exit code 0)**, but outputs chunk warning: `index-CRn0kTJR.js: 716.26 kB (> 500 kB)`.
- **ESLint**: `eslint@9.39.1` with `typescript-eslint@8.46.3`
  - Command: `npm run lint` (`eslint .`)
  - Current Status: **FAILED with 79 problems (68 errors, 11 warnings)**!

### 5.2 ESLint Failure Breakdown (CI Blocker Analysis)
Executing `npm run lint` generates 68 errors that will immediately break any standard CI pipeline:

1. **`@typescript-eslint/no-explicit-any` (36 occurrences)**:
   - `MapContainer.tsx`: lines 331, 352, 353, 363, 364, 415, 416, 1001, 1075 (Naver map `.morph()` and event handlers cast to `any`).
   - `types/naver.d.ts`: lines 69–72, 97, 116, 140–143 (Definitions file contains `any` types while `eslint.config.js` includes all `**/*.{ts,tsx}`).
   - `tourApi.ts` & `pedestrianRouter.ts`: API response parsing with `any`.
2. **`no-empty` empty block statements (25 occurrences)**:
   - `circleStore.ts`: 8 empty catch blocks.
   - `wellnessStore.ts`: 13 empty catch blocks.
   - `pedestrianRouter.ts`: 2 empty catch blocks.
   - `tourApi.ts`: 2 empty catch blocks.
3. **`@typescript-eslint/no-unused-vars` (2 occurrences)**:
   - `localCourseSynthesizer.ts:10:3` (`_conditions` unused).
   - `regionalCourseQuestBuilder.ts:33:3` (`_conditions` unused).
4. **`react-hooks/exhaustive-deps` (6 warnings in `MapContainer.tsx`)**.

#### Action Items for CI Lint Clearance:
- In `eslint.config.js`: Ignore `.d.ts` files or ignore `dist`, or configure rule adjustments (`no-empty: ["error", { "allowEmptyCatch": true }]`).
- In `types/naver.d.ts`: Replace `any` with `unknown` or disable eslint on declaration files.
- In `localCourseSynthesizer.ts`: Dead code scheduled for removal under R1.
- In `MapContainer.tsx` sub-modules: Type Naver map methods properly in `types/naver.d.ts` (e.g. adding `morph(coord: LatLng, zoom: number, options?: { duration?: number }): void;` to `naver.maps.Map`).

### 5.3 Proposed `.github/workflows/ci.yml` Specification
To meet Requirement R4 and Acceptance Criteria, create `.github/workflows/ci.yml` with the following configuration:

```yaml
name: VitalRoot CI Pipeline

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  validate:
    name: Build, Lint & Typecheck
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check (TypeScript)
        run: npx tsc -b

      - name: Lint check (ESLint)
        run: npm run lint

      - name: Production bundle build
        run: npm run build
```

---

## 6. Synthesis & Acceptance Criteria Mapping

| Acceptance Criteria | Current Baseline | Target Post-Refactoring | Primary Specialist Responsible |
|---|---|---|---|
| `package.json` dead packages removed | `mapbox-gl`, `react-map-gl`, `@turf/turf` present | Removed, `npm install` clean | R1 Specialist |
| Bundle size (`dist/assets/index-*.js`) | **716.26 kB** | **< 500.00 kB** | R1 (Dead package elimination) + R3 (Modularization) |
| `tsc -b` type check | **0 errors** (PASSED) | **0 errors** | Maintained across R1, R2, R3 |
| `npm run lint` | **79 problems (68 errors)** | **0 errors** | R1/R3/R4 lint fixes |
| 1-sec walk session DOM re-renders | Re-renders whole `ControlPanel` & `MapContainer` | Re-renders only `MapWalkSessionBanner` & `QuestWalkSessionCard` | R2 & R3 |
| Component modularization | `MapContainer` (1,502 lines), `ControlPanel` (1,499 lines) | Decomposed into <250 line focused components | R3 |
| Dynamic import / circular warnings | 2 Vite warnings (`wellnessStore` ↔ `authStore`) | **0 warnings** | R3 |
| `.github/workflows/ci.yml` | Missing | Present, valid YAML, triggers on push/PR | R4 |
