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
    fakeRunSnippet.mockResolvedValueOnce({ output: 'hi\n', error: null });
    const runner = new WorkerPythonRunner();
    const result = await runner.runSnippet({ code: "print('hi')" });
    expect(result).toEqual({ output: 'hi\n', error: null });
    expect(fakeReady).toHaveBeenCalledOnce();
  });

  it('rejects with PythonTimeoutError when the worker hangs', async () => {
    fakeRunSnippet.mockImplementationOnce(() => new Promise(() => {})); // never resolves
    const runner = new WorkerPythonRunner();
    await expect(
      runner.runSnippet({ code: 'while True: pass', timeoutMs: 50 }),
    ).rejects.toBeInstanceOf(PythonTimeoutError);
  });

  it('terminates and respawns the worker after a timeout', async () => {
    fakeRunSnippet.mockImplementationOnce(() => new Promise(() => {}));
    const runner = new WorkerPythonRunner();
    await expect(
      runner.runSnippet({ code: 'while True: pass', timeoutMs: 30 }),
    ).rejects.toBeInstanceOf(PythonTimeoutError);
    // Next call must rebuild the worker via ensure()
    fakeRunSnippet.mockResolvedValueOnce({ output: 'ok', error: null });
    const result = await runner.runSnippet({ code: "print('ok')" });
    expect(result.output).toBe('ok');
    expect(fakeReady).toHaveBeenCalledTimes(2); // bootstrapped twice
  });

  it('clips stdout that exceeds maxStdout', async () => {
    const big = 'x'.repeat(200);
    fakeRunSnippet.mockResolvedValueOnce({ output: big, error: null });
    const runner = new WorkerPythonRunner();
    const result = await runner.runSnippet({ code: 'whatever', maxStdout: 50 });
    expect(result.output.length).toBeLessThan(big.length);
    expect(result.output).toContain('truncated');
  });

  it('exposes a page-level singleton via getWorkerRunner', () => {
    const a = getWorkerRunner();
    const b = getWorkerRunner();
    expect(a).toBe(b);
  });
});
