---
title: State
updated: 2026-05-04
status: current
domain: context
---

# State

> What's done, what's actively in flight, what's queued. Updated whenever a meaningful slice ships or the next-up changes. If this doc and `git log` disagree, fix this doc.

## Active

### Capacitor-style layout + browser-only deploy (this branch: `feat/foundations-and-asset-library`)

Strip the Express/Drizzle/passport scaffolding, flatten the tree to a single `app/` + `src/` + `public/` at the repo root, replace the 3137-line static asset registry with a build-time catalog, and reorganise tests into Vitest projects + Playwright e2e.

- [x] R1 — Delete `apps/` + `packages/` (zero-usage workspaces).
- [x] R2 — Delete `server/`, `shared/` (split into `src/`), Selenium tests, and server-runtime deps.
- [x] R3 — Merge three `public/` directories into one.
- [x] R4 — Move `client/index.html` to repo root; update `vite.config.ts`.
- [x] R5 — Split `client/src/` into `src/` (`.ts`) + `app/` (`.tsx`) with proper domain folders.
- [x] R6 — Bulk-rewrite imports via perl across `app/`, `src/`, `tests/`.
- [x] R7 — Move root `assets/` into `app/assets/pixel/` (bundled portraits) + `scripts/asset-generator/` (build-side generators).
- [x] R8 — Replace `_kenney-*.ts` / `_curated-*.ts` with `scripts/build-asset-catalog.mjs` + `@lib/assets/catalog`.
- [x] R9 — Reorganise tests into `unit` / `integration` / `component` (Vitest browser) / `e2e` (Playwright); declare Vitest projects.
- [x] R10 — Close out remaining tsc errors (168 → 0).
- [x] R11 — Update docs to reflect new layout (this commit).

## Done (recent milestones)

| Milestone | When | Notes |
|-----------|------|-------|
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

- **Convert `src/types/schema.ts` to Zod.** TypeScript interfaces today; the standard is Zod-first with `z.infer` re-exports.
- **Unify the parallel pygame-component layers.** `src/pygame/components/types.ts` (canvas-rendering primitives) and `src/pygame/components/system-types.ts` (gameplay systems with variants/category) share names but have different shapes. Either merge or document the seam.
- **Treat `@typescript-eslint/no-explicit-any` as `error`** (currently `warn`). Fix existing `any`s in the same PR. Likely subsumed by the Biome migration.
- **Re-enable Vitest coverage thresholds** (90/85/90/90 lines/branches/functions/statements).

### Test logic catch-up

- **Make integration + component tests blocking in CI.** They're advisory today because pre-existing tests need to catch up with the R5/R6 module renames and the SessionActions / persistence shape changes.
- **Visual regression baseline** (Playwright screenshots, per-project).
- **`@axe-core/playwright` accessibility checks** in the e2e suite.

### Pyodide / PyGame

- **Cold-start budget.** First-load Pyodide is the biggest perf cost; track + budget it.
- **Frame-rate test** for the simulator under realistic component counts.

### Content

- **Per-game-type playtest follow-ups.** Each `docs/playtests/` file lists open tuning items; convert the most-blocking into wizard PRs.

## Blocked / waiting

_None right now._

## Conventions for this file

- **Active** is the work in flight on the current branch (or branches you intend to merge soon). Move items out as they ship.
- **Done** keeps recent milestones for context — prune anything older than the last release line in `CHANGELOG.md`.
- **Next** is intentionally short and unowned; this is a queue, not a roadmap.
- Each line should fit in one breath. Detail goes in the linked PR or doc.
- Update `updated:` in the frontmatter on every edit.
