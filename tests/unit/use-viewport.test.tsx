import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewport } from '@lib/hooks/use-viewport';

afterEach(() => {
  vi.unstubAllGlobals();
  mediaListeners.clear();
});

// Captures matchMedia change listeners by query so tests can simulate a
// pointer-modality flip (mouse plugged in, tablet docked) without resizing.
const mediaListeners = new Map<string, Set<() => void>>();

function stubViewport(width: number, opts: { coarse?: boolean; fine?: boolean } = {}) {
  const { coarse = false, fine = true } = opts;
  vi.stubGlobal('innerWidth', width);
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: (q.includes('pointer: coarse') && coarse) || (q.includes('any-pointer: fine') && fine),
    media: q,
    addEventListener: (_: string, cb: () => void) => {
      if (!mediaListeners.has(q)) mediaListeners.set(q, new Set());
      mediaListeners.get(q)!.add(cb);
    },
    removeEventListener: (_: string, cb: () => void) => {
      mediaListeners.get(q)?.delete(cb);
    },
  }));
}

function fireMediaChange(query: string) {
  mediaListeners.get(query)?.forEach((cb) => cb());
}

describe('useViewport', () => {
  it('reports isCompact=true under 1024px', () => {
    stubViewport(800);
    const { result } = renderHook(() => useViewport());
    expect(result.current.isCompact).toBe(true);
    expect(result.current.width).toBe(800);
  });

  it('reports isCompact=false at 1024px and above', () => {
    stubViewport(1280);
    const { result } = renderHook(() => useViewport());
    expect(result.current.isCompact).toBe(false);
  });

  it('detects touch-primary via coarse pointer', () => {
    stubViewport(800, { coarse: true });
    const { result } = renderHook(() => useViewport());
    expect(result.current.isTouchPrimary).toBe(true);
  });

  it('reports touch-primary when no fine pointer is available', () => {
    stubViewport(800, { coarse: false, fine: false });
    const { result } = renderHook(() => useViewport());
    expect(result.current.isTouchPrimary).toBe(true);
  });

  it('reacts to pointer-modality change without a resize', () => {
    // Tablet starts coarse-only (no fine pointer at all)
    stubViewport(1100, { coarse: true, fine: false });
    const { result } = renderHook(() => useViewport());
    expect(result.current.isTouchPrimary).toBe(true);

    // User docks the tablet to a keyboard/mouse: any-pointer: fine becomes
    // true and pointer: coarse flips to false. No resize fires.
    act(() => {
      stubViewport(1100, { coarse: false, fine: true });
      fireMediaChange('(any-pointer: fine)');
    });

    expect(result.current.isTouchPrimary).toBe(false);
  });

  it('updates on window resize', () => {
    stubViewport(1400);
    const { result } = renderHook(() => useViewport());
    expect(result.current.isCompact).toBe(false);

    act(() => {
      // Simulate a resize to phone width
      stubViewport(375);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isCompact).toBe(true);
    expect(result.current.width).toBe(375);
  });
});
