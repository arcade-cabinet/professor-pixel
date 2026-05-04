---
title: Foundations Pillar Completion — One-PRQ Plan
updated: 2026-05-04
status: active
domain: planning
pr_target: feat/foundations-pillar-completion
---

# Foundations Pillar Completion

> One PR. Everything remaining from the strategic vision —
> *TypeScript frontend + Pyodide (WASM Python runtime) + sandboxed execution + lesson engine + AST‑based feedback* —
> plus a docs restructure that gives each pillar a proper frontmatter-headed home.
> No errata files. No follow-ups deferred to "v2."

## Strategic vision (the five pillars)

| # | Pillar | Status before this PR | Status after this PR |
|---|---|---|---|
| 1 | TypeScript frontend | ✅ solid (R1–R11 landed) | ✅ unchanged + documented |
| 2 | Pyodide (WASM Python runtime) | ⚠️ wired ad-hoc, lesson page stubbed `null` | ✅ singleton bootstrap, vendored, lesson page live |
| 3 | Sandboxed execution | ❌ none — runs on main thread | ✅ Web Worker + Comlink, timeouts, mem cap |
| 4 | Lesson engine | ⚠️ schema exists, content vacuum, no Zod | ✅ Zod-validated schema, 6+ real lessons, prerequisite gating |
| 5 | AST-based feedback | ⚠️ narrow rule set, no anti-rules, no diff | ✅ expanded vocabulary, anti-rules, partial credit |

## Goals

1. Convert the dead `null` Pyodide stubs in `app/pages/lesson.tsx` into a working Run/Check loop.
2. Move Pyodide off the main thread into a Web Worker so a `while True:` can't wedge the page.
3. Vendor Pyodide locally; drop the CDN script-tag.
4. Zod-ify `src/types/schema.ts`; validate `lessons.json` at fetch time.
5. Expand the AST rule vocabulary; add anti-rules and partial-credit scoring.
6. Author 6 real lessons that exercise the engine end-to-end.
7. Restructure `docs/` so each pillar has a single, authoritative, frontmatter-headed home.
8. Wire it all into CI: typecheck, build, unit + integration + component blocking.

## Non-goals (explicitly out of scope)

- Toolchain bumps (pnpm 10, TS 6, Biome 2, Vite 8, React 19) — separate PR after this one.
- Visual regression / `@axe-core/playwright` — separate PR after Pyodide settles.
- Frame-rate / cold-start perf budgets — separate PR; needs telemetry first.

---

## Docs restructure (the new layout)

**Before** (current — flat, no pillar boundaries):
```text
docs/
├── ARCHITECTURE.md   ← system-wide grab bag
├── DEPLOYMENT.md
├── DESIGN.md
├── STATE.md
├── TESTING.md
├── plans/            ← (new, holds this PRQ)
└── playtests/        ← per-game-type notes
```

**After** (pillar-aligned):
```text
docs/
├── README.md                 (NEW) — index page mapping pillar → file
├── pillars/
│   ├── 01-frontend.md        (NEW) — TS + React + Vite + build
│   ├── 02-runtime.md         (NEW) — Pyodide + Web Worker + Comlink + sandbox
│   ├── 03-lesson-engine.md   (NEW) — schema, authoring, sequencing, progress
│   ├── 04-grading.md         (NEW) — AST rules, runtime rules, scoring, anti-rules
│   └── 05-design-system.md   (NEW) — Pixel mascot voice + UI tokens (carved out of DESIGN.md)
├── ARCHITECTURE.md           (REWRITTEN) — high-level diagram + cross-pillar boundaries only
├── DEPLOYMENT.md             (UNCHANGED — already pillar-aligned)
├── TESTING.md                (UNCHANGED — already pillar-aligned)
├── STATE.md                  (UPDATED — reflects this PR's completion)
├── DESIGN.md                 (TRIMMED — vision/voice only; UI specifics → 05-design-system.md)
├── plans/
│   └── foundations-pillar-completion.prq.md   (THIS FILE — kept as historical record)
└── playtests/                (UNCHANGED)
```

Every new file carries the standard frontmatter (`title`, `updated`, `status`, `domain`).
`docs/README.md` is a flat index: pillar → file → 1-line description. No prose.

---

## Tasks

Tasks are grouped by pillar. Each task has explicit completion criteria.
Execution order honors dependencies; pillar 5 (lessons) depends on pillars 2-4.

### Pillar 2 — Pyodide runtime (foundation for everything else)

#### T2.1 — Singleton Pyodide bootstrap

**File:** `src/python/pyodide-singleton.ts` (new)

**Why:** `runner.tsx`, `pygame-preview.tsx`, and (after T2.2) `lesson.tsx` each currently inject the CDN script themselves. Three competing loaders means three Pyodide heaps and three first-load delays.

**Implementation:**
- Module-level `let bootstrapPromise: Promise<PyodideInstance> | null = null`.
- Exported `getPyodide(): Promise<PyodideInstance>` returns the cached promise; first caller triggers the load.
- Loader uses dynamically imported local Pyodide (T2.3), not CDN script-tag.
- Surfaces a `PyodideLoadError` with `cause` preserved for the lesson page's error UI.
- Removes the duplicated script-injection blocks from `runner.tsx:30-65` and `pygame-preview.tsx`.

**Completion criteria:**
- [ ] `src/python/pyodide-singleton.ts` exists, exports `getPyodide()`.
- [ ] `runner.tsx` and `pygame-preview.tsx` call `getPyodide()` instead of injecting `<script>`.
- [ ] `npm run check` passes.
- [ ] Manual: open `/lesson/lesson-1`, click Run on a `print('hi')` snippet — output appears.

#### T2.2 — Wire Pyodide into the lesson page

**File:** `app/pages/lesson.tsx`

**Why:** Lines 91-93 hardcode `const pyodide = null; const pyodideLoading = false; const pyodideError = null;`. Run and Check buttons are dead UI today.

**Implementation:**
- Replace the three `null` consts with a `useQuery(['pyodide'], getPyodide)` call.
- Run button: feeds editor text into `PythonRunner.runSnippet`; output goes to a transcript panel.
- Check button: invokes the grading engine (pillar 4) with the step's `tests[]`.
- Loading and error states render the existing skeleton/alert components.
- `data-testid="button-run"`, `button-check`, `transcript-output` for e2e.

**Completion criteria:**
- [ ] No `null` Pyodide stubs in `app/pages/lesson.tsx`.
- [ ] Run button produces stdout in the transcript panel for `print('hi')`.
- [ ] Check button reports pass/fail for at least one rule in lesson-1.
- [ ] Component test in `tests/component/lesson-page.test.tsx` passes.

#### T2.3 — Vendor Pyodide locally + bump version

**Files:** `public/pyodide/`, `vite.config.ts`, `package.json`

**Why:** CDN script-tag couples first-load to network and CSP-allows `cdn.jsdelivr.net`. Pyodide 0.24.1 is 3 versions behind (current is 0.27.x as of 2026-05).

**Implementation:**
- Add `pyodide` (latest stable) as a regular dep.
- Postinstall script copies `node_modules/pyodide/pyodide{,.asm}.{js,data,wasm}` and packaged stdlib into `public/pyodide/`.
- `pyodide-singleton.ts` calls `loadPyodide({ indexURL: '/pyodide/' })` (base-URL aware).
- `.gitignore` covers `public/pyodide/` — these are build artifacts, not committed.
- Remove the CDN `<script>` tags entirely.

**Completion criteria:**
- [ ] `package.json` has `pyodide` dep at the new version.
- [ ] `public/pyodide/` populated by postinstall (and predev/prebuild as a safety net).
- [ ] No `cdn.jsdelivr.net` references in any committed file.
- [ ] App boots offline (verified by toggling devtools "offline" after first load).

#### T2.4 — Move Pyodide into a Web Worker (sandboxing)

**Files:** `src/python/worker.ts` (new), `src/python/runner.ts` (rewrite to Comlink proxy)

**Why:** Today Pyodide runs on the main thread in the same JS realm as React. A `while True:` wedges the UI. A non-trivial Python program can OOM the page. Moving into a worker:
- Isolates the Python heap from React state.
- Makes timeouts trivial (`worker.terminate()` after N ms).
- Lets us drop CSP `unsafe-eval` for the main thread (Worker keeps it scoped).

**Implementation:**
- `src/python/worker.ts`: imports `getPyodide`, exposes `runSnippet`, `runWithInput`, `evaluateAst` via Comlink.
- `src/python/runner.ts`: thin wrapper that owns the Worker lifecycle + Comlink remote; `runSnippet(code, { timeoutMs })` rejects with `PythonTimeoutError` if exceeded; calls `worker.terminate()` and lazily respawns on timeout.
- Stdin/stdout streams over Comlink callbacks (transferred via MessageChannel).
- `vite.config.ts` ensures the worker bundle is emitted with `format: 'es'`.
- Add `comlink` to deps.

**Completion criteria:**
- [ ] `src/python/worker.ts` exists and is bundled separately by Vite.
- [ ] `runSnippet('while True: pass', { timeoutMs: 1000 })` rejects within ~1.5s; UI stays responsive.
- [ ] Browser devtools shows a dedicated worker thread under the document.
- [ ] All existing Python tests still pass.
- [ ] Component test exercises a timeout path.

### Pillar 4 — Lesson engine

#### T4.1 — Zod-ify the schema

**Files:** `src/types/schema.ts` (rewrite), all consumers

**Why:** Plain TS interfaces let bad lesson JSON crash silently. Validation only at the runtime boundary.

**Implementation:**
- Define each entity (`User`, `Lesson`, `Step`, `TestSpec`, `AstRules`, `RuntimeRules`, `Project`, `UserProgress`) as `z.object(...)`.
- Export the inferred TS types via `z.infer`.
- `ClientStorage.getLessons()` validates the JSON with `LessonSchema.array().parse(...)`; on failure, surfaces a structured error pointing at the offending lesson + field path.
- Drop the hand-curated `InsertProject` etc. — derive via `Schema.omit({ id: true, createdAt: true })`.
- Update every importer of `@lib/types/schema`.

**Completion criteria:**
- [ ] `src/types/schema.ts` uses Zod throughout; no plain `interface` declarations.
- [ ] `npm run check` passes.
- [ ] Unit test: invalid lesson JSON raises a `ZodError` with field path.
- [ ] No drift between TS types and runtime validators (impossible by construction).

#### T4.2 — Lesson loader + prerequisite gating

**Files:** `src/lessons/loader.ts` (new), `src/lessons/sequence.ts` (new), `app/pages/home.tsx`

**Why:** `prerequisites: string[]` exists in the schema but no code reads it. A lesson list with no gating teaches nothing in order.

**Implementation:**
- `loader.ts`: lazily fetches + validates `/api/static/lessons.json`; cached promise.
- `sequence.ts`: given user progress, returns `{ unlocked: Lesson[], locked: { lesson: Lesson; missing: Lesson[] }[] }`.
- Home page renders unlocked vs locked sections.
- Hook `useLessons()` exposes the loader through TanStack Query.

**Completion criteria:**
- [ ] `src/lessons/loader.ts` and `sequence.ts` exist with barrel `index.ts`.
- [ ] Home page renders unlocked/locked sections deterministically given fixture progress.
- [ ] Unit test for `sequence.ts` covers cycles, missing prereqs, fully-unlocked.

#### T4.3 — Step-level resume

**Files:** `src/storage/persistence.ts`, `app/pages/lesson.tsx`

**Why:** `UserProgress.currentStep` exists but the lesson page always opens at step 0.

**Implementation:**
- On lesson mount, read `UserProgress.currentStep` and seek the editor + step indicator to that step.
- On step advance, debounce a `saveProgress({ currentStep })` write (already debounced infrastructure exists).
- Add a "Resume" CTA on the home page for in-progress lessons.

**Completion criteria:**
- [ ] Reload at step 3 → opens at step 3, not step 0.
- [ ] `tests/integration/lesson-progress.test.ts` covers the resume path.

### Pillar 5 — AST-based feedback

#### T5.1 — Expand the AST rule vocabulary

**File:** `src/grading/ast.ts`

**Why:** Today: `has_function`, `has_loop`, `has_conditional`, `uses_variable`, `function_call`, `string_literal`. Real PyGame curricula need imports, classes, methods, anti-rules.

**New rule kinds:**
- `imports_module` — `{ module: 'pygame', from?: 'event' }`
- `defines_class` — `{ name: string, baseClass?: string, minMethods?: number }`
- `calls_method` — `{ on: string, method: string, minCount?: number }`
- `parameter_count` — `{ function: string, min?: number, max?: number }`
- `nesting_depth` — `{ max: number }` (style)
- `not_uses` — anti-rule wrapper: `{ rule: AstRule }` — passes if inner fails. Used for "must NOT use `eval`."

Each rule contributes a friendly message on fail (and a confirming message on pass for partial credit).

**Completion criteria:**
- [ ] All 6 new rule kinds implemented + exported from `src/grading/ast.ts`.
- [ ] Each kind has a unit test in `tests/unit/grading-ast.test.ts`.
- [ ] `docs/pillars/04-grading.md` documents every rule with an example.

#### T5.2 — Partial credit + diff against `solution`

**Files:** `src/grading/engine.ts`, `src/grading/types.ts`

**Why:** Binary pass/fail loses signal. "Your loop runs but never updates the counter" is more useful than "fail."

**Implementation:**
- `GradeResult.score: number` (0..1) = passing rules / total rules.
- `GradeResult.partial?: { passed: RuleResult[]; failed: RuleResult[] }`.
- Optional `diffSolution: true` on a test: when set, runs Python's `ast.dump()` on student vs. solution, computes a structural diff (count of nodes added/removed/changed), and surfaces "you're 80% there" hints.
- The lesson page renders score + per-rule pass/fail + the first failure's hint.

**Completion criteria:**
- [ ] `GradeResult` carries `score`, `partial`, and (when applicable) structural diff summary.
- [ ] Lesson UI shows score + per-rule status, not just pass/fail.
- [ ] Unit test covers each new field's shape.

#### T5.3 — Resource caps in runtime tests

**File:** `src/grading/runtime.ts`

**Why:** Today a `while True:` in a runtime test wedges the page. With the worker (T2.4) we have `terminate()`; the grader needs to use it.

**Implementation:**
- `runtimeRules.timeoutMs?: number` (default 5000).
- `runtimeRules.maxStdout?: number` (default 64KB).
- Exceeding either fails the test with a clear message.

**Completion criteria:**
- [ ] Both caps respected in unit tests.
- [ ] Integration test: a runaway loop fails fast and the worker is recycled.

### Pillar 4 (cont.) — Real lesson content

#### T4.4 — Author 6 lessons end-to-end

**File:** `public/api/static/lessons.json` (rewrite)

**Why:** 2 lessons (one of which is a fallback) is not a curriculum. Six gives us a vertical slice from variables to a tiny Pong-like.

**Lessons:**
1. **`lesson-1` Variables & print** (existing — refresh against new schema).
2. **`lesson-2` Input & types** (existing — refresh).
3. **`lesson-3` Conditionals** — `if/elif/else`. Anti-rule: must not hardcode the answer.
4. **`lesson-4` Loops** — `for`/`range`. Includes an `nesting_depth` cap.
5. **`lesson-5` Functions** — `def`/parameters/return. Uses `parameter_count`.
6. **`lesson-6` First PyGame draw** — `import pygame`, init, draw a circle, quit. Uses `imports_module` + `calls_method`.

Each lesson:
- 3-5 steps with `initialCode`, `solution`, `tests` (mix of AST + runtime), `hints` (3+ per step).
- Rich `learningObjectives` and `goalDescription` for the home page card.
- Validates against the Zod schema (T4.1).

**Completion criteria:**
- [ ] All 6 lessons present in `lessons.json`.
- [ ] All 6 validate against the Zod schema.
- [ ] `tests/integration/lessons-roundtrip.test.ts`: loads lessons.json, runs each step's `solution` through the grader, every solution scores 1.0.
- [ ] At least one lesson exercises every new AST rule kind from T5.1.

### Pillar 0 — Docs restructure (frontmatter-headed pillars)

#### TD.1 — Create `docs/README.md` index

**File:** `docs/README.md` (new)

**Content:** Frontmatter + a single table mapping pillar → file → 1-line purpose. No prose. Updated whenever a pillar file is added/renamed.

**Completion criteria:**
- [ ] File exists with required frontmatter.
- [ ] Every file under `docs/` (except `playtests/` and `plans/`) is referenced in the table.

#### TD.2 — `docs/pillars/01-frontend.md`

**Content:**
- React 18 + Vite + TypeScript + Tailwind + shadcn + Monaco — the layer's role.
- Aliases (`@/*`, `@lib/*`, `@assets/*`).
- The `app/` vs `src/` boundary rule (TSX vs TS).
- The build pipeline (`predev`/`prebuild`/`tsc`/`vite build`).

**Completion criteria:**
- [ ] File exists with frontmatter, ~150-300 lines.
- [ ] No content overlaps `02-runtime.md` (the boundary is the canvas seam).

#### TD.3 — `docs/pillars/02-runtime.md`

**Content:**
- Pyodide loader (singleton, vendored, version-pinned).
- The Web Worker boundary + Comlink RPC contract.
- Timeouts and resource caps; how the worker is recycled.
- The PyGame simulator's surface (`<canvas>` interception, event mapping).
- How user code's `import pygame` resolves to the simulator.

**Completion criteria:**
- [ ] File exists; covers loader → worker → simulator end-to-end.
- [ ] Includes a sequence diagram (mermaid) for a Run click.

#### TD.4 — `docs/pillars/03-lesson-engine.md`

**Content:**
- Lesson schema (Zod, with example).
- Authoring workflow + validation step.
- Sequencing & prerequisites; how the home page consumes them.
- Step-level resume.
- Where lesson JSON lives + how it ships.

**Completion criteria:**
- [ ] File exists; references the schema source as the source of truth.
- [ ] Includes a "writing your first lesson" walk-through.

#### TD.5 — `docs/pillars/04-grading.md`

**Content:**
- The two grading modes (`output` runtime, `rules` AST).
- Every rule kind with example JSON + behavior.
- Anti-rules.
- Partial credit + scoring.
- Resource caps in runtime tests.

**Completion criteria:**
- [ ] File exists; every rule from T5.1 documented with a runnable example.
- [ ] Includes "common mistakes" section (e.g., "this rule fires inside lambdas; use `not_uses` if that's not what you want").

#### TD.6 — `docs/pillars/05-design-system.md`

**Content (carved out of `DESIGN.md`):**
- CSS token table (`--background`, `--foreground`, …).
- Tailwind theme extensions.
- Pixel mascot voice + phrasing rules.
- Component primitives that already exist in `app/components/ui/`.
- Accessibility primitives (Radix Dialog, focus traps, etc.).

**Completion criteria:**
- [ ] File exists; the bits previously in `DESIGN.md` related to UI tokens/voice are here.
- [ ] `DESIGN.md` is trimmed to vision + product principles only — no token tables, no component lists.

#### TD.7 — Rewrite `docs/ARCHITECTURE.md` to be cross-pillar only

**File:** `docs/ARCHITECTURE.md`

**Content:** High-level diagram, the boundary rules between pillars, the build pipeline. Detailed per-pillar content moves to `pillars/*`. ARCHITECTURE.md becomes ~80 lines, not 170.

**Completion criteria:**
- [ ] No content duplicated between ARCHITECTURE.md and any pillar file.
- [ ] The "Boundaries and rules of thumb" section remains and is the authoritative cross-pillar contract.

#### TD.8 — Update `docs/STATE.md`

**File:** `docs/STATE.md`

**Content:**
- Move all R1–R11 items into "Done."
- Add a "Foundations Pillar Completion (this PR)" entry for the work in this plan.
- Refresh "Next" with the items explicitly out of scope (toolchain bumps, visual regression, perf budgets).

**Completion criteria:**
- [ ] STATE.md reflects post-PR reality.
- [ ] No item appears in both Active and Done.

#### TD.9 — Update `STANDARDS.md` and `AGENTS.md`

**Files:** `STANDARDS.md`, `AGENTS.md`

**Why:** Both reference the old flat docs/ layout in places.

**Completion criteria:**
- [ ] Cross-references to docs/ point to pillar files where relevant.
- [ ] No broken links (verified by `lychee` or equivalent).

### CI

#### TC.1 — Make integration + component tests blocking

**File:** `.github/workflows/ci.yml`

**Why:** They're advisory today because pre-existing tests needed to catch up. After the test refresh in this PR, they should be blocking.

**Completion criteria:**
- [ ] `Vitest (unit + integration + component)` runs all three projects in non-advisory mode.
- [ ] PR's own CI run is green with the new gating.

---

## Execution order

```text
T2.1 ─┬─ T2.3 ─ T2.4 ─┬─ T5.3 ─┐
      └─ T2.2 ────────┤        │
                      │        ├─ T4.4 ─ TC.1
T4.1 ─ T4.2 ─ T4.3 ───┘        │
T5.1 ─ T5.2 ──────────────────┘

(Docs tasks TD.1-TD.9 run in parallel with code work; finalize last.)
```

## Acceptance for the whole PR

- [ ] `npm run check` clean.
- [ ] `npm test` (all Vitest projects) clean.
- [ ] `npm run test:e2e` clean.
- [ ] `npm run build` produces a `dist/` that boots offline.
- [ ] All five pillars have a frontmatter-headed file under `docs/pillars/`.
- [ ] No pillar content duplicated between ARCHITECTURE.md and pillar files.
- [ ] Lesson page Run/Check actually works (manual verification).
- [ ] `while True: pass` doesn't wedge the page (manual + integration test).
- [ ] PR title: `feat: complete foundations pillar — runtime, lessons, grading, docs`.
- [ ] Squash-merged to `main` after CI green and review threads resolved.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Pyodide vendoring inflates `dist/` size dramatically | Already large — Pyodide is ~10MB; moves the cost from CDN-cache to first-byte. Acceptable; documented in `docs/pillars/02-runtime.md`. |
| Web Worker breaks an existing component-test path | Component tests use real Chromium (Vitest browser) which supports workers natively. Run the suite on a worktree before pushing. |
| Zod migration cascades into 30 files | Most consumers import only the inferred TS types — those keep working as `z.infer<typeof X>`. Direct schema users are <10 files. |
| 6 lessons is more content than expected | Lessons are short (3-5 steps, ~30 lines of Python each). Authoring 6 fits in a focused day. |
| Docs restructure breaks deep links | Add a `docs/README.md` index mapping old paths → new paths during the transition; remove after one PR cycle. |

---

*This PRQ is the single source of truth for the next PR.
When a task lands, mark its checkbox here and update `docs/STATE.md` accordingly.
When the PR squash-merges, this file stays as the historical record.*
