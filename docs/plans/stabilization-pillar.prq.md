---
title: Stabilization pillar PRQ
created: 2026-05-04
priority: P1
timeframe: single session
status: ACTIVE
---

# Stabilization pillar — close the gaps the foundations PR left open

**Created:** 2026-05-04
**Source branch:** `feat/stabilization-pillar` (from `main` after PR #19 lands)

## Priority: HIGH

## Overview

PR #19 (foundations) left three cleanup threads dangling, all of which block downstream work:

1. **Layout banner regression.** The Capacitor-style refactor left the only `<header>` (banner landmark) gated by `hidden lg:block`, so `tests/component/responsive-wizard.test.tsx`'s `getByRole('banner')` finds nothing in the a11y tree at the test's mocked viewport. Component CI is currently `continue-on-error: true` because of this — flipping it to blocking is gated on restoring a real banner.
2. **Parallel pygame-component type layers.** `src/pygame/components/types.ts` (rendering primitives) and `src/pygame/components/system-types.ts` (system specs with variants/category) share names but have diverging shapes. Drift waiting to bite.
3. **Grader has unit-level coverage but no end-to-end coverage.** The unit tests catch authoring mistakes in `lessons.json`; nothing catches grader regressions where the AST/runtime rules drift away from the canonical solutions.

Plus `@typescript-eslint/no-explicit-any` should flip from `warn` to `error` once we know how many `any`s exist — a one-time pass.

## Tasks

- [ ] P1: S1 — Restore page banner (top-level `<header>`) in the app shell so `responsive-wizard.test.tsx` passes
- [ ] P1: S2 — Flip the component-test CI step to blocking (drop `continue-on-error`); confirm green
- [ ] P1: S3 — Unify or document the seam between `pygame/components/types.ts` and `system-types.ts`
- [ ] P2: S4 — Component-project Pyodide test that runs each lesson's `solution` through the worker and asserts `score === 1.0`
- [ ] P3: SD.1 — Update `docs/STATE.md` (move stabilized items from Next → Done; refresh; bump `no-explicit-any` cleanup into its own queued PRQ at 209 LOC of impact)

## Dependencies

- S2 depends on S1 (must pass before flipping)
- S4 depends on PR #19 (uses the worker runner from T2.4)
- SD.1 depends on all S* tasks
- All else independent

## Acceptance Criteria

### S1 — Restore page banner

**Diagnosis (from a pre-batch investigation):** `app/components/wizard/layout-manager.tsx:222` already has a `DesktopHeader` that renders as `<header>` (semantic banner role), but it's gated by `hidden lg:block`. `responsive-wizard.test.tsx` calls `mockMatchMedia(1280)` and then `screen.getByRole('banner')` — but `mockMatchMedia` only fakes the JS `matchMedia` API; Tailwind's `lg:block` is resolved against the **real** viewport (in browser-mode tests, `@vitest/browser`'s default viewport, which may not be ≥1024px). So the test fails not because the banner is gone, but because it's hidden by real CSS that the test can't influence.

Two viable fixes:
1. **Render a banner unconditionally.** The mobile case should still have a thin banner (logo + page title), even if the desktop one has more chrome. Cleaner UX, fixes the test.
2. **Set the browser-mode viewport.** Use `@vitest/browser`'s `viewport` API (or set Playwright `viewport` in vitest config) to lock browser tests at ≥1024px. Test passes; mobile-banner UX gap remains.

Pick (1) — it improves UX *and* unblocks the test.

- [ ] App shell renders a top-level `<header>` element on all viewports (mobile gets a compact variant; desktop keeps the existing rich one). Don't add `role="banner"` manually — `<header>` already implies it as a top-level landmark.
- [ ] `npm run test:component` passes locally.
- [ ] Visual review at 375×667 and 1280×800 — neither feels worse than current.

**Files:** `app/components/wizard/layout-manager.tsx` (un-hide and add a mobile variant, or split out a `MobileHeader`), possibly `app/components/wizard/universal.tsx` (composition).

### S2 — Component CI blocking

- [ ] `.github/workflows/ci.yml` `test:component` step has no `continue-on-error: true`.
- [ ] PR CI passes with the new gate.
- [ ] `docs/STATE.md` `Next → Visual / accessibility` no longer lists the responsive-wizard failure.

**Files:** `.github/workflows/ci.yml`, `docs/STATE.md`.

### S3 — Pygame component type unification

- [ ] Either: types merge into one canonical schema with a single source of truth.
- [ ] Or: each file documents which one is "canvas primitives" vs "system specs" with explicit non-overlap rules and the seam is named (e.g. `RenderComponent` vs `SystemComponent`).
- [ ] No identifier exists in both files with conflicting shapes.
- [ ] `npm run check` clean.
- [ ] Existing call sites updated; no compat shims.

**Files:** `src/pygame/components/types.ts`, `src/pygame/components/system-types.ts`, all call sites.

### S4 — Grader e2e coverage

- [ ] New `tests/component/grader-e2e.test.tsx` (or `.ts` in component project).
- [ ] For each lesson in `public/api/static/lessons.json`, for each step, run `step.solution` through the worker runner and assert `engine.gradeStep(...)` returns `score === 1.0` and `passed === true`.
- [ ] Test runs in <60s on CI.
- [ ] Failures pinpoint the offending `(lessonId, stepId)` pair.

**Files:** new `tests/component/grader-e2e.test.tsx`.

### SD.1 — STATE.md refresh

- [ ] `responsive-wizard` and pygame-types entries moved out of Next.
- [ ] `Done` table gets a new row for this PR.
- [ ] `updated:` frontmatter date bumped.

**Files:** `docs/STATE.md`.

## Technical Notes

- **No toolchain bumps in this PR.** pnpm / TS6 / Biome / Vite8 / React19 are deliberately separate — they each carry their own risk profile and shouldn't be entangled with stabilization fixes.
- **No new lessons.** Content cadence is its own track.
- **Worker runner is reused.** S4 imports `getWorkerRunner()` directly; do not spawn a parallel runner.
- **Banner restoration uses semantic HTML, not ARIA hacks.** `<header>` defaults to `role="banner"` when it's a top-level landmark; don't add the role attribute manually unless a Radix component demands it.

## Risks

- S1 could touch the page-shell components broadly. If the diff balloons past ~150 LOC of layout changes, it's a sign the original removal was structural, not cosmetic — split into its own PR rather than fold it into stabilization.
- S3 may surface that the duplication is load-bearing (one file is consumed by the WYSIWYG editor, the other by the simulator runtime). If so, the right answer is "document the seam" not "merge."
- S4's runtime cost: 6 lessons × ~13 steps × Pyodide cold start. The worker runner is reused across calls, so cold start happens once. If the test still bloats, gate it behind `--changed` or a nightly job.
