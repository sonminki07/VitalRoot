# Dispatch Assignment: Worker M1 (Dead Code & Dependency Removal)

## 2026-09-28T00:50:00Z
- **Your Role**: teamwork_preview_worker (Implementation Specialist)
- **Working Directory**: D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\worker_m1\
- **Original User Request**: D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\ORIGINAL_REQUEST.md
- **Project Scope Document**: D:\VitalRoot-main\VitalRoot-main\PROJECT.md
- **Explorer 1 Handoff**: D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\explorer_survey_1\handoff.md
- **Exclusive Write Ownership**:
  - `package.json`
  - `package-lock.json`
  - `src/store/index.ts`
  - `src/config/mapConfig.ts`
  - `src/vite-env.d.ts`
  - `src/components/common/InfoBar.tsx`
  - Deletion of: `src/utils/localCourseSynthesizer.ts`, `src/hooks/useCircleData.ts`, `src/hooks/useMapFilter.ts`, `src/store/circleStore.ts`, `src/utils/turf.ts`, `src/types/circle.types.ts`

### Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Mission
Implement Milestone 1 (R1: Unused Dependencies & Dead Code Removal) per `explorer_survey_1/handoff.md`:
1. Delete the 6 dead files:
   - `src/utils/localCourseSynthesizer.ts`
   - `src/hooks/useCircleData.ts`
   - `src/hooks/useMapFilter.ts`
   - `src/store/circleStore.ts`
   - `src/utils/turf.ts`
   - `src/types/circle.types.ts`
2. Update collateral references:
   - `src/store/index.ts`: Remove `export * from "./circleStore";`
   - `src/config/mapConfig.ts`: Remove `DEFAULT_CIRCLE_SETTINGS` and unused `CircleSettings` import
   - `src/vite-env.d.ts`: Remove `VITE_MAPBOX_ACCESS_TOKEN: string;`
   - `src/components/common/InfoBar.tsx`: Change `"React 19 • Mapbox GL • 한국관광공사 Tour API"` to `"React 19 • NAVER Maps • 한국관광공사 Tour API"`
3. Remove unused packages from `package.json`:
   - `dependencies`: remove `mapbox-gl`, `react-map-gl`, `@turf/turf`
   - `devDependencies`: remove `@types/mapbox-gl`, `@types/geojson`
4. Run `npm install` in shell to update `package-lock.json` and clean `node_modules`.
5. Run build and typecheck verification:
   - `npx tsc -b` (must exit 0 with 0 errors)
   - `npm run build` (must exit 0)
6. Write a comprehensive handoff report to `D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\worker_m1\handoff.md`.
7. Send a message to orchestrator upon completion.
