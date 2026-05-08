// Cover line 117 of src/python/runner.ts:
//   if (input) { this.setInputValues(input); }
// All existing python-runner.test.ts runProject cases omit the
// `input` field, so the setInputValues call inside runProject never
// fires. Pass a non-empty input through runProject and assert the
// pyodide bridge call lands.

import { describe, expect, it, vi } from 'vitest';
import {
  PythonRunner,
  type ExecutionContext,
  type ExecutionResult,
  type PyodideInterface,
} from '@lib/python/runner';

type RunPythonMock = ReturnType<typeof vi.fn<(code: string) => unknown>>;
type GlobalsGetMock = ReturnType<typeof vi.fn<(name: string) => unknown>>;
interface MockPyodide extends PyodideInterface {
  runPython: RunPythonMock;
  globals: { get: GlobalsGetMock };
}

function makePyodide(): MockPyodide {
  return {
    runPython: vi.fn(() => undefined),
    globals: { get: vi.fn() },
  };
}

describe('PythonRunner.runProject — input routing (line 117)', () => {
  it('forwards a non-empty input through setInputValues during runProject', async () => {
    const py = makePyodide();
    const enhanced = vi
      .fn<(code: string, ctx: ExecutionContext) => Promise<ExecutionResult>>()
      .mockResolvedValue({ output: 'ok', hasError: false });
    const runner = new PythonRunner(py, {
      executeWithEnhancedErrors: enhanced,
      isEnhancedReady: true,
    });

    await runner.runProject({
      files: { 'main.py': 'name = input(); print(name)' },
      main: 'main.py',
      input: 'Robin\n',
    });

    // setInputValues writes via runPython('set_input_values_from_js("Robin\\n")').
    const inputCalls = py.runPython.mock.calls
      .map((c) => String(c[0]))
      .filter((s) => s.includes('set_input_values_from_js('));
    expect(inputCalls.length).toBeGreaterThan(0);
    expect(inputCalls.some((s) => s.includes('Robin'))).toBe(true);
  });

  it('does NOT call setInputValues when input is omitted (regression pin)', async () => {
    const py = makePyodide();
    const enhanced = vi
      .fn<(code: string, ctx: ExecutionContext) => Promise<ExecutionResult>>()
      .mockResolvedValue({ output: 'ok', hasError: false });
    const runner = new PythonRunner(py, {
      executeWithEnhancedErrors: enhanced,
      isEnhancedReady: true,
    });

    await runner.runProject({
      files: { 'main.py': 'print(1)' },
      main: 'main.py',
    });

    const inputCalls = py.runPython.mock.calls
      .map((c) => String(c[0]))
      .filter((s) => s.includes('set_input_values_from_js('));
    expect(inputCalls.length).toBe(0);
  });
});
