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
// Conservative cap aligned with the smallest documented per-origin
// localStorage limit across modern browsers (Safari iOS ~5MB). The
// fallback measurement (sum of localStorage keys + values) gives a
// real signal even on browsers where navigator.storage.estimate
// reports the full origin quota — which dwarfs the localStorage cap
// and would otherwise leave the warning effectively inert (Chrome
// reports ~hundreds of MB to several GB; localStorage is exhausted
// long before that ratio crosses 80%). 4MB warning threshold so kids
// get a heads-up with ~1MB headroom remaining.
const LOCAL_STORAGE_WARN_BYTES = 4 * 1024 * 1024;
// Module-level secondary gate for private-mode browsers where
// sessionStorage throws on access. Without this, a kid in iOS
// private mode hovering above the threshold would re-toast every
// /home mount because the disk-side gate is permanently empty.
let warnedThisSession = false;

export interface StorageEstimate {
  /** Bytes currently used by the origin (if known). */
  usage?: number;
  /** Maximum bytes the origin can use (if known). */
  quota?: number;
}

type EstimateImpl = () => Promise<StorageEstimate>;
type MeasureBytesImpl = () => number | null;

let estimateImpl: EstimateImpl | undefined;
let measureBytesImpl: MeasureBytesImpl | undefined;

/**
 * Test seam — let suites stub the estimate without poking at globals.
 * Pass `undefined` to restore the platform default.
 */
export function setEstimateImpl(impl: EstimateImpl | undefined): void {
  estimateImpl = impl;
}

/**
 * Test seam for the localStorage byte-count path. Folded forward from
 * task-025 review: the prior tests had to allocate multi-MB strings
 * to exercise the threshold. Now suites can return any number from
 * a stub without real heap allocation.
 */
export function setMeasureBytesImpl(impl: MeasureBytesImpl | undefined): void {
  measureBytesImpl = impl;
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
 * Sum the size of all localStorage entries (keys + values, UTF-16
 * pairs counted as 2 bytes each). Returns null when localStorage
 * itself is unavailable. This is the signal we actually care about:
 * the app's persistence layer writes to localStorage, and the
 * silent-failure mode the warning is meant to head off is
 * QuotaExceededError on a localStorage write.
 */
function measureLocalStorageBytes(): number | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === null) continue;
      const value = localStorage.getItem(key) ?? '';
      // UTF-16 — JS strings are 2 bytes per code unit. Surrogate
      // pairs count as 4 bytes, which String.length already reports
      // as 2 each (correct for the byte count).
      total += (key.length + value.length) * 2;
    }
    return total;
  } catch {
    return null;
  }
}

/**
 * Check the current usage against the warning threshold. Returns true
 * if the kid is over budget AND we haven't already warned this
 * session. We check TWO sources, in order:
 *
 * 1. Direct localStorage byte count — this is the resource that
 *    actually fails first, and the count is reliable on every
 *    browser. Warns at >= 4MB out of an assumed 5MB cap.
 * 2. navigator.storage.estimate() ratio — best-effort signal for
 *    environments where origin storage is constrained as a whole
 *    (some mobile browsers, embedded webviews). Warns at >= 80%.
 *
 * The session-once gate uses BOTH a sessionStorage flag (survives
 * navigation) AND an in-memory boolean (survives sessionStorage
 * exceptions in private-mode Safari). Without the in-memory gate
 * a kid in private mode would re-toast on every /home mount.
 */
export async function shouldWarnQuota(): Promise<boolean> {
  if (warnedThisSession) return false;
  if (typeof sessionStorage !== 'undefined') {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return false;
    } catch {
      // Private-mode Safari throws here. The in-memory gate above
      // protects against repeat-toasting on this code path.
    }
  }
  const measure = measureBytesImpl ?? measureLocalStorageBytes;
  const bytes = measure();
  if (bytes !== null && bytes >= LOCAL_STORAGE_WARN_BYTES) return true;
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
  warnedThisSession = true;
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
  warnedThisSession = false;
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore.
    }
  }
}
