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
});
