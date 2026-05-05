/**
 * Global Error Handling System for Pixel's PyGame Palace
 * Provides comprehensive error tracking, logging, and reporting
 */

export interface GlobalError {
  type: 'javascript' | 'promise' | 'react-error' | 'network' | 'python' | 'custom';
  error: string;
  stack?: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  timestamp: string;
  userAgent?: string;
  level: 'error' | 'warning' | 'info';
  context?: string;
  errorId?: string;
  componentStack?: string;
  handled?: boolean;
}

export interface ErrorTracker {
  track: (error: GlobalError) => void;
  getErrors: () => GlobalError[];
  clearErrors: () => void;
  getErrorsForType: (type: string) => GlobalError[];
  getRecentErrors: (limit?: number) => GlobalError[];
}

class GlobalErrorHandler {
  private errors: GlobalError[] = [];
  private maxErrors = 100;
  private isInitialized = false;
  private listeners: Set<(error: GlobalError) => void> = new Set();
  private debugMode = false;

  constructor() {
    // Enable debug mode in development or when explicitly enabled
    this.debugMode = import.meta.env.DEV || localStorage.getItem('pygame-debug') === 'true';
  }

  initialize() {
    if (this.isInitialized) return;

    // Handle uncaught JavaScript errors
    window.addEventListener('error', this.handleJavaScriptError.bind(this));

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));

    // Add global error tracking function for Error Boundaries and other components
    (window as any).__trackError = this.track.bind(this);

    // Handle visibility change to persist errors before tab close
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Override console.error to capture application errors
    if (this.debugMode) {
      this.setupConsoleInterception();
    }

    this.isInitialized = true;

    if (this.debugMode) {
      console.log('🛡️ Global Error Handler initialized in debug mode');
    }
  }

  private handleJavaScriptError(event: ErrorEvent) {
    const error: GlobalError = {
      type: 'javascript',
      error: event.message,
      stack: event.error?.stack,
      url: event.filename,
      lineNumber: event.lineno,
      columnNumber: event.colno,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      level: 'error',
      context: 'Global JavaScript Error',
      errorId: this.generateErrorId(),
      handled: false,
    };

    this.track(error);

    // Show user-friendly error in debug mode
    if (this.debugMode) {
      console.group('🔴 Uncaught JavaScript Error');
      console.error('Error:', event.message);
      console.error('File:', event.filename);
      console.error('Line:', event.lineno, 'Column:', event.colno);
      console.error('Stack:', event.error?.stack);
      console.groupEnd();
    }

    // Prevent default browser error handling for educational experience
    return true;
  }

  private handlePromiseRejection(event: PromiseRejectionEvent) {
    const error: GlobalError = {
      type: 'promise',
      error: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      level: 'error',
      context: 'Unhandled Promise Rejection',
      errorId: this.generateErrorId(),
      handled: false,
    };

    this.track(error);

    if (this.debugMode) {
      console.group('🟡 Unhandled Promise Rejection');
      console.error('Reason:', event.reason);
      console.groupEnd();
    }

    // Prevent default logging
    event.preventDefault();
  }

  private handleVisibilityChange() {
    if (document.hidden && this.errors.length > 0) {
      // Persist errors to localStorage before tab close
      this.persistErrors();
    }
  }

  private setupConsoleInterception() {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      // Track console.error calls as potential application errors
      const errorMessage = args
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' ');

      if (!errorMessage.includes('Error Boundary') && !errorMessage.includes('React error')) {
        const error: GlobalError = {
          type: 'custom',
          error: errorMessage,
          timestamp: new Date().toISOString(),
          level: 'error',
          context: 'Console Error',
          errorId: this.generateErrorId(),
          handled: true,
        };

        this.track(error);
      }

      // Call original console.error
      originalError.apply(console, args);
    };
  }

  track(error: GlobalError) {
    // Add error to collection
    this.errors.unshift(error);

    // Maintain max errors limit
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(error);
      } catch (e) {
        console.warn('Error in error listener:', e);
      }
    });

    // Log to console in debug mode
    if (this.debugMode) {
      const icon = this.getErrorIcon(error.type);
      console.log(`${icon} [${error.type.toUpperCase()}] ${error.error}`, error);
    }

    // Persist critical errors immediately
    if (error.level === 'error' && !error.handled) {
      this.persistErrors();
    }
  }

  private getErrorIcon(type: string): string {
    switch (type) {
      case 'javascript':
        return '🔴';
      case 'promise':
        return '🟡';
      case 'react-error':
        return '⚛️';
      case 'network':
        return '🌐';
      case 'python':
        return '🐍';
      default:
        return '❌';
    }
  }

  private generateErrorId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private persistErrors() {
    try {
      const criticalErrors = this.errors.filter((error) => error.level === 'error').slice(0, 10); // Only persist last 10 critical errors

      localStorage.setItem('pygame-errors', JSON.stringify(criticalErrors));
    } catch (e) {
      console.warn('Failed to persist errors:', e);
    }
  }

  // Public API
  getErrors(): GlobalError[] {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
    localStorage.removeItem('pygame-errors');

    if (this.debugMode) {
      console.log('🧹 Cleared all tracked errors');
    }
  }

  getErrorsForType(type: string): GlobalError[] {
    return this.errors.filter((error) => error.type === type);
  }

  getRecentErrors(limit = 10): GlobalError[] {
    return this.errors.slice(0, limit);
  }

  getCriticalErrors(): GlobalError[] {
    return this.errors.filter((error) => error.level === 'error');
  }

  subscribe(listener: (error: GlobalError) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
    if (enabled) {
      localStorage.setItem('pygame-debug', 'true');
      console.log('🐛 Debug mode enabled');
    } else {
      localStorage.removeItem('pygame-debug');
      console.log('🐛 Debug mode disabled');
    }
  }

  getDebugMode(): boolean {
    return this.debugMode;
  }

  // Error recovery helpers
  isRecoverableError(error: GlobalError): boolean {
    const recoverablePatterns = [
      'chunk load failed',
      'loading chunk',
      'network',
      'fetch failed',
      'timeout',
    ];

    return recoverablePatterns.some((pattern) => error.error.toLowerCase().includes(pattern));
  }

  getRecoveryActions(error: GlobalError): string[] {
    if (error.error.toLowerCase().includes('chunk load failed')) {
      return ['Refresh the page', 'Check your internet connection'];
    }

    if (error.error.toLowerCase().includes('network')) {
      return ['Check your internet connection', 'Try again in a moment'];
    }

    if (error.error.toLowerCase().includes('permission')) {
      return ['Check browser permissions', 'Refresh the page'];
    }

    return ['Refresh the page', 'Contact support if problem persists'];
  }

  // Health check
  getErrorStats() {
    const stats = {
      total: this.errors.length,
      byType: {} as Record<string, number>,
      byLevel: {} as Record<string, number>,
      recentCount: this.errors.filter(
        (e) => Date.now() - new Date(e.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
      ).length,
    };

    this.errors.forEach((error) => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.byLevel[error.level] = (stats.byLevel[error.level] || 0) + 1;
    });

    return stats;
  }
}

// Create and export global instance
export const globalErrorHandler = new GlobalErrorHandler();

// Initialize immediately in browser environment
if (typeof window !== 'undefined') {
  globalErrorHandler.initialize();
}

// Export error tracker interface for components
export const errorTracker: ErrorTracker = {
  track: (error: GlobalError) => globalErrorHandler.track(error),
  getErrors: () => globalErrorHandler.getErrors(),
  clearErrors: () => globalErrorHandler.clearErrors(),
  getErrorsForType: (type: string) => globalErrorHandler.getErrorsForType(type),
  getRecentErrors: (limit?: number) => globalErrorHandler.getRecentErrors(limit),
};

// Utility functions for common error patterns
export function trackNetworkError(error: Error, context: string) {
  globalErrorHandler.track({
    type: 'network',
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    level: 'error',
    context,
    errorId: `net-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    handled: true,
  });
}

export function trackCustomError(
  message: string,
  context: string,
  level: 'error' | 'warning' | 'info' = 'error'
) {
  globalErrorHandler.track({
    type: 'custom',
    error: message,
    timestamp: new Date().toISOString(),
    level,
    context,
    errorId: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    handled: true,
  });
}

// Export debug utilities for development
export const debugUtils = {
  enableDebugMode: () => globalErrorHandler.setDebugMode(true),
  disableDebugMode: () => globalErrorHandler.setDebugMode(false),
  getErrorStats: () => globalErrorHandler.getErrorStats(),
  triggerTestError: () => {
    throw new Error('Test error from debug utils');
  },
  triggerTestPromiseRejection: () => {
    Promise.reject(new Error('Test promise rejection from debug utils'));
  },
};

// Make debug utils available globally in development
if (import.meta.env.DEV) {
  (window as any).__debugUtils = debugUtils;
  (window as any).__errorHandler = globalErrorHandler;
}
