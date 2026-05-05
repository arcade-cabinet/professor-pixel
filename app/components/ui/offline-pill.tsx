// P4.33 — compact offline indicator for the editor surface. The full-
// width OfflineBanner is great on the home/lessons chrome, but inside
// the lesson editor it would push the code area down on every render
// while offline — a recurring annoyance for kids who are coding on a
// flaky connection. The pill is inline, small, and pairs with a
// tooltip that explains "your code still runs locally" so the kid
// isn't worried they've lost their work.
//
// The outer span persists across online/offline transitions and hosts
// `role="status" aria-live="polite"`. Earlier this lived on the inner
// pill — which was unmounted while online, so screen readers that had
// registered the live region silently lost it on the next online→
// offline flip. Persistent host means the announcement reliably fires
// when the inner content swaps in.

import { WifiOff } from 'lucide-react';
import { cn } from '@lib/utils/cn';
import { strings } from '@lib/i18n';
import { useOnlineStatus } from '@lib/hooks/use-online-status';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface OfflinePillProps {
  className?: string;
}

export default function OfflinePill({ className }: OfflinePillProps) {
  const online = useOnlineStatus();

  return (
    <span
      role="status"
      aria-live="polite"
      // The host stays in the DOM in both states; only the visible
      // content is conditional. While online, the host is empty —
      // assistive tech sees nothing and announces nothing.
      data-testid="offline-pill-host"
    >
      {!online && (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <span
              aria-label={strings.chrome.offlinePill.ariaLabel}
              data-testid="offline-pill"
              className={cn(
                'inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
                className
              )}
            >
              <WifiOff className="h-3 w-3" aria-hidden="true" />
              <span>{strings.chrome.offlinePill.label}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-center">
            {strings.chrome.offlinePill.tooltip}
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}
