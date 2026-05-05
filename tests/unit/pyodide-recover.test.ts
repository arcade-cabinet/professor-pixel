import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We test recoverPyodide() in isolation, so we mock loadPyodide rather than
// pulling in the real Pyodide CDN at unit-test time.
const fakeInstance = { runPythonAsync: vi.fn() } as unknown as PyodideInstance;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('recoverPyodide', () => {
  it('clears the cached bootstrap promise so the next getPyodide re-bootstraps', async () => {
    const loadCalls: number[] = [];
    vi.stubGlobal('window', {
      loadPyodide: vi.fn(async () => {
        loadCalls.push(Date.now());
        return fakeInstance;
      }),
    });

    const mod = await import('@lib/python/pyodide-singleton');
    // First boot — uses the cache.
    const a = await mod.getPyodide();
    const b = await mod.getPyodide();
    expect(a).toBe(b);
    expect(loadCalls.length).toBe(1);

    // Recover — drops cache.
    mod.recoverPyodide();
    expect(mod.getPyodideState()).toBe('uninitialized');

    // Next call re-boots.
    const c = await mod.getPyodide();
    expect(loadCalls.length).toBe(2);
    expect(c).toBe(fakeInstance);
  });

  it('clears coldStartMs so a stale boot timing is not reported after recovery', async () => {
    vi.stubGlobal('window', {
      loadPyodide: vi.fn(async () => fakeInstance),
    });
    const mod = await import('@lib/python/pyodide-singleton');
    await mod.getPyodide();
    expect(mod.getColdStartMs()).not.toBeNull();

    mod.recoverPyodide();
    expect(mod.getColdStartMs()).toBeNull();
  });

  it('removes window.pyodide so isPyodideReady reflects the cleared state', async () => {
    const win = { loadPyodide: vi.fn(async () => fakeInstance) } as unknown as Window & {
      pyodide?: PyodideInstance;
    };
    vi.stubGlobal('window', win);

    const mod = await import('@lib/python/pyodide-singleton');
    await mod.getPyodide();
    // The real bootstrap sets window.pyodide; simulate that here since our
    // mocked loadPyodide doesn't.
    win.pyodide = fakeInstance;
    expect(mod.isPyodideReady()).toBe(true);

    mod.recoverPyodide();
    expect(mod.isPyodideReady()).toBe(false);
  });
});
