// Q15 (pillar 3) — offline awareness banner. Pyodide loads from a CDN on
// first visit, then is cache-friendly; the lessons catalog is a JSON
// fetch. When the kid loses network mid-session, both surfaces produce
// confusing errors at the call site instead of telling them up front
// "you're offline." This banner subscribes to the browser's online /
// offline events and renders a non-blocking notice in the chrome so
// kids (and the adult helping them) understand WHY things are sluggish
// or failing before they hit the actual error path.
//
// Banner is suppressed on mount if the browser reports online — we
// don't want a permanent header bar when everything is fine.

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '@lib/utils/cn';

interface OfflineBannerProps {
  className?: string;
}

export default function OfflineBanner({ className }: OfflineBannerProps) {
  const [online, setOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

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
      <span>
        You're offline — saved games still work, but new lessons and Pixel updates need a
        connection.
      </span>
    </div>
  );
}
