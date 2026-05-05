---
title: Player Experience Pillar 4 — comprehensive remaining work
status: ACTIVE
owner: claude
created: 2026-05-05
supersedes: []
priority: HIGH
---

# Player Experience Pillar 4 — comprehensive remaining work

## Overview

Pillars 1, 2, 3 of the player-experience series shipped as PRs #25, #26, #27. This pillar absorbs **everything remaining** in one comprehensive plan rather than fragmenting across more PRQs. Findings come from a structured 11-axis scout against `main` at SHA `cda6e3e` after PR #27 squash-merged.

**Single-PR rule:** one long-running PR (`feat/player-experience-pillar-4`), one commit per task. Per-commit reviewer dispatch in parallel + background. Findings absorbed in the next forward commit, never amended. Squash-merge once green.

**Forbidden phrases:** `deferred`, `v2+`, `out of scope`, `future work`, `tracked separately`, `follow-up`, `TODO`, `FIXME`, `stub`, `placeholder`, `mock for now`. If a task feels too big, decompose into atomic commits inside the same PR — do NOT punt.

**Out of pillar 4:** anything that needs a backend (`/share/:slugId` server-side persistence, telemetry pipelines, A/B testing infra). Pillar 4 is the browser-only ship.

## Tasks

The numbering is execution order. Lower numbers are higher priority and unblock later items.

### P4.1 — i18n string catalog (Q14 from pillar 3)

- [ ] task-001 i18n string catalog with English source-of-truth + hook + per-page migration

**Files:**
- new: `src/i18n/strings.ts` — typed `strings` object, English baseline, JSDoc context per key
- new: `src/i18n/index.ts` — barrel
- new: `src/i18n/use-strings.ts` — `useStrings()` hook returning the active locale's strings (single locale for now; the indirection is the win)
- modify: every page + chrome component with hardcoded user-facing copy

**Completion criteria:**
- All user-facing strings in `app/pages/*.tsx`, `app/components/wizard/universal.tsx`, `app/components/pixel/*.tsx`, `app/components/floating-feedback.tsx`, and the new shells/banners route through `useStrings()` or imported `strings`.
- A grep for hardcoded English copy in those files turns up only what's intentional (alt text, aria-labels also in catalog; loading-state text in catalog).
- All existing tests pass; one new test verifies a string key exists for each prior hardcoded string used in a snapshot.

### P4.2 — Pyodide CDN preconnect + preload

- [ ] task-002 Add preconnect + script preload for Pyodide CDN to `index.html`

**Files:**
- modify: `index.html` — add `<link rel="preconnect">` and `<link rel="preload" as="script">` for `cdn.jsdelivr.net` Pyodide.

**Completion criteria:**
- Cold-load Lighthouse run shows reduced TTFB for Pyodide script (manual verification — record before/after numbers in commit body).
- The preload URL matches the version pinned in `src/python/pyodide-singleton.ts` (single source of truth — extract to a shared constant if needed).

### P4.3 — Wizard back navigation

- [ ] task-003 Wizard step history stack + back button

**Files:**
- modify: `app/components/wizard/universal.tsx` — add `useReducer` step history (push on advance, pop on back), `Back` button beside `Next`, restore prior UI state on pop.
- modify: tests in `tests/unit/` — new test: advance to step 3, click Back, prior selections still rendered.

**Completion criteria:**
- Kid can step backward through the wizard without losing prior answers.
- Back from step 1 is disabled (no prior step).
- State is shape-compatible with the existing persisted wizard state schema (no migration needed).

### P4.4 — Wizard checkpoint persistence

- [ ] task-004 Save wizard state to localStorage after each step

**Files:**
- modify: `app/components/wizard/universal.tsx` — call `saveWizardState(state)` in the step-advance handler (currently only on completion).
- modify: `tests/unit/` — new test: simulate crash after step 2, reload, state is restored.

**Completion criteria:**
- After answering step N, refreshing the page resumes at step N+1 (or step N if nav was the trigger).
- No regression in existing "first-visit micro-tutorial" flow.

### P4.5 — Canvas touch event support

- [ ] task-005 Pointer events on live-preview + WYSIWYG canvas

**Files:**
- modify: `app/components/pygame/live-preview.tsx` — replace `onClick` with `onPointerDown` for canvas interactions.
- modify: `app/components/editor/canvas.tsx` (or wysiwyg) — add `onTouchStart`/`onPointerDown` for tap-to-place.
- modify: tests/unit — new test: dispatch `pointerdown` on canvas, the same handler runs.

**Completion criteria:**
- A `fireEvent.pointerDown(...)` test triggers the same code path as a click.
- Visual smoke: tap on iPad Safari (manual) places the WYSIWYG component.

### P4.6 — Mobile keyboard handling for the code editor

- [ ] task-006 Use `window.visualViewport` to keep code editor visible when soft keyboard opens

**Files:**
- modify: `app/components/editor/code-panel.tsx` — `useEffect` listens to `window.visualViewport`'s `resize`, applies `paddingBottom` equal to keyboard height.
- modify: tests — new test: stub `visualViewport`, fire resize, padding-bottom updates.

**Completion criteria:**
- When the editor is focused on a mobile device and the soft keyboard opens, the focused line stays visible (manual smoke).
- Test verifies the inline style updates in response to viewport resize.

### P4.7 — Touch hint badge on WYSIWYG palette

- [ ] task-007 Show "Tap to place" hint on touch devices

**Files:**
- modify: `app/components/editor/wysiwyg.tsx` — detect coarse pointer via `matchMedia('(pointer: coarse)')`, render a small hint badge on palette items.
- modify: tests — new test: stub `matchMedia` to coarse, badge appears.

**Completion criteria:**
- Coarse-pointer (touch) devices see the hint; fine-pointer (mouse) devices do not.

### P4.8 — Project rename UI

- [ ] task-008 Inline rename on project rows in /home

**Files:**
- modify: `app/pages/home.tsx` — add Edit (pencil) button per project row → inline input → Save/Cancel.
- new: `renameWizardProject(id, newName): Promise<void>` in `src/storage/projects.ts`.
- modify: tests — new test: rename a saved project, list shows new name.

**Completion criteria:**
- Empty / whitespace-only names rejected with toast.
- Max length enforced (e.g., 40 chars).
- React Query cache invalidated after rename.

### P4.9 — Project thumbnail snapshot

- [ ] task-009 Save canvas snapshot at project save, render on /home cards

**Files:**
- modify: `src/storage/projects.ts` — extend project schema with optional `thumbnail: string` (data URL) field.
- modify: `app/components/pygame/live-preview.tsx` (or runner) — expose a `getThumbnail()` method that grabs `canvas.toDataURL()` at save time.
- modify: `app/components/wizard/universal.tsx` — capture thumbnail before calling `saveWizardProject`.
- modify: `app/pages/home.tsx` — render `<SafeImage>` with the thumbnail; fall back to current emoji placeholder.

**Completion criteria:**
- Saved projects show their canvas snapshot on /home; unsaved or thumbnail-less projects show the emoji fallback.
- Thumbnail capped at ~200x150 to keep localStorage payload small.
- Schema migration: existing rows without thumbnail are still loadable.

### P4.10 — Project auto-save toast

- [ ] task-010 Brief "Saved" toast on successful auto-save

**Files:**
- modify: `app/components/wizard/universal.tsx` — call `toast({ title: 'Saved', duration: 1000 })` on successful auto-save effect (gated to actual saves, not no-ops).

**Completion criteria:**
- Toast appears once per actual save, not on every render.
- Test verifies toast is fired exactly once per project mutation.

### P4.11 — Duplicate project safeguard

- [ ] task-011 Block creating a duplicate-named project; offer overwrite

**Files:**
- modify: `src/storage/projects.ts` — `saveWizardProject` checks for an existing project with the same name; if found, returns a sentinel that the caller resolves via toast prompt or rename.
- modify: `app/components/wizard/universal.tsx` — handle the sentinel.

**Completion criteria:**
- Saving "My Game" twice with the same final state is a no-op (idempotent).
- Saving "My Game" twice with different states prompts for rename or overwrite.

### P4.12 — Wizard asset preview before commit

- [ ] task-012 Live thumbnail of selected character/background while still on the picker step

**Files:**
- modify: `app/components/wizard/asset-browser.tsx` — when an asset is selected, render an inline preview alongside the picker grid (small canvas with the asset rendered on a background swatch).

**Completion criteria:**
- Picking an asset updates the inline preview without advancing the wizard.
- Test stubs the asset metadata, verifies the preview img src.

### P4.13 — Lessons-index loading skeleton (Q13 from pillar 3)

- [ ] task-013 Replace text loader with a `<Skeleton>` row matching the lesson card shape

**Files:**
- modify: `app/pages/lessons.tsx` — when `lessonsLoading`, render `LessonsShell` with N skeleton rows.

**Completion criteria:**
- Loading state is visually consistent with `lesson.tsx`.
- Skeleton renders inside `LessonsShell` so banners are still visible during load.

### P4.14 — Lesson completion: prominent "Next Lesson" CTA + thumbnail preview

- [ ] task-014 Style "Next Lesson" as primary, show next lesson thumbnail/title

**Files:**
- modify: `app/pages/lesson.tsx` — restructure completion modal: Next Lesson is primary (gradient), Home and Restart are secondary. If a next lesson exists, show its title + emoji.

**Completion criteria:**
- Visual hierarchy: Next Lesson visually dominant.
- If kid is on the last lesson, gracefully show "You finished them all!" instead.

### P4.15 — Help / FAQ floating button

- [ ] task-015 PixelMenu-attached "?" button opens FAQ modal

**Files:**
- new: `app/components/help-modal.tsx` — list of common questions, kid-friendly answers (drawn from `src/i18n/strings.ts`).
- modify: `app/components/pixel/menu.tsx` — add Help entry.
- new: tests/unit — verify modal opens + closes via keyboard.

**Completion criteria:**
- Help button reachable on every page (it's part of the PixelMenu chrome).
- Modal is keyboard-accessible (Escape to close, focus trap).
- Content covers ~6 FAQ entries: "How do I save my game?", "What's a wizard?", "What if my code doesn't work?", "Can I use this offline?", "How do I make Pixel quiet?", "How do I get help from a grown-up?".

### P4.16 — Floating-feedback keyboard shortcut

- [ ] task-016 `?` keyboard shortcut to toggle hint panel

**Files:**
- modify: `app/components/floating-feedback.tsx` — `useEffect` adds a global `keydown` listener for `?`, gated to skip when an `<input>` / `<textarea>` is focused.

**Completion criteria:**
- Pressing `?` outside an input toggles the panel.
- Inside an input, `?` types literally.
- Listener is removed on unmount.

### P4.17 — Game export as ZIP

- [ ] task-017 "Export Game" button → downloadable ZIP with code + assets

**Files:**
- new: `src/export/zip.ts` — uses `JSZip` (already in deps if present; install if not) to bundle: `main.py`, asset files, README with instructions.
- modify: `app/pages/home.tsx` (project rows) — add Export button.
- new: tests/unit — generate zip, inspect file list.

**Completion criteria:**
- Generated ZIP includes runnable `main.py` and any referenced assets.
- README explains how to run locally with Python + pygame installed.
- Browser download triggers via `URL.createObjectURL` + anchor click.

### P4.18 — Project remix (clone)

- [ ] task-018 "Remix" button on project rows → clones with `-remix-N` suffix

**Files:**
- modify: `src/storage/projects.ts` — `cloneWizardProject(id): Promise<string>` returns the new id.
- modify: `app/pages/home.tsx` — Remix button calls clone, then `setLocation('/wizard')` after stashing the new id under `pp.activeProjectId`.

**Completion criteria:**
- Clone has a fresh id, name with `-remix-N` suffix where N auto-increments.
- Original project is unaffected.

### P4.19 — Profile name validation

- [ ] task-019 Trim, length-cap, non-empty check on profile name

**Files:**
- modify: `app/pages/profile.tsx` — validate before save; show toast on rejection.

**Completion criteria:**
- Empty / whitespace-only names rejected.
- Max length 24, with toast.

### P4.20 — Storage quota monitoring

- [ ] task-020 Warn when approaching localStorage limit

**Files:**
- new: `src/storage/quota.ts` — `getStorageUsage(): { used: number; estimate: number | null }` using `navigator.storage.estimate()` if available, falling back to summing `localStorage` keys.
- modify: `src/storage/client.ts` (`saveToLocalStorage`) — if usage > 80% of estimate, surface warning toast.
- new: tests/unit — mock `navigator.storage.estimate`, verify warning fires above threshold.

**Completion criteria:**
- Save still proceeds (best-effort).
- Warning toast fires once per session when crossing the threshold.

### P4.21 — Code editor reset button

- [ ] task-021 "Reset Code" button restores lesson starter code with confirm

**Files:**
- modify: `app/components/editor/code-editor.tsx` — Reset button (only when in lesson context) → confirm dialog → restore starter code from the lesson definition.

**Completion criteria:**
- Reset only appears in lesson mode (not free-build wizard mode).
- Confirm dialog prevents accidental loss.

### P4.22 — Hint keyboard shortcut: Ctrl+Space

- [ ] task-022 Ctrl+Space in editor requests next hint from the floating feedback panel

**Files:**
- modify: `app/components/editor/code-editor.tsx` — Monaco `addAction` for Ctrl+Space → emit a custom event the floating-feedback component listens for.

**Completion criteria:**
- Ctrl+Space in the editor reveals the next hint, same as clicking the hint button.
- Doesn't interfere with Monaco's native autocomplete (rebind native trigger to `Ctrl+I` or similar if needed).

### P4.23 — Focus-visible rings on custom buttons

- [ ] task-023 Apply consistent focus-visible ring class across editor / palette / pixel-menu

**Files:**
- modify: `app/components/editor/palette.tsx`, `app/components/editor/canvas.tsx`, `app/components/pixel/menu.tsx` — add `focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1` to all clickable elements.

**Completion criteria:**
- Tabbing through any of these surfaces shows a clear focus indicator.

### P4.24 — Aria-labels on icon-only buttons

- [ ] task-024 Audit + add aria-label to every icon-only button

**Files:**
- modify: `app/components/editor/wysiwyg.tsx`, `app/components/pixel/menu.tsx`, plus any others surfaced by an `lucide-react` icon-button audit.

**Completion criteria:**
- A grep for `<button[^>]*>\s*<(?:[A-Z]\w+)\s` (icon-only buttons) yields zero hits without a sibling `aria-label` or wrapping `<span class="sr-only">`.

### P4.25 — Lazy-load Pixel mascot images

- [ ] task-025 Add `loading="lazy"` on lesson Pixel images

**Files:**
- modify: `app/pages/lesson.tsx` and `app/components/wizard/avatar-display.tsx` — `loading="lazy"` on offscreen Pixel images.

**Completion criteria:**
- Above-the-fold mascot stays eager; off-screen variants are lazy.

### P4.26 — BroadcastChannel sync of project list

- [ ] task-026 Cross-tab sync of saved-project mutations

**Files:**
- new: `src/storage/broadcast.ts` — wrapper that publishes `{type: 'projects:invalidate'}` on save/delete/rename.
- modify: `app/pages/home.tsx` — subscribe; on receive, call `queryClient.invalidateQueries({queryKey: ['wizard-projects']})`.

**Completion criteria:**
- Saving in tab A causes tab B's project list to re-fetch.
- No infinite loop (sender does not re-process its own message).

### P4.27 — Pixel menu mobile overflow

- [ ] task-027 `max-h-[80vh] overflow-y-auto` on PixelMenu modal

**Files:**
- modify: `app/components/pixel/menu.tsx` — root modal element gets the overflow classes.

**Completion criteria:**
- On a 600px-tall mobile viewport, menu content scrolls instead of being cut off.

### P4.28 — Live-preview pause overlay copy

- [ ] task-028 Replace technical pause-overlay text with kid-friendly "Game paused"

**Files:**
- modify: `app/components/pygame/live-preview.tsx` — paused overlay reads "Game paused — press Space to play".

**Completion criteria:**
- Text is kid-friendly; Space-to-resume copy matches the actual key binding.

### P4.29 — WYSIWYG undo/redo

- [ ] task-029 Local undo stack for component placements (Ctrl+Z / Ctrl+Shift+Z)

**Files:**
- modify: `app/components/editor/wysiwyg.tsx` — `useReducer` over placement actions; expose Ctrl+Z and Ctrl+Shift+Z handlers.

**Completion criteria:**
- Place 3 components → Ctrl+Z three times restores empty canvas.
- Ctrl+Shift+Z redoes them.

### P4.30 — Code editor syntax-color contrast pass

- [ ] task-030 Audit Monaco theme colors for WCAG AA against editor background

**Files:**
- modify: wherever the Monaco theme is registered (search for `defineTheme` or theme options in `app/components/editor/`).

**Completion criteria:**
- Each syntax token (keyword, string, comment, function name) hits AA contrast (4.5:1 for normal text) on both light and dark backgrounds.
- Document the chosen palette in a comment with the contrast ratios.

### P4.31 — Live-preview comparison-mode label

- [ ] task-031 "Expected output" + tooltip explanation

**Files:**
- modify: `app/components/pygame/live-preview.tsx` — change "Alternative" badge to "Expected output", add `title` attribute with explanation.

**Completion criteria:**
- Badge text + tooltip both routed through `useStrings()` (so they participate in the i18n catalog).

### P4.32 — Profile pronouns + emoji avatar

- [ ] task-032 Optional pronouns dropdown + emoji picker on /profile

**Files:**
- modify: `src/types/schema.ts` — extend Profile with optional `pronouns?: string` and `avatarEmoji?: string`.
- modify: `app/pages/profile.tsx` — add the controls; persist via existing `saveProfile`.
- modify: tests — schema migration test (existing profiles without these fields still load).

**Completion criteria:**
- Both fields are optional; default UI shows blank pronouns and a default Pixel emoji.

### P4.33 — Offline-mode indicator on editor

- [ ] task-033 Editor header shows an offline pill when navigator is offline

**Files:**
- modify: `app/components/editor/code-panel.tsx` — subscribe via `useSyncExternalStore` (reuse the helpers from `offline-banner.tsx` — extract them to `src/utils/online-status.ts` first).
- new: `src/utils/online-status.ts` — exports `subscribe`, `getClientSnapshot`, `getServerSnapshot` plus a `useOnlineStatus()` hook.
- modify: `app/components/ui/offline-banner.tsx` — consume the shared helpers.

**Completion criteria:**
- Editor and banner both reflect the same online state from a single source.
- Test: setting `navigator.onLine = false` and dispatching `offline` updates both.

## Stretch — local-only

These need a backend or product decision and are NOT in scope for pillar 4. Captured here so they're not forgotten:

- Game share via URL (`/share/:slug`) — needs a server.
- Session telemetry / per-lesson failure analytics — needs an analytics endpoint.
- A/B testing infrastructure — needs feature-flag service.

## Definition of done (pillar 4)

- All 33 tasks above are `[x]` in `.agent-state/directive.md`.
- One PR (`feat/player-experience-pillar-4`), squash-merged into `main`.
- Per-commit reviewer trio (code / security / simplifier) has been dispatched and findings absorbed forward.
- All Vitest projects, type-check, biome, and CodeQL are green at merge time.
- All Gemini and CodeRabbit threads on the PR are resolved; any CHANGES_REQUESTED dismissed with a commit-sha justification.
- No new `// TODO`, `// FIXME`, `it.todo`, `as any`, or `pass`-body / `it.skip` markers introduced.

## Operating rules (recap)

- One commit per task; commit message format: `feat(player-experience): P4.N — <title>` for feature tasks, `fix`, `refactor`, `test` as appropriate.
- Per-commit reviewer dispatch: `feature-dev:code-reviewer`, `security-scanning:security-auditor`, `code-simplifier:code-simplifier` — parallel + background.
- Findings fold into the next forward commit. Never amend a reviewed commit. Never make a "fix-review" commit.
- Push on each commit. CI must stay green. Don't proceed to the next task while CI is red.
- When a CodeRabbit/Gemini review lands with findings, treat them as the next-commit input (after the in-flight task completes).
