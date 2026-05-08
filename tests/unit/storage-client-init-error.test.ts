// Cover the storage/client.ts branches the existing
// storage-client-expand.test.ts skips:
//   - line 37: safeInit setItem throw → handleStorageError(...,
//     'initializeLocalStorage(...)') is called by the constructor's
//     init loop (existing tests run setItem inside saveToLocalStorage,
//     not the constructor's safeInit)
//   - line 53: handleStorageError window.toast invocation when the
//     error is a QuotaExceededError AND window.toast is set

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  delete (window as Window & { toast?: unknown }).toast;
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('ClientStorage constructor — safeInit setItem throw (line 37)', () => {
  it('safeInit catches a setItem throw and routes through handleStorageError', async () => {
    // Force every key to be missing so safeInit's setItem path runs (the
    // method short-circuits when localStorage already has the key).
    localStorage.clear();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota / corrupt write');
    });
    // Importing fresh so the singleton path doesn't bypass construction.
    const { ClientStorage } = await import('@lib/storage/client');
    expect(() => new ClientStorage()).not.toThrow();
    // The catch fired three times (USERS / PROGRESS / PROJECTS) and each
    // logged a "ClientStorage operation failed (initializeLocalStorage(...))"
    // line via handleStorageError.
    const calls = errSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(calls).toContain('ClientStorage operation failed');
    expect(calls).toContain('initializeLocalStorage');
    setItemSpy.mockRestore();
  });
});

describe('ClientStorage handleStorageError — non-quota error skips toast (line 50 falsy arm)', () => {
  it('non-quota error logs but does NOT invoke window.toast', async () => {
    // The existing init-error test throws an Error with message
    // "quota / corrupt write" which `isQuotaExceeded` matches via the
    // /quota/i message regex → toast fires. To exercise line 50's
    // falsy arm we need an error whose name AND code AND message
    // contain no quota indication.
    localStorage.clear();
    const toastMock = vi.fn();
    (window as Window & { toast?: (msg: unknown) => void }).toast = toastMock;
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      // Plain Error — no QuotaExceededError name, no code, no 'quota' in msg.
      throw new Error('storage tampered with');
    });
    const { ClientStorage } = await import('@lib/storage/client');
    new ClientStorage();
    // The catch fired but isQuotaExceeded returned false → toast skipped.
    expect(toastMock).not.toHaveBeenCalled();
    // The console.error path still ran.
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('ClientStorage handleStorageError — window.toast branch (line 53)', () => {
  it('quota-exceeded constructor write surfaces a toast when window.toast is installed', async () => {
    localStorage.clear();
    const toastMock = vi.fn();
    (window as Window & { toast?: (msg: unknown) => void }).toast = toastMock;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    });
    const { ClientStorage } = await import('@lib/storage/client');
    new ClientStorage();
    // safeInit fires three times (USERS / PROGRESS / PROJECTS); each
    // catch routes through handleStorageError which sees a quota error
    // and calls window.toast. ≥1 invocation is sufficient.
    expect(toastMock).toHaveBeenCalled();
    expect(toastMock.mock.calls[0][0]).toEqual(expect.stringContaining('saved games are full'));
  });
});
