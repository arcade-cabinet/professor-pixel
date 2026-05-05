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
