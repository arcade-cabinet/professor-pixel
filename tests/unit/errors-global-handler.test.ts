import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// global-handler.ts auto-instantiates a singleton at module load and
// auto-installs window listeners in browser env. To get clean state
// per test, every test re-imports via `vi.resetModules()` + dynamic
// import. This also clears any localStorage-driven debug-mode state
// from a previous test.

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'group').mockImplementation(() => {});
  vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
});

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

async function freshHandler() {
  vi.resetModules();
  return await import('@lib/errors/global-handler');
}

describe('globalErrorHandler — track + recent', () => {
  it('starts with empty error list', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();
    expect(globalErrorHandler.getRecentErrors()).toEqual([]);
  });

  it('track() adds an error to the front (most-recent-first)', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();

    globalErrorHandler.track({
      type: 'custom',
      error: 'first',
      timestamp: new Date().toISOString(),
      level: 'info',
    });
    globalErrorHandler.track({
      type: 'custom',
      error: 'second',
      timestamp: new Date().toISOString(),
      level: 'info',
    });

    const recent = globalErrorHandler.getRecentErrors();
    expect(recent).toHaveLength(2);
    // unshift = newest at index 0
    expect(recent[0].error).toBe('second');
    expect(recent[1].error).toBe('first');
  });

  it('caps stored errors at 100 (FIFO eviction)', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();

    for (let i = 0; i < 105; i++) {
      globalErrorHandler.track({
        type: 'custom',
        error: `err-${i}`,
        timestamp: new Date().toISOString(),
        level: 'info', // info → no persist call (avoid localStorage churn)
      });
    }

    const all = globalErrorHandler.getRecentErrors(200);
    expect(all).toHaveLength(100);
    // Newest is err-104, oldest retained should be err-5 (104..5 = 100 entries).
    expect(all[0].error).toBe('err-104');
    expect(all[99].error).toBe('err-5');
  });

  it('getRecentErrors(limit) respects the limit', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();

    for (let i = 0; i < 5; i++) {
      globalErrorHandler.track({
        type: 'custom',
        error: `err-${i}`,
        timestamp: new Date().toISOString(),
        level: 'info',
      });
    }

    expect(globalErrorHandler.getRecentErrors(3)).toHaveLength(3);
    expect(globalErrorHandler.getRecentErrors(10)).toHaveLength(5);
  });
});

describe('globalErrorHandler — listeners', () => {
  it('subscribe() fires on every track and returns an unsubscribe', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();

    const listener = vi.fn();
    const unsub = globalErrorHandler.subscribe(listener);

    globalErrorHandler.track({
      type: 'custom',
      error: 'one',
      timestamp: new Date().toISOString(),
      level: 'info',
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    globalErrorHandler.track({
      type: 'custom',
      error: 'two',
      timestamp: new Date().toISOString(),
      level: 'info',
    });
    // Still 1 — unsubscribed before second track.
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('a throwing listener does NOT block other listeners', async () => {
    // Pin fault-isolation: one bad subscriber must not break the
    // notification chain for everyone else (would silently break
    // observability across the app).
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();

    const goodListener = vi.fn();
    globalErrorHandler.subscribe(() => {
      throw new Error('boom');
    });
    globalErrorHandler.subscribe(goodListener);

    expect(() =>
      globalErrorHandler.track({
        type: 'custom',
        error: 'ok',
        timestamp: new Date().toISOString(),
        level: 'info',
      })
    ).not.toThrow();
    expect(goodListener).toHaveBeenCalledTimes(1);
  });
});

describe('globalErrorHandler — persistence', () => {
  it('persists critical (level=error, !handled) errors to localStorage', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();

    globalErrorHandler.track({
      type: 'javascript',
      error: 'critical thing',
      timestamp: new Date().toISOString(),
      level: 'error',
      handled: false,
    });

    const stored = window.localStorage.getItem('pygame-errors');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].error).toBe('critical thing');
  });

  it('does NOT persist info/warning level errors', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();
    window.localStorage.removeItem('pygame-errors');

    globalErrorHandler.track({
      type: 'custom',
      error: 'just info',
      timestamp: new Date().toISOString(),
      level: 'info',
    });

    expect(window.localStorage.getItem('pygame-errors')).toBeNull();
  });

  it('survives localStorage throwing during persist (private mode)', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();

    const originalSet = window.localStorage.setItem;
    // Match the real Storage.setItem signature so type-checkers don't
    // see a 0-arg replacement standing in for a 2-arg method.
    window.localStorage.setItem = (_key: string, _value: string) => {
      throw new DOMException('QuotaExceededError');
    };

    try {
      expect(() =>
        globalErrorHandler.track({
          type: 'javascript',
          error: 'private mode',
          timestamp: new Date().toISOString(),
          level: 'error',
          handled: false,
        })
      ).not.toThrow();
    } finally {
      window.localStorage.setItem = originalSet;
    }
  });

  it('clearErrors() also clears localStorage', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();

    globalErrorHandler.track({
      type: 'javascript',
      error: 'will-be-cleared',
      timestamp: new Date().toISOString(),
      level: 'error',
      handled: false,
    });
    expect(window.localStorage.getItem('pygame-errors')).toBeTruthy();

    globalErrorHandler.clearErrors();
    expect(window.localStorage.getItem('pygame-errors')).toBeNull();
    expect(globalErrorHandler.getRecentErrors()).toEqual([]);
  });
});

describe('globalErrorHandler — debug mode', () => {
  it('setDebugMode(true) writes the localStorage flag and getDebugMode reflects it', async () => {
    const { globalErrorHandler } = await freshHandler();

    globalErrorHandler.setDebugMode(true);
    expect(window.localStorage.getItem('pygame-debug')).toBe('true');
    expect(globalErrorHandler.getDebugMode()).toBe(true);

    globalErrorHandler.setDebugMode(false);
    expect(window.localStorage.getItem('pygame-debug')).toBeNull();
    expect(globalErrorHandler.getDebugMode()).toBe(false);
  });
});

describe('globalErrorHandler — recoverable error classification', () => {
  it.each([
    { msg: 'chunk load failed', expected: true },
    { msg: 'Loading chunk 7 failed', expected: true },
    { msg: 'network unreachable', expected: true },
    { msg: 'fetch failed: ECONNREFUSED', expected: true },
    { msg: 'request timeout', expected: true },
    { msg: 'permission denied', expected: false },
    { msg: 'TypeError: x is not a function', expected: false },
  ])('isRecoverableError("$msg") → $expected', async ({ msg, expected }) => {
    const { globalErrorHandler } = await freshHandler();
    expect(
      globalErrorHandler.isRecoverableError({
        type: 'custom',
        error: msg,
        timestamp: new Date().toISOString(),
        level: 'error',
      })
    ).toBe(expected);
  });

  it('getRecoveryActions branches by error message keyword', async () => {
    const { globalErrorHandler } = await freshHandler();
    const ts = new Date().toISOString();

    expect(
      globalErrorHandler.getRecoveryActions({
        type: 'custom',
        error: 'Chunk load failed',
        timestamp: ts,
        level: 'error',
      })
    ).toContain('Refresh the page');

    expect(
      globalErrorHandler.getRecoveryActions({
        type: 'custom',
        error: 'network down',
        timestamp: ts,
        level: 'error',
      })
    ).toContain('Check your internet connection');

    expect(
      globalErrorHandler.getRecoveryActions({
        type: 'custom',
        error: 'permission denied',
        timestamp: ts,
        level: 'error',
      })
    ).toContain('Check browser permissions');

    // Default branch
    expect(
      globalErrorHandler.getRecoveryActions({
        type: 'custom',
        error: 'unknown weirdness',
        timestamp: ts,
        level: 'error',
      })
    ).toContain('Refresh the page');
  });
});

describe('globalErrorHandler — getErrorStats', () => {
  it('counts by type and by level, plus recentCount', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();

    const now = new Date().toISOString();
    globalErrorHandler.track({ type: 'javascript', error: 'a', timestamp: now, level: 'error' });
    globalErrorHandler.track({ type: 'network', error: 'b', timestamp: now, level: 'error' });
    globalErrorHandler.track({ type: 'network', error: 'c', timestamp: now, level: 'warning' });

    const stats = globalErrorHandler.getErrorStats();
    expect(stats.total).toBe(3);
    expect(stats.byType.javascript).toBe(1);
    expect(stats.byType.network).toBe(2);
    expect(stats.byLevel.error).toBe(2);
    expect(stats.byLevel.warning).toBe(1);
    expect(stats.recentCount).toBe(3);
  });

  it('recentCount excludes errors older than 5 minutes', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const justNow = new Date().toISOString();
    globalErrorHandler.track({ type: 'custom', error: 'old', timestamp: tenMinAgo, level: 'info' });
    globalErrorHandler.track({ type: 'custom', error: 'new', timestamp: justNow, level: 'info' });

    const stats = globalErrorHandler.getErrorStats();
    expect(stats.total).toBe(2);
    expect(stats.recentCount).toBe(1);
  });
});

describe('trackNetworkError + trackCustomError', () => {
  it('trackNetworkError stores type=network with context + errorId', async () => {
    const { globalErrorHandler, trackNetworkError } = await freshHandler();
    globalErrorHandler.clearErrors();

    trackNetworkError(new Error('connection refused'), 'fetching lessons');

    const recent = globalErrorHandler.getRecentErrors();
    expect(recent).toHaveLength(1);
    expect(recent[0].type).toBe('network');
    expect(recent[0].context).toBe('fetching lessons');
    expect(recent[0].error).toBe('connection refused');
    expect(recent[0].errorId).toMatch(/^net-/);
    expect(recent[0].handled).toBe(true);
  });

  it('trackCustomError defaults to level=error', async () => {
    const { globalErrorHandler, trackCustomError } = await freshHandler();
    globalErrorHandler.clearErrors();

    trackCustomError('something happened', 'manual');

    const recent = globalErrorHandler.getRecentErrors();
    expect(recent[0].type).toBe('custom');
    expect(recent[0].level).toBe('error');
    expect(recent[0].errorId).toMatch(/^custom-/);
  });

  it('trackCustomError honors explicit level=warning', async () => {
    const { globalErrorHandler, trackCustomError } = await freshHandler();
    globalErrorHandler.clearErrors();

    trackCustomError('mild thing', 'manual', 'warning');

    expect(globalErrorHandler.getRecentErrors()[0].level).toBe('warning');
  });
});

describe('initialize() — listener installation', () => {
  it('idempotent: calling initialize() twice installs listeners only once', async () => {
    // Pin idempotency — if a future refactor adds new listeners on
    // every initialize() call, we'd leak duplicate handlers and fire
    // every error N times.
    const { globalErrorHandler } = await freshHandler();
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    globalErrorHandler.initialize();
    const callsAfterFirst = addEventListenerSpy.mock.calls.length;

    globalErrorHandler.initialize();
    const callsAfterSecond = addEventListenerSpy.mock.calls.length;

    expect(callsAfterSecond).toBe(callsAfterFirst);
  });

  it('installs window.__trackError as a callable bound to the singleton', async () => {
    const { globalErrorHandler } = await freshHandler();

    // Module load auto-initializes, so __trackError should already be
    // present.
    const trackError = (window as unknown as { __trackError?: unknown }).__trackError;
    expect(typeof trackError).toBe('function');

    globalErrorHandler.clearErrors();
    (trackError as (e: unknown) => void)({
      type: 'custom',
      error: 'via window.__trackError',
      timestamp: new Date().toISOString(),
      level: 'info',
    });
    expect(globalErrorHandler.getRecentErrors()[0].error).toBe('via window.__trackError');
  });
});

describe('debugUtils', () => {
  it('triggerTestError throws a "Test error" Error', async () => {
    const { debugUtils } = await freshHandler();
    expect(() => debugUtils.triggerTestError()).toThrow(/Test error/);
  });

  it('enableDebugMode + disableDebugMode flip the localStorage flag', async () => {
    const { debugUtils, globalErrorHandler } = await freshHandler();

    debugUtils.enableDebugMode();
    expect(globalErrorHandler.getDebugMode()).toBe(true);

    debugUtils.disableDebugMode();
    expect(globalErrorHandler.getDebugMode()).toBe(false);
  });

  it('getErrorStats() returns the same shape as the singleton method', async () => {
    const { debugUtils } = await freshHandler();
    const stats = debugUtils.getErrorStats();
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('byType');
    expect(stats).toHaveProperty('byLevel');
    expect(stats).toHaveProperty('recentCount');
  });
});
