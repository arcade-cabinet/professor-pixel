// Q12 (pillar 3) — private-mode / write-blocked detection.
//
// Safari private mode, browsers with strict storage limits, and certain
// locked-down chromebook profiles all silently fail localStorage.setItem
// either by throwing on first write or by accepting writes that vanish
// on read. The app's other modules already wrap individual writes in
// try/catch, but the kid never finds out *why* their progress isn't
// sticking — they just notice the wizard reverts on refresh.
//
// This module probes once at startup with a sentinel value. If the round
// trip fails (write throws, or read returns something different), we
// flag the session as storage-blocked. UI surfaces that care about
// persistence (home, profile, lessons) can subscribe via
// useStorageBlocked() and show a one-time notice.

// Per-tab unique probe key — Gemini review feedback. A constant key would
// race across multiple tabs probing simultaneously: tab A writes, tab B
// overwrites, tab A reads tab B's value, mismatches, and falsely flags
// storage as blocked. The randomized suffix is generated once per module
// load so each tab probes a distinct slot.
const PROBE_KEY = `pp.__storage_probe_${Math.random().toString(36).slice(2)}__`;
const PROBE_VALUE = '1';

let cachedResult: boolean | null = null;

/**
 * Probe localStorage for write capability. Returns true when storage is
 * NOT writable (private mode, full disk, locked-down profile). Memoized
 * on first call — the answer doesn't change within a tab session.
 */
export function isStorageBlocked(): boolean {
  if (cachedResult !== null) return cachedResult;
  if (typeof localStorage === 'undefined') {
    cachedResult = true;
    return true;
  }
  try {
    localStorage.setItem(PROBE_KEY, PROBE_VALUE);
    const echoed = localStorage.getItem(PROBE_KEY);
    localStorage.removeItem(PROBE_KEY);
    cachedResult = echoed !== PROBE_VALUE;
  } catch {
    cachedResult = true;
  }
  return cachedResult;
}

/** Reset the cached result. Test-only — exposed for unit tests. */
export function __resetStorageBlockedCache(): void {
  cachedResult = null;
}
