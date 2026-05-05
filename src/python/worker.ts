/// <reference lib="webworker" />
/**
 * Pyodide worker. Runs all user-authored Python in a dedicated thread so a
 * `while True:` can't wedge the main thread and a runaway program can be
 * killed with `worker.terminate()` without crashing React.
 *
 * The worker exposes a Comlink API: ready(), runSnippet(code, input?).
 * The main-thread WorkerPythonRunner owns the worker lifecycle — it spawns
 * this file once, keeps the Comlink remote, and respawns on timeout.
 */

import * as Comlink from 'comlink';

// Pyodide ships an ESM variant at `pyodide.mjs` exposing `loadPyodide`.
// We dynamic-import it so the worker stays an ESM module (which Vite's
// `?worker` produces by default; classic workers can't use ES imports for
// the rest of our code).

const PYODIDE_BASE = '/pyodide/';

export interface RunResult {
  output: string;
  error: string | null;
  /** Number of times the user code called `input()`. Zero if the snippet never read stdin. */
  inputCalls: number;
  /** Per-function call counts for any names passed in `runSnippet`'s `trackFunctions` arg. */
  functionCalls: Record<string, number>;
}

// Default mirrors worker-runner.ts; main thread's RunOptions.maxStdout overrides per-call.
const DEFAULT_MAX_STDOUT = 64 * 1024;

class WorkerRunner {
  private bootstrap: Promise<PyodideInstance> | null = null;
  private stdoutBuffer: string[] = [];
  private stderrBuffer: string[] = [];
  private stdoutBytes = 0;
  private stdoutCap = DEFAULT_MAX_STDOUT;
  private stdoutTruncated = false;

  async ready(): Promise<void> {
    await this.getPyodide();
  }

  private appendStdout(s: string): void {
    if (this.stdoutTruncated) return;
    if (this.stdoutBytes + s.length <= this.stdoutCap) {
      this.stdoutBuffer.push(s);
      this.stdoutBytes += s.length;
      return;
    }
    // Take just the slice that fits, then mark truncated and drop the rest.
    // Keeping the partial keeps the start-of-output anchor for debugging while
    // still capping bytes flowing across Comlink.
    const remaining = this.stdoutCap - this.stdoutBytes;
    if (remaining > 0) {
      this.stdoutBuffer.push(s.slice(0, remaining));
      this.stdoutBytes = this.stdoutCap;
    }
    this.stdoutTruncated = true;
    this.stdoutBuffer.push(`\n[output truncated — exceeded ${this.stdoutCap} bytes]`);
  }

  private async getPyodide(): Promise<PyodideInstance> {
    if (!this.bootstrap) {
      this.bootstrap = (async () => {
        const mod = (await import(/* @vite-ignore */ `${PYODIDE_BASE}pyodide.mjs`)) as {
          loadPyodide: (opts?: PyodideLoadOptions) => Promise<PyodideInstance>;
        };
        return mod.loadPyodide({
          indexURL: PYODIDE_BASE,
          stdout: (s: string) => this.appendStdout(s),
          stderr: (s: string) => this.stderrBuffer.push(s),
        });
      })();
    }
    return this.bootstrap;
  }

  async runSnippet(
    code: string,
    input?: string,
    maxStdout?: number,
    trackFunctions?: string[]
  ): Promise<RunResult> {
    const pyodide = await this.getPyodide();
    this.stdoutBuffer = [];
    this.stderrBuffer = [];
    this.stdoutBytes = 0;
    this.stdoutCap = maxStdout ?? DEFAULT_MAX_STDOUT;
    this.stdoutTruncated = false;

    // Always (re)install builtins.input. If the caller passed `input`, lines
    // come from a StringIO buffer; otherwise input() raises EOFError immediately.
    // Without this reset, a previous test's buffer would leak into this call —
    // either silently returning '' past EOF or hanging waiting for stdin.
    pyodide.globals.set('__pp_input__', input ?? '');
    pyodide.globals.set('__pp_has_input__', input !== undefined);
    pyodide.globals.set('__pp_track_names__', JSON.stringify(trackFunctions ?? []));
    pyodide.runPython(`
import builtins, io, json, sys
__pp_input_calls = 0
__pp_func_calls = {name: 0 for name in json.loads(__pp_track_names__)}
if __pp_has_input__:
    _pp_buf = io.StringIO(__pp_input__ + ('' if __pp_input__.endswith('\\n') else '\\n'))
    def __pp_input(prompt=''):
        global __pp_input_calls
        __pp_input_calls += 1
        line = _pp_buf.readline()
        if line == '':
            raise EOFError('EOF when reading a line')
        return line[:-1] if line.endswith('\\n') else line
else:
    def __pp_input(prompt=''):
        global __pp_input_calls
        __pp_input_calls += 1
        raise EOFError('EOF when reading a line')
builtins.input = __pp_input

# Function-call tracking via sys.settrace. The trace function is called on
# every Python frame entry; if the frame's code object's name matches a tracked
# name, increment the counter. Cheap (a dict lookup per call) and observes the
# student's actual calls without source rewriting.
if __pp_func_calls:
    def __pp_tracer(frame, event, arg):
        if event == 'call':
            name = frame.f_code.co_name
            if name in __pp_func_calls:
                __pp_func_calls[name] += 1
        return None  # don't enable line-level trace
    sys.settrace(__pp_tracer)
else:
    sys.settrace(None)
`);

    let runErr: string | null = null;
    try {
      await pyodide.runPythonAsync(code);
    } catch (err) {
      runErr = err instanceof Error ? err.message : String(err);
    }
    // Always tear down the tracer so a subsequent snippet (or our own postlude)
    // doesn't pay the per-call overhead.
    pyodide.runPython('import sys; sys.settrace(None)');

    return {
      output: this.stdoutBuffer.join(''),
      error:
        runErr ?? (this.stderrBuffer.length ? this.stderrBuffer.join('') : null),
      inputCalls: Number(pyodide.globals.get('__pp_input_calls') ?? 0),
      functionCalls: extractFunctionCalls(pyodide),
    };
  }
}

function extractFunctionCalls(pyodide: PyodideInstance): Record<string, number> {
  const raw = pyodide.globals.get('__pp_func_calls');
  if (!raw) return {};
  // PyProxy of a Python dict — convert via toJs and ensure the values are numbers.
  const toJs = (raw as { toJs?: (opts?: { dict_converter?: typeof Object.fromEntries }) => unknown })
    .toJs;
  if (typeof toJs !== 'function') return {};
  const obj = toJs.call(raw, { dict_converter: Object.fromEntries }) as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = Number(v);
  }
  return out;
}

const runner = new WorkerRunner();
Comlink.expose(runner);

// For TypeScript users importing the worker class as a type.
export type { WorkerRunner };
