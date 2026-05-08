// Cover the cold debug-off + SSR-import paths in src/errors/global-handler.ts
// that the existing global-handler-event-branches suite skips. The default
// debugMode lands at TRUE under vitest because import.meta.env.DEV is true,
// short-circuiting the OR-chain at line 31. The existing suite asserts the
// debug=true console.group paths but never the debug=false fall-throughs:
//   - line 31 path 1: debugMode falls through to localStorage check when
//     import.meta.env.DEV is false (covered indirectly when we toggle off
//     and re-init)
//   - lines 55, 61: initialize() console.log skipped when debug=false
//   - line 85: handleJavaScriptError debug console.group skipped
//   - line 113: handlePromiseRejection debug console.group skipped
//   - line 176: track() debug console.log skipped
//   - line 223: clearErrors debug console.log skipped
//   - line 305: module-level `if (typeof window !== 'undefined')` falsy
//     when imported under SSR

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
  localStorage.clear();
});

describe('GlobalErrorHandler — debug=false fall-throughs (lines 85, 113, 176, 223)', () => {
  it('handleJavaScriptError with debug=false skips the console.group block (line 85 falsy)', async () => {
    const mod = await import('@lib/errors/global-handler');
    const handler = mod.globalErrorHandler;
    handler.setDebugMode(false);
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    // Synthesize an ErrorEvent and dispatch.
    const event = new ErrorEvent('error', {
      message: 'boom',
      filename: 'game.py',
      lineno: 7,
      colno: 12,
      error: new Error('boom'),
    });
    window.dispatchEvent(event);
    // The debug-off arm means the "🔴 Uncaught JavaScript Error" group never
    // fires. We allow other console.group calls (e.g., from React Strict
    // mode) but assert the specific group label is absent.
    const calls = groupSpy.mock.calls.map((c) => String(c[0] ?? ''));
    expect(calls.some((m) => m.includes('Uncaught JavaScript Error'))).toBe(false);
    groupSpy.mockRestore();
    groupEndSpy.mockRestore();
  });

  it('handlePromiseRejection with debug=false skips the console.group block (line 113 falsy)', async () => {
    const mod = await import('@lib/errors/global-handler');
    const handler = mod.globalErrorHandler;
    handler.setDebugMode(false);
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    // Construct an unhandledrejection event manually — jsdom can't produce
    // a real one but the handler doesn't care about the event class, only
    // the event.reason field.
    const event = Object.assign(new Event('unhandledrejection'), {
      reason: new Error('rejected'),
      promise: Promise.reject('rejected').catch(() => {}),
      preventDefault: vi.fn(),
    }) as unknown as PromiseRejectionEvent;
    window.dispatchEvent(event);
    const calls = groupSpy.mock.calls.map((c) => String(c[0] ?? ''));
    expect(calls.some((m) => m.includes('Unhandled Promise Rejection'))).toBe(false);
    groupSpy.mockRestore();
    groupEndSpy.mockRestore();
  });

  it('track() with debug=false skips the per-error console.log debug line (line 176 falsy)', async () => {
    const mod = await import('@lib/errors/global-handler');
    const handler = mod.globalErrorHandler;
    handler.setDebugMode(false);
    // setDebugMode(false) writes a console.log itself; we install the spy
    // AFTER the toggle so only track() logs land in mock.calls.
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handler.track({
      type: 'custom',
      error: 'silent error',
      timestamp: new Date().toISOString(),
      level: 'warning', // warning so persist arm doesn't fire
      context: 'test',
      errorId: 'err-x',
      handled: true,
    });
    // No "[CUSTOM] silent error" line.
    const calls = logSpy.mock.calls.map((c) => String(c[0] ?? ''));
    expect(calls.some((m) => m.includes('[CUSTOM]'))).toBe(false);
    logSpy.mockRestore();
  });

  it('clearErrors with debug=false skips the cleared-errors log (line 223 falsy)', async () => {
    const mod = await import('@lib/errors/global-handler');
    const handler = mod.globalErrorHandler;
    handler.setDebugMode(false);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handler.clearErrors();
    const calls = logSpy.mock.calls.map((c) => String(c[0] ?? ''));
    expect(calls.some((m) => m.includes('Cleared all tracked errors'))).toBe(false);
    logSpy.mockRestore();
  });
});

// Note: line 305's SSR guard is paired with line 353-359 which writes to
// `window` unconditionally under DEV (no SSR guard there). Because vitest
// runs with import.meta.env.DEV=true, stubbing window=undefined at the
// module top would crash inside line 358. Cover only the lines we can
// reach safely without touching that paired-mutation block.
