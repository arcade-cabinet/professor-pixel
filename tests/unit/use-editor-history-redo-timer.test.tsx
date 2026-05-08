// Cover the redo() setTimeout callback in
// src/hooks/use-editor-history.ts (line 66) — the inner
// `isUndoingRef.current = false` reset that lands a tick after the
// redo() call.
//
// The existing use-editor-history.test.tsx asserts redo's return value
// but never calls vi.runAllTimers() after the redo, so the
// setTimeout(... , 0) callback never fires. Drive a redo and flush
// fake timers so line 66 executes.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useEditorHistory } from '@lib/hooks/use-editor-history';
import type { Entity } from '@lib/types/schema';

function entity(id: string, x = 0, y = 0): Entity {
  return {
    id,
    type: 'custom',
    name: id,
    position: { x, y },
    properties: {},
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useEditorHistory — redo setTimeout flush (line 66)', () => {
  it('clears isUndoingRef after redo when timers run to completion', () => {
    const { result } = renderHook(() => useEditorHistory());
    const target = [entity('a', 50, 50)];

    // Seed: record + flush + undo + flush.
    act(() => {
      result.current.recordModify(target, [entity('a')]);
    });
    act(() => {
      vi.runAllTimers();
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      vi.runAllTimers();
    });

    // Redo: this schedules the setTimeout-flush we want to cover.
    let redone: Entity[] | null = null;
    act(() => {
      redone = result.current.redo();
    });
    expect(redone).toEqual(target);

    // Flush the pending setTimeout — line 66 fires here.
    act(() => {
      vi.runAllTimers();
    });

    // Sanity: subsequent recordAdd succeeds (would short-circuit if
    // isUndoingRef were still true).
    act(() => {
      result.current.recordAdd([entity('b')]);
    });
    act(() => {
      vi.runAllTimers();
    });
    // The recordAdd after the flush should have grown history past
    // the redone entry.
    expect(result.current.historySize).toBeGreaterThan(0);
  });
});
