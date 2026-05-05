// Lesson progress derivation — converts a (Lesson, UserProgress?) pair into
// a UI-ready row state. Lives in src/lessons/ rather than the TSX page so the
// progress logic can be unit-tested + reused (e.g., a future "What should I
// learn next?" suggester needs the same not-started / in-progress / completed
// classification).

import type { Lesson, UserProgress } from '@lib/types/schema';

export interface LessonRowState {
  state: 'completed' | 'in-progress' | 'not-started';
  /** 0..100 — how far through the lesson's steps the kid has gotten. */
  pct: number;
}

export function statusFor(lesson: Lesson, progress: UserProgress | undefined): LessonRowState {
  if (!progress) return { state: 'not-started', pct: 0 };
  if (progress.completed) return { state: 'completed', pct: 100 };
  const total = lesson.content.steps.length;
  const pct = total > 0 ? Math.round((progress.currentStep / total) * 100) : 0;
  return { state: 'in-progress', pct };
}
