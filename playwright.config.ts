import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'test-results/test-results.json' }], ['line']],
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    // Increase timeouts to allow for complex interactions
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    // Desktop Testing (1920x1080) - Standard desktop resolution
    {
      name: 'desktop-chromium',
      testIgnore: /production-shape\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        hasTouch: false,
      },
    },
    {
      name: 'desktop-firefox',
      testIgnore: /production-shape\.spec\.ts$/,
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        hasTouch: false,
      },
    },

    // Tablet Testing (768x1024) - Standard tablet resolution
    {
      name: 'tablet-portrait',
      testIgnore: /production-shape\.spec\.ts$/,
      use: {
        ...devices['iPad'],
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },
    {
      name: 'tablet-landscape',
      testIgnore: /production-shape\.spec\.ts$/,
      use: {
        ...devices['iPad'],
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
      },
    },

    // Mobile Portrait Testing (375x667) - iPhone 8 dimensions
    {
      name: 'mobile-portrait',
      testIgnore: /production-shape\.spec\.ts$/,
      use: {
        ...devices['iPhone 8'],
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
      },
    },

    // Mobile Landscape Testing (667x375) - iPhone 8 landscape
    {
      name: 'mobile-landscape',
      testIgnore: /production-shape\.spec\.ts$/,
      use: {
        ...devices['iPhone 8'],
        viewport: { width: 667, height: 375 },
        hasTouch: true,
        isMobile: true,
      },
    },

    // Additional mobile testing for modern devices
    {
      name: 'mobile-modern',
      testIgnore: /production-shape\.spec\.ts$/,
      use: {
        ...devices['iPhone 12'],
        hasTouch: true,
        isMobile: true,
      },
    },

    // Production-shape build (BASE_URL=/professor-pixel/) — exercises the
    // exact bundle GitHub Pages serves. Runs only the focused
    // production-shape suite; legacy dev-mode specs use the dev server.
    // Three viewports cover the layouts the responsive code paths gate on
    // (mobile <768, tablet 768-1024, desktop >1024). The fold case is
    // covered by the Viewport Segments API path in use-device-type.ts —
    // exercised at runtime via emulator media-query, no separate project.
    {
      name: 'production-shape-desktop',
      testMatch: /production-shape\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4173',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'production-shape-tablet',
      testMatch: /production-shape\.spec\.ts$/,
      use: {
        ...devices['iPad'],
        baseURL: 'http://localhost:4173',
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },
    {
      name: 'production-shape-mobile',
      testMatch: /production-shape\.spec\.ts$/,
      use: {
        ...devices['iPhone 12'],
        baseURL: 'http://localhost:4173',
        hasTouch: true,
        isMobile: true,
      },
    },
  ],

  // Two web servers: dev for legacy specs, preview-with-base for the
  // production-shape spec. Playwright spins both up if any matching
  // tests need them; reuseExistingServer keeps local iteration fast.
  webServer: [
    {
      command: 'pnpm dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      // Build into a dedicated outDir (`dist-preview-pages/`) so a stale
      // `dist/` from `pnpm build` (which uses base=/) can't silently get
      // served when reuseExistingServer keeps :4173 alive. Re-running the
      // suite always either rebuilds into the namespaced dir or reuses
      // the still-correct existing server.
      command:
        'pnpm exec vite build --base=/professor-pixel/ --outDir dist-preview-pages && pnpm exec vite preview --base=/professor-pixel/ --outDir dist-preview-pages --port 4173 --strictPort',
      url: 'http://localhost:4173/professor-pixel/',
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
    },
  ],

  // Global setup for error detection
  globalSetup: './tests/e2e/global-setup.ts',

  // Test output directories
  outputDir: 'test-results/',
});
