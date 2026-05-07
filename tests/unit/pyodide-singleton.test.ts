import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetPyodideForTests,
  PyodideLoadError,
  getColdStartMs,
  getPyodide,
  getPyodideState,
  isPyodideReady,
  recoverPyodide,
} from '@lib/python/pyodide-singleton';

interface TestWindow {
  loadPyodide?: (...args: unknown[]) => Promise<unknown>;
  pyodide?: unknown;
}

const fakePyodide = { runPython: vi.fn(), runPythonAsync: vi.fn() } as unknown;

// vi.spyOn's strict generic signature trips on inherited Node methods, so the
// handle is intentionally loose — the runtime contract is enforced by the
// assertions in each test, not by the spy variable's type.
type AppendChildImpl = <T extends Node>(node: T) => T;
interface AppendChildSpy {
  mockRestore: () => void;
  mockImplementation: (impl: AppendChildImpl) => AppendChildSpy;
  mockImplementationOnce: (impl: AppendChildImpl) => AppendChildSpy;
}
function spyAppendChild(): AppendChildSpy {
  return vi.spyOn(document.head, 'appendChild' as never) as unknown as AppendChildSpy;
}

describe('pyodide-singleton', () => {
  let originalFetch: typeof globalThis.fetch;
  let appendChildSpy: AppendChildSpy;

  beforeEach(() => {
    __resetPyodideForTests();
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    appendChildSpy = spyAppendChild().mockImplementation(<T extends Node>(node: T): T => {
      // Simulate the script firing onload synchronously.
      queueMicrotask(() => {
        const script = node as unknown as HTMLScriptElement;
        (window as unknown as TestWindow).loadPyodide = vi.fn().mockResolvedValue(fakePyodide);
        script.onload?.(new Event('load'));
      });
      return node;
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    appendChildSpy.mockRestore();
    delete (window as unknown as TestWindow).loadPyodide;
    delete (window as unknown as TestWindow).pyodide;
    __resetPyodideForTests();
  });

  it('caches the bootstrap promise across concurrent callers', async () => {
    const [a, b] = await Promise.all([getPyodide(), getPyodide()]);
    expect(a).toBe(b);
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
  });

  it('exposes the loaded instance on window.pyodide', async () => {
    await getPyodide();
    expect(isPyodideReady()).toBe(true);
  });

  it('rethrows wrapped error when the loader script fails to attach', async () => {
    appendChildSpy.mockRestore();
    appendChildSpy = spyAppendChild().mockImplementation(<T extends Node>(node: T): T => {
      queueMicrotask(() => {
        (node as unknown as HTMLScriptElement).onerror?.(new Event('error'));
      });
      return node;
    });

    await expect(getPyodide()).rejects.toBeInstanceOf(PyodideLoadError);
  });

  it('resets the cached promise on failure so the next call retries', async () => {
    appendChildSpy.mockRestore();
    appendChildSpy = spyAppendChild()
      .mockImplementationOnce(<T extends Node>(node: T): T => {
        queueMicrotask(() => (node as unknown as HTMLScriptElement).onerror?.(new Event('error')));
        return node;
      })
      .mockImplementationOnce(<T extends Node>(node: T): T => {
        queueMicrotask(() => {
          (window as unknown as TestWindow).loadPyodide = vi.fn().mockResolvedValue(fakePyodide);
          (node as unknown as HTMLScriptElement).onload?.(new Event('load'));
        });
        return node;
      });

    await expect(getPyodide()).rejects.toBeInstanceOf(PyodideLoadError);
    const second = await getPyodide();
    expect(second).toBe(fakePyodide);
  });

  it('getPyodideState reports uninitialized → loading → ready transitions', async () => {
    expect(getPyodideState()).toBe('uninitialized');
    const promise = getPyodide();
    expect(getPyodideState()).toBe('loading');
    await promise;
    expect(getPyodideState()).toBe('ready');
  });

  it('getColdStartMs returns null before bootstrap, a number after', async () => {
    expect(getColdStartMs()).toBeNull();
    await getPyodide();
    const ms = getColdStartMs();
    expect(typeof ms).toBe('number');
    expect(ms).toBeGreaterThanOrEqual(0);
  });

  it('recoverPyodide drops cached state so getPyodideState returns uninitialized', async () => {
    await getPyodide();
    expect(getPyodideState()).toBe('ready');
    expect(getColdStartMs()).not.toBeNull();
    recoverPyodide();
    expect(getPyodideState()).toBe('uninitialized');
    expect(getColdStartMs()).toBeNull();
    expect(isPyodideReady()).toBe(false);
  });

  it('recoverPyodide allows the next getPyodide() to bootstrap fresh', async () => {
    await getPyodide();
    recoverPyodide();
    // loadPyodideScript short-circuits when window.loadPyodide is already
    // defined — clear it so the second boot actually reattaches the script.
    delete (window as unknown as TestWindow).loadPyodide;
    const second = await getPyodide();
    expect(second).toBe(fakePyodide);
    // Two appendChild calls total: original + post-recovery.
    expect(appendChildSpy).toHaveBeenCalledTimes(2);
  });

  it('warns when cold-start exceeds the budget', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Fake performance.now to simulate a slow boot.
    const now = vi.spyOn(performance, 'now');
    let n = 0;
    now.mockImplementation(() => {
      n += 30000; // 30s per call — second call lands well over the budget.
      return n;
    });
    await getPyodide();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/exceeds budget/));
    warnSpy.mockRestore();
    now.mockRestore();
  });
});
