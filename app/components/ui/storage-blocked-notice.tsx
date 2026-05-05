// Q12 — one-time banner shown when localStorage probes blocked. Common
// causes: Safari private mode, disk full, locked-down classroom profile.
// Without this banner the kid sees their wizard state vanish on refresh
// with no explanation — they assume they did something wrong.
//
// Banner is dismissable for the session (sessionStorage flag, since
// localStorage is the very thing that's broken). On a fresh tab open
// the banner reappears once.
//
// Side effects (the storage probe + sessionStorage read) live in
// useEffect rather than the render path so the component stays pure
// during render and SSR hydration doesn't mismatch.

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { isStorageBlocked } from '@lib/storage/private-mode';

const DISMISS_KEY = 'pp.storageBlockedDismissed';

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // sessionStorage may also be locked. Component-level state below
    // handles in-tab dismiss as a fallback.
  }
}

export default function StorageBlockedNotice() {
  // Both flags start false so the initial render is pure (matches SSR).
  // The probe + dismiss-state read happen in useEffect, then setState
  // flips us into the actual visible state on the client.
  const [blocked, setBlocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setBlocked(isStorageBlocked());
    setDismissed(readDismissed());
  }, []);

  if (!blocked || dismissed) return null;

  return (
    <div
      role="alert"
      data-testid="storage-blocked-notice"
      className="flex items-start gap-3 bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-bold">Pixel can't save your progress here</p>
        <p>
          Your browser is in private mode or has storage turned off, so games and lessons won't
          stick around if you refresh. Open a normal browser window to save your work.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          writeDismissed();
          setDismissed(true);
        }}
        aria-label="Dismiss"
        data-testid="storage-blocked-dismiss"
        className="rounded p-1 hover:bg-amber-200 dark:hover:bg-amber-800"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
