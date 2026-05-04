import { Page, expect, Locator } from '@playwright/test';
import { ErrorDetector } from './error-detection';

export interface WizardState {
  currentDialogue?: string;
  availableOptions?: string[];
  pixelState?: 'center-stage' | 'minimized' | 'transitioning';
  embeddedComponent?: string;
}

export class WizardNavigator {
  constructor(private page: Page, private errorDetector?: ErrorDetector) {}

  async getWizardState(): Promise<WizardState> {
    try {
      // Get current dialogue text
      const dialogueElement = this.page.locator('[data-testid="dialogue-text"], .dialogue-text').first();
      const currentDialogue = (await dialogueElement.textContent().catch(() => undefined)) ?? undefined;

      // Get available options
      const optionElements = this.page.locator('[data-testid^="option-"], .wizard-option');
      const optionCount = await optionElements.count();
      const availableOptions: string[] = [];
      
      for (let i = 0; i < optionCount; i++) {
        const optionText = await optionElements.nth(i).textContent().catch(() => '');
        if (optionText) availableOptions.push(optionText);
      }

      // Detect pixel state
      const isMinimized = await this.page.locator('[data-testid="pixel-minimized"]').isVisible().catch(() => false);
      const isTransitioning = await this.page.locator('.pixel-transitioning, [data-testid*="transitioning"]').isVisible().catch(() => false);
      
      let pixelState: 'center-stage' | 'minimized' | 'transitioning' = 'center-stage';
      if (isMinimized) pixelState = 'minimized';
      else if (isTransitioning) pixelState = 'transitioning';

      // Detect embedded components
      let embeddedComponent: string | undefined;
      if (await this.page.locator('[data-testid*="wysiwyg"], .wysiwyg-editor').isVisible().catch(() => false)) {
        embeddedComponent = 'wysiwyg-editor';
      } else if (await this.page.locator('[data-testid*="asset-browser"]').isVisible().catch(() => false)) {
        embeddedComponent = 'asset-browser';
      } else if (await this.page.locator('[data-testid*="code-editor"]').isVisible().catch(() => false)) {
        embeddedComponent = 'code-editor';
      }

      return {
        currentDialogue,
        availableOptions,
        pixelState,
        embeddedComponent
      };
    } catch (error) {
      console.warn('Error getting wizard state:', error);
      return {};
    }
  }

  async waitForWizardLoad(timeout = 10000): Promise<void> {
    // Wait for Pixel avatar to appear
    await expect(this.page.locator('[data-testid="pixel-avatar"], img[alt*="Pixel"]')).toBeVisible({ timeout });
    
    // Wait for initial dialogue
    await expect(this.page.locator('[data-testid="dialogue-text"], .dialogue-text')).toBeVisible({ timeout });
    
    // Wait for at least one option to be available
    await expect(this.page.locator('[data-testid^="option-"], .wizard-option').first()).toBeVisible({ timeout });

    // Give animations time to complete
    await this.page.waitForTimeout(1000);
  }

  async selectOption(optionIndex: number, waitForTransition = true): Promise<void> {
    const optionSelector = `[data-testid="option-${optionIndex}"]`;
    const optionElement = this.page.locator(optionSelector);

    // Ensure option is visible and enabled
    await expect(optionElement).toBeVisible();
    await expect(optionElement).toBeEnabled();

    // Click the option
    await optionElement.click();

    if (waitForTransition) {
      // Wait for dialogue to change or component to load
      await this.page.waitForTimeout(500);
      
      // Check if we're transitioning to an embedded component
      const state = await this.getWizardState();
      if (state.embeddedComponent) {
        await this.waitForEmbeddedComponent(state.embeddedComponent);
      }
    }
  }

  async selectOptionByText(optionText: string, exactMatch = false): Promise<void> {
    const selector = exactMatch 
      ? `[data-testid^="option-"]:has-text("${optionText}")`
      : `[data-testid^="option-"]:has-text("${optionText.substring(0, 20)}")`;
    
    const optionElement = this.page.locator(selector).first();
    
    await expect(optionElement).toBeVisible();
    await optionElement.click();
    
    await this.page.waitForTimeout(500);
  }

  async waitForEmbeddedComponent(componentType: string, timeout = 15000): Promise<void> {
    switch (componentType) {
      case 'wysiwyg-editor':
        await expect(this.page.locator('[data-testid*="wysiwyg"], .wysiwyg-editor')).toBeVisible({ timeout });
        await expect(this.page.locator('[data-testid*="canvas"], canvas')).toBeVisible({ timeout });
        break;
      
      case 'asset-browser':
        await expect(this.page.locator('[data-testid*="asset-browser"]')).toBeVisible({ timeout });
        await expect(this.page.locator('[data-testid*="asset-grid"], [data-testid*="asset-list"]')).toBeVisible({ timeout });
        break;
      
      case 'code-editor':
        await expect(this.page.locator('[data-testid*="code-editor"], .code-editor')).toBeVisible({ timeout });
        break;
      
      default:
        console.warn(`Unknown embedded component type: ${componentType}`);
    }

    // Allow component to fully initialize
    await this.page.waitForTimeout(1000);
  }

  async navigateWizardFlow(steps: Array<{ action: 'select-option'; optionIndex?: number; optionText?: string } | { action: 'wait'; duration: number }>): Promise<void> {
    for (const step of steps) {
      if (step.action === 'select-option') {
        if (step.optionIndex !== undefined) {
          await this.selectOption(step.optionIndex);
        } else if (step.optionText) {
          await this.selectOptionByText(step.optionText);
        }
      } else if (step.action === 'wait') {
        await this.page.waitForTimeout(step.duration);
      }

      // Check for errors after each step if detector is available
      if (this.errorDetector) {
        const errorReport = await this.errorDetector.getFullErrorReport();
        if (errorReport.hasViteError || errorReport.jsErrors.length > 0) {
          throw new Error(`Wizard navigation failed at step: ${JSON.stringify(step)}`);
        }
      }
    }
  }

  async restorePixelFromMinimized(): Promise<void> {
    const minimizedPixel = this.page.locator('[data-testid="pixel-minimized"]');
    
    if (await minimizedPixel.isVisible()) {
      await minimizedPixel.click();
      
      // Wait for restoration animation
      await expect(this.page.locator('[data-testid="pixel-avatar"]')).toBeVisible();
      await this.page.waitForTimeout(1000);
    }
  }

  async openPixelMenu(): Promise<void> {
    const menuButton = this.page.locator('[data-testid="open-pixel-menu-button"]');
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await expect(this.page.locator('[data-testid="pixel-menu"]')).toBeVisible();
    } else {
      // Try edge swipe on mobile
      const viewport = this.page.viewportSize();
      if (viewport && viewport.width <= 768) {
        await this.performEdgeSwipe();
      }
    }
  }

  async performEdgeSwipe(): Promise<void> {
    const viewport = this.page.viewportSize();
    if (!viewport) return;

    // Perform edge swipe from left edge
    await this.page.mouse.move(10, viewport.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(viewport.width * 0.3, viewport.height / 2);
    await this.page.mouse.up();
    
    // Wait for menu to potentially appear
    await this.page.waitForTimeout(500);
  }

  async closeEmbeddedComponent(): Promise<void> {
    // Try multiple selectors for close buttons
    const closeSelectors = [
      '[data-testid*="close"]',
      '.close-button',
      '[aria-label="Close"]',
      'button:has-text("Close")',
      'button:has-text("×")'
    ];

    for (const selector of closeSelectors) {
      const closeButton = this.page.locator(selector);
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
        await this.page.waitForTimeout(500);
        return;
      }
    }

    // Try pressing Escape key
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }
}

export async function withWizardNavigation<T>(
  page: Page,
  action: (navigator: WizardNavigator) => Promise<T>,
  errorDetector?: ErrorDetector
): Promise<T> {
  const navigator = new WizardNavigator(page, errorDetector);
  return await action(navigator);
}