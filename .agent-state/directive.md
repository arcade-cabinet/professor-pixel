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

### Pillar 3 — Lesson engine

- [x] T4.1 Zod-ify schema — `src/types/schema.ts` Zod throughout; `LessonSchema.parse` validates `lessons.json`; ZodError surfaced
- [x] T4.2 Lesson loader + prerequisite gating — `src/lessons/loader.ts` + `sequence.ts`; home page renders unlocked/locked
- [x] T4.3 Step-level resume — read/write `UserProgress.currentStep`; reload at step 3 → opens step 3
- [x] T4.4 Author 6 lessons — `lessons.json` rewrite; lessons 1-6; integration test runs each solution → score 1.0

### Pillar 4 — Grading (AST-based feedback)

- [x] T5.1 Expand AST rule vocabulary — `imports_module`, `defines_class`, `calls_method`, `parameter_count`, `nesting_depth`, `not_uses`
- [x] T5.2 Partial credit + structural diff — `GradeResult.score`, `partial`, `diffSolution`; UI renders score per rule
- [x] T5.3 Resource caps in runtime tests — `timeoutMs`, `maxStdout`; runaway loop fails fast, worker recycled

### Pillar 0 — Docs restructure (frontmatter-headed pillars)

- [x] TD.1 `docs/README.md` index — frontmatter + table mapping pillar → file
- [x] TD.2 `docs/pillars/01-frontend.md` — TS/React/Vite/aliases/build pipeline
- [x] TD.3 `docs/pillars/02-runtime.md` — Pyodide loader/Worker/Comlink/simulator + sequence diagram
- [x] TD.4 `docs/pillars/03-lesson-engine.md` — Zod schema, authoring workflow, sequencing, resume
- [x] TD.5 `docs/pillars/04-grading.md` — every rule kind documented with examples + common mistakes
- [x] TD.6 `docs/pillars/05-design-system.md` — tokens/voice/components carved out of DESIGN.md
- [x] TD.7 Rewrite `docs/ARCHITECTURE.md` — cross-pillar boundaries only, ~80 lines
- [x] TD.8 Update `docs/STATE.md` — R-phases → Done; this PR's work in Active; refresh Next
- [x] TD.9 Update `STANDARDS.md` + `AGENTS.md` — cross-refs to pillar files; verify no broken links

### CI

- [x] TC.1 Make integration tests blocking; component remains advisory pending wizard-layout repair (see STATE.md Next)

## Batch — stabilization-pillar (batch-20260504-160227)

Source: docs/plans/stabilization-pillar.prq.md (sha256: bb22562bdb395b8f1a31d47a391470be9b0d05191d06e6a74bfb072b96eaab04)
Started: 2026-05-04T20:02:27Z
Branch: feat/stabilization-pillar

- [x] S1 Restore page banner — top-level `<header>` rendered on all viewports; `responsive-wizard.test.tsx` passes
- [x] S2 Flip component CI to blocking — drop `continue-on-error` from the component step in `.github/workflows/ci.yml`; PR CI green
- [x] S3 Unify or document the pygame-component type seam — `src/pygame/components/types.ts` vs `system-types.ts`; `npm run check` clean
- [x] S4 Grader e2e via worker — new `tests/component/grader-e2e.test.tsx` runs each lesson's `solution` through the worker, asserts `score === 1.0` for every step
- [x] SD.1 Update `docs/STATE.md` — move stabilized items from Next → Done; refresh; queue `no-explicit-any` cleanup as a separate PRQ at 209-instance impact

## Batch — modernization-pillar (batch-20260504-193000)

Source: docs/plans/modernization-pillar.prq.md (sha256: 98b175231f3d92f9872f21d62752889eac7667b3b6496b006a768c828f2df1f1)
Started: 2026-05-04T19:30:00Z
Branch: feat/modernization-pillar

### M1 — Toolchain modernization

- [x] M1.1 pnpm 10 replaces npm — `packageManager` set, `pnpm-lock.yaml` committed, `package-lock.json` deleted, GitHub Actions use `pnpm/action-setup@v4` + `corepack enable`, `pnpm install --frozen-lockfile` is CI install
- [x] M1.2 TypeScript 6.x bump — `pnpm check` clean, deprecated compiler options dropped, Pyodide ambient still resolves
- [x] M1.3 Vite 8 + Vitest 4 + @vitest/browser 4 — all dev/build/test scripts green, Pyodide worker import still works
- [ ] M1.4 React 19 — `react`/`react-dom` at ^19.x, no deprecation warnings, forwardRef migrations applied
- [ ] M1.5 Biome 2.4 replaces ESLint+Prettier — `biome.json` configured with `noExplicitAny: error`, eslint/prettier devDeps removed, CI uses `biome check`

### M2 — Type / schema / test config cleanup

- [ ] M2.1 Fix the 209 `any`s — `pnpm biome check .` clean with `noExplicitAny: error`; net deletions, no shims
- [ ] M2.2 Re-enable Vitest coverage thresholds — 90/85/90/90; lcov reporter for CI artifact upload
- [ ] M2.3 Wizard-dialogue integration tests refresh — rewrite or replace `wizard-dialogue-engine.test.tsx`; remove exclude

### M3 — Visual + accessibility baseline

- [ ] M3.1 Playwright visual-regression baseline — `tests/e2e/visual.spec.ts` per route × viewport; CI artifact diff
- [ ] M3.2 `@axe-core/playwright` checks — `tests/e2e/a11y.spec.ts` zero WCAG 2.2 AA violations on major routes

### M4 — Pyodide / PyGame correctness

- [ ] M4.1 Cold-start budget — perf timer on `getPyodide()`; budget documented in `docs/pillars/02-runtime.md`; dev HUD overlay
- [ ] M4.2 Frame-rate test — simulator with realistic component count holds <16.67ms mean frame time over 2s
- [ ] M4.3 Worker-side stdout truncation — enforce `maxStdout` in worker stdout callback; `clipResult` becomes verification

### M5 — Grader instrumentation

- [ ] M5.1 Real `functionCalled` instrumentation — worker `runWithCallTracking` API; engine uses real counts
- [ ] M5.2 Real `acceptsUserInput` instrumentation — count `input()` invocations in worker; engine asserts count > 0

### M6 — Content + STATE.md

- [ ] M6.1 Three new lessons — lesson-7 (lists), lesson-8 (files), lesson-9 (classes); grader-e2e green for each
- [ ] M6.2 STATE.md final pass — move all M-tasks Active → Done; trim Next; add per-game-type playtest follow-ups
