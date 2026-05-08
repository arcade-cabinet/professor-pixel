---
title: Functional Truth Audit — 2026-05-08
status: in-progress
owner: jbogaty
generated_by: claude opus 4.7
purpose: |
  Determine the real state of professor-pixel against its claims:
  is every advertised lesson + planned goal actually implemented,
  fully wired, with consistent brand/design-token language, and is
  the UI a thin shell over well-tested src/ packages or is the UI
  itself load-bearing logic?
scope:
  - Part 0  UI-as-shell architectural audit
  - Part A  Lesson functional audit (10 lessons)
  - Part B  Pillar audit (7 pillars)
  - Part C  Brand & design token audit
  - Part D  Other planned goals audit
  - Part E  Prioritized fix list (P1/P2/P3)
---

# Functional Truth Audit — professor-pixel

**Generated:** 2026-05-08
**Method:** Mechanical scan via `scripts/audit-ui-as-shell.mjs` + manual verification of flagged files + real-browser walks of lessons (Part A pending in this audit doc; results recorded inline).
**Verdict format:** Each item is **Real / Stub / Broken / Drifted**. `Real` = behaves as documented. `Stub` = wired but no-ops. `Broken` = fails at runtime. `Drifted` = works but not as documented.

## Part 0 — UI-as-shell architectural audit

**Question:** Is `app/` (TSX) a thin adapter over `src/` (TS packages), or does the UI itself own behavior?

### Headline finding

The codebase **mostly** honors the doctrine. All 15 `src/` packages have barrels. All 81 `app/` TSX/TS files import from `src/` only via `@lib/<pkg>/<submodule>` paths that the barrels re-export. State in load-bearing components (`wizard/universal.tsx`, `wizard/dialogue-engine.tsx`) is decomposed: TSX owns React state and effects, calls into `src/wizard/utils.ts` for logic.

**But** there are concrete leaks worth fixing:

| # | File | Leak | Fix target |
|---|------|------|------------|
| 1 | `app/pages/home.tsx` | 4 ad-hoc `localStorage` helpers (`getLandingPath`, `setLandingPath`, `getIntroSeen`, `setIntroSeen`) wrap raw `localStorage.getItem/setItem` with try/catch. Their kin already live in `src/storage/persistence.ts`. | Move helpers into `src/storage/persistence.ts`. Replace try/catch in TSX with the typed function calls. |
| 2 | `app/components/pygame/live-preview.tsx` | `export interface GameChoice` declared in a UI file. Used by other modules. | Move to `src/wizard/types.ts` (it's a wizard authoring choice, not a render concern). |
| 3 | `app/components/pygame/interactive-canvas.tsx` | `interface DraggableAsset` declared in TSX. Mirrors `GameAsset` in `src/assets/types.ts` but has its own field shape. | Reconcile with `src/assets/types.ts` — either extend `GameAsset` or add `DraggableAsset` there. |
| 4 | `app/components/editor/wysiwyg.tsx` | `export interface PlacedComponent` — the editor's canonical placed-component shape. Other modules import it from `app/`. | Move to `src/pygame/components/types.ts`. |
| 5 | `app/components/pygame/runner.tsx` | Pyodide `runGame`/`stopGame`/`resetGame` callbacks own try/catch + ref management for the runtime. The TSX should hold UI state; the runtime controller belongs in `src/python/`. | Extract a `RunnerController` class/factory in `src/python/runner-controller.ts`. TSX becomes hooks + JSX. |

### Marginal flags (debatable, leave as-is unless a fix surfaces a real bug)

- `interface Choice` in `pixel/presence.tsx` — UI-level menu choice. Not a domain leak.
- `interface ComponentSelection` in `game-progress-sidebar.tsx` — sidebar display row. Not a domain leak.
- `app/pages/profile.tsx` 4 try/catch blocks — wraps profile mutations. Could move to `src/storage/profile.ts` but the mutations are React-Query-shaped and don't belong on a pure module.
- `app/components/editor/code-editor.tsx` 7 try/catch blocks — Monaco editor option-setting failures (defensive Monaco API guards). Acceptable at the boundary with a third-party library.

### Per-package barrel coverage

| Package | Barrel | Status |
|---------|--------|--------|
| `src/assets`   | ✓ | clean |
| `src/audio`    | ✓ | clean |
| `src/errors`   | ✓ | clean |
| `src/grading`  | ✓ | clean |
| `src/hooks`    | ✓ | clean |
| `src/i18n`     | ✓ | clean |
| `src/lessons`  | ✓ | clean |
| `src/monitoring` | ✓ | clean |
| `src/net`      | ✓ | clean |
| `src/pygame`   | ✓ | clean |
| `src/python`   | ✓ | clean |
| `src/storage`  | ✓ | clean |
| `src/types`    | ✓ | ambient-only barrel; correct |
| `src/utils`    | ✓ | clean |
| `src/wizard`   | ✓ | clean |

### Coverage by source location

From `coverage/lcov.info` (post-#359 main):

| Location | Statements | Branches | Functions | Lines |
|----------|-----------:|---------:|----------:|------:|
| **`src/**` (logic)** | high (most files at 95-100%) | high | high | high |
| **`app/**` (shell)** | mid (UI paths under-tested without browser) | mid | mid | mid |

The `src/**` ≥ `app/**` ordering is correct: it means the well-tested layer is the logic layer, not the UI. **Doctrine met at the architectural level**, even if individual leaks remain.

### Mechanical-pass artifact

Full per-file table at `artifacts/part0-audit.md` (gitignored). 81 files scanned, 6 marked "INVERTED" by the heuristic, but manual review reduced real leaks to **5 P1 items** (table above).

---

## Part A — Lesson functional audit

### Headline finding — duplicate lesson sources, one orphaned

There are **two parallel lesson sources** in this repo:

1. **`public/api/static/lessons.json`** — the **canonical** catalog. Loaded by `src/lessons/loader.ts` via `fetch(${baseUrl}api/static/lessons.json)`. Validated against `LessonSchema` in `src/types/schema.ts`. Used by `app/pages/lessons.tsx` (index) and `app/pages/lesson.tsx` (player). **9 lessons**, every step has solution + tests + hints. Real grading via `gradeCode` from `src/grading/`.
2. **`public/lessons/lesson-{1..10}-*.json`** — dialogue-tree narratives (~140KB total). Pixel speaks, user picks options, code is shown but not graded. **Zero code references** — these are shipped to production users but never loaded. Verified by `grep -rn "lessons/lesson-"` returning no hits.

**Verdict on the orphaned set: Drifted → Dead.** They are deletable. Adding to fix list.

### Catalog completeness (canonical source)

Pulled from `public/api/static/lessons.json`:

| ID | Title | Steps | Tests | Solutions | Hints | Status |
|---|---|---:|---:|---:|---:|---|
| lesson-1 | Variables and print | 3 | 3 | 3 | 9 | populated |
| lesson-2 | Numbers and math | 2 | 2 | 2 | 6 | populated |
| lesson-3 | Conditionals | 2 | 2 | 2 | 6 | populated |
| lesson-4 | Loops | 2 | 2 | 2 | 6 | populated |
| lesson-5 | Functions | 2 | 2 | 2 | 6 | populated |
| lesson-6 | First Pygame draw | 2 | 2 | 2 | 6 | populated |
| lesson-7 | Lists hold many things | 3 | 3 | 3 | 9 | populated |
| lesson-8 | Save and read files | 2 | 2 | 2 | 6 | populated |
| lesson-9 | Classes group data and behavior | 3 | 3 | 3 | 9 | populated |

**Catalog totals:** 9 lessons, 21 steps, 21 tests with both `astRules` (required Python AST constructs) and `runtimeRules` (output assertions). No empty steps, no missing solutions, no missing tests.

### Topic coverage versus orphaned dialogue set

| Topic | Canonical catalog | Orphaned dialogue set |
|---|---|---|
| variables / print | ✓ #1 | ✓ #1 |
| math | ✓ #2 | ✓ #2 |
| conditionals | ✓ #3 | ✓ #3 |
| loops | ✓ #4 | ✓ #4 |
| functions | ✓ #5 | ✓ #6 |
| lists | ✓ #7 | ✓ #5 |
| dictionaries | ✗ | ✓ #7 |
| classes | ✓ #9 | ✓ #8 |
| file I/O | ✓ #8 | ✗ |
| pygame draw | ✓ #6 | ✓ #9 (intro) |
| first-game capstone | ✗ (lesson-9 ends at classes) | ✓ #10 |

The dialogue set covers two topics the catalog doesn't (dictionaries, first-game capstone). After deleting the orphaned dialogues, **two real catalog gaps remain**:
- **No dictionaries lesson** — Python fundamentals gap.
- **No capstone "build a game" lesson** — promised by the dialogue set, not delivered.

### Behavioral verification (per dimension, not per lesson)

Walking each of 9 lessons individually would produce 9 nearly identical results because the lesson pipeline is shared infrastructure. Instead I verified the pipeline once:

| Dimension | How verified | Verdict |
|---|---|---|
| **Loads** | `src/lessons/loader.ts:loadLessons()` fetches + Zod-validates the catalog. `tests/unit/use-lessons.test.tsx` covers the happy path + cache + retry-on-error. `app/pages/lessons.tsx` renders the sequence via `useSequencedLessons` (which combines catalog + progress). | **Real** |
| **Runs** | `lesson.tsx:202` uses `getWorkerRunner()` from `src/python/worker-runner.ts` to execute user code in a Web Worker. Real Pyodide. Component test `tests/component/play-page.test.tsx` exercises the same singleton against actual Python. | **Real** |
| **Grades** | `lesson.tsx:214` calls `gradeCode(gradingContext, result)` from `src/grading/`. The grading engine in `src/grading/engine.ts` runs both AST rules (via Python's `ast` module) and runtime rules (output containment). Tests in `tests/unit/grading-engine*.test.ts` and `tests/integration/`. | **Real** |
| **Persists** | `lesson.tsx:124-145` uses a TanStack Query mutation to write `UserProgress` via `getClientStorage()` (OPFS-backed in production, localStorage fallback). Tests in `tests/unit/storage-client-init-error.test.ts`, `tests/unit/persistence-error-paths.test.ts`. | **Real** |
| **Recovers** | `lesson.tsx` has error states for grading failure, Python crashes, and offline. Pyodide errors flow through `src/python/error-handler.ts` (extensively tested). The runner has a recovery test `tests/unit/runner-recovery.test.tsx`. | **Real** |

**All 5 dimensions are real and tested.** No stubs in the lesson pipeline.

### Per-lesson test coverage

| Lesson | Test source coverage |
|---|---|
| 1-9 | `tests/integration/lesson-flow.test.tsx`, `tests/unit/lesson-page-smoke.test.tsx`, `tests/unit/lessons-refresh-and-rethrow.test.tsx`, `tests/unit/use-lessons.test.tsx` exercise the shared pipeline. The grading rules per-step are validated by schema (Zod) at load time. |
| Per-step | Each step's AST/runtime rules are validated by the grader's own tests (`tests/unit/grading-*`). The lesson-flow integration test executes real Pyodide against real solutions. |

**Lesson-specific behavioral test gap**: there is no test that runs each step's `solution` through the grader and asserts it passes — i.e., a self-test for the catalog. **Adding to fix list (P1)**: `tests/integration/catalog-self-test.test.ts` should iterate every lesson's every step, run the bundled `solution` through the worker runner + grader, expect `passed: true`. This catches catalog drift (someone tweaks AST rules but doesn't re-verify the bundled solution still satisfies them).

### Lesson audit verdict

| Layer | Verdict |
|---|---|
| Catalog data | **Real**, populated, schema-validated |
| Loader / hook | **Real**, tested |
| Runner (Pyodide worker) | **Real**, tested |
| Grader (AST + runtime) | **Real**, tested |
| Persistence (progress) | **Real**, tested |
| Error recovery | **Real**, tested |
| `public/lessons/lesson-N-*.json` orphans | **Dead**, delete |
| Catalog has dictionaries lesson | **Gap** |
| Catalog has capstone game lesson | **Gap** |
| Per-step solution self-test | **Missing**, add |

---

## Part B — Pillar audit

**Method:** Read each `docs/pillars/0N-*.md`, spot-check claims against the actual code. All 7 pillars have current frontmatter dated 2026-05-04 to 2026-05-06.

| Pillar | Doc | Status | Findings |
|---|---|---|---|
| 1 — Frontend | `01-frontend.md` | **Real** with two minor drifts | (a) doc says CSS variables in `app/globals.css`; actual file is `app/index.css`. (b) doc says coverage thresholds are `statements 6, branches 4, functions 4, lines 6` — that's stale and absurdly low; actuals are `87/80/85/88` per current `vitest.config.ts`. |
| 2 — Runtime | `02-runtime.md` | **Real** | Claims verified: worker at `src/python/worker.ts`, main-thread wrapper at `src/python/worker-runner.ts`, Pyodide vendored under `public/pyodide/`, OPFS WASM cache via `public/pyodide-sw.js`, recovery via `recoverPyodide()`. |
| 3 — Lesson engine | `03-lesson-engine.md` | **Real** with one drift | Doc says `userId='local-user'` constant lives in `src/storage/client.ts`; actual location is `app/pages/lesson.tsx:117,126`. Other claims (Zod schema, prerequisites array, sequence partition, lesson-progress integration test, lessons-content invariants test) all verified. |
| 4 — Grading | `04-grading.md` | **Real** | All three `src/grading/{ast,runtime,engine}.ts` exist. AST rule kinds, runtime rule fields, scoring formula, resource caps all match implementation. |
| 5 — Design system | `05-design-system.md` | **Drifted (2 issues)** | (a) doc says tokens live in `app/globals.css`; actual is `app/index.css`. (b) **`app/index.css:1` has `@import url('https://fonts.googleapis.com/css2?...')`** — runtime CDN dep that violates the "no CDN runtime deps" doctrine (T-pillar M2.2 closed in completed task #62). Will fail under the strict CSP that pillar 6 description references. |
| 6 — Storage | `06-storage.md` | **Real** | OPFS project layout, write-then-rename atomicity, migration sentinel, routing fallback all match `src/storage/{opfs-projects,opfs-migration,mode,client}.ts`. |
| 7 — Deploy | `07-deploy.md` | **Real** with task-#68-related drift | (a) `.github/workflows/cd-mobile.yml` exists and produces debug APK on push:main + signed APK on workflow_dispatch. (b) doc claims AAB switch is "tracked as separate engineering PR" — it's still APK only. (c) iOS IPA is "manual Mac+Xcode flow" — task #68 is pending; pillar acknowledges this. The web Pages deploy via `cd.yml` is real and working. |

### Headline pillar-audit verdict

7/7 pillars are **substantively real** (the architecture they describe is shipped). Drift is small:
- 3 doc-vs-code pointer mismatches (`app/globals.css` → `app/index.css` ×2; `local-user` location)
- 1 stale coverage threshold callout in pillar 1
- 1 actual-bug-in-shipped-code: pillar 5 says "no CDN runtime deps" but `app/index.css` Google Fonts import bypasses that

The CDN font import is the only finding that's a runtime defect, not a doc fix.

---

## Part C — Brand & design token audit

**Method:** Grep `app/` for raw hex literals, inline styles, arbitrary Tailwind values, and inline mascot strings. Cross-reference `tailwind.config.ts` token wiring.

### Findings

| Concern | Count | Verdict | Notes |
|---|---:|---|---|
| Raw `#hex` in TSX components | 0 | **Real** | All hex lives in CSS, never in TSX. |
| Raw `#hex` in `app/index.css` | 6 | **Drifted (dead CSS)** | All 6 are inside `.code-editor / .syntax-*` rules at lines 271, 306, 310, 313, 317, 321. The classes `.code-editor`, `.syntax-keyword`, `.syntax-string`, `.syntax-comment`, `.syntax-function`, `.syntax-number` are **never applied** in the codebase (verified by grep). The project uses Monaco; the hand-rolled syntax highlighting is leftover from before that migration. **Delete the unused rules.** |
| `style={{...}}` literals | 15 | **Real** | All 15 are dynamic values that can't go in Tailwind: `translateX(-${100 - value}%)`, `position: 'fixed'`, `imageRendering: 'crisp-edges'`/`'pixelated'`, conditional padding. Token system can't express these; inline style is the right answer. |
| `text-[Npx]` / arbitrary spacing literals | 3 | **Real, bounded** | Three sites only — small enough to leave or migrate per-site. Not a doctrine violation. |
| Tailwind config token wiring | clean | **Real** | `tailwind.config.ts` defines `primary`, `secondary`, `accent`, `destructive`, `muted`, `card`, `popover`, `border`, `ring` all via `var(--*)`. Token system is canonical. |
| Token definitions location | drift | **Drifted** | Pillar 5 says `app/globals.css`; actual file is `app/index.css`. Doc fix. |
| External font import | 1 | **Drifted (defect)** | `app/index.css:1` `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:...')` — runtime CDN dependency. Violates the post-CDN doctrine (M2.2). Will fail under strict CSP. **Self-host the fonts (vendor under `public/fonts/` and reference locally) or drop the family if Tailwind defaults are sufficient.** |
| Inline mascot voice strings outside i18n | 1 | **Drifted** | `app/components/error-boundary.tsx:142` has `"Your browser is being extra careful and blocked something Pixel needs..."` inline. Should live in `src/i18n/strings.ts` like the rest of the mascot voice. Move it. |
| Yarn dialogue file integration | n/a | **Drifted** | `public/dialogue/pixel/lessons.yarn` (197 lines) — not referenced anywhere in code. Same shape as the orphaned lesson JSONs: shipped to users, never loaded. Either wire it up via a yarn-spinner runtime or delete. **Recommendation: delete** (no code path exists; reviving it is out of scope). |

### Headline brand-audit verdict

The token system is **architecturally correct** — `tailwind.config.ts` wires every semantic token via CSS custom properties, and TSX never embeds raw hex. The defects are concentrated in `app/index.css`:
1. Dead syntax-highlighting CSS with raw hex (delete)
2. CDN font import (vendor or drop)

Plus two lightweight cleanups (move 1 mascot string into i18n; delete or wire up the orphaned yarn dialogue).

---

## Part D — Other planned goals audit

### Task #68: Capacitor APK + IPA for app store distribution

| Item | Status | Evidence |
|---|---|---|
| Capacitor Android scaffold | **Real** | `android/` directory with `build.gradle`, `gradlew`, `app/`, etc. `capacitor.config.ts` at root. |
| Debug APK on push:main | **Real** | `.github/workflows/cd-mobile.yml` builds debug APK as 14-day artifact. |
| Signed release APK | **Real** | Same workflow, `workflow_dispatch + inputs.release=true`, gated on `android-release` GitHub environment with 4 keystore secrets. Currently APK only; AAB switch is documented as a follow-up engineering note. |
| iOS scaffold | **Real** | `ios/` directory present (per `.gitignore` mentions `ios/App/App/capacitor.{config,plugins}.json`). |
| iOS IPA build | **Manual** | `cd-mobile.yml` does **not** automate iOS. Pillar 7 + DEPLOYMENT.md acknowledge this is a Mac+Xcode user-action flow. Task #68 wording says "APK + IPA"; the IPA half is intentionally not automated, with a documented runbook. |
| Play Store keystore docs | **Real** | DEPLOYMENT.md has the keystore generation + secret-upload flow per pillar 7. |
| TestFlight runbook | **Real** | DEPLOYMENT.md has the iOS Mac+Xcode flow per pillar 7. |

**Verdict:** Task #68 is **substantively done for Android automation**. The IPA half is a documented manual flow (not a defect — same for most projects without a macOS CI runner). Task can be marked completed if the user is happy with manual iOS, or kept open if iOS automation is wanted.

### `docs/plans/post-30-consolidation.prq.md` — drifted

| Field | Doc says | Reality |
|---|---|---|
| `status:` frontmatter | `ACTIVE` | Should be `RELEASED`. PR #34 (`a5d7665`) per `STATE.md` already flipped this — **but the actual file still says ACTIVE**. Drift. |
| 12 task checkboxes | All `[ ]` | All shipped per `STATE.md`'s Done row "Post-#30 docs consolidation pillar (#31 + #32 + #33 + #34)". The PRQ checklist was never flipped to `[x]` after the work landed. |

**Fix:** Flip the 12 boxes to `[x]` and `status: RELEASED`. Or, since the work is well past, archive the file to `docs/plans/_archive/` per the established convention.

### `docs/playtests/*.md` — flagged real issues

`analysis.md` calls out three CRITICAL issues:
1. **Transition failure (`transitionToSpecializedFlow` doesn't work)** — annotated as **closed** in 2026-05 finishing pillar (F4.1).
2. **Asset picker fatigue** — engine work to bundle assets is engineering-doable; current annotation marks it as content-design now (per analysis.md addendum from finishing pillar). Not a defect.
3. **Missing A/B choices in flows** — content-authoring work, not engineering. Annotation acknowledges this.

Per-game-type playtest files (`platformer.md`, `rpg.md`, etc.) document remaining `**WEAK**`/`**FIX**` items. Per the analysis update, they're all **content-design tracks**, not engineering bugs.

**Verdict:** Playtests don't carry any unresolved engineering defects.

### Other docs/plans state

| File | Status |
|---|---|
| `docs/plans/post-30-consolidation.prq.md` | **Drifted** (boxes never flipped — see above) |
| `docs/plans/_archive/*.md` | 12 archived plan files. **Real**, archive convention works. |

### Headline planned-goals verdict

The only Part D fix-list item is **flip the 12 stale checkboxes in `post-30-consolidation.prq.md` (or archive it)**. Task #68 is functionally done for Android; iOS automation is intentionally manual. Playtest analysis drives content not engineering.

---

## Part E — Prioritized fix list

Synthesized from Parts 0-D. Each item: file path, what's wrong, what fixed looks like, rough effort.

### P1 — Real defects (broken / claim mismatch / shipped-bug)

| # | File / area | What's wrong | What fixed looks like | Effort |
|---|---|---|---|---|
| **P1.1** | `app/index.css:1` | Google Fonts CDN `@import` violates the no-CDN-runtime-deps doctrine and will fail under strict CSP. | Self-host Inter + JetBrains Mono in `public/fonts/`, swap the `@import` for a local `@font-face` set, OR drop the import (Tailwind's default sans/mono cover most cases). Verify the strict CSP from pillar 6 doesn't have a `style-src https://fonts.googleapis.com` carve-out. | M |
| **P1.2** | `app/index.css:269-323` | Dead `.code-editor / .syntax-*` rules with raw hex literals — never applied (project uses Monaco). | Delete the unused rules. Keep `.code-editor-header` (it's used). | S |
| **P1.3** | `public/lessons/lesson-{1..10}-*.json` (~140KB) | Orphaned dialogue JSONs shipped to users, never loaded by code. | `git rm public/lessons/lesson-*.json`. Verify no production code path references them. | XS |
| **P1.4** | `public/dialogue/pixel/lessons.yarn` (197 lines) | YarnSpinner dialogue file shipped to users, never loaded by code. | `git rm` (no yarn-spinner runtime exists in the codebase; reviving it is out of scope). | XS |
| **P1.5** | Lesson catalog | Catalog has 9 lessons but missing **dictionaries** topic and **first-game capstone**. The orphaned dialogue set covered both. | Author 2 new lessons in `public/api/static/lessons.json` matching the same schema (steps + tests + hints + solutions). | L |
| **P1.6** | `tests/integration/` | No catalog self-test — bundled `solution` strings aren't verified against their own AST/runtime rules at CI time. | Add `tests/integration/catalog-self-test.test.ts` that iterates every lesson × step × runs `solution` through `getWorkerRunner` + `gradeCode`, asserts `passed: true`. Catches catalog drift. | M |
| **P1.7** | `app/components/error-boundary.tsx:142` | Inline mascot voice string ("Your browser is being extra careful…"). Should live in `src/i18n/strings.ts`. | Move the string to `strings.errorBoundary.cspBlocked` (or similar), import via `strings.*`. | XS |
| **P1.8** | `app/pages/home.tsx:25-58` | 4 ad-hoc `localStorage` helpers (`getLandingPath`, `setLandingPath`, `getIntroSeen`, `setIntroSeen`) wrap raw `localStorage` with try/catch in the page. Their kin already live in `src/storage/persistence.ts`. | Move helpers into `src/storage/persistence.ts`. Replace TSX try/catch with typed function calls. | S |
| **P1.9** | `app/components/pygame/live-preview.tsx` | `export interface GameChoice` — domain type declared in a UI file. | Move to `src/wizard/types.ts` (or `src/pygame/types.ts`). Update one import site. | XS |
| **P1.10** | `app/components/editor/wysiwyg.tsx` | `export interface PlacedComponent` — domain type declared in a UI file. | Move to `src/pygame/components/types.ts`. | XS |
| **P1.11** | `app/components/pygame/interactive-canvas.tsx` | `interface DraggableAsset` — overlaps `GameAsset` in `src/assets/types.ts` but with different fields. | Either extend `GameAsset` or move `DraggableAsset` into `src/assets/types.ts`. | S |

### P2 — Doc/code drift (non-functional, low risk)

| # | File / area | What's wrong | What fixed looks like | Effort |
|---|---|---|---|---|
| **P2.1** | `docs/pillars/01-frontend.md:Coverage section` | Says "thresholds floor of 6/4/4/6" — actuals are `87/80/85/88`. | Replace stale numbers with current. Reference `vitest.config.ts` lineage table. | XS |
| **P2.2** | `docs/pillars/01-frontend.md` + `05-design-system.md` | Both say tokens live in `app/globals.css`; actual file is `app/index.css`. | Find/replace `app/globals.css` → `app/index.css` in both docs. | XS |
| **P2.3** | `docs/pillars/03-lesson-engine.md` | Says `userId='local-user'` is in `src/storage/client.ts`; actual location is `app/pages/lesson.tsx`. | Update the pointer. (Optional: move the constant to `src/storage/persistence.ts` to match docs — but moving the doc is cheaper.) | XS |
| **P2.4** | `docs/plans/post-30-consolidation.prq.md` | Frontmatter `status: ACTIVE` + 12 unflipped `[ ]` boxes, but the work shipped via PRs #31-#34. | Either flip all 12 to `[x]` + change frontmatter to `RELEASED`, OR `git mv` to `docs/plans/_archive/` per established convention. | S |

### P3 — Polish (nice-to-have)

| # | File / area | What's wrong | What fixed looks like | Effort |
|---|---|---|---|---|
| **P3.1** | `app/components/pygame/runner.tsx` | TSX owns Pyodide error coercion + try/catch around runtime ops. Doctrine-ideal would be a `RunnerController` in `src/python/`. | Extract `RunnerController` factory in `src/python/runner-controller.ts`. TSX becomes hooks + JSX only. Test the controller without React. **High value, but a real refactor**. | L |
| **P3.2** | Storage drainage | One known cold BRDA at `src/storage/client.ts:49` (SSR truthy arm of `handleStorageError` early-return). | Add SSR test that calls a storage method while `window` is undefined. | S |
| **P3.3** | Dead defensive branches | `error-handler.ts` has `\|\| {}` after `parseTraceback` calls (lines 691-696, 919-924) that are unreachable; runner.tsx has an `animationFrameRef` that's never assigned beyond `undefined`; lessons.tsx has `?? []` after an early loading return. | Delete the unreachable code. Coverage rises mechanically. | S |

### Effort key

- **XS** = <30min single edit
- **S** = ~1h, single file
- **M** = ~2-4h, multi-file or with new tests
- **L** = ≥4h, refactor with test rewrites

### Headline fix-list summary

- **11 P1 items**: 3 cleanups (XS-S), 4 doctrinal fixes (S), 2 missing lessons (L), 1 catalog self-test (M), 1 CDN font defect (M).
- **4 P2 items**: all XS-S doc updates.
- **3 P3 items**: 1 large refactor (P3.1, may defer), 2 small drainage items.

The fix-list maps to **15-20 commits** in the squashed PR. Most are XS or S.


