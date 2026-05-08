// Cover two single-branch gaps in unrelated files:
//   - src/grading/ast.ts:29  — empty-rules early-return (returns [])
//                              when pyodide is set but all three rules
//                              arrays are empty
//   - src/net/retry.ts:228   — apiCallWithRetry throw of result.error
//                              when withRetry returns !success after
//                              fetch keeps rejecting

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { validateAst } from '@lib/grading/ast';
import { apiCallWithRetry } from '@lib/net/retry';
import type { AstRules } from '@lib/grading/types';

interface FakePyodide {
  runPython: (src: string) => unknown;
  globals: { set: (k: string, v: unknown) => void };
}

describe('validateAst — empty-rules early-return (line 29)', () => {
  it('returns [] when pyodide is set but every rules array is empty', async () => {
    const pyodide: FakePyodide = {
      runPython: vi.fn(),
      globals: { set: vi.fn() },
    };
    const emptyRules: AstRules = {
      requiredFunctions: [],
      requiredConstructs: [],
      forbiddenConstructs: [],
    };
    const result = await validateAst('# anything', emptyRules, pyodide as never);
    expect(result).toEqual([]);
    // Confirm we hit the early-return: runPython was never called.
    expect(pyodide.runPython).not.toHaveBeenCalled();
  });
});

describe('apiCallWithRetry — throws result.error after exhaustion (line 228)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects with the wrapped error when fetch keeps rejecting', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('network down')
    );
    await expect(
      apiCallWithRetry('https://example.invalid/x', undefined, {
        maxAttempts: 1,
        baseDelay: 0,
        maxDelay: 0,
      })
    ).rejects.toThrow();
    expect(fetchSpy).toHaveBeenCalled();
  });
});
