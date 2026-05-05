---
title: Modernization pillar PRQ
created: 2026-05-04
priority: P1
timeframe: single coordinated session
status: ACTIVE
---

# Modernization pillar — close out everything in STATE.md → Next

**Created:** 2026-05-04
**Source branch:** `feat/modernization-pillar` (from `main` after PR #20)

## Priority: HIGH

## Overview

Two pillars shipped today (PR #19 foundations, PR #20 stabilization). What's left in `docs/STATE.md → Next` is a mix of (a) toolchain bumps, (b) type/schema/test-config cleanup, (c) visual + a11y baselines, (d) Pyodide/PyGame correctness gaps, and (e) content track. Per the user's directive, this is one PRQ — but each section ships as its own atomic commit on the branch so review can move at the granularity of each concern. The branch is one PR; the commits inside are the read-friendly unit.

The commits land in dependency order — toolchain first (everything else is built on top), then schema/test gates, then visual/a11y, then runtime correctness, then content.

## Tasks

### M1 — Toolchain modernization (5 commits, dependency-ordered)

- [ ] M1.1 — pnpm 10.x replaces npm. `package.json` adds `packageManager`, `npm i` → `pnpm install`, GitHub Actions matrix updated, `corepack enable` step added, `package-lock.json` deleted, `pnpm-lock.yaml` committed.
- [ ] M1.2 — TypeScript 6.x bump. Address any new strict-mode regressions, drop deprecated compiler options, verify the Pyodide ambient (`src/types/pyodide.d.ts`) still resolves.
- [ ] M1.3 — Vite 8 + Vitest 4 + `@vitest/browser` 4 (single coordinated bump). Worker `?worker` syntax may have shifted; verify `pyodide.mjs` dynamic import still resolves; verify `coverage` v8 reporter still works; verify component-project browser bootstrap.
- [ ] M1.4 — React 19. Concurrent rendering, the new error boundaries, `use()` hook, deprecated APIs removed. Audit `app/` for `forwardRef` usages that now need adjustment, and any `legacy` ReactDOM render APIs.
- [ ] M1.5 — Biome 2.4.x replaces ESLint + Prettier. `npx biome init`, port the existing `.eslintrc` rules into `biome.json`, drop ESLint+Prettier devDeps, replace the CI lint step. The Biome migration also subsumes the `no-explicit-any: error` flip — Biome's equivalent rule (`noExplicitAny`) goes to `error`.

### M2 — Type / schema / test config cleanup (3 commits)

- [ ] M2.1 — Fix the 209-ish `any`s. After M1.5 (Biome) lands, the lint config goes to `error`. The actual fixes happen in this commit: replace `any` with `unknown` + type guards, or with the right inferred type. Net deletions, no new types.
- [ ] M2.2 — Re-enable Vitest coverage thresholds. `vitest.config.ts` adds `coverage.thresholds: {lines: 90, branches: 85, functions: 90, statements: 90}`. Add lcov reporter for CI artifact upload.
- [ ] M2.3 — Wizard-dialogue integration tests refresh. The currently-quarantined `tests/integration/wizard-dialogue-engine.test.tsx` is rewritten against the actual persistence shape; remove the `exclude` in `vitest.config.ts`. If the rewrite is too large, delete the file and replace with focused tests for whichever wizard-flow paths still need integration coverage.

### M3 — Visual + accessibility baseline (2 commits)

- [ ] M3.1 — Playwright visual-regression baseline. `tests/e2e/visual.spec.ts` captures golden screenshots per game-type / per viewport; CI updates the screenshot artifact when the diff exceeds a threshold; per-PR review can eyeball the diff.
- [ ] M3.2 — `@axe-core/playwright` checks in the e2e suite. New `tests/e2e/a11y.spec.ts` runs axe on each major route and asserts zero violations of WCAG 2.2 AA rules.

### M4 — Pyodide / PyGame correctness (3 commits)

- [ ] M4.1 — Cold-start budget. Wire a perf timer around `getPyodide()` boot; surface in `console.info` and (in dev) on a HUD overlay. Set a budget in `docs/pillars/02-runtime.md` (target: <3s on first load on a mid-tier laptop, <8s on a Chromebook).
- [ ] M4.2 — Frame-rate test for the simulator. Component-project test mounts the simulator with a realistic component count (≥6 sprites + 2 platforms + a particle effect) and asserts mean frame time < 16.67ms over 2 seconds.
- [ ] M4.3 — Worker-side stdout truncation. Move `maxStdout` enforcement into the worker's stdout buffer (truncate during `pyodide.runPython` callback), eliminating the megabytes-across-Comlink case STATE.md flagged. Update the `clipResult` in `worker-runner.ts` to verify the cap, not enforce it.

### M5 — Grader instrumentation (2 commits)

- [ ] M5.1 — Real `functionCalled` instrumentation. Worker exposes a `runWithCallTracking(code, names)` API that monkey-patches each named function before exec, increments a counter on call, and returns the counts. Engine's runtime validator uses real counts instead of the stdout/globals approximation.
- [ ] M5.2 — Real `acceptsUserInput` instrumentation. Worker tracks `input()` invocations (already monkey-patched in `worker.ts` — extend the patch to count). Engine asserts `count > 0` instead of "test provided non-empty input".

### M6 — Content track (1 commit, then ongoing)

- [ ] M6.1 — Three more lessons covering data structures (lists), files (read/write text files via Pyodide's virtual FS), and classes (`__init__`, methods, inheritance). Each lesson has 2–3 steps with full AST + runtime rules. `tests/unit/lessons-content.test.ts` invariants pass.
- [ ] M6.2 — STATE.md cleanup. Move all stabilized M-tasks from Active → Done. Trim Next of everything that landed here. Add a new Next section for the per-game-type playtest follow-ups (one item per `docs/playtests/` file with a one-liner of the most-blocking tune).

## Dependencies

- **M1.x is dependency-chained.** Within M1, the order matters: pnpm before TS (TS deps install via pnpm), TS before Vite/Vitest (config types), Vite/Vitest before React (the bumped Vite needs React 19's plugin compat), React before Biome (Biome's React rules need React 19 to evaluate against). Each commit must keep the build green or the next can't start.
- **M2.1 depends on M1.5** (Biome's `noExplicitAny` is what flips to error).
- **M3.x is independent of M1** but lands after to avoid double rework if Vite 8 breaks Playwright integration.
- **M4 / M5 depend on M1.3** (Vite 8 worker bundling may shift behavior).
- **M6 is independent.** Could land first as a warm-up, but bundling means doc updates only happen once.

## Acceptance Criteria

### M1.1 — pnpm

- [ ] `package.json` has `"packageManager": "pnpm@10.x.x"`.
- [ ] `pnpm-lock.yaml` exists and is committed; `package-lock.json` is gone.
- [ ] `.github/workflows/ci.yml` and `cd.yml` use `pnpm/action-setup@v4` (or current major) + `corepack enable`.
- [ ] Existing `npm run X` commands all work as `pnpm X`.
- [ ] `pnpm install --frozen-lockfile` is the CI install step.

### M1.2 — TypeScript 6.x

- [ ] `typescript` devDep is `^6.x`.
- [ ] `npm run check` (now `pnpm check`) clean. (It will be invoked as `pnpm check` after M1.1.)
- [ ] `tsconfig.json` updated for any deprecated options.

### M1.3 — Vite 8 / Vitest 4 / @vitest/browser 4

- [ ] All three at major version 8 / 4 / 4.
- [ ] `pnpm dev`, `pnpm build`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:component`, `pnpm test:e2e` all green.
- [ ] Pyodide worker still loads via `await import('pyodide.mjs')` after Vite's worker plugin shift.
- [ ] Vitest 4 config migrations applied (workspace → projects already done; check for new project-shape changes).

### M1.4 — React 19

- [ ] `react` and `react-dom` at `^19.x`.
- [ ] No deprecation warnings in dev console.
- [ ] `forwardRef` migrations applied where required (React 19 makes `ref` a normal prop on function components).

### M1.5 — Biome

- [ ] `biome.json` configured with the project's existing rule set, plus `lint.rules.suspicious.noExplicitAny: "error"`.
- [ ] `eslint`, `prettier`, `@typescript-eslint/*` removed from devDeps.
- [ ] CI's `Lint (advisory)` step replaced with `Biome (blocking)`.
- [ ] `pnpm biome check .` clean (after M2.1 lands).

### M2.1 — `any` cleanup

- [ ] `pnpm biome check .` clean with `noExplicitAny: error`.
- [ ] Net change is deletions or replacements with `unknown`/proper types — not new type aliases or shims.

### M2.2 — coverage thresholds

- [ ] `vitest.config.ts` `coverage.thresholds` set to 90/85/90/90.
- [ ] `pnpm test:coverage` (new script) runs all projects with coverage.
- [ ] CI uploads `coverage/lcov.info` as artifact.

### M2.3 — wizard-dialogue tests

- [ ] `vitest.config.ts` no longer excludes `wizard-dialogue-engine.test.tsx`.
- [ ] `pnpm test:integration` green.

### M3.1 — visual regression

- [ ] `tests/e2e/visual.spec.ts` exists with screenshot assertions per route × viewport.
- [ ] `playwright.config.ts` configured for screenshot reporting.
- [ ] CI artifact upload for screenshot diffs.

### M3.2 — a11y axe

- [ ] `tests/e2e/a11y.spec.ts` exists; runs axe on lesson, wizard, editor, playground routes.
- [ ] All violations of WCAG 2.2 AA fixed or documented as known with linked issue.

### M4.1 — cold-start budget

- [ ] `getPyodide()` instrumented with `performance.now()` start/end.
- [ ] `docs/pillars/02-runtime.md` documents the budget.
- [ ] Dev-mode HUD overlay shows the timer.

### M4.2 — frame-rate test

- [ ] New component-project test asserts mean frame time < 16.67ms with realistic component count.
- [ ] Test runs in <30s on CI.

### M4.3 — worker-side maxStdout

- [ ] `worker.ts`'s stdout callback enforces the cap and stops buffering past it.
- [ ] `worker-runner.ts`'s `clipResult` becomes a verification, not an enforcement.
- [ ] New unit test in `worker-runner.test.ts` proves the worker truncates rather than the wrapper.

### M5.1 — functionCalled

- [ ] `worker.ts` exposes a tracking API.
- [ ] `runtime.ts`'s functionCalled rule consumes real counts.
- [ ] Existing unit tests for the rule still pass; new test proves a function that's defined but not called fails the rule.

### M5.2 — acceptsUserInput

- [ ] Engine asserts on real `input()` invocation count, not on test input shape.
- [ ] New unit test proves a test with input but code that doesn't call `input()` fails the rule.

### M6.1 — three new lessons

- [ ] `lessons.json` contains lesson-7 (lists), lesson-8 (files), lesson-9 (classes).
- [ ] `tests/unit/lessons-content.test.ts` invariants pass.
- [ ] `grader-e2e.test.tsx` passes for all new lessons.

### M6.2 — STATE.md final pass

- [ ] All M-tasks moved Active → Done.
- [ ] Next is empty (or contains only future-bracket items beyond this PR).

## Technical Notes

- **One PR, many commits.** Per CLAUDE.md "One long-running PR per topic, one commit per issue inside it." This whole batch is the "modernization" topic. Each M-task is a commit. Reviewers can checkpoint at any commit.
- **Each commit must keep CI green.** No "fix on next commit" patterns. If a bump breaks something, the same commit fixes it.
- **No backwards-compat shims.** When a renamed npm script becomes a pnpm script, every reference (CLAUDE.md, README, scripts) updates in the same commit.
- **Verify before pushing.** Per the user's stated rule "verify online vs trusting training data", check Context7 / package docs for the actual current versions of every tool when bumping. Don't trust the version numbers in this PRQ — they may have moved.
- **No partial completion.** If M5 instrumentation turns out to need a multi-PR redesign, document that in the commit body and either ship M5 as no-op stubs (and re-queue the implementation as its own PRQ) or skip the commit entirely. Don't leave half-implemented worker tracing in main.

## Risks

- **React 19 + Framer Motion compatibility.** Framer Motion may not support React 19 yet; if so, that's a hard blocker on M1.4 — either wait for the bump upstream or pin a compatible version.
- **Biome's React rules vs the existing ESLint config.** Biome's lint rule set is *similar* but not identical to `eslint:recommended` + the React plugins. Some rules may produce different counts than ESLint did. Don't try to replicate ESLint exactly — accept Biome's defaults where reasonable.
- **The 209 `any`s.** Some are in third-party type gaps (Pyodide ambient types, framer-motion variants we already saw). Those need a structural fix, not a per-instance one.
- **Visual regression flakes.** Browser-rendered text can shift across Chromium versions. Expect to bump the threshold or screenshot only the structurally-stable parts of each page.
- **Cold-start instrumentation isn't a silver bullet.** Setting a budget without a means to hit it just creates noise. M4.1's deliverable includes "what would we change to hit it" if the current measurement exceeds the budget — possibly precaching `python_stdlib.zip`, possibly a pre-warm worker on idle.
