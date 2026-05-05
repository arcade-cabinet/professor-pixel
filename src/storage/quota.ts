// P4.20 — Storage quota monitoring.
//
// The whole app persists in localStorage (wizard state, projects,
// thumbnails, profile). LocalStorage is silently capped per-origin —
// usually 5–10 MB, less in private browsing modes. When a kid hits the
// cap, writes silently fail (or throw QuotaExceededError that we catch
// and shrug at). They lose their game and don't know why.
//
// This module surfaces the situation BEFORE the cap by polling
// `navigator.storage.estimate()` (Storage API; widely supported on
// modern browsers, falls back gracefully) and computing a usage
// percent. If the kid is above the warning threshold (80% of the
// quota) we surface a friendly toast — once per session — telling
// them to delete a game or two before they can't save the next one.
//
// We deliberately don't poll on a timer. The toast fires on demand
// from `checkStorageQuota()`, which the wizard's auto-save effect and
// the /home mount call. That keeps the check piggy-backed on actions
// the kid is already taking, not on a background timer.
//
// Tests stub navigator.storage.estimate via a setEstimateImpl seam so
// jsdom (which lacks the API) can exercise the threshold logic.

const WARNING_THRESHOLD = 0.8;
const SESSION_KEY = 'pp.quotaWarningShown';

export interface StorageEstimate {
  /** Bytes currently used by the origin (if known). */
  usage?: number;
  /** Maximum bytes the origin can use (if known). */
  quota?: number;
}

type EstimateImpl = () => Promise<StorageEstimate>;

let estimateImpl: EstimateImpl | undefined;

/**
 * Test seam — let suites stub the estimate without poking at globals.
 * Pass `undefined` to restore the platform default.
 */
export function setEstimateImpl(impl: EstimateImpl | undefined): void {
  estimateImpl = impl;
}

async function defaultEstimate(): Promise<StorageEstimate> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    typeof navigator.storage.estimate === 'function'
  ) {
    return navigator.storage.estimate();
  }
  return {};
}

/**
 * Returns the usage ratio (0..1) or null if the API is unavailable or
 * returned partial data. The number is best-effort — browsers may
 * report quota in different ways (Chrome reports the soft cap, Firefox
 * reports the hard cap, Safari may return undefined for both).
 */
export async function getUsageRatio(): Promise<number | null> {
  try {
    const impl = estimateImpl ?? defaultEstimate;
    const est = await impl();
    if (typeof est.usage !== 'number' || typeof est.quota !== 'number' || est.quota <= 0) {
      return null;
    }
    return est.usage / est.quota;
  } catch {
    // navigator.storage.estimate can reject on private-mode Safari
    // and a few embedded webviews. Treat as "unavailable".
    return null;
  }
}

/**
 * Check the current usage ratio against the warning threshold. Returns
 * true if the threshold is exceeded AND we haven't already warned in
 * this session. The session-once gating is deliberate: a kid hovering
 * at 81% should hear about it once, not every time they auto-save.
 *
 * The session flag lives in sessionStorage (cleared on tab close)
 * rather than localStorage — that way a kid who closed and reopened
 * the tab gets a fresh warning if they're still over the threshold.
 */
export async function shouldWarnQuota(): Promise<boolean> {
  if (typeof sessionStorage !== 'undefined') {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return false;
    } catch {
      // Safari throws when accessing sessionStorage in private mode —
      // surface a fresh warning each invocation; not ideal but better
      // than silent. Subsequent calls in the same render pass dedupe
      // via the call site.
    }
  }
  const ratio = await getUsageRatio();
  if (ratio === null) return false;
  return ratio >= WARNING_THRESHOLD;
}

/**
 * Mark the warning as having fired so subsequent shouldWarnQuota calls
 * in the same tab session return false. The caller (the toast surface)
 * invokes this AFTER showing the toast.
 */
export function markQuotaWarned(): void {
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // ignore — see shouldWarnQuota for the rationale.
    }
  }
}

/** Test helper to clear the session-once flag between tests. */
export function _resetQuotaWarning(): void {
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore.
    }
  }
}
