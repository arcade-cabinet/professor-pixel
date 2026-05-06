import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// Mock the global error handler module BEFORE importing the hook so
// the hook captures our mock. vi.mock is hoisted to the top of the
// module by vitest 4, so referencing the mock-state variables below
// works because they are accessed lazily inside the factory closures.
const handlerState = {
  debugMode: false,
  errors: [] as { type: string; level: string; timestamp: string; error: string }[],
  listeners: [] as Array<() => void>,
};

vi.mock('@lib/errors/global-handler', () => ({
  globalErrorHandler: {
    setDebugMode: (enabled: boolean) => {
      handlerState.debugMode = enabled;
    },
    getDebugMode: () => handlerState.debugMode,
    getRecentErrors: (_limit: number) => handlerState.errors.slice(0, _limit),
    subscribe: (listener: () => void) => {
      handlerState.listeners.push(listener);
      return () => {
        const i = handlerState.listeners.indexOf(listener);
        if (i >= 0) handlerState.listeners.splice(i, 1);
      };
    },
    clearErrors: () => {
      handlerState.errors = [];
    },
    track: (e: { type: string; level: string; timestamp: string; error: string }) => {
      handlerState.errors.unshift(e);
      handlerState.listeners.forEach((l) => l());
    },
    getErrorStats: () => ({
      total: handlerState.errors.length,
      byLevel: { error: handlerState.errors.filter((e) => e.level === 'error').length },
    }),
  },
}));

// Hook import MUST come after vi.mock. Vitest hoists mocks but TS
// still resolves imports top-to-bottom in source order.
import { useDebug } from '@lib/hooks/use-debug';

const keydownListeners = new Set<(e: KeyboardEvent) => void>();

beforeEach(() => {
  handlerState.debugMode = false;
  handlerState.errors = [];
  handlerState.listeners = [];
  keydownListeners.clear();

  vi.stubGlobal(
    'addEventListener',
    (
      event: string,
      cb: (e: KeyboardEvent) => void,
      _options?: AddEventListenerOptions | boolean
    ) => {
      if (event === 'keydown') keydownListeners.add(cb);
    }
  );
  vi.stubGlobal(
    'removeEventListener',
    (event: string, cb: (e: KeyboardEvent) => void, _options?: EventListenerOptions | boolean) => {
      if (event === 'keydown') keydownListeners.delete(cb);
    }
  );
});

afterEach(() => {
  keydownListeners.clear();
  vi.unstubAllGlobals();
});

function fireKeydown(opts: Partial<KeyboardEvent> & { key: string }) {
  // Synthetic KeyboardEvent — only the fields the hook reads matter.
  const event = {
    key: opts.key,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
  keydownListeners.forEach((cb) => cb(event));
  return event;
}

describe('useDebug — initial state', () => {
  it('starts with debug mode off, panel closed, no errors', () => {
    const { result } = renderHook(() => useDebug());

    expect(result.current.isDebugMode).toBe(false);
    expect(result.current.isDebugPanelOpen).toBe(false);
    expect(result.current.errors).toEqual([]);
    expect(result.current.hasRecentErrors).toBe(false);
  });

  it('reflects globalErrorHandler.getDebugMode() on mount', () => {
    handlerState.debugMode = true;
    const { result } = renderHook(() => useDebug());
    expect(result.current.isDebugMode).toBe(true);
  });

  it('exposes the keyboard shortcuts table', () => {
    const { result } = renderHook(() => useDebug());
    expect(result.current.shortcuts).toEqual({
      togglePanel: 'Ctrl+Shift+D',
      toggleMode: 'Ctrl+Shift+E',
      closePanel: 'Escape',
    });
  });
});

describe('useDebug — toggleDebugMode', () => {
  it('flips local state AND calls globalErrorHandler.setDebugMode', () => {
    const { result } = renderHook(() => useDebug());
    expect(result.current.isDebugMode).toBe(false);

    act(() => {
      result.current.toggleDebugMode();
    });

    expect(result.current.isDebugMode).toBe(true);
    expect(handlerState.debugMode).toBe(true);
  });

  it('toggles back off on second call', () => {
    const { result } = renderHook(() => useDebug());

    act(() => {
      result.current.toggleDebugMode();
    });
    act(() => {
      result.current.toggleDebugMode();
    });

    expect(result.current.isDebugMode).toBe(false);
    expect(handlerState.debugMode).toBe(false);
  });
});

describe('useDebug — debug panel', () => {
  it('openDebugPanel + closeDebugPanel control panel state', () => {
    const { result } = renderHook(() => useDebug());

    act(() => {
      result.current.openDebugPanel();
    });
    expect(result.current.isDebugPanelOpen).toBe(true);

    act(() => {
      result.current.closeDebugPanel();
    });
    expect(result.current.isDebugPanelOpen).toBe(false);
  });
});

describe('useDebug — keyboard shortcuts', () => {
  it('Ctrl+Shift+D toggles the debug panel', () => {
    const { result } = renderHook(() => useDebug());

    act(() => {
      fireKeydown({ key: 'D', ctrlKey: true, shiftKey: true });
    });
    expect(result.current.isDebugPanelOpen).toBe(true);

    act(() => {
      fireKeydown({ key: 'D', ctrlKey: true, shiftKey: true });
    });
    expect(result.current.isDebugPanelOpen).toBe(false);
  });

  it('Cmd+Shift+D also toggles the panel (mac path)', () => {
    const { result } = renderHook(() => useDebug());

    act(() => {
      fireKeydown({ key: 'D', metaKey: true, shiftKey: true });
    });
    expect(result.current.isDebugPanelOpen).toBe(true);
  });

  it('Ctrl+Shift+E toggles debug mode', () => {
    const { result } = renderHook(() => useDebug());

    act(() => {
      fireKeydown({ key: 'E', ctrlKey: true, shiftKey: true });
    });
    expect(result.current.isDebugMode).toBe(true);
  });

  it('Escape closes the panel ONLY when it is open', () => {
    const { result } = renderHook(() => useDebug());

    // Escape with closed panel: no-op.
    act(() => {
      fireKeydown({ key: 'Escape' });
    });
    expect(result.current.isDebugPanelOpen).toBe(false);

    // Open then escape closes.
    act(() => {
      result.current.openDebugPanel();
    });
    act(() => {
      fireKeydown({ key: 'Escape' });
    });
    expect(result.current.isDebugPanelOpen).toBe(false);
  });

  it('non-shortcut keys are ignored', () => {
    const { result } = renderHook(() => useDebug());

    act(() => {
      fireKeydown({ key: 'A', ctrlKey: true });
    });

    expect(result.current.isDebugPanelOpen).toBe(false);
    expect(result.current.isDebugMode).toBe(false);
  });
});

describe('useDebug — error tracking', () => {
  it('subscribes to globalErrorHandler and reflects pre-existing errors on mount', () => {
    handlerState.errors = [
      {
        type: 'test',
        level: 'error',
        timestamp: new Date().toISOString(),
        error: 'pre-existing',
      },
    ];

    const { result } = renderHook(() => useDebug());
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.hasRecentErrors).toBe(true);
  });

  it('clearErrors empties the list locally + on the handler', () => {
    handlerState.errors = [
      { type: 'test', level: 'error', timestamp: new Date().toISOString(), error: 'x' },
    ];

    const { result } = renderHook(() => useDebug());
    expect(result.current.errors).toHaveLength(1);

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.errors).toEqual([]);
    expect(handlerState.errors).toEqual([]);
  });

  it('trackCustomError funnels through globalErrorHandler.track with type=custom', () => {
    const { result } = renderHook(() => useDebug());

    act(() => {
      result.current.trackCustomError('boom', 'unit-test');
    });

    expect(handlerState.errors).toHaveLength(1);
    expect(handlerState.errors[0].type).toBe('custom');
    expect(handlerState.errors[0].error).toBe('boom');
  });
});

describe('useDebug — getSystemHealth', () => {
  it('reports healthy when no recent + no critical errors', () => {
    const { result } = renderHook(() => useDebug());

    const health = result.current.getSystemHealth();
    expect(health.isHealthy).toBe(true);
    expect(health.errorCount).toBe(0);
    expect(health.recentErrorCount).toBe(0);
    expect(health.lastError).toBeNull();
  });

  it('reports unhealthy when 5+ errors of level=error are present', () => {
    handlerState.errors = Array.from({ length: 5 }, (_, i) => ({
      type: 'test',
      level: 'error',
      timestamp: new Date().toISOString(),
      error: `e${i}`,
    }));

    const { result } = renderHook(() => useDebug());
    const health = result.current.getSystemHealth();
    expect(health.isHealthy).toBe(false);
    expect(health.criticalErrorCount).toBe(5);
  });
});

describe('useDebug — cleanup', () => {
  it('removes the keydown listener on unmount', () => {
    const { unmount } = renderHook(() => useDebug());
    expect(keydownListeners.size).toBe(1);

    unmount();
    expect(keydownListeners.size).toBe(0);
  });

  it('unsubscribes from the error handler on unmount', () => {
    const { unmount } = renderHook(() => useDebug());
    expect(handlerState.listeners.length).toBe(1);

    unmount();
    expect(handlerState.listeners.length).toBe(0);
  });
});
