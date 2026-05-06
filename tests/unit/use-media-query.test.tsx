import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from '@lib/hooks/use-media-query';

// Per-query subscriber tracking so the test can flip a media-query
// match and trigger only the listeners that registered for it.
const subs = new Map<string, Set<() => void>>();
// Per-query match state. Tests mutate via setMatch() then dispatch().
const matchState = new Map<string, boolean>();
// When `legacy` is true the stub omits addEventListener and exposes
// addListener / removeListener instead — exercises the hook's
// legacy-browser fallback branch.
let legacyMode = false;

function setMatch(query: string, value: boolean) {
  matchState.set(query, value);
}

function dispatch(query: string) {
  subs.get(query)?.forEach((cb) => cb());
}

function stubMatchMedia() {
  vi.stubGlobal('matchMedia', (query: string) => {
    if (!subs.has(query)) subs.set(query, new Set());
    const queryRef = query;
    // Use Object.defineProperty so `matches` stays live across the
    // hook's matchMedia() call and the listener's setMatches(media.matches)
    // read. A spread of { get matches() {...} } evaluates the getter once
    // at spread time and freezes the boolean — masks reactivity bugs.
    const m: Record<string, unknown> = { media: queryRef };
    Object.defineProperty(m, 'matches', {
      get: () => matchState.get(queryRef) ?? false,
      enumerable: true,
    });
    if (legacyMode) {
      m.addListener = (cb: () => void) => subs.get(queryRef)?.add(cb);
      m.removeListener = (cb: () => void) => subs.get(queryRef)?.delete(cb);
    } else {
      m.addEventListener = (_event: string, cb: () => void) => subs.get(queryRef)?.add(cb);
      m.removeEventListener = (_event: string, cb: () => void) => subs.get(queryRef)?.delete(cb);
    }
    return m;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  subs.clear();
  matchState.clear();
  legacyMode = false;
});

describe('useMediaQuery — initial state', () => {
  it('returns false when the media query does not match initially', () => {
    setMatch('(min-width: 600px)', false);
    stubMatchMedia();
    const { result } = renderHook(() => useMediaQuery('(min-width: 600px)'));
    expect(result.current).toBe(false);
  });

  it('returns true synchronously on first render when the query matches (no flash)', () => {
    // useSyncExternalStore reads getSnapshot during render, so a query
    // that matches on mount renders `true` on the very first render
    // — no useEffect-corrected flicker. The previous useState+useEffect
    // implementation rendered `false` first and corrected on effect.
    setMatch('(min-width: 600px)', true);
    stubMatchMedia();
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount += 1;
      return useMediaQuery('(min-width: 600px)');
    });
    expect(result.current).toBe(true);
    // useSyncExternalStore + a stable getSnapshot identity means a
    // single render — not the two-render dance of the legacy approach.
    expect(renderCount).toBe(1);
  });
});

describe('useMediaQuery — reactive updates', () => {
  it('flips on change event (modern API path)', () => {
    setMatch('(min-width: 600px)', false);
    stubMatchMedia();
    const { result } = renderHook(() => useMediaQuery('(min-width: 600px)'));
    expect(result.current).toBe(false);

    act(() => {
      setMatch('(min-width: 600px)', true);
      dispatch('(min-width: 600px)');
    });

    expect(result.current).toBe(true);
  });

  it('does NOT re-bind the listener when match state flips', () => {
    // useSyncExternalStore + useMemo([query]) means the (subscribe,
    // getSnapshot) tuple is stable across notify cycles — the listener
    // is registered once on mount and stays registered. Pins this
    // invariant: any future refactor that breaks store identity
    // stability would tear down + re-add on every state change.
    setMatch('(min-width: 600px)', false);
    stubMatchMedia();
    const { result } = renderHook(() => useMediaQuery('(min-width: 600px)'));
    const listenerSet = subs.get('(min-width: 600px)')!;
    expect(listenerSet.size).toBe(1);
    const initialListener = [...listenerSet][0];

    act(() => {
      setMatch('(min-width: 600px)', true);
      dispatch('(min-width: 600px)');
    });

    expect(result.current).toBe(true);
    expect(listenerSet.size).toBe(1);
    expect([...listenerSet][0]).toBe(initialListener);
  });

  it('flips on legacy addListener path when addEventListener is absent', () => {
    legacyMode = true;
    setMatch('(min-width: 600px)', false);
    stubMatchMedia();
    const { result } = renderHook(() => useMediaQuery('(min-width: 600px)'));
    expect(result.current).toBe(false);

    act(() => {
      setMatch('(min-width: 600px)', true);
      dispatch('(min-width: 600px)');
    });

    expect(result.current).toBe(true);
  });
});

describe('useMediaQuery — query parameter changes', () => {
  it('re-binds listener and reflects new query when prop changes', () => {
    setMatch('(min-width: 600px)', true);
    setMatch('(min-width: 1200px)', false);
    stubMatchMedia();

    const { result, rerender } = renderHook(({ q }: { q: string }) => useMediaQuery(q), {
      initialProps: { q: '(min-width: 600px)' },
    });
    expect(result.current).toBe(true);
    expect(subs.get('(min-width: 600px)')?.size).toBe(1);

    rerender({ q: '(min-width: 1200px)' });

    // New query's listener attached, old query's listener removed.
    expect(subs.get('(min-width: 600px)')?.size).toBe(0);
    expect(subs.get('(min-width: 1200px)')?.size).toBe(1);
    expect(result.current).toBe(false);
  });
});

describe('useMediaQuery — cleanup', () => {
  it('removes the change listener on unmount (modern API)', () => {
    setMatch('(min-width: 600px)', false);
    stubMatchMedia();
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 600px)'));
    expect(subs.get('(min-width: 600px)')?.size).toBe(1);

    unmount();
    expect(subs.get('(min-width: 600px)')?.size).toBe(0);
  });

  it('removes the legacy listener on unmount (legacy API)', () => {
    legacyMode = true;
    setMatch('(min-width: 600px)', false);
    stubMatchMedia();
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 600px)'));
    expect(subs.get('(min-width: 600px)')?.size).toBe(1);

    unmount();
    expect(subs.get('(min-width: 600px)')?.size).toBe(0);
  });
});

describe('breakpoint helpers', () => {
  it('useIsMobile returns true when (min-width: 768px) does NOT match', () => {
    setMatch('(min-width: 768px)', false);
    stubMatchMedia();
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('useIsMobile returns false when (min-width: 768px) matches', () => {
    setMatch('(min-width: 768px)', true);
    stubMatchMedia();
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('useIsTablet returns true between 768 and 1024 (above 768, below 1024)', () => {
    setMatch('(min-width: 768px)', true);
    setMatch('(min-width: 1024px)', false);
    stubMatchMedia();
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });

  it('useIsTablet returns false when below 768 (mobile)', () => {
    setMatch('(min-width: 768px)', false);
    setMatch('(min-width: 1024px)', false);
    stubMatchMedia();
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
  });

  it('useIsTablet returns false when at/above 1024 (desktop)', () => {
    setMatch('(min-width: 768px)', true);
    setMatch('(min-width: 1024px)', true);
    stubMatchMedia();
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
  });

  it('useIsDesktop returns true when (min-width: 1024px) matches', () => {
    setMatch('(min-width: 1024px)', true);
    stubMatchMedia();
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it('useIsDesktop returns false below 1024', () => {
    setMatch('(min-width: 1024px)', false);
    stubMatchMedia();
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });
});
