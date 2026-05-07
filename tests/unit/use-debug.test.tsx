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
import { useComponentDebug, useDebug, usePerformanceMonitor } from '@lib/hooks/use-debug';

// Spies on the real jsdom window for the cleanup-assertion tests.
// Reset per test via afterEach. NOT stubGlobal — that would replace
// the implementation and disable React's internal event handling for
// the duration of the test.
let addSpy: ReturnType<typeof vi.spyOn>;
let removeSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  handlerState.debugMode = false;
  handlerState.errors = [];
  handlerState.listeners = [];

  addSpy = vi.spyOn(window, 'addEventListener');
  removeSpy = vi.spyOn(window, 'removeEventListener');
});

afterEach(() => {
  addSpy.mockRestore();
  removeSpy.mockRestore();
});

function fireKeydown(opts: Partial<KeyboardEventInit> & { key: string }) {
  // Real KeyboardEvent dispatched through the real jsdom window. The
  // hook's listener (registered via the actual addEventListener) will
  // receive it — same path as production. preventDefault is a real
  // method, no synthetic stub needed.
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    key: opts.key,
  });
  window.dispatchEvent(event);
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

    // The hook's effect adds exactly one keydown listener via the
    // real window.addEventListener. The spy captured the registration.
    const addedListener = addSpy.mock.calls.find((call: unknown[]) => call[0] === 'keydown')?.[1];
    expect(addedListener).toBeDefined();

    unmount();

    // The same listener function must be passed to removeEventListener
    // on cleanup — pin reference identity so a future bug that
    // accidentally creates a new closure on cleanup gets caught.
    const removedListener = removeSpy.mock.calls.find(
      (call: unknown[]) => call[0] === 'keydown'
    )?.[1];
    expect(removedListener).toBe(addedListener);
  });

  it('unsubscribes from the error handler on unmount', () => {
    const { unmount } = renderHook(() => useDebug());
    expect(handlerState.listeners.length).toBe(1);

    unmount();
    expect(handlerState.listeners.length).toBe(0);
  });
});

describe('usePerformanceMonitor', () => {
  it('starts with zeroed metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    expect(result.current.metrics.renderCount).toBe(0);
    expect(result.current.metrics.lastRenderTime).toBe(0);
    expect(result.current.metrics.averageRenderTime).toBe(0);
  });

  it('startRenderMeasure returns a numeric timestamp', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    const t = result.current.startRenderMeasure();
    expect(typeof t).toBe('number');
    expect(t).toBeGreaterThanOrEqual(0);
  });

  it('endRenderMeasure increments renderCount and updates lastRenderTime', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    let renderTime = 0;
    act(() => {
      const t = result.current.startRenderMeasure();
      renderTime = result.current.endRenderMeasure(t, 'TestComponent');
    });
    expect(typeof renderTime).toBe('number');
    expect(result.current.metrics.renderCount).toBe(1);
    expect(result.current.metrics.lastRenderTime).toBeGreaterThanOrEqual(0);
  });

  it('averageRenderTime tracks across multiple measurements', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    act(() => {
      result.current.endRenderMeasure(performance.now() - 10);
    });
    act(() => {
      result.current.endRenderMeasure(performance.now() - 20);
    });
    expect(result.current.metrics.renderCount).toBe(2);
    expect(result.current.metrics.averageRenderTime).toBeGreaterThanOrEqual(0);
  });

  it('logs a slow-render warning when debug mode + renderTime > 100ms', () => {
    handlerState.debugMode = true;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => usePerformanceMonitor());

    act(() => {
      // Fake 200ms slow render: pass startTime 200ms in the past.
      result.current.endRenderMeasure(performance.now() - 200, 'SlowComponent');
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Slow render detected.*SlowComponent/)
    );
    warnSpy.mockRestore();
  });

  it('does NOT warn for slow renders when debug mode is off', () => {
    handlerState.debugMode = false;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => usePerformanceMonitor());

    act(() => {
      result.current.endRenderMeasure(performance.now() - 200, 'SlowComponent');
    });

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  describe('measureAsync', () => {
    it('returns the result of the async function on success', async () => {
      const { result } = renderHook(() => usePerformanceMonitor());
      const value = await result.current.measureAsync(async () => 42, 'compute');
      expect(value).toBe(42);
    });

    it('rethrows the error from the async function on failure', async () => {
      const { result } = renderHook(() => usePerformanceMonitor());
      await expect(
        result.current.measureAsync(async () => {
          throw new Error('boom');
        }, 'crash')
      ).rejects.toThrow('boom');
    });

    it('logs duration when debug mode is on (success path)', async () => {
      handlerState.debugMode = true;
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const { result } = renderHook(() => usePerformanceMonitor());

      await result.current.measureAsync(async () => 1, 'op');
      expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/op completed in/));
      logSpy.mockRestore();
    });

    it('logs error message when debug mode is on (failure path)', async () => {
      handlerState.debugMode = true;
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => usePerformanceMonitor());

      await expect(
        result.current.measureAsync(async () => {
          throw new Error('x');
        }, 'op')
      ).rejects.toThrow();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/op failed after/),
        expect.any(Error)
      );
      errorSpy.mockRestore();
    });
  });
});

describe('useComponentDebug', () => {
  it('exposes logProps / logState / logEffect / isDebugMode', () => {
    const { result } = renderHook(() => useComponentDebug('TestComponent'));
    expect(typeof result.current.logProps).toBe('function');
    expect(typeof result.current.logState).toBe('function');
    expect(typeof result.current.logEffect).toBe('function');
    expect(result.current.isDebugMode).toBe(false);
  });

  it('logProps emits a console.group when debug mode is on', () => {
    handlerState.debugMode = true;
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const { result } = renderHook(() => useComponentDebug('Btn'));
    act(() => {
      result.current.logProps({ a: 1 });
    });

    expect(groupSpy).toHaveBeenCalledWith(expect.stringMatching(/Btn Props/));
    expect(logSpy).toHaveBeenCalledWith({ a: 1 });
    vi.restoreAllMocks();
  });

  it('logProps does NOT emit when debug mode is off', () => {
    handlerState.debugMode = false;
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

    const { result } = renderHook(() => useComponentDebug('Btn'));
    act(() => {
      result.current.logProps({ a: 1 });
    });

    expect(groupSpy).not.toHaveBeenCalled();
    groupSpy.mockRestore();
  });

  it('logState + logEffect both group under the component name', () => {
    handlerState.debugMode = true;
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const { result } = renderHook(() => useComponentDebug('Foo'));
    act(() => {
      result.current.logState({ count: 1 });
    });
    act(() => {
      result.current.logEffect('mounted', ['dep1']);
    });

    expect(groupSpy).toHaveBeenCalledWith(expect.stringMatching(/Foo State/));
    expect(groupSpy).toHaveBeenCalledWith(expect.stringMatching(/Foo Effect: mounted/));
    vi.restoreAllMocks();
  });
});
