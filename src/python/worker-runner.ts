import * as Comlink from 'comlink';
import type { RunResult, WorkerRunner } from './worker';

export class PythonTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Python execution exceeded ${timeoutMs}ms timeout`);
    this.name = 'PythonTimeoutError';
  }
}

export interface RunOptions {
  code: string;
  input?: string;
  /** Hard cap for the run; on overshoot the worker is terminated and respawned. */
  timeoutMs?: number;
  /** Cap on captured stdout to prevent the worker shipping megabytes back. */
  maxStdout?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_STDOUT = 64 * 1024;

/**
 * Owns the Pyodide worker lifecycle on the main thread. One instance per page;
 * if a snippet times out the underlying Worker is terminated and a fresh one is
 * spawned on next call. The Comlink remote is rebuilt transparently.
 */
export class WorkerPythonRunner {
  private worker: Worker | null = null;
  private remote: Comlink.Remote<WorkerRunner> | null = null;
  private bootstrap: Promise<void> | null = null;

  async ready(): Promise<void> {
    await this.ensure();
  }

  async runSnippet(opts: RunOptions): Promise<RunResult> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxStdout = opts.maxStdout ?? DEFAULT_MAX_STDOUT;
    const remote = await this.ensure();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new PythonTimeoutError(timeoutMs)), timeoutMs);
    });

    try {
      const result = await Promise.race([
        remote.runSnippet(opts.code, opts.input),
        timeoutPromise,
      ]);
      if (timer) clearTimeout(timer);
      return clipResult(result, maxStdout);
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (err instanceof PythonTimeoutError) {
        // Kill the wedged worker; the next call will spawn a fresh one.
        this.terminate();
        throw err;
      }
      throw err;
    }
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.remote = null;
      this.bootstrap = null;
    }
  }

  private async ensure(): Promise<Comlink.Remote<WorkerRunner>> {
    if (this.remote) return this.remote;
    if (!this.bootstrap) {
      this.bootstrap = (async () => {
        // Vite resolves the `?worker` suffix to a compiled bundle URL.
        const WorkerCtor = (await import('./worker?worker')).default;
        this.worker = new WorkerCtor();
        this.remote = Comlink.wrap<WorkerRunner>(this.worker);
        await this.remote.ready();
      })();
    }
    await this.bootstrap;
    if (!this.remote) {
      throw new Error('Worker bootstrap finished but remote is null');
    }
    return this.remote;
  }
}

function clipResult(result: RunResult, maxStdout: number): RunResult {
  if (result.output.length <= maxStdout) return result;
  return {
    output:
      result.output.slice(0, maxStdout) +
      `\n[output truncated — exceeded ${maxStdout} bytes]`,
    error: result.error,
  };
}

let pageRunner: WorkerPythonRunner | null = null;

/** Page-level singleton — share one worker across the lesson page, runner, etc. */
export function getWorkerRunner(): WorkerPythonRunner {
  if (!pageRunner) pageRunner = new WorkerPythonRunner();
  return pageRunner;
}

/** Test-only: drop the cached runner. */
export function __resetWorkerRunnerForTests(): void {
  pageRunner?.terminate();
  pageRunner = null;
}
