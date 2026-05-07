import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetStorageBlockedCache, isStorageBlocked } from '@lib/storage/private-mode';

// private-mode.ts probes localStorage with a sentinel write/read/delete
// to detect Safari private mode + locked-down profiles where writes
// silently fail. Tests cover all four detection branches.

beforeEach(() => {
  __resetStorageBlockedCache();
});

afterEach(() => {
  __resetStorageBlockedCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('isStorageBlocked', () => {
  it('returns false when localStorage round-trips a probe value', () => {
    // jsdom localStorage is a real implementation; default round-trip works.
    expect(isStorageBlocked()).toBe(false);
  });

  it('memoizes the answer — second call does not re-probe', () => {
    // First call computes + caches. Stub setItem AFTER the cache is warm
    // and verify the second call returns the cached false without
    // calling setItem again.
    expect(isStorageBlocked()).toBe(false);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    expect(isStorageBlocked()).toBe(false);
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('returns true when localStorage.setItem throws (private mode)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    });
    expect(isStorageBlocked()).toBe(true);
  });

  it('returns true when echoed value differs from the probe (silent-vanish profile)', () => {
    // Some locked-down profiles accept setItem but vanish the entry on
    // the next getItem. Stub getItem to return a different value.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('not-the-probe');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
    expect(isStorageBlocked()).toBe(true);
  });

  it('returns true when the echoed value is null (write silently dropped)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
    expect(isStorageBlocked()).toBe(true);
  });

  it('cleans up the probe entry after a successful round-trip', () => {
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem');
    isStorageBlocked();
    // The probe key is randomized per module load; verify removeItem
    // was called with a key matching the pp.__storage_probe_ prefix.
    expect(removeSpy).toHaveBeenCalledWith(expect.stringMatching(/^pp\.__storage_probe_/));
  });

  it('__resetStorageBlockedCache forces a fresh probe', () => {
    // First call: success path.
    expect(isStorageBlocked()).toBe(false);
    // Reset, then make the next probe fail.
    __resetStorageBlockedCache();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked now');
    });
    expect(isStorageBlocked()).toBe(true);
  });
});
