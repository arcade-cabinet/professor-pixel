import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LessonSchema, type Lesson } from '@lib/types/schema';

function loadShippedLessons(): Lesson[] {
  const path = resolve(__dirname, '..', '..', 'public/api/static/lessons.json');
  const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  return LessonSchema.array().parse(raw);
}

describe('shipped lessons.json', () => {
  const lessons = loadShippedLessons();

  it('contains at least 6 lessons', () => {
    expect(lessons.length).toBeGreaterThanOrEqual(6);
  });

  it('every lesson has a unique id', () => {
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every prerequisite resolves to a real lesson id', () => {
    const ids = new Set(lessons.map((l) => l.id));
    for (const lesson of lessons) {
      for (const prereq of lesson.prerequisites ?? []) {
        expect(ids.has(prereq), `${lesson.id} → ${prereq}`).toBe(true);
      }
    }
  });

  it('every step has a non-empty solution', () => {
    for (const lesson of lessons) {
      for (const step of lesson.content.steps) {
        expect(step.solution.trim().length, `${lesson.id}/${step.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('every step has at least 3 hints', () => {
    for (const lesson of lessons) {
      for (const step of lesson.content.steps) {
        expect(step.hints.length, `${lesson.id}/${step.id} hints`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('every step has at least one test', () => {
    for (const lesson of lessons) {
      for (const step of lesson.content.steps) {
        expect((step.tests ?? []).length, `${lesson.id}/${step.id} tests`).toBeGreaterThan(0);
      }
    }
  });

  it('lessons span multiple AST rule kinds', () => {
    const seenKinds = new Set<string>();
    for (const lesson of lessons) {
      for (const step of lesson.content.steps) {
        for (const test of step.tests ?? []) {
          for (const rc of test.astRules?.requiredConstructs ?? []) {
            seenKinds.add(rc.type);
          }
        }
      }
    }
    // Curriculum should exercise variety: print/string + control flow + functions + pygame
    expect(seenKinds.has('function_call')).toBe(true);
    expect(seenKinds.has('if_statement')).toBe(true);
    expect(seenKinds.has('loop')).toBe(true);
    expect(seenKinds.has('imports_module')).toBe(true);
    expect(seenKinds.has('parameter_count')).toBe(true);
    expect(seenKinds.has('calls_method')).toBe(true);
  });

  it('order values are strictly increasing across the catalog', () => {
    const orders = lessons.map((l) => l.order).sort((a, b) => a - b);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThan(orders[i - 1]);
    }
  });
});
