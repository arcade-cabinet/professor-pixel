// Cover the TestSpec superRefine validator in src/types/schema.ts
// (line 95-100): a test with mode='rules' but neither astRules nor
// runtimeRules set must be rejected with a custom issue. Without this
// check, the engine silently falls back to output-mode evaluation
// and the lesson author's rule contract is ignored.

import { describe, expect, it } from 'vitest';
import { LessonSchema } from '@lib/types/schema';

const baseLesson = (testSpec: unknown) => ({
  id: 'l1',
  title: 't',
  description: 'd',
  order: 0,
  content: {
    introduction: 'i',
    steps: [
      {
        id: 's1',
        title: 'st',
        description: 'sd',
        initialCode: '',
        solution: '',
        hints: [],
        tests: [testSpec],
      },
    ],
  },
});

describe('TestSpec superRefine — mode "rules" without rules (line 95)', () => {
  it("rejects a test with mode: 'rules' but no astRules and no runtimeRules", () => {
    const lesson = baseLesson({ expectedOutput: 'hi', mode: 'rules' });
    const result = LessonSchema.safeParse(lesson);
    expect(result.success).toBe(false);
    if (!result.success) {
      // The custom issue's message pins the wording so future refactors
      // that drop the helpful guidance in favor of a generic
      // "validation failed" surface as a test diff.
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("'rules' requires astRules"))).toBe(true);
    }
  });

  it("accepts mode: 'rules' when astRules is supplied", () => {
    const lesson = baseLesson({
      expectedOutput: 'hi',
      mode: 'rules',
      astRules: { requiredConstructs: [{ type: 'function_call' }] },
    });
    const result = LessonSchema.safeParse(lesson);
    expect(result.success).toBe(true);
  });

  it("accepts mode: 'rules' when runtimeRules is supplied", () => {
    const lesson = baseLesson({
      expectedOutput: 'hi',
      mode: 'rules',
      runtimeRules: { outputContains: ['hi'] },
    });
    const result = LessonSchema.safeParse(lesson);
    expect(result.success).toBe(true);
  });

  it('accepts a test without mode (default exact-output mode)', () => {
    const lesson = baseLesson({ expectedOutput: 'hi' });
    const result = LessonSchema.safeParse(lesson);
    expect(result.success).toBe(true);
  });
});
