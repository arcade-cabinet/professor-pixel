import { describe, expect, it } from 'vitest';
import { gradeCode } from '@lib/grading/engine';
import type { GradingContext } from '@lib/grading/types';
import type { LessonStep } from '@lib/types/schema';

const stubRunner = {
  runSnippet: async ({ code }: { code: string; input?: string }) => {
    if (code.includes('boom')) return { output: '', error: 'NameError: boom' };
    if (code.includes('print')) return { output: 'hi\n', error: null };
    return { output: '', error: null };
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
});
