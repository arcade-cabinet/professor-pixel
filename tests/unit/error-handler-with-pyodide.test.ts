import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEnhancedErrorCapture,
  createEnhancedErrorCaptureWithPyodide,
} from '@lib/python/error-handler';

// Drive createEnhancedErrorCapture and createEnhancedErrorCaptureWithPyodide
// against a controllable fake Pyodide. The factory's runPython calls are
// queued so the test can dictate stdout / stderr / errorInfo per execution
// branch (traceback path, stderr fallback, jsError fallback, no-error path).
//
// The existing tests/unit/error-handler.test.ts only covered pre-pyodide
// guards (lines 379-407 of the source). This file covers the meat:
// setupErrorCapture verification chain, isReadyForCapture happy path,
// and executeWithErrorCapture's four error-source branches.

// Each call to runPython advances through `responses`; the sentinel
// __THROW__ raises a JS error to drive the outer catch.
type RunPythonResponse =
  | string
  | boolean
  | number
  | { toJs: () => Record<string, unknown> }
  | typeof THROW;

const THROW = Symbol('throw');

function fakePyodide(responses: RunPythonResponse[]): {
  pyodide: PyodideInstance;
  callsTo: () => string[];
} {
  const calls: string[] = [];
  let i = 0;
  const pyodide = {
    runPython: (code: string) => {
      calls.push(code);
      const next = responses[i++];
      if (next === THROW) {
        throw new Error('runPython exploded');
      }
      return next ?? null;
    },
    runPythonAsync: () => {},
  } as unknown as PyodideInstance;
  return { pyodide, callsTo: () => calls };
}

function setGlobalPyodide(pyo: PyodideInstance | null) {
  if (pyo) {
    (globalThis as unknown as { pyodideInstance: PyodideInstance }).pyodideInstance = pyo;
  } else {
    Reflect.deleteProperty(globalThis, 'pyodideInstance');
    if (typeof window !== 'undefined') {
      Reflect.deleteProperty(window, 'pyodideInstance');
    }
  }
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  setGlobalPyodide(null);
});

afterEach(() => {
  setGlobalPyodide(null);
  vi.restoreAllMocks();
});

describe('createEnhancedErrorCapture — setupErrorCapture full verification chain', () => {
  it('returns true when all three verification checks pass', () => {
    // Order of runPython calls in setupErrorCapture:
    //   1) install — install enhanced error capture (no return needed)
    //   2) check_enhanced_capture_status() — isActive
    //   3) excepthook verification — isEnhancedHook
    //   4) test_capture — testPassed
    const { pyodide } = fakePyodide([
      undefined as unknown as string, // install
      true, // isActive
      true, // excepthookOk
      true, // testCapture
    ]);
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    expect(cap.setupErrorCapture()).toBe(true);
    // Health check now reports ready.
    // isReadyForCapture re-runs check_enhanced_capture_status + excepthook test.
    const { pyodide: pyo2 } = fakePyodide([true, true]);
    setGlobalPyodide(pyo2);
    // Different pyodide instance than the one captured during setup, so this
    // would actually fail because pyodideInstance was captured by closure.
    // Instead just assert the post-setup isSetup flag is true via the value
    // returned earlier.
  });

  it('returns false when any verification check fails', () => {
    // Install OK, but isActive=false → all three multiplied = false.
    const { pyodide } = fakePyodide([undefined as unknown as string, false, true, true]);
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    expect(cap.setupErrorCapture()).toBe(false);
  });

  it('catches setup exceptions and returns false', () => {
    const { pyodide } = fakePyodide([THROW]);
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    expect(cap.setupErrorCapture()).toBe(false);
  });
});

describe('createEnhancedErrorCapture — isReadyForCapture', () => {
  it('returns true when setup succeeded and health check passes', () => {
    // setup: install + isActive + excepthook + testCapture
    // isReadyForCapture: check_enhanced_capture_status + excepthook
    const { pyodide } = fakePyodide([
      undefined as unknown as string,
      true,
      true,
      true,
      true,
      true,
    ]);
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    cap.setupErrorCapture();
    expect(cap.isReadyForCapture()).toBe(true);
  });

  it('returns false when post-setup health check trips', () => {
    const { pyodide } = fakePyodide([
      undefined as unknown as string,
      true,
      true,
      true,
      false, // health check fails post-setup
      true,
    ]);
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    cap.setupErrorCapture();
    expect(cap.isReadyForCapture()).toBe(false);
  });

  it('returns false when health check throws', () => {
    const { pyodide } = fakePyodide([
      undefined as unknown as string,
      true,
      true,
      true,
      THROW,
    ]);
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    cap.setupErrorCapture();
    expect(cap.isReadyForCapture()).toBe(false);
  });
});

describe('createEnhancedErrorCaptureWithPyodide — executeWithErrorCapture branches', () => {
  it('returns no-error result when stdout has output and traceback is empty', async () => {
    // Order of runPython calls in executeWithErrorCapture:
    //   1) clear_enhanced_error()
    //   2) sys.stdout = StringIO ...
    //   3) the wrapped exec()
    //   4) sys.stdout.getvalue() → stdout
    //   5) sys.stderr.getvalue() → stderr
    //   6) get_enhanced_error_info() → returns object with .toJs()
    const { pyodide } = fakePyodide([
      undefined as unknown as string, // clear
      undefined as unknown as string, // io setup
      undefined as unknown as string, // exec
      'hello world\n', // stdout
      '', // stderr
      { toJs: () => ({ traceback: '', type: '', message: '' }) },
    ]);
    const cap = createEnhancedErrorCaptureWithPyodide(pyodide);
    const result = await cap.executeWithErrorCapture('print("hi")');
    expect(result.hasError).toBe(false);
    expect(result.output).toContain('hello world');
    expect(result.error).toBeNull();
  });

  it('uses the enhanced traceback when available', async () => {
    const { pyodide } = fakePyodide([
      undefined as unknown as string, // clear
      undefined as unknown as string, // io
      undefined as unknown as string, // exec
      '', // stdout
      '', // stderr
      {
        toJs: () => ({
          traceback:
            'Traceback (most recent call last):\n  File "<user>", line 1\nNameError: name "x" is not defined',
          type: 'NameError',
          message: 'name "x" is not defined',
        }),
      },
    ]);
    const cap = createEnhancedErrorCaptureWithPyodide(pyodide);
    const result = await cap.executeWithErrorCapture('print(x)');
    expect(result.hasError).toBe(true);
    expect(result.error?.title).toBeTruthy();
  });

  it('falls back to stderr when traceback is empty but stderr has content', async () => {
    const { pyodide } = fakePyodide([
      undefined as unknown as string,
      undefined as unknown as string,
      undefined as unknown as string,
      '',
      'RuntimeError: kaboom',
      { toJs: () => ({ traceback: '', type: '', message: '' }) },
    ]);
    const cap = createEnhancedErrorCaptureWithPyodide(pyodide);
    const result = await cap.executeWithErrorCapture('whatever');
    expect(result.hasError).toBe(true);
    expect(result.error).not.toBeNull();
  });

  it('falls back to JS-level executionError when both traceback and stderr empty', async () => {
    // Make the exec() call (3rd runPython) throw.
    const { pyodide } = fakePyodide([
      undefined as unknown as string, // clear
      undefined as unknown as string, // io
      THROW, // exec — caught and stashed as executionError
      '', // stdout
      '', // stderr
      { toJs: () => ({ traceback: '', type: '', message: '' }) },
    ]);
    const cap = createEnhancedErrorCaptureWithPyodide(pyodide);
    const result = await cap.executeWithErrorCapture('whatever');
    expect(result.hasError).toBe(true);
    expect(result.error).not.toBeNull();
  });

  it('catches a critical error in the error-handling pipeline itself', async () => {
    // Make clear_enhanced_error() throw — that fires before any try/catch
    // around exec, so the outer catch wraps it as a CriticalError.
    const { pyodide } = fakePyodide([THROW]);
    const cap = createEnhancedErrorCaptureWithPyodide(pyodide);
    const result = await cap.executeWithErrorCapture('whatever');
    expect(result.hasError).toBe(true);
    expect(result.error?.message).toMatch(/enhanced error handling/);
  });

  it('returns the not-ready FormattedError when no pyodide was passed', async () => {
    const cap = createEnhancedErrorCaptureWithPyodide(null as unknown as PyodideInstance);
    const result = await cap.executeWithErrorCapture('whatever');
    expect(result.hasError).toBe(true);
    expect(result.error?.title).toMatch(/Python Runtime Error/);
  });

  it('setupErrorCapture is a no-op when pyodide is null', () => {
    const cap = createEnhancedErrorCaptureWithPyodide(null as unknown as PyodideInstance);
    expect(() => cap.setupErrorCapture()).not.toThrow();
  });

  it('setupErrorCapture installs the enhanced error capture into Pyodide', () => {
    const { pyodide, callsTo } = fakePyodide([undefined as unknown as string]);
    const cap = createEnhancedErrorCaptureWithPyodide(pyodide);
    cap.setupErrorCapture();
    expect(callsTo()[0]).toContain('EnhancedErrorCapture');
  });
});
