// Cover the SSR + null-key/null-value paths in src/storage/quota.ts that
// the existing quota-* suites skip:
//   - line 114 truthy: measureLocalStorageBytes returns null when
//     typeof localStorage === 'undefined' (SSR).
//   - line 119 path 0: localStorage.key(i) returning null mid-iteration
//     hits the `continue` arm.
//   - line 120 path 1 falsy: localStorage.getItem(key) returning null
//     fires the `?? ''` fallback.
//   - line 151 path 1 falsy: shouldWarnQuota when sessionStorage is
//     undefined.
//   - line 174 path 1 falsy: markQuotaWarned when sessionStorage is
//     undefined.
//   - line 186 path 1 falsy: _resetQuotaWarning when sessionStorage is
//     undefined.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('quota — measureLocalStorageBytes SSR (line 114 truthy)', () => {
  it('returns false from shouldWarnQuota when localStorage is undefined', async () => {
    // measureLocalStorageBytes is internal — exercise it via shouldWarnQuota.
    // Stub localStorage globally so the typeof guard hits 'undefined'.
    vi.stubGlobal('localStorage', undefined);
    const mod = await import('@lib/storage/quota');
    mod._resetQuotaWarning();
    // estimateImpl is also unavailable in this fixture (no nav.storage stub),
    // so getUsageRatio returns null → shouldWarnQuota returns false.
    mod.setEstimateImpl(undefined);
    expect(await mod.shouldWarnQuota()).toBe(false);
  });
});

describe('quota — null key / null value mid-iteration (lines 119, 120)', () => {
  it("skips entries when localStorage.key(i) returns null (line 119 path 0 truthy)", async () => {
    // Plant 1MB of "a"=value to make length>0 but stub key() to return
    // null, forcing the `if (key === null) continue` arm. The byte total
    // stays at 0 so shouldWarnQuota returns false (well under 4MB).
    localStorage.setItem('a', 'x');
    const keySpy = vi.spyOn(Storage.prototype, 'key').mockReturnValue(null);
    const mod = await import('@lib/storage/quota');
    mod._resetQuotaWarning();
    mod.setEstimateImpl(async () => ({})); // ratio path → null
    expect(await mod.shouldWarnQuota()).toBe(false);
    expect(keySpy).toHaveBeenCalled();
  });

  it("uses '' when localStorage.getItem(key) returns null (line 120 path 1 falsy)", async () => {
    localStorage.setItem('a', 'x');
    // Force getItem to return null; the `?? ''` fallback fires.
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    const mod = await import('@lib/storage/quota');
    mod._resetQuotaWarning();
    mod.setEstimateImpl(async () => ({}));
    // total = (key.length + 0) * 2 → bytes well under 4MB → no warn.
    expect(await mod.shouldWarnQuota()).toBe(false);
  });
});

describe('quota — sessionStorage SSR fallbacks (lines 151, 174, 186)', () => {
  it('shouldWarnQuota proceeds without sessionStorage (line 151 falsy)', async () => {
    vi.stubGlobal('sessionStorage', undefined);
    const mod = await import('@lib/storage/quota');
    // warnedThisSession is a fresh module-level false (resetModules ran).
    // Without sessionStorage the disk-side gate is skipped and we reach the
    // measure path. With no localStorage entries + a null estimate → false.
    mod.setEstimateImpl(async () => ({}));
    expect(await mod.shouldWarnQuota()).toBe(false);
  });

  it('markQuotaWarned no-ops when sessionStorage is undefined (line 174 falsy)', async () => {
    vi.stubGlobal('sessionStorage', undefined);
    const mod = await import('@lib/storage/quota');
    expect(() => mod.markQuotaWarned()).not.toThrow();
    // Subsequent shouldWarnQuota returns false thanks to the in-memory gate
    // (warnedThisSession=true), even with a 5MB measure.
    mod.setEstimateImpl(async () => ({}));
    mod.setMeasureBytesImpl(() => 5 * 1024 * 1024);
    expect(await mod.shouldWarnQuota()).toBe(false);
  });

  it('_resetQuotaWarning no-ops when sessionStorage is undefined (line 186 falsy)', async () => {
    vi.stubGlobal('sessionStorage', undefined);
    const mod = await import('@lib/storage/quota');
    mod.markQuotaWarned();
    expect(() => mod._resetQuotaWarning()).not.toThrow();
    // After reset the in-memory gate is back to false; combined with a
    // ≥4MB measure that puts us back into "warn" territory.
    mod.setEstimateImpl(async () => ({}));
    mod.setMeasureBytesImpl(() => 5 * 1024 * 1024);
    expect(await mod.shouldWarnQuota()).toBe(true);
  });
});
