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

// Pyodide ships a CommonJS `pyodide.js` exposing the global `loadPyodide`.
// Inside a worker we can importScripts() it without a script tag.
declare function importScripts(...urls: string[]): void;
declare const self: DedicatedWorkerGlobalScope & {
  loadPyodide?: (opts?: PyodideLoadOptions) => Promise<PyodideInstance>;
};

const PYODIDE_BASE = '/pyodide/';

export interface RunResult {
  output: string;
  error: string | null;
}

class WorkerRunner {
  private bootstrap: Promise<PyodideInstance> | null = null;
  private stdoutBuffer: string[] = [];
  private stderrBuffer: string[] = [];

  async ready(): Promise<void> {
    await this.getPyodide();
  }

  private async getPyodide(): Promise<PyodideInstance> {
    if (!this.bootstrap) {
      this.bootstrap = (async () => {
        importScripts(`${PYODIDE_BASE}pyodide.js`);
        if (!self.loadPyodide) {
          throw new Error('worker: loadPyodide not exposed after importScripts');
        }
        return self.loadPyodide({
          indexURL: PYODIDE_BASE,
          stdout: (s: string) => this.stdoutBuffer.push(s),
          stderr: (s: string) => this.stderrBuffer.push(s),
        });
      })();
    }
    return this.bootstrap;
  }

  async runSnippet(code: string, input?: string): Promise<RunResult> {
    const pyodide = await this.getPyodide();
    this.stdoutBuffer = [];
    this.stderrBuffer = [];

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
