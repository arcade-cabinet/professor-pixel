import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// pyodide-cache lives behind a module-level promise cache, so we
// re-import per test via vi.resetModules() to keep state isolated.
// __resetPyodideCacheForTests() also drops the cache for in-process resets.

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('registerPyodideCache — environment guards', () => {
  it('returns null when serviceWorker is not in navigator', async () => {
    vi.stubGlobal('navigator', {});
    const { registerPyodideCache } = await import('@lib/python/pyodide-cache');
    expect(await registerPyodideCache()).toBe(null);
  });

  it('returns null inside Capacitor (capacitor: protocol)', async () => {
    vi.stubGlobal('navigator', {
      serviceWorker: { register: vi.fn() },
      storage: { persist: vi.fn() },
    });
    vi.stubGlobal('window', { location: { protocol: 'capacitor:' } });
    const { registerPyodideCache } = await import('@lib/python/pyodide-cache');
    expect(await registerPyodideCache()).toBe(null);
  });

  it('returns null inside capacitor-electron (capacitor-electron: protocol)', async () => {
    vi.stubGlobal('navigator', {
      serviceWorker: { register: vi.fn() },
      storage: { persist: vi.fn() },
    });
    vi.stubGlobal('window', { location: { protocol: 'capacitor-electron:' } });
    const { registerPyodideCache } = await import('@lib/python/pyodide-cache');
    expect(await registerPyodideCache()).toBe(null);
  });
});

describe('registerPyodideCache — SSR window guard (line 44 path 1 falsy)', () => {
  it('skips the Capacitor-protocol check when typeof window is undefined', async () => {
    // The Capacitor protocol guard is gated by `typeof window !== 'undefined'`.
    // Existing tests always run with jsdom (window present) → truthy arm
    // is hot, falsy arm (SSR) sat cold. Stub navigator with a working
    // serviceWorker + storage so the earlier guard passes, then
    // window=undefined so the Capacitor check is skipped and registration
    // proceeds.
    const fakeReg = { scope: '/' };
    const register = vi.fn().mockResolvedValue(fakeReg);
    vi.stubGlobal('navigator', {
      serviceWorker: { register },
      storage: { persist: vi.fn().mockResolvedValue(true) },
    });
    vi.stubGlobal('window', undefined);
    const { registerPyodideCache } = await import('@lib/python/pyodide-cache');
    expect(await registerPyodideCache()).toBe(fakeReg);
    expect(register).toHaveBeenCalledOnce();
  });
});

describe('registerPyodideCache — happy path', () => {
  it('registers the SW under the baseUrl scope and returns the registration', async () => {
    const fakeReg = { scope: '/' };
    const register = vi.fn().mockResolvedValue(fakeReg);
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', {
      serviceWorker: { register },
      storage: { persist, getDirectory: vi.fn() },
    });
    vi.stubGlobal('window', { location: { protocol: 'http:' } });

    const { registerPyodideCache } = await import('@lib/python/pyodide-cache');
    const result = await registerPyodideCache();
    expect(result).toBe(fakeReg);
    expect(register).toHaveBeenCalledOnce();
    const [url, opts] = register.mock.calls[0]!;
    expect(url).toMatch(/pyodide-sw\.js$/);
    expect(opts.scope).toBeTruthy();
    // navigator.storage.persist() was attempted (opportunistic).
    expect(persist).toHaveBeenCalledOnce();
  });

  it('caches the registration promise — second call does not re-register', async () => {
    const fakeReg = { scope: '/' };
    const register = vi.fn().mockResolvedValue(fakeReg);
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', {
      serviceWorker: { register },
      storage: { persist },
    });
    vi.stubGlobal('window', { location: { protocol: 'http:' } });

    const { registerPyodideCache } = await import('@lib/python/pyodide-cache');
    await registerPyodideCache();
    await registerPyodideCache();
    expect(register).toHaveBeenCalledOnce();
  });

  it('__resetPyodideCacheForTests drops the cache so the next call re-registers', async () => {
    const fakeReg = { scope: '/' };
    const register = vi.fn().mockResolvedValue(fakeReg);
    vi.stubGlobal('navigator', {
      serviceWorker: { register },
      storage: { persist: vi.fn().mockResolvedValue(true) },
    });
    vi.stubGlobal('window', { location: { protocol: 'http:' } });

    const { registerPyodideCache, __resetPyodideCacheForTests } = await import(
      '@lib/python/pyodide-cache'
    );
    await registerPyodideCache();
    __resetPyodideCacheForTests();
    await registerPyodideCache();
    expect(register).toHaveBeenCalledTimes(2);
  });

  it('skips persist() when navigator.storage is missing (graceful degrade)', async () => {
    const fakeReg = { scope: '/' };
    const register = vi.fn().mockResolvedValue(fakeReg);
    vi.stubGlobal('navigator', {
      serviceWorker: { register },
      // No storage at all — code path falls through without throwing.
    });
    vi.stubGlobal('window', { location: { protocol: 'http:' } });

    const { registerPyodideCache } = await import('@lib/python/pyodide-cache');
    expect(await registerPyodideCache()).toBe(fakeReg);
  });

  it('continues registering even when persist() rejects', async () => {
    const fakeReg = { scope: '/' };
    const register = vi.fn().mockResolvedValue(fakeReg);
    const persist = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', {
      serviceWorker: { register },
      storage: { persist },
    });
    vi.stubGlobal('window', { location: { protocol: 'http:' } });

    const { registerPyodideCache } = await import('@lib/python/pyodide-cache');
    expect(await registerPyodideCache()).toBe(fakeReg);
  });
});

describe('registerPyodideCache — error path', () => {
  it('returns null when serviceWorker.register throws (logs to console.warn)', async () => {
    const register = vi.fn().mockRejectedValue(new Error('SW registration failed'));
    vi.stubGlobal('navigator', {
      serviceWorker: { register },
      storage: { persist: vi.fn().mockResolvedValue(true) },
    });
    vi.stubGlobal('window', { location: { protocol: 'http:' } });

    const { registerPyodideCache } = await import('@lib/python/pyodide-cache');
    expect(await registerPyodideCache()).toBe(null);
    // Warn fired with the failure context.
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('isOpfsAvailable', () => {
  it('returns false when navigator is undefined', async () => {
    vi.stubGlobal('navigator', undefined);
    const { isOpfsAvailable } = await import('@lib/python/pyodide-cache');
    expect(await isOpfsAvailable()).toBe(false);
  });

  it('returns false when navigator.storage is missing', async () => {
    vi.stubGlobal('navigator', {});
    const { isOpfsAvailable } = await import('@lib/python/pyodide-cache');
    expect(await isOpfsAvailable()).toBe(false);
  });

  it('returns false when getDirectory is not available', async () => {
    vi.stubGlobal('navigator', { storage: { persist: vi.fn() } });
    const { isOpfsAvailable } = await import('@lib/python/pyodide-cache');
    expect(await isOpfsAvailable()).toBe(false);
  });

  it('returns true when getDirectory resolves', async () => {
    const getDirectory = vi.fn().mockResolvedValue({});
    vi.stubGlobal('navigator', { storage: { getDirectory } });
    const { isOpfsAvailable } = await import('@lib/python/pyodide-cache');
    expect(await isOpfsAvailable()).toBe(true);
    expect(getDirectory).toHaveBeenCalledOnce();
  });

  it('returns false when getDirectory throws (e.g., Safari private mode)', async () => {
    const getDirectory = vi.fn().mockRejectedValue(new Error('opfs unavailable'));
    vi.stubGlobal('navigator', { storage: { getDirectory } });
    const { isOpfsAvailable } = await import('@lib/python/pyodide-cache');
    expect(await isOpfsAvailable()).toBe(false);
  });
});
