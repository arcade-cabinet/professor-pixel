import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebugFlag } from '@lib/hooks/use-debug-flag';

// Window storage-event listener bookkeeping. The hook subscribes once on
// mount and unsubscribes on unmount; tests inspect listener count and
// fire StorageEvents directly via this map.
const listeners = new Map<string, Set<(e: StorageEvent) => void>>();

function stubAddRemove() {
  vi.stubGlobal('addEventListener', (event: string, cb: (e: StorageEvent) => void) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(cb);
  });
  vi.stubGlobal('removeEventListener', (event: string, cb: (e: StorageEvent) => void) => {
    listeners.get(event)?.delete(cb);
  });
}

function setSearch(query: string) {
  // jsdom location is read-only via assignment; use defineProperty. The
  // `configurable: true` on the descriptor itself is required so the
  // next setSearch call can re-define — without it, jsdom throws
  // TypeError on the second call.
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...window.location, search: query },
  });
}

beforeEach(() => {
  setSearch('');
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  listeners.clear();
  window.localStorage.clear();
});

describe('useDebugFlag — initial read', () => {
  it('returns false when neither URL nor localStorage signals debug', () => {
    stubAddRemove();
    const { result } = renderHook(() => useDebugFlag());
    expect(result.current).toBe(false);
  });

  it('returns true when ?debug=1 is in the query string', () => {
    setSearch('?debug=1');
    stubAddRemove();
    const { result } = renderHook(() => useDebugFlag());
    expect(result.current).toBe(true);
  });

  it('returns true when localStorage.debug === "1"', () => {
    window.localStorage.setItem('debug', '1');
    stubAddRemove();
    const { result } = renderHook(() => useDebugFlag());
    expect(result.current).toBe(true);
  });

  it('returns false for localStorage.debug values other than "1"', () => {
    window.localStorage.setItem('debug', 'true');
    stubAddRemove();
    const { result } = renderHook(() => useDebugFlag());
    // Strict equality — only the literal string "1" enables debug.
    expect(result.current).toBe(false);
  });

  it('?debug=1 wins even when localStorage.debug is unset', () => {
    setSearch('?debug=1');
    stubAddRemove();
    const { result } = renderHook(() => useDebugFlag());
    expect(result.current).toBe(true);
  });
});

describe('useDebugFlag — cross-tab live updates', () => {
  it('flips to true when another tab writes localStorage.debug=1', () => {
    stubAddRemove();
    const { result } = renderHook(() => useDebugFlag());
    expect(result.current).toBe(false);

    act(() => {
      window.localStorage.setItem('debug', '1');
      // Simulate the storage event the *other* tab would receive — same-tab
      // writes do NOT fire `storage` per the DOM Storage spec, but tests
      // dispatch directly to exercise the listener.
      const event = new StorageEvent('storage', { key: 'debug', newValue: '1' });
      listeners.get('storage')?.forEach((cb) => cb(event));
    });

    expect(result.current).toBe(true);
  });

  it('flips to false when another tab clears localStorage.debug', () => {
    window.localStorage.setItem('debug', '1');
    stubAddRemove();
    const { result } = renderHook(() => useDebugFlag());
    expect(result.current).toBe(true);

    act(() => {
      window.localStorage.removeItem('debug');
      const event = new StorageEvent('storage', { key: 'debug', newValue: null });
      listeners.get('storage')?.forEach((cb) => cb(event));
    });

    expect(result.current).toBe(false);
  });

  it('also re-reads when a global storage clear is dispatched (key === null)', () => {
    window.localStorage.setItem('debug', '1');
    stubAddRemove();
    const { result } = renderHook(() => useDebugFlag());
    expect(result.current).toBe(true);

    act(() => {
      window.localStorage.clear();
      // localStorage.clear() dispatches a storage event with key=null per
      // spec — the hook's `e.key === null` branch must handle that.
      const event = new StorageEvent('storage', { key: null, newValue: null });
      listeners.get('storage')?.forEach((cb) => cb(event));
    });

    expect(result.current).toBe(false);
  });

  it('ignores storage events for unrelated keys', () => {
    window.localStorage.setItem('debug', '1');
    stubAddRemove();
    const { result } = renderHook(() => useDebugFlag());
    expect(result.current).toBe(true);

    act(() => {
      // Another key changed; debug must remain unchanged.
      const event = new StorageEvent('storage', { key: 'unrelated', newValue: 'x' });
      listeners.get('storage')?.forEach((cb) => cb(event));
    });

    expect(result.current).toBe(true);
  });
});

describe('useDebugFlag — cleanup', () => {
  it('subscribes to the storage event on mount', () => {
    stubAddRemove();
    renderHook(() => useDebugFlag());
    expect(listeners.get('storage')?.size).toBe(1);
  });

  it('removes the storage listener on unmount', () => {
    stubAddRemove();
    const { unmount } = renderHook(() => useDebugFlag());
    expect(listeners.get('storage')?.size).toBe(1);
    unmount();
    expect(listeners.get('storage')?.size).toBe(0);
  });
});

describe('useDebugFlag — defensive fallback', () => {
  it('returns false when localStorage access throws (private mode / opaque origin)', () => {
    // Override getItem to throw — simulates Safari private mode and
    // sandboxed iframes where window.localStorage exists but throws on
    // access. The hook must swallow and return false rather than crashing.
    const originalGetItem = window.localStorage.getItem;
    window.localStorage.getItem = () => {
      throw new DOMException('SecurityError');
    };
    stubAddRemove();
    try {
      const { result } = renderHook(() => useDebugFlag());
      expect(result.current).toBe(false);
    } finally {
      window.localStorage.getItem = originalGetItem;
    }
  });
});
