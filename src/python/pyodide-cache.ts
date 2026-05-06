/**
 * OPFS-backed cache for Pyodide assets via a service worker.
 *
 * The vendored Pyodide payload (pyodide.asm.wasm + python_stdlib.zip
 * + pyodide.asm.js) totals ~12MB. Re-downloading every cold start
 * doubles cold-start time on slow networks, which is exactly the
 * Chromebook-on-cafeteria-wifi case kids hit. Origin Private File
 * System gives us a per-origin persistent cache that survives tab
 * close and is governed by storage quota — the right primitive.
 *
 * The actual interception logic lives in `public/pyodide-sw.js`
 * because Pyodide's `loadPyodide()` issues fetch() calls itself
 * (for the .wasm/.zip), and a service worker is the only place that
 * can transparently rewrite those network requests regardless of
 * who initiated them.
 *
 * Call `registerPyodideCache()` once on app boot. Idempotent —
 * the SW lifecycle handles re-registration.
 */

import { baseUrl } from '@lib/utils/base-url';

// SW lives at the project root and must be loaded under BASE_URL so
// the scope covers /pyodide/* on GitHub Pages subpath deploys.
const SW_URL = `${baseUrl}pyodide-sw.js`;
const SW_SCOPE = baseUrl;

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerPyodideCache(): Promise<ServiceWorkerRegistration | null> {
  if (registrationPromise) return registrationPromise;

  registrationPromise = (async () => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }
    // Capacitor WebView guard. Inside the Android/iOS Capacitor shell
    // the page loads from the `capacitor:` (or `https://localhost` on
    // Android-with-server-config) protocol, where service workers
    // don't run reliably and the asset bundle is already on-device
    // anyway — there's nothing to cache, the WASM is shipped in the
    // APK/IPA. Skip SW registration there; the in-memory module cache
    // that getPyodide() maintains is plenty.
    if (typeof window !== 'undefined') {
      const proto = window.location?.protocol;
      if (proto === 'capacitor:' || proto === 'capacitor-electron:') {
        return null;
      }
    }
    // Service workers don't run on http: in production-equivalent
    // contexts, but Vite's dev server is http://localhost which
    // browsers treat as a secure context for SW purposes.
    try {
      // Request persistent storage so OPFS survives quota pressure.
      // navigator.storage.persist() returns true if persistence was
      // already granted or just granted; false if denied — either way
      // the cache still works, persistence is opportunistic.
      if ('storage' in navigator && 'persist' in navigator.storage) {
        await navigator.storage.persist().catch(() => false);
      }
      const reg = await navigator.serviceWorker.register(SW_URL, {
        scope: SW_SCOPE,
      });
      return reg;
    } catch (err) {
      console.warn('[pyodide-cache] SW registration failed:', err);
      return null;
    }
  })();

  return registrationPromise;
}

/**
 * Returns true if OPFS is usable in the current environment. Useful
 * for diagnostic UIs (HUD readouts, lesson loader status).
 */
export async function isOpfsAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.storage || !('getDirectory' in navigator.storage)) return false;
  try {
    await navigator.storage.getDirectory();
    return true;
  } catch {
    return false;
  }
}

/**
 * Test-only: drops the cached registration promise so the next
 * call re-registers. Does NOT unregister the SW itself.
 */
export function __resetPyodideCacheForTests(): void {
  registrationPromise = null;
}
