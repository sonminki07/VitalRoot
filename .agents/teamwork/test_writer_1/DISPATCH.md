# Dispatch Assignment: E2E Test Writer (Test Infrastructure & Suites)

## 2026-09-28T00:50:00Z
- **Your Role**: teamwork_preview_test_writer (Test Architect & Writer)
- **Working Directory**: D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\test_writer_1\
- **Original User Request**: D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\ORIGINAL_REQUEST.md
- **Project Scope Document**: D:\VitalRoot-main\VitalRoot-main\PROJECT.md
- **Exclusive Write Ownership**:
  - `tests/` directory (e.g., `tests/run-e2e-tests.mjs`, test suites)
  - `TEST_INFRA.md` (at project root `D:\VitalRoot-main\VitalRoot-main\TEST_INFRA.md`)
  - `TEST_READY.md` (at project root `D:\VitalRoot-main\VitalRoot-main\TEST_READY.md`)

### Mission
Build an opaque-box automated test runner and multi-tier test suite covering all requirements in `ORIGINAL_REQUEST.md` and `PROJECT.md § Feature Inventory`:
1. **Test Runner Design**:
   - Create an automated, robust Node test runner (e.g. `node tests/run-e2e-tests.mjs`) that executes all tests, reports pass/fail counts and details, and exits with code 0 on pass or code 1 on fail.
2. **Multi-Tier Test Case Coverage**:
   - **Tier 1 (Feature Coverage)**:
     - Dead dependencies absent from `package.json` and `package-lock.json`
     - Dead files deleted from `src/`
     - `tsc -b` passes with 0 errors
     - `npm run lint` passes with 0 errors
     - Bundle size `dist/assets/index-*.js` <= 500KB
     - CI workflow `.github/workflows/ci.yml` exists and has valid YAML structure
     - Component structure: sub-modules for MapContainer and ControlPanel exist and are exported
     - Store architecture: `WalkSessionTimerController` exists and is mounted in `App.tsx`
   - **Tier 2 (Boundary & Corner Cases)**:
     - Edge conditions: empty courses, invalid user coordinates, walk session timer zero/negative/exceeded duration
     - Theme switching between light/dark mode
     - Radial distance filter bounds (e.g. 500m GPS radius)
   - **Tier 3 (Cross-Feature Combinations)**:
     - Walk session active while switching tabs (Course -> MultiDay -> Stay -> Quest)
     - Nutrition accordion toggle during active course selection
     - Waypoint filtering with camera flight
   - **Tier 4 (Real-World Application Scenarios)**:
     - Complete walk session workflow simulation: quest selection -> start walk session -> 1s tick simulation (verifying only timer banner changes, no store crash) -> completion / cancellation.
     - Course selection -> Naver map walking directions URL generation validation (`map.naver.com/v5/directions/...`).
3. **Artifacts**:
   - Create `TEST_INFRA.md` at project root using the standard template.
   - Create test runner and test files in `tests/`.
   - Publish `TEST_READY.md` at project root once the test suite and runner are operational and ready for use by reviewers and implementation milestones.
   - Write a comprehensive handoff report to `D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\test_writer_1\handoff.md`.
   - Send a message to orchestrator upon completion.
