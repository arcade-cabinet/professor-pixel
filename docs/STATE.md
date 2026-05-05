---
title: State
updated: 2026-05-04
status: current
domain: context
---

# State

> What's done, what's actively in flight, what's queued. Updated whenever a meaningful slice ships or the next-up changes. If this doc and `git log` disagree, fix this doc.

## Active

### Modernization pillar (this branch: `feat/modernization-pillar`)

Bundle every remaining toolchain bump + correctness gap from the prior STATE.md → Next into one coordinated PR with one commit per concern. Source PRQ: [`docs/plans/modernization-pillar.prq.md`](plans/modernization-pillar.prq.md).

- [x] M1.1 — pnpm 10.33 replaces npm. `packageManager: pnpm@10.33.2` pinned, `pnpm-lock.yaml` committed, all three GitHub Actions (`ci.yml`, `cd.yml`, `release.yml`) use `pnpm/action-setup@v4` with `cache: 'pnpm'`.
- [x] M1.2 — TypeScript 6.0.3 bump. Dropped deprecated `baseUrl` from `tsconfig.json` (paths still resolve relative to tsconfig dir). One source migration: `getFromLocalStorage<T>` JSON.parse cast tightened.
- [x] M1.3 — Vite 8.0.10 + Vitest 4.1.5 + @vitest/browser 4.1.5 single coordinated bump. New dep `@vitest/browser-playwright` 4.1.5 (Vitest 4 split the provider out); vitest.config.ts uses `provider: playwright()` (callable) instead of `'playwright'` (string). Pyodide worker `await import('pyodide.mjs')` still bundles + loads.
- [x] M1.4 — React 19.2.5 + framer-motion 12.38.0. Source migrations: `useRef<T>()` now requires explicit initial value (3 hooks), JSX namespace dropped from global (1 type import added in `layout-manager.tsx`), react-dnd's `ConnectDragSource` no longer assignable directly to `Ref<T>` (1 callback-ref wrapping in `palette.tsx`).
- [x] M1.5 — Biome 2.4.14 replaces ESLint + Prettier. New `biome.json` matched to old ESLint rule set (recommended: false; targeted: noUnusedVariables, useExhaustiveDependencies, useHookAtTopLevel, noExplicitAny, noDoubleEquals, noArrayIndexKey). 218 files reformatted by `biome format --write` (no semantic changes). `pnpm lint` is now blocking in CI; ESLint/Prettier devDeps removed.
- [x] M2.3 — Quarantined `wizard-dialogue-engine.test.tsx` deleted (per "stubs are bugs" rule); exclude removed from vitest.config.ts. Focused replacement queued for the wizard-coverage PRQ.
- [x] M4.1 — Pyodide cold-start instrumented with `performance.now()`; budget (3s mid-tier laptop / 8s Chromebook) documented in `docs/pillars/02-runtime.md` with the remediation hierarchy. `getColdStartMs()` exposed for HUD use.
- [x] M4.3 — Stdout truncation moved into the worker's stdout callback (`appendStdout`); main-thread `verifyClippedResult` now defense-in-depth, not primary enforcement. New unit test proves the cap-miss fallback path.
- [ ] M3.1 — Playwright visual-regression baseline. `tests/e2e/visual.spec.ts` per route × viewport.
- [ ] M3.2 — `@axe-core/playwright` accessibility checks. `tests/e2e/a11y.spec.ts` zero WCAG 2.2 AA violations on major routes.
- [ ] M4.2 — Frame-rate test for the simulator. Component-project test asserts mean frame time <16.67ms over 2s with realistic component count.
- [ ] M5.1 — Real `functionCalled` instrumentation via worker-side monkey-patching.
- [ ] M5.2 — Real `acceptsUserInput` instrumentation via worker-side `input()` counter.
- [ ] M6.1 — Three more lessons: lesson-7 (lists), lesson-8 (files), lesson-9 (classes).
- [ ] M6.2 — STATE.md final pass (this entry, recursively).

## Done (recent milestones)

| Milestone | When | Notes |
|-----------|------|-------|
| Stabilization pillar (banner, type seam, grader e2e) | 2026-05 | Squashed into `8f478f8` on main; PR #20 |
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

### `any` cleanup PRQ (carved off M2.1)

Bulk `any → unknown` replacement was attempted during the modernization pillar and rolled back: replacing 209 instances mechanically caused 60+ cascading TS errors (Pyodide instances typed as `any` everywhere; runtime/error-handler/persistence shapes that need real types, not `unknown`). The fix is structural, not per-instance:

1. Author a real Pyodide type covering `runPython`, `runPythonAsync`, `globals.set/get`, `loadPackage` — replace `pyodide: any` with that type across simulator, error-handler, runner.
2. Type the legacy state shapes for `storage/persistence` migration (currently `Partial<unknown>` blows up the spread).
3. Walk the remaining files where `unknown` is the right answer, adding `instanceof Error` guards in catch blocks and `Record<string, unknown>` for prop bags.

Once 1+2+3 land, flip Biome's `noExplicitAny` to `error`.

### Wizard / coverage PRQ (carved off M2.2 + M2.3 follow-up)

- Re-enable Vitest coverage thresholds — currently statements: 7.15% / branches: 5%. Setting 90/85/90/90 today would lock CI red. Strategy: ratchet thresholds up incrementally as tests are added (start at 10/10/10/10, raise per-PR).
- Focused integration tests for whichever wizard-flow paths still need coverage after the dialogue-engine restructure.

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
