// P4.33 — shared online/offline subscription. Extracted from
// OfflineBanner so the editor's compact "offline pill" can share the
// same useSyncExternalStore subscription without duplicating the
// online/offline event wiring (and risk drifting).
//
// useSyncExternalStore is the React 19 idiomatic way to subscribe to
// browser state — it handles SSR via the server snapshot (assume
// online so we don't flash on hydration) and tear-off via the
// subscribe-returned cleanup.

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getClientSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
