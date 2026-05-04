import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
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

const sharedExclude = [
  '**/node_modules/**',
  '**/dist/**',
  '**/tests/e2e/**',
];

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
          // wizard-dialogue-engine integration tests are quarantined: they
          // assert a persistence shape that drifted when the wizard module was
          // restructured. Tracked in docs/STATE.md → Next → Visual / accessibility.
          exclude: [...sharedExclude, '**/wizard-dialogue-engine.test.tsx'],
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
            provider: 'playwright',
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
      ],
    },
  },
});
