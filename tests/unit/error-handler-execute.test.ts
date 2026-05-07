import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEnhancedErrorCapture } from '@lib/python/error-handler';

// Cover createEnhancedErrorCapture.executeWithErrorCapture (the global-pyodide
// variant — lines 625-753 of src/python/error-handler.ts) which the
// error-handler-with-pyodide.test.ts targets via createEnhancedErrorCaptureWithPyodide.
// Both variants share the same four error-source branches but the global
// variant also calls setupErrorCapture() inline if not yet set up — so the
// runPython response queue here includes the setup chain in addition to
// the execute chain.

const THROW = Symbol('throw');

type RunPythonResponse =
  | string
  | boolean
  | number
  | { toJs: () => Record<string, unknown> }
  | typeof THROW
  | undefined;

function fakePyodide(responses: RunPythonResponse[]): PyodideInstance {
  let i = 0;
  return {
    runPython: () => {
      const next = responses[i++];
      if (next === THROW) {
        throw new Error('runPython exploded');
      }
      return next ?? null;
    },
    runPythonAsync: () => {},
  } as unknown as PyodideInstance;
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

// Setup chain (4 calls): install + isActive + excepthookOk + testCapture
// Execute chain (6 calls): clear + io setup + exec + stdout + stderr + errorInfo
const SETUP_OK: RunPythonResponse[] = [undefined, true, true, true];

describe('createEnhancedErrorCapture.executeWithErrorCapture — happy + error branches', () => {
  it('runs setup inline + returns success result on stdout-only', async () => {
    const pyodide = fakePyodide([
      ...SETUP_OK,
      // execute chain
      undefined, // clear
      undefined, // io
      undefined, // exec
      'hi\n', // stdout
      '', // stderr
      { toJs: () => ({ traceback: '', type: '', message: '' }) },
    ]);
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    const result = await cap.executeWithErrorCapture('print("hi")');
    expect(result.hasError).toBe(false);
    expect(result.output).toContain('hi');
  });

  it('uses enhanced traceback when present', async () => {
    const pyodide = fakePyodide([
      ...SETUP_OK,
      undefined,
      undefined,
      undefined,
      '',
      '',
      {
        toJs: () => ({
          traceback: 'Traceback (most recent call last):\nNameError: x',
          type: 'NameError',
          message: 'x',
        }),
      },
    ]);
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    const result = await cap.executeWithErrorCapture('print(x)');
    expect(result.hasError).toBe(true);
    expect(result.error).toBeTruthy();
  });

  it('falls back to stderr when traceback empty', async () => {
    const pyodide = fakePyodide([
      ...SETUP_OK,
      undefined,
      undefined,
      undefined,
      '',
      'stderr error',
      { toJs: () => ({ traceback: '', type: '', message: '' }) },
    ]);
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    const result = await cap.executeWithErrorCapture('whatever');
    expect(result.hasError).toBe(true);
  });

  it('falls back to JS-level executionError when both traceback + stderr empty', async () => {
    const pyodide = fakePyodide([
      ...SETUP_OK,
      undefined, // clear
      undefined, // io
      THROW, // exec throws
      '', // stdout
      '', // stderr
      { toJs: () => ({ traceback: '', type: '', message: '' }) },
    ]);
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    const result = await cap.executeWithErrorCapture('whatever');
    expect(result.hasError).toBe(true);
  });

  it('returns the not-ready FormattedError when no pyodide on global', async () => {
    setGlobalPyodide(null);
    const cap = createEnhancedErrorCapture();
    const result = await cap.executeWithErrorCapture('print("x")');
    expect(result.hasError).toBe(true);
    expect(result.error?.title).toMatch(/Python Runtime Error/);
  });

  it('catches outer pipeline errors and wraps them as CriticalError', async () => {
    // Setup OK, then make clear_enhanced_error() throw → outer catch fires.
    const pyodide = fakePyodide([
      ...SETUP_OK,
      THROW, // clear_enhanced_error() throws
    ]);
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    const result = await cap.executeWithErrorCapture('whatever');
    expect(result.hasError).toBe(true);
    expect(result.error?.message).toMatch(/enhanced error handling/);
  });
});
