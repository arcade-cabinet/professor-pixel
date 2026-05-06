import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOrientation } from '@lib/hooks/use-orientation';

// Tracks the resize/orientationchange listeners attached to window so
// the test can fire them directly without relying on jsdom's stub
// dispatching window-level events through the right event-target chain.
const listeners = new Map<string, Set<() => void>>();
const screenListeners = new Map<string, Set<() => void>>();

function stubViewport(width: number, height: number, angle = 0) {
  vi.stubGlobal('innerWidth', width);
  vi.stubGlobal('innerHeight', height);

  const origAdd = window.addEventListener.bind(window);
  const origRemove = window.removeEventListener.bind(window);
  vi.stubGlobal('addEventListener', (event: string, cb: () => void) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(cb);
    origAdd(event, cb);
  });
  vi.stubGlobal('removeEventListener', (event: string, cb: () => void) => {
    listeners.get(event)?.delete(cb);
    origRemove(event, cb);
  });

  // window.screen.orientation surface — jsdom doesn't provide one; the
  // hook reads angle?.angle and addEventListener('change'). Fake both.
  vi.stubGlobal('screen', {
    orientation: {
      angle,
      addEventListener: (event: string, cb: () => void) => {
        if (!screenListeners.has(event)) screenListeners.set(event, new Set());
        screenListeners.get(event)!.add(cb);
      },
      removeEventListener: (event: string, cb: () => void) => {
        screenListeners.get(event)?.delete(cb);
      },
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  listeners.clear();
  screenListeners.clear();
});

describe('useOrientation — initial state from window dimensions', () => {
  it('reports portrait when height > width', () => {
    stubViewport(400, 800);
    const { result } = renderHook(() => useOrientation());
    expect(result.current.isPortrait).toBe(true);
    expect(result.current.isLandscape).toBe(false);
    expect(result.current.orientation).toBe('portrait');
  });

  it('reports landscape when width > height', () => {
    stubViewport(1024, 768);
    const { result } = renderHook(() => useOrientation());
    expect(result.current.isPortrait).toBe(false);
    expect(result.current.isLandscape).toBe(true);
    expect(result.current.orientation).toBe('landscape');
  });

  it('reads angle from screen.orientation when available', () => {
    stubViewport(800, 400, 90);
    const { result } = renderHook(() => useOrientation());
    expect(result.current.angle).toBe(90);
  });

  it('falls back to angle=0 when screen.orientation is missing', () => {
    vi.stubGlobal('innerWidth', 800);
    vi.stubGlobal('innerHeight', 400);
    // No screen stub at all — hook should default to 0.
    vi.stubGlobal('screen', {} as Screen);
    const { result } = renderHook(() => useOrientation());
    expect(result.current.angle).toBe(0);
  });
});

describe('useOrientation — reactive updates', () => {
  it('flips to landscape when a resize event fires after rotation', () => {
    stubViewport(400, 800); // start portrait
    const { result } = renderHook(() => useOrientation());
    expect(result.current.orientation).toBe('portrait');

    // Rotate: viewport becomes landscape, fire resize
    act(() => {
      vi.stubGlobal('innerWidth', 800);
      vi.stubGlobal('innerHeight', 400);
      listeners.get('resize')?.forEach((cb) => cb());
    });

    expect(result.current.orientation).toBe('landscape');
    expect(result.current.isLandscape).toBe(true);
  });

  it('flips on orientationchange event (legacy mobile API path)', () => {
    stubViewport(800, 400); // start landscape
    const { result } = renderHook(() => useOrientation());
    expect(result.current.orientation).toBe('landscape');

    act(() => {
      vi.stubGlobal('innerWidth', 400);
      vi.stubGlobal('innerHeight', 800);
      listeners.get('orientationchange')?.forEach((cb) => cb());
    });

    expect(result.current.orientation).toBe('portrait');
  });

  it('flips on screen.orientation change event (modern API path)', () => {
    stubViewport(400, 800);
    const { result } = renderHook(() => useOrientation());
    expect(result.current.orientation).toBe('portrait');

    act(() => {
      vi.stubGlobal('innerWidth', 800);
      vi.stubGlobal('innerHeight', 400);
      // Modern API fires `change` on window.screen.orientation
      screenListeners.get('change')?.forEach((cb) => cb());
    });

    expect(result.current.orientation).toBe('landscape');
  });
});

describe('useOrientation — cleanup', () => {
  it('removes resize + orientationchange + screen.orientation listeners on unmount', () => {
    stubViewport(400, 800);
    const { unmount } = renderHook(() => useOrientation());

    expect(listeners.get('resize')?.size).toBe(1);
    expect(listeners.get('orientationchange')?.size).toBe(1);
    expect(screenListeners.get('change')?.size).toBe(1);

    unmount();

    expect(listeners.get('resize')?.size).toBe(0);
    expect(listeners.get('orientationchange')?.size).toBe(0);
    expect(screenListeners.get('change')?.size).toBe(0);
  });
});
