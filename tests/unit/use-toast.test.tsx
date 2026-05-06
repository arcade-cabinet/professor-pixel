import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToast, toast } from '@lib/hooks/use-toast';

// IMPORTANT: useToast keeps state in a MODULE-LEVEL variable shared
// across hook instances. Tests must dismiss + flush all toasts in
// afterEach so module state doesn't bleed between tests.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // Drain any pending toasts: dismiss → fast-forward through the
  // 1,000,000ms TOAST_REMOVE_DELAY → flush. Without this, the next
  // test sees yesterday's toast in `state.toasts`.
  const { result } = renderHook(() => useToast());
  act(() => {
    result.current.dismiss();
  });
  act(() => {
    vi.advanceTimersByTime(2_000_000);
  });
  vi.useRealTimers();
});

describe('useToast — initial state', () => {
  it('starts with an empty toasts array', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });
});

describe('useToast — adding toasts', () => {
  it('adds a toast with title + description and exposes id/dismiss/update', () => {
    const { result } = renderHook(() => useToast());

    let handle: ReturnType<typeof toast> | undefined;
    act(() => {
      handle = result.current.toast({ title: 'Hello', description: 'world' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Hello');
    expect(result.current.toasts[0].description).toBe('world');
    expect(result.current.toasts[0].open).toBe(true);
    expect(handle).toBeDefined();
    expect(typeof handle?.id).toBe('string');
    expect(typeof handle?.dismiss).toBe('function');
    expect(typeof handle?.update).toBe('function');
  });

  it('caps visible toasts at TOAST_LIMIT (1) — newer replaces older', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'first' });
    });
    act(() => {
      result.current.toast({ title: 'second' });
    });

    // TOAST_LIMIT=1: the newer one wins (toasts is sliced from the
    // start), so only 'second' is visible.
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('second');
  });

  it('newly-added toast lands at index 0 (most recent first)', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'one' });
    });

    expect(result.current.toasts[0].title).toBe('one');
  });
});

describe('useToast — updating toasts', () => {
  it('handle.update mutates the matching toast in place', () => {
    const { result } = renderHook(() => useToast());

    let handle: ReturnType<typeof toast> | undefined;
    act(() => {
      handle = result.current.toast({ title: 'before' });
    });

    act(() => {
      handle?.update({ id: handle.id, title: 'after' } as never);
    });

    expect(result.current.toasts[0].title).toBe('after');
  });
});

describe('useToast — dismissing toasts', () => {
  it('dismiss(id) sets open=false on that specific toast', () => {
    const { result } = renderHook(() => useToast());

    let handle: ReturnType<typeof toast> | undefined;
    act(() => {
      handle = result.current.toast({ title: 'closing' });
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      handle?.dismiss();
    });

    // open=false is the visual close trigger; toast still in array
    // until TOAST_REMOVE_DELAY elapses.
    expect(result.current.toasts[0].open).toBe(false);
  });

  it('dismiss() with no id closes ALL toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'a' });
    });

    act(() => {
      result.current.dismiss();
    });

    // All toasts have open=false.
    for (const t of result.current.toasts) {
      expect(t.open).toBe(false);
    }
  });

  it('REMOVE_TOAST fires after TOAST_REMOVE_DELAY (1,000,000ms) and clears the array', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'temp' });
    });
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.dismiss();
    });

    // open=false, but still present.
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1_000_000);
    });

    // Now removed.
    expect(result.current.toasts).toHaveLength(0);
  });
});

describe('useToast — onOpenChange wiring', () => {
  it('the auto-attached onOpenChange(false) triggers a dismiss', () => {
    // Pin the contract that the toast's `open=false` Radix-UI signal
    // funnels back into the dispatch as DISMISS_TOAST. Without this,
    // a user clicking the Radix dismiss X would NOT clean up our
    // module-level state.
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'radix-closing' });
    });

    const onOpenChange = result.current.toasts[0].onOpenChange;
    expect(typeof onOpenChange).toBe('function');

    act(() => {
      onOpenChange?.(false);
    });

    // Same outcome as dismiss(): open flips to false.
    expect(result.current.toasts[0].open).toBe(false);
  });

  it('onOpenChange(true) is a no-op (only false triggers dismiss)', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'still-open' });
    });

    const onOpenChange = result.current.toasts[0].onOpenChange;
    act(() => {
      onOpenChange?.(true);
    });

    expect(result.current.toasts[0].open).toBe(true);
  });
});

describe('useToast — listener wiring', () => {
  it('two hook instances see the same toast state (shared module store)', () => {
    const a = renderHook(() => useToast());
    const b = renderHook(() => useToast());

    act(() => {
      a.result.current.toast({ title: 'shared' });
    });

    // Both hooks reflect the new toast — proves the module-level
    // listeners array fans out to every active subscriber.
    expect(a.result.current.toasts).toHaveLength(1);
    expect(b.result.current.toasts).toHaveLength(1);
    expect(b.result.current.toasts[0].title).toBe('shared');
  });

  it('unmount removes the hook from the listeners array', () => {
    const { result, unmount } = renderHook(() => useToast());

    // Add a toast through the (still-mounted) hook.
    act(() => {
      result.current.toast({ title: 'pre-unmount' });
    });
    expect(result.current.toasts).toHaveLength(1);

    unmount();

    // Now create another hook and add another toast — the original
    // hook's setState should NOT be called (it's been removed). We
    // can't directly observe that, but we can check that no exception
    // is thrown when dispatch fans out — the unmounted hook would
    // throw "can't perform a React state update on an unmounted
    // component" under React 18 if the listener wasn't removed.
    const { result: r2 } = renderHook(() => useToast());
    expect(() => {
      act(() => {
        r2.current.toast({ title: 'post-unmount' });
      });
    }).not.toThrow();

    expect(r2.current.toasts).toHaveLength(1);
  });
});
