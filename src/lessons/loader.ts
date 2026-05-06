import { LessonSchema, type Lesson } from '@lib/types/schema';
import { baseUrl } from '@lib/utils/base-url';

let cached: Promise<Lesson[]> | null = null;

/**
 * Lazily fetch + validate the lesson catalog. Cached for the page lifetime.
 * Call __resetLessonsForTests() to drop the cache between test cases.
 */
export function loadLessons(): Promise<Lesson[]> {
  if (cached) return cached;
  cached = (async () => {
    const response = await fetch(`${baseUrl}api/static/lessons.json`);
    if (!response.ok) {
      throw new Error(`lessons.json fetch failed: HTTP ${response.status} ${response.statusText}`);
    }
    const raw = (await response.json()) as unknown;
    const parsed = LessonSchema.array().safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new Error(`lessons.json failed schema validation — ${issues}`);
    }
    return parsed.data;
  })().catch((err) => {
    cached = null; // let the next caller retry instead of inheriting the failed promise
    throw err;
  });
  return cached;
}

export function __resetLessonsForTests(): void {
  cached = null;
}
