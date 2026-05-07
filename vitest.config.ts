import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import path from 'node:path';

// Single Vitest config with `projects` (Vitest 3 native) declaring three test
// classifications:
//   * unit         — pure-logic tests in jsdom (fast)
//   * integration  — multi-module tests in jsdom (hooks, persistence-glue)
//   * component    — React component tests in real Chromium via @vitest/browser
//
// e2e lives in playwright.config.ts and is intentionally NOT a Vitest project.

const repoRoot = import.meta.dirname;
const alias = {
  '@': path.resolve(repoRoot, 'app'),
  '@lib': path.resolve(repoRoot, 'src'),
  '@assets': path.resolve(repoRoot, 'app/assets'),
};

const sharedExclude = ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'];

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          include: ['tests/unit/**/*.test.{ts,tsx}'],
          exclude: sharedExclude,
          setupFiles: ['./tests/setup/common.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'integration',
          environment: 'jsdom',
          globals: true,
          include: ['tests/integration/**/*.test.{ts,tsx}'],
          exclude: sharedExclude,
          setupFiles: ['./tests/setup/common.ts'],
          testTimeout: 15000,
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'component',
          globals: true,
          include: ['tests/component/**/*.test.{ts,tsx}'],
          exclude: sharedExclude,
          setupFiles: ['./tests/setup/common.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
      exclude: [
        '**/index.ts',
        '**/*.d.ts',
        'app/**/*.stories.tsx',
        // app/pages/_dev/* are diagnostic-only routes (asset library
        // browser, persistence inspector, pygame preview tester) that
        // are wired only behind the wouter dev-router and never ship to
        // production users. Excluding them from coverage matches their
        // role: they're tooling, not product surface.
        'app/pages/_dev/**',
      ],
      // Coverage floor — a regression guard, NOT a goal.
      //
      // Ratchet doctrine: when a PR adds tests that move the needle, raise
      // the matching threshold to the new floor in the same PR. Never lower
      // a threshold without unanimous review; flapping floors are how
      // coverage rules become decorative.
      //
      // Scope: `pnpm test:coverage` (= `vitest run --coverage`) runs ALL
      // Vitest projects — unit + integration + component (browser). The
      // numbers below are the aggregate across all three.
      //
      // Today's snapshot (2026-05-07, post-_dev-exclude):
      // statements 56.58%, branches 44.80%, functions 52.31%, lines 56.93%.
      // The thresholds below sit a hair below those numbers (rounded down
      // to the nearest integer minus 1 for noise tolerance) so any
      // regression fails CI. Per the ratchet doctrine: any PR that moves
      // these numbers UP raises the matching threshold in the same PR.
      //
      // Earlier snapshots:
      //   2026-05-07 post-_dev-exclude: 56.58/44.80/52.31/56.93 → floor 55/42/51/55
      //   2026-05-07 post-opfs-migration-unit: 55.87/44.46/51.48/56.16 → floor 54/42/50/55
      //   2026-05-07 post-use-debug: 55.80/44.37/51.48/56.11 → floor 54/42/50/55
      //   2026-05-07 post-orphan-cleanup-2: 55.23/44.02/50.82/55.49 → floor 54/42/49/54
      //   2026-05-07 post-code-generator: 54.10/43.04/50.00/54.30 → floor 53/41/49/53
      //   2026-05-07 post-scene-generator: 53.75/42.87/49.89/53.92 → floor 52/41/48/52
      //   2026-05-07 post-console-logger: 53.75/42.82/49.89/53.92 → floor 52/41/48/52
      //   2026-05-07 post-legacy-asset-cleanup: 52.77/42.15/48.16/52.89 → floor 51/41/47/51
      //   2026-05-07 post-base-url: 51.23/40.92/46.72/51.33 → floor 50/39/45/50
      //   2026-05-07 post-quota: 51.23/40.85/46.72/51.33 → floor 50/39/45/50
      //   2026-05-07 post-contrast: 51.16/40.81/46.72/51.26 → floor 50/39/45/50
      //   2026-05-07 post-pyodide-singleton: 51.13/40.73/46.67/51.22 → floor 50/39/45/50
      //   2026-05-07 post-effects-branches: 51.08/40.66/46.67/51.20 → floor 50/39/45/50
      //   2026-05-07 post-compiler: 50.64/40.35/46.67/50.76 → floor 49/39/45/49
      //   2026-05-07 post-i18n-strings: 50.45/40.08/46.61/50.55 → floor 49/39/45/49
      //   2026-05-07 post-assets-manager: 50.23/40.10/45.62/50.32 → floor 49/39/44/49
      //   2026-05-07 post-pygame-systems: 49.34/39.19/44.46/49.41 → floor 48/38/43/48
      //   2026-05-07 post-pygame-tem+comp: 49.29/39.17/44.25/49.37 → floor 48/38/43/48
      //   2026-05-07 post-pygame-components: 48.01/39.15/43.89/48.03 → floor 47/38/42/47
      //   2026-05-07 post-net-retry: 45.77/38.01/42.26/45.71 → floor 44/37/41/44
      //   2026-05-07 post-error-handler v3: 45.47/37.97/41.53/45.47 → floor 44/36/40/44
      //   2026-05-07 post-errors-edu:   45.21/37.65/41.32/45.20 → floor 44/35/40/44
      //   2026-05-07 post-#128+cache:   44.45/37.08/39.80/44.42 → floor 43/35/38/43
      //   2026-05-07 post-#127+adapter: 44.32/36.96/39.69/44.33 → floor 43/35/38/43
      //   2026-05-07 post-#124+client:  44.17/36.85/39.06/44.17 → floor 43/35/38/43
      //   2026-05-07 post-#123+loader:   43.61/36.71/38.22/43.63 → floor 42/35/36/42
      //   2026-05-07 post-#121+hooks:    43.42/36.60/37.96/43.44 → floor 42/35/36/42
      //   2026-05-07 post-#119+templates: 43.36/36.47/37.75/43.37 → floor 42/35/36/42
      //   2026-05-07 post-#116+components: 43.17/36.58/37.23/43.18 → floor 42/35/36/42
      //   2026-05-07 post-#115+runner: 42.66/36.35/36.70/42.69 → floor 41/35/35/41
      //   2026-05-07 post-#111+dialog: 41.95/35.61/36.28/41.92 → floor 40/34/35/40
      //   2026-05-07 post-#108+utils:  41.47/35.08/35.86/41.41 → floor 40/34/34/40
      //   2026-05-07 post-#104+codegen: 40.79/33.65/35.44/40.78 → floor 39/32/34/39
      //   2026-05-07 post-#97+codegen: 40.30/33.15/34.60/40.31 → floor 39/32/33/39
      //   2026-05-07 post-#93+codegen: 39.22/32.47/33.24/39.20 → floor 38/31/32/38
      //   2026-05-07 post-#90+codegen: 37.88/30.85/32.09/37.92 → floor 36/29/31/36
      //   2026-05-06 post-#86+sess:  37.43/30.49/31.56/37.43 → floor 36/29/30/36
      //   2026-05-06 post-#83+sess:  36.47/29.21/31.20/36.40 → floor 35/28/30/35
      //   2026-05-06 post-#76:       35.51/28.74/29.57/35.46 → floor 34/27/28/34
      //   2026-05-06 post-#69: 34.83/27.99/29.05/34.78 → floor 33/26/28/33
      //   2026-05-06 post-#66: 34.54/27.69/28.52/34.5  → floor 33/26/27/33
      //   2026-05-06 post-#59: 33.98/27.21/27.79/33.92 → floor 32/26/26/32
      //   2026-05-06 post-#58: 33.37/26.91/27.11/33.33 → floor 32/25/26/32
      //   2026-05-06 post-#54: 32.6/26.14/26.31/32.54  → floor 31/25/25/31
      //   2026-05-06 post-#41: 32.11/25.68/25.73/32.02 → floor 31/24/24/31
      //   2026-05-06 post-#39: 31.68/25.20/25.26/31.66 → floor 30/24/24/30
      //   2026-05-05 post-#30: 27.71/22.42/22.28/27.71 → floor 26/21/21/26
      thresholds: {
        statements: 55,
        branches: 42,
        functions: 51,
        lines: 55,
      },
    },
  },
});
