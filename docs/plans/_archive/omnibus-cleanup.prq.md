---
title: Omnibus cleanup — every remaining gap in one PRQ
status: ACTIVE
owner: jbogaty
created: 2026-05-05
supersedes: none
relates_to:
  - docs/plans/player-experience-pillar-4.prq.md (merged 2026-05-05 as PR #28)
  - docs/plans/modernization-pillar.prq.md (M4.2 was WAIT-blocked, now actionable)
---

# Omnibus cleanup

## Why this exists

Pillar 4 of the player-experience PRQ shipped (PR #28, commit 42082f3).
The user directive after that merge was explicit: **"finish squash
merging this PR and then immediately let's target everything remaining
in one PRQ"** and **"errata files just add clutter, what we need is a
proper docs directory with frontmatter headed pillars and a real
accounting of everything"**.

A thorough audit of the post-Pillar-4 main branch found that the
remaining gaps are surprisingly small: zero open GitHub issues, zero
code-level deferral markers (TODO/FIXME/etc), zero `any` casts, zero
skipped tests, no missing PRQ work-units. The forward roadmap fits in
one bundled PRQ rather than splitting into multiple pillars (which
would re-introduce the fragmentation the user rejected).

This PRQ closes those final gaps: an i18n holdout, three unguarded
JSON.parse call sites that could silently swallow malformed Pyodide
output, the long-blocked frame-rate test from the modernization
pillar, and a small set of explicit `<label>` adds for forms that
work but aren't formally labeled.

## Scope

In:
- i18n migration of audio-toggle.tsx (last hardcoded user-facing
  strings outside the catalog).
- Defensive JSON.parse guards in src/grading/ast.ts and
  src/pygame/runtime/simulator.ts (3 sites).
- M4.2 frame-rate test (was [WAIT] in modernization-pillar; the
  simulator-harness it depended on shipped in PR #23).
- Explicit `<label>` elements on the three inline `<input>` /
  `<select>` controls flagged by the audit.
- Status update in modernization-pillar.prq.md so M4.2 is no longer
  marked WAIT.

Out:
- Anything new the user hasn't asked for.
- Refactors of clean code.
- "While we're in there" cleanup.
- New lessons, new mechanics, new audio sources, new Pixel art.

## Tasks

### task-001 audio-toggle i18n migration

- [ ] task-001 audio-toggle.tsx labels move into strings.audioToggle catalog block; both aria-label (line 48) and visible "Sound on/off" (line 67); test asserts catalog has the keys

The last surviving hardcoded user-facing strings outside src/i18n/strings.ts.
- `app/components/audio-toggle.tsx:48` — `enabled ? 'Mute audio' : 'Unmute audio'` (aria-label).
- `app/components/audio-toggle.tsx:67` — `enabled ? 'Sound on' : 'Sound off'` (visible label).

Add `strings.audioToggle = { muteLabel, unmuteLabel, soundOn, soundOff }` to the catalog. Replace both inline strings. Add `tests/unit/audio-toggle-i18n.test.ts` asserting the catalog has the keys and the component source no longer contains the literals.

### task-002 grading/ast.ts JSON.parse guard

- [ ] task-002 src/grading/ast.ts:37 wraps JSON.parse in try/catch returning [] on malformed Python output; test asserts the fallback path

`pyodide.runPython(AST_VALIDATOR_SOURCE)` emits a JSON string from Python's `json.dumps(results)`. If the Python source ever produces malformed JSON (a bug in the validator template, a stray print, or a Pyodide upgrade quirk), the unguarded parse throws and bubbles up as an uncaught grading error — kid sees a generic crash, dev gets no actionable signal.

Wrap with try/catch. On failure: `console.warn` the raw text + the parse error, return `[]` (which the grading layer treats as "no rules evaluated", a soft fallback). Add a unit test that mocks runPython to return `'not json'` and asserts the result is `[]` and `console.warn` was called.

### task-003 simulator.ts JSON.parse guards (verification + status)

- [ ] task-003 src/pygame/runtime/simulator.ts:977 + :1092 each wrap JSON.parse in try/catch returning a typed safe-default; existing simulator tests still pass; new test asserts fallback shape

Two sites:
- `simulator.ts:977` — `verifyPygameShim` parses `JSON.parse(verificationResult)` for `{ pygame_available, basic_functionality, errors }`. Already returns a boolean — on parse failure return `false` and log.
- `simulator.ts:1092` — `comprehensivePygameCheck` parses `JSON.parse(statusResult)`. Already has an outer try/catch with `defaultStatus` — move the parse inside that try so a JSON failure also lands on `defaultStatus` instead of escaping the inner block.

Add a unit test for each that injects a malformed-JSON pyodide stub and asserts the safe-default path.

### task-004 M4.2 frame-rate simulator test

- [ ] task-004 tests/component/simulator-frame-rate.test.tsx mounts the harness with ≥6 sprites + 2 platforms + a particle effect, runs 2s, asserts mean frame time < 16.67ms; runs in <30s on CI

The simulator-harness deterministic mount API shipped in PR #23 (finishing-pillar F-series). M4.2 was waiting on it; the wait is over.

Use `tests/component/` (real Chromium via @vitest/browser), not jsdom — frame-rate measurement needs real rAF and real layout.

The harness exposes `mountSimulator({ components: [...] })`. Build a scene of 6 sprites, 2 platforms, and 1 particle effect (the reviewer can see the spec language in modernization-pillar.prq.md M4.2). Sample frame timestamps via `performance.now()` inside a rAF loop for 2000ms. Assert `mean < 16.67ms` (60fps floor). Skip on CI environments where `prefers-reduced-motion: reduce` is set (some CI runners advertise this). Report the actual mean in the assertion message so a regression has a number to triage from.

### task-005 explicit form labels

- [ ] task-005 home.tsx project-rename input + profile.tsx name input + asset-browser.tsx category select get explicit `<label htmlFor>` + matching `id`; existing aria-label kept where the visible label would be redundant

Three inputs that work today via context but lack formal labels:
- `app/pages/home.tsx:355` — inline project-rename `<input>`.
- `app/pages/profile.tsx:277` — profile name `<input>`.
- `app/components/wizard/asset-browser.tsx:336` — category `<select>`.

For each, add a `<label htmlFor="…" className="sr-only">…</label>` (visually hidden but read by screen readers; the existing visual context already labels them for sighted users) and a matching `id` on the input. Pull the label text from the i18n catalog where it doesn't already exist.

### task-006 modernization-pillar status update

- [ ] task-006 docs/plans/modernization-pillar.prq.md M4.2 box flips to [x] with a "test landed in tests/component/simulator-frame-rate.test.tsx" footnote; frontmatter status updated if the pillar is now fully released

Once task-004 lands, M4.2's `[ ]` becomes `[x]`. Re-read modernization-pillar.prq.md and confirm whether all other items are also `[x]` — if so, flip frontmatter `status` from ACTIVE to RELEASED with the merge SHA in a `## Closeout` section at the bottom (matching the convention already used in docs/STATE.md).

## Definition of done

Every task box `[x]`. `pnpm check && pnpm test:unit && pnpm test:component` all green. PR squash-merged to main. modernization-pillar.prq.md status updated to reflect M4.2 closure. No new TODOs, no new `any`, no new hardcoded user-facing strings introduced.

## Out of scope (explicit)

These were considered and rejected for this work-unit:

- Migrating same-folder sibling imports from `./foo` to `@/components/.../foo` — established convention in app/components/editor/ uses relative siblings; switching one would create the inconsistency.
- Migrating `src/i18n/index.ts` barrel to use `@lib/` self-reference — same-package barrel; alias self-reference creates a circular path concern with no benefit.
- Rewriting `useEffect` dependency arrays, error-boundary additions to already-protected paths, or other "while we're in there" hardening that the audit found unnecessary.
