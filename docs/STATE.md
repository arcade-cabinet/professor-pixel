---
title: State
updated: 2026-05-04
status: current
domain: context
---



# State

> What's done, what's actively in flight, what's queued. Updated whenever a meaningful slice ships or the next-up changes. If this doc and `git log` disagree, fix this doc.

## Active

### Stabilization pillar (this branch: `feat/stabilization-pillar`)

Repair the gaps the foundations PR left open: missing page banner, parallel pygame-component type layers, and grader e2e coverage.

- [x] S1 — Restore page banner. Top-level `<header>` renders on all viewports; `responsive-wizard.test.tsx` (broken pre-Capacitor) replaced with a focused `page-banner.test.tsx`.
- [x] S2 — Component CI now blocking (dropped `continue-on-error`).
- [x] S3 — Pygame-component type seam named: `PygameSystemSpec` (gameplay) vs `PyGameComponent` (rendering primitive). Header comment in `system-types.ts` documents the seam.
- [x] S4 — Grader e2e: `tests/component/grader-e2e.test.tsx` runs every lesson's solution through the worker and asserts `score === 1.0`. Surfaced and fixed: AST-only steps (pygame lessons) used to score 0 because pyodide can't `import pygame`; engine now skips the execution-error short-circuit when no test depends on runtime state.
- [x] SD.1 — STATE.md refresh (this entry).

## Done (recent milestones)

| Milestone | When | Notes |
|-----------|------|-------|
| Foundations pillar (Pyodide worker, Zod lessons, AST grading, 6 lessons) | 2026-05 | Squashed into `f4f418d` on main; PR #19 |
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

- **Treat `noExplicitAny` as `error`** (currently `warn` after Biome migration in M1.5). 296 instances across the tree — slated for M2.1 of the modernization pillar.
- **Re-enable Vitest coverage thresholds** (90/85/90/90 lines/branches/functions/statements).

### Visual / accessibility

- **Visual regression baseline** (Playwright screenshots, per-project).
- **`@axe-core/playwright` accessibility checks** in the e2e suite.
- **Wizard-dialogue integration tests** are still failing (pre-existing) — needs a refresh against the persistence shape changes. Currently quarantined via `vitest.config.ts` `exclude`.

### Pyodide / PyGame

- **Cold-start budget.** First-load Pyodide is the biggest perf cost; track + budget it.
- **Frame-rate test** for the simulator under realistic component counts.
- **`functionCalled` / `acceptsUserInput` instrumentation.** Today these are approximated by stdout-substring + globals-existence checks (documented in `docs/pillars/04-grading.md`). Real call/input tracking needs worker-side instrumentation — a tracer that wraps target functions and a stdin-read counter exposed back across Comlink.
- **Worker-side stdout truncation.** `maxStdout` is currently applied after Comlink transfer, so megabytes can still cross the boundary. Move truncation into the worker's stdout buffer.
- **`mode: "rules"` lessons that depend on packages pyodide doesn't ship** (lesson-6 imports pygame). Engine now skips the execution-error short-circuit for AST-only steps; longer-term, `pyodide.loadPackage(...)` integration would let runtime checks work too.

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
