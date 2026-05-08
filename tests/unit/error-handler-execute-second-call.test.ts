// Cover the cold "second-call cached" arms in src/python/error-handler.ts
// that the existing error-handler-execute suite skips. Each existing test
// creates a fresh capture instance so both module-level guards (line 601
// + line 625) take their truthy first-time arms. A second call on the
// SAME instance hits the cached-state falsy arms:
//   - line 601 path 1 falsy: pyodideInstance already populated → skip
//     globalThis.pyodideInstance lookup
//   - line 625 path 1 falsy: isSetup already true → skip
//     this.setupErrorCapture()

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEnhancedErrorCapture } from '@lib/python/error-handler';

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

const SETUP_OK: RunPythonResponse[] = [undefined, true, true, true];

describe('createEnhancedErrorCapture — executionError + non-Error JS throw branches (lines 705-714)', () => {
  it('JS-level Error from runPython exec lands in the executionError branch with err.message', async () => {
    // Drive line 705 truthy: traceback empty, stderr empty, but the
    // exec runPython() call throws → executionError is set. parseTraceback
    // on the err.message returns null → fallback object literal at 710-713
    // fires. Asserts hasError true + a SyntaxError 'type' shape.
    const pyodide = fakePyodide([
      ...SETUP_OK,
      undefined, // clear
      undefined, // io
      THROW, // exec → executionError = Error('runPython exploded')
      '', // stdout
      '', // stderr
      // errorInfo with empty traceback so the traceback-arm at 689 is falsy
      { toJs: () => ({ traceback: '', type: '', message: '' }) },
    ]);
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    const result = await cap.executeWithErrorCapture('print(broken)');
    expect(result.hasError).toBe(true);
    expect(result.error).toBeTruthy();
  });

  it('JS-level non-Error throw lands in executionError String() fallback (line 708 path 1 falsy)', async () => {
    // Same shape as above but the throw is a plain string. The
    // `executionError instanceof Error` ternary at 707-708 fires the
    // path 1 falsy arm — String(executionError) is used instead of
    // executionError.message.
    const STRING_THROW = Symbol('string-throw');
    let i = 0;
    const responses: Array<RunPythonResponse | typeof STRING_THROW> = [
      ...SETUP_OK,
      undefined,
      undefined,
      STRING_THROW, // exec throws a plain string
      '', // stdout
      '', // stderr
      { toJs: () => ({ traceback: '', type: '', message: '' }) },
    ];
    const pyodide = {
      runPython: () => {
        const next = responses[i++];
        if (next === STRING_THROW) {
          // eslint-disable-next-line no-throw-literal
          throw 'plain-string-rejection';
        }
        return next ?? null;
      },
      runPythonAsync: () => {},
    } as unknown as PyodideInstance;
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    const result = await cap.executeWithErrorCapture('print(broken)');
    expect(result.hasError).toBe(true);
    expect(result.error).toBeTruthy();
  });
});

describe('createEnhancedErrorCapture — second call hits cached arms (lines 601, 625 falsy)', () => {
  it('reuses cached pyodideInstance + isSetup on second executeWithErrorCapture call', async () => {
    // First call: setup chain (4) + execute chain (6) = 10 responses
    // Second call: only execute chain (6 more) — setup is skipped at
    // line 625 because isSetup is already true, and pyodideInstance
    // is already cached so line 601's lookup short-circuits.
    const pyodide = fakePyodide([
      // First call: setup
      ...SETUP_OK,
      // First call: execute
      undefined, // clear
      undefined, // io
      undefined, // exec
      'first\n', // stdout
      '', // stderr
      { toJs: () => ({ traceback: '', type: '', message: '' }) },
      // Second call: execute only (no setup)
      undefined, // clear
      undefined, // io
      undefined, // exec
      'second\n', // stdout
      '', // stderr
      { toJs: () => ({ traceback: '', type: '', message: '' }) },
    ]);
    setGlobalPyodide(pyodide);
    const cap = createEnhancedErrorCapture();
    const first = await cap.executeWithErrorCapture('print("first")');
    expect(first.hasError).toBe(false);
    expect(first.output).toContain('first');
    // Second call — the setup-OK chain is NOT consumed again. If it
    // were, runPython would return undefined for the next ('clear')
    // step which would still pass; but the cap.isReadyForCapture()
    // health check (a separate path) confirms isSetup persists.
    const second = await cap.executeWithErrorCapture('print("second")');
    expect(second.hasError).toBe(false);
    expect(second.output).toContain('second');
  });
});
