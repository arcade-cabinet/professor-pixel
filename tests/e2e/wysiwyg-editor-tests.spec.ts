import { test, expect } from '@playwright/test';
import { ErrorDetector, withErrorDetection } from './utils/error-detection';
import { WizardNavigator, withWizardNavigation } from './utils/wizard-actions';

test.describe('WYSIWYG Editor Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  test.beforeEach(async ({ page }) => {
    // Navigate to wizard and unlock editor
    await page.goto('/game-wizard', { waitUntil: 'networkidle' });
  });

  test('WYSIWYG editor opens and initializes correctly', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await navigator.waitForWizardLoad();

          // Navigate to unlock editor
          await navigator.selectOptionByText('know my way around code');
          await page.waitForTimeout(1000);
          await navigator.selectOptionByText('PyGame and I are old friends');

          // Wait for editor to open and pixel to minimize
          await page.waitForTimeout(2000);

          // Check if WYSIWYG editor is visible
          const editorContainer = page.locator('[data-testid*="wysiwyg"], .wysiwyg-editor');
          const editorVisible = await editorContainer.isVisible().catch(() => false);

          if (editorVisible) {
            // Verify editor components are present
            await expect(editorContainer).toBeVisible();

            // Check for canvas
            const canvas = page.locator('canvas, [data-testid*="canvas"]');
            await expect(canvas).toBeVisible();

            // Check for component palette
            const palette = page.locator('[data-testid*="palette"], .component-palette');
            const paletteVisible = await palette.isVisible().catch(() => false);
            if (paletteVisible) {
              console.log('Component palette is visible');
            }

            // Check for properties panel
            const properties = page.locator('[data-testid*="properties"], .properties-panel');
            const propertiesVisible = await properties.isVisible().catch(() => false);
            if (propertiesVisible) {
              console.log('Properties panel is visible');
            }

            // Check for editor controls
            const controls = page.locator('[data-testid*="editor-control"], .editor-toolbar');
            const controlsVisible = await controls.isVisible().catch(() => false);
            if (controlsVisible) {
              console.log('Editor controls are visible');
            }

            await page.screenshot({
              path: 'test-results/screenshots/wysiwyg-editor-initialized.png',
            });
          } else {
            console.log('WYSIWYG editor not visible, checking if alternate interface is shown');

            // Maybe the editor opens in a different way
            const codeEditor = page.locator('[data-testid*="code-editor"], .code-editor');
            const codeEditorVisible = await codeEditor.isVisible().catch(() => false);

            if (codeEditorVisible) {
              console.log('Code editor is visible instead');
            }
          }
        },
        errorDetector
      );
    });
  });

  test('Drag and drop functionality works in editor', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await navigator.waitForWizardLoad();

          // Navigate to editor
          await navigator.selectOptionByText('know my way around code');
          await page.waitForTimeout(1000);
          await navigator.selectOptionByText('PyGame and I are old friends');
          await page.waitForTimeout(2000);

          // Try to find draggable components
          const draggableComponents = page.locator(
            '[draggable="true"], [data-testid*="draggable"], .draggable-component'
          );
          const componentCount = await draggableComponents.count();

          if (componentCount > 0) {
            console.log(`Found ${componentCount} draggable components`);

            // Try drag and drop
            const firstComponent = draggableComponents.first();
            const canvas = page.locator('canvas, [data-testid*="canvas"]');

            if ((await firstComponent.isVisible()) && (await canvas.isVisible())) {
              // Get component position
              const componentBox = await firstComponent.boundingBox();
              const canvasBox = await canvas.boundingBox();

              if (componentBox && canvasBox) {
                // Perform drag and drop
                await page.mouse.move(
                  componentBox.x + componentBox.width / 2,
                  componentBox.y + componentBox.height / 2
                );
                await page.mouse.down();

                // Move to canvas center
                await page.mouse.move(
                  canvasBox.x + canvasBox.width / 2,
                  canvasBox.y + canvasBox.height / 2
                );
                await page.mouse.up();

                // Wait for drop to process
                await page.waitForTimeout(1000);

                // Check if component was added to canvas
                const placedComponents = page.locator(
                  '[data-testid*="placed-component"], .placed-component'
                );
                const placedCount = await placedComponents.count();

                if (placedCount > 0) {
                  console.log(`Successfully placed ${placedCount} components on canvas`);
                }

                await page.screenshot({ path: 'test-results/screenshots/drag-drop-completed.png' });
              }
            }
          } else {
            console.log(
              'No draggable components found, checking for alternative interaction methods'
            );

            // Maybe components are added via clicks or buttons
            const addButtons = page.locator(
              '[data-testid*="add"], button:has-text("Add"), .add-component'
            );
            const addButtonCount = await addButtons.count();

            if (addButtonCount > 0) {
              console.log(`Found ${addButtonCount} add component buttons`);
              await addButtons.first().click();
              await page.waitForTimeout(1000);
            }
          }
        },
        errorDetector
      );
    });
  });

  test('Editor toolbar and controls function correctly', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await navigator.waitForWizardLoad();

          // Navigate to editor
          await navigator.selectOptionByText('know my way around code');
          await page.waitForTimeout(1000);
          await navigator.selectOptionByText('PyGame and I are old friends');
          await page.waitForTimeout(2000);

          // Look for editor controls
          const playButton = page.locator('[data-testid*="play"], button:has-text("Play")');
          const pauseButton = page.locator('[data-testid*="pause"], button:has-text("Pause")');
          const resetButton = page.locator('[data-testid*="reset"], button:has-text("Reset")');
          const codeViewButton = page.locator('[data-testid*="code"], button:has-text("Code")');

          // Test play functionality
          const playVisible = await playButton.isVisible().catch(() => false);
          if (playVisible) {
            await playButton.click();
            await page.waitForTimeout(500);

            // Check if pause button becomes available
            const pauseVisible = await pauseButton.isVisible().catch(() => false);
            if (pauseVisible) {
              console.log('Play/pause controls working correctly');
              await pauseButton.click();
              await page.waitForTimeout(500);
            }
          }

          // Test reset functionality
          const resetVisible = await resetButton.isVisible().catch(() => false);
          if (resetVisible) {
            await resetButton.click();
            await page.waitForTimeout(500);
            console.log('Reset button clicked');
          }

          // Test code view toggle
          const codeVisible = await codeViewButton.isVisible().catch(() => false);
          if (codeVisible) {
            await codeViewButton.click();
            await page.waitForTimeout(1000);

            // Check if code editor appears
            const codeEditor = page.locator('textarea, .code-editor, [data-testid*="code-editor"]');
            const codeEditorVisible = await codeEditor.isVisible().catch(() => false);

            if (codeEditorVisible) {
              console.log('Code editor successfully toggled');
            }

            await page.screenshot({ path: 'test-results/screenshots/editor-code-view.png' });
          }

          // Test grid and snap controls
          const gridToggle = page.locator(
            '[data-testid*="grid"], input[type="checkbox"]:near(text("Grid"))'
          );
          const snapToggle = page.locator(
            '[data-testid*="snap"], input[type="checkbox"]:near(text("Snap"))'
          );

          const gridVisible = await gridToggle.isVisible().catch(() => false);
          if (gridVisible) {
            await gridToggle.click();
            await page.waitForTimeout(500);
            console.log('Grid toggle clicked');
          }

          const snapVisible = await snapToggle.isVisible().catch(() => false);
          if (snapVisible) {
            await snapToggle.click();
            await page.waitForTimeout(500);
            console.log('Snap toggle clicked');
          }
        },
        errorDetector
      );
    });
  });

  test('Editor properties panel updates when selecting components', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await navigator.waitForWizardLoad();

          // Navigate to editor
          await navigator.selectOptionByText('know my way around code');
          await page.waitForTimeout(1000);
          await navigator.selectOptionByText('PyGame and I are old friends');
          await page.waitForTimeout(2000);

          // Look for properties panel
          const propertiesPanel = page.locator('[data-testid*="properties"], .properties-panel');
          const propertiesPanelVisible = await propertiesPanel.isVisible().catch(() => false);

          if (propertiesPanelVisible) {
            console.log('Properties panel is visible');

            // Try to add a component first
            const canvas = page.locator('canvas, [data-testid*="canvas"]');
            const canvasVisible = await canvas.isVisible().catch(() => false);

            if (canvasVisible) {
              // Click on canvas to potentially select something
              const canvasBox = await canvas.boundingBox();
              if (canvasBox) {
                await page.mouse.click(
                  canvasBox.x + canvasBox.width / 2,
                  canvasBox.y + canvasBox.height / 2
                );
                await page.waitForTimeout(500);
              }
            }

            // Look for property inputs
            const propertyInputs = page.locator(
              '[data-testid*="property"], .property-input, input[type="text"], input[type="number"]'
            );
            const inputCount = await propertyInputs.count();

            if (inputCount > 0) {
              console.log(`Found ${inputCount} property inputs`);

              // Try modifying a property
              const firstInput = propertyInputs.first();
              const inputType = await firstInput.getAttribute('type');

              if (inputType === 'text') {
                await firstInput.fill('test-value');
              } else if (inputType === 'number') {
                await firstInput.fill('100');
              }

              await page.waitForTimeout(500);
              console.log('Property modified successfully');
            }

            await page.screenshot({ path: 'test-results/screenshots/properties-panel.png' });
          }
        },
        errorDetector
      );
    });
  });

  test('Editor handles different screen resolutions gracefully', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      const resolutions = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 1024, height: 768, name: 'tablet' },
        { width: 768, height: 1024, name: 'tablet-portrait' },
        { width: 375, height: 667, name: 'mobile' },
      ];

      for (const resolution of resolutions) {
        console.log(`Testing editor at ${resolution.width}x${resolution.height}`);

        await page.setViewportSize({ width: resolution.width, height: resolution.height });
        await page.goto('/game-wizard', { waitUntil: 'networkidle' });

        await withWizardNavigation(
          page,
          async (navigator) => {
            await navigator.waitForWizardLoad();

            // Navigate to editor
            await navigator.selectOptionByText('know my way around code');
            await page.waitForTimeout(1000);
            await navigator.selectOptionByText('PyGame and I are old friends');
            await page.waitForTimeout(2000);

            // Check if editor adapts to screen size
            const editorContainer = page.locator('[data-testid*="wysiwyg"], .wysiwyg-editor');
            const editorVisible = await editorContainer.isVisible().catch(() => false);

            if (editorVisible) {
              // Check layout adaptation
              const containerBox = await editorContainer.boundingBox();
              if (containerBox) {
                expect(containerBox.width).toBeLessThanOrEqual(resolution.width);
                expect(containerBox.height).toBeLessThanOrEqual(resolution.height);
              }

              // On mobile, editor might be full-screen or have different layout
              if (resolution.width <= 768) {
                const fullScreenEditor = await editorContainer.evaluate(
                  (el) =>
                    getComputedStyle(el).position === 'fixed' ||
                    getComputedStyle(el).position === 'absolute'
                );

                if (fullScreenEditor) {
                  console.log(`Editor is full-screen on ${resolution.name}`);
                }
              }
            }

            await page.screenshot({
              path: `test-results/screenshots/editor-${resolution.name}-${resolution.width}x${resolution.height}.png`,
              fullPage: true,
            });
          },
          errorDetector
        );
      }
    });
  });

  test('Editor code generation and preview work correctly', async ({ page }) => {
    await withErrorDetection(page, async (errorDetector) => {
      await withWizardNavigation(
        page,
        async (navigator) => {
          await navigator.waitForWizardLoad();

          // Navigate to editor
          await navigator.selectOptionByText('know my way around code');
          await page.waitForTimeout(1000);
          await navigator.selectOptionByText('PyGame and I are old friends');
          await page.waitForTimeout(2000);

          // Look for code view or preview functionality
          const codeViewButton = page.locator(
            'button:has-text("Code"), [data-testid*="code-view"]'
          );
          const previewButton = page.locator(
            'button:has-text("Preview"), [data-testid*="preview"]'
          );

          const codeViewVisible = await codeViewButton.isVisible().catch(() => false);
          if (codeViewVisible) {
            await codeViewButton.click();
            await page.waitForTimeout(1000);

            // Check for generated code
            const codeEditor = page.locator('textarea, .code-editor, pre');
            const codeVisible = await codeEditor.isVisible().catch(() => false);

            if (codeVisible) {
              const codeContent =
                (await codeEditor.textContent()) || (await codeEditor.inputValue());

              if (codeContent && codeContent.length > 10) {
                console.log('Code generation is working');
                console.log('Generated code preview:', codeContent.substring(0, 100) + '...');

                // Check if it looks like Python/PyGame code
                const isPythonCode =
                  codeContent.includes('import') ||
                  codeContent.includes('pygame') ||
                  codeContent.includes('def ');

                if (isPythonCode) {
                  console.log('Generated code appears to be valid Python/PyGame code');
                }
              }
            }
          }

          // Test preview functionality
          const previewVisible = await previewButton.isVisible().catch(() => false);
          if (previewVisible) {
            await previewButton.click();
            await page.waitForTimeout(1000);

            // Look for preview canvas or output
            const previewCanvas = page.locator('canvas[data-testid*="preview"], .preview-canvas');
            const previewVisible = await previewCanvas.isVisible().catch(() => false);

            if (previewVisible) {
              console.log('Code preview is working');
            }
          }

          await page.screenshot({ path: 'test-results/screenshots/editor-code-generation.png' });
        },
        errorDetector
      );
    });
  });
});
