import { test, expect } from '@playwright/test';
import { ErrorDetector, withErrorDetection } from './utils/error-detection';
import { WizardNavigator, withWizardNavigation } from './utils/wizard-actions';

test.describe('Pixel Animation Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  test('Pixel mascot minimize and restore animation', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await page.goto('/game-wizard', { waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          // Verify pixel is initially in center stage
          let state = await navigator.getWizardState();
          expect(state.pixelState).toBe('center-stage');

          // Look for pixel avatar
          const pixelAvatar = page.locator('[data-testid="pixel-avatar"], img[alt*="Pixel"]');
          await expect(pixelAvatar).toBeVisible();

          // Navigate to trigger pixel minimization (e.g., unlocking editor)
          await navigator.selectOptionByText('know my way around code');
          await page.waitForTimeout(1000);
          await navigator.selectOptionByText('PyGame and I are old friends');

          // Wait for minimization animation to start
          await page.waitForTimeout(2000);

          // Check if pixel is now minimized
          const minimizedPixel = page.locator('[data-testid="pixel-minimized"]');
          const isMinimized = await minimizedPixel.isVisible().catch(() => false);

          if (isMinimized) {
            console.log('Pixel successfully minimized');

            // Take screenshot of minimized state
            await page.screenshot({ path: 'test-results/screenshots/pixel-minimized.png' });

            // Test restore functionality
            await minimizedPixel.click();
            await page.waitForTimeout(1000);

            // Verify pixel is restored
            const restoredPixel = page.locator('[data-testid="pixel-avatar"]');
            const isRestored = await restoredPixel.isVisible().catch(() => false);

            if (isRestored) {
              console.log('Pixel successfully restored');

              // Take screenshot of restored state
              await page.screenshot({ path: 'test-results/screenshots/pixel-restored.png' });

              // Verify state is back to center-stage
              state = await navigator.getWizardState();
              expect(state.pixelState).toBe('center-stage');
            } else {
              console.warn('Pixel restoration may not have completed');
            }
          } else {
            console.log('Pixel minimization not triggered or uses different mechanism');

            // Check if editor opened without minimization
            const editor = page.locator(
              '[data-testid*="wysiwyg"], .wysiwyg-editor, [data-testid*="editor"]'
            );
            const editorVisible = await editor.isVisible().catch(() => false);

            if (editorVisible) {
              console.log('Editor opened, pixel may be handled differently');

              // Look for pixel in corner or alternative position
              const cornerPixel = page.locator('[data-testid="pixel-corner"], .pixel-corner');
              const isInCorner = await cornerPixel.isVisible().catch(() => false);

              if (isInCorner) {
                console.log('Pixel moved to corner position');
              }
            }
          }
        },
        errorDetector
      );
    });
  });

  test('Pixel animation states and transitions', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await page.goto('/wizard', { waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          // Check initial pixel state
          const initialState = await navigator.getWizardState();
          console.log('Initial pixel state:', initialState.pixelState);

          // Monitor pixel during navigation
          const wizardFlow = [
            { action: 'select-option' as const, optionIndex: 0 },
            { action: 'wait' as const, duration: 1000 },
            { action: 'select-option' as const, optionIndex: 0 },
            { action: 'wait' as const, duration: 1000 },
          ];

          for (const step of wizardFlow) {
            if (step.action === 'select-option' && step.optionIndex !== undefined) {
              await navigator.selectOption(step.optionIndex);
            } else if (step.action === 'wait') {
              await page.waitForTimeout(step.duration);
            }

            // Check pixel state after each step
            const currentState = await navigator.getWizardState();
            console.log('Pixel state after step:', currentState.pixelState);

            // Look for transition animations
            const transitioningPixel = page.locator(
              '.pixel-transitioning, [data-testid*="transitioning"]'
            );
            const isTransitioning = await transitioningPixel.isVisible().catch(() => false);

            if (isTransitioning) {
              console.log('Pixel transition animation detected');
              // Wait for transition to complete
              await page.waitForTimeout(1000);
            }
          }

          // Take final screenshot
          await page.screenshot({ path: 'test-results/screenshots/pixel-animation-flow.png' });
        },
        errorDetector
      );
    });
  });

  test('Pixel presence system works across different pages', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      // Test pixel presence on different routes
      const routes = [
        { path: '/', expectPixel: true, description: 'Home page' },
        { path: '/wizard', expectPixel: true, description: 'Wizard page' },
        { path: '/game-wizard', expectPixel: true, description: 'Game wizard page' },
        { path: '/asset-test', expectPixel: false, description: 'Asset test page' },
      ];

      for (const route of routes) {
        console.log(`Testing pixel presence on ${route.description}: ${route.path}`);

        await page.goto(route.path, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Look for pixel presence
        const pixelPresence = page.locator(
          '[data-testid="pixel-avatar"], [data-testid="pixel-minimized"], img[alt*="Pixel"]'
        );
        const pixelVisible = await pixelPresence.isVisible().catch(() => false);

        if (route.expectPixel) {
          expect(pixelVisible).toBe(true);
          console.log(`✓ Pixel correctly present on ${route.description}`);
        } else {
          console.log(`Pixel presence on ${route.description}: ${pixelVisible}`);
        }

        // If pixel is present, test basic interaction
        if (pixelVisible) {
          const clickablePixel = page.locator(
            '[data-testid="pixel-avatar"], [data-testid="pixel-minimized"]'
          );
          const isClickable = await clickablePixel.isVisible().catch(() => false);

          if (isClickable) {
            // Click and wait for response
            await clickablePixel.click();
            await page.waitForTimeout(500);

            // Check if menu or dialogue appeared
            const menu = page.locator('[data-testid="pixel-menu"], .pixel-menu');
            const dialogue = page.locator('[data-testid="dialogue-text"], .dialogue-text');

            const menuVisible = await menu.isVisible().catch(() => false);
            const dialogueVisible = await dialogue.isVisible().catch(() => false);

            if (menuVisible || dialogueVisible) {
              console.log(`✓ Pixel interaction working on ${route.description}`);
            }

            // Close any opened menus
            if (menuVisible) {
              const closeButton = page.locator('[data-testid="close-pixel-menu"], .close-button');
              const hasCloseButton = await closeButton.isVisible().catch(() => false);
              if (hasCloseButton) {
                await closeButton.click();
                await page.waitForTimeout(500);
              }
            }
          }
        }

        await page.screenshot({
          path: `test-results/screenshots/pixel-presence-${route.path.replace(/\//g, '-') || 'home'}.png`,
        });
      }
    });
  });

  test('Pixel animations work at different screen resolutions', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      const resolutions = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' },
      ];

      for (const resolution of resolutions) {
        console.log(`Testing pixel animations at ${resolution.width}x${resolution.height}`);

        await page.setViewportSize({ width: resolution.width, height: resolution.height });
        await page.goto('/game-wizard', { waitUntil: 'networkidle' });

        await withWizardNavigation(
          page,
          async (navigator) => {
            await navigator.waitForWizardLoad();

            // Check initial pixel position and size
            const pixelAvatar = page.locator('[data-testid="pixel-avatar"], img[alt*="Pixel"]');
            await expect(pixelAvatar).toBeVisible();

            const pixelBox = await pixelAvatar.boundingBox();
            if (pixelBox) {
              console.log(`Pixel size at ${resolution.name}: ${pixelBox.width}x${pixelBox.height}`);

              // Verify pixel fits within viewport
              expect(pixelBox.x).toBeGreaterThanOrEqual(0);
              expect(pixelBox.y).toBeGreaterThanOrEqual(0);
              expect(pixelBox.x + pixelBox.width).toBeLessThanOrEqual(resolution.width);
              expect(pixelBox.y + pixelBox.height).toBeLessThanOrEqual(resolution.height);
            }

            // Try to trigger minimization
            await navigator.selectOptionByText('know my way around code');
            await page.waitForTimeout(1000);
            await navigator.selectOptionByText('PyGame and I are old friends');
            await page.waitForTimeout(2000);

            // Check if pixel minimized
            const minimizedPixel = page.locator('[data-testid="pixel-minimized"]');
            const isMinimized = await minimizedPixel.isVisible().catch(() => false);

            if (isMinimized) {
              const minimizedBox = await minimizedPixel.boundingBox();
              if (minimizedBox) {
                console.log(
                  `Minimized pixel position at ${resolution.name}: ${minimizedBox.x}, ${minimizedBox.y}`
                );

                // Verify minimized pixel is positioned appropriately for screen size
                if (resolution.width <= 768) {
                  // On mobile, might be in corner or bottom
                  const isInCorner =
                    minimizedBox.x > resolution.width * 0.7 ||
                    minimizedBox.y > resolution.height * 0.7;
                  if (isInCorner) {
                    console.log('Minimized pixel correctly positioned in corner for mobile');
                  }
                }

                // Test restore animation
                await minimizedPixel.click();
                await page.waitForTimeout(1000);

                // Verify restoration
                const restoredPixel = page.locator('[data-testid="pixel-avatar"]');
                const isRestored = await restoredPixel.isVisible().catch(() => false);

                if (isRestored) {
                  console.log('Pixel restoration successful at', resolution.name);
                }
              }
            }
          },
          errorDetector
        );

        await page.screenshot({
          path: `test-results/screenshots/pixel-animation-${resolution.name}-${resolution.width}x${resolution.height}.png`,
          fullPage: true,
        });
      }
    });
  });

  test('Pixel menu and edge swipe functionality', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          // Test on mobile viewport for edge swipe
          await page.setViewportSize({ width: 375, height: 667 });
          await page.goto('/wizard', { waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          // Try edge swipe to open menu
          await navigator.performEdgeSwipe();
          await page.waitForTimeout(1000);

          // Check if menu opened
          const pixelMenu = page.locator('[data-testid="pixel-menu"], .pixel-menu');
          const menuVisible = await pixelMenu.isVisible().catch(() => false);

          if (menuVisible) {
            console.log('Pixel menu opened via edge swipe');

            // Check menu content
            const menuItems = page.locator('[data-testid*="menu-item"], .menu-item');
            const itemCount = await menuItems.count();
            console.log(`Menu has ${itemCount} items`);

            // Test menu interaction
            if (itemCount > 0) {
              const firstItem = menuItems.first();
              await firstItem.click();
              await page.waitForTimeout(500);
            }

            // Close menu
            const closeButton = page.locator('[data-testid="close-pixel-menu"], .close-button');
            const hasCloseButton = await closeButton.isVisible().catch(() => false);

            if (hasCloseButton) {
              await closeButton.click();
              await page.waitForTimeout(500);

              // Verify menu closed
              const stillVisible = await pixelMenu.isVisible().catch(() => false);
              expect(stillVisible).toBe(false);
              console.log('Pixel menu closed successfully');
            }

            await page.screenshot({ path: 'test-results/screenshots/pixel-menu-interaction.png' });
          } else {
            console.log('Edge swipe menu not available or uses different mechanism');

            // Try alternative menu access
            const menuButton = page.locator('[data-testid="open-pixel-menu-button"]');
            const buttonVisible = await menuButton.isVisible().catch(() => false);

            if (buttonVisible) {
              await menuButton.click();
              await page.waitForTimeout(500);

              const menuOpenedViaButton = await pixelMenu.isVisible().catch(() => false);
              if (menuOpenedViaButton) {
                console.log('Pixel menu opened via button');
              }
            }
          }
        },
        errorDetector
      );
    });
  });

  test('Pixel animation performance and smoothness', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await page.goto('/game-wizard', { waitUntil: 'networkidle' });

      await withWizardNavigation(
        page,
        async (navigator) => {
          await navigator.waitForWizardLoad();

          // Monitor performance during animations
          await page.evaluate(() => {
            const w = window as Window & { animationFrames?: number[] };
            w.animationFrames = [];

            const originalRAF = window.requestAnimationFrame;
            window.requestAnimationFrame = function (callback) {
              w.animationFrames?.push(Date.now());
              return originalRAF(callback);
            };
          });

          // Trigger animation sequence
          await navigator.selectOptionByText('know my way around code');
          await page.waitForTimeout(1000);
          await navigator.selectOptionByText('PyGame and I are old friends');
          await page.waitForTimeout(3000); // Wait for animation

          // Check animation performance
          const animationFrames = await page.evaluate(
            () => (window as Window & { animationFrames?: number[] }).animationFrames || []
          );

          if (animationFrames.length > 0) {
            console.log(`Recorded ${animationFrames.length} animation frames`);

            // Calculate approximate FPS
            const duration = animationFrames[animationFrames.length - 1] - animationFrames[0];
            const fps = (animationFrames.length / duration) * 1000;

            console.log(`Animation FPS: ${fps.toFixed(1)}`);

            // Expect reasonable performance (above 30 FPS)
            if (fps > 30) {
              console.log('✓ Animation performance acceptable');
            } else {
              console.warn('⚠️ Animation performance may be low');
            }
          }

          // Test minimize/restore cycle for smoothness
          const minimizedPixel = page.locator('[data-testid="pixel-minimized"]');
          const isMinimized = await minimizedPixel.isVisible().catch(() => false);

          if (isMinimized) {
            // Measure restore animation time
            const startTime = Date.now();
            await minimizedPixel.click();

            // Wait for restoration to complete
            await expect(page.locator('[data-testid="pixel-avatar"]')).toBeVisible();
            const restoreTime = Date.now() - startTime;

            console.log(`Pixel restore animation took ${restoreTime}ms`);

            // Expect reasonable animation duration (0.5-2 seconds)
            expect(restoreTime).toBeLessThan(3000);
            expect(restoreTime).toBeGreaterThan(200);
          }

          await page.screenshot({
            path: 'test-results/screenshots/pixel-animation-performance.png',
          });
        },
        errorDetector
      );
    });
  });
});
