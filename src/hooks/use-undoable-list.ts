// P4.29 — generic undo/redo state container for list-shaped state.
//
// Used by the WYSIWYG editor so a kid can experiment fearlessly:
// drop, move, set properties, oops, Ctrl+Z. The state machine is a
// classic past / present / future triple. Mutations push the current
// `present` onto `past` and clear `future` (a new branch); undo
// shifts the head of `past` to `present` and pushes the old `present`
// onto `future`.
//
// We cap history at 50 entries so a long session doesn't bloat
// memory or persist into a giant snapshot when the wizard saves.
// 50 = roughly five minutes of click-happy editing.
//
// API:
//   const { state, set, undo, redo, canUndo, canRedo, reset } =
//     useUndoableList<MyShape>(initial);
//   set(next)        — record a transition
//   set((prev) => x) — functional form, like useState
//   undo()           — move one step back (no-op if !canUndo)
//   redo()           — move one step forward (no-op if !canRedo)
//   reset(next)      — erase history, set new baseline
//
// Tests live in tests/unit/use-undoable-list.test.ts.

import { useCallback, useReducer } from 'react';

const HISTORY_LIMIT = 50;

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

type Action<T> =
  | { type: 'set'; value: T | ((prev: T) => T) }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; value: T };

function reducer<T>(state: HistoryState<T>, action: Action<T>): HistoryState<T> {
  switch (action.type) {
    case 'set': {
      // Resolve functional updates against the reducer's OWN state so
      // two `set` calls in the same React batch see each other's
      // intermediate values (just like useState's functional form).
      // Folded forward from task-029 review.
      const resolved =
        typeof action.value === 'function'
          ? (action.value as (prev: T) => T)(state.present)
          : action.value;
      // Reference-equality skip: useful for primitive state (the
      // hook accepts `T` not just `T[]`) and harmless for arrays
      // since callers always produce a new reference per mutation.
      if (resolved === state.present) return state;
      const past = [...state.past, state.present];
      // Trim the oldest entry once we exceed the cap. Drops the head,
      // which is the FURTHEST-back state — the kid can still undo a
      // long way, just not all the way to the dawn of time.
      if (past.length > HISTORY_LIMIT) past.shift();
      return { past, present: resolved, future: [] };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1] as T;
      const past = state.past.slice(0, -1);
      return { past, present: previous, future: [state.present, ...state.future] };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const next = state.future[0] as T;
      const future = state.future.slice(1);
      return { past: [...state.past, state.present], present: next, future };
    }
    case 'reset':
      return { past: [], present: action.value, future: [] };
  }
}

export interface UndoableList<T> {
  state: T;
  set: (next: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (next: T) => void;
}

export function useUndoableList<T>(initial: T): UndoableList<T> {
  const [hs, dispatch] = useReducer(reducer<T>, {
    past: [],
    present: initial,
    future: [],
  } satisfies HistoryState<T>);

  const set = useCallback(
    // Pass the value (or the function) through — the reducer resolves
    // functional updates against its OWN latest state. Stable ref
    // because dispatch is stable; no closure over hs.present.
    (next: T | ((prev: T) => T)) => dispatch({ type: 'set', value: next }),
    []
  );

  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const reset = useCallback((next: T) => dispatch({ type: 'reset', value: next }), []);

  return {
    state: hs.present,
    set,
    undo,
    redo,
    canUndo: hs.past.length > 0,
    canRedo: hs.future.length > 0,
    reset,
  };
}
