// tests/tier1-features.test.mjs
// Tier 1: Feature Coverage & Architectural Integrity Test Suite

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, test, expect } from './helpers/test-harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export function registerTier1Tests() {
  describe('Tier 1: Feature Coverage & Architectural Integrity', () => {
    // T1.1: Dead dependencies absent from package.json and package-lock.json
    test('T1.1: Dead dependencies (mapbox-gl, react-map-gl, @turf/turf, etc.) are absent', () => {
      const pkgPath = path.resolve(projectRoot, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

      const deadDeps = [
        'mapbox-gl',
        'react-map-gl',
        '@turf/turf',
        '@types/mapbox-gl',
        '@types/geojson',
      ];

      const foundDeps = deadDeps.filter((dep) => dep in deps);
      expect(foundDeps).toEqual([]);

      const lockPath = path.resolve(projectRoot, 'package-lock.json');
      if (fs.existsSync(lockPath)) {
        const lockContent = fs.readFileSync(lockPath, 'utf-8');
        const lockData = JSON.parse(lockContent);
        const lockPackages = lockData.packages || {};
        const foundInLock = deadDeps.filter(
          (dep) => `node_modules/${dep}` in lockPackages
        );
        expect(foundInLock).toEqual([]);
      }
    });

    // T1.2: Dead files deleted from src/
    test('T1.2: Dead files (localCourseSynthesizer, circleStore, turf, etc.) are removed', () => {
      const deadFiles = [
        'src/utils/localCourseSynthesizer.ts',
        'src/hooks/useCircleData.ts',
        'src/hooks/useMapFilter.ts',
        'src/store/circleStore.ts',
        'src/utils/turf.ts',
        'src/types/circle.types.ts',
      ];

      const existingDeadFiles = deadFiles.filter((relPath) =>
        fs.existsSync(path.resolve(projectRoot, relPath))
      );

      expect(existingDeadFiles).toEqual([]);
    });

    // T1.3: TypeScript Compilation passes with 0 errors
    test('T1.3: TypeScript compile check (tsc -b) passes with exit code 0', () => {
      try {
        const output = execSync('npx tsc -b', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 45000,
        });
        expect(output.trim()).toBe('');
      } catch (err) {
        throw new Error(
          `tsc -b failed with exit code ${err.status}:\n${err.stdout || ''}\n${err.stderr || ''}`
        );
      }
    });

    // T1.4: ESLint check passes with 0 errors
    test('T1.4: ESLint (npm run lint) passes with 0 errors and warnings', () => {
      try {
        const output = execSync('npm run lint', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 45000,
        });
        expect(output).not.toContain('error');
      } catch (err) {
        throw new Error(
          `npm run lint failed with exit code ${err.status}:\n${err.stdout || ''}\n${err.stderr || ''}`
        );
      }
    });

    // T1.5: Production bundle size is <= 500KB
    test('T1.5: Production bundle size (dist/assets/index-*.js) is <= 500KB', () => {
      const distAssetsDir = path.resolve(projectRoot, 'dist/assets');
      expect(fs.existsSync(distAssetsDir)).toBe(true);

      const files = fs.readdirSync(distAssetsDir);
      const indexJsFiles = files.filter(
        (f) => f.startsWith('index-') && f.endsWith('.js') && !f.endsWith('.map')
      );

      expect(indexJsFiles.length).toBeGreaterThan(0);

      const MAX_BUNDLE_BYTES = 500 * 1024; // 512,000 bytes
      for (const indexJs of indexJsFiles) {
        const stat = fs.statSync(path.resolve(distAssetsDir, indexJs));
        const sizeKB = (stat.size / 1024).toFixed(2);
        if (stat.size > MAX_BUNDLE_BYTES) {
          throw new Error(
            `Bundle file ${indexJs} exceeds 500KB threshold: ${sizeKB}KB (${stat.size} bytes)`
          );
        }
        expect(stat.size).toBeLessThanOrEqual(MAX_BUNDLE_BYTES);
      }
    });

    // T1.6: CI workflow (.github/workflows/ci.yml) exists and is valid
    test('T1.6: GitHub Actions CI workflow (.github/workflows/ci.yml) exists with valid structure', () => {
      const ciPath = path.resolve(projectRoot, '.github/workflows/ci.yml');
      expect(fs.existsSync(ciPath)).toBe(true);

      const ciContent = fs.readFileSync(ciPath, 'utf-8');

      // Verify triggers
      expect(ciContent).toContain('push:');
      expect(ciContent).toContain('pull_request:');
      expect(ciContent).toContain('main');

      // Verify mandatory verification steps
      expect(ciContent).toMatch(/npm (ci|install)/);
      expect(ciContent).toMatch(/(tsc -b|npx tsc)/);
      expect(ciContent).toMatch(/(npm run lint|npx eslint)/);
      expect(ciContent).toMatch(/npm run build/);
    });

    // T1.7: Modular component structure for MapContainer and ControlPanel
    test('T1.7: Sub-modules for MapContainer and ControlPanel are present and modularized', () => {
      const requiredModules = [
        // MapContainer submodules
        'src/components/map/controllers/useMapFlightController.ts',
        'src/components/map/layers/MapMarkersLayer.tsx',
        'src/components/map/layers/MapPolylinesLayer.tsx',
        'src/components/map/widgets/MapFloatingWidgets.tsx',
        'src/components/map/widgets/MapWalkSessionBanner.tsx',

        // ControlPanel submodules
        'src/components/panels/tabs/CourseTab.tsx',
        'src/components/panels/tabs/CourseNutritionAccordion.tsx',
        'src/components/panels/tabs/MultiDayTab.tsx',
        'src/components/panels/tabs/StayTab.tsx',
        'src/components/panels/tabs/QuestTab.tsx',
        'src/components/panels/tabs/QuestWalkSessionCard.tsx',
        'src/components/panels/tabs/ConditionFilterTab.tsx',
      ];

      const missingModules = requiredModules.filter(
        (modPath) => !fs.existsSync(path.resolve(projectRoot, modPath))
      );

      expect(missingModules).toEqual([]);

      // Verify coordinator lines have been reduced from monolithic ~1500 lines
      const mapContainerPath = path.resolve(projectRoot, 'src/components/map/MapContainer.tsx');
      const controlPanelPath = path.resolve(projectRoot, 'src/components/panels/ControlPanel.tsx');

      if (fs.existsSync(mapContainerPath)) {
        const mapLines = fs.readFileSync(mapContainerPath, 'utf-8').split('\n').length;
        expect(mapLines).toBeLessThan(300);
      }

      if (fs.existsSync(controlPanelPath)) {
        const panelLines = fs.readFileSync(controlPanelPath, 'utf-8').split('\n').length;
        expect(panelLines).toBeLessThan(250);
      }
    });

    // T1.8: Headless WalkSessionTimerController architecture
    test('T1.8: WalkSessionTimerController is present in src/components/walk/ and mounted in App.tsx', () => {
      const controllerPath = path.resolve(
        projectRoot,
        'src/components/walk/WalkSessionTimerController.tsx'
      );
      expect(fs.existsSync(controllerPath)).toBe(true);

      const appPath = path.resolve(projectRoot, 'src/App.tsx');
      expect(fs.existsSync(appPath)).toBe(true);

      const appContent = fs.readFileSync(appPath, 'utf-8');
      expect(appContent).toContain('WalkSessionTimerController');

      // ControlPanel should no longer contain raw setInterval for updateWalkSessionTick
      const controlPanelPath = path.resolve(projectRoot, 'src/components/panels/ControlPanel.tsx');
      if (fs.existsSync(controlPanelPath)) {
        const cpContent = fs.readFileSync(controlPanelPath, 'utf-8');
        const hasDirectInterval =
          cpContent.includes('setInterval') && cpContent.includes('updateWalkSessionTick');
        expect(hasDirectInterval).toBe(false);
      }
    });

    // T1.9: Store Decoupling (Circular dynamic imports removed)
    test('T1.9: Circular dynamic imports between wellnessStore and authStore are decoupled', () => {
      const wellnessStorePath = path.resolve(projectRoot, 'src/store/wellnessStore.ts');
      const authStorePath = path.resolve(projectRoot, 'src/store/authStore.ts');

      expect(fs.existsSync(wellnessStorePath)).toBe(true);
      expect(fs.existsSync(authStorePath)).toBe(true);

      const wellnessContent = fs.readFileSync(wellnessStorePath, 'utf-8');
      const authContent = fs.readFileSync(authStorePath, 'utf-8');

      // Verify no dynamic import of authStore inside wellnessStore
      expect(wellnessContent).not.toMatch(/import\s*\(\s*["'].*authStore.*["']\s*\)/);

      // Verify no dynamic import of wellnessStore inside authStore
      expect(authContent).not.toMatch(/import\s*\(\s*["'].*wellnessStore.*["']\s*\)/);
    });
  });
}
