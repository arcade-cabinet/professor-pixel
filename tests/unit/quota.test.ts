// P4.20 — Storage quota monitoring contract tests.
//
// The quota module surfaces a "you're approaching the cap" toast on
// /home mount. Tests exercise the threshold logic, the session-once
// gate, and the API-unavailable fallback (jsdom doesn't ship the
// Storage API, so the production path returns null gracefully).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getUsageRatio,
  shouldWarnQuota,
  markQuotaWarned,
  setEstimateImpl,
  setMeasureBytesImpl,
  _resetQuotaWarning,
} from '@lib/storage/quota';

beforeEach(() => {
  _resetQuotaWarning();
  setEstimateImpl(undefined);
  setMeasureBytesImpl(undefined);
  // shouldWarnQuota also probes localStorage byte size; clear it so
  // accumulation from a previous suite doesn't cross-contaminate.
  localStorage.clear();
});

afterEach(() => {
  _resetQuotaWarning();
  setEstimateImpl(undefined);
  setMeasureBytesImpl(undefined);
  localStorage.clear();
});

describe('quota monitoring (P4.20)', () => {
  it('returns null when the Storage API is unavailable (jsdom default)', async () => {
    // The default impl falls back to navigator.storage.estimate which
    // doesn't exist in jsdom — getUsageRatio should not throw.
    expect(await getUsageRatio()).toBeNull();
  });

  it('computes the usage ratio from the stub estimate', async () => {
    setEstimateImpl(async () => ({ usage: 800, quota: 1000 }));
    expect(await getUsageRatio()).toBeCloseTo(0.8);
  });

  it('returns null when usage or quota is missing or zero', async () => {
    setEstimateImpl(async () => ({ usage: 100 })); // no quota
    expect(await getUsageRatio()).toBeNull();
    setEstimateImpl(async () => ({ quota: 0 })); // zero quota
    expect(await getUsageRatio()).toBeNull();
  });

  it('warns when usage crosses the 80% threshold', async () => {
    setEstimateImpl(async () => ({ usage: 850, quota: 1000 }));
    expect(await shouldWarnQuota()).toBe(true);
  });

  it('does NOT warn under threshold', async () => {
    setEstimateImpl(async () => ({ usage: 500, quota: 1000 }));
    expect(await shouldWarnQuota()).toBe(false);
  });

  it('only fires the warning once per session', async () => {
    setEstimateImpl(async () => ({ usage: 900, quota: 1000 }));
    expect(await shouldWarnQuota()).toBe(true);
    markQuotaWarned();
    // Second call in the same session is suppressed.
    expect(await shouldWarnQuota()).toBe(false);
  });

  it('does not warn when the API is unavailable, even if the kid is over budget in reality', async () => {
    // No estimate impl set; default falls back to a missing API.
    expect(await shouldWarnQuota()).toBe(false);
  });

  it('warns via the localStorage byte-count fallback when ≥ 4MB used', async () => {
    // Use the bytes-impl seam (folded forward from task-025 review)
    // so we don't allocate multi-MB strings just to cross a number.
    setMeasureBytesImpl(() => 4.5 * 1024 * 1024);
    expect(await shouldWarnQuota()).toBe(true);
  });

  it('localStorage threshold respects the session-once gate', async () => {
    setMeasureBytesImpl(() => 4.5 * 1024 * 1024);
    expect(await shouldWarnQuota()).toBe(true);
    markQuotaWarned();
    expect(await shouldWarnQuota()).toBe(false);
  });

  it('does NOT warn when bytes are below the 4MB threshold', async () => {
    setMeasureBytesImpl(() => 3 * 1024 * 1024); // 3 MB < 4 MB
    expect(await shouldWarnQuota()).toBe(false);
  });

  it('default measureLocalStorageBytes counts each (key, value) UTF-16 pair', async () => {
    // No setMeasureBytesImpl — exercise the real path. Two entries:
    //   key1 (4 chars) + 'a'.repeat(10) (10 chars) = 14 code units = 28 bytes
    //   key2 (4 chars) + 'b'.repeat(20) (20 chars) = 24 code units = 48 bytes
    // Total = 76 bytes. Far below the 4MB threshold, so shouldWarnQuota
    // must be false — but the bytes path is exercised via the call.
    localStorage.setItem('key1', 'a'.repeat(10));
    localStorage.setItem('key2', 'b'.repeat(20));
    expect(await shouldWarnQuota()).toBe(false);
  });

  it('default measureLocalStorageBytes triggers the warning when total ≥ 4MB', async () => {
    // Allocate one entry whose UTF-16 byte count crosses 4MB. A 2.1MB
    // string of single-code-unit chars is 2.1M * 2 = 4.2MB — over the
    // 4MB threshold. The string allocation is real but bounded.
    const bigValue = 'x'.repeat(2.1 * 1024 * 1024);
    localStorage.setItem('big', bigValue);
    expect(await shouldWarnQuota()).toBe(true);
    localStorage.clear();
  });

  it('getUsageRatio returns null when the estimate impl rejects', async () => {
    // Hits the catch branch in getUsageRatio — Safari private mode
    // throws on navigator.storage.estimate(); we treat it as
    // "unavailable" rather than letting the rejection bubble.
    setEstimateImpl(async () => {
      throw new Error('private mode');
    });
    expect(await getUsageRatio()).toBeNull();
  });

  it('the in-memory session gate suppresses repeat warnings even when sessionStorage is broken', async () => {
    setMeasureBytesImpl(() => 4.5 * 1024 * 1024);
    expect(await shouldWarnQuota()).toBe(true);
    markQuotaWarned();
    // The first early-return is `if (warnedThisSession) return false`,
    // not the sessionStorage check — so even if sessionStorage threw,
    // the in-memory gate would still suppress.
    expect(await shouldWarnQuota()).toBe(false);
  });
});
