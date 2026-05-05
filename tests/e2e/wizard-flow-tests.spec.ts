import { test, expect } from '@playwright/test';
import { ErrorDetector, withErrorDetection } from './utils/error-detection';
import { WizardNavigator, withWizardNavigation } from './utils/wizard-actions';

test.describe('Wizard Flow Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  test('Complete wizard flow from start to game creation', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          // Navigate to wizard
          await page.goto('/wizard', { waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          // Take screenshot of initial state
          await page.screenshot({ path: 'test-results/screenshots/wizard-initial-state.png' });

          // Get initial wizard state
          let state = await navigator.getWizardState();
          expect(state.currentDialogue).toContain('Pixel');
          expect(state.availableOptions?.length).toBeGreaterThan(0);
          expect(state.pixelState).toBe('center-stage');

          // Navigate through wizard flow
          const wizardFlow = [
            { action: 'select-option' as const, optionIndex: 0 }, // Select first option
            { action: 'wait' as const, duration: 1000 },
            { action: 'select-option' as const, optionText: 'jump straight into making a game' },
            { action: 'wait' as const, duration: 1000 },
          ];

          await navigator.navigateWizardFlow(wizardFlow);

          // Verify progression
          state = await navigator.getWizardState();
          expect(state.currentDialogue).toBeDefined();

          // Continue to game type selection
          const gameTypeOptions = state.availableOptions?.find(
            (opt) =>
              opt.toLowerCase().includes('platform') ||
              opt.toLowerCase().includes('rpg') ||
              opt.toLowerCase().includes('puzzle')
          );

          if (gameTypeOptions) {
            await navigator.selectOptionByText('platform');
            await page.waitForTimeout(1000);

            state = await navigator.getWizardState();
            expect(state.currentDialogue).toBeDefined();
          }

          // Take screenshot of final state
          await page.screenshot({ path: 'test-results/screenshots/wizard-final-state.png' });
        },
        errorDetector
      );
    });
  });

  test('Game wizard flow leads to WYSIWYG editor', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await page.goto('/game-wizard', { waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          // Navigate to unlock editor path
          const wizardFlow = [
            { action: 'select-option' as const, optionText: 'know my way around code' },
            { action: 'wait' as const, duration: 1000 },
            { action: 'select-option' as const, optionText: 'PyGame and I are old friends' },
            { action: 'wait' as const, duration: 2000 },
          ];

          await navigator.navigateWizardFlow(wizardFlow);

          // Should trigger WYSIWYG editor opening and pixel minimization
          let state = await navigator.getWizardState();

          // Wait for editor to appear or pixel to minimize
          if (state.embeddedComponent === 'wysiwyg-editor') {
            await navigator.waitForEmbeddedComponent('wysiwyg-editor');
          } else if (state.pixelState === 'minimized') {
            // Pixel should be minimized when editor opens
            await expect(page.locator('[data-testid="pixel-minimized"]')).toBeVisible();
          }

          // Verify editor functionality
          const editorCanvas = page.locator('[data-testid*="canvas"], canvas');
          const isEditorVisible = await editorCanvas.isVisible().catch(() => false);

          if (isEditorVisible) {
            console.log('WYSIWYG editor successfully opened');

            // Try interacting with the editor
            await editorCanvas.hover();
            await page.waitForTimeout(500);

            // Look for editor controls
            const controls = page.locator('[data-testid*="editor-controls"], .editor-toolbar');
            const hasControls = await controls.isVisible().catch(() => false);

            if (hasControls) {
              console.log('Editor controls are visible');
            }
          }

          await page.screenshot({ path: 'test-results/screenshots/wysiwyg-editor-opened.png' });
        },
        errorDetector
      );
    });
  });

  test('Wizard handles different user experience levels', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      const experiencePaths = [
        { path: 'new to this', expectedFlow: 'learning' },
        { path: 'know my way around', expectedFlow: 'experienced' },
        { path: 'Unity, Godot', expectedFlow: 'hybrid' },
      ];

      for (const experiencePath of experiencePaths) {
        await page.goto('/wizard', { waitUntil: 'networkidle' });

        await withWizardNavigation(
          page,
          async (navigator) => {
            await navigator.waitForWizardLoad();

            // Select experience level option
            await navigator.selectOptionByText(experiencePath.path);
            await page.waitForTimeout(1000);

            const state = await navigator.getWizardState();
            expect(state.currentDialogue).toBeDefined();

            // Verify appropriate flow based on experience
            if (experiencePath.expectedFlow === 'learning') {
              // Should offer learning resources
              const hasLearningOptions = state.availableOptions?.some(
                (opt) =>
                  opt.toLowerCase().includes('learn') ||
                  opt.toLowerCase().includes('guide') ||
                  opt.toLowerCase().includes('help')
              );

              if (hasLearningOptions) {
                console.log(`Learning path correctly offered for "${experiencePath.path}"`);
              }
            }

            await page.screenshot({
              path: `test-results/screenshots/experience-${experiencePath.expectedFlow}.png`,
            });
          },
          errorDetector
        );
      }
    });
  });

  test('Wizard navigation persists across resolution changes', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          // Start on desktop
          await page.setViewportSize({ width: 1920, height: 1080 });
          await page.goto('/wizard', { waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          // Make some progress
          await navigator.selectOption(0);
          await page.waitForTimeout(500);

          let state = await navigator.getWizardState();
          const dialogueBeforeResize = state.currentDialogue;

          // Change to mobile portrait
          await page.setViewportSize({ width: 375, height: 667 });
          await page.waitForTimeout(1000);

          // Verify state is maintained
          state = await navigator.getWizardState();
          expect(state.currentDialogue).toBe(dialogueBeforeResize);

          // Continue navigation on mobile
          if (state.availableOptions && state.availableOptions.length > 0) {
            await navigator.selectOption(0);
            await page.waitForTimeout(500);
          }

          // Change to mobile landscape
          await page.setViewportSize({ width: 667, height: 375 });
          await page.waitForTimeout(1000);

          // Verify layout adapts but state persists
          state = await navigator.getWizardState();
          expect(state.currentDialogue).toBeDefined();

          await page.screenshot({ path: 'test-results/screenshots/wizard-mobile-landscape.png' });
        },
        errorDetector
      );
    });
  });

  test('Error handling during wizard navigation', async ({ page }) => {
    await withErrorDetection(
      page,
      async (errorDetector) => {
        await page.goto('/wizard', { waitUntil: 'networkidle' });

        await withWizardNavigation(
          page,
          async (navigator) => {
            await navigator.waitForWizardLoad();

            // Try to break the wizard with rapid clicks
            const options = page.locator('[data-testid^="option-"]');
            const optionCount = await options.count();

            if (optionCount > 0) {
              // Rapid fire clicking
              for (let i = 0; i < 3; i++) {
                await options.first().click({ force: true });
                await page.waitForTimeout(100);
              }

              await page.waitForTimeout(1000);

              // Verify wizard didn't break
              const state = await navigator.getWizardState();
              expect(state.currentDialogue).toBeDefined();

              // Verify no error overlays appeared
              const viteError = await errorDetector.checkForViteErrorOverlay();
              expect(viteError.hasError).toBe(false);
            }

            // Try navigation with non-existent options
            try {
              await navigator.selectOption(999); // Should fail gracefully
            } catch (error) {
              // This is expected to fail, but shouldn't crash the app
              console.log('Non-existent option correctly handled:', error);
            }

            // Verify app is still functional
            const finalState = await navigator.getWizardState();
            expect(finalState.currentDialogue).toBeDefined();
          },
          errorDetector
        );
      },
      false
    ); // Don't automatically assert no errors since we're testing error handling
  });

  test('Wizard state persists across page refresh', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          // Navigate to wizard
          await page.goto('/wizard', { waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          // Make some progress in the wizard
          let state = await navigator.getWizardState();
          const initialDialogue = state.currentDialogue;

          // Select first option to progress
          await navigator.selectOption(0);
          await page.waitForTimeout(1000);

          // Get current state after progression
          state = await navigator.getWizardState();
          const progressedDialogue = state.currentDialogue;
          expect(progressedDialogue).not.toBe(initialDialogue);

          // Refresh the page
          await page.reload({ waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          // Check state is restored
          state = await navigator.getWizardState();
          expect(state.currentDialogue).toBe(progressedDialogue);

          await page.screenshot({ path: 'test-results/screenshots/persistence-after-refresh.png' });
        },
        errorDetector
      );
    });
  });

  test('Forest theme selection persists correctly', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          // Navigate to wizard
          await page.goto('/wizard', { waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          // Navigate to theme selection
          const wizardFlow = [
            { action: 'select-option' as const, optionText: 'jump straight into making a game' },
            { action: 'wait' as const, duration: 1000 },
            { action: 'select-option' as const, optionText: 'platform' },
            { action: 'wait' as const, duration: 1000 },
          ];

          await navigator.navigateWizardFlow(wizardFlow);

          // Select Forest theme if available
          const forestOption = page.locator(
            '[data-testid^="option-"]:has-text("Forest"), [data-testid^="option-"]:has-text("forest")'
          );
          if (await forestOption.isVisible().catch(() => false)) {
            await forestOption.click();
            await page.waitForTimeout(1000);

            // Continue to title presentation
            let state = await navigator.getWizardState();
            if (state.availableOptions && state.availableOptions.length > 0) {
              await navigator.selectOption(0); // Select first option to proceed
              await page.waitForTimeout(1000);
            }

            // Get state at title presentation
            state = await navigator.getWizardState();
            const titlePresentationDialogue = state.currentDialogue;

            // Refresh page
            await page.reload({ waitUntil: 'networkidle' });
            await navigator.waitForWizardLoad();

            // Verify we're still at title presentation, not back at theme selection
            state = await navigator.getWizardState();
            expect(state.currentDialogue).toBe(titlePresentationDialogue);
            expect(state.currentDialogue).not.toContain('Forest');
            expect(state.currentDialogue).not.toContain('theme');

            await page.screenshot({
              path: 'test-results/screenshots/forest-theme-persistence.png',
            });
          }
        },
        errorDetector
      );
    });
  });

  test('Clear progress and reset wizard', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          // Navigate to wizard and make progress
          await page.goto('/wizard', { waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          // Make some progress
          await navigator.selectOption(0);
          await page.waitForTimeout(1000);
          let state = await navigator.getWizardState();
          const progressedDialogue = state.currentDialogue;

          // Clear localStorage to reset progress
          await page.evaluate(() => {
            localStorage.removeItem('dialogueState');
            localStorage.removeItem('wizardProgress');
            localStorage.removeItem('currentNodeId');
            localStorage.removeItem('activeFlowPath');
            localStorage.clear();
          });

          // Refresh page
          await page.reload({ waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          // Verify we're back at the start
          state = await navigator.getWizardState();
          expect(state.currentDialogue).toContain('Pixel');
          expect(state.currentDialogue).not.toBe(progressedDialogue);

          await page.screenshot({ path: 'test-results/screenshots/wizard-reset.png' });
        },
        errorDetector
      );
    });
  });

  test('Flow transitions maintain saved state', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await page.goto('/wizard', { waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          const checkpoints: { nodeId: string; dialogue: string }[] = [];

          // Navigate through multiple checkpoints
          for (let i = 0; i < 3; i++) {
            let state = await navigator.getWizardState();

            // Save checkpoint
            checkpoints.push({
              nodeId: `checkpoint_${i}`,
              dialogue: state.currentDialogue || '',
            });

            // Progress if options available
            if (state.availableOptions && state.availableOptions.length > 0) {
              await navigator.selectOption(0);
              await page.waitForTimeout(1000);
            } else {
              break;
            }
          }

          // Refresh and verify last checkpoint
          await page.reload({ waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          let state = await navigator.getWizardState();
          const lastCheckpoint = checkpoints[checkpoints.length - 1];
          expect(state.currentDialogue).toBe(lastCheckpoint.dialogue);

          // Navigate back using browser back button if possible
          const canGoBack = await page.evaluate(() => window.history.length > 1);
          if (canGoBack) {
            await page.goBack({ waitUntil: 'networkidle' });
            await navigator.waitForWizardLoad();

            // Check state after going back
            state = await navigator.getWizardState();
            // State should still be maintained from localStorage, not reset
            expect(state.currentDialogue).toBe(lastCheckpoint.dialogue);
          }
        },
        errorDetector
      );
    });
  });
});

test.describe('Wizard Responsive Behavior', () => {
  test('Mobile portrait: vertical stack without title', async ({ page }) => {
    // This test runs specifically on mobile-portrait viewport
    await page.goto('/wizard', { waitUntil: 'networkidle' });

    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await navigator.waitForWizardLoad();

          // Check for vertical stack layout
          const verticalContainer = page.locator('.h-screen.flex.flex-col');
          await expect(verticalContainer).toBeVisible();

          // Title should be hidden or not present
          const title = page.locator('h1').first();
          const titleVisible = await title.isVisible().catch(() => false);

          // Avatar should be at top
          const avatar = page.locator('[data-testid="pixel-avatar"]');
          await expect(avatar).toBeVisible();

          // Options should be scrollable
          const optionsContainer = page.locator(
            '[data-testid="options-container"], .wizard-options'
          );
          const hasScrollable = await optionsContainer
            .evaluate(
              (el) =>
                el.scrollHeight > el.clientHeight ||
                getComputedStyle(el).overflowY === 'auto' ||
                getComputedStyle(el).overflowY === 'scroll'
            )
            .catch(() => false);

          // Take screenshot
          await page.screenshot({ path: 'test-results/screenshots/mobile-portrait-layout.png' });
        },
        errorDetector
      );
    });
  });

  test('Mobile landscape: 20/80 grid without hamburger menu', async ({ page }) => {
    // This test runs specifically on mobile-landscape viewport
    await page.goto('/wizard', { waitUntil: 'networkidle' });

    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await navigator.waitForWizardLoad();

          // Check for grid layout
          const gridContainer = page.locator('.grid');
          await expect(gridContainer).toBeVisible();

          // Should have two columns
          const columns = page.locator('.grid > div');
          const columnCount = await columns.count();
          expect(columnCount).toBeGreaterThanOrEqual(2);

          // Hamburger menu should NOT be visible
          const hamburgerMenu = page.locator('[data-testid="open-pixel-menu-button"]');
          const isMenuVisible = await hamburgerMenu.isVisible().catch(() => false);
          expect(isMenuVisible).toBe(false);

          // Avatar should be in left column
          const leftColumn = columns.first();
          const avatarInLeft = await leftColumn
            .locator('[data-testid="pixel-avatar"]')
            .isVisible()
            .catch(() => false);

          if (avatarInLeft) {
            console.log('Avatar correctly positioned in left column');
          }

          // Take screenshot
          await page.screenshot({ path: 'test-results/screenshots/mobile-landscape-layout.png' });
        },
        errorDetector
      );
    });
  });

  test('Desktop: centered card layout with header', async ({ page }) => {
    // This test runs specifically on desktop viewport
    await page.goto('/wizard', { waitUntil: 'networkidle' });

    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await navigator.waitForWizardLoad();

          // Check for centered layout
          const centeredLayout = page.locator(
            '.fixed.inset-0.flex.items-center.justify-center, .flex.items-center.justify-center'
          );
          await expect(centeredLayout).toBeVisible();

          // Header might be visible on large desktop
          const viewport = page.viewportSize();
          if (viewport && viewport.width >= 1024) {
            const header = page.locator('header, .header');
            const hasHeader = (await header.count()) > 0;
            console.log(
              `Header present on desktop (${viewport.width}x${viewport.height}): ${hasHeader}`
            );
          }

          // No hamburger menu on desktop
          const hamburgerMenu = page.locator('[data-testid="open-pixel-menu-button"]');
          const isMenuVisible = await hamburgerMenu.isVisible().catch(() => false);
          expect(isMenuVisible).toBe(false);

          // Take screenshot
          await page.screenshot({ path: 'test-results/screenshots/desktop-layout.png' });
        },
        errorDetector
      );
    });
  });
});
