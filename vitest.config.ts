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
      exclude: ['**/index.ts', '**/*.d.ts', 'app/**/*.stories.tsx'],
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
      // Today's snapshot (2026-05-06, post-#66 + use-toast tests):
      // statements 34.83%, branches 27.99%, functions 29.05%, lines 34.78%.
      // The thresholds below sit a hair below those numbers (rounded down
      // to the nearest integer minus 1 for noise tolerance) so any
      // regression fails CI. Per the ratchet doctrine: any PR that moves
      // these numbers UP raises the matching threshold in the same PR.
      //
      // Earlier snapshots:
      //   2026-05-06 post-#66: 34.54/27.69/28.52/34.5  → floor 33/26/27/33
      //   2026-05-06 post-#59: 33.98/27.21/27.79/33.92 → floor 32/26/26/32
      //   2026-05-06 post-#58: 33.37/26.91/27.11/33.33 → floor 32/25/26/32
      //   2026-05-06 post-#54: 32.6/26.14/26.31/32.54  → floor 31/25/25/31
      //   2026-05-06 post-#41: 32.11/25.68/25.73/32.02 → floor 31/24/24/31
      //   2026-05-06 post-#39: 31.68/25.20/25.26/31.66 → floor 30/24/24/30
      //   2026-05-05 post-#30: 27.71/22.42/22.28/27.71 → floor 26/21/21/26
      thresholds: {
        statements: 33,
        branches: 26,
        functions: 28,
        lines: 33,
      },
    },
  },
});
