/**
 * Structured Console Logging System for Pixel's PyGame Palace
 * Provides leveled logging with filtering and educational context
 */

declare global {
  interface Window {
    __trackError?: Function;
  }
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';
export type LogCategory =
  | 'system'
  | 'python'
  | 'pygame'
  | 'user'
  | 'network'
  | 'performance'
  | 'ui';

export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  timestamp: Date;
  data?: any;
  context?: string;
  userId?: string;
  sessionId: string;
}

class ConsoleLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private sessionId: string;
  private enabledLevels: Set<LogLevel> = new Set<LogLevel>(['info', 'warn', 'error', 'success']);
  private enabledCategories: Set<LogCategory> = new Set<LogCategory>([
    'system',
    'python',
    'pygame',
    'user',
    'network',
    'performance',
    'ui',
  ]);
  private isDebugMode = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeFromEnvironment();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeFromEnvironment() {
    // Enable debug mode in development or when explicitly enabled
    this.isDebugMode = import.meta.env.DEV || localStorage.getItem('pygame-debug') === 'true';

    if (this.isDebugMode) {
      this.enabledLevels.add('debug');
    }

    // Load saved log preferences
    try {
      const savedLevels = localStorage.getItem('pygame-log-levels');
      if (savedLevels) {
        this.enabledLevels = new Set(JSON.parse(savedLevels) as LogLevel[]);
      }

      const savedCategories = localStorage.getItem('pygame-log-categories');
      if (savedCategories) {
        this.enabledCategories = new Set(JSON.parse(savedCategories) as LogCategory[]);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    return this.enabledLevels.has(level) && this.enabledCategories.has(category);
  }

  private formatMessage(level: LogLevel, category: LogCategory, message: string): string {
    const timestamp = new Date().toLocaleTimeString();
    const levelIcon = this.getLevelIcon(level);
    const categoryIcon = this.getCategoryIcon(category);

    return `${levelIcon} ${categoryIcon} [${timestamp}] ${message}`;
  }

  private getLevelIcon(level: LogLevel): string {
    switch (level) {
      case 'debug':
        return '🔍';
      case 'info':
        return 'ℹ️';
      case 'warn':
        return '⚠️';
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      default:
        return '📝';
    }
  }

  private getCategoryIcon(category: LogCategory): string {
    switch (category) {
      case 'system':
        return '⚙️';
      case 'python':
        return '🐍';
      case 'pygame':
        return '🎮';
      case 'user':
        return '👤';
      case 'network':
        return '🌐';
      case 'performance':
        return '⚡';
      case 'ui':
        return '🎨';
      default:
        return '📦';
    }
  }

  private getConsoleMethod(level: LogLevel): 'debug' | 'log' | 'warn' | 'error' {
    switch (level) {
      case 'debug':
        return 'debug';
      case 'info':
        return 'log';
      case 'success':
        return 'log';
      case 'warn':
        return 'warn';
      case 'error':
        return 'error';
      default:
        return 'log';
    }
  }

  private addToHistory(entry: LogEntry) {
    this.logs.unshift(entry);

    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  // Main logging method
  log(level: LogLevel, category: LogCategory, message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      level,
      category,
      message,
      timestamp: new Date(),
      data,
      context,
      sessionId: this.sessionId,
    };

    this.addToHistory(entry);

    if (!this.shouldLog(level, category)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, category, message);
    const consoleMethod = this.getConsoleMethod(level);

    if (data) {
      console[consoleMethod](formattedMessage, data);
    } else {
      console[consoleMethod](formattedMessage);
    }

    // Special handling for errors
    if (level === 'error' && window.__trackError) {
      window.__trackError({
        type: 'custom',
        error: message,
        timestamp: entry.timestamp.toISOString(),
        level: 'error',
        context: `${category}${context ? ` - ${context}` : ''}`,
        errorId: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        handled: true,
      });
    }
  }

  // Convenience methods for each level
  debug(category: LogCategory, message: string, data?: any, context?: string) {
    this.log('debug', category, message, data, context);
  }

  info(category: LogCategory, message: string, data?: any, context?: string) {
    this.log('info', category, message, data, context);
  }

  warn(category: LogCategory, message: string, data?: any, context?: string) {
    this.log('warn', category, message, data, context);
  }

  error(category: LogCategory, message: string, data?: any, context?: string) {
    this.log('error', category, message, data, context);
  }

  success(category: LogCategory, message: string, data?: any, context?: string) {
    this.log('success', category, message, data, context);
  }

  // Category-specific convenience methods
  system = {
    debug: (message: string, data?: any, context?: string) =>
      this.debug('system', message, data, context),
    info: (message: string, data?: any, context?: string) =>
      this.info('system', message, data, context),
    warn: (message: string, data?: any, context?: string) =>
      this.warn('system', message, data, context),
    error: (message: string, data?: any, context?: string) =>
      this.error('system', message, data, context),
    success: (message: string, data?: any, context?: string) =>
      this.success('system', message, data, context),
  };

  python = {
    debug: (message: string, data?: any, context?: string) =>
      this.debug('python', message, data, context),
    info: (message: string, data?: any, context?: string) =>
      this.info('python', message, data, context),
    warn: (message: string, data?: any, context?: string) =>
      this.warn('python', message, data, context),
    error: (message: string, data?: any, context?: string) =>
      this.error('python', message, data, context),
    success: (message: string, data?: any, context?: string) =>
      this.success('python', message, data, context),
  };

  pygame = {
    debug: (message: string, data?: any, context?: string) =>
      this.debug('pygame', message, data, context),
    info: (message: string, data?: any, context?: string) =>
      this.info('pygame', message, data, context),
    warn: (message: string, data?: any, context?: string) =>
      this.warn('pygame', message, data, context),
    error: (message: string, data?: any, context?: string) =>
      this.error('pygame', message, data, context),
    success: (message: string, data?: any, context?: string) =>
      this.success('pygame', message, data, context),
  };

  user = {
    debug: (message: string, data?: any, context?: string) =>
      this.debug('user', message, data, context),
    info: (message: string, data?: any, context?: string) =>
      this.info('user', message, data, context),
    warn: (message: string, data?: any, context?: string) =>
      this.warn('user', message, data, context),
    error: (message: string, data?: any, context?: string) =>
      this.error('user', message, data, context),
    success: (message: string, data?: any, context?: string) =>
      this.success('user', message, data, context),
  };

  network = {
    debug: (message: string, data?: any, context?: string) =>
      this.debug('network', message, data, context),
    info: (message: string, data?: any, context?: string) =>
      this.info('network', message, data, context),
    warn: (message: string, data?: any, context?: string) =>
      this.warn('network', message, data, context),
    error: (message: string, data?: any, context?: string) =>
      this.error('network', message, data, context),
    success: (message: string, data?: any, context?: string) =>
      this.success('network', message, data, context),
  };

  performance = {
    debug: (message: string, data?: any, context?: string) =>
      this.debug('performance', message, data, context),
    info: (message: string, data?: any, context?: string) =>
      this.info('performance', message, data, context),
    warn: (message: string, data?: any, context?: string) =>
      this.warn('performance', message, data, context),
    error: (message: string, data?: any, context?: string) =>
      this.error('performance', message, data, context),
    success: (message: string, data?: any, context?: string) =>
      this.success('performance', message, data, context),
  };

  ui = {
    debug: (message: string, data?: any, context?: string) =>
      this.debug('ui', message, data, context),
    info: (message: string, data?: any, context?: string) =>
      this.info('ui', message, data, context),
    warn: (message: string, data?: any, context?: string) =>
      this.warn('ui', message, data, context),
    error: (message: string, data?: any, context?: string) =>
      this.error('ui', message, data, context),
    success: (message: string, data?: any, context?: string) =>
      this.success('ui', message, data, context),
  };

  // Configuration methods
  setDebugMode(enabled: boolean) {
    this.isDebugMode = enabled;
    if (enabled) {
      this.enabledLevels.add('debug');
      localStorage.setItem('pygame-debug', 'true');
    } else {
      this.enabledLevels.delete('debug');
      localStorage.removeItem('pygame-debug');
    }
    this.savePreferences();
  }

  setEnabledLevels(levels: LogLevel[]) {
    this.enabledLevels = new Set(levels);
    this.savePreferences();
  }

  setEnabledCategories(categories: LogCategory[]) {
    this.enabledCategories = new Set(categories);
    this.savePreferences();
  }

  enableLevel(level: LogLevel) {
    this.enabledLevels.add(level);
    this.savePreferences();
  }

  disableLevel(level: LogLevel) {
    this.enabledLevels.delete(level);
    this.savePreferences();
  }

  enableCategory(category: LogCategory) {
    this.enabledCategories.add(category);
    this.savePreferences();
  }

  disableCategory(category: LogCategory) {
    this.enabledCategories.delete(category);
    this.savePreferences();
  }

  private savePreferences() {
    try {
      localStorage.setItem('pygame-log-levels', JSON.stringify(Array.from(this.enabledLevels)));
      localStorage.setItem(
        'pygame-log-categories',
        JSON.stringify(Array.from(this.enabledCategories))
      );
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  // Utility methods
  getLogs(filter?: { level?: LogLevel; category?: LogCategory; limit?: number }): LogEntry[] {
    let filtered = this.logs;

    if (filter?.level) {
      filtered = filtered.filter((log) => log.level === filter.level);
    }

    if (filter?.category) {
      filtered = filtered.filter((log) => log.category === filter.category);
    }

    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  getRecentLogs(minutes: number = 5): LogEntry[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter((log) => log.timestamp > cutoff);
  }

  clearLogs() {
    this.logs = [];
    this.info('system', 'Log history cleared');
  }

  exportLogs(): string {
    const exportData = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      logs: this.logs,
      config: {
        enabledLevels: Array.from(this.enabledLevels),
        enabledCategories: Array.from(this.enabledCategories),
        isDebugMode: this.isDebugMode,
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Performance timing utilities
  time(label: string, category: LogCategory = 'performance'): () => void {
    const startTime = performance.now();
    this.debug(category, `Timer started: ${label}`);

    return () => {
      const duration = performance.now() - startTime;
      this.info(category, `Timer completed: ${label} (${duration.toFixed(2)}ms)`, { duration });
    };
  }

  // Group logging for related operations
  group(title: string, category: LogCategory = 'system') {
    if (this.shouldLog('info', category)) {
      console.group(this.formatMessage('info', category, title));
    }
  }

  groupEnd() {
    console.groupEnd();
  }

  // Configuration getters
  getConfig() {
    return {
      enabledLevels: Array.from(this.enabledLevels),
      enabledCategories: Array.from(this.enabledCategories),
      isDebugMode: this.isDebugMode,
      sessionId: this.sessionId,
      totalLogs: this.logs.length,
    };
  }
}

// Create and export global logger instance
export const logger = new ConsoleLogger();

// Make logger available globally in development
if (import.meta.env.DEV) {
  (window as any).__logger = logger;
}

// Educational logging helpers
export const educationalLogger = {
  studentProgress: (lesson: string, step: string, success: boolean) => {
    if (success) {
      logger.success('user', `Lesson progress: ${lesson} - ${step} completed`);
    } else {
      logger.info('user', `Lesson progress: ${lesson} - ${step} attempted`);
    }
  },

  codeExecution: (success: boolean, executionTime?: number) => {
    if (success) {
      logger.success(
        'python',
        `Code executed successfully${executionTime ? ` in ${executionTime}ms` : ''}`
      );
    } else {
      logger.warn('python', 'Code execution failed');
    }
  },

  gameInteraction: (action: string, details?: any) => {
    logger.info('pygame', `Game interaction: ${action}`, details);
  },

  learningMilestone: (milestone: string, context?: string) => {
    logger.success('user', `Learning milestone: ${milestone}`, null, context);
  },
};

export default logger;
