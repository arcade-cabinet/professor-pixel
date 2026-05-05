/// <reference types="vite/client" />

declare global {
  interface Window {
    /**
     * Debug utilities for development. Loosely typed because dev tools panels
     * + console hooks all extend this bag at runtime; the global-handler
     * module installs its own typed view via a narrow Window cast.
     */
    __debugUtils?: Record<string, unknown>;

    /**
     * Input getter for testing and debugging
     */
    __getInput?: () => string | null;

    /**
     * Global error sink installed by `src/errors/global-handler.ts`. Other
     * modules (console-logger, error boundaries) consult it conditionally.
     * The actual signature is `(error: GlobalError) => void`; we leave it
     * loose here so the global-handler module can install its concrete
     * `globalErrorHandler.track.bind(this)` without a structural conflict.
     */
    __trackError?: (error: {
      type: string;
      error: string;
      timestamp: string;
      level?: string;
      context?: string;
      errorId: string;
      handled?: boolean;
      stack?: string;
      componentStack?: string;
    }) => void;
  }

  /**
   * Performance extension with memory property
   */
  interface Performance {
    memory?: {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    };
  }
}

export {};
