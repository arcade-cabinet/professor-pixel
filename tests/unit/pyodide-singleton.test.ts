import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetPyodideForTests,
  PyodideLoadError,
  getPyodide,
  isPyodideReady,
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
});
