/**
 * Health Monitoring System for Pixel's PyGame Palace
 * Monitors critical platform components and provides health status
 */

import { logger } from "./console-logger";
import { performanceMonitor } from "./performance-monitor";

export interface HealthCheck {
  name: string;
  description: string;
  check: () => Promise<HealthResult>;
  required: boolean;
  timeout?: number;
}

export interface HealthResult {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  responseTime?: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  checks: Record<string, HealthResult>;
  lastCheck: Date;
  uptime: number;
}

class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();
  private lastResults: Map<string, HealthResult> = new Map();
  private checkInterval: number | null = null;
  private startTime = Date.now();
  private observers: Set<(health: SystemHealth) => void> = new Set();

  constructor() {
    this.setupDefaultChecks();
  }

  private setupDefaultChecks() {
    // Pyodide Runtime Health Check
    this.addCheck({
      name: 'pyodide',
      description: 'Python runtime availability',
      required: true,
      timeout: 5000,
      check: async () => {
        try {
          const startTime = performance.now();
          
          // Check if pyodide is globally available
          if (typeof (window as any).loadPyodide === 'undefined') {
            return {
              status: 'critical',
              message: 'Pyodide loader not available',
              timestamp: new Date(),
              responseTime: performance.now() - startTime
            };
          }

          // Check if pyodide instance exists
          const pyodideInstance = (window as any).pyodide;
          if (!pyodideInstance) {
            return {
              status: 'warning',
              message: 'Pyodide not initialized',
              timestamp: new Date(),
              responseTime: performance.now() - startTime
            };
          }

          // Test basic Python execution
          try {
            await pyodideInstance.runPython('1 + 1');
            return {
              status: 'healthy',
              message: 'Pyodide runtime working correctly',
              timestamp: new Date(),
              responseTime: performance.now() - startTime
            };
          } catch (error: any) {
            return {
              status: 'critical',
              message: `Pyodide execution failed: ${error?.message || String(error)}`,
              details: { error: error?.message || String(error) },
              timestamp: new Date(),
              responseTime: performance.now() - startTime
            };
          }
        } catch (error: any) {
          return {
            status: 'critical',
            message: `Pyodide health check failed: ${error?.message || String(error)}`,
            details: { error: error?.message || String(error) },
            timestamp: new Date()
          };
        }
      }
    });

    // Pygame Shim Health Check
    this.addCheck({
      name: 'pygame',
      description: 'Pygame shim functionality',
      required: true,
      timeout: 3000,
      check: async () => {
        try {
          const startTime = performance.now();
          const pyodideInstance = (window as any).pyodide;
          
          if (!pyodideInstance) {
            return {
              status: 'critical',
              message: 'Cannot check pygame - Pyodide not available',
              timestamp: new Date(),
              responseTime: performance.now() - startTime
            };
          }

          try {
            // Test pygame import and basic functionality
            await pyodideInstance.runPython(`
import pygame
pygame.init()
screen = pygame.display.set_mode((100, 100))
pygame.quit()
`);
            return {
              status: 'healthy',
              message: 'Pygame shim working correctly',
              timestamp: new Date(),
              responseTime: performance.now() - startTime
            };
          } catch (error: any) {
            return {
              status: 'critical',
              message: `Pygame shim failed: ${error?.message || String(error)}`,
              details: { error: error?.message || String(error) },
              timestamp: new Date(),
              responseTime: performance.now() - startTime
            };
          }
        } catch (error: any) {
          return {
            status: 'critical',
            message: `Pygame health check failed: ${error?.message || String(error)}`,
            details: { error: error?.message || String(error) },
            timestamp: new Date()
          };
        }
      }
    });

    // API Connectivity Health Check
    this.addCheck({
      name: 'api',
      description: 'Backend API connectivity',
      required: true,
      timeout: 5000,
      check: async () => {
        try {
          const startTime = performance.now();
          
          try {
            const response = await fetch('/api/health', {
              method: 'GET',
              signal: AbortSignal.timeout(3000)
            });
            
            const responseTime = performance.now() - startTime;
            
            if (response.ok) {
              return {
                status: 'healthy',
                message: 'API connectivity good',
                details: { 
                  status: response.status,
                  responseTime: Math.round(responseTime)
                },
                timestamp: new Date(),
                responseTime
              };
            } else {
              return {
                status: 'warning',
                message: `API returned ${response.status}: ${response.statusText}`,
                details: { 
                  status: response.status,
                  statusText: response.statusText,
                  responseTime: Math.round(responseTime)
                },
                timestamp: new Date(),
                responseTime
              };
            }
          } catch (error: any) {
            const responseTime = performance.now() - startTime;
            
            if (error instanceof Error && error.name === 'AbortError') {
              return {
                status: 'critical',
                message: 'API request timeout',
                details: { timeout: true, responseTime: Math.round(responseTime) },
                timestamp: new Date(),
                responseTime
              };
            }
            
            return {
              status: 'critical',
              message: `API connectivity failed: ${error instanceof Error ? error.message : String(error)}`,
              details: { 
                error: error instanceof Error ? error.message : String(error),
                responseTime: Math.round(responseTime)
              },
              timestamp: new Date(),
              responseTime
            };
          }
        } catch (error: any) {
          return {
            status: 'critical',
            message: `API health check failed: ${error?.message || String(error)}`,
            details: { error: error?.message || String(error) },
            timestamp: new Date()
          };
        }
      }
    });

    // Browser Storage Health Check
    this.addCheck({
      name: 'storage',
      description: 'Browser storage availability',
      required: false,
      timeout: 1000,
      check: async () => {
        try {
          const startTime = performance.now();
          
          // Test localStorage
          try {
            const testKey = '__health_check_test__';
            const testValue = 'test_value';
            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            if (retrieved !== testValue) {
              return {
                status: 'warning',
                message: 'localStorage read/write inconsistent',
                timestamp: new Date(),
                responseTime: performance.now() - startTime
              };
            }
          } catch (error: any) {
            return {
              status: 'warning',
              message: `localStorage not available: ${error?.message || String(error)}`,
              details: { error: error?.message || String(error) },
              timestamp: new Date(),
              responseTime: performance.now() - startTime
            };
          }

          // Test sessionStorage
          try {
            const testKey = '__health_check_session_test__';
            const testValue = 'session_test_value';
            sessionStorage.setItem(testKey, testValue);
            const retrieved = sessionStorage.getItem(testKey);
            sessionStorage.removeItem(testKey);
            
            if (retrieved !== testValue) {
              return {
                status: 'warning',
                message: 'sessionStorage read/write inconsistent',
                timestamp: new Date(),
                responseTime: performance.now() - startTime
              };
            }
          } catch (error: any) {
            return {
              status: 'warning',
              message: `sessionStorage not available: ${error?.message || String(error)}`,
              details: { error: error?.message || String(error) },
              timestamp: new Date(),
              responseTime: performance.now() - startTime
            };
          }

          return {
            status: 'healthy',
            message: 'Browser storage working correctly',
            timestamp: new Date(),
            responseTime: performance.now() - startTime
          };
        } catch (error: any) {
          return {
            status: 'warning',
            message: `Storage health check failed: ${error?.message || String(error)}`,
            details: { error: error?.message || String(error) },
            timestamp: new Date()
          };
        }
      }
    });

    // Memory Usage Health Check
    this.addCheck({
      name: 'memory',
      description: 'Browser memory usage',
      required: false,
      timeout: 1000,
      check: async () => {
        try {
          const startTime = performance.now();
          
          // Type-safe check for browser memory API
          const memoryInfo = (performance as any).memory;
          if (!memoryInfo) {
            return {
              status: 'unknown',
              message: 'Memory information not available',
              timestamp: new Date(),
              responseTime: performance.now() - startTime
            };
          }
          const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
          const totalMB = Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024);
          const percentage = Math.round((usedMB / totalMB) * 100);

          let status: HealthResult['status'] = 'healthy';
          let message = `Memory usage: ${usedMB}MB / ${totalMB}MB (${percentage}%)`;

          if (percentage > 90) {
            status = 'critical';
            message = `Critical memory usage: ${percentage}%`;
          } else if (percentage > 75) {
            status = 'warning';
            message = `High memory usage: ${percentage}%`;
          }

          return {
            status,
            message,
            details: {
              usedMB,
              totalMB,
              percentage,
              limitMB: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)
            },
            timestamp: new Date(),
            responseTime: performance.now() - startTime
          };
        } catch (error: any) {
          return {
            status: 'unknown',
            message: `Memory health check failed: ${error?.message || String(error)}`,
            details: { error: error?.message || String(error) },
            timestamp: new Date()
          };
        }
      }
    });

    // Performance Health Check
    this.addCheck({
      name: 'performance',
      description: 'System performance metrics',
      required: false,
      timeout: 2000,
      check: async () => {
        try {
          const startTime = performance.now();
          const stats = performanceMonitor.getStats();
          
          let status: HealthResult['status'] = 'healthy';
          let issues: string[] = [];

          // Check API performance
          if (stats.averageApiResponseTime > 5000) {
            status = 'critical';
            issues.push('Very slow API responses');
          } else if (stats.averageApiResponseTime > 2000) {
            status = 'warning';
            issues.push('Slow API responses');
          }

          // Check error rate
          if (stats.errorRate > 10) {
            status = 'critical';
            issues.push('High error rate');
          } else if (stats.errorRate > 5) {
            status = 'warning';
            issues.push('Elevated error rate');
          }

          // Check component performance
          if (stats.averageComponentRenderTime > 100) {
            status = 'warning';
            issues.push('Slow component rendering');
          }

          const message = issues.length > 0 
            ? `Performance issues: ${issues.join(', ')}`
            : 'Performance metrics are good';

          return {
            status,
            message,
            details: {
              apiResponseTime: Math.round(stats.averageApiResponseTime),
              componentRenderTime: Math.round(stats.averageComponentRenderTime),
              pythonExecutionTime: Math.round(stats.averagePythonExecutionTime),
              errorRate: stats.errorRate
            },
            timestamp: new Date(),
            responseTime: performance.now() - startTime
          };
        } catch (error: any) {
          return {
            status: 'unknown',
            message: `Performance health check failed: ${error?.message || String(error)}`,
            details: { error: error?.message || String(error) },
            timestamp: new Date()
          };
        }
      }
    });
  }

  addCheck(check: HealthCheck) {
    this.checks.set(check.name, check);
    logger.system.debug(`Health check added: ${check.name}`, { check });
  }

  removeCheck(name: string) {
    this.checks.delete(name);
    this.lastResults.delete(name);
    logger.system.debug(`Health check removed: ${name}`);
  }

  async runCheck(name: string): Promise<HealthResult> {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check '${name}' not found`);
    }

    logger.system.debug(`Running health check: ${name}`);

    try {
      const startTime = performance.now();
      
      // Apply timeout
      const timeoutPromise = new Promise<HealthResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Health check timeout: ${name}`));
        }, check.timeout || 5000);
      });

      const result = await Promise.race([
        check.check(),
        timeoutPromise
      ]);

      const responseTime = performance.now() - startTime;
      result.responseTime = responseTime;

      this.lastResults.set(name, result);
      logger.system.info(`Health check completed: ${name}`, { result });
      
      return result;
    } catch (error: any) {
      const result: HealthResult = {
        status: 'critical',
        message: `Health check failed: ${error?.message || String(error)}`,
        details: { error: error?.message || String(error) },
        timestamp: new Date()
      };

      this.lastResults.set(name, result);
      logger.system.error(`Health check failed: ${name}`, { error: error?.message || String(error) });
      
      return result;
    }
  }

  async runAllChecks(): Promise<SystemHealth> {
    logger.system.info('Running all health checks');
    const results: Record<string, HealthResult> = {};
    
    // Run all checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, _check]) => {
      const result = await this.runCheck(name);
      results[name] = result;
      return { name, result };
    });

    await Promise.allSettled(checkPromises);

    // Determine overall health
    let overall: SystemHealth['overall'] = 'healthy';
    
    for (const [name, check] of Array.from(this.checks.entries())) {
      const result = results[name];
      if (!result) continue;

      if (check.required && result.status === 'critical') {
        overall = 'critical';
        break;
      } else if (result.status === 'critical' || result.status === 'warning') {
        overall = 'warning';
      }
    }

    const health: SystemHealth = {
      overall,
      checks: results,
      lastCheck: new Date(),
      uptime: Date.now() - this.startTime
    };

    // Notify observers
    this.notifyObservers(health);
    
    logger.system.info('Health check summary', { overall, checkCount: Object.keys(results).length });
    
    return health;
  }

  getLastResults(): SystemHealth | null {
    if (this.lastResults.size === 0) return null;

    const results: Record<string, HealthResult> = {};
    for (const [name, result] of Array.from(this.lastResults.entries())) {
      results[name] = result;
    }

    let overall: SystemHealth['overall'] = 'healthy';
    for (const [name, check] of Array.from(this.checks.entries())) {
      const result = results[name];
      if (!result) continue;

      if (check.required && result.status === 'critical') {
        overall = 'critical';
        break;
      } else if (result.status === 'critical' || result.status === 'warning') {
        overall = 'warning';
      }
    }

    return {
      overall,
      checks: results,
      lastCheck: new Date(Math.max(...Object.values(results).map(r => r.timestamp.getTime()))),
      uptime: Date.now() - this.startTime
    };
  }

  startMonitoring(intervalMs = 30000) {
    if (this.checkInterval) {
      this.stopMonitoring();
    }

    logger.system.info(`Starting health monitoring with ${intervalMs}ms interval`);
    
    // Run initial check
    this.runAllChecks();
    
    // Set up periodic checks
    this.checkInterval = window.setInterval(() => {
      this.runAllChecks();
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.system.info('Health monitoring stopped');
    }
  }

  subscribe(observer: (health: SystemHealth) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  private notifyObservers(health: SystemHealth) {
    this.observers.forEach(observer => {
      try {
        observer(health);
      } catch (error: any) {
        logger.system.error('Health monitor observer error', { error: error?.message || String(error) });
      }
    });
  }

  getHealthSummary(): string {
    const health = this.getLastResults();
    if (!health) return 'Health status unknown';

    const checkCount = Object.keys(health.checks).length;
    const healthyCount = Object.values(health.checks).filter(r => r.status === 'healthy').length;
    const warningCount = Object.values(health.checks).filter(r => r.status === 'warning').length;
    const criticalCount = Object.values(health.checks).filter(r => r.status === 'critical').length;

    return `Overall: ${health.overall.toUpperCase()} | ${healthyCount}/${checkCount} healthy, ${warningCount} warnings, ${criticalCount} critical`;
  }

  exportHealthReport(): string {
    const health = this.getLastResults();
    const exportData = {
      timestamp: new Date().toISOString(),
      uptime: health?.uptime || 0,
      checks: health?.checks || {},
      overall: health?.overall || 'unknown',
      summary: this.getHealthSummary(),
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// Create global health monitor instance
export const healthMonitor = new HealthMonitor();

// Export convenience functions
export const runHealthCheck = (name: string) => healthMonitor.runCheck(name);
export const runAllHealthChecks = () => healthMonitor.runAllChecks();
export const getSystemHealth = () => healthMonitor.getLastResults();
export const startHealthMonitoring = (interval?: number) => healthMonitor.startMonitoring(interval);
export const stopHealthMonitoring = () => healthMonitor.stopMonitoring();

// Make health monitor available globally in development
if (import.meta.env.DEV) {
  (window as any).__healthMonitor = healthMonitor;
}

export default healthMonitor;