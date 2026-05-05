// P4.29 — useUndoableList hook contract.

import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoableList } from '@lib/hooks/use-undoable-list';

describe('useUndoableList (P4.29)', () => {
  it('starts with the initial value, no history', () => {
    const { result } = renderHook(() => useUndoableList<number[]>([1, 2, 3]));
    expect(result.current.state).toEqual([1, 2, 3]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('set records the prior state on past', () => {
    const { result } = renderHook(() => useUndoableList<number[]>([1]));
    act(() => result.current.set([1, 2]));
    expect(result.current.state).toEqual([1, 2]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('functional set works like useState', () => {
    const { result } = renderHook(() => useUndoableList<number[]>([1]));
    act(() => result.current.set((prev) => [...prev, 2]));
    act(() => result.current.set((prev) => [...prev, 3]));
    expect(result.current.state).toEqual([1, 2, 3]);
  });

  it('undo restores the previous state and enables redo', () => {
    const { result } = renderHook(() => useUndoableList<string>('a'));
    act(() => result.current.set('b'));
    act(() => result.current.set('c'));
    act(() => result.current.undo());
    expect(result.current.state).toBe('b');
    expect(result.current.canRedo).toBe(true);
    expect(result.current.canUndo).toBe(true);
  });

  it('redo reapplies the undone state', () => {
    const { result } = renderHook(() => useUndoableList<string>('a'));
    act(() => result.current.set('b'));
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(result.current.state).toBe('b');
    expect(result.current.canRedo).toBe(false);
  });

  it('a new set after undo clears the redo stack (new branch)', () => {
    const { result } = renderHook(() => useUndoableList<string>('a'));
    act(() => result.current.set('b'));
    act(() => result.current.set('c'));
    act(() => result.current.undo()); // back to 'b'
    act(() => result.current.set('d')); // diverges
    expect(result.current.state).toBe('d');
    expect(result.current.canRedo).toBe(false);
  });

  it('undo at the bottom of history is a no-op', () => {
    const { result } = renderHook(() => useUndoableList<string>('a'));
    act(() => result.current.undo());
    expect(result.current.state).toBe('a');
    expect(result.current.canUndo).toBe(false);
  });

  it('redo at the top of future is a no-op', () => {
    const { result } = renderHook(() => useUndoableList<string>('a'));
    act(() => result.current.redo());
    expect(result.current.state).toBe('a');
    expect(result.current.canRedo).toBe(false);
  });

  it('reset wipes history and sets a new baseline', () => {
    const { result } = renderHook(() => useUndoableList<string>('a'));
    act(() => result.current.set('b'));
    act(() => result.current.set('c'));
    act(() => result.current.reset('zero'));
    expect(result.current.state).toBe('zero');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('caps history at 50 entries (oldest is dropped)', () => {
    const { result } = renderHook(() => useUndoableList<number>(0));
    // Push 60 transitions; 50 most recent should remain in past.
    for (let i = 1; i <= 60; i++) {
      act(() => result.current.set(i));
    }
    expect(result.current.state).toBe(60);
    // Undo back as far as we can — 50 steps lands us at value 10
    // (60 - 50 = 10), not 0.
    for (let i = 0; i < 50; i++) {
      act(() => result.current.undo());
    }
    expect(result.current.state).toBe(10);
    expect(result.current.canUndo).toBe(false);
  });

  it('skips no-op identical values to avoid history clutter', () => {
    const { result } = renderHook(() => useUndoableList<string>('a'));
    act(() => result.current.set('a'));
    expect(result.current.canUndo).toBe(false);
  });
});
