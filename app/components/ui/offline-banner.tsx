// Q15 (pillar 3) — offline awareness banner. Pyodide loads from a CDN on
// first visit, then is cache-friendly; the lessons catalog is a JSON
// fetch. When the kid loses network mid-session, both surfaces produce
// confusing errors at the call site instead of telling them up front
// "you're offline." This banner subscribes to the browser's online /
// offline events and renders a non-blocking notice in the chrome so
// kids (and the adult helping them) understand WHY things are sluggish
// or failing before they hit the actual error path.
//
// useSyncExternalStore is the React 19 idiomatic way to subscribe to
// browser state — it handles SSR correctly via the server snapshot
// (assume online) and tear-off via the subscribe-returned cleanup.

import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '@lib/utils/cn';
import { strings } from '@lib/i18n';

interface OfflineBannerProps {
  className?: string;
}

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
  // SSR has no network signal; assume online so the banner doesn't
  // flash on hydration for the common case.
  return true;
}

export default function OfflineBanner({ className }: OfflineBannerProps) {
  const online = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
      className={cn(
        'flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
        className
      )}
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span>{strings.chrome.offlineBanner.message}</span>
    </div>
  );
}
