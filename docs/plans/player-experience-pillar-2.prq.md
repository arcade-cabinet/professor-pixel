---
title: Player Experience Pillar 2
status: draft
updated: 2026-05-05
domain: technical
---

## Overview

Pillar 1 (PR #25, P1–P10) closed the major engine prerequisites surfaced by the playtests: wizard `gameAssembled` action gate, `isWizardComplete` derived state, `recoverPyodide()` + Try Again UI, lessons index page, asset/audio/a11y surfaces, ZIP export with Web Share fallback, and the WYSIWYG↔Code V1 boundary. The Death/Respawn and Game Over scenes were explicitly handed off to content authors as flow-JSON edits.

This PRQ scopes the remaining **engineering** gaps the player will hit. It deliberately excludes the content-design items called out as "engine-enabled, content-pending" in `docs/playtests/`. Every item here is observable in code today and produces a kid-visible defect, dead-end, or quality regression.

The biggest single defect is the runner's hardcoded "auto-press SPACE after 3 seconds" demo hack in `app/components/pygame/runner.tsx` (line ~316). It ships in production. Anything kids build in the wizard inherits this artificial input event whether they want it or not. That alone justifies the next pillar. The rest cluster around wizard template hygiene, dev-only screens leaking into production routing, and persistence/discovery polish.

Items are ordered kid-impact descending.

---

### ~~P1 — Remove the runner's hardcoded SPACE auto-press demo~~ — CLOSED in PR #25

**What:** Delete the `setTimeout(..., 3000) → simulate SPACE` block in `app/components/pygame/runner.tsx` that fires a synthetic key event into every game the kid runs. **Why kid cares:** Their game receives a phantom SPACE press 3 seconds in — title screens auto-skip, jumps fire by themselves, score increments without input. It is a demo crutch from the original Replit scaffold that was never removed.

- [x] P1.1 Stripped the `setTimeout` + `global_key_state.set_key(32, True)` block from `runGame()`. The real Pyodide async run is preserved unchanged.
- [ ] P1.2 (deferred — `if __name__` rewrite duplicate-transform check is a polish item; not user-visible)
- [x] P1.3 No auto-progression occurs. The kid's keyboard input is the only thing driving the game now.
- [ ] P1.4 (deferred — pinning component test for the absence of synthetic events deserves its own commit; the user-visible defect is closed)

---

### ~~P2 — Strip `# TODO:` comments from wizard-generated game templates~~ — CLOSED in PR #25

**What:** `src/wizard/game-templates.ts` ships eight `# TODO: Handle key presses here` / `# TODO: Update your game logic here` literals inside the Python the wizard produces. **Why kid cares:** They open the Code tab after the wizard finishes and see four `# TODO:` lines staring at them — implying their game is broken or incomplete. The directive's "Forbidden phrases" rule explicitly bans `TODO` / `placeholder` / `stub` in shipped artifacts.

- [x] P2.1 Rewrote all eight `# TODO:` markers in `src/wizard/game-templates.ts` as kid-encouraging hints: "Add your own game objects below — try a Player(), an enemy, or a score!" / "Add more keys below — pygame.K_LEFT, pygame.K_UP, pygame.K_a, etc." / "Try adding a scoring system, level progression, or special rare gems!" — none read as broken/incomplete.
- [ ] P2.2 (deferred — visible-out-of-the-gate audit is a content-design call; templates already render something)
- [ ] P2.3 (deferred — regression-pinning test for absence of TODO/FIXME in templates; useful for the next PR)
- [ ] P2.4 (deferred — same regression in the export ZIP)

---

### ~~P3 — Gate `_dev/` routes behind the debug flag~~ — CLOSED in PR #25

**What:** `/asset-test`, `/pygame-preview-test`, `/persistence-test` are wired into the production `<Switch>` in `app/App.tsx` and reachable by URL guess in any deployment. **Why kid cares:** A curious kid (or a search-engine crawler) hitting `/persistence-test` sees an internal storage-debug screen with raw IndexedDB dumps, not a kid-friendly 404.

- [x] P3.1 The three `_dev` routes in `app/App.tsx` are now wrapped in `{debugEnabled && <Route ... />}` guards via `useDebugFlag()`. Without the flag, wouter falls through to `<NotFound />`. The hook reads `?debug=1` query param OR `localStorage.debug='1'`.
- [ ] P3.2 (deferred — banner on each _dev page is a polish item; the flag-gating is the security/safety win)
- [ ] P3.3 (rolled into P10 of pillar 1 follow-up; current frontend doc still describes _dev as production-routed)
- [ ] P3.4 (deferred — pinning test for the route-gate; current shipping behavior is correct)

---

### P4 — Polish the kid-friendly NotFound page

**What:** `app/pages/not-found.tsx` exists but the lessons-index pillar didn't touch it. Confirm it has Pixel mascot + a clear "back to home" CTA + no stack-trace leakage. **Why kid cares:** Mistyped URLs and stale bookmarks dump kids into a confusing dead-end.

- [ ] P4.1 Read `app/pages/not-found.tsx`; verify it shows Pixel + a "Back to Home" link + a "Go to Lessons" link (the two real entry points).
- [ ] P4.2 If it's a generic shadcn placeholder, replace with a kid-themed message that names what went wrong ("That page doesn't exist — let's get you back to building!").
- [ ] P4.3 Add `tests/component/not-found.test.tsx`: renders Pixel image, has both home + lessons CTAs, no `Error` / stack text.

**Acceptance:** Manual visit to `/banana` shows a friendly screen with two working escape hatches; component test pins it.

---

### P5 — Surface multi-project save/load to the player

**What:** `src/storage/client.ts` already implements `listProjects()` / per-project save, but the UI never exposes a project list. The kid can build one game, refresh, and only get back to it via the wizard's persistence — there's no "open my other game" affordance. **Why kid cares:** Building a second game silently overwrites the first, or worse, the kid thinks the first one is gone forever.

- [ ] P5.1 Add a "My Games" section to the home page (`app/pages/home.tsx`), populated from `listProjects('anonymous-user')`. Empty state: "No saved games yet — start the wizard to build one!"
- [ ] P5.2 Each row: game name, last-edited timestamp, "Open" button (resumes wizard at last step) + "Delete" with confirm.
- [ ] P5.3 When the wizard hits `gameAssembled`, save under a unique project id (gameType + timestamp), not a singleton key.
- [ ] P5.4 Add `tests/integration/multi-project.test.tsx`: build two games, refresh, both appear in My Games, opening either restores its state.

**Acceptance:** Kid builds two games on the same browser, sees both on the homepage, can open and continue editing either.

---

### P6 — Pause + Reset controls in the live preview

**What:** `app/components/pygame/live-preview.tsx` has `resetPygameState()` plumbed but no Pause control. Once the game runs, the only way to stop it is to navigate away or reset (which loses any in-game state). **Why kid cares:** They want to inspect a frozen frame ("why is my sprite there?") without losing the run, or to make a code edit while the game is paused.

- [ ] P6.1 Add a Pause button to `live-preview.tsx` toolbar that toggles the rAF loop without tearing down the Pyodide state.
- [ ] P6.2 When paused, overlay a "Paused — press Resume" indicator on the canvas.
- [ ] P6.3 Wire keyboard `P` key to toggle pause (only when canvas is focused; don't steal input when the kid is typing in the code editor).
- [ ] P6.4 Add `tests/component/live-preview.test.tsx` Pause/Resume case: rAF callbacks halt while paused, resume on toggle.

**Acceptance:** Kid clicks Pause, the game freezes mid-frame; clicks Resume, it continues from the same state.

---

### P7 — Profile page and rename flow

**What:** `loadProfile()` / `saveProfile()` exist in `src/storage/profile.ts`, the lessons page has a profile-name `<Input>`, but there is no dedicated profile page and no way to change the name once set without going to /lessons. **Why kid cares:** Sibling-shared device — Maya types her name; her brother Jake opens the app and sees "Welcome back, Maya!" with no obvious way to switch.

- [ ] P7.1 Add `/profile` route + `app/pages/profile.tsx` with name field, "Switch user" button (resets `onboardingComplete` + clears progress with confirm), and a summary of completed lessons.
- [ ] P7.2 Add a profile-name affordance to the home page header so the kid can edit without navigating.
- [ ] P7.3 Wire to PixelMenu's existing "View Progress" button so it opens `/profile` for the avatar/name area and `/lessons` for lesson list.
- [ ] P7.4 `tests/component/profile-page.test.tsx`: rename persists to localStorage; "Switch user" clears progress and re-shows the intro card.

**Acceptance:** Two siblings can swap profiles on the same device without dev tools.

---

### P8 — Audio toggle in the persistent UI chrome

**What:** `src/audio/tts.ts` + `src/audio/sfx.ts` exist; the docs claim "audio is opt-in". But there's no global audio-toggle button visible in the chrome — it lives somewhere in PixelMenu or settings nowhere obvious. **Why kid cares:** Classroom or shared-room use needs a one-click mute. Today the kid has to wait through every TTS line.

- [ ] P8.1 Add a `<AudioToggle>` button to `app/components/header.tsx` (and the PixelMinimized chrome) that flips a `localStorage.audioEnabled` key.
- [ ] P8.2 `src/audio/tts.ts` `speak()` no-ops when `audioEnabled === 'false'`; `src/audio/sfx.ts` `play*` functions same.
- [ ] P8.3 Icon reflects state (speaker / speaker-muted from lucide-react). Persist across reloads.
- [ ] P8.4 `tests/component/audio-toggle.test.tsx`: click mutes; subsequent `speak()` calls no-op; state survives a remount.

**Acceptance:** One click anywhere in the app mutes all audio; one click unmutes.

---

### P9 — Restart-from-checkpoint when the game crashes

**What:** `recoverPyodide()` (P7 of the previous pillar) drops the Python runtime when the kid clicks "Try Again". But it discards the kid's wizard-built game state too — they have to re-open `/wizard` and re-assemble. **Why kid cares:** A runtime error inside their game shouldn't punt them back to the wizard. They want to fix the bug and re-run, not rebuild.

- [ ] P9.1 In `app/components/pygame/runner.tsx`, after `recoverPyodide()` resolves, automatically re-load the kid's last-saved project (via `loadProject()` from `src/storage/client.ts`) before showing the canvas.
- [ ] P9.2 Add a "Show error details" disclosure under "Try Again" that reveals the Python traceback (only the kid-relevant frames — strip Pyodide internals via `src/errors/educational.ts` mapping).
- [ ] P9.3 If recovery itself fails (e.g., CDN down), surface a distinct message + offline-aware retry with exponential backoff.
- [ ] P9.4 `tests/integration/runner-recovery.test.tsx`: simulate a Python error, click Try Again, confirm runner re-renders the same project without wizard navigation.

**Acceptance:** Kid's game crashes; they click Try Again; the same game canvas reappears ready to run, project intact.

---

### P10 — Empty-state guard on `/lessons` when lessons.json is empty

**What:** `app/pages/lessons.tsx` queries `loadLessons()` and renders rows. It handles loading; it does not handle "lessons array is empty" or "fetch failed but didn't throw". **Why kid cares:** A bad deploy or a stale CDN cache leaves the kid staring at an empty page with no way to get unstuck.

- [ ] P10.1 Add an empty-state branch to `lessons.tsx`: "Lessons couldn't load — check your connection and refresh." Include a Refresh button + a "Skip to wizard" link.
- [ ] P10.2 Distinguish error from empty: React Query `isError` shows "We couldn't reach the lesson library"; `data?.length === 0` shows "No lessons available yet".
- [ ] P10.3 Add unit + component tests for both branches.

**Acceptance:** Lesson load failure or empty array produces a kid-friendly screen with two recovery paths.
