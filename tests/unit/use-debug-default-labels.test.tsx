// Cover the default-label fallback branches in src/hooks/use-debug.ts:
//   - line 173: `componentName || 'Unknown component'` (slow-render warn)
//   - line 189: `label || 'Async operation'` (measureAsync success log)
//   - line 198: `label || 'Async operation'` (measureAsync failure log)
//
// Existing use-debug.test.tsx always passes a non-empty label, so the
// `||` fallback arm stays uncovered. This suite invokes each path with
// no label/componentName so the fallback string surfaces in the log.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const handlerState = {
  debugMode: true,
  errors: [] as { type: string; level: string; timestamp: string; error: string }[],
  listeners: [] as Array<() => void>,
};

vi.mock('@lib/errors/global-handler', () => ({
  globalErrorHandler: {
    setDebugMode: (enabled: boolean) => {
      handlerState.debugMode = enabled;
    },
    getDebugMode: () => handlerState.debugMode,
    getRecentErrors: (limit: number) => handlerState.errors.slice(0, limit),
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
    track: vi.fn(),
    getErrorStats: () => ({ total: 0, byLevel: { error: 0 } }),
  },
}));

import { usePerformanceMonitor } from '@lib/hooks/use-debug';

beforeEach(() => {
  handlerState.debugMode = true;
  handlerState.errors = [];
  handlerState.listeners = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePerformanceMonitor — default-label fallbacks', () => {
  it('endRenderMeasure with no componentName logs "Unknown component" (line 173)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => usePerformanceMonitor());
    act(() => {
      result.current.endRenderMeasure(performance.now() - 200);
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Slow render detected.*Unknown component/)
    );
  });

  it('measureAsync success with no label logs "Async operation" (line 189)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { result } = renderHook(() => usePerformanceMonitor());
    await result.current.measureAsync(async () => 42);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Async operation completed in/));
  });

  it('measureAsync failure with no label logs "Async operation" (line 198)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePerformanceMonitor());
    await expect(
      result.current.measureAsync(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Async operation failed after/),
      expect.any(Error)
    );
  });
});
