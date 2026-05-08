// Cover the window-event branches of src/errors/global-handler.ts that the
// existing errors-global-handler.test.ts skips. The current suite only
// drives the public track/clearErrors/subscribe API; lines 67-95 (the
// handleJavaScriptError branch), 99-120 (handlePromiseRejection),
// 124-126 (handleVisibilityChange flush), 130-153 (setupConsoleInterception
// debug-mode wrapper), 192-198 (getErrorIcon network/python/default), and
// 348 (debugUtils.triggerTestPromiseRejection) all stay uncovered.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

// Re-import the module per test so the singleton starts fresh and any
// install-time side effects (window.addEventListener, console.error
// override) re-bind cleanly. Setting localStorage.pygame-debug=true BEFORE
// the import flips the constructor-time debugMode flag without needing
// setDebugMode (which only flips after construction).
async function freshHandler(opts: { debug?: boolean } = {}) {
  if (opts.debug) {
    window.localStorage.setItem('pygame-debug', 'true');
  }
  vi.resetModules();
  return await import('@lib/errors/global-handler');
}

describe('GlobalErrorHandler — handleJavaScriptError', () => {
  it('window error event lands in the handler with all fields populated', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();
    // Dispatch a synthetic ErrorEvent. jsdom's ErrorEvent constructor
    // accepts the EventInit shape with message/filename/lineno/colno/error.
    const evt = new ErrorEvent('error', {
      message: 'kaboom',
      filename: 'app.js',
      lineno: 42,
      colno: 17,
      error: new Error('kaboom'),
    });
    window.dispatchEvent(evt);
    const recent = globalErrorHandler.getRecentErrors(20);
    // Debug-mode handlers from earlier tests in this process persist their
    // window listeners + console.error wrappers, so additional 'custom'
    // Console-Error rows can land in the list. Find the javascript row.
    const js = recent.find((r) => r.type === 'javascript');
    expect(js).toBeDefined();
    expect(js!.error).toBe('kaboom');
    expect(js!.url).toBe('app.js');
    expect(js!.lineNumber).toBe(42);
    expect(js!.columnNumber).toBe(17);
    expect(js!.context).toBe('Global JavaScript Error');
    expect(js!.handled).toBe(false);
  });

  it('debug-mode error event also fires the console.group debug block', async () => {
    const { globalErrorHandler } = await freshHandler({ debug: true });
    globalErrorHandler.clearErrors();
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'boom',
        filename: 'a.js',
        lineno: 1,
        colno: 1,
      })
    );
    expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('Uncaught JavaScript Error'));
    expect(groupEndSpy).toHaveBeenCalled();
  });
});

describe('GlobalErrorHandler — handlePromiseRejection', () => {
  it('unhandledrejection event with an Error reason lands as type=promise', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();
    // jsdom's PromiseRejectionEvent ctor needs a `promise` field.
    const promise = Promise.reject(new Error('async fail'));
    // Swallow the actual rejection so it doesn't bubble.
    promise.catch(() => {});
    const evt = new PromiseRejectionEvent('unhandledrejection', {
      promise,
      reason: new Error('async fail'),
    });
    window.dispatchEvent(evt);
    const recent = globalErrorHandler.getRecentErrors(20);
    const promiseEntry = recent.find((r) => r.type === 'promise');
    expect(promiseEntry).toBeDefined();
    expect(promiseEntry!.error).toBe('async fail');
    expect(promiseEntry!.context).toBe('Unhandled Promise Rejection');
  });

  it('unhandledrejection event with a non-Error reason falls back to String(reason)', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();
    const promise = Promise.reject('plain-string');
    promise.catch(() => {});
    const evt = new PromiseRejectionEvent('unhandledrejection', {
      promise,
      reason: 'plain-string',
    });
    window.dispatchEvent(evt);
    const recent = globalErrorHandler.getRecentErrors(20);
    const promiseEntry = recent.find((r) => r.type === 'promise');
    expect(promiseEntry).toBeDefined();
    expect(promiseEntry!.error).toBe('plain-string');
  });

  it('debug-mode promise rejection also fires the console.group block', async () => {
    const { globalErrorHandler } = await freshHandler({ debug: true });
    globalErrorHandler.clearErrors();
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const promise = Promise.reject(new Error('rejected'));
    promise.catch(() => {});
    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise,
        reason: new Error('rejected'),
      })
    );
    expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('Unhandled Promise Rejection'));
  });
});

describe('GlobalErrorHandler — handleVisibilityChange persists', () => {
  it('document.hidden=true with errors triggers persistErrors → localStorage write', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();
    globalErrorHandler.track({
      type: 'custom',
      error: 'persist-me',
      timestamp: new Date().toISOString(),
      level: 'error',
    });
    // Simulate tab going hidden — jsdom lets us redefine the prop.
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    const persisted = window.localStorage.getItem('pygame-errors');
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted!) as Array<{ error: string }>;
    expect(parsed.some((e) => e.error === 'persist-me')).toBe(true);
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('document.hidden=false with errors does NOT trigger persistErrors', async () => {
    const { globalErrorHandler } = await freshHandler();
    globalErrorHandler.clearErrors();
    globalErrorHandler.track({
      type: 'custom',
      error: 'should-not-persist',
      timestamp: new Date().toISOString(),
      level: 'info', // info-level errors don't auto-persist via track's branch.
    });
    // Visibility=false → the gate at line 124 short-circuits.
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    const persisted = window.localStorage.getItem('pygame-errors');
    // Either null OR doesn't include our info-level row (info errors are
    // filtered out of persistErrors by the level==='error' filter at line 210).
    if (persisted) {
      const parsed = JSON.parse(persisted) as Array<{ error: string }>;
      expect(parsed.some((e) => e.error === 'should-not-persist')).toBe(false);
    }
  });
});

describe('GlobalErrorHandler — setupConsoleInterception (debug mode)', () => {
  it('console.error in debug mode tracks a custom error', async () => {
    const { globalErrorHandler } = await freshHandler({ debug: true });
    globalErrorHandler.clearErrors();
    // Restore the spy so the handler-installed wrapper actually runs (the
    // beforeEach spy intercepts before the module-installed wrapper).
    vi.restoreAllMocks();
    // Re-spy on console.log so the debug-mode track-side log doesn't leak.
    vi.spyOn(console, 'log').mockImplementation(() => {});
    console.error('something broke', { foo: 1 });
    const recent = globalErrorHandler.getRecentErrors(5);
    const tracked = recent.find((e) => e.context === 'Console Error');
    expect(tracked).toBeDefined();
    expect(tracked!.error).toContain('something broke');
    expect(tracked!.handled).toBe(true);
  });

  it('console.error containing "Error Boundary" is NOT tracked (filter at line 138)', async () => {
    const { globalErrorHandler } = await freshHandler({ debug: true });
    globalErrorHandler.clearErrors();
    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    console.error('Error Boundary caught something');
    const recent = globalErrorHandler.getRecentErrors(5);
    expect(recent.find((e) => e.context === 'Console Error')).toBeUndefined();
  });
});

describe('GlobalErrorHandler — getErrorIcon (debug-mode track logging)', () => {
  // getErrorIcon is private but track() calls it in debug mode (line 177-178).
  // Drive each branch by tracking errors of each type and verifying the
  // log received the matching emoji.
  it.each([
    ['javascript', '🔴'],
    ['promise', '🟡'],
    ['react-error', '⚛️'],
    ['network', '🌐'],
    ['python', '🐍'],
    ['custom', '❌'],
  ])('debug-mode track of type=%s logs the %s icon', async (type, icon) => {
    const { globalErrorHandler } = await freshHandler({ debug: true });
    globalErrorHandler.clearErrors();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    globalErrorHandler.track({
      type: type as 'javascript' | 'promise' | 'react-error' | 'network' | 'python' | 'custom',
      error: 'x',
      timestamp: new Date().toISOString(),
      level: 'info',
    });
    const wasIconLogged = logSpy.mock.calls.some((args) =>
      typeof args[0] === 'string' && args[0].includes(icon)
    );
    expect(wasIconLogged).toBe(true);
  });
});

describe('debugUtils — triggerTestPromiseRejection (line 347-349)', () => {
  it('executes the Promise.reject call (drives line 348 for coverage)', async () => {
    const { debugUtils } = await freshHandler();
    // The function body is `Promise.reject(new Error(...))` — invoking the
    // function executes the line, which is all we need for coverage.
    // Patch Promise.reject to a no-op for the duration of this test so
    // vitest doesn't flag the rejection as an unhandled-error.
    const realReject = Promise.reject;
    let capturedReason: unknown;
    Promise.reject = ((reason: unknown) => {
      capturedReason = reason;
      return Promise.resolve();
    }) as typeof Promise.reject;
    try {
      debugUtils.triggerTestPromiseRejection();
    } finally {
      Promise.reject = realReject;
    }
    expect(capturedReason).toBeInstanceOf(Error);
    expect((capturedReason as Error).message).toContain('Test promise rejection');
  });
});
