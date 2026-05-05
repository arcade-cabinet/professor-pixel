---
title: State
updated: 2026-05-04
status: current
domain: context
---

# State

> What's done, what's actively in flight, what's queued. Updated whenever a meaningful slice ships or the next-up changes. If this doc and `git log` disagree, fix this doc.

## Active

_No work in flight. The grader-followups pillar (`feat/grader-followups-pillar`) and the `any` cleanup pillar (`feat/any-cleanup-pillar`, PR #21) are queued for review and squash-merge to `main`._

## Done (recent milestones)

| Milestone | When | Notes |
|-----------|------|-------|
| Grader follow-ups pillar (worker-side variableExists + dev HUD) | 2026-05 | Branch: `feat/grader-followups-pillar`. G1: `runtimeRules.variableExists` now reads from a worker-collected `globals` snapshot (`inspectGlobals` plumbed through `RunOptions → CodeRunnerOptions → runSnippet`), fixing the silent-false bug where main-thread Pyodide never saw worker-routed snippets' globals. G2: `app/components/dev-hud.tsx` floating panel reading cold-start ms + Pyodide state, gated by `useDebugFlag()` (`?debug=1` or `localStorage.debug='1'`). |
| `any` cleanup pillar (TypeScript discipline) | 2026-05 | Branch: `feat/any-cleanup-pillar`. 213 `any` annotations → 0; Biome `noExplicitAny` flipped from `warn` → `error`. Authored `PyodideInstance` ambient; defensive `ErrorShape` probe pattern for catch blocks; `PyGameComponent<P extends object>` generic + `AnyPyGameComponent` erased view at registry boundary; `PygameColor` / `PygameRectArg` / `PygameSprite` runtime types in simulator with tuple-cast destructures per renderer case; debounce branded as `<TArgs extends unknown[]>`. |
| Modernization pillar (toolchain bumps + correctness gaps) | 2026-05 | Branch: `feat/modernization-pillar`. M1.1–M1.5 toolchain (pnpm 10, TS 6, Vite 8 + Vitest 4, React 19, Biome 2.4); M2.3 quarantined wizard test removed; M3.1 visual regression baseline; M3.2 axe-core a11y suite; M4.1 cold-start budget instrumentation; M4.3 worker-side stdout truncation; M5.1 sys.settrace functionCalled instrumentation; M5.2 input() call counter; M6.1 lessons 7-9 (lists, files, classes). |
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

### Wizard / coverage / simulator-harness PRQ (carved off modernization-M2.2 + -M2.3 + -M4.2)

- Re-enable Vitest coverage thresholds — currently statements: 7.15% / branches: 5%. Setting 90/85/90/90 today would lock CI red. Strategy: ratchet thresholds up incrementally (start at 10/10/10/10, raise per-PR).
- Focused integration tests for whichever wizard-flow paths still need coverage after the dialogue-engine restructure (replaces the deleted `wizard-dialogue-engine.test.tsx`).
- Simulator test harness: stand up a deterministic mounting API for `src/pygame/runtime/simulator.ts` so the frame-rate test (M4.2 deferred) can actually be authored.

### Per-game-type playtest follow-ups

Each `docs/playtests/` file lists open tuning items; convert the most-blocking into wizard PRs.

- `docs/playtests/breakout.md` — calibration on launch angle and brick row count.
- `docs/playtests/collecting.md` — drop rate vs movement speed balance.
- `docs/playtests/platformer.md` — jump arc tuning across keyboard / touch.
- `docs/playtests/pong.md` — paddle control feel on mobile.
- `docs/playtests/shooter.md` — projectile cooldown and enemy density.

(One item per playtest file with a one-line note of the most-blocking tune.)

## Blocked / waiting

_None right now._

## Conventions for this file

- **Active** is the work in flight on the current branch (or branches you intend to merge soon). Move items out as they ship.
- **Done** keeps recent milestones for context — prune anything older than the last release line in `CHANGELOG.md`.
- **Next** is intentionally short and unowned; this is a queue, not a roadmap.
- Each line should fit in one breath. Detail goes in the linked PR or doc.
- Update `updated:` in the frontmatter on every edit.
