import { useEffect, useState } from 'react';

/**
 * Debug-flag hook driving the dev HUD overlay (and any future debug UI).
 *
 * Sources, in priority order:
 *   1. `?debug=1` query param — survives navigation, easy to share in URLs.
 *   2. `localStorage.debug === '1'` — sticky across reloads on the same origin.
 *
 * Pure-client SPA, so we touch `window` / `localStorage` directly. The hook
 * subscribes to the `storage` event so toggling `localStorage.debug` from
 * devtools or another tab flips the HUD without a reload.
 */
export function useDebugFlag(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => readDebugFlag());

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'debug' || e.key === null) {
        setEnabled(readDebugFlag());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return enabled;
}

function readDebugFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('debug') === '1') return true;
    return window.localStorage.getItem('debug') === '1';
  } catch {
    // Private mode / disabled storage / opaque-origin iframe — silently fall
    // back to "off" rather than crashing. The HUD is a debug surface; if
    // localStorage is wedged the user has bigger problems.
    return false;
  }
}
