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
        // app/main.tsx is the createRoot bootstrap; coverage there
        // means an integration test, not a unit test. The render call
        // is exercised by the Playwright e2e suite.
        'app/main.tsx',
        // app/components/ui/* are shadcn/ui + Radix primitives — vendored
        // wrappers that exist to give us a consistent design system on
        // top of upstream libraries. The project doesn't author business
        // logic here; the upstream libs already test their internals.
        // Excluding these matches the same convention applied to
        // ui-design-system tokens elsewhere in the ecosystem.
        'app/components/ui/**',
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
      // Today's snapshot (2026-05-08, post-dialogue-flow-load-error):
      // statements 87.36%, branches 77.63%, functions 85.43%, lines 88.75%.
      // (Aggregate flaps ±0.1% per run due to browser-suite render-effect
      // timing; the per-file targeted lines for each PR move into the
      // covered set deterministically.)
      // The thresholds below sit a hair below those numbers (rounded down
      // to the nearest integer minus 1 for noise tolerance) so any
      // regression fails CI. Per the ratchet doctrine: any PR that moves
      // these numbers UP raises the matching threshold in the same PR.
      //
      // Earlier snapshots:
      //   2026-05-08 post-effects-default-type-fallback: 87.23/77.40/85.25/88.64 → floor 87/77/85/88
      //   2026-05-08 post-grading-runtime-edge-paths: 87.34/77.52/85.37/88.75 → floor 87/77/85/88
      //   2026-05-08 post-quota-measure-bytes-catch: 87.23/77.33/85.25/88.64 → floor 87/77/85/88
      //   2026-05-08 post-persistence-needs-migration-catch: 87.21/77.38/85.25/88.63 → floor 87/77/85/88
      //   2026-05-08 post-broadcast-sender-id-fallback: 87.20/77.33/85.25/88.61 → floor 87/77/85/88
      //   2026-05-08 post-schema-test-spec-rules: 87.32/77.45/85.37/88.72 → floor 87/77/85/88
      //   2026-05-08 post-storage-client-init-error: 87.23/77.33/85.31/88.63 → floor 87/77/85/88
      //   2026-05-08 post-quota-default-estimate: 87.16/77.24/85.25/88.57 → floor 87/77/85/88
      //   2026-05-08 post-audio-sfx-ctx-throw: 87.14/77.24/85.25/88.55 → floor 87/77/85/88
      //   2026-05-08 post-dialogue-transition-no-next: 87.13/77.19/85.25/88.53 → floor 87/77/85/88
      //   2026-05-08 post-palette-collect-callback: 87.10/77.17/85.25/88.50 → floor 87/77/85/88
      //   2026-05-08 post-grading-engine-edge-paths: 87.07/77.17/85.13/88.49 → floor 87/77/85/88
      //   2026-05-08 post-profile-error-paths: 86.98/77.01/85.07/88.42 → floor 86/77/85/88
      //   2026-05-07 post-opfs-projects-edge-cases: 86.88/76.89/85.01/88.35 → floor 86/76/85/88
      //   2026-05-07 post-wysiwyg-edge-paths: 86.94/76.96/85.07/88.38 → floor 86/76/85/88
      //   2026-05-07 post-persistence-error-paths: 86.74/76.75/84.95/88.20 → floor 86/76/84/87
      //   2026-05-07 post-canvas-drop-callback: 86.64/76.71/84.95/88.09 → floor 86/76/84/87
      //   2026-05-07 post-code-editor-keybindings: 86.48/76.61/84.77/87.94 → floor 86/76/84/87
      //   2026-05-07 post-live-preview-error-paths: 86.38/76.57/84.59/87.83 → floor 86/76/84/87
      //   2026-05-07 post-pyodide-existing-tag-branches: 86.16/76.50/84.17/87.65 → floor 86/76/84/87
      //   2026-05-07 post-lesson-completion-modal: 86.08/76.41/84.17/87.56 → floor 86/76/84/87
      //   2026-05-07 post-home-error-paths: 85.80/76.17/83.87/87.26 → floor 85/76/83/87
      //   2026-05-07 post-console-logger-categories: 85.56/76.06/83.63/86.99 → floor 85/76/83/86
      //   2026-05-07 post-asset-browser-multi-filter: 85.18/76.06/82.19/86.59 → floor 85/76/82/86
      //   2026-05-07 post-opfs-migration-shape-skips: 84.90/75.34/81.58/86.30 → floor 84/75/81/86
      //   2026-05-07 post-simulator-flush-shapes: 84.58/75.13/81.52/85.96 → floor 84/75/81/85
      //   2026-05-07 post-global-handler-event-branches: 84.21/74.90/81.52/85.56 → floor 84/74/81/85
      //   2026-05-07 post-interactive-canvas-modal: 83.86/74.62/81.22/85.17 → floor 83/74/81/85
      //   2026-05-07 post-projects-opfs-branches: 83.36/73.91/80.44/84.64 → floor 83/73/80/84
      //   2026-05-07 post-canvas-render-effect: 82.88/73.77/80.20/84.15 → floor 82/73/80/84
      //   2026-05-07 post-wysiwyg-callbacks: 82.21/73.33/79.90/83.46 → floor 82/73/79/83
      //   2026-05-07 post-lesson-page-misc: 81.89/72.91/79.24/83.16 → floor 81/72/79/83
      //   2026-05-07 post-presence-lesson-choices: 81.82/72.84/79.24/83.08 → floor 81/72/79/83
      //   2026-05-07 post-play-page-error-paths: 81.76/72.87/79.12/83.03 → floor 81/72/79/83
      //   2026-05-07 post-simulator-create-env: 81.62/72.57/78.98/82.89 → floor 81/72/78/82
      //   2026-05-07 post-floating-feedback-render: 73.95/64.49/69.89/74.76 → floor 73/63/69/74
      //   2026-05-07 post-live-preview-extras: 73.82/64.15/69.71/74.65 → floor 73/63/69/74
      //   2026-05-07 post-pixel-menu-extras: 73.67/63.87/69.53/74.51 → floor 73/62/69/74
      //   2026-05-07 post-dialogue-engine-views: 73.59/63.84/69.47/74.45 → floor 73/62/69/74
      //   2026-05-07 post-wizard-layout-manager: 73.43/63.73/68.99/74.34 → floor 73/62/68/74
      //   2026-05-07 post-wysiwyg-smoke: 73.10/63.01/68.69/73.98 → floor 73/62/68/73
      //   2026-05-07 post-profile-page-extras: 72.04/61.69/67.67/72.99 → floor 72/60/67/72
      //   2026-05-07 post-wizard-option-handler: 71.77/61.30/67.37/72.70 → floor 71/60/67/72
      //   2026-05-07 post-wizard-code-runner+avatar: 71.05/59.82/66.76/71.95 → floor 71/58/66/71
      //   2026-05-07 post-game-progress-sidebar: 70.70/59.31/66.32/71.56 → floor 70/58/66/71
      //   2026-05-07 post-lessons-happy-path: 69.90/57.71/65.84/70.85 → floor 69/57/65/70
      //   2026-05-07 post-canvas: 69.57/57.04/65.35/70.53 → floor 69/57/65/70
      //   2026-05-07 post-pixel-menu: 68.92/56.32/64.99/69.87 → floor 68/56/64/69
      //   2026-05-07 post-pixel-presence: 68.44/55.79/64.22/69.45 → floor 68/55/64/69
      //   2026-05-07 post-pixel-minimized: 67.38/54.68/63.38/68.30 → floor 67/54/63/68
      //   2026-05-07 post-pixel-minimize-animation: 66.43/53.89/62.23/67.28 → floor 66/53/62/67
      //   2026-05-07 post-palette: 66.18/53.73/61.81/67.01 → floor 66/53/61/67
      //   2026-05-07 post-code-panel-feedback: 65.86/53.38/61.26/66.67 → floor 65/53/61/66
      //   2026-05-07 post-error-boundary: 65.44/53.19/60.84/66.21 → floor 65/53/60/66
      //   2026-05-07 post-properties-runner-header: 64.83/52.24/60.24/65.54 → floor 64/52/60/65
      //   2026-05-07 post-tts-subscribe: 64.63/51.85/59.69/65.35 → floor 64/51/59/65
      //   2026-05-07 post-error-handler-execute: 64.53/51.69/59.57/65.27 → floor 64/50/58/65
      //   2026-05-07 post-simulator-environment: 64.01/50.81/59.57/64.75 → floor 63/49/58/64
      //   2026-05-07 post-error-handler-pyodide: 62.45/49.25/56.79/63.16 → floor 62/48/56/63
      //   2026-05-07 post-assets-manager-preload: 61.49/48.35/56.61/62.14 → floor 61/47/56/62
      //   2026-05-07 post-simulator-rendering: 60.76/47.79/55.95/61.35 → floor 58/45/55/60
      //   2026-05-07 post-simulator-helpers: 59.99/47.05/55.40/60.57 → floor 57/44/54/59
      //   2026-05-07 post-private-mode-explicit: 59.61/46.54/55.22/60.17 → floor 57/44/54/59
      //   2026-05-07 post-broadcast-residuals: 59.61/46.54/55.22/60.17 → floor 57/44/54/59
      //   2026-05-07 post-worker-runner-residuals: 59.53/46.45/55.16/60.13 → floor 57/44/54/59
      //   2026-05-07 post-persistence-residuals: 59.44/46.43/55.16/60.03 → floor 57/44/54/59
      //   2026-05-07 post-pygame-default-fallbacks: 59.43/46.33/55.16/60.03 → floor 57/44/54/59
      //   2026-05-07 post-pyodide-singleton-residuals: 59.43/46.10/55.16/60.03 → floor 57/44/54/59
      //   2026-05-07 post-net-retry-convenience: 59.40/46.08/55.16/60.00 → floor 57/44/54/59
      //   2026-05-07 post-collectible-branches: 59.34/46.08/54.92/59.94 → floor 57/44/53/58
      //   2026-05-07 post-curated-themes-delete: 59.21/45.89/54.92/59.80 → floor 57/44/53/58
      //   2026-05-07 post-opfs-projects-unit: 58.99/45.75/54.69/59.61 → floor 57/44/53/58
      //   2026-05-07 post-client-defensive: 58.92/45.75/54.57/59.53 → floor 57/44/53/58
      //   2026-05-07 post-shadcn-bootstrap-exclude: 58.75/45.61/54.45/59.34 → floor 57/44/53/58
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
        statements: 87,
        branches: 77,
        functions: 85,
        lines: 88,
      },
    },
  },
});
