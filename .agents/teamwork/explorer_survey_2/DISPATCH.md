# Dispatch Assignment: Explorer 2 (Zustand State & Re-rendering Survey)

## 2026-09-28T00:42:00Z
- **Your Role**: teamwork_preview_explorer (Survey Specialist 2)
- **Working Directory**: D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\explorer_survey_2\
- **Original User Request File**: D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\ORIGINAL_REQUEST.md

### Mission
Investigate the codebase for Requirement R2:
1. Locate and examine all Zustand stores (especially `src/stores/wellnessStore.ts` or similar).
2. Trace `updateWalkSessionTick`: where is it defined, what state properties does it mutate, where is the timer interval set (e.g., `setInterval` 1 second)?
3. Analyze all consumers of the store in `ControlPanel.tsx`, `MapContainer.tsx`, and other components. Check how state is subscribed (e.g. `const store = useWellnessStore()` vs granular selectors).
4. Identify why 1s timer ticks trigger full DOM re-renders of unrelated components (course lists, map markers, sidebar, accordion, etc.).
5. Design the optimal selector splitting and memoization/shallow comparison strategy to isolate `updateWalkSessionTick` re-rendering strictly to the timer/progress badge.
6. Output your findings to `D:\VitalRoot-main\VitalRoot-main\.agents\teamwork\explorer_survey_2\survey_report.md` and provide a self-contained `handoff.md`.
