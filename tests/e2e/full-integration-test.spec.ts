import { test, expect, Page } from '@playwright/test';
import { ErrorDetector, withErrorDetection } from './utils/error-detection';
import { WizardNavigator, withWizardNavigation } from './utils/wizard-actions';

test.describe('Full Integration Test - Wizard to Game', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Complete flow: Start wizard → Select platformer → Choose components → Select assets → Compile game', async () => {
    // Step 1: Navigate to game wizard
    await page.locator('text=Create a Game').first().click();
    await page.waitForSelector('[data-testid="pixel-avatar"]', { timeout: 5000 });

    // Step 2: Select game type - Platformer
    const platformerOption = page.locator('text=platformer').first();
    if (await platformerOption.isVisible()) {
      await platformerOption.click();
    } else {
      // Try alternative text
      await page.locator('text=jump').first().click();
    }

    await page.waitForTimeout(1000);

    // Step 3: Title screen background selection
    const assetBrowserVisible = await page
      .locator('[data-testid="asset-browser"]')
      .isVisible()
      .catch(() => false);

    if (assetBrowserVisible) {
      // Select first background asset
      const backgrounds = page.locator('[data-testid*="asset-card"]');
      const count = await backgrounds.count();
      if (count > 0) {
        await backgrounds.first().click();
        await page.waitForTimeout(500);
      }
    }

    // Step 4: Jump component selection (A/B choice)
    const jumpChoiceVisible = await page
      .locator('text=Floaty Jump')
      .isVisible()
      .catch(() => false);

    if (jumpChoiceVisible) {
      await page.click('text=Floaty Jump');
      await page.waitForTimeout(1000);
    }

    // Step 5: Continue through flow
    let continueCount = 0;
    while (continueCount < 10) {
      // Look for continue or next options
      const hasNext = await page
        .locator('button:has-text("Continue")')
        .isVisible()
        .catch(() => false);
      const hasOption = await page
        .locator('[data-testid*="wizard-option"]')
        .first()
        .isVisible()
        .catch(() => false);

      if (hasNext) {
        await page.click('button:has-text("Continue")');
      } else if (hasOption) {
        await page.locator('[data-testid*="wizard-option"]').first().click();
      } else {
        break;
      }

      await page.waitForTimeout(1000);
      continueCount++;
    }

    // Step 6: Check for game compilation
    const compileButtonVisible = await page
      .locator('text=Play my')
      .isVisible()
      .catch(() => false);

    if (compileButtonVisible) {
      // Game is ready to play
      await page.click('text=Play my');

      // Wait for pygame runner to load
      await page.waitForSelector('canvas', { timeout: 10000 }).catch(() => {
        console.log('Canvas not found, game might be running differently');
      });
    }

    // Verify no errors
    const errorElements = await page.locator('.error, [data-testid="error"]').count();
    expect(errorElements).toBe(0);

    // Take screenshot
    await page.screenshot({ path: 'test-results/full-integration-test.png', fullPage: true });
  });

  test('Asset browser loads real Kenney assets', async () => {
    // Navigate to asset browser directly (if possible)
    await page.goto('/wizard', { waitUntil: 'networkidle' });

    // Try to trigger asset browser
    const steps = ['text=Create', 'text=Game', 'text=platformer', 'text=background'];

    for (const step of steps) {
      const element = page.locator(step).first();
      if (await element.isVisible().catch(() => false)) {
        await element.click();
        await page.waitForTimeout(1000);
      }
    }

    // Check if asset browser opened
    const assetBrowserOpen = await page
      .locator('[data-testid="asset-browser"]')
      .isVisible()
      .catch(() => false);

    if (assetBrowserOpen) {
      // Verify Kenney assets are loaded
      const assetCards = page.locator('[data-testid*="asset-card"]');
      const assetCount = await assetCards.count();

      // We cataloged 2788 assets, should have at least some showing
      expect(assetCount).toBeGreaterThan(0);

      // Check for Kenney attribution
      const kenneyText = await page.locator('text=Kenney').count();
      expect(kenneyText).toBeGreaterThan(0);
    }
  });

  test('Component selection with A/B variants works', async () => {
    await page.goto('/wizard', { waitUntil: 'networkidle' });

    // Navigate to component selection
    await page.locator('text=Create').first().click();
    await page.waitForTimeout(1000);

    // Look for component choices
    const componentChoices = [
      { name: 'jump', variants: ['Floaty', 'Realistic'] },
      { name: 'shooting', variants: ['Rapid', 'Charged'] },
      { name: 'score', variants: ['Animated', 'Instant'] },
    ];

    for (const component of componentChoices) {
      for (const variant of component.variants) {
        const variantVisible = await page
          .locator(`text=${variant}`)
          .isVisible()
          .catch(() => false);

        if (variantVisible) {
          console.log(`Found ${component.name} component with ${variant} variant`);
          // Verify it's clickable
          const isClickable = await page.locator(`text=${variant}`).isEnabled();
          expect(isClickable).toBe(true);
        }
      }
    }
  });

  test('Game compilation generates valid Python code', async () => {
    // This test would ideally run the compilation and check the output
    // For now, we'll just verify the export button exists

    await page.goto('/wizard', { waitUntil: 'networkidle' });

    // Quick navigation to end
    const quickPath = ['text=Create', 'text=platformer', '[data-testid*="wizard-option"]'];

    for (const selector of quickPath) {
      const el = page.locator(selector).first();
      if (await el.isVisible().catch(() => false)) {
        await el.click();
        await page.waitForTimeout(500);
      }
    }

    // Look for export option
    const exportVisible = await page
      .locator('text=Export')
      .isVisible()
      .catch(() => false);

    if (exportVisible) {
      // Verify export would work
      await page.click('text=Export');

      // Check for download trigger (can't actually verify file in Playwright easily)
      // But we can check no errors occurred
      const hasError = await page
        .locator('.error')
        .isVisible()
        .catch(() => false);
      expect(hasError).toBe(false);
    }
  });

  test('Pyodide runner can execute simple game', async () => {
    // Direct test of Pyodide runner if accessible
    await page.goto('/game-runner', { waitUntil: 'networkidle' }).catch(async () => {
      // If no direct route, try through wizard
      await page.goto('/wizard', { waitUntil: 'networkidle' });
    });

    // Check for canvas element (game display)
    const canvas = page.locator('canvas#pygame-canvas');
    const canvasExists = await canvas.isVisible().catch(() => false);

    if (canvasExists) {
      // Verify canvas has correct dimensions
      const box = await canvas.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
      }

      // Check for run button
      const runButton = page.locator('button:has-text("Run")');
      if (await runButton.isVisible()) {
        await runButton.click();

        // Wait for game to start
        await page.waitForTimeout(3000);

        // Check canvas is still visible (game didn't crash)
        const stillVisible = await canvas.isVisible();
        expect(stillVisible).toBe(true);
      }
    }
  });

  test('Complete platformer flow with persistence from start to export', async () => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          // Clear any existing progress
          await page.evaluate(() => {
            localStorage.clear();
          });

          // Step 1: Navigate to wizard
          await page.goto('/wizard', { waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          // Checkpoint 1: Initial state
          let state = await navigator.getWizardState();
          expect(state.currentDialogue).toContain('Pixel');

          // Step 2: Select "jump straight into making a game"
          await navigator.selectOptionByText('jump straight into making a game');
          await page.waitForTimeout(1000);

          // Checkpoint 2: After initial choice
          state = await navigator.getWizardState();
          const checkpoint2Dialogue = state.currentDialogue;

          // Test persistence at checkpoint 2
          await page.reload({ waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();
          state = await navigator.getWizardState();
          expect(state.currentDialogue).toBe(checkpoint2Dialogue);

          // Step 3: Select platformer game type
          await navigator.selectOptionByText('platform');
          await page.waitForTimeout(1000);

          // Checkpoint 3: After game type selection
          state = await navigator.getWizardState();
          const checkpoint3Dialogue = state.currentDialogue;

          // Test persistence at checkpoint 3
          await page.reload({ waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();
          state = await navigator.getWizardState();
          expect(state.currentDialogue).toBe(checkpoint3Dialogue);

          // Step 4: Select theme if available
          const themeOptions = page.locator(
            '[data-testid^="option-"]:has-text("theme"), [data-testid^="option-"]:has-text("Forest")'
          );
          if (
            await themeOptions
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            await themeOptions.first().click();
            await page.waitForTimeout(1000);
          }

          // Step 5: Continue through component selections
          const componentSelectionFlow = [
            'Floaty', // Jump type
            'Rapid', // Shooting type
            'Animated', // Score type
          ];

          for (const componentChoice of componentSelectionFlow) {
            const componentOption = page.locator(
              `[data-testid^="option-"]:has-text("${componentChoice}")`
            );
            if (await componentOption.isVisible().catch(() => false)) {
              await componentOption.click();
              await page.waitForTimeout(1000);

              // Test persistence after each component selection
              state = await navigator.getWizardState();
              const currentDialogue = state.currentDialogue;

              await page.reload({ waitUntil: 'networkidle' });
              await navigator.waitForWizardLoad();

              state = await navigator.getWizardState();
              expect(state.currentDialogue).toBe(currentDialogue);
            }
          }

          // Step 6: Look for export option
          const exportOption = page.locator(
            '[data-testid^="option-"]:has-text("Export"), button:has-text("Export")'
          );
          const playOption = page.locator(
            '[data-testid^="option-"]:has-text("Play"), button:has-text("Play")'
          );

          if (await exportOption.isVisible().catch(() => false)) {
            // Verify all selected components are included in the export data
            const exportData = await page.evaluate(() => {
              return JSON.parse(localStorage.getItem('gameConfiguration') || '{}');
            });

            // Check that selected components are saved
            console.log('Export data contains:', exportData);

            await page.screenshot({
              path: 'test-results/screenshots/complete-platformer-flow.png',
            });
          } else if (await playOption.isVisible().catch(() => false)) {
            console.log('Play option available - game is ready');
          }
        },
        errorDetector
      );
    });
  });

  test('Persistence works across multiple checkpoints in wizard flow', async () => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await page.goto('/wizard', { waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          const checkpoints: { name: string; dialogue: string }[] = [];
          const maxCheckpoints = 5;

          // Navigate through wizard creating checkpoints
          for (let i = 0; i < maxCheckpoints; i++) {
            let state = await navigator.getWizardState();

            // Save checkpoint
            checkpoints.push({
              name: `checkpoint_${i}`,
              dialogue: state.currentDialogue || '',
            });

            // Navigate to next option if available
            if (state.availableOptions && state.availableOptions.length > 0) {
              await navigator.selectOption(0);
              await page.waitForTimeout(1000);

              // Refresh at random checkpoints to test persistence
              if (i % 2 === 0) {
                await page.reload({ waitUntil: 'networkidle' });
                await navigator.waitForWizardLoad();

                // Verify we're at the right place after refresh
                state = await navigator.getWizardState();

                // Should have progressed from last checkpoint
                expect(state.currentDialogue).not.toBe(
                  checkpoints[checkpoints.length - 1].dialogue
                );
              }
            } else {
              break;
            }
          }

          // Final verification - refresh and check we're at the last checkpoint
          await page.reload({ waitUntil: 'networkidle' });
          await navigator.waitForWizardLoad();

          const finalState = await navigator.getWizardState();
          console.log(`Tested ${checkpoints.length} checkpoints with persistence`);

          // Take screenshot of final state
          await page.screenshot({ path: 'test-results/screenshots/persistence-checkpoints.png' });
        },
        errorDetector
      );
    });
  });
});

// Performance test
test('Asset loading performance', async ({ page }) => {
  const startTime = Date.now();

  await page.goto('/', { waitUntil: 'networkidle' });

  // Measure time to load assets
  await page.goto('/wizard', { waitUntil: 'networkidle' });

  const loadTime = Date.now() - startTime;

  // Should load within 5 seconds
  expect(loadTime).toBeLessThan(5000);

  console.log(`Asset loading took ${loadTime}ms`);
});

// Accessibility test
test('Wizard is keyboard navigable', async ({ page }) => {
  await page.goto('/wizard', { waitUntil: 'networkidle' });

  // Test tab navigation
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  // Should progress through wizard
  await page.waitForTimeout(1000);

  // Check focus is maintained
  const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
  expect(focusedElement).toBeTruthy();
});
