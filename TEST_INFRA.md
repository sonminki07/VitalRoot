# VitalRoot Test Infrastructure & Architecture (`TEST_INFRA.md`)

## 1. Executive Summary & Test Strategy

VitalRoot is a chronic illness wellness & healthcare tourism platform. To ensure zero-regression refactoring across state management (Zustand v5), component modularization (MapContainer & ControlPanel), dependency purging (`mapbox-gl`, `@turf/turf`), bundle optimization (<= 500KB), and CI pipeline integrity (`.github/workflows/ci.yml`), we have established a **Dual Track Automated Test Architecture**.

The test infrastructure is built directly upon Node.js (ESM native), requiring zero external testing framework dependencies while delivering fast, deterministic, opaque-box verification across 4 distinct testing tiers.

```
VitalRoot Test Framework (Dual Track E2E)
├── tests/
│   ├── run-e2e-tests.mjs           # Primary CLI Test Runner (all tiers, flags)
│   ├── tier1-features.test.mjs     # Tier 1: Feature Coverage & Architectural Integrity
│   ├── tier2-boundary.test.mjs     # Tier 2: Boundary & Corner Cases
│   ├── tier3-combinations.test.mjs # Tier 3: Cross-Feature Combinations
│   ├── tier4-scenarios.test.mjs    # Tier 4: Real-World Application Scenarios
│   └── helpers/
│       ├── test-harness.mjs        # Lightweight assertion library & test registry
│       ├── store-loader.mjs        # Isolated Zustand store sandbox & browser mocks
│       └── url-validator.mjs       # Naver Maps directions & search URL validator
```

---

## 2. Multi-Tier Test Architecture

### Tier 1: Feature Coverage & Architectural Integrity
Focuses on static invariants, dependencies, build integrity, and structural refactoring contracts:
- **T1.1 (Dead Dependencies Absent)**: Verifies that `mapbox-gl`, `react-map-gl`, `@turf/turf`, `@types/mapbox-gl`, and `@types/geojson` are permanently purged from `package.json` and `package-lock.json`.
- **T1.2 (Dead Files Deleted)**: Asserts deletion of obsolete legacy files (`localCourseSynthesizer.ts`, `useCircleData.ts`, `useMapFilter.ts`, `circleStore.ts`, `turf.ts`, `circle.types.ts`).
- **T1.3 (TypeScript Build Integrity)**: Executes `npx tsc -b` and asserts exit code 0 with 0 compilation errors.
- **T1.4 (ESLint Cleanliness)**: Executes `npm run lint` and asserts 0 lint errors.
- **T1.5 (Production Bundle Size Guard)**: Verifies `dist/assets/index-*.js` is `<= 500KB` (512,000 bytes) to enforce vendor chunking.
- **T1.6 (CI Workflow Validation)**: Asserts `.github/workflows/ci.yml` exists, triggers on `main` (`push` and `pull_request`), and contains all required verification steps (`npm ci`, `tsc -b`, `npm run lint`, `npm run build`).
- **T1.7 (Modular Component Structure)**: Validates creation and exports of sub-modules for `MapContainer` (5 sub-modules) and `ControlPanel` (7 sub-modules), and verifies coordinator file lines are reduced (< 300 lines).
- **T1.8 (Headless Timer Controller)**: Confirms `<WalkSessionTimerController />` is extracted into `src/components/walk/` and mounted in `App.tsx`, and raw `setInterval` is removed from `ControlPanel.tsx`.
- **T1.9 (Store Decoupling)**: Checks that circular dynamic imports between `wellnessStore.ts` and `authStore.ts` are eliminated.

### Tier 2: Boundary & Corner Cases
Focuses on extreme conditions, edge inputs, and error resilience:
- **T2.1 (Empty Courses Handling)**: Safe filtering, course selection, and condition toggling when course lists are empty (`[]`) without throwing exceptions.
- **T2.2 (Invalid Coordinates Resilience)**: `calculateDistanceMeters` handling of `NaN`, `null`, identical points, and extreme out-of-bounds coordinates without crashes. Safe execution when `userLocation` is `null`.
- **T2.3 (Timer Boundaries)**: Zero initial elapsed seconds, negative clock skew clamping (`Math.max(0, ...)`), target duration exceeded clamping (`Math.min(targetSeconds, ...)`), and targetSeconds = 0 evaluation.
- **T2.4 (Theme Switching & Persistence)**: Light/dark mode toggle, persistence in `localStorage`, and safe fallback for invalid strings.
- **T2.5 (Radial Distance Thresholds)**: Exact boundary behavior for GPS proximity radius (0m, 500m threshold), marker collision clustering (70m), and transit recommendation threshold (400m).

### Tier 3: Cross-Feature Combinations
Focuses on state interaction across simultaneous UI flows:
- **T3.1 (Active Walk Session across Tab Navigation)**: Ensures walk session continues ticking and state remains intact during transitions across all tabs (`courses` -> `multiday` -> `stays` -> `quests` -> `filters`).
- **T3.2 (Nutrition Accordion vs Course Selection)**: Ensures expanding and collapsing nutrition accordion preserves active course selection and coordinate targets.
- **T3.3 (Waypoint Filter vs Course & Camera Flight)**: Ensures cycling waypoint filters (`전체`, `화장실`, `쉼터`, `배리어프리`) preserves active course selection and polyline coordinates.

### Tier 4: Real-World Application Scenarios
Simulates complete end-to-end user journeys and validates external integrations:
- **T4.1 (Complete Walk Session Lifecycle Simulation)**:
  1. Quest selection (`quest-1`).
  2. Session initialization (`activeWalkSession` instantiated with target seconds, coords, elapsed: 0).
  3. 1-second interval ticking with **asserted ZERO unrelated store mutation** (profile, courses, stays, themes, tabs, and locations remain referentially unchanged).
  4. Eligibility threshold verification (`isEligible` toggles to true when duration met and within GPS radius).
  5. Completion & title reward claim (`earnedTitles` awarded, session reset).
  6. Cancellation scenario (clean abort with zero collateral side effects).
- **T4.2 (Naver Map Walking Directions URL Validation)**:
  - Generates walking and transit URLs from real course datasets (Restaurant -> Trail, User -> Restaurant, User -> Trail).
  - Validates full Naver Maps URL syntax: HTTPS scheme, `map.naver.com`, path structure (`/p/directions/...` or `/v5/directions/...`), coordinate pair ordering (`longitude,latitude`), URL-encoded Korean names, mode (`walk`/`transit`), and camera zoom query parameters (`?c=...`).
  - Adversarial robustness tests: Special characters, Korean spaces, slashes, brackets, and quotes.

---

## 3. Test Runner CLI Usage

The test runner is executable from the project root using Node:

```bash
# Run all test tiers (Tiers 1-4)
node tests/run-e2e-tests.mjs

# Run specific tier
node tests/run-e2e-tests.mjs --tier 1
node tests/run-e2e-tests.mjs --tier 2
node tests/run-e2e-tests.mjs --tier 3
node tests/run-e2e-tests.mjs --tier 4

# Run tests matching a specific pattern
node tests/run-e2e-tests.mjs --filter "Naver"

# Fail-fast mode (abort immediately on first error)
node tests/run-e2e-tests.mjs --bail

# Machine-readable JSON output for CI reporting
node tests/run-e2e-tests.mjs --json

# Compact summary output
node tests/run-e2e-tests.mjs --summary
```

### Exit Codes
- `0`: All executed tests passed.
- `1`: One or more tests failed.

---

## 4. Progressive Testability & Milestone Mapping

Each milestone in `PROJECT.md` directly unlocks corresponding test cases:

| Milestone | Scope | Target Test Cases | Baseline Status | Target Status |
|-----------|-------|-------------------|-----------------|---------------|
| **M1** | Dead Dependencies & Code Removal | `T1.1`, `T1.2` | FAIL | PASS |
| **M2** | Zustand Selector & Timer Isolation | `T1.8`, `T1.9`, `T4.1` | Partial (T1 FAIL) | PASS |
| **M3** | Monolithic Component Modularization | `T1.7`, `T3.1`, `T3.2`, `T3.3` | Partial (T1 FAIL) | PASS |
| **M4** | CI Pipeline, Bundle <= 500KB & Lint | `T1.4`, `T1.5`, `T1.6` | FAIL | PASS |
| **M5** | Final Victory Audit | Full Suite (`Tiers 1-4`) | Pending Milestones | 100% PASS |

---

## 5. Test Isolation & Sandbox Architecture

- **DOM & Storage Virtualization**: `tests/helpers/store-loader.mjs` provides an in-memory `localStorage` mock, `window` event dispatcher, and `CustomEvent` polyfill.
- **State Reset**: Before each test in Tiers 2, 3, and 4, `resetStore()` restores the Zustand store and mock storage to a pristine state from `wellnessData.ts`, eliminating inter-test contamination.
- **Node-Native TypeScript Loader**: Uses `jiti` to dynamically link and execute TypeScript modules (`src/store/wellnessStore.ts`, `src/config/wellnessData.ts`, `src/utils/pedestrianRouter.ts`) directly without ahead-of-time build artifacts.
