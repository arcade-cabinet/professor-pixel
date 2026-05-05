import { describe, expect, it } from 'vitest';
import { sequenceLessons } from '@lib/lessons/sequence';
import type { Lesson, UserProgress } from '@lib/types/schema';

function lesson(id: string, order: number, prerequisites: string[] = []): Lesson {
  return {
    id,
    title: id,
    description: '',
    order,
    prerequisites,
    content: {
      introduction: '',
      steps: [
        {
          id: `${id}-s1`,
          title: 's',
          description: '',
          initialCode: '',
          solution: '',
          hints: [],
        },
      ],
    },
  };
}

function progress(lessonId: string, completed: boolean): UserProgress {
  return {
    id: `pg-${lessonId}`,
    userId: 'u1',
    lessonId,
    currentStep: 0,
    completed,
  };
}

describe('sequenceLessons', () => {
  it('unlocks lessons with no prereqs', () => {
    const out = sequenceLessons([lesson('a', 1), lesson('b', 2)], []);
    expect(out.unlocked.map((l) => l.id)).toEqual(['a', 'b']);
    expect(out.locked).toEqual([]);
  });

  it('locks lessons whose prereq is incomplete', () => {
    const out = sequenceLessons([lesson('a', 1), lesson('b', 2, ['a'])], [progress('a', false)]);
    expect(out.unlocked.map((l) => l.id)).toEqual(['a']);
    expect(out.locked).toHaveLength(1);
    expect(out.locked[0].lesson.id).toBe('b');
    expect(out.locked[0].missing.map((l) => l.id)).toEqual(['a']);
  });

  it('unlocks once prereq is completed', () => {
    const out = sequenceLessons([lesson('a', 1), lesson('b', 2, ['a'])], [progress('a', true)]);
    expect(out.unlocked.map((l) => l.id)).toEqual(['a', 'b']);
    expect(out.locked).toEqual([]);
  });

  it('handles a chain of prereqs', () => {
    const lessons = [lesson('a', 1), lesson('b', 2, ['a']), lesson('c', 3, ['b'])];
    const out = sequenceLessons(lessons, [progress('a', true)]);
    expect(out.unlocked.map((l) => l.id)).toEqual(['a', 'b']);
    expect(out.locked.map((l) => l.lesson.id)).toEqual(['c']);
    expect(out.locked[0].missing.map((l) => l.id)).toEqual(['b']);
  });

  it('returns lessons in order ascending', () => {
    const out = sequenceLessons([lesson('z', 5), lesson('a', 1), lesson('m', 3)], []);
    expect(out.unlocked.map((l) => l.order)).toEqual([1, 3, 5]);
  });

  it('treats unknown prereq id as a missing prereq with no lesson reference', () => {
    const out = sequenceLessons(
      [lesson('a', 1, ['ghost'])], // 'ghost' does not exist in catalog
      []
    );
    // The locked entry has no resolved missing lesson (filtered to known catalog),
    // but the lesson is still locked because completedIds doesn't include 'ghost'.
    expect(out.unlocked).toEqual([]);
    expect(out.locked).toHaveLength(1);
    expect(out.locked[0].missing).toEqual([]);
  });
});
