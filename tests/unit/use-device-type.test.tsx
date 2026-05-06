import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDeviceType } from '@lib/hooks/use-device-type';

// Window resize/orientationchange listener bookkeeping. Test owns
// dispatch so we don't rely on jsdom's window-event plumbing.
const listeners = new Map<string, Set<() => void>>();
const matchMediaResults = new Map<string, boolean>();

function stubViewport(opts: {
  width: number;
  height: number;
  pixelRatio?: number;
  touch?: boolean;
  // Maps a media-query string to whether it should match. Anything
  // not in the map returns false.
  matchMedia?: Record<string, boolean>;
}) {
  vi.stubGlobal('innerWidth', opts.width);
  vi.stubGlobal('innerHeight', opts.height);
  vi.stubGlobal('devicePixelRatio', opts.pixelRatio ?? 1);

  // Touch capability — three signals, the hook OR's them together.
  // Set 'ontouchstart' on globalThis (= window in jsdom) so the
  // `'ontouchstart' in window` check resolves correctly.
  if (opts.touch) {
    (globalThis as unknown as Record<string, unknown>).ontouchstart = null;
  } else {
    delete (globalThis as unknown as Record<string, unknown>).ontouchstart;
  }
  // navigator.maxTouchPoints — set via defineProperty since the
  // descriptor on jsdom is not configurable by simple assignment.
  Object.defineProperty(globalThis.navigator, 'maxTouchPoints', {
    configurable: true,
    get: () => (opts.touch ? 5 : 0),
  });

  matchMediaResults.clear();
  if (opts.matchMedia) {
    for (const [k, v] of Object.entries(opts.matchMedia)) matchMediaResults.set(k, v);
  }
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matchMediaResults.get(query) ?? false,
    media: query,
  }));

  vi.stubGlobal(
    'addEventListener',
    (event: string, cb: () => void, _options?: AddEventListenerOptions | boolean) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
    }
  );
  vi.stubGlobal(
    'removeEventListener',
    (event: string, cb: () => void, _options?: EventListenerOptions | boolean) => {
      listeners.get(event)?.delete(cb);
    }
  );
}

afterEach(() => {
  // Order: clear bookkeeping BEFORE restoring globals (same doctrine
  // as use-online-status — deferred unmount cleanup must not bypass
  // our listener map).
  listeners.clear();
  matchMediaResults.clear();
  delete (globalThis as unknown as Record<string, unknown>).ontouchstart;
  vi.unstubAllGlobals();
});

describe('useDeviceType — desktop classification', () => {
  it('classifies a wide non-touch viewport as desktop', () => {
    stubViewport({ width: 1440, height: 900 });
    const { result } = renderHook(() => useDeviceType());

    expect(result.current.deviceType).toBe('desktop');
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isFoldable).toBe(false);
    expect(result.current.screenWidth).toBe(1440);
    expect(result.current.screenHeight).toBe(900);
    expect(result.current.isTouchDevice).toBe(false);
    expect(result.current.pixelRatio).toBe(1);
  });

  it('keeps non-touch wide viewports as desktop even at exactly 1024', () => {
    stubViewport({ width: 1024, height: 768 });
    const { result } = renderHook(() => useDeviceType());
    expect(result.current.deviceType).toBe('desktop');
    expect(result.current.isDesktop).toBe(true);
  });

  it('classifies tablet-sized non-touch viewport as desktop (touch is required for tablet)', () => {
    // 768 ≤ width < 1024 + isTouchDevice=false → falls through to desktop.
    stubViewport({ width: 800, height: 600 });
    const { result } = renderHook(() => useDeviceType());
    expect(result.current.deviceType).toBe('desktop');
    expect(result.current.isTablet).toBe(false);
  });
});

describe('useDeviceType — mobile classification', () => {
  it('classifies narrow viewports as mobile (no touch needed)', () => {
    stubViewport({ width: 375, height: 812 });
    const { result } = renderHook(() => useDeviceType());

    expect(result.current.deviceType).toBe('mobile');
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('reports touch + DPR for retina mobile devices', () => {
    stubViewport({ width: 393, height: 852, pixelRatio: 3, touch: true });
    const { result } = renderHook(() => useDeviceType());

    expect(result.current.isTouchDevice).toBe(true);
    expect(result.current.pixelRatio).toBe(3);
    expect(result.current.deviceType).toBe('mobile');
  });
});

describe('useDeviceType — tablet classification', () => {
  it('classifies 768-1023 + touch as tablet', () => {
    stubViewport({ width: 800, height: 1200, touch: true });
    const { result } = renderHook(() => useDeviceType());

    expect(result.current.deviceType).toBe('tablet');
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('does NOT classify a 768+touch viewport as foldable when aspect is normal', () => {
    // width=820, height=1100 → aspect ratio ≈1.34 → not foldable.
    stubViewport({ width: 820, height: 1100, touch: true });
    const { result } = renderHook(() => useDeviceType());
    expect(result.current.isFoldable).toBe(false);
    expect(result.current.deviceType).toBe('tablet');
  });
});

describe('useDeviceType — foldable detection', () => {
  it('uses CSS viewport-segments query when available (ground truth)', () => {
    // Even with mobile-shaped dimensions, the segments query alone
    // marks the device as foldable.
    stubViewport({
      width: 700,
      height: 800,
      touch: true,
      matchMedia: {
        '(horizontal-viewport-segments: 2), (vertical-viewport-segments: 2)': true,
      },
    });
    const { result } = renderHook(() => useDeviceType());
    expect(result.current.isFoldable).toBe(true);
    expect(result.current.deviceType).toBe('foldable');
  });

  it('flags unfolded foldable when wide + extreme aspect ratio (>2.1)', () => {
    // 2208×1768 unfolded Z Fold landscape → aspect ≈1.25 — won't match
    // unfoldedFoldable. Use a tall-narrow setup instead: 1812×768 →
    // aspect ≈2.36 with touch, width>768.
    stubViewport({ width: 1812, height: 768, touch: true });
    const { result } = renderHook(() => useDeviceType());
    expect(result.current.isFoldable).toBe(true);
    expect(result.current.deviceType).toBe('foldable');
  });

  it('flags hinged-tablet shape (820 < w < 1024, h > 1000)', () => {
    stubViewport({ width: 900, height: 1200, touch: true });
    const { result } = renderHook(() => useDeviceType());
    expect(result.current.isFoldable).toBe(true);
    expect(result.current.deviceType).toBe('foldable');
  });

  it('does NOT misclassify a flagship phone (iPhone 14 Pro: 393×852 @ DPR 3)', () => {
    // The hook deliberately rejects the older "tall + retina = foldable"
    // heuristic because it false-positives on every modern phone. Pin
    // that explicit rejection.
    stubViewport({ width: 393, height: 852, pixelRatio: 3, touch: true });
    const { result } = renderHook(() => useDeviceType());
    expect(result.current.isFoldable).toBe(false);
    expect(result.current.deviceType).toBe('mobile');
  });

  it('foldable in folded (mobile-like) state classifies isMobile=true', () => {
    // Force segments=true while width<768.
    stubViewport({
      width: 700,
      height: 800,
      touch: true,
      matchMedia: {
        '(horizontal-viewport-segments: 2), (vertical-viewport-segments: 2)': true,
      },
    });
    const { result } = renderHook(() => useDeviceType());
    expect(result.current.deviceType).toBe('foldable');
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
  });

  it('foldable in unfolded (tablet-like) state classifies isTablet=true', () => {
    stubViewport({
      width: 900,
      height: 1200,
      touch: true,
      matchMedia: {
        '(horizontal-viewport-segments: 2), (vertical-viewport-segments: 2)': true,
      },
    });
    const { result } = renderHook(() => useDeviceType());
    expect(result.current.deviceType).toBe('foldable');
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });
});

describe('useDeviceType — reactive updates', () => {
  it('reclassifies on resize', () => {
    stubViewport({ width: 375, height: 812 }); // mobile
    const { result } = renderHook(() => useDeviceType());
    expect(result.current.deviceType).toBe('mobile');

    act(() => {
      vi.stubGlobal('innerWidth', 1440);
      vi.stubGlobal('innerHeight', 900);
      listeners.get('resize')?.forEach((cb) => cb());
    });

    expect(result.current.deviceType).toBe('desktop');
    expect(result.current.screenWidth).toBe(1440);
  });

  it('reclassifies on orientationchange', () => {
    // Pure-mobile rotation: phone portrait → phone landscape stays
    // mobile (width still <768 in both orientations) but pins that
    // the orientationchange listener wires through and updates
    // screenWidth/screenHeight even when the type bucket doesn't flip.
    stubViewport({ width: 393, height: 852, touch: true });
    const { result } = renderHook(() => useDeviceType());
    expect(result.current.deviceType).toBe('mobile');
    expect(result.current.screenWidth).toBe(393);

    act(() => {
      vi.stubGlobal('innerWidth', 600);
      vi.stubGlobal('innerHeight', 393);
      listeners.get('orientationchange')?.forEach((cb) => cb());
    });

    // Width still <768 → still mobile, but dimensions updated proves
    // the listener fired and rebuilt capabilities.
    expect(result.current.deviceType).toBe('mobile');
    expect(result.current.screenWidth).toBe(600);
    expect(result.current.screenHeight).toBe(393);
  });
});

describe('useDeviceType — cleanup', () => {
  it('removes both resize and orientationchange listeners on unmount', () => {
    stubViewport({ width: 1024, height: 768 });
    const { unmount } = renderHook(() => useDeviceType());

    expect(listeners.get('resize')?.size).toBe(1);
    expect(listeners.get('orientationchange')?.size).toBe(1);

    unmount();

    expect(listeners.get('resize')?.size).toBe(0);
    expect(listeners.get('orientationchange')?.size).toBe(0);
  });
});
