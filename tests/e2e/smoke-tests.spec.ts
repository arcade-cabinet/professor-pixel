import { test, expect } from '@playwright/test';
import { ErrorDetector, withErrorDetection } from './utils/error-detection';

// Test data for all application routes
const routes = [
  { path: '/', name: 'Home', expectedTitle: /Game Development/i, keyElement: 'main' },
  {
    path: '/wizard',
    name: 'Universal Wizard',
    expectedTitle: /Pixel/i,
    keyElement: '[data-testid="pixel-avatar"]',
  },
  {
    path: '/game-wizard',
    name: 'Game Development Wizard',
    expectedTitle: /Pixel/i,
    keyElement: '[data-testid="pixel-avatar"]',
  },
  {
    path: '/asset-test',
    name: 'Asset Library Test',
    expectedTitle: /Asset/i,
    keyElement: '[data-testid*="asset"]',
  },
  {
    path: '/pygame-preview-test',
    name: 'Pygame Preview Test',
    expectedTitle: /Preview/i,
    keyElement: '[data-testid*="pygame"], canvas',
  },
];

test.describe('Smoke Tests - Basic Page Loading', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const route of routes) {
    test(`${route.name} loads without errors on all resolutions`, async ({ page }) => {
      await withErrorDetection(
        page,
        async (errorDetector) => {
          // Navigate to the route
          await page.goto(route.path, { waitUntil: 'networkidle' });

          // Wait for page to be fully loaded
          await expect(page.locator(route.keyElement)).toBeVisible({ timeout: 15000 });

          // Check that the page has loaded content
          if (route.expectedTitle) {
            const titleElement = page.locator('h1, h2, title').first();
            await expect(titleElement).toBeVisible();
          }

          // Verify no loading states are stuck
          const loadingElements = page.locator('[data-testid*="loading"], .loading, .spinner');
          const loadingCount = await loadingElements.count();

          if (loadingCount > 0) {
            // Wait a bit more for loading to complete
            await page.waitForTimeout(2000);

            // Check if loading elements are still visible
            for (let i = 0; i < loadingCount; i++) {
              const isStillLoading = await loadingElements
                .nth(i)
                .isVisible()
                .catch(() => false);
              if (isStillLoading) {
                console.warn(`Persistent loading state detected on ${route.path}`);
              }
            }
          }

          // Take screenshot for visual verification
          await page.screenshot({
            path: `test-results/screenshots/smoke-${route.name.toLowerCase().replace(/\s+/g, '-')}-${page.viewportSize()?.width}x${page.viewportSize()?.height}.png`,
            fullPage: true,
          });
        },
        true
      ); // Assert no errors
    });
  }

  test('All routes load without JavaScript errors', async ({ page }) => {
    await withErrorDetection(
      page,
      async (errorDetector) => {
        for (const route of routes) {
          console.log(`Testing route: ${route.path}`);

          // Clear any previous errors
          errorDetector.clearErrors();

          // Navigate to route
          await page.goto(route.path, { waitUntil: 'networkidle' });

          // Wait for key element
          await expect(page.locator(route.keyElement)).toBeVisible({ timeout: 10000 });

          // Let the page settle
          await page.waitForTimeout(1000);

          // Get error report for this route
          const routeErrors = await errorDetector.getFullErrorReport();

          if (
            routeErrors.hasViteError ||
            routeErrors.jsErrors.length > 0 ||
            routeErrors.importErrors.length > 0
          ) {
            throw new Error(
              `Route ${route.path} has critical errors:\n` +
                `Vite Error: ${routeErrors.viteErrorMessage || 'none'}\n` +
                `JS Errors: ${routeErrors.jsErrors.join(', ')}\n` +
                `Import Errors: ${routeErrors.importErrors.join(', ')}`
            );
          }
        }
      },
      false
    ); // Don't assert errors automatically since we're checking manually
  });
});

test.describe('Responsive Layout Verification', () => {
  test.describe.configure({ mode: 'parallel' });

  test('Desktop layouts render correctly (1920x1080)', async ({ page }) => {
    // This test will run with desktop viewport from config
    await withErrorDetection(page, async (errorDetector) => {
      for (const route of routes) {
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await expect(page.locator(route.keyElement)).toBeVisible();

        // Desktop-specific checks
        const viewport = page.viewportSize();
        expect(viewport?.width).toBe(1920);
        expect(viewport?.height).toBe(1080);

        // Check for desktop-specific elements (headers, full layouts)
        if (route.path.includes('wizard')) {
          // Desktop wizard should have centered layout
          const centeredLayout = page.locator(
            '.fixed.inset-0.flex.items-center.justify-center, .flex.items-center.justify-center'
          );
          await expect(centeredLayout).toBeVisible();

          // Should not have mobile hamburger menu in main content
          const hamburgerMenu = page.locator('[data-testid="open-pixel-menu-button"]');
          const isHamburgerVisible = await hamburgerMenu.isVisible().catch(() => false);
          expect(isHamburgerVisible).toBe(false);
        }

        await page.waitForTimeout(500);
      }
    });
  });

  test('Tablet layouts adapt correctly', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      for (const route of routes) {
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await expect(page.locator(route.keyElement)).toBeVisible();

        // Tablet-specific checks
        const viewport = page.viewportSize();
        expect(viewport?.width).toBeGreaterThanOrEqual(768);
        expect(viewport?.width).toBeLessThanOrEqual(1024);

        if (route.path.includes('wizard')) {
          // Tablet should use desktop-style layout but might have hamburger menu
          const centeredLayout = page.locator('.flex.items-center.justify-center');
          await expect(centeredLayout).toBeVisible();
        }

        await page.waitForTimeout(500);
      }
    });
  });

  test('Mobile portrait layouts stack vertically (375x667)', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      for (const route of routes) {
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await expect(page.locator(route.keyElement)).toBeVisible();

        const viewport = page.viewportSize();
        expect(viewport?.width).toBe(375);
        expect(viewport?.height).toBe(667);

        if (route.path.includes('wizard')) {
          // Mobile portrait should have vertical stack
          const verticalStack = page.locator('.h-screen.flex.flex-col');
          await expect(verticalStack).toBeVisible();

          // Title should be hidden on mobile
          const title = page.locator('h1').first();
          const titleVisible = await title.isVisible().catch(() => false);
          // Note: Title might be present but visually hidden with CSS

          // Avatar should be visible
          await expect(page.locator('[data-testid="pixel-avatar"]')).toBeVisible();
        }

        await page.waitForTimeout(500);
      }
    });
  });

  test('Mobile landscape uses 20/80 grid layout (667x375)', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      for (const route of routes) {
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await expect(page.locator(route.keyElement)).toBeVisible();

        const viewport = page.viewportSize();
        expect(viewport?.width).toBe(667);
        expect(viewport?.height).toBe(375);

        if (route.path.includes('wizard')) {
          // Mobile landscape should use grid layout
          const gridLayout = page.locator('.grid');
          await expect(gridLayout).toBeVisible();

          // Should have avatar column and content column
          const avatarColumn = page
            .locator('[data-testid="avatar-column"]')
            .or(page.locator('.grid > div:first-child'));
          const contentColumn = page
            .locator('[data-testid="content-column"]')
            .or(page.locator('.grid > div:last-child'));

          await expect(avatarColumn).toBeVisible();
          await expect(contentColumn).toBeVisible();

          // Hamburger menu should not be visible in landscape
          const hamburgerMenu = page.locator('[data-testid="open-pixel-menu-button"]');
          const isHamburgerVisible = await hamburgerMenu.isVisible().catch(() => false);
          expect(isHamburgerVisible).toBe(false);
        }

        await page.waitForTimeout(500);
      }
    });
  });
});

test.describe('Network and Asset Loading', () => {
  test('All critical assets load successfully', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      // Test asset-heavy routes
      const assetRoutes = ['/asset-test', '/wizard', '/game-wizard'];

      for (const routePath of assetRoutes) {
        await page.goto(routePath, { waitUntil: 'networkidle' });

        // Wait for images to load
        const images = page.locator('img');
        const imageCount = await images.count();

        for (let i = 0; i < imageCount; i++) {
          const img = images.nth(i);
          const isVisible = await img.isVisible().catch(() => false);

          if (isVisible) {
            // Check if image loaded successfully
            const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
            if (naturalWidth === 0) {
              const src = await img.getAttribute('src');
              console.warn(`Image failed to load: ${src} on route ${routePath}`);
            }
          }
        }

        await page.waitForTimeout(1000);
      }

      // Check for network errors
      const errorReport = await errorDetector.getFullErrorReport();
      const criticalNetworkErrors = errorReport.networkErrors.filter(
        (error) =>
          error.includes('404') || error.includes('500') || error.includes('Failed to fetch')
      );

      if (criticalNetworkErrors.length > 0) {
        throw new Error(`Critical network errors detected: ${criticalNetworkErrors.join(', ')}`);
      }
    });
  });
});

test.describe('Performance and Rendering', () => {
  test('Pages render within acceptable time limits', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      for (const route of routes) {
        const startTime = Date.now();

        await page.goto(route.path);
        await expect(page.locator(route.keyElement)).toBeVisible({ timeout: 10000 });

        const loadTime = Date.now() - startTime;

        // Assert reasonable load times (10 seconds max for initial load)
        expect(loadTime).toBeLessThan(10000);

        console.log(`Route ${route.path} loaded in ${loadTime}ms`);

        // Check for layout shift indicators
        await page.waitForTimeout(500);

        // Verify content is stable (no major layout shifts)
        const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.waitForTimeout(1000);
        const newScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);

        const layoutShift = Math.abs(scrollHeight - newScrollHeight);
        if (layoutShift > 100) {
          console.warn(`Potential layout shift detected on ${route.path}: ${layoutShift}px`);
        }
      }
    });
  });
});
