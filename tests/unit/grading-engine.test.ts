import { describe, expect, it } from 'vitest';
import { gradeCode } from '@lib/grading/engine';
import { PythonTimeoutError } from '@lib/python/worker-runner';
import type { GradingContext } from '@lib/grading/types';
import type { LessonStep } from '@lib/types/schema';

const stubRunner = {
  runSnippet: async ({ code }: { code: string; input?: string }) => {
    if (code.includes('boom'))
      return {
        output: '',
        error: 'NameError: boom',
        inputCalls: 0,
        functionCalls: {},
        globals: {},
      };
    if (code.includes('print'))
      return { output: 'hi\n', error: null, inputCalls: 0, functionCalls: {}, globals: {} };
    return { output: '', error: null, inputCalls: 0, functionCalls: {}, globals: {} };
  },
};

function ctx(step: LessonStep, code: string): GradingContext {
  return { code, step, runner: stubRunner, pyodide: null };
}

const exactStep: LessonStep = {
  id: 's1',
  title: 'exact',
  description: '',
  initialCode: '',
  solution: "print('hi')",
  hints: [],
  tests: [{ expectedOutput: 'hi' }],
};

const ruleStep: LessonStep = {
  id: 's2',
  title: 'rule',
  description: '',
  initialCode: '',
  solution: "print('hi')",
  hints: [],
  tests: [
    {
      expectedOutput: 'hi',
      mode: 'rules',
      runtimeRules: { outputContains: ['hi'] },
    },
  ],
};

describe('gradeCode', () => {
  it('passes exact-output match with score 1', async () => {
    const result = await gradeCode(ctx(exactStep, "print('hi')"));
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
    expect(result.feedback).toContain('Perfect');
  });

  it('returns score 0 + traceback when execution errors', async () => {
    const result = await gradeCode(ctx(exactStep, 'boom'));
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.feedback).toContain('NameError');
    expect(result.errors).toEqual(['NameError: boom']);
  });

  it('reports partial credit with score < 1 when some rules fail', async () => {
    const step: LessonStep = {
      ...ruleStep,
      tests: [
        {
          expectedOutput: '',
          mode: 'rules',
          runtimeRules: { outputContains: ['hi', 'missing'] },
        },
      ],
    };
    const result = await gradeCode(ctx(step, "print('hi')"));
    expect(result.passed).toBe(false);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
    expect(result.partial?.runtime).toHaveLength(2);
  });

  it('uses pre-execution result when provided to avoid double-run', async () => {
    const result = await gradeCode(ctx(exactStep, 'irrelevant'), {
      output: 'hi\n',
      error: null,
    });
    expect(result.passed).toBe(true);
  });

  it('returns score 1 + ok feedback when step has no tests', async () => {
    const stepNoTests: LessonStep = { ...exactStep, tests: undefined };
    const result = await gradeCode(ctx(stepNoTests, "print('hi')"));
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it('reports timeout failure when the runner throws PythonTimeoutError', async () => {
    const timeoutRunner = {
      runSnippet: async () => {
        throw new PythonTimeoutError(2000);
      },
    };
    const stepWithCap: LessonStep = {
      ...exactStep,
      tests: [
        {
          expectedOutput: '',
          mode: 'rules',
          timeoutMs: 2000,
          runtimeRules: { outputContains: ['x'] },
        },
      ],
    };
    const result = await gradeCode({
      code: 'while True: pass',
      step: stepWithCap,
      runner: timeoutRunner,
      pyodide: null,
    });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.feedback).toContain('too long');
    expect(result.errors?.[0]).toContain('2000');
  });

  it('passes the minimum step timeout to the runner', async () => {
    const calls: Array<{ timeoutMs?: number }> = [];
    const recordingRunner = {
      runSnippet: async (args: { code: string; timeoutMs?: number }) => {
        calls.push({ timeoutMs: args.timeoutMs });
        return { output: 'hi\n', error: null, inputCalls: 0, functionCalls: {}, globals: {} };
      },
    };
    const stepCaps: LessonStep = {
      ...exactStep,
      tests: [
        { expectedOutput: 'hi', mode: 'rules', timeoutMs: 5000 },
        { expectedOutput: 'hi', mode: 'rules', timeoutMs: 1000 },
      ],
    };
    await gradeCode({
      code: "print('hi')",
      step: stepCaps,
      runner: recordingRunner,
      pyodide: null,
    });
    expect(calls[0].timeoutMs).toBe(1000);
  });
});
