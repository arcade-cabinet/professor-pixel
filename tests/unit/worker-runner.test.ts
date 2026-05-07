import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PythonTimeoutError,
  WorkerPythonRunner,
  __resetWorkerRunnerForTests,
  getWorkerRunner,
} from '@lib/python/worker-runner';

// jsdom doesn't ship a Worker constructor, and we can't run a real Pyodide
// worker in unit tests anyway. We stub the dynamic import so ensure() resolves
// to a mocked Comlink remote.
vi.mock('@lib/python/worker?worker', () => ({
  default: class FakeWorker {
    onerror: ((e: ErrorEvent) => void) | null = null;
    terminate = vi.fn();
    postMessage = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
  },
}));

const fakeReady = vi.fn().mockResolvedValue(undefined);
const fakeRunSnippet = vi.fn();

vi.mock('comlink', () => ({
  wrap: () => ({ ready: fakeReady, runSnippet: fakeRunSnippet }),
  expose: vi.fn(),
}));

describe('WorkerPythonRunner', () => {
  beforeEach(() => {
    fakeReady.mockClear();
    fakeRunSnippet.mockReset();
    __resetWorkerRunnerForTests();
  });

  afterEach(() => {
    __resetWorkerRunnerForTests();
  });

  it('returns the worker result on a normal run', async () => {
    fakeRunSnippet.mockResolvedValueOnce({
      output: 'hi\n',
      error: null,
      inputCalls: 0,
      functionCalls: {},
      globals: {},
    });
    const runner = new WorkerPythonRunner();
    const result = await runner.runSnippet({ code: "print('hi')" });
    expect(result).toEqual({
      output: 'hi\n',
      error: null,
      inputCalls: 0,
      functionCalls: {},
      globals: {},
    });
    expect(fakeReady).toHaveBeenCalledOnce();
  });

  it('rejects with PythonTimeoutError when the worker hangs', async () => {
    fakeRunSnippet.mockImplementationOnce(() => new Promise(() => {})); // never resolves
    const runner = new WorkerPythonRunner();
    await expect(
      runner.runSnippet({ code: 'while True: pass', timeoutMs: 50 })
    ).rejects.toBeInstanceOf(PythonTimeoutError);
  });

  it('terminates and respawns the worker after a timeout', async () => {
    fakeRunSnippet.mockImplementationOnce(() => new Promise(() => {}));
    const runner = new WorkerPythonRunner();
    await expect(
      runner.runSnippet({ code: 'while True: pass', timeoutMs: 30 })
    ).rejects.toBeInstanceOf(PythonTimeoutError);
    // Next call must rebuild the worker via ensure()
    fakeRunSnippet.mockResolvedValueOnce({
      output: 'ok',
      error: null,
      inputCalls: 0,
      functionCalls: {},
      globals: {},
    });
    const result = await runner.runSnippet({ code: "print('ok')" });
    expect(result.output).toBe('ok');
    expect(fakeReady).toHaveBeenCalledTimes(2); // bootstrapped twice
  });

  it('passes maxStdout through to the worker (worker enforces; wrapper verifies)', async () => {
    fakeRunSnippet.mockResolvedValueOnce({
      output: 'x'.repeat(48),
      error: null,
      inputCalls: 0,
      functionCalls: {},
      globals: {},
    });
    const runner = new WorkerPythonRunner();
    await runner.runSnippet({ code: 'whatever', maxStdout: 50 });
    // Wrapper passes maxStdout as the third arg so the worker can truncate during stdout callbacks.
    expect(fakeRunSnippet).toHaveBeenCalledWith('whatever', undefined, 50, undefined, undefined);
  });

  it('main-thread fallback re-clips if the worker overshoots the cap (defense-in-depth)', async () => {
    // Worker is supposed to truncate during the stdout callback, but if it
    // returned more than cap + slack we re-clip on the main thread and warn.
    const overshoot = 'x'.repeat(2000);
    fakeRunSnippet.mockResolvedValueOnce({
      output: overshoot,
      error: null,
      inputCalls: 0,
      functionCalls: {},
      globals: {},
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const runner = new WorkerPythonRunner();
    const result = await runner.runSnippet({ code: 'whatever', maxStdout: 50 });
    expect(result.output.length).toBeLessThan(overshoot.length);
    expect(result.output).toContain('truncated');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('cap missed'));
    consoleErrorSpy.mockRestore();
  });

  it('exposes a page-level singleton via getWorkerRunner', () => {
    const a = getWorkerRunner();
    const b = getWorkerRunner();
    expect(a).toBe(b);
  });

  it('re-throws non-timeout errors without terminating the worker', async () => {
    // Path: error from runSnippet that is NOT a PythonTimeoutError.
    // The catch must rethrow but NOT call this.terminate(). After the
    // throw, the singleton state is intact and a follow-up call reuses
    // the SAME worker (no fresh bootstrap, fakeReady call count
    // unchanged).
    const boom = new Error('worker code path crashed');
    fakeRunSnippet.mockRejectedValueOnce(boom);

    const runner = new WorkerPythonRunner();
    await expect(runner.runSnippet({ code: 'oops' })).rejects.toBe(boom);
    expect(fakeReady).toHaveBeenCalledTimes(1);

    // Reuse path: next call doesn't re-bootstrap.
    fakeRunSnippet.mockResolvedValueOnce({
      output: 'recovered',
      error: null,
      inputCalls: 0,
      functionCalls: {},
      globals: {},
    });
    const result = await runner.runSnippet({ code: "print('ok')" });
    expect(result.output).toBe('recovered');
    expect(fakeReady).toHaveBeenCalledTimes(1); // still 1 — no respawn
  });

  it('clears bootstrap state when ready() rejects, allowing a retry on next call', async () => {
    // Path: ensure()'s catch (lines 108-112) — worker construction +
    // wrapping succeeded but ready() rejected. The catch must:
    //   (a) terminate the half-built worker
    //   (b) null out worker/remote/bootstrap so the next call retries
    //
    // We make ready() reject once, then succeed on the retry. The
    // first call's runSnippet must reject; the second must succeed
    // and bootstrap fresh (fakeReady called twice total).
    fakeReady.mockRejectedValueOnce(new Error('ready failed'));

    const runner = new WorkerPythonRunner();
    await expect(runner.runSnippet({ code: 'whatever' })).rejects.toThrow(/ready failed/);

    // Retry: fresh bootstrap kicks off, ready() resolves on the default
    // mock implementation (returns undefined → success).
    fakeReady.mockResolvedValueOnce(undefined);
    fakeRunSnippet.mockResolvedValueOnce({
      output: 'second-try',
      error: null,
      inputCalls: 0,
      functionCalls: {},
      globals: {},
    });
    const result = await runner.runSnippet({ code: 'whatever' });
    expect(result.output).toBe('second-try');
    expect(fakeReady).toHaveBeenCalledTimes(2);
  });

  it('terminate() is idempotent — second call is a no-op', () => {
    const runner = new WorkerPythonRunner();
    // No worker yet; terminate should be safe.
    expect(() => runner.terminate()).not.toThrow();
    expect(() => runner.terminate()).not.toThrow();
  });
});
