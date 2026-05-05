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
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        hasTouch: false,
      },
    },
    {
      name: 'desktop-firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        hasTouch: false,
      },
    },

    // Tablet Testing (768x1024) - Standard tablet resolution
    {
      name: 'tablet-portrait',
      use: {
        ...devices['iPad'],
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },
    {
      name: 'tablet-landscape',
      use: {
        ...devices['iPad'],
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
      },
    },

    // Mobile Portrait Testing (375x667) - iPhone 8 dimensions
    {
      name: 'mobile-portrait',
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
      use: {
        ...devices['iPhone 12'],
        hasTouch: true,
        isMobile: true,
      },
    },
  ],

  // Development server configuration
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes to start
  },

  // Global setup for error detection
  globalSetup: './tests/e2e/global-setup.ts',

  // Test output directories
  outputDir: 'test-results/',
});
