---
title: State
updated: 2026-05-04
status: current
domain: context
---

# State

> What's done, what's actively in flight, what's queued. Updated whenever a meaningful slice ships or the next-up changes. If this doc and `git log` disagree, fix this doc.

## Active

_No work in flight. The modernization pillar (`feat/modernization-pillar`) is queued for review and squash-merge to `main`._

## Done (recent milestones)

| Milestone | When | Notes |
|-----------|------|-------|
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

### `any` cleanup PRQ (carved off modernization-M2.1)

Bulk `any → unknown` was attempted in the modernization pillar and rolled back: replacing 209 instances mechanically caused 60+ cascading TS errors. The fix is structural, not per-instance:

1. Author a real Pyodide type covering `runPython`, `runPythonAsync`, `globals.set/get`, `loadPackage` — replace `pyodide: any` with that type across simulator, error-handler, runner.
2. Type the legacy state shapes for `storage/persistence` migration (currently `Partial<unknown>` blows up the spread).
3. Walk the remaining files where `unknown` is the right answer, adding `instanceof Error` guards in catch blocks and `Record<string, unknown>` for prop bags.

Once 1+2+3 land, flip Biome's `noExplicitAny` to `error`.

### Wizard / coverage / simulator-harness PRQ (carved off modernization-M2.2 + -M2.3 + -M4.2)

- Re-enable Vitest coverage thresholds — currently statements: 7.15% / branches: 5%. Setting 90/85/90/90 today would lock CI red. Strategy: ratchet thresholds up incrementally (start at 10/10/10/10, raise per-PR).
- Focused integration tests for whichever wizard-flow paths still need coverage after the dialogue-engine restructure (replaces the deleted `wizard-dialogue-engine.test.tsx`).
- Simulator test harness: stand up a deterministic mounting API for `src/pygame/runtime/simulator.ts` so the frame-rate test (M4.2 deferred) can actually be authored.

### Grader follow-ups (carved off modernization-M5.x)

- `runtimeRules.variableExists` consults the main-thread Pyodide globals, but the worker runs the code in its own Pyodide. Today the rule is effectively unusable for worker-routed lessons. Move the lookup to the worker side — `runSnippet` should accept `inspectGlobals: string[]` and return their values, mirroring the `trackFunctions` plumbing landed in M5.1.
- Dev HUD overlay for cold-start (deferred from M4.1 — needs a small floating debug-info panel).

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
