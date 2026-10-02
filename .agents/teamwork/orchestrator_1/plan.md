# VitalRoot Refactoring & Optimization Plan

## Objectives
Execute full technical debt remediation and optimization for VitalRoot as outlined in `ORIGINAL_REQUEST.md`:
1. R1: Unused dependencies & dead code removal (`mapbox-gl`, `react-map-gl`, `@turf/turf`, `@types/mapbox-gl`, `localCourseSynthesizer.ts`, `useCircleData.ts`, `useMapFilter.ts`, `circleStore.ts`, `turf.ts`).
2. R2: Zustand state selector optimization (granular selectors, shallow comparison, isolation of 1s `updateWalkSessionTick` timer re-rendering).
3. R3: Monolithic component modularization (`MapContainer.tsx` and `ControlPanel.tsx` into clean, maintainable sub-modules).
4. R4: GitHub Actions CI automated pipeline (`.github/workflows/ci.yml` running lint, tsc -b, build).
5. Acceptance Criteria: Bundle size <= 500KB (`dist/assets/index-*.js`), `tsc -b` 0 errors, `npm run lint` clean, all existing features intact.

## Phased Execution Strategy

### Phase 0: Full Scope Survey (3 Parallel Explorers)
- **Explorer 1**: Dependencies & Dead Code Audit. Investigate `package.json`, build config, references to `mapbox-gl`, `react-map-gl`, `@turf/turf`, dead code files (`localCourseSynthesizer.ts`, `useCircleData.ts`, `useMapFilter.ts`, `circleStore.ts`, `turf.ts`), and baseline bundle size/build status.
- **Explorer 2**: Zustand Store & Re-rendering Profile. Investigate `useWellnessStore.ts`, `updateWalkSessionTick`, state consumers in `ControlPanel.tsx`, `MapContainer.tsx`, and identify selector splitting opportunities.
- **Explorer 3**: Monolithic Component Architecture. Investigate `MapContainer.tsx` (1,500 lines) and `ControlPanel.tsx` (1,500 lines), analyze props/state dependencies, and plan clean sub-module boundaries.

### Phase 1: Survey Synthesis & PROJECT.md Definition
- Merge explorer reports into `PROJECT.md` with Feature Inventory, Milestones, and Interface Contracts.

### Phase 2: Milestone Execution & Verification Loop
- **Milestone 1 (R1: Dependencies & Dead Code)**:
  - Worker removes unused packages and dead files, updates any remaining imports.
  - Verification: `npm run build`, `npm run lint`, `tsc -b`.
  - Reviewers, Challenger, Forensic Auditor.
- **Milestone 2 (R2: Zustand Selector Optimization)**:
  - Worker refactors store subscriptions in `MapContainer`, `ControlPanel`, and related components using granular selectors and shallow comparison. Isolates walk session timer ticks.
  - Verification: Ensure timer tick doesn't trigger re-renders outside timer displays.
  - Reviewers, Challenger, Forensic Auditor.
- **Milestone 3 (R3: Component Modularization)**:
  - Worker splits `MapContainer.tsx` and `ControlPanel.tsx` into specified sub-modules. Resolves any circular imports.
  - Verification: Feature regression testing, component mounting, clean lint & tsc.
  - Reviewers, Challenger, Forensic Auditor.
- **Milestone 4 (R4: CI Pipeline & Bundle Hardening)**:
  - Worker creates `.github/workflows/ci.yml`.
  - Full bundle verification: `dist/assets/index-*.js` <= 500KB.
  - Reviewers, Challenger, Forensic Auditor.

### Phase 3: Final Integration & Victory Audit
- Verification against all Acceptance Criteria.
- Synthesis and reporting to Sentinel.
