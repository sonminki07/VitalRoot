---
name: vitalroot-dev
description: Comprehensive workflow and procedures for VitalRoot development, API configuration swapping, mobile 2622x1206 display simulation, and Google Docs architecture refactoring.
---

# VitalRoot Development & Session Skill

This skill guides Antigravity agents working on the VitalRoot chronic illness healthcare tourism platform.

## When to Activate
Activate this skill whenever working on VitalRoot, particularly when:
- The user requests to continue work ("집에서 이어해줘", "안그래비티 대화창 불러와줘", "대화 세션 불러와줘")
- Refactoring the API configuration layer for easy swapping (`src/config/apiConfig.ts`)
- Configuring the mobile viewport mockup / display resolution (2622x1206 Super Retina XDR, iPhone 16 Pro, 402x874pt) for `npm run dev`
- Decomposing `MapContainer.tsx` or `ControlPanel.tsx` into modular sub-components according to `PROJECT.md`
- Running verification pipelines (`npx tsc -b`, `npm run lint`, `npm run build`)

---

## Environment Setup & Recovery
When setting up on a new machine or restoring a session:
1. Verify Node modules: If `node_modules/` is absent, run `npm install`.
2. Ensure environment variables: Copy `.env.example` to `.env` if `.env` does not exist.
3. Validate static integrity: Run `npx tsc -b` to confirm zero TypeScript errors.

---

## 4 Core Workflows

### 1. API Abstraction & Easy Replacement
- **Goal**: Abstract Naver Maps, Tour API, Supabase, and DUR public data behind unified configuration/adapter interfaces.
- **Location**: `src/config/apiConfig.ts`
- **Pattern**:
  - Centralize all keys, base URLs, and timeout settings.
  - Provide fallback/mock data providers so the app runs smoothly even with invalid or missing keys.
  - Components and stores should import from `apiConfig.ts` rather than reading raw `import.meta.env` directly.

### 2. Mobile Viewport Mockup (iPhone 16 Pro 규격)
- **Goal**: When running `npm run dev`, display the application in a phone viewport container on PC localhost.
- **Reference Spec**: `docs/images/mobile_screen_spec_reference.png`
  - Display resolution: 2622 x 1206
  - Screen size: 6.3 inch
  - Pixel density: 460 ppi
  - Logical CSS Dimensions: 402px wide × 874px high
- **Behavior**:
  - On PC (`window.innerWidth > 640px`): Render centered inside a sleek smartphone bezel frame with device header/notch and rounded corners. Provide an optional toggle button to expand to full screen.
  - On actual mobile devices: Render edge-to-edge at 100dvh.

### 3. Google Docs Architecture Refactoring
- **Goal**: Break large monolithic components into focused sub-components.
- **Reference Layout**:
  - `MapContainer.tsx`:
    - `src/components/map/controllers/useMapFlightController.ts`
    - `src/components/map/layers/MapMarkersLayer.tsx`
    - `src/components/map/layers/MapPolylinesLayer.tsx`
    - `src/components/map/widgets/MapFloatingWidgets.tsx`
    - `src/components/map/widgets/MapWalkSessionBanner.tsx`
  - `ControlPanel.tsx`:
    - `src/components/panels/tabs/CourseTab.tsx`
    - `src/components/panels/tabs/CourseNutritionAccordion.tsx`
    - `src/components/panels/tabs/MultiDayTab.tsx`
    - `src/components/panels/tabs/StayTab.tsx`
    - `src/components/panels/tabs/QuestTab.tsx`
    - `src/components/panels/tabs/QuestWalkSessionCard.tsx`
    - `src/components/panels/tabs/ConditionFilterTab.tsx`

### 4. Continuous Testing Cycle
Execute verification after EVERY major modification:
```bash
npx tsc -b
npm run lint
npm run build
```
Never declare a task done until all three commands pass cleanly.
