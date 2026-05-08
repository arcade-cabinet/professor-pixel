// Cover the category-specific convenience surfaces on the console-logger
// singleton (system / python / pygame / user / network / performance / ui)
// and the educationalLogger top-level helpers. These are tiny passthroughs
// to logger.{level}(category, ...) but each is its own statement so they
// register as uncovered until they're actually called.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger, educationalLogger } from '@lib/monitoring/console-logger';

let logSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let debugSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // The logger calls global console.* directly. Spies turn the noise into
  // assertion fodder.
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  // Make sure debug is enabled for the tests that need it.
  logger.setDebugMode(true);
});

afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
  debugSpy.mockRestore();
  logger.setDebugMode(false);
});

describe('logger.system convenience surface', () => {
  it('debug/info/warn/error/success all route through console with the system icon', () => {
    logger.system.debug('sys-debug');
    logger.system.info('sys-info');
    logger.system.warn('sys-warn');
    logger.system.error('sys-error');
    logger.system.success('sys-success');

    // info + success → console.log; debug → console.debug; warn → console.warn;
    // error → console.error.
    expect(debugSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    // log is invoked twice (info + success).
    expect(logSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    // The system icon ⚙️ should appear in the formatted message.
    const allCalls = [
      ...debugSpy.mock.calls,
      ...logSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ];
    const anySystem = allCalls.some(
      (args) => typeof args[0] === 'string' && args[0].includes('⚙️')
    );
    expect(anySystem).toBe(true);
  });
});

describe('logger.python / pygame / user / network / performance / ui surfaces', () => {
  it.each([
    ['python', '🐍'],
    ['pygame', '🎮'],
    ['user', '👤'],
    ['network', '🌐'],
    ['performance', '⚡'],
    ['ui', '🎨'],
  ] as const)('%s.info routes through with the %s category icon', (key, icon) => {
    const surface = (logger as unknown as Record<string, { info: (m: string) => void }>)[
      key as string
    ];
    surface.info(`${key}-msg`);
    const formatted = logSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(formatted).toContain(icon);
    expect(formatted).toContain(`${key}-msg`);
    // Sanity: each surface exposes all five level methods.
    const s = (logger as unknown as Record<string, Record<string, unknown>>)[key as string];
    expect(typeof s.debug).toBe('function');
    expect(typeof s.warn).toBe('function');
    expect(typeof s.error).toBe('function');
    expect(typeof s.success).toBe('function');
  });
});

describe('educationalLogger helpers', () => {
  it('studentProgress fires success when the step succeeds; info when it does not', () => {
    educationalLogger.studentProgress('lesson-1', 'step-1', true);
    expect(logSpy).toHaveBeenCalled(); // success → console.log
    logSpy.mockClear();
    educationalLogger.studentProgress('lesson-1', 'step-1', false);
    expect(logSpy).toHaveBeenCalled(); // info → console.log
  });

  it('codeExecution success path mentions the execution time when supplied', () => {
    educationalLogger.codeExecution(true, 42);
    const allLog = logSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allLog).toMatch(/42ms/);
  });

  it('codeExecution success without executionTime omits the " in Xms" suffix (line 464 falsy arm)', () => {
    // The success-path string is `Code executed successfully${time ? ` in ${time}ms` : ''}`.
    // Without an execution time, the conditional's falsy arm fires —
    // the message has no "ms" suffix. Existing test always passes 42.
    educationalLogger.codeExecution(true);
    const allLog = logSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allLog).toMatch(/Code executed successfully/);
    expect(allLog).not.toMatch(/ms/);
  });

  it('codeExecution failure path warns', () => {
    educationalLogger.codeExecution(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('gameInteraction logs to pygame info', () => {
    educationalLogger.gameInteraction('jump', { y: 100 });
    const allLog = logSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allLog).toMatch(/jump/);
    expect(allLog).toContain('🎮');
  });

  it('learningMilestone logs success on user category', () => {
    educationalLogger.learningMilestone('finished-lesson-1');
    const allLog = logSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allLog).toMatch(/finished-lesson-1/);
    expect(allLog).toContain('👤');
  });
});
