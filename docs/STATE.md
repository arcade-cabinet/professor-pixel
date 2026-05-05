---
title: State
updated: 2026-05-05
status: current
domain: context
---

# State

> What's done, what's actively in flight, what's queued. Updated whenever a meaningful slice ships or the next-up changes. If this doc and `git log` disagree, fix this doc.

## Active

_No work in flight._

## Done (recent milestones)

| Milestone | When | Notes |
|-----------|------|-------|
| Player-experience pillar (P1–P10) | 2026-05 | Branch: `feat/player-experience-pillar`. ONE comprehensive PRQ closing every gap surfaced by the playtests. P1 wizard-completion CTA (▶ Play your game) with `isWizardComplete` derived state gated on `compileFullGame + gameAssembled`. P2 landing chooser (Lessons / Game Wizard / Editor) with progress badge. P3 audio surface (`src/audio/` — TTS via Web Speech with emoji-strip + voiceschanged listener; procedural SFX tones via Web Audio; `Voice On/Off` menu toggle). P4 mobile/tablet WYSIWYG responsiveness (`useViewport` hook + drawer layout under `lg` + tap-to-arm-then-place fallback for touch + canvas-coordinate scaling fix). P5 a11y (option-handler `role=group` + per-option labels; dialogue text `role=status aria-live=polite`; prefers-reduced-motion gate on celebration). P6 BLOCKER full project export (`src/pygame/runtime/exporter.ts` — JSZip with game.py + index.html Pyodide bootstrap + README + assets/; Web Share API with download fallback). P7 Pyodide error-recovery (`recoverPyodide()` drops cached promise + window.pyodide; race-fixed via promise identity guard) + storage quota detection (cross-browser DOMException name/code/message regex; user-facing toast). P8 lessons index (`/lessons` route) with overall progress + per-lesson statusFor + `pp.profile` localStorage helper. P9 code-sync V1 boundary documented (visual→code one-way; `<aside role="note">` callout in code-panel; full-bidi P-future). P10 docs/state sweep (this row). 7 commits, 141 unit + 16 integration tests passing, lint + type clean, pipelined per-commit reviewer dispatch with findings folded forward. |
| Finishing pillar (coverage ratchet + wizard tests + simulator harness + F4.2 single-continue collapse + playtest doc sweep) | 2026-05 | Branch: `feat/finishing-pillar`. F1: Vitest coverage thresholds re-enabled at 6/4/4/6 against baseline 6.07/4.55/4.24/6.08 (ratchet doctrine: pin floor just above current, raise per-PR). F2: `tests/integration/wizard-dialogue-engine.test.tsx` (6 tests) covers default-flow load, handleOptionSelect navigation, sessionActions.choices, advance() through multiStep, persisted-state restore, transitionToSpecializedFlow → platformer-flow.json. F3: `tests/helpers/simulator-harness.ts` (Proxy-based fake CanvasRenderingContext2D + controlledTime via `vi.spyOn(performance, 'now')`); `tests/unit/pygame-simulator.test.ts` (5 tests, including M4.2 frame-rate band). F4: F4.2 single-continue option collapse (`CONTINUE_PATTERN` regex in `src/wizard/utils.ts` + `advance()` consumes single-continue option) — F4.1 `transitionToSpecializedFlow` and F4.3 auto-advance after asset selection were already correct in the post-restructure code, pinned by tests. F5: docs/playtests/{analysis,platformer,dungeon,puzzle,racing,rpg,space}.md annotated — engine-level CRITICAL items closed against 21dba7b; remaining `**WEAK**`/`**FIX**` items reframed as content-design, not engineering. |
| Grader follow-ups pillar (worker-side variableExists + dev HUD) | 2026-05 | Branch: `feat/grader-followups-pillar`, PR #22. G1: `runtimeRules.variableExists` now reads from a worker-collected `globals` snapshot (`inspectGlobals` plumbed through `RunOptions → CodeRunnerOptions → runSnippet`), fixing the silent-false bug where main-thread Pyodide never saw worker-routed snippets' globals. G2: `app/components/dev-hud.tsx` floating panel reading cold-start ms + Pyodide state, gated by `useDebugFlag()` (`?debug=1` or `localStorage.debug='1'`). |
| `any` cleanup pillar (TypeScript discipline) | 2026-05 | Branch: `feat/any-cleanup-pillar`, PR #21. 213 `any` annotations → 0; Biome `noExplicitAny` flipped from `warn` → `error`. Authored `PyodideInstance` ambient; defensive `ErrorShape` probe pattern for catch blocks; `PyGameComponent<P extends object>` generic + `AnyPyGameComponent` erased view at registry boundary; `PygameColor` / `PygameRectArg` / `PygameSprite` runtime types in simulator with tuple-cast destructures per renderer case; debounce branded as `<TArgs extends unknown[]>`. |
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

_Empty. The finishing pillar absorbed every remaining engineering carve-off (coverage ratchet, wizard tests, simulator harness, F4.2 single-continue collapse, playtest CLOSED markers). Subsequent work is unowned and unscoped — pick the next user-driven request._

The remaining `**WEAK**` / `**FIX**` items in `docs/playtests/*.md` are flow-JSON content authoring (theme packs, A/B framing of asset pickers, missing scene additions). The dialogue engine supports them today; what's missing is content. Tracked as content-design work, not engineering.

## Blocked / waiting

_None right now._

## Conventions for this file

- **Active** is the work in flight on the current branch (or branches you intend to merge soon). Move items out as they ship.
- **Done** keeps recent milestones for context — prune anything older than the last release line in `CHANGELOG.md`.
- **Next** is intentionally short and unowned; this is a queue, not a roadmap.
- Each line should fit in one breath. Detail goes in the linked PR or doc.
- Update `updated:` in the frontmatter on every edit.
