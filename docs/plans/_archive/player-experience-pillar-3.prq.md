---
title: Player Experience Pillar 3
status: draft
updated: 2026-05-05
domain: technical
---

## Overview

Pillar 1 (PR #25, P1–P3) shipped the engine prerequisites the playtests surfaced: removing the runner's auto-press SPACE hack, scrubbing `# TODO:` markers from wizard templates, and gating `_dev/` routes behind the debug flag. Pillar 2 (`docs/plans/player-experience-pillar-2.prq.md`) scoped the next round — NotFound polish, multi-project save/load, pause control, profile page, global audio toggle, recovery preserves project, lessons empty/error states (P4–P10).

This PRQ is the **second-pass audit**. It excludes P4–P10 from pillar-2 and focuses on kid-visible defects, dead-ends, and quality regressions that the first scout missed. Every item is observable in the codebase today on `main`/`feat/player-experience-pillar`. Items cluster around three themes the first pass under-examined:

1. **Silent failures.** The wizard's `window.toast` duck-punch is never installed, so export success/failure messages fall through to `console.log` — kids see nothing. `ClientStorage.saveToLocalStorage` has no try/catch, so quota-exceeded crashes the wizard. `code-panel.tsx` ignores the `navigator.clipboard.writeText()` Promise rejection and toasts "copied" when nothing was copied.
2. **Raw error leakage.** `runner.tsx:446` shows the raw JS error message ("Game execution error: TypeError: …") inside the kid-friendly panel. `lesson.tsx:254` renders raw `gradingError.message` to the kid as feedback. `error-boundary.tsx` uses adult language ("instructor", "logged in properly") that doesn't fit a kid audience.
3. **Discovery + WYSIWYG gaps.** No undo/redo, no keyboard delete, no copy/paste in the visual editor; components dragged with negative coordinates escape the canvas; Monaco loads from CDN with no fallback or loading indicator; `<img>` tags throughout the app have zero `onError` handlers.

Items are ordered kid-impact descending. Q1 and Q2 are blockers candidates for PR #25.

---

### Q1 — Wire wizard toasts to the real `<Toaster />` (currently silent)

**What:** `app/components/wizard/universal.tsx:617`, `:624`, `:803`, `:809` all read `(window as Window & { toast?: ... }).toast || console.log`. `window.toast` is never assigned anywhere in the codebase (`grep -rn "window.toast\s*="` returns zero hits). The shadcn `<Toaster />` IS mounted in `app/App.tsx:125`, but the wizard never calls `useToast()`. **Why kid cares:** They click "Export Game", the ZIP downloads (or fails), and they see nothing — no success confirmation, no error message. After a successful export they don't know it worked; after a failed export they don't know to retry.

- [ ] Q1.1 Replace the four `(window as Window & ...).toast` sites in `universal.tsx` with `useToast()` from `@/components/ui/toaster` (or `useToast` from `@/hooks/use-toast` if that's where the hook lives).
- [ ] Q1.2 Add a destructive `variant` for the failure path so the kid distinguishes success ("Game exported!") from error ("Couldn't export — try again").
- [ ] Q1.3 Add `tests/component/wizard-export-toast.test.tsx`: simulate `exportProjectAsZip` resolving and rejecting; assert a toast renders with the right variant in each case.

**Acceptance:** Successful export shows a green/default toast with the game name; failed export shows a destructive toast with a kid-friendly retry hint. Console no longer receives the toast payload.

---

### Q2 — Strip raw error strings from kid-facing surfaces

**What:** Three sites concatenate raw JS exception text into UI:
- `app/components/pygame/runner.tsx:51` — `Failed to initialize Pyodide: ${err}` shown via `setError`, then rendered at `:446` `<p className="text-sm mb-4 opacity-80 break-words">{error}</p>`.
- `app/components/pygame/runner.tsx:322` — `Game execution error: ${err}` follows the same path; kid sees the Python traceback verbatim.
- `app/pages/lesson.tsx:254` — `Grading failed: ${gradingError instanceof Error ? gradingError.message : String(gradingError)}` rendered as feedback.
- `app/components/pygame/live-preview.tsx:160` — `error.message` from a pygame failure displayed.

**Why kid cares:** Strings like "TypeError: Cannot read properties of undefined (reading 'getContext')" or "Pyodide.loadPackage: ChunkLoadError" are confusing, scary, and feel like the kid broke the app. The educational error mapper in `src/errors/educational.ts` already exists but isn't called on these paths.

- [ ] Q2.1 Route all four sites through `mapToEducationalMessage()` (or whatever the existing `src/errors/educational.ts` exposes). The raw text should remain available in the collapsible "Show details" disclosure but never as primary copy.
- [ ] Q2.2 Drop "Failed to initialize Pyodide:" / "Game execution error:" English prefixes — the educational mapper already returns titled copy.
- [ ] Q2.3 Add `tests/component/runner-error-mapping.test.tsx`: feed a synthetic `TypeError` and assert the rendered text is the mapped friendly copy, not the raw message.

**Acceptance:** No kid-facing screen renders text matching `/^(TypeError|ReferenceError|ChunkLoadError|Error):/` or `/at .+:\d+:\d+/`. Tracebacks live behind a "Show details" disclosure.

---

### Q3 — `ClientStorage.saveToLocalStorage` is unguarded — quota crashes the app

**What:** `src/storage/client.ts:46` runs `localStorage.setItem(key, JSON.stringify(data))` with no try/catch. Every project save, progress save, profile create — all of them — synchronously throw `QuotaExceededError` (Safari private mode, devices with full storage, classroom shared accounts). The other module `src/storage/persistence.ts` does this correctly via `handleStorageError`; `client.ts` was missed. **Why kid cares:** They finish a long lesson, click Save, and the entire page goes white because the unhandled exception bubbles to the React error boundary.

- [ ] Q3.1 Wrap `saveToLocalStorage` in try/catch matching `persistence.ts`'s `handleStorageError` pattern; on quota errors, surface a kid-friendly toast ("Your saves are full — clear old games first").
- [ ] Q3.2 Same treatment for `initializeLocalStorage` (lines 28–36) which also calls `setItem` raw.
- [ ] Q3.3 Add `tests/unit/client-storage-quota.test.ts`: stub `localStorage.setItem` to throw; assert no exception propagates to caller and a structured `Result` / sentinel comes back instead.

**Acceptance:** Forcing a quota error during `updateUserProgress` or `createProject` produces a toast and a logged error, not a white-screen crash.

---

### Q4 — Clipboard "copy" silently lies in the code panel

**What:** `app/components/editor/code-panel.tsx:106` runs `navigator.clipboard.writeText(generatedCode)` (returns a Promise) without `await` and without `.catch()`, then immediately fires a "Code copied!" toast at line 107. On non-secure contexts (HTTP), or when clipboard permission is denied, or in some embedded webviews, the Promise rejects but the kid sees a green confirmation. **Compare:** `app/components/floating-feedback.tsx:70-86` does it correctly — awaits, catches, shows a destructive toast on failure. The pattern is right there. **Why kid cares:** Kid opens the Code tab, taps Copy, sees "Code copied!", pastes into a chat with their friend — pastes nothing. No way to know it failed.

- [ ] Q4.1 Make `handleCopy` async, await the writeText, and mirror `floating-feedback.tsx`'s try/catch with a destructive-variant toast on rejection.
- [ ] Q4.2 Audit `app/pages/_dev/pygame-preview.tsx:342` for the same bug (probably same shape — fix proactively).
- [ ] Q4.3 Add `tests/component/code-panel-copy.test.tsx`: stub `navigator.clipboard.writeText` to reject; assert no "Code copied!" toast and a destructive toast appears.

**Acceptance:** Failed copies always produce a destructive toast; successful copies always produce a default toast. Never the wrong one.

---

### Q5 — `<img>` tags have zero `onError` fallbacks

**What:** `grep -rn 'onError=' app/ src/` returns zero hits across the bundled image surfaces. Sites where this matters:
- `app/components/wizard/asset-browser.tsx:164` and `:189` — asset thumbnails from `public/assets/` (kid sees a broken-image icon if the catalog drifted from disk).
- `app/components/pixel/presence.tsx:268`, `:295`, and ~6 more `<img src={pixelImage}>` — Pixel mascot portraits (a missing import becomes a broken-image where the kid expects Pixel's face).
- `app/pages/lesson.tsx:392`, `:412` — Pixel thinking image during loading state.

**Why kid cares:** A broken-image icon next to "Pixel says…" is more confusing than no image at all. Kids on flaky school wifi will see this regularly.

- [ ] Q5.1 Add a shared `<SafeImage>` wrapper component in `app/components/ui/safe-image.tsx` that renders the `src`, listens to `onError`, and on failure swaps to a category-appropriate text/emoji placeholder ("🎮", "🐍", or alt text in a styled box).
- [ ] Q5.2 Replace bare `<img>` in `asset-browser.tsx`, `presence.tsx`, `minimized.tsx`, `lesson.tsx`, `not-found.tsx` (when P4 lands), and `wizard/avatar-display.tsx` with `<SafeImage>`.
- [ ] Q5.3 Add `tests/component/safe-image.test.tsx`: simulate `onError`; assert fallback renders and `alt` text is preserved.

**Acceptance:** Forcing a 404 on every image src in the app never produces a broken-image icon; kids always see a styled fallback.

---

### Q6 — WYSIWYG editor has no undo/redo, no keyboard delete, no clamping

**What:** `app/components/editor/wysiwyg.tsx` and `app/components/editor/canvas.tsx` together expose: drag from palette → place; click → select; click+drag → move; Delete button (visible only when selected) → remove. Missing:
- **Undo/redo:** No history stack. `grep -n "undo\|history" app/components/editor/` returns nothing. A misclick that deletes a 30-minute build is permanent.
- **Keyboard Delete/Backspace:** Selecting a component and pressing Delete does nothing; the kid must mouse to the small `<Trash2>` button at canvas-top-right.
- **Drag clamping:** `canvas.tsx:212-220` writes `newX = (e.clientX - rect.left) * scaleX - PLACE_HALF` with no `Math.max(0, ...)` and no upper clamp. A kid drags a sprite past the left edge → it disappears off-canvas with no way to grab it back without deleting.
- **No copy/paste / duplicate:** Building a row of 5 enemies requires 5 separate drag operations.

**Why kid cares:** Each of these alone is a frustration; together they make the editor feel hostile to mistakes. Kids bail to the wizard's preset templates.

- [ ] Q6.1 Add a 50-step undo/redo stack to `wysiwyg.tsx` keyed off `placedComponents`. Cmd/Ctrl-Z and Cmd/Ctrl-Shift-Z bind to it; toolbar buttons surface it for touch users.
- [ ] Q6.2 Add a `keydown` listener on the canvas wrapper for `Delete` / `Backspace` when a component is selected → calls `handleComponentDelete(selectedComponentId)`.
- [ ] Q6.3 Clamp `x`/`y` in both `handleDrop` and `handleComponentMove` to `[0, canvas.width - 60]` × `[0, canvas.height - 60]` so components can't escape.
- [ ] Q6.4 Add a "Duplicate" button next to "Delete" that places a copy at +20/+20 offset from the original.
- [ ] Q6.5 `tests/component/wysiwyg-history.test.tsx`: place → delete → undo restores; redo re-deletes. `tests/component/wysiwyg-clamp.test.tsx`: drag past x=-50 lands at x=0.

**Acceptance:** Every destructive action in the editor is reversible. No component can land outside the visible canvas.

---

### Q7 — Monaco editor: CDN-only, no loading state, no fallback

**What:** `app/components/editor/code-editor.tsx:91` injects a `<script>` from `https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js`. Three problems:
- **No fallback:** If jsdelivr is blocked (school firewall, regional ISP, ad-blocker), the editor `<div>` stays empty. The kid sees a frozen page with no error.
- **No loading indicator:** Cold-start typically takes 1–3 seconds while Monaco's ~2MB of JS streams. The kid types into nothing during this window.
- **`wordWrap: 'off'`** (line 124): On phones and narrow tablets, lines longer than ~30 chars run off-screen with no horizontal scrollbar discoverability. The kid can't see their own code.
- **Re-mount churn:** Effect at `:185` deps `[onExecute, onChange, inputValues, code]` despite the comment claiming "empty dependency array is intentional". Each `inputValues` change re-runs the entire Monaco bootstrap.

**Why kid cares:** Network-fragile environments produce silent failures. Mobile users can't read their own code. Performance jank on every `inputValues` update.

- [ ] Q7.1 Wrap the Monaco load in `Promise.race` against a 10s timeout. On timeout, swap the editor `<div>` for a styled `<textarea>` fallback that still calls `onChange` — the kid keeps coding, just without syntax highlighting.
- [ ] Q7.2 Render a Pixel-themed loading state ("Pixel is loading the code editor...") while Monaco fetches; suppress only after `editor.create` resolves.
- [ ] Q7.3 Set `wordWrap: 'on'` when `useViewport().isCompact` is true; keep `'off'` on desktop where horizontal scroll is fine.
- [ ] Q7.4 Drop `onExecute`/`onChange`/`inputValues` from the load-effect's deps; capture them in a ref. Add a comment explaining why `code` is intentionally not a dep.
- [ ] Q7.5 `tests/component/monaco-fallback.test.tsx`: stub the `<script>` to fail; assert `<textarea>` fallback renders and accepts input.

**Acceptance:** Editor works (degraded, not broken) when CDN is unreachable. Mobile users see their full code without horizontal scrolling. No re-mount on `inputValues` change.

---

### Q8 — Mobile tap targets below 44px in Pixel chrome

**What:** `app/components/pixel/presence.tsx:266` sets the corner-mode Pixel avatar button to `w-10 h-10 md:w-12 md:h-12` — that's **40 × 40px on mobile**, below WCAG/iOS HIG 44px guidance. This button is the **primary mascot interaction surface** in the corner-mode UI; a kid with small fingers has to aim for it. **Compare:** `app/components/pixel/minimized.tsx:56` uses `w-12 h-12` on mobile (48px, OK) — the corner-mode button just got missed.

The same button at `:253` also lacks an explicit `aria-label`; screen readers announce it as just "Pixel" (the alt text on the inner `<img>`), not "Open Pixel menu".

**Why kid cares:** Missed taps on the help avatar in the corner of the screen.

- [ ] Q8.1 Bump `presence.tsx:266` to `w-11 h-11 md:w-12 md:h-12` (44px mobile).
- [ ] Q8.2 Add `aria-label="Open Pixel's help menu"` to the `<motion.button>` at `:253`.
- [ ] Q8.3 Audit other icon-only buttons in `app/components/pixel/menu.tsx` for the same issue (counted ~3 sub-44px buttons in initial scan; needs verification).
- [ ] Q8.4 `tests/component/pixel-corner-target.test.tsx`: render the avatar button at `width: 375px` viewport; assert `getBoundingClientRect()` reports ≥44px on both axes.

**Acceptance:** Every primary navigational icon-button is ≥44 × 44px on mobile and has an `aria-label`.

---

### Q9 — `lesson.tsx` non-null asserts an undefined lesson into Header

**What:** `app/pages/lesson.tsx:409` renders `<Header lesson={lesson!} progress={0} ...>` from inside the `if (!lesson)` branch. `lesson` is guaranteed-undefined inside that branch, but the non-null assertion (`!`) hides it from TypeScript. `Header` then dereferences `lesson.order`, `lesson.title` at `header.tsx:61-62` → `Cannot read properties of undefined (reading 'order')` at runtime. Trips the page error boundary, kid sees the generic adult error UI.

**Why kid cares:** Stale or invalid lesson IDs (e.g., shared link to a removed lesson) crash the page instead of showing the friendly "Lesson not found" card.

- [ ] Q9.1 Drop the `<Header>` render from the `!lesson` branch entirely — the "Lesson not found" card is enough; kids don't need a chrome header pointing at a missing lesson.
- [ ] Q9.2 Type-tighten by removing the `!` and letting TS reject the call — that's how this should have been caught.
- [ ] Q9.3 `tests/integration/lesson-not-found.test.tsx`: navigate to `/lesson/banana`; assert the friendly card renders with "Back to Lessons" and no error boundary trigger.

**Acceptance:** Mistyped lesson ID produces a friendly card, not a thrown render.

---

### Q10 — `error-boundary.tsx` uses adult/B2B copy, exposes raw `error.message`

**What:** `app/components/error-boundary.tsx` is the last line of defense before a kid sees a white screen. Its copy is wrong for the audience:
- Line 158: "If this keeps happening, let us know so we can fix it" (B2B).
- Line 284: "If this problem continues, please let your instructor know" (assumes school context).
- Line 145: "Make sure you're logged in properly" (this app has no login).
- Line 256: `<strong>Error:</strong> {this.state.error.message}` — raw JS error string in a "Technical Details" disclosure that's collapsible but still visible to the kid.

**Why kid cares:** When the worst happens, the screen feels generic and corporate. Pixel is gone, the warmth is gone, and there's a stack trace in plain sight.

- [ ] Q10.1 Rewrite the three copy sites in kid voice ("Pixel got confused — let's try again!" / "If this keeps happening, ask the grown-up who set this up.").
- [ ] Q10.2 Render Pixel mascot art in the error card (matches the rest of the app's voice).
- [ ] Q10.3 Replace `error.message` in the technical-details panel with the `errorId` only; the full message goes into `console.error` for the grown-up but is not shown.
- [ ] Q10.4 `tests/component/error-boundary-copy.test.tsx`: throw a `TypeError`; assert no rendered text contains "TypeError" / "logged in" / "instructor".

**Acceptance:** Kid sees Pixel + warm copy + a Try Again button. No JS-typed error text on screen.

---

### Q11 — WYSIWYG editor has no first-use tour or tooltips

**What:** `app/components/editor/wysiwyg.tsx` is a 425-line component with three panels (palette, canvas, properties). A first-time kid lands on it with zero context: what's the difference between dragging from the palette vs tapping? What does Snap do? What's "Visual" vs "Code"? `grep -n "Tooltip\|onboarding\|tour" app/components/editor/` returns essentially nothing. There ARE `aria-label`s for screen readers but no visible hover/tap tooltips for the icon-only Play/Pause/Reset/Grid/Snap buttons. **Why kid cares:** Discovery gap. The wizard hand-holds them up to the editor, then drops them in cold.

- [ ] Q11.1 Add a 4-step coach-mark overlay shown once on first editor open (gated by `localStorage.editorTourSeen='1'`): Palette → drag a Player. Canvas → tap to arm/place. Properties → tweak. Visual/Code tabs → switch view.
- [ ] Q11.2 Add `<Tooltip>` (shadcn) to every icon-only button in the editor toolbar (Play, Pause, Reset, Grid switch, Snap switch, Palette toggle, Properties toggle, Close).
- [ ] Q11.3 Add a "Show me again" button in the editor's overflow menu that re-triggers the coach-marks (pedagogically important — kids often want to re-watch the intro).
- [ ] Q11.4 `tests/component/editor-tour.test.tsx`: first render shows tour; localStorage flag set; second render skips.

**Acceptance:** A kid who has never seen the editor before is shown what each panel does; a returning kid isn't pestered.

---

### Q12 — `localStorage.setItem` calls scattered with no fallback for private mode

**What:** Beyond `client.ts` (Q3), other write sites have inconsistent guards:
- `app/pages/home.tsx:21-25` and `:36-41` — `try/catch` swallows silently with no user feedback.
- `src/storage/profile.ts:62` — same pattern, comment claims "surfaced via the global toast system" but no toast is wired (see Q1).
- `src/storage/session-history.ts:182` — write inside `setSessionHistory` lacks a try/catch (per the grep result).

**Why kid cares:** Safari private mode (the default on shared iPad/Chromebook in some classrooms) silently disables localStorage writes. The kid builds a game, refreshes, everything is gone, and there was never any warning that saves weren't sticking.

- [ ] Q12.1 Add a one-time-per-session `detectPersistentStorage()` check on app boot that writes a probe key and reads it back. On failure, surface a non-dismissable banner ("Saves won't stick on this browser — switch out of private mode to keep your games").
- [ ] Q12.2 Standardize on `persistence.ts`'s `handleStorageError` helper across all `setItem` sites in `src/`.
- [ ] Q12.3 `tests/integration/private-mode.test.tsx`: stub `localStorage.setItem` to throw; assert the banner appears once and the app remains functional.

**Acceptance:** A kid in private mode sees the warning before they invest 30 minutes building a game they can't save.

---

### Q13 — Lessons-index loading state is inconsistent and silent on slow loads

**What:** `app/pages/lessons.tsx:69-75` shows just plaintext "Loading lessons…" centered on a gradient. No Pixel mascot (which `lesson.tsx:391` has). No skeleton rows. No timeout-to-error transition — if the React Query fetch hangs forever, the kid stares at "Loading lessons…" indefinitely. **Why kid cares:** Cold network → kid waits 5+ seconds with no signal that anything is happening. Compare to `lesson.tsx` which animates Pixel.

- [ ] Q13.1 Replace the plaintext loading state with the same Pixel-thinking animation `lesson.tsx:391-401` uses.
- [ ] Q13.2 Add skeleton rows underneath (3 ghost lesson cards) so the kid sees the layout shape forming.
- [ ] Q13.3 Add a 12-second timeout — if `lessonsLoading` is still true past that, render a "Taking longer than usual…" hint with a Refresh button (does NOT throw — coexists with P10's empty-state handling from pillar-2).
- [ ] Q13.4 `tests/component/lessons-loading.test.tsx`: assert Pixel image present during load; advance 13s and assert the timeout hint appears.

**Acceptance:** Slow lesson loads always show a Pixel-themed indicator and never strand the kid in a silent wait state.

---

### Q14 — Hardcoded English copy with no central catalog

**What:** Kid-facing strings live as inline JSX literals across ~40 files. Examples just from this audit: "Build a game with Pixel", "Pick where you left off, or start a new lesson!", "Pixel is glad you're back.", "Make your own games with Python — no install needed!", "Loading lessons…", "Setting up Python for you...", "Lesson not found", "Got it!", "Welcome back!". A future i18n pass would have to grep across the whole tree. **Why kid cares (today):** Inconsistent voice across surfaces — some say "Pixel", some say "Pixel is", some say "you", some say "you're". Kids notice tonal whiplash. **Why it matters now:** This is a seed item — centralizing now while the catalog is small (~80 strings) costs hours; doing it later costs days.

- [ ] Q14.1 Create `src/copy/index.ts` exporting a typed flat `copy` object with named keys grouped by surface (`copy.home.intro`, `copy.lessons.greeting(name)`, `copy.editor.tour.step1`, etc.).
- [ ] Q14.2 Migrate the highest-traffic surfaces first: `app/pages/home.tsx`, `app/pages/lessons.tsx`, `app/pages/lesson.tsx`, `app/pages/not-found.tsx`, `app/components/error-boundary.tsx`. Other files can come later.
- [ ] Q14.3 Add a Vitest unit asserting `copy` keys are unique (no collisions) and have non-empty values.
- [ ] Q14.4 Add a CONTRIBUTING note: new kid-facing strings go in `src/copy/`, not inline. (Add to `docs/` only — no need for a separate file unless the user asks.)

**Acceptance:** All home/lessons/lesson/not-found/error-boundary strings imported from `src/copy/`. New surfaces continue the pattern. No actual i18n wiring yet — just the centralization seed.

---

### Q15 — No `navigator.onLine` awareness — Pyodide CDN goes dark, kid sees nothing

**What:** `grep -rn "navigator.onLine\|'online'\|'offline'" app/ src/` — only matches in test helpers and Pyodide loader. No global online/offline listener. Pyodide loads from `https://cdn.jsdelivr.net/pyodide/...` (per `src/python/pyodide-singleton.ts`), Monaco from `https://cdn.jsdelivr.net/...`, lessons from a same-origin static path. If the kid loses connection mid-session, the next Pyodide reload (e.g., after the recover button) silently hangs.

**Why kid cares:** School wifi blips. A kid clicks "Try Again" on the runner-recover panel during a wifi blip — and Pyodide just never comes back. No timeout, no offline indicator.

- [ ] Q15.1 Add an `OnlineStatus` provider in `app/App.tsx` that listens for `online`/`offline` events and exposes a context.
- [ ] Q15.2 In the runner-recover and Monaco-load paths, check `navigator.onLine` first — if offline, show "You're offline — connect to wifi to load Python" instead of a silent hang.
- [ ] Q15.3 Add a small offline-banner that appears whenever offline (not modal — non-intrusive bottom-fixed) so the kid knows their saves still work locally but new Pyodide/Monaco fetches won't.
- [ ] Q15.4 `tests/component/offline-banner.test.tsx`: dispatch `offline` event; assert banner renders. Dispatch `online`; assert it disappears.

**Acceptance:** A simulated `offline` event produces a clear kid-readable banner; recover and Monaco-load paths short-circuit with offline-specific copy instead of hanging.
