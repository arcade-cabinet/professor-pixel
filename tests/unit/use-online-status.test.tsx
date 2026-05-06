import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOnlineStatus } from '@lib/hooks/use-online-status';

// Window 'online' / 'offline' listener bookkeeping. Each test owns the
// dispatch — fire listeners directly via map.forEach so we don't rely on
// jsdom's event-target plumbing for window-level events.
const listeners = new Map<string, Set<() => void>>();

function stubWindow(initialOnline: boolean) {
  // navigator.onLine is the primary state read. jsdom defaults to true;
  // override via a property descriptor so the hook's getClientSnapshot
  // sees whatever the test set.
  Object.defineProperty(globalThis.navigator, 'onLine', {
    configurable: true,
    get: () => initialOnline,
  });

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

function setOnline(value: boolean) {
  Object.defineProperty(globalThis.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
}

afterEach(() => {
  // Order matters: clear our listener bookkeeping BEFORE restoring real
  // window.add/removeEventListener. If a renderHook cleanup fires after
  // globals are restored (StrictMode double-invoke, deferred unmount),
  // the hook's unsubscribe would hit the real removeEventListener and
  // bypass our map — leaving a stale entry that pollutes the next test.
  listeners.clear();
  vi.unstubAllGlobals();
});

describe('useOnlineStatus', () => {
  it('returns navigator.onLine === true on initial render', () => {
    stubWindow(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('returns navigator.onLine === false on initial render when offline', () => {
    stubWindow(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('flips to false when the offline event fires', () => {
    stubWindow(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      setOnline(false);
      listeners.get('offline')?.forEach((cb) => cb());
    });

    expect(result.current).toBe(false);
  });

  it('flips back to true when the online event fires', () => {
    stubWindow(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    act(() => {
      setOnline(true);
      listeners.get('online')?.forEach((cb) => cb());
    });

    expect(result.current).toBe(true);
  });

  it('subscribes to both online and offline events', () => {
    stubWindow(true);
    renderHook(() => useOnlineStatus());
    expect(listeners.get('online')?.size).toBe(1);
    expect(listeners.get('offline')?.size).toBe(1);
  });

  it('removes both listeners on unmount', () => {
    stubWindow(true);
    const { unmount } = renderHook(() => useOnlineStatus());
    expect(listeners.get('online')?.size).toBe(1);
    expect(listeners.get('offline')?.size).toBe(1);

    unmount();

    expect(listeners.get('online')?.size).toBe(0);
    expect(listeners.get('offline')?.size).toBe(0);
  });
});
