import { Page, expect } from '@playwright/test';

export interface ErrorDetectionResult {
  hasViteError: boolean;
  viteErrorMessage?: string;
  consoleErrors: string[];
  consoleWarnings: string[];
  networkErrors: string[];
  jsErrors: string[];
  componentRenderErrors: string[];
  importErrors: string[];
}

export class ErrorDetector {
  private consoleErrors: string[] = [];
  private consoleWarnings: string[] = [];
  private networkErrors: string[] = [];
  private jsErrors: string[] = [];

  constructor(private page: Page) {
    this.setupErrorListeners();
  }

  private setupErrorListeners() {
    // Listen to console events
    this.page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') {
        this.consoleErrors.push(text);
        // Also capture JavaScript errors
        if (text.includes('Error:') || text.includes('TypeError:') || text.includes('ReferenceError:')) {
          this.jsErrors.push(text);
        }
      } else if (type === 'warning') {
        this.consoleWarnings.push(text);
      }
    });

    // Listen to page errors (uncaught exceptions)
    this.page.on('pageerror', (error) => {
      const errorText = `${error.name}: ${error.message}\n${error.stack}`;
      this.jsErrors.push(errorText);
      console.error('Uncaught page error:', errorText);
    });

    // Listen to failed network requests
    this.page.on('response', (response) => {
      if (!response.ok() && response.status() >= 400) {
        const errorMsg = `${response.status()} ${response.statusText()} - ${response.url()}`;
        this.networkErrors.push(errorMsg);
        console.warn('Network error:', errorMsg);
      }
    });

    // Listen to request failures
    this.page.on('requestfailed', (request) => {
      const errorMsg = `Request failed: ${request.url()} - ${request.failure()?.errorText}`;
      this.networkErrors.push(errorMsg);
      console.warn('Request failed:', errorMsg);
    });
  }

  async checkForViteErrorOverlay(): Promise<{ hasError: boolean; message?: string }> {
    try {
      // Check for Vite error overlay
      const viteOverlay = this.page.locator('vite-error-overlay');
      const viteOverlayVisible = await viteOverlay.isVisible().catch(() => false);
      
      if (viteOverlayVisible) {
        const errorMessage = await viteOverlay.textContent().catch(() => 'Unknown Vite error');
        return { hasError: true, message: errorMessage ?? undefined };
      }

      // Check for Replit's runtime error modal
      const runtimeErrorModal = this.page.locator('[data-testid="runtime-error-modal"], .runtime-error');
      const modalVisible = await runtimeErrorModal.isVisible().catch(() => false);
      
      if (modalVisible) {
        const errorMessage = await runtimeErrorModal.textContent().catch(() => 'Unknown runtime error');
        return { hasError: true, message: errorMessage ?? undefined };
      }

      // Check for generic error boundaries
      const errorBoundary = this.page.locator('.error-boundary, [data-testid="error-boundary"]');
      const boundaryVisible = await errorBoundary.isVisible().catch(() => false);
      
      if (boundaryVisible) {
        const errorMessage = await errorBoundary.textContent().catch(() => 'Component error boundary triggered');
        return { hasError: true, message: errorMessage ?? undefined };
      }

      return { hasError: false };
    } catch (error) {
      console.warn('Error checking for Vite overlay:', error);
      return { hasError: false };
    }
  }

  async checkForComponentRenderErrors(): Promise<string[]> {
    const renderErrors: string[] = [];

    try {
      // Check for missing components or broken renders
      const suspenseFallbacks = await this.page.locator('[data-testid*="loading"], .loading').count();
      if (suspenseFallbacks > 5) {
        renderErrors.push(`Too many loading states detected (${suspenseFallbacks}), possible render issues`);
      }

      // Check for error states in components
      const errorStates = await this.page.locator('.error-state, [data-testid*="error"]').count();
      if (errorStates > 0) {
        renderErrors.push(`${errorStates} component error states detected`);
      }

      // Check for empty or broken content areas
      const emptyContent = await this.page.locator('.min-h-screen:empty, [data-testid="content"]:empty').count();
      if (emptyContent > 0) {
        renderErrors.push(`${emptyContent} empty content areas detected`);
      }
    } catch (error) {
      console.warn('Error checking component render errors:', error);
    }

    return renderErrors;
  }

  async checkForImportErrors(): Promise<string[]> {
    const importErrors: string[] = [];

    // Filter console errors for import-related issues
    const importErrorPatterns = [
      /Failed to resolve module/,
      /Module not found/,
      /Cannot resolve module/,
      /Unexpected token 'export'/,
      /Unexpected token 'import'/,
      /SyntaxError.*import/,
      /SyntaxError.*export/,
    ];

    for (const error of this.consoleErrors) {
      for (const pattern of importErrorPatterns) {
        if (pattern.test(error)) {
          importErrors.push(error);
          break;
        }
      }
    }

    return [...new Set(importErrors)]; // Remove duplicates
  }

  async getFullErrorReport(): Promise<ErrorDetectionResult> {
    const viteError = await this.checkForViteErrorOverlay();
    const renderErrors = await this.checkForComponentRenderErrors();
    const importErrors = await this.checkForImportErrors();

    return {
      hasViteError: viteError.hasError,
      viteErrorMessage: viteError.message,
      consoleErrors: [...this.consoleErrors],
      consoleWarnings: [...this.consoleWarnings],
      networkErrors: [...this.networkErrors],
      jsErrors: [...this.jsErrors],
      componentRenderErrors: renderErrors,
      importErrors: importErrors,
    };
  }

  async assertNoErrors(customMessage = 'No errors should be present') {
    const errorReport = await this.getFullErrorReport();
    
    const errorMessages: string[] = [];
    
    if (errorReport.hasViteError) {
      errorMessages.push(`Vite Error: ${errorReport.viteErrorMessage}`);
    }
    
    if (errorReport.consoleErrors.length > 0) {
      errorMessages.push(`Console Errors (${errorReport.consoleErrors.length}): ${errorReport.consoleErrors.slice(0, 3).join(', ')}${errorReport.consoleErrors.length > 3 ? '...' : ''}`);
    }
    
    if (errorReport.jsErrors.length > 0) {
      errorMessages.push(`JS Errors (${errorReport.jsErrors.length}): ${errorReport.jsErrors.slice(0, 2).join(', ')}${errorReport.jsErrors.length > 2 ? '...' : ''}`);
    }
    
    if (errorReport.networkErrors.length > 0) {
      errorMessages.push(`Network Errors (${errorReport.networkErrors.length}): ${errorReport.networkErrors.slice(0, 2).join(', ')}${errorReport.networkErrors.length > 2 ? '...' : ''}`);
    }
    
    if (errorReport.componentRenderErrors.length > 0) {
      errorMessages.push(`Render Errors: ${errorReport.componentRenderErrors.join(', ')}`);
    }
    
    if (errorReport.importErrors.length > 0) {
      errorMessages.push(`Import Errors: ${errorReport.importErrors.join(', ')}`);
    }

    if (errorMessages.length > 0) {
      throw new Error(`${customMessage}\n\nDetected errors:\n${errorMessages.join('\n')}`);
    }
  }

  clearErrors() {
    this.consoleErrors = [];
    this.consoleWarnings = [];
    this.networkErrors = [];
    this.jsErrors = [];
  }
}

export async function withErrorDetection<T>(
  page: Page, 
  action: (detector: ErrorDetector) => Promise<T>,
  assertNoErrors = true
): Promise<T> {
  const detector = new ErrorDetector(page);
  
  try {
    const result = await action(detector);
    
    if (assertNoErrors) {
      await detector.assertNoErrors();
    }
    
    return result;
  } catch (error) {
    // Take screenshot on error
    await page.screenshot({ 
      path: `test-results/screenshots/error-${Date.now()}.png`,
      fullPage: true 
    });
    
    throw error;
  }
}