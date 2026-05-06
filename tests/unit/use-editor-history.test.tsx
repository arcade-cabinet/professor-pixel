import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useEditorHistory } from '@lib/hooks/use-editor-history';
import type { Entity } from '@lib/types/schema';

// Minimal Entity factory — the hook treats Entity as opaque, so we
// only need shape compatibility, not full validation.
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
  // Use modern fake timers — the hook calls setTimeout(... , 0) inside
  // undo/redo to clear `isUndoingRef.current`. Tests that exercise
  // back-to-back undo+addToHistory need to control that flush.
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useEditorHistory — initial state', () => {
  it('starts with empty history, no index, undo/redo disabled', () => {
    const { result } = renderHook(() => useEditorHistory());

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historySize).toBe(0);
    expect(result.current.currentIndex).toBe(-1);
  });
});

describe('useEditorHistory — recording entries', () => {
  it('recordAdd pushes an "add" entry and enables undo', () => {
    const { result } = renderHook(() => useEditorHistory());

    act(() => {
      result.current.recordAdd([entity('a')]);
    });

    expect(result.current.historySize).toBe(1);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('recordDelete stores entities as previousState (undo target)', () => {
    const { result } = renderHook(() => useEditorHistory());

    act(() => {
      result.current.recordDelete([entity('a'), entity('b')]);
    });

    // Undo of a delete should hand back the deleted entities so the
    // editor can restore them.
    let restored: Entity[] | null = null;
    act(() => {
      restored = result.current.undo();
    });

    expect(restored).toEqual([entity('a'), entity('b')]);
  });

  it('recordModify stores both new and previous state', () => {
    const { result } = renderHook(() => useEditorHistory());

    const before = [entity('a', 0, 0)];
    const after = [entity('a', 100, 50)];

    act(() => {
      result.current.recordModify(after, before);
    });

    let undone: Entity[] | null = null;
    act(() => {
      undone = result.current.undo();
    });
    // Undo restores the previousState.
    expect(undone).toEqual(before);

    // Need to flush the setTimeout(...,0) inside undo before recording
    // is allowed again — flush via vi.runAllTimers in the rest of the
    // tests. Here we just exit.
  });

  it('recordBatch is a multi-entity tracking variant', () => {
    const { result } = renderHook(() => useEditorHistory());

    const before = [entity('a'), entity('b')];
    const after = [entity('a', 10, 10), entity('b', 20, 20)];

    act(() => {
      result.current.recordBatch(after, before);
    });

    expect(result.current.historySize).toBe(1);
  });
});

describe('useEditorHistory — undo / redo', () => {
  it('undo on empty history returns null and stays disabled', () => {
    const { result } = renderHook(() => useEditorHistory());

    let undone: unknown = 'sentinel';
    act(() => {
      undone = result.current.undo();
    });
    expect(undone).toBeNull();
    expect(result.current.canUndo).toBe(false);
  });

  it('redo when nothing to redo returns null', () => {
    const { result } = renderHook(() => useEditorHistory());

    let redone: unknown = 'sentinel';
    act(() => {
      redone = result.current.redo();
    });
    expect(redone).toBeNull();
    expect(result.current.canRedo).toBe(false);
  });

  it('undo decrements index and enables redo', () => {
    const { result } = renderHook(() => useEditorHistory());

    act(() => {
      result.current.recordAdd([entity('a')]);
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.currentIndex).toBe(0);

    act(() => {
      result.current.undo();
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo advances to the next entry and returns its entities', () => {
    const { result } = renderHook(() => useEditorHistory());

    const target = [entity('a', 50, 50)];

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

    let redone: Entity[] | null = null;
    act(() => {
      redone = result.current.redo();
    });

    expect(redone).toEqual(target);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.canUndo).toBe(true);
  });

  it('isUndoingRef prevents recursive recording during undo', () => {
    // While undo() is in flight (between the call and the setTimeout
    // flush), addToHistory must short-circuit. This pins the behavior
    // that prevents an editor's onChange handler from re-recording the
    // restoration as a fresh history entry.
    const { result } = renderHook(() => useEditorHistory());

    act(() => {
      result.current.recordAdd([entity('a')]);
    });
    act(() => {
      vi.runAllTimers();
    });
    expect(result.current.historySize).toBe(1);

    act(() => {
      result.current.undo();
      // Mid-flight: the editor receives the restoration and re-fires
      // recordAdd. Hook must IGNORE it.
      result.current.recordAdd([entity('b')]);
    });

    // Still only the original entry; the recursive add was suppressed.
    expect(result.current.historySize).toBe(1);

    act(() => {
      vi.runAllTimers();
    });
  });
});

describe('useEditorHistory — branching after undo', () => {
  it('recording after undo discards the redo tail', () => {
    const { result } = renderHook(() => useEditorHistory());

    act(() => {
      result.current.recordAdd([entity('a')]);
    });
    act(() => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.recordAdd([entity('b')]);
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

    expect(result.current.historySize).toBe(2);
    expect(result.current.canRedo).toBe(true);

    // Now record a NEW branch — the redo tail (entry 'b') must be
    // discarded so the user can't redo into a now-impossible future.
    act(() => {
      result.current.recordAdd([entity('c')]);
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.historySize).toBe(2); // 'a' + 'c'
    expect(result.current.canRedo).toBe(false);
  });
});

describe('useEditorHistory — history-size cap', () => {
  it('caps history at maxHistorySize, evicting oldest', () => {
    const { result } = renderHook(() => useEditorHistory({ maxHistorySize: 3 }));

    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.recordAdd([entity(`e${i}`)]);
      });
      act(() => {
        vi.runAllTimers();
      });
    }

    // Should have only the last 3 entries.
    expect(result.current.historySize).toBe(3);
  });

  it('default cap is 50', () => {
    const { result } = renderHook(() => useEditorHistory());

    for (let i = 0; i < 60; i++) {
      act(() => {
        result.current.recordAdd([entity(`e${i}`)]);
      });
      act(() => {
        vi.runAllTimers();
      });
    }

    expect(result.current.historySize).toBe(50);
  });
});

describe('useEditorHistory — clearHistory', () => {
  it('resets to empty state and disables undo/redo', () => {
    const { result } = renderHook(() => useEditorHistory());

    act(() => {
      result.current.recordAdd([entity('a')]);
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.historySize).toBe(0);
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
