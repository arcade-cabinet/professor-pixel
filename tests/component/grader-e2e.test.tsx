/**
 * Grader end-to-end coverage. Runs each lesson's `solution` source through
 * the worker runner and asserts the engine returns score === 1.0.
 *
 * The unit tests catch authoring mistakes in lessons.json (every step has
 * tests, every prereq resolves, etc.); this test catches *grader regressions*
 * — a code change that subtly breaks the AST or runtime validators against
 * the canonical solutions students will submit.
 *
 * Browser-mode because we need a real Pyodide. Lives in the component
 * project, not e2e, because the seam under test is the runtime+grader
 * pair, not the page UI.
 */
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { gradeCode } from '@lib/grading';
import type { GradingContext } from '@lib/grading';
import { getPyodide } from '@lib/python/pyodide-singleton';
import { getWorkerRunner } from '@lib/python/worker-runner';
import { LessonSchema } from '@lib/types/schema';

describe('Grader e2e — every lesson solution scores 1.0', () => {
  it('grades all canonical solutions to a perfect score', async () => {
    // Boot once for the whole test run — both Pyodide instances are page-singletons.
    const runner = getWorkerRunner();
    const [pyodide] = await Promise.all([getPyodide(), runner.ready()]);

    // Load lessons directly (not via loader's TanStack Query plumbing).
    const response = await fetch(`${import.meta.env.BASE_URL || '/'}api/static/lessons.json`);
    expect(response.ok).toBe(true);
    const raw = (await response.json()) as unknown;
    const lessons = LessonSchema.array().parse(raw);
    expect(lessons.length).toBeGreaterThan(0);

    const failures: string[] = [];

    for (const lesson of lessons) {
      for (const step of lesson.content.steps) {
        const ctx: GradingContext = {
          code: step.solution,
          step,
          runner,
          pyodide,
        };
        const result = await gradeCode(ctx);
        if (result.score < 1.0 || !result.passed) {
          failures.push(
            `${lesson.id}/${step.id}: score=${result.score.toFixed(2)} passed=${result.passed} feedback=${result.feedback.slice(0, 200)}`
          );
        }
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `Grader regression — ${failures.length} step(s) didn't score 1.0:\n` + failures.join('\n')
      );
    }
  }, 90_000);
});
