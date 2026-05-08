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

  it('throws when window.loadPyodide is missing after the script loads', async () => {
    // Simulate a script that "loads" successfully but fails to install
    // window.loadPyodide (CDN cache hit on a partial deploy, vendored
    // copy of pyodide.js corrupted, etc.).
    appendChildSpy.mockRestore();
    appendChildSpy = spyAppendChild().mockImplementation(<T extends Node>(node: T): T => {
      queueMicrotask(() => {
        // Intentionally do NOT set window.loadPyodide before firing onload.
        const script = node as unknown as HTMLScriptElement;
        script.onload?.(new Event('load'));
      });
      return node;
    });

    await expect(getPyodide()).rejects.toBeInstanceOf(PyodideLoadError);
  });

  it('wraps a window.loadPyodide rejection in a PyodideLoadError', async () => {
    appendChildSpy.mockRestore();
    appendChildSpy = spyAppendChild().mockImplementation(<T extends Node>(node: T): T => {
      queueMicrotask(() => {
        const script = node as unknown as HTMLScriptElement;
        // loadPyodide is set, but it rejects — pyodide internal init failure.
        (window as unknown as TestWindow).loadPyodide = vi
          .fn()
          .mockRejectedValue(new Error('init failed'));
        script.onload?.(new Event('load'));
      });
      return node;
    });

    await expect(getPyodide()).rejects.toBeInstanceOf(PyodideLoadError);
  });

  it('reuses an existing script tag whose loadPyodide is already on window', async () => {
    // Pre-insert a script tag matching the expected src AND set
    // window.loadPyodide. The bootstrap should short-circuit the
    // "no existing tag" branch of loadPyodideScript and resolve
    // without ever calling appendChild.
    const indexUrl = '/pyodide/';
    const scriptSrc = `${indexUrl}pyodide.js`;
    const tag = document.createElement('script');
    tag.src = scriptSrc;
    document.head.appendChild(tag);
    (window as unknown as TestWindow).loadPyodide = vi.fn().mockResolvedValue(fakePyodide);

    // Reset appendChild count so we can assert no NEW append happened.
    appendChildSpy.mockRestore();
    appendChildSpy = spyAppendChild();

    const result = await getPyodide();
    expect(result).toBe(fakePyodide);
    // The class-detection short-circuit means we should NOT have appended
    // a fresh script tag.
    expect(appendChildSpy).not.toHaveBeenCalled();

    tag.remove();
  });

  it('replaces a dead script tag (status=loaded but no window.loadPyodide)', async () => {
    // Pre-insert a "dead" tag — load already fired, but loadPyodide
    // never got installed. The bootstrap detects this and removes
    // the tag, then creates a fresh one.
    const indexUrl = '/pyodide/';
    const scriptSrc = `${indexUrl}pyodide.js`;
    const deadTag = document.createElement('script');
    deadTag.src = scriptSrc;
    deadTag.dataset.pyodideStatus = 'loaded';
    document.head.appendChild(deadTag);

    // Default beforeEach mock will install loadPyodide on the new
    // append, so this should succeed.
    const result = await getPyodide();
    expect(result).toBe(fakePyodide);
    // The dead tag was replaced — there is now a fresh tag in the DOM.
    expect(document.head.contains(deadTag)).toBe(false);
  });

  it('skips relative-URL resolution when indexURL is absolute (line 142 falsy arm)', async () => {
    // The default indexURL is `/pyodide/` (relative) — bootstrap then
    // resolves it against window.location.href before passing to
    // window.loadPyodide as packageBaseUrl. When the caller supplies an
    // absolute URL (https://...), bootstrap must NOT touch it: the
    // `if (!startsWith http(s))` guard's falsy arm short-circuits and
    // packageBaseUrl is forwarded as-is. Pin that contract — a
    // regression that always re-resolves against window.location.href
    // would corrupt CDN-style absolute index URLs.
    const absoluteURL = 'https://cdn.example.com/pyodide/';
    const loadPyodideMock = vi.fn().mockResolvedValue(fakePyodide);
    appendChildSpy.mockRestore();
    appendChildSpy = spyAppendChild().mockImplementation(<T extends Node>(node: T): T => {
      queueMicrotask(() => {
        const script = node as unknown as HTMLScriptElement;
        (window as unknown as TestWindow).loadPyodide = loadPyodideMock;
        script.onload?.(new Event('load'));
      });
      return node;
    });

    await getPyodide({ indexURL: absoluteURL });
    expect(loadPyodideMock).toHaveBeenCalledTimes(1);
    const args = loadPyodideMock.mock.calls[0]![0] as { indexURL: string; packageBaseUrl: string };
    expect(args.indexURL).toBe(absoluteURL);
    // Critical: packageBaseUrl is the same absolute URL, NOT re-resolved
    // against window.location.href.
    expect(args.packageBaseUrl).toBe(absoluteURL);
  });
});
