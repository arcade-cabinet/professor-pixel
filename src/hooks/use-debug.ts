import { useState, useEffect, useCallback } from "react";
import { globalErrorHandler, type GlobalError } from "@/lib/global-error-handler";

/**
 * Debug hook for development and troubleshooting
 * Provides access to debug information and controls
 */
export function useDebug() {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [errors, setErrors] = useState<GlobalError[]>([]);

  // Initialize debug mode state
  useEffect(() => {
    setIsDebugMode(globalErrorHandler.getDebugMode());

    // Listen for keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+D or Cmd+Shift+D to toggle debug panel
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setIsDebugPanelOpen(prev => !prev);
      }

      // Ctrl+Shift+E or Cmd+Shift+E to toggle debug mode
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        toggleDebugMode();
      }

      // Escape to close debug panel
      if (event.key === 'Escape' && isDebugPanelOpen) {
        setIsDebugPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDebugPanelOpen]);

  // Subscribe to error updates
  useEffect(() => {
    const updateErrors = () => {
      setErrors(globalErrorHandler.getRecentErrors(10));
    };

    updateErrors();
    const unsubscribe = globalErrorHandler.subscribe(updateErrors);
    
    return unsubscribe;
  }, []);

  const toggleDebugMode = useCallback(() => {
    const newMode = !isDebugMode;
    setIsDebugMode(newMode);
    globalErrorHandler.setDebugMode(newMode);
  }, [isDebugMode]);

  const openDebugPanel = useCallback(() => {
    setIsDebugPanelOpen(true);
  }, []);

  const closeDebugPanel = useCallback(() => {
    setIsDebugPanelOpen(false);
  }, []);

  const clearErrors = useCallback(() => {
    globalErrorHandler.clearErrors();
    setErrors([]);
  }, []);

  const logDebugInfo = useCallback((label: string, data: any) => {
    if (isDebugMode) {
      console.group(`🐛 Debug: ${label}`);
      console.log(data);
      console.groupEnd();
    }
  }, [isDebugMode]);

  const trackCustomError = useCallback((message: string, context?: string) => {
    globalErrorHandler.track({
      type: 'custom',
      error: message,
      timestamp: new Date().toISOString(),
      level: 'error',
      context: context || 'Custom Debug Error',
      errorId: `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      handled: true
    });
  }, []);

  const getSystemHealth = useCallback(() => {
    const errorStats = globalErrorHandler.getErrorStats();
    const recentErrors = errors.filter(error => 
      Date.now() - new Date(error.timestamp).getTime() < 5 * 60 * 1000
    );

    return {
      isHealthy: recentErrors.length < 3 && errorStats.byLevel.error < 5,
      errorCount: errorStats.total,
      recentErrorCount: recentErrors.length,
      criticalErrorCount: errorStats.byLevel.error || 0,
      lastError: errors[0] || null
    };
  }, [errors]);

  return {
    // State
    isDebugMode,
    isDebugPanelOpen,
    errors,
    hasRecentErrors: errors.length > 0,
    
    // Actions
    toggleDebugMode,
    openDebugPanel,
    closeDebugPanel,
    clearErrors,
    logDebugInfo,
    trackCustomError,
    
    // Utilities
    getSystemHealth,
    
    // Shortcuts info
    shortcuts: {
      togglePanel: 'Ctrl+Shift+D',
      toggleMode: 'Ctrl+Shift+E',
      closePanel: 'Escape'
    }
  };
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    memoryUsage: 0
  });

  const startRenderMeasure = useCallback(() => {
    return performance.now();
  }, []);

  const endRenderMeasure = useCallback((startTime: number, componentName?: string) => {
    const renderTime = performance.now() - startTime;
    
    setMetrics(prev => {
      const newRenderCount = prev.renderCount + 1;
      const newAverageRenderTime = ((prev.averageRenderTime * (newRenderCount - 1)) + renderTime) / newRenderCount;
      
      return {
        renderCount: newRenderCount,
        lastRenderTime: renderTime,
        averageRenderTime: newAverageRenderTime,
        memoryUsage: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0
      };
    });

    // Log slow renders in debug mode
    if (globalErrorHandler.getDebugMode() && renderTime > 100) {
      console.warn(`🐌 Slow render detected: ${componentName || 'Unknown component'} took ${renderTime.toFixed(2)}ms`);
    }

    return renderTime;
  }, []);

  const measureAsync = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    label?: string
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await asyncFn();
      const duration = performance.now() - startTime;
      
      if (globalErrorHandler.getDebugMode()) {
        console.log(`⏱️ ${label || 'Async operation'} completed in ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      if (globalErrorHandler.getDebugMode()) {
        console.error(`❌ ${label || 'Async operation'} failed after ${duration.toFixed(2)}ms:`, error);
      }
      
      throw error;
    }
  }, []);

  return {
    metrics,
    startRenderMeasure,
    endRenderMeasure,
    measureAsync
  };
}

/**
 * Component-level debug wrapper
 */
export function useComponentDebug(componentName: string) {
  const { logDebugInfo, isDebugMode } = useDebug();
  const { startRenderMeasure, endRenderMeasure } = usePerformanceMonitor();

  useEffect(() => {
    if (isDebugMode) {
      const startTime = startRenderMeasure();
      
      return () => {
        endRenderMeasure(startTime, componentName);
      };
    }
  });

  const logProps = useCallback((props: any) => {
    logDebugInfo(`${componentName} Props`, props);
  }, [componentName, logDebugInfo]);

  const logState = useCallback((state: any) => {
    logDebugInfo(`${componentName} State`, state);
  }, [componentName, logDebugInfo]);

  const logEffect = useCallback((effectName: string, dependencies?: any[]) => {
    logDebugInfo(`${componentName} Effect: ${effectName}`, { dependencies });
  }, [componentName, logDebugInfo]);

  return {
    logProps,
    logState,
    logEffect,
    isDebugMode
  };
}