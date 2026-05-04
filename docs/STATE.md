---
title: State
updated: 2026-05-04
status: current
domain: context
---

# State

> What's done, what's actively in flight, what's queued. Updated whenever a meaningful slice ships or the next-up changes. If this doc and `git log` disagree, fix this doc.

## Active

### Foundations pillar completion (this branch: `feat/foundations-pillar-completion`)

Wire Pyodide into the lesson page, vendor it locally, push it onto a Web Worker. Replace the placeholder lesson schema with Zod. Expand the AST grading vocabulary and add partial credit + per-test resource caps. Author six real lessons. Restructure docs into pillar files.

- [x] T2.1 — Singleton Pyodide bootstrap (`src/python/pyodide-singleton.ts`).
- [x] T2.2 — Wire Pyodide into the lesson page (replaces the `null` stubs that disabled Run/Check).
- [x] T2.3 — Vendor Pyodide locally + bump to 0.29.3 (was CDN-only on 0.24.1).
- [x] T2.4 — Move Pyodide onto a Web Worker via Comlink with timeout-driven termination.
- [x] T4.1 — Zod-validate the cross-domain entities (`User`, `Lesson`, `UserProgress`, `Project`).
- [x] T4.2 — Lesson loader + prerequisite gating.
- [x] T4.3 — Step-level resume (integration coverage).
- [x] T4.4 — Author six lessons covering Python → Pygame.
- [x] T5.1 — Expand AST rule vocabulary (imports_module, defines_class, calls_method, parameter_count, nesting_depth, anti-rules).
- [x] T5.2 — Partial credit + per-rule pass/fail in `GradeResult`.
- [x] T5.3 — Per-test `timeoutMs` / `maxStdout` caps wired through the worker.
- [x] TD.1 — `docs/README.md` index.
- [x] TD.2 — `docs/pillars/01-frontend.md`.
- [x] TD.3 — `docs/pillars/02-runtime.md`.
- [x] TD.4 — `docs/pillars/03-lesson-engine.md`.
- [x] TD.5 — `docs/pillars/04-grading.md`.
- [x] TD.6 — `docs/pillars/05-design-system.md`.
- [x] TD.7 — Rewrite `docs/ARCHITECTURE.md` to be cross-pillar only.
- [x] TD.8 — Update `docs/STATE.md` (this entry).
- [x] TD.9 — Refresh STANDARDS.md / AGENTS.md cross-references.
- [x] TC.1 — Make integration + component tests blocking in CI.

## Done (recent milestones)

| Milestone | When | Notes |
|-----------|------|-------|
| Capacitor-style layout + browser-only deploy | 2026-05 | Squashed into `ec275bd` on main; R1–R11 phases |
| Documentation overhaul to standard-repo profile | 2026-05 | See [`CHANGELOG.md`](../CHANGELOG.md) |
| Initial development complete (v1.0.0 baseline) | 2025-09 | Themed v0.1.0 history in `CHANGELOG.md` |
| Multi-resolution Playwright suite | 2025-09 | 7 viewports, runtime-error detection wired in |
| Universal wizard with JSON-driven flows | 2025-09 | 7 game types |
| WYSIWYG editor with drag-and-drop | 2025-09 | Component property inspector, code view, live preview |
| Project export (zip + README) | 2025-09 | Runnable PyGame source on disk |
| GitHub Pages deploy workflow | 2025-09 | Static SPA deploys on `push: main` |

## Next (queued, no commitment yet)

Sized roughly so any one item is a single PR.

### Toolchain bumps (next PR after this one lands)

- **`pnpm` 10.33** — replace npm.
- **TypeScript 6.0.3** — major version bump.
- **Biome 2.4.14** — replace ESLint + Prettier.
- **Vite 8 + Vitest 4 + @vitest/browser 4** — single coordinated bump.
- **React 19** — concurrent mode and new error boundaries.

### Type / schema cleanup

- **Unify the parallel pygame-component layers.** `src/pygame/components/types.ts` (canvas-rendering primitives) and `src/pygame/components/system-types.ts` (gameplay systems with variants/category) share names but have different shapes. Either merge or document the seam.
- **Treat `@typescript-eslint/no-explicit-any` as `error`** (currently `warn`). Fix existing `any`s in the same PR. Likely subsumed by the Biome migration.
- **Re-enable Vitest coverage thresholds** (90/85/90/90 lines/branches/functions/statements).

### Visual / accessibility

- **Visual regression baseline** (Playwright screenshots, per-project).
- **`@axe-core/playwright` accessibility checks** in the e2e suite.
- **Wizard-dialogue integration tests** are still failing (pre-existing) — needs a refresh against the persistence shape changes.

### Pyodide / PyGame

- **Cold-start budget.** First-load Pyodide is the biggest perf cost; track + budget it.
- **Frame-rate test** for the simulator under realistic component counts.
- **Component-project Pyodide test** that runs each lesson's `solution` through the worker and asserts `score === 1.0` (the unit-level structural tests catch authoring mistakes; this catches grader regressions).

### Content

- **More lessons.** The six shipped in T4.4 are the foundations track; data structures, files, classes still to come.
- **Per-game-type playtest follow-ups.** Each `docs/playtests/` file lists open tuning items; convert the most-blocking into wizard PRs.

## Blocked / waiting

_None right now._

## Conventions for this file

- **Active** is the work in flight on the current branch (or branches you intend to merge soon). Move items out as they ship.
- **Done** keeps recent milestones for context — prune anything older than the last release line in `CHANGELOG.md`.
- **Next** is intentionally short and unowned; this is a queue, not a roadmap.
- Each line should fit in one breath. Detail goes in the linked PR or doc.
- Update `updated:` in the frontmatter on every edit.
