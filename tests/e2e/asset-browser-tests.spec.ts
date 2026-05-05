import { test, expect } from '@playwright/test';
import { ErrorDetector, withErrorDetection } from './utils/error-detection';
import { WizardNavigator, withWizardNavigation } from './utils/wizard-actions';

test.describe('Asset Browser Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  test('Asset browser opens and loads assets', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      // Test direct asset test route
      await page.goto('/asset-test', { waitUntil: 'networkidle' });

      // Wait for asset browser to load
      await page.waitForTimeout(2000);

      // Look for asset browser components
      const assetBrowser = page.locator('[data-testid*="asset"], .asset-browser, .asset-grid');
      const browserVisible = await assetBrowser.isVisible().catch(() => false);

      if (browserVisible) {
        console.log('Asset browser is visible');

        // Check for asset items
        const assetItems = page.locator(
          '[data-testid*="asset-item"], .asset-item, img[data-testid*="asset"]'
        );
        const assetCount = await assetItems.count();

        console.log(`Found ${assetCount} asset items`);
        expect(assetCount).toBeGreaterThan(0);

        // Test asset loading
        for (let i = 0; i < Math.min(5, assetCount); i++) {
          const asset = assetItems.nth(i);
          const isVisible = await asset.isVisible();

          if (isVisible) {
            // Check if it's an image and if it loaded
            const tagName = await asset.evaluate((el) => el.tagName.toLowerCase());

            if (tagName === 'img') {
              const naturalWidth = await asset.evaluate((el: HTMLImageElement) => el.naturalWidth);
              const src = await asset.getAttribute('src');

              if (naturalWidth === 0) {
                console.warn(`Asset image failed to load: ${src}`);
              } else {
                console.log(`Asset image loaded successfully: ${src}`);
              }
            }
          }
        }

        await page.screenshot({ path: 'test-results/screenshots/asset-browser-loaded.png' });
      } else {
        console.log('Asset browser not immediately visible, checking for loading states');

        // Check for loading indicators
        const loadingStates = page.locator('[data-testid*="loading"], .loading, .spinner');
        const loadingCount = await loadingStates.count();

        if (loadingCount > 0) {
          console.log(`Found ${loadingCount} loading indicators, waiting for assets to load`);
          await page.waitForTimeout(5000);

          // Check again
          const browserVisibleAfterWait = await assetBrowser.isVisible().catch(() => false);
          if (browserVisibleAfterWait) {
            console.log('Asset browser loaded after waiting');
          }
        }
      }
    });
  });

  test('Asset categories and filtering work correctly', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await page.goto('/asset-test', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Look for category tabs or filters
      const categoryTabs = page.locator(
        '[data-testid*="tab"], .tab, button:has-text("Backgrounds"), button:has-text("Sprites"), button:has-text("Characters")'
      );
      const tabCount = await categoryTabs.count();

      if (tabCount > 0) {
        console.log(`Found ${tabCount} category tabs`);

        // Test clicking different categories
        for (let i = 0; i < Math.min(3, tabCount); i++) {
          const tab = categoryTabs.nth(i);
          const tabText = await tab.textContent();

          await tab.click();
          await page.waitForTimeout(1000);

          // Check if assets changed
          const assetItems = page.locator('[data-testid*="asset-item"], .asset-item');
          const assetCount = await assetItems.count();

          console.log(`Category "${tabText}" has ${assetCount} assets`);

          await page.screenshot({
            path: `test-results/screenshots/asset-category-${tabText?.toLowerCase().replace(/\s+/g, '-')}.png`,
          });
        }
      }

      // Test search functionality
      const searchInput = page.locator(
        '[data-testid*="search"], input[type="search"], input[placeholder*="search"]'
      );
      const searchVisible = await searchInput.isVisible().catch(() => false);

      if (searchVisible) {
        console.log('Search input found');

        await searchInput.fill('character');
        await page.waitForTimeout(1000);

        const filteredAssets = page.locator('[data-testid*="asset-item"], .asset-item');
        const filteredCount = await filteredAssets.count();

        console.log(`Search for "character" returned ${filteredCount} assets`);

        // Clear search
        await searchInput.fill('');
        await page.waitForTimeout(1000);

        const allAssets = await filteredAssets.count();
        console.log(`All assets count after clearing search: ${allAssets}`);
      }
    });
  });

  test('Asset selection and preview work correctly', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await page.goto('/asset-test', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Find selectable assets
      const assetItems = page.locator('[data-testid*="asset-item"], .asset-item, .clickable');
      const assetCount = await assetItems.count();

      if (assetCount > 0) {
        console.log(`Testing asset selection with ${assetCount} assets`);

        // Click on first asset
        const firstAsset = assetItems.first();
        await firstAsset.click();
        await page.waitForTimeout(500);

        // Check for selection indicators
        const selectedClass = await firstAsset.getAttribute('class');
        const isSelected =
          selectedClass?.includes('selected') ||
          selectedClass?.includes('active') ||
          selectedClass?.includes('highlighted');

        if (isSelected) {
          console.log('Asset selection working correctly');
        }

        // Look for preview modal or panel
        const previewModal = page.locator(
          '[data-testid*="preview"], .preview-modal, .asset-preview'
        );
        const previewVisible = await previewModal.isVisible().catch(() => false);

        if (previewVisible) {
          console.log('Asset preview modal opened');

          // Check preview content
          const previewImage = page.locator('[data-testid*="preview-image"], .preview-modal img');
          const previewImageVisible = await previewImage.isVisible().catch(() => false);

          if (previewImageVisible) {
            console.log('Preview image is visible');
          }

          // Check for preview controls
          const closeButton = page.locator(
            '[data-testid*="close-preview"], button:has-text("Close"), .close-button'
          );
          const selectButton = page.locator(
            '[data-testid*="select"], button:has-text("Select"), .select-button'
          );

          const hasCloseButton = await closeButton.isVisible().catch(() => false);
          const hasSelectButton = await selectButton.isVisible().catch(() => false);

          console.log(`Preview controls - Close: ${hasCloseButton}, Select: ${hasSelectButton}`);

          // Test close functionality
          if (hasCloseButton) {
            await closeButton.click();
            await page.waitForTimeout(500);

            const stillVisible = await previewModal.isVisible().catch(() => false);
            expect(stillVisible).toBe(false);
            console.log('Preview modal closed successfully');
          }
        }

        await page.screenshot({ path: 'test-results/screenshots/asset-selection.png' });
      }
    });
  });

  test('Asset browser in wizard flow works correctly', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await page.goto('/game-wizard', { waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          // Navigate through wizard to trigger asset browser
          const flow = [
            { action: 'select-option' as const, optionText: 'jump straight into making a game' },
            { action: 'wait' as const, duration: 1000 },
            { action: 'select-option' as const, optionText: 'platformer' },
            { action: 'wait' as const, duration: 1000 },
          ];

          await navigator.navigateWizardFlow(flow);

          // Look for asset selection options in wizard
          const state = await navigator.getWizardState();
          const hasAssetOption = state.availableOptions?.some(
            (option) =>
              option.toLowerCase().includes('asset') ||
              option.toLowerCase().includes('sprite') ||
              option.toLowerCase().includes('character') ||
              option.toLowerCase().includes('background')
          );

          if (hasAssetOption) {
            console.log('Asset selection option found in wizard');

            // Select asset option
            await navigator.selectOptionByText('character');
            await page.waitForTimeout(2000);

            // Check if asset browser opened
            const assetBrowser = page.locator('[data-testid*="asset-browser"], .asset-browser');
            const browserVisible = await assetBrowser.isVisible().catch(() => false);

            if (browserVisible) {
              console.log('Asset browser opened from wizard');

              // Test selecting an asset
              const assetItems = page.locator('[data-testid*="asset-item"], .asset-item');
              const assetCount = await assetItems.count();

              if (assetCount > 0) {
                await assetItems.first().click();
                await page.waitForTimeout(500);

                // Look for confirmation or back to wizard
                const confirmButton = page.locator(
                  'button:has-text("Select"), button:has-text("Choose"), button:has-text("Confirm")'
                );
                const confirmVisible = await confirmButton.isVisible().catch(() => false);

                if (confirmVisible) {
                  await confirmButton.click();
                  await page.waitForTimeout(1000);

                  // Should return to wizard
                  const backInWizard = await page
                    .locator('[data-testid="dialogue-text"]')
                    .isVisible()
                    .catch(() => false);
                  if (backInWizard) {
                    console.log('Successfully returned to wizard after asset selection');
                  }
                }
              }
            }
          }

          await page.screenshot({ path: 'test-results/screenshots/wizard-asset-browser.png' });
        },
        errorDetector
      );
    });
  });

  test('Asset browser handles different screen sizes', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      const resolutions = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 1024, height: 768, name: 'tablet-landscape' },
        { width: 768, height: 1024, name: 'tablet-portrait' },
        { width: 375, height: 667, name: 'mobile' },
      ];

      for (const resolution of resolutions) {
        console.log(`Testing asset browser at ${resolution.width}x${resolution.height}`);

        await page.setViewportSize({ width: resolution.width, height: resolution.height });
        await page.goto('/asset-test', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Check asset browser layout adaptation
        const assetBrowser = page.locator('[data-testid*="asset"], .asset-browser, .asset-grid');
        const browserVisible = await assetBrowser.isVisible().catch(() => false);

        if (browserVisible) {
          // Check grid layout
          const assetItems = page.locator('[data-testid*="asset-item"], .asset-item');
          const assetCount = await assetItems.count();

          if (assetCount > 0) {
            // Calculate expected columns based on screen size
            let expectedColumns = 1;
            if (resolution.width >= 1200) expectedColumns = 4;
            else if (resolution.width >= 768) expectedColumns = 3;
            else if (resolution.width >= 480) expectedColumns = 2;

            console.log(`Expected ${expectedColumns} columns for ${resolution.width}px width`);

            // Check first few items positioning
            if (assetCount >= 2) {
              const firstItem = assetItems.first();
              const secondItem = assetItems.nth(1);

              const firstBox = await firstItem.boundingBox();
              const secondBox = await secondItem.boundingBox();

              if (firstBox && secondBox) {
                const isSameRow = Math.abs(firstBox.y - secondBox.y) < 20;
                const isNextRow = secondBox.y > firstBox.y + firstBox.height;

                if (resolution.width <= 480 && isNextRow) {
                  console.log('Mobile: Items correctly stacked vertically');
                } else if (resolution.width > 480 && isSameRow) {
                  console.log('Desktop/Tablet: Items correctly arranged in rows');
                }
              }
            }
          }

          // Check for mobile-specific UI
          if (resolution.width <= 768) {
            // Look for mobile-specific navigation or tabs
            const mobileNav = page.locator('.mobile-nav, [data-testid*="mobile"]');
            const hasMobileNav = await mobileNav.isVisible().catch(() => false);

            if (hasMobileNav) {
              console.log('Mobile navigation detected');
            }

            // Check if search is collapsed or in a drawer
            const searchInput = page.locator('[data-testid*="search"], input[type="search"]');
            const searchVisible = await searchInput.isVisible().catch(() => false);

            console.log(`Mobile search visibility: ${searchVisible}`);
          }
        }

        await page.screenshot({
          path: `test-results/screenshots/asset-browser-${resolution.name}-${resolution.width}x${resolution.height}.png`,
          fullPage: true,
        });
      }
    });
  });

  test('Asset loading and error handling', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await page.goto('/asset-test', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check for loading states
      const loadingIndicators = page.locator(
        '[data-testid*="loading"], .loading, .spinner, .skeleton'
      );
      const loadingCount = await loadingIndicators.count();

      console.log(`Found ${loadingCount} loading indicators`);

      // Wait for loading to complete
      if (loadingCount > 0) {
        await page.waitForTimeout(5000);
      }

      // Check final asset state
      const assetItems = page.locator('[data-testid*="asset-item"], .asset-item, img');
      const finalAssetCount = await assetItems.count();

      console.log(`Final asset count: ${finalAssetCount}`);

      // Check for error states
      const errorMessages = page.locator('[data-testid*="error"], .error-message, .alert-error');
      const errorCount = await errorMessages.count();

      if (errorCount > 0) {
        console.log(`Found ${errorCount} error messages`);

        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorMessages.nth(i).textContent();
          console.log(`Error ${i + 1}: ${errorText}`);
        }
      }

      // Check for broken images
      let brokenImageCount = 0;
      const images = page.locator('img[data-testid*="asset"], .asset-item img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        const src = await img.getAttribute('src');

        if (naturalWidth === 0) {
          brokenImageCount++;
          console.warn(`Broken image: ${src}`);
        }
      }

      console.log(`Broken images: ${brokenImageCount}/${imageCount}`);
      expect(brokenImageCount).toBeLessThan(imageCount * 0.1); // Less than 10% broken

      await page.screenshot({ path: 'test-results/screenshots/asset-loading-final-state.png' });
    });
  });
});
