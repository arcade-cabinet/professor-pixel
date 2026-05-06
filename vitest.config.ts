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
      // Today's snapshot (2026-05-06, post-#39):
      // statements 31.68%, branches 25.20%, functions 25.26%, lines 31.66%.
      // The thresholds below sit a hair below those numbers (rounded down
      // to the nearest integer minus 1 for noise tolerance) so any
      // regression fails CI. Per the ratchet doctrine: any PR that moves
      // these numbers UP raises the matching threshold in the same PR.
      //
      // Earlier snapshots:
      //   2026-05-05 post-#30: statements 27.71, branches 22.42,
      //     functions 22.28, lines 27.71. Ratcheted from 26/21/21/26.
      thresholds: {
        statements: 30,
        branches: 24,
        functions: 24,
        lines: 30,
      },
    },
  },
});
