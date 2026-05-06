import { useMemo, useSyncExternalStore } from 'react';

// useSyncExternalStore is the React 19 idiomatic way to subscribe to
// browser state. The previous useState + useEffect implementation had
// two flaws:
//
// 1. The initial state was hardcoded `false`, so a query that matches
//    on mount would render `false` once before the effect fired and
//    corrected — a flash of wrong state for any caller using the hook
//    to gate visible UI (e.g. mobile navigation).
//
// 2. There was a theoretical race between `matchMedia(query)` reading
//    `matches` and `addEventListener('change', ...)` registering the
//    listener; a media-query change in that window would be missed.
//
// useSyncExternalStore avoids both: its `getSnapshot` is read on every
// render (and after every notify) and its `subscribe` returns the
// listener-registered handle as one atomic unit — no missed-change
// window between getSnapshot and subscribe.

interface QueryStore {
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => boolean;
}

function buildStore(query: string): QueryStore {
  const media = window.matchMedia(query);

  return {
    subscribe: (cb) => {
      // Modern browsers expose addEventListener; legacy fallback for
      // pre-2020 Safari uses addListener (still maintained for
      // back-compat by Apple but TS marks deprecated).
      if (media.addEventListener) {
        media.addEventListener('change', cb);
        return () => media.removeEventListener('change', cb);
      }
      media.addListener(cb);
      return () => media.removeListener(cb);
    },
    getSnapshot: () => media.matches,
  };
}

// SSR snapshot: assume "doesn't match" so server-rendered HTML doesn't
// flash desktop UI on a phone hydration. Pure-client SPA today, so
// this is mostly defensive for any future SSR pivot.
function getServerSnapshot(): boolean {
  return false;
}

export function useMediaQuery(query: string): boolean {
  // useMemo gives the (subscribe, getSnapshot) tuple stable identity
  // for the same `query`. Without it, every render builds a new pair
  // and useSyncExternalStore tears down + re-establishes the listener.
  const store = useMemo(() => buildStore(query), [query]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
}

// Specific breakpoint hooks
export function useIsMobile(): boolean {
  return !useMediaQuery('(min-width: 768px)');
}

export function useIsTablet(): boolean {
  const isAboveTablet = useMediaQuery('(min-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  return isAboveTablet && !isDesktop;
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
