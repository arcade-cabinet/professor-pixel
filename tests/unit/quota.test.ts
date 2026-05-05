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
  _resetQuotaWarning,
} from '@lib/storage/quota';

beforeEach(() => {
  _resetQuotaWarning();
  setEstimateImpl(undefined);
  // shouldWarnQuota now also probes localStorage byte size; clear it
  // so accumulation from a previous suite doesn't put us over the
  // 4MB threshold and cross-contaminate the threshold tests.
  localStorage.clear();
});

afterEach(() => {
  _resetQuotaWarning();
  setEstimateImpl(undefined);
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
    // Folded forward from task-022 review: the byte-count path was
    // untested. Stuff a string whose UTF-16 byte size crosses the 4MB
    // threshold (each char = 2 bytes), confirming shouldWarnQuota fires
    // even when the estimate API is unavailable (Safari, private mode).
    // 2.25M chars * 2 bytes = 4.5 MB — comfortably over 4 MB without
    // doubling heap allocation for no signal.
    const big = 'a'.repeat(2_250_000);
    localStorage.setItem('pp.bigKey', big);
    expect(await shouldWarnQuota()).toBe(true);
  });

  it('localStorage threshold respects the session-once gate', async () => {
    const big = 'a'.repeat(2_250_000); // ~4.5 MB UTF-16
    localStorage.setItem('pp.bigKey', big);
    expect(await shouldWarnQuota()).toBe(true);
    markQuotaWarned();
    // Even though localStorage is still over budget, we don't re-warn.
    expect(await shouldWarnQuota()).toBe(false);
  });
});
