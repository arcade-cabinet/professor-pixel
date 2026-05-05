import { describe, expect, it } from 'vitest';
import { statusFor } from '@/pages/lessons';
import type { Lesson, UserProgress } from '@lib/types/schema';

function makeLesson(stepCount: number): Lesson {
  return {
    id: 'lesson-1',
    title: 'Test Lesson',
    description: 'desc',
    pixelIntroduction: 'intro',
    icon: 'Sparkles',
    color: 'purple',
    objectives: [],
    content: {
      steps: Array.from({ length: stepCount }, (_, i) => ({
        title: `step ${i}`,
        instruction: `do ${i}`,
        initialCode: '',
        solution: '',
        hint: '',
        validationRules: [],
      })),
    },
    order: 1,
  } as unknown as Lesson;
}

function makeProgress(currentStep: number, completed = false): UserProgress {
  return {
    id: 'p1',
    userId: 'u1',
    lessonId: 'lesson-1',
    currentStep,
    completed,
  };
}

describe('statusFor', () => {
  it('returns not-started when no progress exists', () => {
    expect(statusFor(makeLesson(5), undefined)).toEqual({ state: 'not-started', pct: 0 });
  });

  it('returns completed at 100% when progress.completed is true', () => {
    expect(statusFor(makeLesson(5), makeProgress(2, true))).toEqual({
      state: 'completed',
      pct: 100,
    });
  });

  it('reports in-progress percentage rounded to integer', () => {
    expect(statusFor(makeLesson(4), makeProgress(1))).toEqual({
      state: 'in-progress',
      pct: 25,
    });
    expect(statusFor(makeLesson(3), makeProgress(2))).toEqual({
      state: 'in-progress',
      pct: 67,
    });
  });

  it('handles zero-step lessons safely (no division by zero)', () => {
    expect(statusFor(makeLesson(0), makeProgress(0))).toEqual({
      state: 'in-progress',
      pct: 0,
    });
  });
});
