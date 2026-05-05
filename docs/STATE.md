---
title: State
updated: 2026-05-05
status: current
domain: context
---


# State

> What's done, what's actively in flight, what's queued. Updated whenever a meaningful slice ships or the next-up changes. If this doc and `git log` disagree, fix this doc.

## Active

| Branch | PR | Status |
|--------|----|----|
| `feat/modernization-pillar-closeout` | #30 | CHANGES_REQUESTED → 5 fold-forward batches pushed; main merged in (PR #24 45-pkg bundle); pygame-ce wheel vendored at install time + packageBaseUrl routed at /pyodide/ so loadPackage() never hits a CDN; launcher-e2e test passes against real WASM in CI; pnpm overrides + @playwright/test bump close 22→20 alerts; Android security hardening (trusted-ref guard on signed releases, late keystore decode, allowBackup off, real applicationId in test, gradle versionCode/Name as project properties); awaiting reviewer approval to dismiss stale CHANGES_REQUESTED |

## Done (recent milestones)

| Milestone | When | Notes |
|-----------|------|-------|
| Post-launcher consolidation pillar (C1–C4) | 2026-05-05 | Branch: `feat/modernization-pillar-closeout`, PR #30. ONE PRQ closing everything that fell out of the launcher PR + the modernization debt + Capacitor distribution. C1 frame-rate test (already authored under modernization omnibus, satisfied) + coverage thresholds ratcheted 12/9/8/11 → 26/21/21/26 to match post-launcher coverage jump. C2 direct-dep security bumps: jsdom 27→29 (PR #16) merged; @types/node 20→25 (PR #18) and the 45-package minor/patch bundle (PR #24) triggered to rebase against the new lockfile. C3 Capacitor Android shell at @capacitor/* 8.3.1 — `npx cap init` + `cap add android`; SW registration short-circuits inside `capacitor:` protocol (WASM ships in APK, nothing to cache); signing.properties.example committed; cd-mobile.yml builds debug APK on every main push as 14d artifact, signed-release job behind `android-release` GitHub environment. C4 docs sweep — DEPLOYMENT.md adds Mobile (Capacitor) section with per-OS workflows; STATE.md updated (this row); modernization PRQ M2.2 + M4.2 already [x], no flip needed. |
| Launcher + OPFS-cached Pyodide + send-mode export | 2026-05-05 | Branch: `feat/modernization-pillar-closeout`, PR #30. Service worker (`public/pyodide-sw.js`) intercepts `/pyodide/*` requests, atomic-writes them through `<file>.tmp` rename to OPFS, version-keyed eviction on activate. Allowlist of [.wasm .js .mjs .json .zip .data] extensions + Content-Type match before persisting (defense against CDN misroute / captive-portal HTML poisoning the cache). `src/storage/opfs-projects.ts` is the new home for kid-saved games; `src/storage/projects.ts` routes through `shouldUseOpfs()` cached probe with localStorage fallback for jsdom/private-mode. `src/storage/opfs-migration.ts` one-shot copies `pygame_academy_projects` localStorage → OPFS, idempotent via OPFS sentinel, retries on OPFS write failures (sentinel only sealed when no writes failed). New `/play/:projectId` page (`app/pages/play.tsx`) launches a saved game using the same `compilePythonGame` the exporter uses (single source of truth). Send-mode export refactored to one-way Drive/iCloud share — no import-from-zip. PWA manifest landed for Add-to-Home-Screen install. |
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

- **PR #30 squash-merge.** All four fold-forward batches landed (1+2+3+4); main merged in via 5165e74; CI green on Biome + Type check + build, awaiting Vitest + CodeQL + CodeRabbit re-pass. Dependent dep PRs #18 (@types/node 25) and #24 (45-pkg bundle) are already merged into main and folded into this branch via merge commits, so the squash brings everything in one shot. Dependabot PR #14 (react-resizable-panels 2→4) is superseded — we landed the v4 bump on this branch with the v3-API-rename fix in `app/components/ui/resizable.tsx` instead.
- **Play Store rollout** for the Capacitor Android shell. Generate the release keystore (one-time), add the four `ANDROID_KEYSTORE_*` repository secrets, run `cd-mobile.yml` with `inputs.release=true`, upload the resulting APK via Play Console.
- **iOS TestFlight** build — manual Mac+Xcode flow per `docs/DEPLOYMENT.md → iOS workflow`. Requires Apple Developer account.
- **Content tracks.** The remaining `**WEAK**` / `**FIX**` items in `docs/playtests/*.md` are flow-JSON content authoring (theme packs, A/B framing of asset pickers, missing scene additions). The dialogue engine supports them today; what's missing is content. Tracked as content-design work, not engineering.

## Blocked / waiting

_None right now._

## Conventions for this file

- **Active** is the work in flight on the current branch (or branches you intend to merge soon). Move items out as they ship.
- **Done** keeps recent milestones for context — prune anything older than the last release line in `CHANGELOG.md`.
- **Next** is intentionally short and unowned; this is a queue, not a roadmap.
- Each line should fit in one breath. Detail goes in the linked PR or doc.
- Update `updated:` in the frontmatter on every edit.
