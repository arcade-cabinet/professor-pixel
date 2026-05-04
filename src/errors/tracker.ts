/**
 * Centralized Error Tracking and Logging System for Pixel's PyGame Palace
 * Provides comprehensive error tracking, analytics, and debugging capabilities
 */

import { logger, type LogLevel } from "./console-logger";
import { globalErrorHandler, type GlobalError } from "./global-error-handler";

export interface ErrorContext {
  userId?: string;
  sessionId: string;
  lessonId?: string;
  projectId?: string;
  codeContext?: string;
  userAction?: string;
  timestamp: Date;
  url: string;
  userAgent: string;
}

export interface TrackedError {
  // GlobalError properties
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
  
  // TrackedError specific properties
  id: string;
  errorContext: ErrorContext;
  resolved: boolean;
  resolution?: string;
  resolutionTime?: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'system' | 'user' | 'network' | 'python' | 'platform';
  tags: string[];
  userFeedback?: string;
  reproductionSteps?: string[];
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  lastOccurrence: Date;
  affectedUsers: string[];
  resolution?: string;
}

export interface ErrorAnalytics {
  totalErrors: number;
  errorsByLevel: Record<LogLevel, number>;
  errorsByCategory: Record<string, number>;
  errorsByTime: { hour: number; count: number }[];
  topErrors: ErrorPattern[];
  resolutionRate: number;
  averageResolutionTime: number;
}

class ErrorTracker {
  private trackedErrors: Map<string, TrackedError> = new Map();
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private maxErrors = 1000;
  private sessionId: string;
  private observers: Set<(analytics: ErrorAnalytics) => void> = new Set();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracking() {
    // Subscribe to global error handler
    globalErrorHandler.subscribe((error) => {
      this.trackError(error);
    });

    // Load persisted data
    this.loadPersistedData();
  }

  private loadPersistedData() {
    try {
      const persistedErrors = localStorage.getItem('pygame-tracked-errors');
      if (persistedErrors) {
        const errors = JSON.parse(persistedErrors);
        errors.forEach((error: TrackedError) => {
          // Keep timestamp as string for consistency with GlobalError
          error.errorContext.timestamp = new Date(error.errorContext.timestamp);
          if (error.resolutionTime) {
            error.resolutionTime = new Date(error.resolutionTime);
          }
          this.trackedErrors.set(error.id, error);
        });
      }

      const persistedPatterns = localStorage.getItem('pygame-error-patterns');
      if (persistedPatterns) {
        const patterns = JSON.parse(persistedPatterns);
        patterns.forEach((pattern: ErrorPattern) => {
          pattern.lastOccurrence = new Date(pattern.lastOccurrence);
          this.errorPatterns.set(pattern.pattern, pattern);
        });
      }
    } catch (e: any) {
      logger.system.warn('Failed to load persisted error data', { error: e?.message || String(e) });
    }
  }

  private persistData() {
    try {
      const errorsArray = Array.from(this.trackedErrors.values());
      localStorage.setItem('pygame-tracked-errors', JSON.stringify(errorsArray));

      const patternsArray = Array.from(this.errorPatterns.values());
      localStorage.setItem('pygame-error-patterns', JSON.stringify(patternsArray));
    } catch (e: any) {
      logger.system.warn('Failed to persist error data', { error: e?.message || String(e) });
    }
  }

  private createErrorContext(): ErrorContext {
    return {
      sessionId: this.sessionId,
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
  }

  private determineErrorSeverity(error: GlobalError): TrackedError['severity'] {
    if (error.level === 'error') {
      // Critical errors that break core functionality
      if (error.type === 'javascript' && error.context?.includes('pyodide')) return 'critical';
      if (error.type === 'network' && error.context?.includes('api')) return 'high';
      if (error.type === 'react-error') return 'high';
      return 'medium';
    }
    
    if (error.level === 'warning') return 'low';
    
    return 'medium';
  }

  private categorizeError(error: GlobalError): TrackedError['category'] {
    if (error.type === 'python') return 'python';
    if (error.type === 'network') return 'network';
    if (error.type === 'javascript' || error.type === 'react-error') return 'system';
    if (error.context?.includes('user')) return 'user';
    return 'platform';
  }

  private generateErrorTags(error: GlobalError): string[] {
    const tags: string[] = [error.type, error.level];
    
    if (error.context) {
      if (error.context.includes('pyodide')) tags.push('pyodide');
      if (error.context.includes('pygame')) tags.push('pygame');
      if (error.context.includes('lesson')) tags.push('lesson');
      if (error.context.includes('project')) tags.push('project');
      if (error.context.includes('gallery')) tags.push('gallery');
    }
    
    return tags;
  }

  private extractErrorPattern(error: GlobalError): string {
    // Create a pattern from error message, removing variable parts
    let pattern = error.error;
    
    // Remove numbers, IDs, and timestamps
    pattern = pattern.replace(/\b\d+\b/g, 'N');
    pattern = pattern.replace(/\b[a-f0-9]{8,}\b/g, 'ID');
    pattern = pattern.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP');
    
    // Remove file paths
    pattern = pattern.replace(/\/[^\s]+\.(js|ts|py)/g, '/FILE');
    
    // Remove URLs
    pattern = pattern.replace(/https?:\/\/[^\s]+/g, 'URL');
    
    return pattern;
  }

  trackError(globalError: GlobalError, additionalContext?: Partial<ErrorContext>): string {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const context: ErrorContext = {
      ...this.createErrorContext(),
      ...additionalContext
    };

    const trackedError: TrackedError = {
      // Copy GlobalError properties
      type: globalError.type,
      error: globalError.error,
      stack: globalError.stack,
      url: globalError.url,
      lineNumber: globalError.lineNumber,
      columnNumber: globalError.columnNumber,
      timestamp: globalError.timestamp,
      userAgent: globalError.userAgent,
      level: globalError.level,
      context: globalError.context,
      errorId: globalError.errorId,
      componentStack: globalError.componentStack,
      handled: globalError.handled,
      
      // TrackedError specific properties
      id: errorId,
      errorContext: context,
      resolved: false,
      severity: this.determineErrorSeverity(globalError),
      category: this.categorizeError(globalError),
      tags: this.generateErrorTags(globalError)
    };

    this.trackedErrors.set(errorId, trackedError);

    // Update error patterns
    const pattern = this.extractErrorPattern(globalError);
    const existingPattern = this.errorPatterns.get(pattern);
    
    if (existingPattern) {
      existingPattern.count++;
      existingPattern.lastOccurrence = new Date();
      if (!existingPattern.affectedUsers.includes(context.sessionId)) {
        existingPattern.affectedUsers.push(context.sessionId);
      }
    } else {
      this.errorPatterns.set(pattern, {
        pattern,
        count: 1,
        lastOccurrence: new Date(),
        affectedUsers: [context.sessionId]
      });
    }

    // Maintain max errors limit
    if (this.trackedErrors.size > this.maxErrors) {
      const oldestErrors = Array.from(this.trackedErrors.entries())
        .sort(([, a], [, b]) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(0, this.trackedErrors.size - this.maxErrors);
      
      oldestErrors.forEach(([id]) => this.trackedErrors.delete(id));
    }

    // Persist data
    this.persistData();
    
    // Log the tracked error
    logger.system.info('Error tracked', { 
      errorId, 
      severity: trackedError.severity,
      category: trackedError.category 
    });

    // Notify observers
    this.notifyObservers();

    return errorId;
  }

  resolveError(errorId: string, resolution: string): boolean {
    const error = this.trackedErrors.get(errorId);
    if (!error) return false;

    error.resolved = true;
    error.resolution = resolution;
    error.resolutionTime = new Date();

    this.persistData();
    this.notifyObservers();

    logger.system.success('Error resolved', { errorId, resolution });
    return true;
  }

  addUserFeedback(errorId: string, feedback: string): boolean {
    const error = this.trackedErrors.get(errorId);
    if (!error) return false;

    error.userFeedback = feedback;
    this.persistData();

    logger.user.info('User feedback added to error', { errorId, feedback });
    return true;
  }

  addReproductionSteps(errorId: string, steps: string[]): boolean {
    const error = this.trackedErrors.get(errorId);
    if (!error) return false;

    error.reproductionSteps = steps;
    this.persistData();

    logger.system.info('Reproduction steps added to error', { errorId, stepCount: steps.length });
    return true;
  }

  getError(errorId: string): TrackedError | null {
    return this.trackedErrors.get(errorId) || null;
  }

  getErrors(filter?: {
    category?: TrackedError['category'];
    severity?: TrackedError['severity'];
    resolved?: boolean;
    tags?: string[];
    limit?: number;
  }): TrackedError[] {
    let errors = Array.from(this.trackedErrors.values());

    if (filter?.category) {
      errors = errors.filter(e => e.category === filter.category);
    }

    if (filter?.severity) {
      errors = errors.filter(e => e.severity === filter.severity);
    }

    if (filter?.resolved !== undefined) {
      errors = errors.filter(e => e.resolved === filter.resolved);
    }

    if (filter?.tags) {
      errors = errors.filter(e => filter.tags!.some(tag => e.tags.includes(tag)));
    }

    // Sort by timestamp (newest first)
    errors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filter?.limit) {
      errors = errors.slice(0, filter.limit);
    }

    return errors;
  }

  getErrorPatterns(limit = 10): ErrorPattern[] {
    return Array.from(this.errorPatterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getAnalytics(): ErrorAnalytics {
    const errors = Array.from(this.trackedErrors.values());
    const resolvedErrors = errors.filter(e => e.resolved);

    // Error counts by level
    const errorsByLevel = errors.reduce((acc, error) => {
      // Map GlobalError level to LogLevel
      const logLevel: LogLevel = error.level === 'warning' ? 'warn' : error.level as LogLevel;
      acc[logLevel] = (acc[logLevel] || 0) + 1;
      return acc;
    }, {} as Record<LogLevel, number>);

    // Error counts by category
    const errorsByCategory = errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Errors by hour of day
    const errorsByTime = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: errors.filter(error => new Date(error.timestamp).getHours() === hour).length
    }));

    // Top error patterns
    const topErrors = this.getErrorPatterns(5);

    // Resolution metrics
    const resolutionRate = errors.length > 0 ? (resolvedErrors.length / errors.length) * 100 : 0;
    
    const resolutionTimes = resolvedErrors
      .filter(e => e.resolutionTime)
      .map(e => e.resolutionTime!.getTime() - new Date(e.timestamp).getTime());
    
    const averageResolutionTime = resolutionTimes.length > 0 
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
      : 0;

    return {
      totalErrors: errors.length,
      errorsByLevel,
      errorsByCategory,
      errorsByTime,
      topErrors,
      resolutionRate,
      averageResolutionTime
    };
  }

  exportErrorData(): string {
    const exportData = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      errors: Array.from(this.trackedErrors.values()),
      patterns: Array.from(this.errorPatterns.values()),
      analytics: this.getAnalytics()
    };

    return JSON.stringify(exportData, null, 2);
  }

  clearOldErrors(olderThanDays = 7) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    let removedCount = 0;
    for (const [id, error] of Array.from(this.trackedErrors.entries())) {
      if (new Date(error.timestamp) < cutoff) {
        this.trackedErrors.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.persistData();
      this.notifyObservers();
      logger.system.info(`Cleaned up ${removedCount} old errors`);
    }

    return removedCount;
  }

  subscribe(observer: (analytics: ErrorAnalytics) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  private notifyObservers() {
    const analytics = this.getAnalytics();
    this.observers.forEach(observer => {
      try {
        observer(analytics);
      } catch (e: any) {
        logger.system.error('Error tracker observer failed', { error: e?.message || String(e) });
      }
    });
  }

  // Educational error helpers
  getSimilarErrors(errorMessage: string, limit = 3): TrackedError[] {
    const pattern = this.extractErrorPattern({ error: errorMessage, type: 'custom', level: 'error', timestamp: new Date().toISOString() } as GlobalError);
    
    return this.getErrors({ limit: 50 })
      .filter(error => {
        const errorPattern = this.extractErrorPattern(error);
        return this.calculateSimilarity(pattern, errorPattern) > 0.7;
      })
      .slice(0, limit);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    
    const common = words1.filter(word => words2.includes(word));
    const total = new Set([...words1, ...words2]).size;
    
    return common.length / total;
  }

  getErrorResolutionSuggestions(errorId: string): string[] {
    const error = this.getError(errorId);
    if (!error) return [];

    const suggestions: string[] = [];
    
    // Look for similar resolved errors
    const similarResolved = this.getSimilarErrors(error.error)
      .filter(e => e.resolved && e.resolution);
    
    if (similarResolved.length > 0) {
      suggestions.push(`Similar issue resolved: ${similarResolved[0].resolution}`);
    }

    // Category-specific suggestions
    switch (error.category) {
      case 'python':
        suggestions.push('Check Python syntax and indentation');
        suggestions.push('Verify all variables are defined');
        break;
      case 'network':
        suggestions.push('Check internet connection');
        suggestions.push('Try refreshing the page');
        break;
      case 'system':
        suggestions.push('Try reloading the application');
        suggestions.push('Clear browser cache if issue persists');
        break;
    }

    return suggestions;
  }
}

// Create global error tracker instance
export const errorTracker = new ErrorTracker();

// Export convenience functions
export const trackError = (error: GlobalError, context?: Partial<ErrorContext>) =>
  errorTracker.trackError(error, context);

export const resolveError = (errorId: string, resolution: string) =>
  errorTracker.resolveError(errorId, resolution);

export const getErrorAnalytics = () => errorTracker.getAnalytics();

export const exportErrorData = () => errorTracker.exportErrorData();

// Make error tracker available globally in development
if (import.meta.env.DEV) {
  (window as any).__errorTracker = errorTracker;
}

export default errorTracker;