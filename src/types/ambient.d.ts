/// <reference types="vite/client" />

declare global {
  interface Window {
    /**
     * Debug utilities for development
     */
    __debugUtils?: {
      getState: () => any;
      setState: (state: any) => void;
      clearCache: () => void;
      [key: string]: any;
    };

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
