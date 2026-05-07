import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { educationalLogger, logger } from '@lib/monitoring/console-logger';
import type { LogCategory, LogLevel } from '@lib/monitoring/console-logger';

// ConsoleLogger is a singleton constructed at module-load. Tests share
// the same instance, so each test resets prefs + clears history at the
// boundary. The log methods write to console (via console.log/warn/etc.)
// — those are spied per test to assert routing.

describe('console-logger singleton', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;
  let groupSpy: ReturnType<typeof vi.spyOn>;
  let groupEndSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    // Restore the default level/category set so test order doesn't bleed.
    logger.setEnabledLevels(['info', 'warn', 'error', 'success']);
    logger.setEnabledCategories([
      'system',
      'python',
      'pygame',
      'user',
      'network',
      'performance',
      'ui',
    ]);
    logger.clearLogs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('routing — getConsoleMethod()', () => {
    it('info → console.log', () => {
      logger.info('system', 'hello');
      expect(logSpy).toHaveBeenCalled();
    });

    it('success → console.log', () => {
      logger.success('python', 'ok');
      expect(logSpy).toHaveBeenCalled();
    });

    it('warn → console.warn', () => {
      logger.warn('pygame', 'careful');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('error → console.error', () => {
      logger.error('user', 'boom');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('debug → console.debug (when enabled)', () => {
      logger.setEnabledLevels(['debug', 'info', 'warn', 'error', 'success']);
      logger.debug('ui', 'step');
      expect(debugSpy).toHaveBeenCalled();
    });
  });

  describe('formatMessage embeds level + category icons', () => {
    it.each<[LogLevel, RegExp]>([
      ['info', /ℹ️/],
      ['warn', /⚠️/],
      ['error', /❌/],
      ['success', /✅/],
    ])('level %s embeds its icon', (level, iconRe) => {
      logger.log(level, 'system', 'msg');
      const target = level === 'warn' ? warnSpy : level === 'error' ? errorSpy : logSpy;
      const found = target.mock.calls.some(
        ([first]: unknown[]) => typeof first === 'string' && iconRe.test(first)
      );
      expect(found).toBe(true);
    });

    it.each<[LogCategory, RegExp]>([
      ['system', /⚙️/],
      ['python', /🐍/],
      ['pygame', /🎮/],
      ['user', /👤/],
      ['network', /🌐/],
      ['performance', /⚡/],
      ['ui', /🎨/],
    ])('category %s embeds its icon', (cat, iconRe) => {
      logger.info(cat, 'hi');
      const found = logSpy.mock.calls.some(
        ([first]: unknown[]) => typeof first === 'string' && iconRe.test(first)
      );
      expect(found).toBe(true);
    });
  });

  describe('shouldLog gating', () => {
    it('does not call console when level is disabled', () => {
      logger.setEnabledLevels(['error']); // info disabled
      logSpy.mockClear(); // clearLogs in beforeEach emits a system info — discard.
      logger.info('system', 'shh');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('does not call console when category is disabled', () => {
      logger.setEnabledCategories(['python']); // ui disabled
      logSpy.mockClear();
      logger.info('ui', 'shh');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('still adds to history even when filtered out', () => {
      logger.setEnabledLevels(['error']);
      logger.info('system', 'should be in history');
      const all = logger.getLogs();
      // History grows even when console is silenced.
      expect(all.some((e) => e.message === 'should be in history')).toBe(true);
    });
  });

  describe('data argument handling', () => {
    it('passes data as a second console arg when provided', () => {
      const payload = { x: 1 };
      logger.info('system', 'with-data', payload);
      const callWithPayload = logSpy.mock.calls.find(([, second]: unknown[]) => second === payload);
      expect(callWithPayload).toBeDefined();
    });

    it('omits the data arg when undefined', () => {
      logger.info('system', 'no-data');
      const lastCall = logSpy.mock.calls.at(-1)!;
      // Single-arg call.
      expect(lastCall.length).toBe(1);
    });
  });

  describe('history bookkeeping', () => {
    it('addToHistory pushes most-recent first', () => {
      logger.info('system', 'first');
      logger.info('system', 'second');
      const recent = logger.getLogs({ limit: 2 });
      expect(recent[0].message).toBe('second');
      expect(recent[1].message).toBe('first');
    });

    it('getLogs filters by level', () => {
      logger.info('system', 'i');
      logger.warn('system', 'w');
      logger.error('system', 'e');
      const warns = logger.getLogs({ level: 'warn' });
      expect(warns.every((l) => l.level === 'warn')).toBe(true);
      expect(warns.length).toBeGreaterThan(0);
    });

    it('getLogs filters by category', () => {
      logger.info('python', 'p');
      logger.info('pygame', 'g');
      const py = logger.getLogs({ category: 'python' });
      expect(py.every((l) => l.category === 'python')).toBe(true);
    });

    it('getLogs filters by limit', () => {
      for (let i = 0; i < 10; i++) logger.info('system', `m${i}`);
      const limited = logger.getLogs({ limit: 3 });
      expect(limited).toHaveLength(3);
    });

    it('getRecentLogs returns entries within the time window', () => {
      logger.info('system', 'recent');
      const recents = logger.getRecentLogs(5);
      expect(recents.some((l) => l.message === 'recent')).toBe(true);
    });

    it('clearLogs empties the history (and emits a system info)', () => {
      logger.info('system', 'before');
      logger.clearLogs();
      const after = logger.getLogs();
      // clearLogs internally emits the "Log history cleared" info, so the
      // only entry remaining should be that one.
      expect(after.length).toBe(1);
      expect(after[0].message).toMatch(/Log history cleared/);
    });
  });

  describe('configuration', () => {
    it('setDebugMode(true) adds debug level + persists pygame-debug', () => {
      logger.setDebugMode(true);
      expect(logger.getConfig().isDebugMode).toBe(true);
      expect(logger.getConfig().enabledLevels).toContain('debug');
      expect(localStorage.getItem('pygame-debug')).toBe('true');
    });

    it('setDebugMode(false) removes debug level + clears pygame-debug', () => {
      logger.setDebugMode(true);
      logger.setDebugMode(false);
      expect(logger.getConfig().isDebugMode).toBe(false);
      expect(logger.getConfig().enabledLevels).not.toContain('debug');
      expect(localStorage.getItem('pygame-debug')).toBeNull();
    });

    it('enableLevel + disableLevel toggle a single level', () => {
      logger.disableLevel('info');
      expect(logger.getConfig().enabledLevels).not.toContain('info');
      logger.enableLevel('info');
      expect(logger.getConfig().enabledLevels).toContain('info');
    });

    it('enableCategory + disableCategory toggle a single category', () => {
      logger.disableCategory('ui');
      expect(logger.getConfig().enabledCategories).not.toContain('ui');
      logger.enableCategory('ui');
      expect(logger.getConfig().enabledCategories).toContain('ui');
    });

    it('savePreferences round-trips through localStorage', () => {
      logger.setEnabledLevels(['warn', 'error']);
      const stored = localStorage.getItem('pygame-log-levels');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(expect.arrayContaining(['warn', 'error']));
    });
  });

  describe('exportLogs / getConfig', () => {
    it('exportLogs returns JSON with sessionId, logs, config', () => {
      logger.info('system', 'export-me');
      const out = logger.exportLogs();
      const parsed = JSON.parse(out);
      expect(parsed).toHaveProperty('sessionId');
      expect(parsed).toHaveProperty('logs');
      expect(parsed).toHaveProperty('config');
      expect(parsed.config).toHaveProperty('enabledLevels');
    });

    it('getConfig surfaces the live config snapshot', () => {
      const cfg = logger.getConfig();
      expect(cfg).toHaveProperty('enabledLevels');
      expect(cfg).toHaveProperty('enabledCategories');
      expect(cfg).toHaveProperty('sessionId');
      expect(cfg.sessionId).toMatch(/^session-/);
    });
  });

  describe('time / group', () => {
    it('time() returns a function that, when called, logs the duration', () => {
      const stop = logger.time('boot', 'performance');
      expect(typeof stop).toBe('function');
      stop();
      const recent = logger.getLogs({ limit: 5 });
      expect(recent.some((l) => /Timer completed: boot/.test(l.message))).toBe(true);
    });

    it('group() calls console.group with the formatted title', () => {
      logger.group('section');
      expect(groupSpy).toHaveBeenCalled();
    });

    it('group() does NOT call console.group when info is disabled', () => {
      logger.setEnabledLevels(['error']);
      logger.group('section');
      expect(groupSpy).not.toHaveBeenCalled();
    });

    it('groupEnd() always delegates to console.groupEnd', () => {
      logger.groupEnd();
      expect(groupEndSpy).toHaveBeenCalled();
    });
  });

  describe('error tracking integration', () => {
    it('error-level logs invoke window.__trackError when present', () => {
      const trackError = vi.fn();
      (window as Window & { __trackError?: typeof trackError }).__trackError = trackError;
      logger.error('python', 'crash', null, 'while-running');
      expect(trackError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom',
          error: 'crash',
          level: 'error',
          handled: true,
        })
      );
      delete (window as Window & { __trackError?: typeof trackError }).__trackError;
    });

    it('non-error levels do NOT invoke window.__trackError', () => {
      const trackError = vi.fn();
      (window as Window & { __trackError?: typeof trackError }).__trackError = trackError;
      logger.warn('python', 'careful');
      logger.info('python', 'fyi');
      expect(trackError).not.toHaveBeenCalled();
      delete (window as Window & { __trackError?: typeof trackError }).__trackError;
    });
  });

  describe('per-category convenience methods', () => {
    // Spot-check that each category proxy routes to the right category.
    it.each([
      'system',
      'python',
      'pygame',
      'user',
      'network',
      'performance',
      'ui',
    ] as const)('%s.info() emits an entry under that category', (cat) => {
      const proxy = logger[cat] as { info: (message: string) => void };
      proxy.info(`hi-${cat}`);
      const found = logger.getLogs({ category: cat }).some((l) => l.message === `hi-${cat}`);
      expect(found).toBe(true);
    });
  });
});

describe('educationalLogger helpers', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.clearLogs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('studentProgress(success=true) emits a user-success entry', () => {
    educationalLogger.studentProgress('Loops', 'step-2', true);
    const found = logger.getLogs({ category: 'user' }).some((l) => l.level === 'success');
    expect(found).toBe(true);
  });

  it('studentProgress(success=false) emits a user-info entry', () => {
    educationalLogger.studentProgress('Loops', 'step-2', false);
    const found = logger
      .getLogs({ category: 'user' })
      .some((l) => l.level === 'info' && /attempted/.test(l.message));
    expect(found).toBe(true);
  });

  it('codeExecution(success=true) embeds the executionTime when given', () => {
    educationalLogger.codeExecution(true, 250);
    const recent = logger.getLogs({ category: 'python' });
    expect(recent.some((l) => /250ms/.test(l.message))).toBe(true);
  });

  it('codeExecution(success=false) emits a python warn', () => {
    educationalLogger.codeExecution(false);
    const found = logger.getLogs({ category: 'python' }).some((l) => l.level === 'warn');
    expect(found).toBe(true);
  });

  it('gameInteraction logs an info entry under pygame', () => {
    educationalLogger.gameInteraction('jump', { height: 10 });
    const found = logger
      .getLogs({ category: 'pygame' })
      .some((l) => /Game interaction: jump/.test(l.message));
    expect(found).toBe(true);
  });

  it('learningMilestone logs a success entry under user', () => {
    educationalLogger.learningMilestone('first-loop', 'classroom');
    const found = logger
      .getLogs({ category: 'user' })
      .some((l) => l.level === 'success' && /Learning milestone: first-loop/.test(l.message));
    expect(found).toBe(true);
  });
});
