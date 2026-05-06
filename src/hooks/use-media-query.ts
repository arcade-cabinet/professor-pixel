import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    // setState is idempotent for identical values, so initializing
    // unconditionally is cheaper than the prior `if (media.matches !==
    // matches)` guard (which forced `matches` into the deps array and
    // made every state flip re-bind the listener — wasted work).
    setMatches(media.matches);

    const listener = () => setMatches(media.matches);

    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
    // Legacy browsers
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [query]);

  return matches;
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
