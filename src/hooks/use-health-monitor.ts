import { useState, useEffect, useCallback } from "react";
import { healthMonitor, type SystemHealth, type HealthResult } from "@/lib/health-monitor";

/**
 * Hook for monitoring system health
 */
export function useHealthMonitor(autoStart = true, interval = 30000) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    // Subscribe to health updates
    const unsubscribe = healthMonitor.subscribe((newHealth) => {
      setHealth(newHealth);
      setLastCheck(newHealth.lastCheck);
    });

    // Get initial health status
    const initialHealth = healthMonitor.getLastResults();
    if (initialHealth) {
      setHealth(initialHealth);
      setLastCheck(initialHealth.lastCheck);
    }

    // Auto-start monitoring if requested
    if (autoStart) {
      startMonitoring();
    }

    return () => {
      unsubscribe();
      if (isMonitoring) {
        healthMonitor.stopMonitoring();
      }
    };
  }, [autoStart, interval]);

  const startMonitoring = useCallback(() => {
    healthMonitor.startMonitoring(interval);
    setIsMonitoring(true);
  }, [interval]);

  const stopMonitoring = useCallback(() => {
    healthMonitor.stopMonitoring();
    setIsMonitoring(false);
  }, []);

  const runHealthCheck = useCallback(async (checkName?: string) => {
    if (checkName) {
      return await healthMonitor.runCheck(checkName);
    } else {
      return await healthMonitor.runAllChecks();
    }
  }, []);

  const getHealthStatus = useCallback(() => {
    return healthMonitor.getHealthSummary();
  }, []);

  const exportHealthReport = useCallback(() => {
    const report = healthMonitor.exportHealthReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    health,
    isMonitoring,
    lastCheck,
    startMonitoring,
    stopMonitoring,
    runHealthCheck,
    getHealthStatus,
    exportHealthReport,
    // Computed properties
    isHealthy: health?.overall === 'healthy',
    hasWarnings: health?.overall === 'warning',
    hasCriticalIssues: health?.overall === 'critical',
    uptime: health?.uptime || 0,
    checkResults: health?.checks || {}
  };
}

/**
 * Hook for individual health check monitoring
 */
export function useHealthCheck(checkName: string, autoRun = true) {
  const [result, setResult] = useState<HealthResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runCheck = useCallback(async () => {
    setIsRunning(true);
    try {
      const checkResult = await healthMonitor.runCheck(checkName);
      setResult(checkResult);
      setLastRun(new Date());
      return checkResult;
    } catch (error: any) {
      const errorResult: HealthResult = {
        status: 'critical',
        message: `Failed to run health check: ${error?.message || String(error)}`,
        timestamp: new Date()
      };
      setResult(errorResult);
      setLastRun(new Date());
      return errorResult;
    } finally {
      setIsRunning(false);
    }
  }, [checkName]);

  useEffect(() => {
    if (autoRun) {
      runCheck();
    }
  }, [autoRun, runCheck]);

  return {
    result,
    isRunning,
    lastRun,
    runCheck,
    // Computed properties
    isHealthy: result?.status === 'healthy',
    hasWarning: result?.status === 'warning',
    hasCriticalIssue: result?.status === 'critical',
    isUnknown: result?.status === 'unknown',
    responseTime: result?.responseTime
  };
}

/**
 * Hook for critical system checks
 */
export function useCriticalSystemChecks() {
  const { health, runHealthCheck } = useHealthMonitor();
  
  const getCriticalIssues = useCallback(() => {
    if (!health) return [];
    
    return Object.entries(health.checks)
      .filter(([name, result]) => result.status === 'critical')
      .map(([name, result]) => ({
        name,
        message: result.message,
        details: result.details
      }));
  }, [health]);

  const getRequiredSystemStatus = useCallback(() => {
    if (!health) return null;
    
    const requiredChecks = ['pyodide', 'pygame', 'api'];
    const results = requiredChecks.map(name => ({
      name,
      result: health.checks[name] || null
    }));
    
    return results;
  }, [health]);

  const hasSystemFailures = useCallback(() => {
    const criticalIssues = getCriticalIssues();
    const requiredStatus = getRequiredSystemStatus();
    
    return criticalIssues.length > 0 || 
           requiredStatus?.some(check => check.result?.status === 'critical');
  }, [getCriticalIssues, getRequiredSystemStatus]);

  return {
    criticalIssues: getCriticalIssues(),
    requiredSystemStatus: getRequiredSystemStatus(),
    hasSystemFailures: hasSystemFailures(),
    runSystemCheck: runHealthCheck,
    isSystemHealthy: health?.overall === 'healthy'
  };
}

/**
 * Hook for performance-specific health monitoring
 */
export function usePerformanceHealth() {
  const { health } = useHealthMonitor();
  
  const getPerformanceMetrics = useCallback(() => {
    const performanceCheck = health?.checks['performance'];
    const memoryCheck = health?.checks['memory'];
    
    return {
      performance: performanceCheck?.details || null,
      memory: memoryCheck?.details || null,
      overallStatus: performanceCheck?.status || 'unknown'
    };
  }, [health]);

  const getPerformanceIssues = useCallback(() => {
    const metrics = getPerformanceMetrics();
    const issues: string[] = [];
    
    if (metrics.performance?.apiResponseTime > 2000) {
      issues.push('Slow API responses detected');
    }
    
    if (metrics.performance?.errorRate > 5) {
      issues.push('High error rate detected');
    }
    
    if (metrics.memory?.percentage > 80) {
      issues.push('High memory usage detected');
    }
    
    return issues;
  }, [getPerformanceMetrics]);

  const getPerformanceRecommendations = useCallback(() => {
    const issues = getPerformanceIssues();
    const recommendations: string[] = [];
    
    if (issues.includes('Slow API responses detected')) {
      recommendations.push('Check network connection or contact support');
    }
    
    if (issues.includes('High error rate detected')) {
      recommendations.push('Review recent actions and check for recurring issues');
    }
    
    if (issues.includes('High memory usage detected')) {
      recommendations.push('Close unused browser tabs or restart the application');
    }
    
    return recommendations;
  }, [getPerformanceIssues]);

  return {
    metrics: getPerformanceMetrics(),
    issues: getPerformanceIssues(),
    recommendations: getPerformanceRecommendations(),
    hasPerformanceIssues: getPerformanceIssues().length > 0
  };
}