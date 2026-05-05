/**
 * Performance Monitoring System for Pixel's PyGame Palace
 * Tracks code execution, API calls, component rendering, and system performance
 */

export interface PerformanceMetric {
  id: string;
  name: string;
  type: 'api' | 'component' | 'python' | 'system' | 'custom';
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface PerformanceStats {
  averageApiResponseTime: number;
  averageComponentRenderTime: number;
  averagePythonExecutionTime: number;
  slowestOperations: PerformanceMetric[];
  recentMetrics: PerformanceMetric[];
  errorRate: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private activeMetrics: Map<string, PerformanceMetric> = new Map();
  private maxMetrics = 500;
  private isEnabled = false;
  private observers: Set<(stats: PerformanceStats) => void> = new Set();

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Enable monitoring in development or when explicitly enabled
    this.isEnabled = import.meta.env.DEV || localStorage.getItem('pygame-performance') === 'true';

    if (this.isEnabled) {
      this.setupBrowserPerformanceAPI();
      this.setupNetworkInterception();
    }
  }

  private setupBrowserPerformanceAPI() {
    // Monitor navigation timing
    if (performance.timing) {
      const navigationTiming = performance.timing;
      this.addMetric({
        id: 'navigation',
        name: 'Page Navigation',
        type: 'system',
        startTime: navigationTiming.navigationStart,
        endTime: navigationTiming.loadEventEnd,
        duration: navigationTiming.loadEventEnd - navigationTiming.navigationStart,
        status: 'completed',
        metadata: {
          dns: navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart,
          connection: navigationTiming.connectEnd - navigationTiming.connectStart,
          request: navigationTiming.responseEnd - navigationTiming.requestStart,
          dom: navigationTiming.domContentLoadedEventEnd - navigationTiming.domLoading,
        },
        timestamp: new Date(),
      });
    }

    // Monitor resource loading
    if (performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource');
      resources.forEach((resource: any) => {
        if (resource.duration > 100) {
          // Only track resources that take > 100ms
          this.addMetric({
            id: `resource-${resource.name}`,
            name: resource.name.split('/').pop() || 'Unknown Resource',
            type: 'system',
            startTime: resource.startTime,
            endTime: resource.responseEnd,
            duration: resource.duration,
            status: 'completed',
            metadata: {
              size: resource.transferSize,
              type: resource.initiatorType,
            },
            timestamp: new Date(),
          });
        }
      });
    }
  }

  private setupNetworkInterception() {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const metricId = this.startMetric('api', `API: ${args[0]}`, {
        url: args[0],
        method: args[1]?.method || 'GET',
      });

      try {
        const response = await originalFetch(...args);
        this.endMetric(metricId, response.ok ? 'completed' : 'failed', {
          status: response.status,
          statusText: response.statusText,
        });
        return response;
      } catch (error: unknown) {
        const err = error as Error;
        this.endMetric(metricId, 'failed', { error: err.message });
        throw error;
      }
    };
  }

  private addMetric(metric: PerformanceMetric) {
    this.metrics.unshift(metric);

    // Maintain max metrics limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(0, this.maxMetrics);
    }

    this.notifyObservers();
  }

  private notifyObservers() {
    const stats = this.getStats();
    this.observers.forEach((observer) => {
      try {
        observer(stats);
      } catch (e) {
        console.warn('Error in performance observer:', e);
      }
    });
  }

  // Start tracking a performance metric
  startMetric(
    type: PerformanceMetric['type'],
    name: string,
    metadata?: Record<string, any>
  ): string {
    if (!this.isEnabled) return '';

    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const metric: PerformanceMetric = {
      id,
      name,
      type,
      startTime: performance.now(),
      status: 'running',
      metadata,
      timestamp: new Date(),
    };

    this.activeMetrics.set(id, metric);
    return id;
  }

  // End tracking a performance metric
  endMetric(
    id: string,
    status: 'completed' | 'failed',
    additionalMetadata?: Record<string, any>
  ): number {
    if (!this.isEnabled || !id) return 0;

    const metric = this.activeMetrics.get(id);
    if (!metric) return 0;

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      status,
      metadata: { ...metric.metadata, ...additionalMetadata },
    };

    this.activeMetrics.delete(id);
    this.addMetric(completedMetric);

    return duration;
  }

  // Convenience methods for specific types
  measureComponent(componentName: string, renderFn: () => void): number {
    const metricId = this.startMetric('component', `Component: ${componentName}`);

    try {
      renderFn();
      return this.endMetric(metricId, 'completed');
    } catch (error: unknown) {
      const err = error as Error;
      this.endMetric(metricId, 'failed', { error: err.message });
      throw error;
    }
  }

  async measureAsync<T>(
    type: PerformanceMetric['type'],
    name: string,
    asyncFn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const metricId = this.startMetric(type, name, metadata);

    try {
      const result = await asyncFn();
      this.endMetric(metricId, 'completed');
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      this.endMetric(metricId, 'failed', { error: err.message });
      throw error;
    }
  }

  measurePythonExecution<T>(code: string, executeFn: () => T): T {
    const codePreview = code.slice(0, 50) + (code.length > 50 ? '...' : '');
    const metricId = this.startMetric('python', `Python: ${codePreview}`, {
      codeLength: code.length,
      hasGameLoop: code.includes('while') && code.includes('pygame'),
      hasImports: code.includes('import'),
    });

    try {
      const result = executeFn();
      this.endMetric(metricId, 'completed');
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      this.endMetric(metricId, 'failed', { error: err.message });
      throw error;
    }
  }

  async measurePythonExecutionAsync<T>(code: string, executeFn: () => Promise<T>): Promise<T> {
    const codePreview = code.slice(0, 50) + (code.length > 50 ? '...' : '');
    const metricId = this.startMetric('python', `Python: ${codePreview}`, {
      codeLength: code.length,
      hasGameLoop: code.includes('while') && code.includes('pygame'),
      hasImports: code.includes('import'),
    });

    try {
      const result = await executeFn();
      this.endMetric(metricId, 'completed');
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      this.endMetric(metricId, 'failed', { error: err.message });
      throw error;
    }
  }

  // Timing utilities
  time(label: string, type: PerformanceMetric['type'] = 'custom'): () => number {
    const metricId = this.startMetric(type, label);
    return () => this.endMetric(metricId, 'completed');
  }

  timeAsync<T>(
    label: string,
    asyncFn: () => Promise<T>,
    type: PerformanceMetric['type'] = 'custom'
  ): Promise<T> {
    return this.measureAsync(type, label, asyncFn);
  }

  // Statistics and analysis
  getStats(): PerformanceStats {
    const completedMetrics = this.metrics.filter((m) => m.status === 'completed' && m.duration);
    const failedMetrics = this.metrics.filter((m) => m.status === 'failed');

    const apiMetrics = completedMetrics.filter((m) => m.type === 'api');
    const componentMetrics = completedMetrics.filter((m) => m.type === 'component');
    const pythonMetrics = completedMetrics.filter((m) => m.type === 'python');

    const averageApiResponseTime =
      apiMetrics.length > 0
        ? apiMetrics.reduce((sum, m) => sum + m.duration!, 0) / apiMetrics.length
        : 0;

    const averageComponentRenderTime =
      componentMetrics.length > 0
        ? componentMetrics.reduce((sum, m) => sum + m.duration!, 0) / componentMetrics.length
        : 0;

    const averagePythonExecutionTime =
      pythonMetrics.length > 0
        ? pythonMetrics.reduce((sum, m) => sum + m.duration!, 0) / pythonMetrics.length
        : 0;

    const slowestOperations = completedMetrics
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);

    const recentMetrics = this.metrics.slice(0, 20);

    const errorRate =
      this.metrics.length > 0 ? (failedMetrics.length / this.metrics.length) * 100 : 0;

    return {
      averageApiResponseTime,
      averageComponentRenderTime,
      averagePythonExecutionTime,
      slowestOperations,
      recentMetrics,
      errorRate,
    };
  }

  getMetrics(filter?: {
    type?: PerformanceMetric['type'];
    status?: PerformanceMetric['status'];
    limit?: number;
    minDuration?: number;
  }): PerformanceMetric[] {
    let filtered = this.metrics;

    if (filter?.type) {
      filtered = filtered.filter((m) => m.type === filter.type);
    }

    if (filter?.status) {
      filtered = filtered.filter((m) => m.status === filter.status);
    }

    if (filter?.minDuration) {
      filtered = filtered.filter((m) => (m.duration || 0) >= filter.minDuration!);
    }

    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  getSlowOperations(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics
      .filter((m) => m.status === 'completed' && m.duration && m.duration > threshold)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  // Memory monitoring
  getMemoryUsage(): { used: number; total: number; percentage: number } | null {
    if ('memory' in performance && performance.memory) {
      const used = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
      const total = Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024);
      const percentage = Math.round((used / total) * 100);

      return { used, total, percentage };
    }

    return null;
  }

  // Configuration
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled) {
      localStorage.setItem('pygame-performance', 'true');
      this.setupBrowserPerformanceAPI();
      this.setupNetworkInterception();
    } else {
      localStorage.removeItem('pygame-performance');
    }
  }

  isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }

  // Data management
  clearMetrics() {
    this.metrics = [];
    this.activeMetrics.clear();
    this.notifyObservers();
  }

  exportMetrics(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      stats: this.getStats(),
      memoryUsage: this.getMemoryUsage(),
      config: {
        isEnabled: this.isEnabled,
        maxMetrics: this.maxMetrics,
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Observers for real-time updates
  subscribe(observer: (stats: PerformanceStats) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  // Health checks
  getHealthStatus(): {
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getStats();
    const memoryUsage = this.getMemoryUsage();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check API performance
    if (stats.averageApiResponseTime > 2000) {
      issues.push('Slow API responses detected');
      recommendations.push('Check network connection or API server performance');
    }

    // Check component performance
    if (stats.averageComponentRenderTime > 100) {
      issues.push('Slow component rendering detected');
      recommendations.push('Consider optimizing React components or reducing re-renders');
    }

    // Check Python execution performance
    if (stats.averagePythonExecutionTime > 5000) {
      issues.push('Slow Python code execution detected');
      recommendations.push('Check for infinite loops or optimize Python code');
    }

    // Check memory usage
    if (memoryUsage && memoryUsage.percentage > 80) {
      issues.push('High memory usage detected');
      recommendations.push('Consider clearing browser cache or restarting the application');
    }

    // Check error rate
    if (stats.errorRate > 5) {
      issues.push('High error rate detected');
      recommendations.push('Check error logs and address failing operations');
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

// Create and export global performance monitor
export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions
export const measureComponent = (name: string, renderFn: () => void) =>
  performanceMonitor.measureComponent(name, renderFn);

export const measureAsync = <T>(
  type: PerformanceMetric['type'],
  name: string,
  asyncFn: () => Promise<T>
) => performanceMonitor.measureAsync(type, name, asyncFn);

export const measurePython = <T>(code: string, executeFn: () => T) =>
  performanceMonitor.measurePythonExecution(code, executeFn);

export const measurePythonAsync = <T>(code: string, executeFn: () => Promise<T>) =>
  performanceMonitor.measurePythonExecutionAsync(code, executeFn);

// Make performance monitor available globally in development
if (import.meta.env.DEV) {
  (window as any).__performanceMonitor = performanceMonitor;
}

export default performanceMonitor;
