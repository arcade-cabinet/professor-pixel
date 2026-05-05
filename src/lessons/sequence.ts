import type { Lesson, UserProgress } from '@lib/types/schema';

export interface LockedLesson {
  lesson: Lesson;
  /** The prerequisites that have not yet been completed. */
  missing: Lesson[];
}

export interface SequencedLessons {
  unlocked: Lesson[];
  locked: LockedLesson[];
}

/**
 * Given a lesson catalog and the user's progress, partition lessons into
 * unlocked (prerequisites met or none declared) and locked (with a list of
 * outstanding prereqs). Lessons are returned in `order` ascending.
 *
 * Lessons whose prereq references an id that doesn't exist in the catalog
 * are silently treated as missing — surfacing a UI error here would punish
 * students for an authoring mistake. The lessons-roundtrip test catches that
 * case at CI time.
 */
export function sequenceLessons(lessons: Lesson[], progress: UserProgress[]): SequencedLessons {
  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lessonId));
  const lessonById = new Map<string, Lesson>(lessons.map((l) => [l.id, l]));

  const unlocked: Lesson[] = [];
  const locked: LockedLesson[] = [];

  for (const lesson of [...lessons].sort((a, b) => a.order - b.order)) {
    const prereqs = lesson.prerequisites ?? [];
    const outstanding = prereqs.filter((id) => !completedIds.has(id));
    if (outstanding.length === 0) {
      unlocked.push(lesson);
      continue;
    }
    // Resolve known prereqs to Lesson objects for UI display. Unknown ids
    // still keep the lesson locked, even if they can't be displayed.
    const missing = outstanding
      .map((id) => lessonById.get(id))
      .filter((l): l is Lesson => l !== undefined);
    locked.push({ lesson, missing });
  }

  return { unlocked, locked };
}
