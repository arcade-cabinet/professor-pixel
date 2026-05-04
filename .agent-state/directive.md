# Continuous Work Directive — professor-pixel

**Status:** ACTIVE
**Owner:** jbogaty

## What CONTINUOUS means
1. Never stop for status reports the user didn't ask for.
2. Never stop for scope caution.
3. Never stop to summarize — git log is the summary.
4. Never stop for context pressure — task-batch + PreCompact handle it.
5. Never stop because a task feels big — pick the next atomic commit.
6. Only stop on: explicit user halt, red CI blocking, or genuine STOP_FAIL.

## Operating loop
while queue has [ ] items: implement → verify → commit → dispatch reviewers → mark [x] → next.

## Forbidden phrases
"deferred" | "v2+" | "out of scope" | "future work" | "tracked separately" | "follow-up"
"TODO" | "FIXME" | "stub" | "placeholder" | "mock for now"

## Batch — foundations-pillar-completion (batch-20260504-140912)

Source: docs/plans/foundations-pillar-completion.prq.md (sha256: c012ff1af2987625749b13e2a5d40e88f5fde4109f45d00cd75ca65ccadd2e84)
Started: 2026-05-04T19:09:12Z
Branch: feat/foundations-pillar-completion

### Pillar 2 — Pyodide runtime

- [x] T2.1 Singleton Pyodide bootstrap — `src/python/pyodide-singleton.ts` exports `getPyodide()`; runner.tsx + pygame-preview.tsx call it; no script-tag injection
- [x] T2.2 Wire Pyodide into lesson page — replace `null` stubs in `app/pages/lesson.tsx`; Run/Check live; component test passes
- [x] T2.3 Vendor Pyodide locally + version bump — `pyodide` dep, postinstall to `public/pyodide/`, no CDN refs, boots offline
- [x] T2.4 Move Pyodide into Web Worker — `src/python/worker.ts` + Comlink; `while True:` rejects within timeout; UI stays responsive

### Pillar 4 — Lesson engine

- [x] T4.1 Zod-ify schema — `src/types/schema.ts` Zod throughout; `LessonSchema.parse` validates `lessons.json`; ZodError surfaced
- [x] T4.2 Lesson loader + prerequisite gating — `src/lessons/loader.ts` + `sequence.ts`; home page renders unlocked/locked
- [x] T4.3 Step-level resume — read/write `UserProgress.currentStep`; reload at step 3 → opens step 3
- [x] T4.4 Author 6 lessons — `lessons.json` rewrite; lessons 1-6; integration test runs each solution → score 1.0

### Pillar 5 — AST-based feedback

- [x] T5.1 Expand AST rule vocabulary — `imports_module`, `defines_class`, `calls_method`, `parameter_count`, `nesting_depth`, `not_uses`
- [x] T5.2 Partial credit + structural diff — `GradeResult.score`, `partial`, `diffSolution`; UI renders score per rule
- [x] T5.3 Resource caps in runtime tests — `timeoutMs`, `maxStdout`; runaway loop fails fast, worker recycled

### Pillar 0 — Docs restructure (frontmatter-headed pillars)

- [ ] TD.1 `docs/README.md` index — frontmatter + table mapping pillar → file
- [ ] TD.2 `docs/pillars/01-frontend.md` — TS/React/Vite/aliases/build pipeline
- [ ] TD.3 `docs/pillars/02-runtime.md` — Pyodide loader/Worker/Comlink/simulator + sequence diagram
- [ ] TD.4 `docs/pillars/03-lesson-engine.md` — Zod schema, authoring workflow, sequencing, resume
- [ ] TD.5 `docs/pillars/04-grading.md` — every rule kind documented with examples + common mistakes
- [ ] TD.6 `docs/pillars/05-design-system.md` — tokens/voice/components carved out of DESIGN.md
- [ ] TD.7 Rewrite `docs/ARCHITECTURE.md` — cross-pillar boundaries only, ~80 lines
- [ ] TD.8 Update `docs/STATE.md` — R-phases → Done; this PR's work in Active; refresh Next
- [ ] TD.9 Update `STANDARDS.md` + `AGENTS.md` — cross-refs to pillar files; verify no broken links

### CI

- [ ] TC.1 Make integration + component tests blocking — drop `continue-on-error` from those vitest matrix entries; PR CI green with new gates
