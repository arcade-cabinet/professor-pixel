---
title: Post-#30 Consolidation Pillar
status: ACTIVE
priority: HIGH
timeframe: single session
created: 2026-05-06
owner: jbogaty
supersedes: |
  - docs/plans/post-launcher-consolidation.prq.md (merged via #30)
  - docs/plans/modernization-pillar.prq.md (merged via #30)
  - docs/plans/finishing-pillar.prq.md (merged via squash)
  - docs/plans/grader-followups-pillar.prq.md (merged via #22)
  - docs/plans/any-cleanup-pillar.prq.md (merged via #21)
  - docs/plans/stabilization-pillar.prq.md (merged via #20)
  - docs/plans/foundations-pillar-completion.prq.md (merged via #19)
  - docs/plans/omnibus-cleanup.prq.md (merged via #29)
  - docs/plans/player-experience-pillar.prq.md (merged)
  - docs/plans/player-experience-pillar-2.prq.md (merged)
  - docs/plans/player-experience-pillar-3.prq.md (merged)
  - docs/plans/player-experience-pillar-4.prq.md (merged)
---

# Post-#30 Consolidation Pillar

PR #30 (`feat/modernization-pillar-closeout`) squash-merged at `ff3a21b` on 2026-05-06.

This is the **one** PRQ closing everything that fell out of #30: documentation gaps, plan-file cleanup, missing pillar pages, and the queued-but-unowned items in `docs/STATE.md → Next`. The user's directive: **proper docs directory with frontmatter-headed pillars and a real accounting of everything — no errata files**.

## Overview

Three pillars of work, all documentation + state hygiene:

1. **D — Docs structure** (5 tasks). Add the two pillar pages that recent work created but never got documented (Storage/OPFS, Deploy/Capacitor). Audit existing pillars for drift against shipped code. Frontmatter consistency across all docs.
2. **S — State + plan-file cleanup** (4 tasks). Update `STATE.md` to reflect #30 merged. Prune the 12 merged `docs/plans/*.prq.md` files (move to `docs/plans/_archive/`). Update `cursor.md`. Refresh `digest.md` triggers.
3. **R — Runbook closure** (3 tasks). The `STATE.md → Next` queue lists three items that are either user-action-only (Play Store keystore, iOS Mac+Xcode) or already shipped under #30 but stale-listed (asset mounting). Document the manual handoff steps so the queue can be flushed.

12 tasks total. All [x] completion criteria are mechanical (file exists, frontmatter valid, links resolve, `git log` matches doc).

## Tasks

### D — Docs structure (frontmatter-headed pillars)

- [ ] D1: Add `docs/pillars/06-storage.md` — OPFS architecture (the saved-games library, migration sentinel, `shouldUseOpfs()` cached probe, write-then-rename atomicity, Pyodide FS asset mounting via `src/python/asset-mount.ts`)
- [ ] D2: Add `docs/pillars/07-deploy.md` — three deploy targets (GitHub Pages with `--base=/professor-pixel/`, Capacitor Android APK signed-release, iOS TestFlight manual flow), the `src/utils/base-url.ts` single-source-of-truth helper, the production-shape e2e suite, the trusted-ref CI guards
- [ ] D3: Update `docs/pillars/02-runtime.md` — add OPFS WASM cache section (`public/pyodide-sw.js` allowlist + version-keyed eviction), Capacitor short-circuit (skip SW registration on `capacitor:` protocol), iOS Safari voiceschanged race fix in `src/audio/tts.ts`
- [ ] D4: Update `docs/pillars/01-frontend.md` — wouter `<Router base>` wrap, edge-swipe hook (`src/hooks/use-edge-swipe.ts`), home skeleton + aria-busy pattern, audio toggle chrome
- [ ] D5: Update `docs/README.md` — index table includes Pillar 06 + 07; verify all `@/*` `@lib/*` `@assets/*` alias references are accurate; verify cross-refs from `STANDARDS.md` and `AGENTS.md`

### S — State + plan-file cleanup

- [ ] S1: Update `docs/STATE.md` — flip Active row (PR #30 merged at `ff3a21b`); add Done row for "Post-launcher modernization closeout"; update `updated:` frontmatter; refresh Next list (drop merged items, add the three R-tasks below as the only queued work, keep content-tracks bullet)
- [ ] S2: Move all 12 merged plan files to `docs/plans/_archive/` — preserve git history via `git mv`; `_archive/` gets its own README explaining the convention
- [ ] S3: Refresh `.agent-state/cursor.md` to point at this PRQ; refresh `digest.md` via tool-call-triggered hook
- [ ] S4: Audit `docs/STATE.md` "Next" against actual `git log origin/main` — anything done but listed gets struck; anything listed but not done gets a real owner or moves to a content/manual track

### R — Runbook closure (manual-action handoffs)

- [ ] R1: Document Play Store rollout in `docs/DEPLOYMENT.md` — keystore generation command (`keytool -genkeypair`), the four `ANDROID_KEYSTORE_*` repository secrets, `cd-mobile.yml` `inputs.release=true` invocation, Play Console upload steps. Verify `signing.properties.example` matches what cd-mobile expects.
- [ ] R2: Document iOS TestFlight build in `docs/DEPLOYMENT.md` — Mac+Xcode prerequisites, `npx cap add ios`, signing identity, archive upload via Transporter or `xcrun altool`. Mark as user-action with no CI automation.
- [ ] R3: Verify in `docs/pillars/06-storage.md` that asset-mounting (`src/python/asset-mount.ts`) is fully documented — closes the stale `STATE.md → Next` bullet that pre-dated the #30 merge. Cross-link from `02-runtime.md` and `04-grading.md` if relevant.

## Dependencies

D1, D2 are independent — write in parallel.
D3, D4, D5 depend on D1, D2 existing (cross-refs).
S1 depends on D-block completion (Done-row text references the new pillars).
S2 is independent of D-block.
S3 depends on PRQ landing on disk + this batch section in directive.md.
S4 depends on S1, S2 (so the audit reflects the cleanup).
R1, R2, R3 are independent of each other and the D/S blocks.

## Acceptance criteria

Per task — each is mechanical:

- D1, D2: file exists with frontmatter (`title`, `updated`, `status: current`, `domain: pillar`, `pillar: <n>`); `wc -l ≤ 250`; `markdown-link-check` passes; one external grep proves the pillar covers all current code paths in its scope.
- D3, D4: diff shows new sections; existing structure preserved; `wc -l` increase only.
- D5: `docs/README.md` table renders to 7 pillar rows; CI doesn't break.
- S1: `docs/STATE.md` Active table is empty (no in-flight branches); Done has the new row at top; `updated:` is today.
- S2: `git status` clean post-rename; `docs/plans/` contains exactly `post-30-consolidation.prq.md` + `_archive/` + `_archive/README.md`.
- S3: `.agent-state/cursor.md` references `docs/plans/post-30-consolidation.prq.md`; `digest.md` reflects current state.
- S4: every `STATE.md → Next` line either has a `[link to PRQ]` or `[manual: <user-action>]` tag.
- R1, R2: `docs/DEPLOYMENT.md` has new sections; commands quoted; secrets enumerated; `markdown-link-check` passes.
- R3: cross-link from `02-runtime.md` to `06-storage.md → Asset mounting` resolves.

## Verification (gate)

Before marking the directive batch complete:

- `pnpm check` — TypeScript clean (this PRQ is doc-only, so no code paths affected; check exists as a regression guard against accidental `Read`-then-stale-import drift)
- `pnpm lint` — Biome clean
- `git log --oneline origin/main..HEAD` — one commit per task (12 commits total) following Conventional Commits
- Every commit has reviewer-trio dispatch evidence (tool-call traces in conversation; not a file artifact)

## Out of scope (explicit non-goals)

- No code changes. This PRQ closes documentation/state debt only. Code-level work that surfaces during the docs sweep gets a separate PRQ.
- No new features. The Capacitor APK + IPA distribution items are runbook documentation, not engineering.
- No reopening of #30 scope. Anything that should have been in #30 but wasn't gets logged as a follow-up PRQ; do not slip it into this batch.
