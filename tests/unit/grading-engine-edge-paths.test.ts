// Cover the engine.ts branches the existing grading-engine.test.ts skips:
//   - line 73: throw err (non-PythonTimeoutError rethrow from the runner)
//   - line 157: maxStdout dual-set Math.min reassignment
//   - lines 197-198: buildFeedback exact-mode failed branch
//     ("Output didn't match expected: ...")

import { describe, expect, it } from 'vitest';
import { gradeCode } from '@lib/grading/engine';
import type { GradingContext } from '@lib/grading/types';
import type { LessonStep } from '@lib/types/schema';

describe('gradeCode — engine edge paths', () => {
  it('rethrows a non-PythonTimeoutError from the runner (line 73)', async () => {
    const angryRunner = {
      runSnippet: async () => {
        throw new Error('runner imploded');
      },
    };
    const step: LessonStep = {
      id: 's1',
      title: 'x',
      description: '',
      initialCode: '',
      solution: '',
      hints: [],
      tests: [{ expectedOutput: 'whatever' }],
    };
    const context: GradingContext = {
      code: 'print(1)',
      step,
      runner: angryRunner,
      pyodide: null,
    };
    await expect(gradeCode(context)).rejects.toThrow(/runner imploded/);
  });

  it('collectStepCaps reduces multi-test maxStdout via Math.min (line 157)', async () => {
    let captured: { maxStdout?: number } | null = null;
    const captureRunner = {
      runSnippet: async (opts: {
        code: string;
        input?: string;
        maxStdout?: number;
        timeoutMs?: number;
      }) => {
        captured = { maxStdout: opts.maxStdout };
        return {
          output: 'hi\n',
          error: null,
          inputCalls: 0,
          functionCalls: {},
          globals: {},
        };
      },
    };
    const step: LessonStep = {
      id: 's1',
      title: 'x',
      description: '',
      initialCode: '',
      solution: '',
      hints: [],
      tests: [
        {
          expectedOutput: 'hi',
          mode: 'rules',
          maxStdout: 5000,
          runtimeRules: { outputContains: ['hi'] },
        },
        {
          expectedOutput: 'hi',
          mode: 'rules',
          maxStdout: 1000,
          runtimeRules: { outputContains: ['hi'] },
        },
      ],
    };
    const context: GradingContext = {
      code: "print('hi')",
      step,
      runner: captureRunner,
      pyodide: null,
    };
    await gradeCode(context);
    expect(captured).not.toBeNull();
    // Two tests with maxStdout 5000 and 1000 → min reduces to 1000.
    expect(captured!.maxStdout).toBe(1000);
  });

  it('buildFeedback reports exact-mode mismatch when an exact test fails (lines 197-198)', async () => {
    // Mix of one rule-mode test (drives the rules section into failed state)
    // + one exact-mode test that fails so exactFailed > 0 → the
    // "Output didn't match expected" line fires.
    const stubRunner = {
      runSnippet: async () => ({
        output: 'wrong\n',
        error: null,
        inputCalls: 0,
        functionCalls: {},
        globals: {},
      }),
    };
    const step: LessonStep = {
      id: 's1',
      title: 'x',
      description: '',
      initialCode: '',
      solution: '',
      hints: [],
      tests: [
        {
          // Failing rule so passed=false and the "address the items below" branch fires.
          expectedOutput: 'hi',
          mode: 'rules',
          runtimeRules: { outputContains: ['hi'] },
        },
        {
          // Exact-mode test (no `mode` field, defaults to exact) that fails.
          expectedOutput: 'hi',
        },
      ],
    };
    const context: GradingContext = {
      code: "print('wrong')",
      step,
      runner: stubRunner,
      pyodide: null,
    };
    const result = await gradeCode(context);
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("Output didn't match expected");
    expect(result.feedback).toContain('hi');
  });
});
