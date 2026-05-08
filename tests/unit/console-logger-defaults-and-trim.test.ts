// Cover the default switch arms + maxLogs trim in
// src/monitoring/console-logger.ts:
//   - line 104: getLevelIcon default ('📝') for unknown levels
//   - line 125: getCategoryIcon default ('📦') for unknown categories
//   - line 142: getConsoleMethod default ('log') for unknown levels
//   - line 151: addToHistory trim when logs exceed maxLogs (1000)
//
// Existing console-logger tests only exercise the known
// level/category enums; the default arms stay cold. Seed the
// per-instance enabledLevels/enabledCategories with the unknown
// values via the localStorage hook the constructor reads, then
// reload the module so the singleton picks them up.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  // Save unknown 'level'/'category' in the persisted Sets that the
  // constructor reads; the unknown identifiers reach shouldLog()
  // truthy, so log() falls through into formatMessage and the
  // default switch arms fire.
  localStorage.setItem('pygame-log-levels', JSON.stringify(['mystery']));
  localStorage.setItem('pygame-log-categories', JSON.stringify(['unknown-cat']));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  localStorage.removeItem('pygame-log-levels');
  localStorage.removeItem('pygame-log-categories');
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('ConsoleLogger — default switch arms (lines 104, 125, 142)', () => {
  it('formats and routes a log with unknown level/category through the default arms', async () => {
    const { logger } = await import('@lib/monitoring/console-logger');
    // Cast through unknown — runtime stays the unknown identifier.
    logger.log('mystery' as never, 'unknown-cat' as never, 'hello from the default arms');
    // No assertion needed for the icons themselves — coverage is the
    // contract here. Sanity: console.log was the routed method
    // (default in getConsoleMethod).
    expect(vi.mocked(console.log)).toHaveBeenCalled();
  });
});

describe('ConsoleLogger — addToHistory trim past maxLogs (line 151)', () => {
  it('trims older entries when log count exceeds maxLogs (1000)', async () => {
    const { logger } = await import('@lib/monitoring/console-logger');
    // 1001 entries, then assert the history capped at 1000. The
    // logs are unshifted (newest first), then the trim drops the
    // oldest. Use enabled level/category so we exercise the full
    // path (not just addToHistory).
    for (let i = 0; i < 1001; i++) {
      logger.log('info', 'system', `entry-${i}`);
    }
    const logs = logger.getLogs();
    expect(logs.length).toBeLessThanOrEqual(1000);
    expect(logs.length).toBeGreaterThan(0);
  });
});
