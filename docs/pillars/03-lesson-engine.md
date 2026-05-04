---
title: Pillar 3 — Lesson engine
updated: 2026-05-04
status: current
domain: technical
---

# Pillar 3 — Lesson engine

> Lessons are JSON. The schema is Zod. The catalog is gated by prerequisites and resumes per-step.

## Schema

`src/types/schema.ts` is the source of truth. Every entity that crosses an external boundary (network JSON, localStorage, postMessage) is a Zod schema; the TS type is `z.infer<typeof Schema>` so the runtime validator and the compile-time type can never drift.

Top-level entities:

| Schema | Where it's used |
|--------|-----------------|
| `LessonSchema` | `public/api/static/lessons.json` content |
| `UserProgressSchema` | localStorage record per `(userId, lessonId)` |
| `UserSchema` | localStorage user record |
| `ProjectSchema` | localStorage record for editor-built games |

A lesson:

```json
{
  "id": "lesson-3",
  "title": "Conditionals",
  "description": "Make decisions in code with if / elif / else",
  "order": 3,
  "intro": "Programs make choices...",
  "learningObjectives": ["Write if statements", "Compare numbers...", "Branch with else"],
  "goalDescription": "Print whether a number is positive or negative.",
  "previewCode": "n = -3\nif n > 0:\n    print('positive')\nelse:\n    print('not positive')",
  "content": {
    "introduction": "if runs the code under it only when the condition is True.",
    "steps": [
      {
        "id": "lesson-3-step-1",
        "title": "Pick the bigger number",
        "description": "Set a and b to numbers; print the bigger one.",
        "initialCode": "a = 8\nb = 12\n# Print the bigger one\n",
        "solution": "if a > b:\n    print(a)\nelse:\n    print(b)",
        "hints": ["if a > b: starts a conditional", "Indent the line", "Add else: for the other case"],
        "tests": [...]
      }
    ]
  },
  "prerequisites": ["lesson-2"],
  "difficulty": "Beginner",
  "estimatedTime": 12
}
```

`tests[]` is the grading contract — see [Pillar 4 — Grading](04-grading.md).

## Loader

`src/lessons/loader.ts` exposes `loadLessons(): Promise<Lesson[]>`. It:

1. Fetches `${BASE_URL}/api/static/lessons.json`.
2. Parses with `LessonSchema.array().safeParse(...)`.
3. On schema failure, throws an Error listing field paths from the first 5 issues — bad lesson JSON fails loudly instead of silently rendering broken steps.
4. Caches the resolved promise for the page lifetime; on failure, the cache is dropped so the next caller can retry.

## Hooks

`src/lessons/use-lessons.ts`:

| Hook | Returns |
|------|---------|
| `useLessons()` | TanStack Query of the full catalog. `staleTime: Infinity` because the catalog is static. |
| `useSequencedLessons(progress)` | Catalog + progress → `{unlocked, locked}` partition |

## Sequencing

`src/lessons/sequence.ts`:

```ts
sequenceLessons(lessons, progress): { unlocked: Lesson[], locked: { lesson, missing }[] }
```

A lesson is **unlocked** when every id in its `prerequisites` array maps to a `UserProgress` record with `completed: true`. Lessons returned in `order` ascending. Unknown prereq ids (an authoring mistake) keep a lesson locked even if the missing reference can't be displayed — the `tests/unit/lessons-content.test.ts` invariant catches this case at CI time.

## Resume (per-step)

`UserProgress.currentStep` is written every time the student advances; `app/pages/lesson.tsx` reads it on mount and seeks the editor + step indicator there. Reload at step 3 → opens at step 3.

`ClientStorage` (`src/storage/client.ts`) keys progress by `(userId, lessonId)` in localStorage. The current SPA uses a fixed `userId` of `local-user` — multi-user mode is out of scope until a name-the-pilot UI ships, at which point only the constant changes.

Integration tests in `tests/integration/lesson-progress.test.ts` cover the round-trip: persist → fresh ClientStorage → restored.

## Authoring workflow

1. Edit `public/api/static/lessons.json` directly. (No CMS yet.)
2. Run `npm run test:unit` — `tests/unit/schema.test.ts` parses the file and reports any field-path errors. `tests/unit/lessons-content.test.ts` enforces structural invariants (≥3 hints per step, every prereq resolves, every step has at least one test, etc.).
3. Run `npm run dev` and walk the lesson in the browser to confirm the AST + runtime rules fire as intended.

## See also

- [Pillar 4 — Grading](04-grading.md) — how `tests[]` actually grades code
- `src/types/schema.ts` — canonical schema source
- `src/lessons/` — loader, sequencer, hooks (one barrel)
- `tests/unit/lessons-content.test.ts` — structural invariants
