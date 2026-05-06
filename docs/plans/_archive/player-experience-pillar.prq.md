---
title: Player Experience Pillar
created: 2026-05-04
status: queued
domain: product+engineering
summary: Close the gaps a kid would actually notice — onboarding, audio, mobile editor, exportable game, a11y, error recovery, completion celebration.
---

# Player Experience Pillar

## Why this PRQ exists

The finishing-pillar PR (#23) closed engineering gaps (wizard tests, simulator harness, coverage thresholds, Biome cleanup, single-continue collapse, playtest CLOSED markers). What remains are gaps in the **actual end-to-end experience** an 8-year-old kid would notice on their first 10 minutes with the app.

The audit identified 1 blocker, 6 major, 3 minor gaps. They cluster into the "learn → build → share" arc:

- **Learn**: no audio, no onboarding, no progress visibility, no a11y.
- **Build**: editor unusable on tablet, code/visual sync is one-way, error recovery is broken when Pyodide times out.
- **Share**: there's no way to take the game home — `.py` download exists but no playable HTML wrapper, no asset bundling, no offline run.
- **Celebrate**: wizard completes silently — there's a `complete` node but no "Play your game now" affordance.

This PRQ collapses all of these into one branch. Same doctrine as finishing-pillar: ONE comprehensive PR for everything that should ship together.

## Branch

`feat/player-experience-pillar`

## Tasks

### P1 — Wizard completion + game launch (BLOCKER fold-in)

The wizard's `complete` node exists in every game-type flow JSON (`compileFullGame` action) but the user lands on it with no visible CTA to play their game. This is engine + content combined: the engine needs to recognize "we've reached the end of the wizard" and surface a launch button; the flow JSONs need a final node shape that triggers it.

- **P1.1** `app/components/wizard/dialogue-engine.tsx`: add `isWizardComplete` derived state — true when current node's `action` is `compileFullGame` OR node is terminal (no options, no next references). Surface as part of the hook's return.
- **P1.2** `app/components/wizard/universal.tsx`: render a prominent "▶ Play your game" CTA when `isWizardComplete` is true. Wired to `setUiState({ embeddedComponent: 'pygame-runner', pyodideMode: true, previewMode: 'full' })`.
- **P1.3** `tests/integration/wizard-completion.test.tsx` (new): drive the dialogue engine to a `compileFullGame` node, assert `isWizardComplete: true`, assert the CTA renders.
- **P1.4** Optional one-time celebration: confetti or sparkle animation when wizard first reaches complete (gate behind `sessionActions.gameAssembled` flag so it fires once per game, not every revisit).

### P2 — Onboarding & landing

The home page is currently 4 lines: just `<UniversalWizard/>`. A new kid sees Pixel say "Ready to make something amazing?" without knowing what they're being asked.

- **P2.1** `app/pages/home.tsx`: replace the bare wizard with a landing layout that offers two clear paths — "Build a game with Pixel" (→ wizard) and "Try a Python lesson" (→ lessons page). Show a 1-line description of each. Detect returning users (existing `loadWizardState()` non-null OR any lesson progress) and skip the chooser, going straight to whichever they used last.
- **P2.2** First-visit micro-tutorial: a small dismissible card pointing at the wizard's first option, titled "Pick what you want to make!". Use `localStorage` flag `pp.hasSeenIntro` to suppress on subsequent visits.
- **P2.3** Persist landing-choice telemetry to `sessionActions.lastLandingPath` so we can later prioritize the chosen path on return.

### P3 — Audio (Pixel speaks + sound effects)

Pixel's dialogues are emoji-heavy text. Silent for 8-year-olds is wrong.

- **P3.1** `src/audio/tts.ts` (new): thin wrapper around `window.speechSynthesis` (Web Speech API, browser-native — no service dependency). Function `speak(text: string, opts?: { rate, pitch, voice })`. Strip emoji + markdown before speaking. Idempotent: cancel previous utterance on new speak call.
- **P3.2** `app/components/wizard/dialogue-engine.tsx`: when `currentNode` text changes, call `speak(getCurrentText(...))`. Gate behind `localStorage.pp.audioEnabled` (default off — Web Speech triggers browser permissions in some configurations and we need explicit opt-in).
- **P3.3** `src/audio/sfx.ts` (new): a tiny SFX library — 3 sounds in `public/audio/`: `success.mp3` (lesson pass / wizard complete), `error.mp3` (grader fail / Pyodide error), `pop.mp3` (option select). Use the Web Audio API directly with one shared `AudioContext`; instantiate lazily on first user gesture (autoplay policy).
- **P3.4** Wire SFX: success on grader-passed lesson + wizard-complete CTA appearance; error on grader-failed + Pyodide timeout; pop on every wizard option click.
- **P3.5** Audio settings UI: a small speaker icon in the dev HUD area (or a corner of the wizard) toggling `pp.audioEnabled`. Mute by default until user enables.
- **P3.6** Tests: `tests/unit/audio-tts.test.ts` mocks `window.speechSynthesis`, asserts `speak()` cancels prior utterance, strips emoji, respects the mute flag.

### P4 — Mobile/tablet editor responsiveness

WYSIWYG editor is desktop-only at the moment. iPad portrait (768px) collapses the palette into an unusable strip.

- **P4.1** `app/components/editor/wysiwyg.tsx`: switch the layout from fixed-grid to a responsive split — palette as a slide-in drawer on `<lg` breakpoints, full sidebar on `lg+`. Hamburger button to toggle.
- **P4.2** `app/components/editor/palette.tsx`: ensure component cards are at least 48×48px touch targets. Stack vertically on phone-portrait, horizontally with overflow-scroll on phone-landscape.
- **P4.3** Drag-drop on touch: `react-dnd` already supports HTML5 + Touch backends; check our backend config and switch to `MultiBackend` if needed so finger-drag works.
- **P4.4** Visual regression: extend `tests/e2e/visual.spec.ts` to capture the editor at the 7 viewport sizes already in `playwright.config.ts`. Catch future regressions automatically.

### P5 — Accessibility (a11y)

Wizard option buttons have no `aria-label`, dialogue is mouse-only, screen readers hear "button" repeatedly.

- **P5.1** `app/components/wizard/universal.tsx`: add `aria-label` to every option button using the option text. Add `role="region"` + `aria-live="polite"` to the dialogue text container so screen readers announce node transitions.
- **P5.2** Keyboard navigation: `Enter` on a focused option fires `handleOptionSelect`; `1`–`9` number keys select the corresponding option in the visible list. Arrow keys navigate between options. Document the keyboard map in a focus-only tooltip.
- **P5.3** Focus management: on node transition, move focus to the new dialogue container so screen reader and keyboard users both know where they are.
- **P5.4** Color contrast audit: run axe-core (already wired in `tests/e2e/a11y.spec.ts`) against the wizard, lesson page, AND editor. Fix any failures. The existing axe suite covered `/` and `/lesson/lesson-1` — extend to the editor route.
- **P5.5** Reduced motion: respect `prefers-reduced-motion` — disable Pixel's float animation, the minimize transition, and the (new) celebration confetti when set.

### P6 — Project export (BLOCKER)

The kid can download a `.py` file via `code-panel.tsx`'s download button — but they can't run it. No assets are bundled, no HTML wrapper exists, no instructions for offline run. The "share my game with grandma" experience is broken.

- **P6.1** `src/export/bundle.ts` (new): function `bundleProject(opts: { code: string, assets: GameAsset[], gameName: string }): Promise<Blob>` returning a ZIP via `jszip` (already in deps from a-cleanup era — check; add if missing). Bundle includes:
  - `game.py` (the generated code)
  - `assets/` (sprite/sound/music files referenced by the code, fetched from `/public/assets/`)
  - `index.html` — a Pyodide-loading wrapper that renders the game in browser (Pyodide CDN URL since the kid won't have local Pyodide)
  - `README.md` — kid-friendly: "Open index.html in your browser to play! Send the whole folder to anyone — they can play it in their browser too."
- **P6.2** `app/components/editor/code-panel.tsx` `handleDownload`: replace the single-file download with a call to `bundleProject(...)` and trigger a ZIP download.
- **P6.3** Add a "Share" affordance: copy a `data:` URL or a Web Share API call (when available) so the kid can drop the game into a chat with a parent. Fallback to ZIP download if Web Share unavailable.
- **P6.4** Tests: `tests/unit/export-bundle.test.ts` validates ZIP contents — manifest of files inside, README exists, index.html references game.py.

### P7 — Pyodide error recovery

Currently a `while True:` infinite loop in user code times out the Pyodide worker but leaves the page in a weird state (worker stays terminated, no UI affordance to retry).

- **P7.1** `src/python/worker-runner.ts`: when timeout fires, recycle the worker (already partially supported per M5.3 deferred test caps). Surface a `runner.recover()` method that spins up a fresh worker.
- **P7.2** `src/grading/engine.ts:171`: replace the raw `"Your code took too long (more than ${ms}ms)"` with kid-friendly copy: "Whoa, that took too long! 🐢 Did you write a `while True` without a break? Try [Run Again] to start fresh." Render a "Run Again" button that calls `runner.recover()` + clears the editor's run state.
- **P7.3** Educational error pass: extend `src/errors/educational.ts` with patterns for the 5 most common Pyodide failures the playtests captured (NameError on undefined var, IndentationError, ZeroDivisionError, IndexError, KeyError). Each gets a 1-sentence kid-friendly explanation + a hint pointing at the lesson that introduced the relevant concept.
- **P7.4** localStorage quota check: on every `saveWizardState` call, catch the QuotaExceededError and surface a friendly toast "Your game progress couldn't save (storage is full). Want to clear old games?" with a button that calls `clearWizardState()`.
- **P7.5** Pyodide cold-start failure: if `getPyodide()` rejects (network down, CDN blocked), show a retry banner instead of a broken UI. Currently the dev HUD shows the cold-start time but nothing user-facing.

### P8 — Lesson progress visibility

Locked lessons show prerequisites; nothing shows progress.

- **P8.1** `app/components/lesson-progress-bar.tsx` (new): a thin progress bar showing "You've completed N of M lessons" + a star/badge for milestones (3, 5, 10 done). Read from `sessionActions.completedSteps` cross-referenced with `lessons.json`.
- **P8.2** `app/pages/lesson.tsx`: render the progress bar at the top of the lesson list. Add a "What's next?" callout under each completed lesson pointing at the natural next step in `sequenceLessons`.
- **P8.3** Cross-session identity: a lightweight `pp.profile = { name?: string, createdAt: ISODate }` in localStorage (NOT a real auth system — just a name the kid types in once). Wizard uses the name in dialogues ("{name}, ready to build?"). Settings page lets them change it.

### P9 — Code ↔ WYSIWYG sync

One-way: visual edits regenerate code, code edits don't update the visual. Kids hand-editing code lose their visual state on switch.

- **P9.1** Document the current limitation in `docs/pillars/01-frontend.md`: "Editor sync is one-way (visual → code). Hand-edited code does not propagate back to the visual palette. This is intentional for V1 — bidirectional sync requires an AST round-trip we haven't built yet."
- **P9.2** Add a "Code mode" / "Visual mode" toggle that warns the user before switching: "Switching to visual mode will discard your code edits. Continue?" Gate behind a `dirty` flag tracked on the code editor.
- **P9.3** P9 is intentionally smaller than P1-P8 — full bidirectional sync is a P-future PRQ.

### P10 — Docs / state sweep

- **P10.1** `docs/STATE.md`: move player-experience pillar Active → Done as a single milestone row when this PR merges. Refresh Next.
- **P10.2** `docs/pillars/01-frontend.md`: add subsections for "Audio surface", "Accessibility (a11y)", "Editor responsiveness", "Project export". Document the Web Speech opt-in, the keyboard map, the mobile drawer, the ZIP bundle format.
- **P10.3** `docs/pillars/02-runtime.md`: extend with the "Worker recovery" subsection — `runner.recover()` API + when to call it.
- **P10.4** `docs/playtests/`: annotate the per-game playtest files with closed markers for any items this PRQ resolves (notably "Death/Respawn" + "Game Over Screen" content from analysis.md if P1's CTA wires through).
- **P10.5** `.agent-state/directive.md` Status: ACTIVE → RELEASED.

## Out of scope

- **Account / multi-user**: no real auth, no server, no cloud sync. The localStorage `profile.name` is just a personalization handle — not an identity system.
- **Bidirectional code↔visual sync**: P9.3 explicitly defers full AST round-tripping.
- **Real TTS service**: Web Speech API is browser-native; we're not adding ElevenLabs / Polly / etc.
- **Multiplayer / leaderboards**: explicit out-of-scope per playtests/analysis.md "Low Priority".

## Test plan

- `pnpm check` clean
- `pnpm lint` 0 errors (folded the cleanup in finishing-pillar; this PR maintains)
- New unit tests:
  - `tests/unit/audio-tts.test.ts` (P3)
  - `tests/unit/export-bundle.test.ts` (P6)
- New integration:
  - `tests/integration/wizard-completion.test.tsx` (P1)
- Extended e2e:
  - `tests/e2e/visual.spec.ts` adds editor across 7 viewports (P4.4)
  - `tests/e2e/a11y.spec.ts` adds editor route (P5.4)
- Coverage thresholds: ratchet up to whatever the new floor measures (per the F1 ratchet doctrine).
- Manual: open the editor on iPad portrait, verify drawer works. Open the export ZIP, verify it runs in a vanilla browser tab from disk.

## Stop conditions

Same as finishing-pillar: STOP_FAIL only on real CI red, dependency deadlock, or explicit user halt. Survive compactions via `.agent-state/`.
