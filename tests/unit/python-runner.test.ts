import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPythonRunner,
  PythonRunner,
  type ExecutionContext,
  type ExecutionResult,
  type PyodideInterface,
} from '@lib/python/runner';

// Pure-logic tests for PythonRunner. We mock PyodideInterface — Pyodide
// itself is exercised by integration/component tests; here we pin the
// orchestration logic (enhanced-vs-basic dispatch, file write, input
// routing, error normalization, stream restore).

// vi.fn() returns Mock<T> which doesn't structurally match a plain
// function signature, so we type the mock fields with MockedFunction
// against the exact signatures from PyodideInterface. This keeps the
// mock assignable wherever the SUT expects PyodideInterface.
type RunPythonMock = ReturnType<typeof vi.fn<(code: string) => unknown>>;
type GlobalsGetMock = ReturnType<typeof vi.fn<(name: string) => unknown>>;

interface MockPyodide extends PyodideInterface {
  runPython: RunPythonMock;
  globals: { get: GlobalsGetMock };
  __stdout: string;
  __stderr: string;
}

function makePyodide(overrides: Partial<MockPyodide> = {}): MockPyodide {
  // Default: stdout-buffer simulation. Most tests override runPython
  // when they want to control output.
  let stdout = '';
  let stderr = '';
  const py: MockPyodide = {
    runPython: vi.fn((code: string) => {
      // Minimal sim: return empty for capture-getter calls so default
      // path lands "successful" without an error.
      if (code.includes('sys.stdout.getvalue()')) return stdout;
      if (code.includes('sys.stderr.getvalue()')) return stderr;
      return undefined;
    }),
    globals: { get: vi.fn() },
    __stdout: stdout,
    __stderr: stderr,
    ...overrides,
  };
  return py;
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('createPythonRunner', () => {
  it('returns a PythonRunner instance', () => {
    const py = makePyodide();
    const runner = createPythonRunner(py);
    expect(runner).toBeInstanceOf(PythonRunner);
  });

  it('forwards executeWithEnhancedErrors + isEnhancedReady options', async () => {
    const py = makePyodide();
    const enhanced = vi
      .fn<(code: string, ctx: ExecutionContext) => Promise<ExecutionResult>>()
      .mockResolvedValue({ output: 'enhanced output', hasError: false });
    const runner = createPythonRunner(py, {
      executeWithEnhancedErrors: enhanced,
      isEnhancedReady: true,
    });
    const result = await runner.runSnippet({ code: 'print(1)' });
    expect(enhanced).toHaveBeenCalledOnce();
    expect(result.output).toBe('enhanced output');
  });
});

describe('setInputValues', () => {
  it('routes non-empty input through set_input_values_from_js', () => {
    const py = makePyodide();
    const runner = new PythonRunner(py);
    runner.setInputValues('  hello  ');
    expect(py.runPython).toHaveBeenCalledWith(
      expect.stringContaining('set_input_values_from_js("  hello  ")')
    );
  });

  it('escapes embedded quotes to prevent Python-string injection', () => {
    const py = makePyodide();
    const runner = new PythonRunner(py);
    runner.setInputValues('say "hi"');
    expect(py.runPython).toHaveBeenCalledWith(
      expect.stringContaining('set_input_values_from_js("say \\"hi\\"")')
    );
  });

  it('passes empty string when input is empty/whitespace', () => {
    const py = makePyodide();
    const runner = new PythonRunner(py);
    runner.setInputValues('');
    expect(py.runPython).toHaveBeenCalledWith(
      expect.stringContaining('set_input_values_from_js("")')
    );
    py.runPython.mockClear();
    runner.setInputValues('   ');
    expect(py.runPython).toHaveBeenCalledWith(
      expect.stringContaining('set_input_values_from_js("")')
    );
  });

  it('swallows pyodide errors via console.warn (does not throw)', () => {
    const py = makePyodide({
      runPython: vi.fn(() => {
        throw new Error('pyodide boom');
      }),
    });
    const runner = new PythonRunner(py);
    expect(() => runner.setInputValues('x')).not.toThrow();
  });
});

describe('runSnippet — enhanced path', () => {
  it('builds an ExecutionContext with isEducational=true and snippet.py filename', async () => {
    const py = makePyodide();
    const enhanced = vi
      .fn<(code: string, ctx: ExecutionContext) => Promise<ExecutionResult>>()
      .mockResolvedValue({ output: 'ok', hasError: false });
    const runner = new PythonRunner(py, {
      executeWithEnhancedErrors: enhanced,
      isEnhancedReady: true,
    });
    await runner.runSnippet({ code: 'print(1)' });
    const [code, ctx] = enhanced.mock.calls[0]!;
    expect(code).toBe('print(1)');
    expect(ctx).toEqual({ code: 'print(1)', fileName: 'snippet.py', isEducational: true });
  });

  it('calls setInputValues when input is provided', async () => {
    const py = makePyodide();
    const enhanced = vi
      .fn<(code: string, ctx: ExecutionContext) => Promise<ExecutionResult>>()
      .mockResolvedValue({ output: 'ok', hasError: false });
    const runner = new PythonRunner(py, {
      executeWithEnhancedErrors: enhanced,
      isEnhancedReady: true,
    });
    await runner.runSnippet({ code: 'x', input: 'hello' });
    expect(py.runPython).toHaveBeenCalledWith(
      expect.stringContaining('set_input_values_from_js("hello")')
    );
  });

  it('flattens enhanced error into a single human-readable error string', async () => {
    const enhanced = vi
      .fn<(code: string, ctx: ExecutionContext) => Promise<ExecutionResult>>()
      .mockResolvedValue({
        output: '',
        hasError: true,
        error: {
          title: 'NameError',
          message: 'x is not defined',
          details: 'Line 1: x',
          traceback: 'tb',
          suggestions: [],
        },
      });
    const runner = new PythonRunner(makePyodide(), {
      executeWithEnhancedErrors: enhanced,
      isEnhancedReady: true,
    });
    const result = await runner.runSnippet({ code: 'x' });
    expect(result.output).toBe('');
    expect(result.error).toContain('NameError');
    expect(result.error).toContain('x is not defined');
    expect(result.error).toContain('Line 1: x');
  });

  it('returns default success message when enhanced returns empty output', async () => {
    const enhanced = vi
      .fn<(code: string, ctx: ExecutionContext) => Promise<ExecutionResult>>()
      .mockResolvedValue({ output: '', hasError: false });
    const runner = new PythonRunner(makePyodide(), {
      executeWithEnhancedErrors: enhanced,
      isEnhancedReady: true,
    });
    const result = await runner.runSnippet({ code: 'pass' });
    expect(result.output).toBe('Code executed successfully!');
  });

  it('catches synchronous throws from the enhanced path', async () => {
    const enhanced = vi
      .fn<(code: string, ctx: ExecutionContext) => Promise<ExecutionResult>>()
      .mockRejectedValue(new Error('enhanced boom'));
    const runner = new PythonRunner(makePyodide(), {
      executeWithEnhancedErrors: enhanced,
      isEnhancedReady: true,
    });
    const result = await runner.runSnippet({ code: 'x' });
    expect(result.output).toBe('');
    expect(result.error).toBe('enhanced boom');
  });
});

describe('runSnippet — basic fallback', () => {
  it('falls back to executeCodeBasic when isEnhancedReady is false', async () => {
    const py = makePyodide();
    py.runPython = vi.fn((code: string) => {
      if (code.includes('sys.stdout.getvalue()')) return 'hello\n';
      if (code.includes('sys.stderr.getvalue()')) return '';
      return undefined;
    });
    const runner = new PythonRunner(py, { isEnhancedReady: false });
    const result = await runner.runSnippet({ code: 'print("hello")' });
    expect(result.output).toBe('hello\n');
    expect(result.error).toBe('');
  });

  it('routes stderr capture into the error field', async () => {
    const py = makePyodide();
    py.runPython = vi.fn((code: string) => {
      if (code.includes('sys.stdout.getvalue()')) return '';
      if (code.includes('sys.stderr.getvalue()')) return 'Traceback: NameError';
      return undefined;
    });
    const runner = new PythonRunner(py);
    const result = await runner.runSnippet({ code: 'undefined_var' });
    expect(result.output).toBe('');
    expect(result.error).toContain('NameError');
  });

  it('returns default success message when stdout is empty and no error', async () => {
    const py = makePyodide();
    py.runPython = vi.fn((code: string) => {
      if (code.includes('sys.stdout.getvalue()')) return '';
      if (code.includes('sys.stderr.getvalue()')) return '';
      return undefined;
    });
    const runner = new PythonRunner(py);
    const result = await runner.runSnippet({ code: 'x = 1' });
    expect(result.output).toBe('Code executed successfully!');
    expect(result.error).toBe('');
  });

  it('catches and surfaces sync pyodide throws via the error field', async () => {
    const py = makePyodide();
    let calls = 0;
    py.runPython = vi.fn(() => {
      calls += 1;
      if (calls === 3) throw new Error('pyodide explode');
      return '';
    });
    const runner = new PythonRunner(py);
    const result = await runner.runSnippet({ code: 'x' });
    expect(result.output).toBe('');
    expect(result.error).toBe('pyodide explode');
  });

  it('coerces non-Error throws via String() in the runSnippet catch (line 95 falsy arm)', async () => {
    // The runSnippet catch does `error instanceof Error ? error.message
    // : String(error)`. Existing test throws Error; this one throws a
    // plain string so the falsy arm of the ternary fires.
    const py = makePyodide();
    let calls = 0;
    py.runPython = vi.fn(() => {
      calls += 1;
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      if (calls === 3) throw 'plain-string-non-error';
      return '';
    });
    const runner = new PythonRunner(py);
    const result = await runner.runSnippet({ code: 'x' });
    expect(result.output).toBe('');
    expect(result.error).toBe('plain-string-non-error');
  });

  it('uses enhanced path when isEnhancedReady=true even if executeWithEnhancedErrors is undefined', async () => {
    // Defensive branch: option set but function missing → still falls back basic.
    const py = makePyodide();
    py.runPython = vi.fn((code: string) => {
      if (code.includes('sys.stdout.getvalue()')) return 'fallback';
      if (code.includes('sys.stderr.getvalue()')) return '';
      return undefined;
    });
    const runner = new PythonRunner(py, { isEnhancedReady: true });
    const result = await runner.runSnippet({ code: 'x' });
    expect(result.output).toBe('fallback');
  });
});

describe('runProject', () => {
  it('writes all files to the pyodide FS before executing main', async () => {
    const py = makePyodide();
    py.runPython = vi.fn(() => undefined);
    const enhanced = vi
      .fn<(code: string, ctx: ExecutionContext) => Promise<ExecutionResult>>()
      .mockResolvedValue({ output: 'ok', hasError: false });
    const runner = new PythonRunner(py, {
      executeWithEnhancedErrors: enhanced,
      isEnhancedReady: true,
    });
    const files = { 'main.py': 'print("a")', 'helpers.py': 'def x(): pass' };
    await runner.runProject({ files, main: 'main.py' });

    // Each file results in a runPython('os.makedirs ... open ... write') call.
    const writeCalls = py.runPython.mock.calls
      .map((c) => String(c[0]))
      .filter((s) => s.includes('open(') && s.includes('"w"'));
    expect(writeCalls.length).toBe(2);
  });

  it('throws when the named main file is missing from files map', async () => {
    const enhanced = vi.fn();
    const runner = new PythonRunner(makePyodide(), {
      executeWithEnhancedErrors: enhanced,
      isEnhancedReady: true,
    });
    const result = await runner.runProject({
      files: { 'other.py': 'x' },
      main: 'main.py',
    });
    expect(result.hasError).toBe(true);
    expect(result.error?.title).toBe('Project Execution Error');
    expect(result.error?.message).toMatch(/main\.py.*not found/);
  });

  it('passes a default ExecutionContext containing files when none provided', async () => {
    const py = makePyodide();
    py.runPython = vi.fn(() => undefined);
    const enhanced = vi
      .fn<(code: string, ctx: ExecutionContext) => Promise<ExecutionResult>>()
      .mockResolvedValue({ output: 'ok', hasError: false });
    const runner = new PythonRunner(py, {
      executeWithEnhancedErrors: enhanced,
      isEnhancedReady: true,
    });
    const files = { 'main.py': 'print(1)' };
    await runner.runProject({ files, main: 'main.py' });
    const ctx = enhanced.mock.calls[0]![1];
    expect(ctx.fileName).toBe('main.py');
    expect(ctx.isEducational).toBe(true);
    expect(ctx.files).toEqual(files);
  });

  it('honors explicit ExecutionContext over the default', async () => {
    const py = makePyodide();
    py.runPython = vi.fn(() => undefined);
    const enhanced = vi
      .fn<(code: string, ctx: ExecutionContext) => Promise<ExecutionResult>>()
      .mockResolvedValue({ output: 'ok', hasError: false });
    const runner = new PythonRunner(py, {
      executeWithEnhancedErrors: enhanced,
      isEnhancedReady: true,
    });
    const explicit: ExecutionContext = {
      code: 'print(2)',
      fileName: 'override.py',
      isEducational: false,
    };
    await runner.runProject({
      files: { 'main.py': 'print(1)' },
      main: 'main.py',
      context: explicit,
    });
    expect(enhanced.mock.calls[0]![1]).toBe(explicit);
  });

  it('basic-fallback runProject yields hasError=false + error=undefined when stderr empty (line 140 falsy arm)', async () => {
    // The runProject ternary `result.error ? {title, ...} : undefined`
    // takes its falsy arm when executeCodeBasic returns no error. The
    // existing fallback test always populates stderr → truthy. With
    // empty stderr, executeCodeBasic returns error: '' and the ternary
    // resolves to undefined.
    const py = makePyodide();
    py.runPython = vi.fn((code: string) => {
      if (code.includes('sys.stdout.getvalue()')) return 'output ok';
      if (code.includes('sys.stderr.getvalue()')) return ''; // no error
      return undefined;
    });
    const runner = new PythonRunner(py, { isEnhancedReady: false });
    const result = await runner.runProject({
      files: { 'main.py': 'print("ok")' },
      main: 'main.py',
    });
    expect(result.hasError).toBe(false);
    expect(result.error).toBeUndefined();
    expect(result.output).toMatch(/output ok|Code executed successfully/);
  });

  it('coerces non-Error throws via String() in the runProject outer catch (line 152 falsy arm)', async () => {
    // The runProject outer catch covers non-Error throws from the
    // enhanced executor. Force a string throw out of the enhanced
    // executor and assert the error.message is the String() coercion.
    // (writeFilesToFS swallows its own throws; the enhanced path is
    // the cleanest way to bubble a thrown value into runProject's
    // outer catch.)
    const py = makePyodide();
    py.runPython = vi.fn(() => undefined);
    const enhanced = vi.fn(() => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 'enhanced-string-throw';
    }) as unknown as (code: string, ctx: ExecutionContext) => Promise<ExecutionResult>;
    const runner = new PythonRunner(py, {
      executeWithEnhancedErrors: enhanced,
      isEnhancedReady: true,
    });
    const result = await runner.runProject({
      files: { 'main.py': 'print("x")' },
      main: 'main.py',
    });
    expect(result.hasError).toBe(true);
    expect(result.error?.message).toBe('enhanced-string-throw');
    expect(result.error?.title).toBe('Project Execution Error');
  });

  it('falls back to basic executor when enhanced not ready, normalizing error shape', async () => {
    const py = makePyodide();
    let n = 0;
    py.runPython = vi.fn((code: string) => {
      n += 1;
      // First N calls = file write + setup; capture-getters return strings.
      if (code.includes('sys.stdout.getvalue()')) return '';
      if (code.includes('sys.stderr.getvalue()')) return 'SyntaxError: oops';
      return undefined;
    });
    const runner = new PythonRunner(py, { isEnhancedReady: false });
    const result = await runner.runProject({
      files: { 'main.py': 'bad' },
      main: 'main.py',
    });
    expect(result.hasError).toBe(true);
    expect(result.error?.title).toBe('Execution Error');
    expect(result.error?.message).toMatch(/SyntaxError/);
    expect(n).toBeGreaterThan(0);
  });
});

describe('writeFilesToFS', () => {
  it('escapes backslashes and quotes in file content to keep Python triple-quoted strings safe', () => {
    const py = makePyodide();
    py.runPython = vi.fn(() => undefined);
    const runner = new PythonRunner(py);
    runner.writeFilesToFS({ 'a.py': 'print("hi")\\n' });
    const writeCall = py.runPython.mock.calls.find((c) => String(c[0]).includes('open('));
    expect(String(writeCall![0])).toContain('\\\\n');
    expect(String(writeCall![0])).toContain('\\"hi\\"');
  });

  it('swallows fs errors via console.warn', () => {
    const py = makePyodide({
      runPython: vi.fn(() => {
        throw new Error('fs full');
      }),
    });
    const runner = new PythonRunner(py);
    expect(() => runner.writeFilesToFS({ 'a.py': '1' })).not.toThrow();
  });
});

describe('restoreStreams', () => {
  it('runs a stdout/stderr restore snippet', () => {
    const py = makePyodide();
    const runner = new PythonRunner(py);
    runner.restoreStreams();
    expect(py.runPython).toHaveBeenCalledWith(
      expect.stringContaining('sys.stdout = sys.__stdout__')
    );
  });

  it('swallows pyodide errors during restore', () => {
    const py = makePyodide({
      runPython: vi.fn(() => {
        throw new Error('cannot restore');
      }),
    });
    const runner = new PythonRunner(py);
    expect(() => runner.restoreStreams()).not.toThrow();
  });
});
