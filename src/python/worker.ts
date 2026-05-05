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

  async runSnippet(code: string, input?: string, maxStdout?: number): Promise<RunResult> {
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
    pyodide.runPython(`
import builtins, io
if __pp_has_input__:
    _pp_buf = io.StringIO(__pp_input__ + ('' if __pp_input__.endswith('\\n') else '\\n'))
    def __pp_input(prompt=''):
        line = _pp_buf.readline()
        if line == '':
            raise EOFError('EOF when reading a line')
        return line[:-1] if line.endswith('\\n') else line
else:
    def __pp_input(prompt=''):
        raise EOFError('EOF when reading a line')
builtins.input = __pp_input
`);

    try {
      await pyodide.runPythonAsync(code);
      return {
        output: this.stdoutBuffer.join(''),
        error: this.stderrBuffer.length ? this.stderrBuffer.join('') : null,
      };
    } catch (err) {
      // Pyodide wraps Python tracebacks in a JS Error.
      const message = err instanceof Error ? err.message : String(err);
      return {
        output: this.stdoutBuffer.join(''),
        error: message,
      };
    }
  }
}

const runner = new WorkerRunner();
Comlink.expose(runner);

// For TypeScript users importing the worker class as a type.
export type { WorkerRunner };
