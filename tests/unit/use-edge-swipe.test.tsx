import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { SwipeableHandlers, SwipeEventData } from 'react-swipeable';

// Mock react-swipeable so the test owns the swipe-callback dispatch path.
// The hook's actual logic is `checkEdgeSwipe` — does a swipe that started
// near a screen edge fire `onEdgeSwipe`? We don't need real touch tracking;
// we need to reach into what callbacks the hook hands to useSwipeable and
// invoke them with synthetic SwipeEventData.
const capturedConfig: { current: Record<string, unknown> | null } = { current: null };

vi.mock('react-swipeable', () => ({
  useSwipeable: (config: Record<string, unknown>) => {
    capturedConfig.current = config;
    // Minimal handlers shape — the hook only uses the `ref` callback.
    const handlers: SwipeableHandlers = {
      ref: vi.fn(),
      onMouseDown: vi.fn(),
    };
    return handlers;
  },
}));

import { useEdgeSwipe } from '@lib/hooks/use-edge-swipe';

const innerWidth = 1024;
const innerHeight = 768;

beforeEach(() => {
  capturedConfig.current = null;
  vi.stubGlobal('innerWidth', innerWidth);
  vi.stubGlobal('innerHeight', innerHeight);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeEventData(initial: [number, number]): SwipeEventData {
  // We only populate fields the hook reads. Casting via unknown because
  // SwipeEventData has many unrelated members (deltaX, velocity, etc.)
  // that aren't read in the edge-detection branch.
  return { initial } as unknown as SwipeEventData;
}

describe('useEdgeSwipe — edge detection', () => {
  it('fires "left" when swipe-right originates inside left edge band', () => {
    const onEdgeSwipe = vi.fn();
    renderHook(() => useEdgeSwipe({ onEdgeSwipe, edgeThreshold: 30 }));

    const config = capturedConfig.current!;
    (config.onSwipedRight as (e: SwipeEventData) => void)(
      makeEventData([15, 400]) // startX=15 < 30 → left edge
    );

    expect(onEdgeSwipe).toHaveBeenCalledTimes(1);
    expect(onEdgeSwipe).toHaveBeenCalledWith('left');
  });

  it('fires "right" when swipe-left originates inside right edge band', () => {
    const onEdgeSwipe = vi.fn();
    renderHook(() => useEdgeSwipe({ onEdgeSwipe, edgeThreshold: 30 }));

    (capturedConfig.current!.onSwipedLeft as (e: SwipeEventData) => void)(
      makeEventData([1010, 400]) // startX=1010 > 1024-30=994 → right edge
    );

    expect(onEdgeSwipe).toHaveBeenCalledWith('right');
  });

  it('fires "top" when swipe-down originates inside top edge band', () => {
    const onEdgeSwipe = vi.fn();
    renderHook(() => useEdgeSwipe({ onEdgeSwipe, edgeThreshold: 30 }));

    (capturedConfig.current!.onSwipedDown as (e: SwipeEventData) => void)(
      makeEventData([400, 15])
    );

    expect(onEdgeSwipe).toHaveBeenCalledWith('top');
  });

  it('fires "bottom" when swipe-up originates inside bottom edge band', () => {
    const onEdgeSwipe = vi.fn();
    renderHook(() => useEdgeSwipe({ onEdgeSwipe, edgeThreshold: 30 }));

    (capturedConfig.current!.onSwipedUp as (e: SwipeEventData) => void)(
      makeEventData([400, 750])
    );

    expect(onEdgeSwipe).toHaveBeenCalledWith('bottom');
  });

  it('does NOT fire when swipe originates outside the edge band (mid-canvas)', () => {
    const onEdgeSwipe = vi.fn();
    renderHook(() => useEdgeSwipe({ onEdgeSwipe, edgeThreshold: 30 }));

    // Mid-canvas swipe in every direction — nothing should fire.
    (capturedConfig.current!.onSwipedRight as (e: SwipeEventData) => void)(makeEventData([512, 400]));
    (capturedConfig.current!.onSwipedLeft as (e: SwipeEventData) => void)(makeEventData([512, 400]));
    (capturedConfig.current!.onSwipedDown as (e: SwipeEventData) => void)(makeEventData([400, 384]));
    (capturedConfig.current!.onSwipedUp as (e: SwipeEventData) => void)(makeEventData([400, 384]));

    expect(onEdgeSwipe).not.toHaveBeenCalled();
  });

  it('uses default edgeThreshold of 50px when not specified', () => {
    const onEdgeSwipe = vi.fn();
    renderHook(() => useEdgeSwipe({ onEdgeSwipe })); // no edgeThreshold

    // 49 should fire with default 50; 51 should not.
    (capturedConfig.current!.onSwipedRight as (e: SwipeEventData) => void)(makeEventData([49, 400]));
    expect(onEdgeSwipe).toHaveBeenCalledTimes(1);

    (capturedConfig.current!.onSwipedRight as (e: SwipeEventData) => void)(makeEventData([51, 400]));
    expect(onEdgeSwipe).toHaveBeenCalledTimes(1); // unchanged
  });
});

describe('useEdgeSwipe — guards', () => {
  it('no-ops when enabled=false even with valid edge swipe', () => {
    const onEdgeSwipe = vi.fn();
    renderHook(() => useEdgeSwipe({ onEdgeSwipe, enabled: false }));

    (capturedConfig.current!.onSwipedRight as (e: SwipeEventData) => void)(makeEventData([10, 400]));

    expect(onEdgeSwipe).not.toHaveBeenCalled();
  });

  it('no-ops when onEdgeSwipe callback is not provided', () => {
    // Should not throw, just silently ignore. Render the hook with no
    // callback and fire — if the guard is missing, the switch statement
    // would crash on `onEdgeSwipe(...)` undefined-call.
    renderHook(() => useEdgeSwipe({}));

    expect(() => {
      (capturedConfig.current!.onSwipedRight as (e: SwipeEventData) => void)(makeEventData([10, 400]));
    }).not.toThrow();
  });

  it('no-ops when eventData.initial is missing (defensive)', () => {
    const onEdgeSwipe = vi.fn();
    renderHook(() => useEdgeSwipe({ onEdgeSwipe }));

    // Synthetic swipe with no `initial` tuple — defensive guard returns early.
    (capturedConfig.current!.onSwipedRight as (e: SwipeEventData) => void)(
      {} as unknown as SwipeEventData
    );

    expect(onEdgeSwipe).not.toHaveBeenCalled();
  });
});

describe('useEdgeSwipe — isSwipingRef lifecycle', () => {
  it('isSwipingRef.current toggles via onSwipeStart/onSwiped', () => {
    const { result } = renderHook(() => useEdgeSwipe({ onEdgeSwipe: vi.fn() }));

    expect(result.current.isSwipingRef.current).toBe(false);

    (capturedConfig.current!.onSwipeStart as () => void)();
    expect(result.current.isSwipingRef.current).toBe(true);

    (capturedConfig.current!.onSwiped as () => void)();
    expect(result.current.isSwipingRef.current).toBe(false);
  });
});
