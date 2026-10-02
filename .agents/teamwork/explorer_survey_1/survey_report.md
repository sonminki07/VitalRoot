# VitalRoot Codebase Survey Report: Requirement R1
**Author**: `explorer_survey_1` (Survey Specialist 1)  
**Date**: 2026-09-28  
**Scope**: Requirement R1 (Unused dependencies & dead code removal)  
**Target Repository**: `D:\VitalRoot-main\VitalRoot-main`

---

## 1. Executive Summary

A comprehensive, read-only survey of the VitalRoot codebase was conducted to evaluate **Requirement R1 (Unused dependencies & dead code removal)** and analyze baseline build performance, bundle size composition, and linting status.

### Core Discoveries:
1. **Unused Dependencies (`package.json`)**:
   - `mapbox-gl` (v3.1.2) and `react-map-gl` (v7.1.7) have **0 active source imports** anywhere in `src/`.
   - `@turf/turf` (v7.2.0) is imported in only two files: `src/hooks/useCircleData.ts` and `src/utils/turf.ts`, both of which are **100% obsolete dead code**.
   - `@types/mapbox-gl` (v3.4.1) in `devDependencies` is completely unused.
   - `@types/geojson` (v7946.0.16) in `devDependencies` is only imported by the two dead files (`useCircleData.ts`, `turf.ts`) and can be safely purged.
   - `mapbox-gl` occupies **63.26 MB**, `@turf` occupies **5.50 MB**, and `react-map-gl` occupies **0.46 MB** in `node_modules` (~69.22 MB total).
2. **Dead Code Files (5 Target Candidates + Collateral Files)**:
   - `src/utils/localCourseSynthesizer.ts` (242 lines): **0 importers**. (Originally synthesized fake restaurants in remote/mountainous regions; abandoned per WorkLog:318 in favor of real Tour API data).
   - `src/hooks/useCircleData.ts` (71 lines): **0 importers**.
   - `src/hooks/useMapFilter.ts` (33 lines): **0 importers**.
   - `src/store/circleStore.ts` (83 lines, note singular `store` directory): Imported only by the two dead hooks (`useCircleData.ts`, `useMapFilter.ts`) and re-exported in `src/store/index.ts` (which has 0 importers across the repository).
   - `src/utils/turf.ts` (165 lines): Imported only by dead hook `useCircleData.ts`.
   - **Collateral dead items discovered**:
     - `src/types/circle.types.ts` (30 lines): Only imported by `circleStore.ts`, `turf.ts`, and `mapConfig.ts`.
     - `src/config/mapConfig.ts` (lines 10–21): `DEFAULT_CIRCLE_SETTINGS` is only consumed by `circleStore.ts`.
     - `src/store/index.ts` (line 2): `export * from "./circleStore";` must be cleaned up to avoid compilation error.
     - `src/vite-env.d.ts` (line 4): `readonly VITE_MAPBOX_ACCESS_TOKEN: string;` is unused.
     - `src/components/common/InfoBar.tsx` (line 13): Outdated UI label `React 19 • Mapbox GL • 한국관광공사 Tour API` should be changed to reflect NAVER Maps.
3. **Bundle & Build Baseline**:
   - `tsc -b`: **PASS** (0 errors).
   - `npm run build`: **PASS** (exit code 0).
   - Baseline Bundle Size: `dist/assets/index-*.js` = **716.26 kB** (gzip: 193.29 kB).
   - Source-map composition analysis:
     - `@supabase/*`: 874,949 bytes uncompressed source (~44.5%)
     - `react-dom`: 635,226 bytes uncompressed source (~32.3%)
     - `src/*` (monolithic components & data): 387,806 bytes (~19.7%)
     - Dead turf/mapbox code is already tree-shaken by Vite in production build; achieving the user acceptance criterion (<= 500 kB) requires vendor code splitting (`build.rollupOptions.output.manualChunks`) in `vite.config.ts` or dynamic imports in R3.
4. **ESLint Baseline**:
   - Baseline lint: **79 problems** (68 errors, 11 warnings).
   - Removing `circleStore.ts` removes 8 empty block statement errors.
   - Removing `localCourseSynthesizer.ts` removes 1 unused variable error.

---

## 2. Dependency Audit Details

### 2.1 Target Dependencies in `package.json`

| Package | Category | Version | Disk Space in `node_modules` | Codebase Usage | Verdict |
|---|---|---|---|---|---|
| `mapbox-gl` | `dependencies` | `^3.1.2` | 63.26 MB | **0 imports** in any `.ts`/`.tsx`. Only mentioned in README.md, vite-env.d.ts, InfoBar.tsx text | **REMOVE** |
| `react-map-gl` | `dependencies` | `^7.1.7` | 0.46 MB | **0 imports** in any file | **REMOVE** |
| `@turf/turf` | `dependencies` | `^7.2.0` | 5.50 MB | Imported only in dead files `useCircleData.ts` and `turf.ts` | **REMOVE** |
| `@types/mapbox-gl` | `devDependencies` | `^3.4.1` | < 0.1 MB | **0 imports** | **REMOVE** |
| `@types/geojson` | `devDependencies` | `^7946.0.16` | < 0.2 MB | Imported only in dead files `useCircleData.ts` and `turf.ts` | **REMOVE** (Safe Cleanup) |

### 2.2 Transitive Dependency Tree (`npm ls`)
```
react-map-js@0.0.0 D:\VitalRoot-main\VitalRoot-main
+-- @turf/turf@7.4.0 (pulls 68 @turf/* subpackages)
+-- mapbox-gl@3.31.0
`-- react-map-gl@7.1.9
  `-- mapbox-gl@3.31.0 deduped
+-- @types/geojson@7946.0.16
+-- @types/mapbox-gl@3.4.1
```
Removing `mapbox-gl`, `react-map-gl`, `@turf/turf`, and `@types/mapbox-gl` safely cascades to purge 70+ transitive packages and frees ~69.2 MB from disk.

---

## 3. Dead Code Inventory & Usage Mapping

### 3.1 `src/utils/localCourseSynthesizer.ts`
- **Location**: `D:\VitalRoot-main\VitalRoot-main\src\utils\localCourseSynthesizer.ts`
- **Lines**: 242 lines
- **Exports**: `generateLocalCoursesForLocation(userLocation, _conditions)`
- **Imports inside file**: `../types/wellness.types`, `./koreaRegionResolver`
- **Importers**: **NONE (0 occurrences)** across all files in repository.
- **Background**:
  According to `WorkLog.txt:318`:
  > *"4km 초과 외곽/산간 지역 핀 지정 시 가상으로 합성되던 가짜 코스(`localCourseSynthesizer`)가 산림 속 비존재 식당을 생성하던 문제를 원천 폐지하고, 100% 지자체/공공 검증된 실제 코스만을 필터링 및 도보권 부재 시 정직한 대체 추천 안내 배너 표출"*
  The store logic was previously redirected to use authentic Tour API data, leaving this 242-line file completely orphaned.
- **ESLint Impact**: File currently triggers ESLint error:
  `10:3 error '_conditions' is defined but never used @typescript-eslint/no-unused-vars`.
- **Action**: **Delete file**.

### 3.2 `src/hooks/useCircleData.ts`
- **Location**: `D:\VitalRoot-main\VitalRoot-main\src\hooks\useCircleData.ts`
- **Lines**: 71 lines
- **Exports**: `useCircleData()`
- **Imports inside file**:
  - `react` (`useMemo`)
  - `@turf/turf` (`* as turf`)
  - `geojson` (`type { Feature, Polygon, FeatureCollection }`)
  - `../store/circleStore` (`useCircleStore`)
  - `../utils/turf` (`getCircleLabelPositions, getAngleLabels, generateRadialLines`)
- **Importers**: **NONE (0 occurrences)** across all components and pages.
- **Action**: **Delete file**.

### 3.3 `src/hooks/useMapFilter.ts`
- **Location**: `D:\VitalRoot-main\VitalRoot-main\src\hooks\useMapFilter.ts`
- **Lines**: 33 lines
- **Exports**: `useMapFilter()`
- **Imports inside file**:
  - `react` (`useMemo`)
  - `../store/wellnessStore` (`useWellnessStore`)
  - `../store/circleStore` (`useCircleStore`)
- **Importers**: **NONE (0 occurrences)** across all components and pages. (Filtering is handled directly in `ControlPanel.tsx` and `MapContainer.tsx`).
- **Action**: **Delete file**.

### 3.4 `src/store/circleStore.ts`
- **Location**: `D:\VitalRoot-main\VitalRoot-main\src\store\circleStore.ts`
  *(Note: Located in `src/store/`, not `src/stores/`)*
- **Lines**: 83 lines
- **Exports**: `useCircleStore`
- **Imports inside file**:
  - `zustand` (`create`)
  - `../config/mapConfig` (`DEFAULT_CIRCLE_SETTINGS`)
  - `../types/circle.types` (`CircleSettings`)
- **Importers**:
  - `src/hooks/useMapFilter.ts` (dead code)
  - `src/hooks/useCircleData.ts` (dead code)
  - `src/store/index.ts` (line 2: `export * from "./circleStore";`)
- **ESLint Impact**: Triggers 8 ESLint `no-empty` errors on empty catch blocks (`try { localStorage.setItem(...) } catch {}`).
- **Action**: **Delete file**. Remove line 2 from `src/store/index.ts`.

### 3.5 `src/utils/turf.ts`
- **Location**: `D:\VitalRoot-main\VitalRoot-main\src\utils\turf.ts`
- **Lines**: 165 lines
- **Exports**:
  - `getCircleLabelPositions`
  - `getAngleLabels`
  - `generateCircles` (marked `@deprecated`)
  - `generateRadialLines`
- **Imports inside file**:
  - `@turf/turf` (`* as turf`)
  - `geojson` (`type { Feature, Polygon, LineString }`)
  - `../types/circle.types` (`type { LabelPosition, AngleLabel }`)
- **Importers**:
  - `src/hooks/useCircleData.ts` (dead code)
- **Action**: **Delete file**.

---

## 4. Collateral Dead Code & Secondary Files

In addition to the 5 primary dead files, our survey identified the following directly coupled secondary artifacts:

### 4.1 `src/types/circle.types.ts`
- **Location**: `D:\VitalRoot-main\VitalRoot-main\src\types\circle.types.ts` (30 lines)
- **Exports**: `LabelPosition`, `AngleLabel`, `CircleSettings`
- **Importers**:
  - `src/store/circleStore.ts` (dead)
  - `src/utils/turf.ts` (dead)
  - `src/config/mapConfig.ts` (used only for `DEFAULT_CIRCLE_SETTINGS`)
- **Action**: Delete `src/types/circle.types.ts` once `DEFAULT_CIRCLE_SETTINGS` is removed from `mapConfig.ts`.

### 4.2 `src/config/mapConfig.ts`
- **Location**: `D:\VitalRoot-main\VitalRoot-main\src\config\mapConfig.ts` (22 lines)
- **Lines 10–21**:
  ```typescript
  export const DEFAULT_CIRCLE_SETTINGS: CircleSettings = {
    center: [126.9825, 37.5583],
    radiusKm: 3,
    maxRadiusKm: 5,
    stepKm: 1,
    color: "#10b981",
    fillOpacity: 0.15,
    strokeWidth: 2,
    showDistanceLabels: true,
    showAngleLabels: true,
    showRadialLines: true,
  };
  ```
- **Usage**: Consumed only by `circleStore.ts`.
- **Lines 3–8**: `INITIAL_MAP_CONFIG` is actively used by `src/store/mapStore.ts`.
- **Action**: Remove `DEFAULT_CIRCLE_SETTINGS` and `import { CircleSettings } from "../types/circle.types";` from `mapConfig.ts`. Keep `INITIAL_MAP_CONFIG`.

### 4.3 `src/store/index.ts`
- **Location**: `D:\VitalRoot-main\VitalRoot-main\src\store\index.ts` (5 lines)
- **Line 2**: `export * from "./circleStore";`
- **Usage**: No file in `src/` imports from `src/store/index.ts` directly, but if `circleStore.ts` is deleted, this line will cause a module resolution error during `tsc -b`.
- **Action**: Delete line 2: `export * from "./circleStore";`.

### 4.4 `src/vite-env.d.ts`
- **Location**: `D:\VitalRoot-main\VitalRoot-main\src\vite-env.d.ts`
- **Line 4**: `readonly VITE_MAPBOX_ACCESS_TOKEN: string;`
- **Action**: Remove this stale declaration.

### 4.5 `src/components/common/InfoBar.tsx`
- **Location**: `D:\VitalRoot-main\VitalRoot-main\src\components\common\InfoBar.tsx`
- **Line 13**:
  ```tsx
  <span className="text-gray-300">
    React 19 • Mapbox GL • 한국관광공사 Tour API
  </span>
  ```
- **Action**: Update text to:
  ```tsx
  <span className="text-gray-300">
    React 19 • NAVER Maps • 한국관광공사 Tour API
  </span>
  ```

### 4.6 `src/hooks/` Directory Status
- `src/hooks/` contains only `useCircleData.ts` and `useMapFilter.ts`.
- Once both are deleted, `src/hooks/` will be empty. It can either be removed or retained for new custom hooks developed during R2/R3.

---

## 5. Build, Bundle Size & Performance Analysis

### 5.1 Current Build Output
Command executed: `npm run build` (`tsc -b && vite build`)
```
vite v7.3.6 building client environment for production...
transforming...
✓ 96 modules transformed.

rendering chunks...
computing gzip size...
dist/index.html                   0.66 kB │ gzip:   0.46 kB
dist/assets/index-CdvFmJ9z.css   87.38 kB │ gzip:  12.97 kB
dist/assets/index-CRn0kTJR.js   716.26 kB │ gzip: 193.29 kB │ map: 2,881.04 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking
```

### 5.2 Bundle Composition Breakdown (from Source Map)

| Category / Chunk | Uncompressed Source Size (bytes) | % of Source Content | Key Sub-modules |
|---|---|---|---|
| `@supabase` | 874,949 bytes | 44.5% | `@supabase/supabase-js`, `postgrest-js`, `realtime-js`, `gotrue-js`, `phoenix` |
| `react-dom` | 635,226 bytes | 32.3% | `react-dom/cjs/react-dom.production.js`, client runtime |
| `src/*` (App Code) | 387,806 bytes | 19.7% | `ControlPanel.tsx` (72.8 KB), `MapContainer.tsx` (64.1 KB), `wellnessData.ts` (55.6 KB), `SettingsModal.tsx` (33.0 KB), `wellnessStore.ts` (28.7 KB) |
| `react` | 19,412 bytes | 1.0% | Core React runtime |
| `tslib` | 17,648 bytes | 0.9% | Runtime helpers |
| `iceberg-js` | 17,187 bytes | 0.9% | Supabase dependency |
| `scheduler` | 10,375 bytes | 0.5% | React scheduler |
| `zustand` | 1,740 bytes | 0.1% | State management |

### 5.3 Key Takeaway for Acceptance Criteria: Bundle Size <= 500 kB
- **Vite Tree Shaking**: Because `useCircleData.ts` and `turf.ts` had no live importers in the root entry graph, Vite was already tree-shaking `@turf/turf` out of the client JS bundle.
- **Root Cause of 716.26 kB Bundle**: The entire bundle currently builds into a **single monolithic chunk** (`index-*.js`) containing the entire Supabase client SDK and React-DOM.
- **Recommendation to reach <= 500 kB target**:
  In `vite.config.ts`, implement vendor chunk splitting under `build.rollupOptions`:
  ```typescript
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  }
  ```
  Splitting `@supabase` (~200 kB gzipped) into its own chunk immediately drops the main application bundle `index-*.js` from **716 kB down to ~250–320 kB**, comfortably fulfilling Acceptance Criteria:
  > `- [ ] 번들 산출물 크기(dist/assets/index-*.js)가 기존 716KB에서 500KB 이하로 감소해야 함`

---

## 6. Implementation Action Plan for Implementers

### Step 1: File Deletions
Execute removal of the 5 target dead files + 1 collateral type file:
1. `src/utils/localCourseSynthesizer.ts`
2. `src/hooks/useCircleData.ts`
3. `src/hooks/useMapFilter.ts`
4. `src/store/circleStore.ts`
5. `src/utils/turf.ts`
6. `src/types/circle.types.ts`

### Step 2: Clean Up Coupled Source Code
1. `src/config/mapConfig.ts`:
   - Remove `import { CircleSettings } from "../types/circle.types";`
   - Remove `DEFAULT_CIRCLE_SETTINGS`
2. `src/store/index.ts`:
   - Remove `export * from "./circleStore";`
3. `src/vite-env.d.ts`:
   - Remove `readonly VITE_MAPBOX_ACCESS_TOKEN: string;`
4. `src/components/common/InfoBar.tsx`:
   - Replace `"Mapbox GL"` with `"NAVER Maps"` in the footer text

### Step 3: Clean Up `package.json`
- Remove from `dependencies`:
  - `"@turf/turf": "^7.2.0"`
  - `"mapbox-gl": "^3.1.2"`
  - `"react-map-gl": "^7.1.7"`
- Remove from `devDependencies`:
  - `"@types/mapbox-gl": "^3.4.1"`
  - `"@types/geojson": "^7946.0.16"`
- Run `npm install` to update `package-lock.json` and remove modules from `node_modules`.

### Step 4: Bundle Optimization in `vite.config.ts`
Configure `manualChunks` to split vendor dependencies and reduce main chunk size below 500 kB.

### Step 5: Verification
Run:
1. `npx tsc -b` -> must pass with 0 errors
2. `npm run build` -> must pass with 0 errors and `index-*.js` <= 500 kB
3. `npm run lint` -> verify dead code errors are eliminated

---
*End of Survey Report*
