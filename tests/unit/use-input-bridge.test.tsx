import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useInputBridge } from '@lib/hooks/use-input-bridge';

describe('useInputBridge — initial state', () => {
  it('starts closed with empty prompt', () => {
    const { result } = renderHook(() => useInputBridge());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.prompt).toBe('');
  });
});

describe('useInputBridge — open / submit', () => {
  it('open() flips isOpen, sets the prompt text, and resolves on submit', async () => {
    const { result } = renderHook(() => useInputBridge());

    let openPromise!: Promise<string | null>;
    act(() => {
      openPromise = result.current.open('Enter your name');
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.prompt).toBe('Enter your name');

    act(() => {
      result.current.handleSubmit('Alice');
    });

    await expect(openPromise).resolves.toBe('Alice');
    expect(result.current.isOpen).toBe(false);
    expect(result.current.prompt).toBe('');
  });

  it('open() with no prompt argument defaults to empty string', () => {
    const { result } = renderHook(() => useInputBridge());

    act(() => {
      // Cast through unknown to reach the default-arg path without
      // tripping ts-no-explicit-any on the test file.
      void (result.current.open as () => Promise<string | null>)();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.prompt).toBe('');
  });
});

describe('useInputBridge — cancel', () => {
  it('handleCancel() resolves the open promise with null and closes', async () => {
    const { result } = renderHook(() => useInputBridge());

    let openPromise!: Promise<string | null>;
    act(() => {
      openPromise = result.current.open('Continue?');
    });

    act(() => {
      result.current.handleCancel();
    });

    await expect(openPromise).resolves.toBeNull();
    expect(result.current.isOpen).toBe(false);
  });
});

describe('useInputBridge — concurrency', () => {
  it('opening a second prompt while one is pending rejects the first with null', async () => {
    // Doctrine: the bridge is single-slot. Pyodide's input() pump must
    // never see a stale prompt resolved by a later submit — the first
    // open must terminate (with null = cancel) the moment a second open
    // arrives.
    const { result } = renderHook(() => useInputBridge());

    let firstPromise!: Promise<string | null>;
    let secondPromise!: Promise<string | null>;

    // Async act() flushes promise microtasks alongside React state — a
    // sync act() would leave the rejection of `firstPromise` un-flushed
    // under React 19 concurrent scheduling, making the assertion below
    // race-prone.
    await act(async () => {
      firstPromise = result.current.open('First');
    });

    await act(async () => {
      secondPromise = result.current.open('Second');
    });

    // First promise resolves to null immediately on the second open.
    await expect(firstPromise).resolves.toBeNull();

    // Bridge still open for the second prompt.
    expect(result.current.isOpen).toBe(true);
    expect(result.current.prompt).toBe('Second');

    await act(async () => {
      result.current.handleSubmit('OK');
    });

    await expect(secondPromise).resolves.toBe('OK');
    expect(result.current.isOpen).toBe(false);
  });
});

describe('useInputBridge — handler safety when no prompt is open', () => {
  it('handleSubmit is a no-op when no prompt is pending', () => {
    const { result } = renderHook(() => useInputBridge());

    expect(() => {
      act(() => {
        result.current.handleSubmit('orphan');
      });
    }).not.toThrow();

    expect(result.current.isOpen).toBe(false);
  });

  it('handleCancel is a no-op when no prompt is pending', () => {
    const { result } = renderHook(() => useInputBridge());

    expect(() => {
      act(() => {
        result.current.handleCancel();
      });
    }).not.toThrow();

    expect(result.current.isOpen).toBe(false);
  });
});

describe('useInputBridge — callback identity', () => {
  it('open / handleSubmit / handleCancel are stable across renders', () => {
    const { result, rerender } = renderHook(() => useInputBridge());

    const open1 = result.current.open;
    const submit1 = result.current.handleSubmit;
    const cancel1 = result.current.handleCancel;

    rerender();

    // useCallback with `[]` deps must keep these stable so consumers
    // (e.g. the runtime input pump) can capture them once.
    expect(result.current.open).toBe(open1);
    expect(result.current.handleSubmit).toBe(submit1);
    expect(result.current.handleCancel).toBe(cancel1);
  });
});
