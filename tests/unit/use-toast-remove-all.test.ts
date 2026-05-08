// Cover the REMOVE_TOAST-without-toastId branch in src/hooks/use-toast.ts
// (line 112). The existing use-toast.test.tsx exercises REMOVE_TOAST via
// the dismiss-then-advance-timers chain, which always dispatches
// REMOVE_TOAST with a specific toastId — so the toastId === undefined
// branch (clear-all) stays uncovered. Drive the reducer directly here.

import { describe, expect, it } from 'vitest';
import { reducer } from '@lib/hooks/use-toast';

describe('use-toast reducer — REMOVE_TOAST without toastId (line 112)', () => {
  it('returns a state with an empty toasts array when toastId is undefined', () => {
    const seeded = {
      toasts: [
        { id: 'a', open: true, title: 'A' },
        { id: 'b', open: true, title: 'B' },
      ],
    } as unknown as Parameters<typeof reducer>[0];

    const next = reducer(seeded, { type: 'REMOVE_TOAST' } as Parameters<typeof reducer>[1]);

    expect(next.toasts).toEqual([]);
  });

  it('preserves the rest of state when clearing all toasts', () => {
    const seeded = {
      toasts: [{ id: 'a', open: true } as never],
      // The reducer spreads state, so any additional ambient fields the
      // future may add should round-trip. Pin that contract.
      extra: 'preserve-me',
    } as unknown as Parameters<typeof reducer>[0];
    const next = reducer(
      seeded,
      { type: 'REMOVE_TOAST' } as Parameters<typeof reducer>[1]
    ) as unknown as { toasts: unknown[]; extra?: string };
    expect(next.toasts).toEqual([]);
    expect(next.extra).toBe('preserve-me');
  });
});
