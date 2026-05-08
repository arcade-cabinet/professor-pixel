// Cover the multi-toast branches in src/hooks/use-toast.ts:
//   - line 82: UPDATE_TOAST's ternary `t.id === action.toast.id ? merged : t`
//     — the false arm (other toasts pass through unchanged) doesn't fire
//     in product because TOAST_LIMIT=1 means only one toast lives at a
//     time. The reducer is exported, so we call it directly with a
//     two-toast state to exercise both arms.
//   - line 101: DISMISS_TOAST's ternary `t.id === toastId || toastId
//     === undefined ? close : t` — same reason; the "specific id, not
//     this one" path needs a multi-toast state the public hook surface
//     can't legitimately produce.
//
// Both targets are pure-reducer branches; calling the exported reducer
// with hand-built state is the cleanest way in. No timers, no React,
// no module-state cleanup.

import { describe, expect, it } from 'vitest';
import { reducer } from '@lib/hooks/use-toast';

// Helper to build a state with two toasts, bypassing TOAST_LIMIT=1 (the
// limit is enforced in the ADD_TOAST reducer, not the State type).
function twoToastState() {
  return {
    toasts: [
      { id: 'a', open: true, title: 'A' },
      { id: 'b', open: true, title: 'B' },
      // ToasterToast has more required fields per the public type, but
      // the reducer only reads .id and spreads the rest — pinning the
      // narrow shape here keeps the test focused on branch coverage
      // rather than fixture maintenance.
    ],
  } as unknown as Parameters<typeof reducer>[0];
}

describe('use-toast reducer — UPDATE_TOAST passes non-matching toasts through (line 82)', () => {
  it('only the matching id gets merged; the other survives untouched', () => {
    const state = twoToastState();
    const next = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: 'a', title: 'A-updated' },
    });
    expect(next.toasts).toHaveLength(2);
    const a = next.toasts.find((t) => t.id === 'a');
    const b = next.toasts.find((t) => t.id === 'b');
    expect(a?.title).toBe('A-updated');
    // 'b' fell through the `: t` arm — title unchanged, identity
    // preserved.
    expect(b?.title).toBe('B');
    expect(b).toBe(state.toasts[1]);
  });
});

describe('use-toast reducer — DISMISS_TOAST id-targeted path leaves other toasts open (line 101)', () => {
  it('dismissing a specific id flips that toast.open to false; the other stays open', () => {
    const state = twoToastState();
    const next = reducer(state, { type: 'DISMISS_TOAST', toastId: 'a' });
    const a = next.toasts.find((t) => t.id === 'a');
    const b = next.toasts.find((t) => t.id === 'b');
    expect(a?.open).toBe(false);
    // 'b' fell through the `: t` arm — open stays true, identity
    // preserved.
    expect(b?.open).toBe(true);
    expect(b).toBe(state.toasts[1]);
  });
});
