// Cover the per-category convenience surfaces on the console-logger
// singleton (python / pygame / user / network / performance / ui) that
// console-logger-helpers.test.ts only exercises for `system`. Each
// category has 5 thin passthrough methods (debug/info/warn/error/success)
// at lines 233-306, so calling them once per category drains the
// remaining shortcuts uncovered. Plus the localStorage-saved-prefs
// branches at lines 67/72 that hydrate enabledLevels and
// enabledCategories on construction.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let logSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let debugSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  localStorage.clear();
});

afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
  debugSpy.mockRestore();
  localStorage.clear();
});

// Re-import the module per test so the singleton runs the constructor
// fresh (the saved-prefs test needs localStorage to be primed BEFORE
// the constructor reads it).
async function freshLogger() {
  vi.resetModules();
  const mod = await import('@lib/monitoring/console-logger');
  mod.logger.setDebugMode(true);
  return mod;
}

describe('logger — python convenience surface (lines 231-242)', () => {
  it('routes all 5 levels through the right console method', async () => {
    const { logger } = await freshLogger();
    logger.python.debug('py-debug');
    logger.python.info('py-info');
    logger.python.warn('py-warn');
    logger.python.error('py-error');
    logger.python.success('py-success');
    expect(debugSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Python icon 🐍 in formatted message.
    const allCalls = [...logSpy.mock.calls.flat(), ...debugSpy.mock.calls.flat()];
    expect(allCalls.some((m) => typeof m === 'string' && m.includes('🐍'))).toBe(true);
  });
});

describe('logger — pygame convenience surface (lines 244-255)', () => {
  it('routes all 5 levels through the right console method', async () => {
    const { logger } = await freshLogger();
    logger.pygame.debug('pg-debug');
    logger.pygame.info('pg-info');
    logger.pygame.warn('pg-warn');
    logger.pygame.error('pg-error');
    logger.pygame.success('pg-success');
    expect(debugSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    const allCalls = [...logSpy.mock.calls.flat(), ...debugSpy.mock.calls.flat()];
    expect(allCalls.some((m) => typeof m === 'string' && m.includes('🎮'))).toBe(true);
  });
});

describe('logger — user convenience surface (lines 257-268)', () => {
  it('routes all 5 levels through the right console method', async () => {
    const { logger } = await freshLogger();
    logger.user.debug('u-debug');
    logger.user.info('u-info');
    logger.user.warn('u-warn');
    logger.user.error('u-error');
    logger.user.success('u-success');
    expect(debugSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('logger — network convenience surface (lines 270-281)', () => {
  it('routes all 5 levels through the right console method', async () => {
    const { logger } = await freshLogger();
    logger.network.debug('n-debug');
    logger.network.info('n-info');
    logger.network.warn('n-warn');
    logger.network.error('n-error');
    logger.network.success('n-success');
    expect(debugSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    const allCalls = [...logSpy.mock.calls.flat(), ...debugSpy.mock.calls.flat()];
    expect(allCalls.some((m) => typeof m === 'string' && m.includes('🌐'))).toBe(true);
  });
});

describe('logger — performance convenience surface (lines 283-294)', () => {
  it('routes all 5 levels through the right console method', async () => {
    const { logger } = await freshLogger();
    logger.performance.debug('perf-debug');
    logger.performance.info('perf-info');
    logger.performance.warn('perf-warn');
    logger.performance.error('perf-error');
    logger.performance.success('perf-success');
    expect(debugSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    const allCalls = [...logSpy.mock.calls.flat(), ...debugSpy.mock.calls.flat()];
    expect(allCalls.some((m) => typeof m === 'string' && m.includes('⚡'))).toBe(true);
  });
});

describe('logger — ui convenience surface (lines 296-307)', () => {
  it('routes all 5 levels through the right console method', async () => {
    const { logger } = await freshLogger();
    logger.ui.debug('ui-debug');
    logger.ui.info('ui-info');
    logger.ui.warn('ui-warn');
    logger.ui.error('ui-error');
    logger.ui.success('ui-success');
    expect(debugSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    const allCalls = [...logSpy.mock.calls.flat(), ...debugSpy.mock.calls.flat()];
    expect(allCalls.some((m) => typeof m === 'string' && m.includes('🎨'))).toBe(true);
  });
});

describe('ConsoleLogger constructor — saved prefs hydration (lines 64-73)', () => {
  it('with pygame-log-levels in localStorage, enabledLevels is restored from JSON', async () => {
    // Prime the storage BEFORE the constructor runs.
    localStorage.setItem('pygame-log-levels', JSON.stringify(['error']));
    const { logger } = await freshLogger();
    // Now only error-level logs should make it through. info/debug calls
    // get filtered out at shouldLog().
    logger.system.info('should-be-filtered');
    logger.system.error('should-pass');
    expect(errorSpy).toHaveBeenCalled();
    // info doesn't reach console.log because the level is disabled.
    const infoCall = logSpy.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('should-be-filtered')
    );
    expect(infoCall).toBeUndefined();
  });

  it('with pygame-log-categories in localStorage, enabledCategories is restored', async () => {
    // Allow only the 'pygame' category. system + others get filtered.
    localStorage.setItem('pygame-log-categories', JSON.stringify(['pygame']));
    // Levels stays default (no key set).
    const { logger } = await freshLogger();
    logger.system.info('system-should-be-filtered');
    logger.pygame.info('pygame-should-pass');
    // Only the pygame line reached console.log.
    const systemCall = logSpy.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('system-should-be-filtered')
    );
    const pygameCall = logSpy.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('pygame-should-pass')
    );
    expect(systemCall).toBeUndefined();
    expect(pygameCall).toBeDefined();
  });

  it('JSON-corrupt localStorage values are swallowed (catch at line 74-76)', async () => {
    localStorage.setItem('pygame-log-levels', '{not valid json');
    // The constructor's try/catch at line 64-76 swallows the parse error
    // and proceeds with the default enabledLevels Set.
    const { logger } = await freshLogger();
    expect(() => logger.system.info('hi')).not.toThrow();
  });
});
