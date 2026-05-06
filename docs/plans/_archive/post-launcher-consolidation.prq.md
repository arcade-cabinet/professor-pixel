---
title: Post-launcher consolidation PRQ
created: 2026-05-05
priority: P1
timeframe: 1-2 days
status: ACTIVE
parent_branch: main
target_branch: feat/post-launcher-consolidation
---

# Post-launcher consolidation — close out everything remaining

**Created:** 2026-05-05
**Source:** branched from `main` after PR #30 (launcher + OPFS Pyodide cache + send-mode export) merges

## Priority: HIGH

## Why one PRQ, not five

The launcher PR (#30) lands a large body of new infrastructure — OPFS-backed
project storage, service-worker WASM caching, the `/play/:id` launcher route,
PWA manifest, the sim-vs-launcher split. After it merges, what's left is a
mixed bag of **tightly coupled cleanup**:

1. **Modernization debt.** Two checkboxes (M2.2 Vitest coverage thresholds,
   M4.2 frame-rate test) gated on the simulator harness. Both unblock once
   the deterministic mounting API for `src/pygame/runtime/simulator.ts`
   lands.
2. **Dependabot security backlog.** GitHub flagged 22 vulns on main (11
   high, 10 moderate, 1 low). The `pnpm overrides` patches in PR #30 cover
   transitive deps (minimatch / picomatch / brace-expansion), but direct
   deps (lodash, yaml, glob, playwright, react-day-picker, jsdom 29,
   @types/node 25) need targeted bumps with the per-package contract test
   the security profile demands.
3. **Capacitor APK + IPA.** The PWA manifest landed in #30 so kids can
   "Add to Home Screen" on Chrome/Safari. The next step is wrapping the
   exact same `dist/` in Capacitor for the Play Store + App Store. This
   needs `@capacitor/core`, `@capacitor/android`, `@capacitor/ios`,
   `capacitor.config.ts`, native shells, signing config, and a CI job
   that builds the APK on every push to `main`.
4. **Docs sweep.** STATE.md, the modernization PRQ status, and the launcher
   architecture note all need to reflect the post-#30 reality. The user's
   directive was explicit: **no errata files, update existing docs in place
   with frontmatter-headed pillars.**

These are distinct concerns but they share a green-CI window (security
audit can't ratchet to "all green" until deps are bumped, and the Capacitor
shell pulls in mobile-android profile work that ties to the Play-Store
deployment thread). One branch, atomic commits per concern, one squash-merge.

## Tasks

### C1 — Frame-rate test + simulator harness (modernization M4.2)

C1.1 — Extract a deterministic mounting API for `src/pygame/runtime/simulator.ts`.
The current 1728-line module couples canvas/context allocation with the
draw-command interception loop. Carve out a `createSimulator({ canvas, ctx })`
factory that takes injected DOM (no `document.querySelector`, no
`document.createElement`) and exposes `flushFrameBuffer(commands)` directly.

- **Verify:** `tests/unit/simulator-frame-rate.test.ts` (already authored,
  file: 30 lines) imports the factory and runs 120 synthesized 42-cmd
  frames. Mean per-frame cost asserted under 16.67ms (60fps budget).

C1.2 — Re-enable Vitest coverage thresholds (modernization M2.2).
Pin floor at current baseline (6 / 4 / 4 / 6) in `vitest.config.ts`'s
`coverage.thresholds`. Goal is regression detection; the ratchet-up
happens incrementally per-PR after this lands.

- **Verify:** `pnpm test:coverage` exits non-zero if coverage drops below
  baseline. Add a `pnpm test:coverage:check` script that validates the
  emitted JSON against the threshold (the v8 reporter doesn't natively
  fail on threshold miss in workspace mode; needs a wrapper).

### C2 — Direct-dep security bumps (Dependabot triage, one-package-per-commit)

The pnpm overrides in PR #30 patched transitive deps. These are direct deps
that need bumps. Each ships as its own commit — the security profile's
audit trail cares about per-package test evidence, not bundles.

- C2.1 — `jsdom` 27 → 29 (PR #16 already open with green CI, just needs review).
- C2.2 — `@types/node` 20 → 25 (PR #18 open green).
- C2.3 — `react-resizable-panels` 2 → 4. **NOT a clean bump.** v3 renamed
  exports (`Panel` → `PrimaryPanel`, `ImperativePanelHandle` shape change).
  Audit `app/components/editor/`, `app/components/wizard/layout-manager.tsx`
  and any usage; rewrite imports + ref types.
- C2.4 — Dependabot bundle PR #24 (45 minor/patch updates). Already green
  on CI; needs a click-through review of the changelog deltas with focus
  on framer-motion 12.x and recharts 2.x runtime-shape changes.
- C2.5 — `lodash` and `yaml` if still flagged; otherwise close the
  Dependabot alerts as "covered by overrides" with the specific override
  line cited.

### C3 — Capacitor shell (mobile distribution)

C3.1 — Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`,
`@capacitor/ios`. Run `npx cap init "Pixel's PyGame Palace"
"com.arcadecabinet.professorpixel" --web-dir=dist`. Commit the generated
`capacitor.config.ts`, `android/`, `ios/` directories.

C3.2 — Capacitor-aware Vite build: `dist/` already works, but the
`pyodide-sw.js` registration path needs `if (window.location.protocol !==
'capacitor:')` guarding. Service workers don't run inside Capacitor
WebView; fall back to in-memory pyodide-cache there (it's a slower cold
start but doesn't break boot).

C3.3 — Android signing config under `android/app/keystore/` (gitignored)
+ `signing.properties.example` (committed). Document the keystore
generation + Play Store upload workflow under `docs/deployment/android.md`.

C3.4 — iOS provisioning profile workflow at `docs/deployment/ios.md` —
no auto-signing in CI (Apple's restrictions); the doc explains the
manual Xcode upload-to-TestFlight loop.

C3.5 — `.github/workflows/cd-mobile.yml` builds the APK on every push
to `main`, uploads as a workflow artifact. Manual trigger only for the
signed Play Store build (uses `secrets.ANDROID_KEYSTORE_BASE64`).

### C4 — Docs sweep (no errata files)

The user's directive: **update existing docs in place, frontmatter-headed
pillars only, no `errata-N.md` clutter.** The launcher PR landed without
docs updates; this is the catch-up.

C4.1 — `docs/STATE.md`: flip "Next" entries that are now done (launcher,
play page, send-mode export, OPFS migration). Move modernization M2.2
and M4.2 to "In flight" pointing at this PRQ. Frontmatter `last_updated`
bumps to 2026-05-05.

C4.2 — `docs/architecture/launcher.md` (new — but the only new file in
this whole PRQ). Frontmatter-headed pillar: title / created / status /
parent. Sections: OPFS layout, /play state machine, the
`shouldUseOpfs()` dual-backend routing, the launcher-vs-export split,
the SW atomic-write contract. Cross-reference from `docs/STATE.md` and
`docs/architecture/README.md`.

C4.3 — `docs/architecture/pyodide.md` (existing): add the OPFS cache
section. Document the `pyodide-cache-vN` directory naming and the
version-bump eviction protocol from `pyodide-sw.js`.

C4.4 — `docs/deployment/README.md` (existing): expand to cover the
three tracks: web (Vite static), PWA (manifest already shipped), mobile
(Capacitor — links to the per-OS docs from C3.3 / C3.4).

C4.5 — `docs/plans/modernization-pillar.prq.md`: flip the M2.2 + M4.2
checkboxes once C1.1 + C1.2 land, transition `status: ACTIVE` → `status:
RELEASED`. Same for `docs/plans/foundations-pillar-completion.prq.md`
(its T2.x section).

## Dependencies

- C1 commits before C2 (dep bumps may shift Vitest behavior; want
  thresholds locked first as a regression net).
- C2.3 (react-resizable-panels major bump) before C3 (Capacitor shells
  the same UI; want known-good UI deps first).
- C3 before C4.4 (deployment doc references the Capacitor scaffolding
  paths; document after they exist).
- C4 lands last as a single docs-sweep commit (or multiple if the diff
  is too large to review in one).

## Acceptance Criteria

### Per-task completion

- C1.1: `tests/unit/simulator-frame-rate.test.ts` passes with mean
  frame cost asserted; `simulator.ts` no longer reaches `document.*`
  outside the factory function.
- C1.2: `pnpm test:coverage` exits non-zero on a synthetic regression
  (delete a covered line, verify CI fails).
- C2.x: For each direct-dep bump, `pnpm check && pnpm lint && pnpm
  test:unit && pnpm test:integration && pnpm test:component` all green.
  Dependabot PRs merged or closed-with-cite.
- C3.1: `npx cap doctor` reports no missing native deps.
- C3.2: Service worker registration is no-op inside `capacitor:`
  protocol; in-memory pyodide cache used instead.
- C3.5: Workflow artifact `professor-pixel-debug.apk` produced on `main`
  push, ≤80MB, installs on Android emulator.
- C4.1-C4.5: Each existing doc has updated `last_updated` frontmatter;
  the new `docs/architecture/launcher.md` is the only file added.

### Branch-level

- Single squash-merged PR with conventional-commit history
  (`feat(launcher-test): C1.1 simulator factory`, `chore(deps): C2.1
  bump jsdom`, etc).
- All CI checks green at squash time: Type check + build, Biome
  (blocking), Vitest, CodeQL.
- Dependabot dashboard at 0 high-severity vulns post-merge.
- `docs/STATE.md → Next` reflects the post-merge reality (Capacitor
  Play Store rollout, then content track).

## Risks

- **R1:** react-resizable-panels v3+ rename surface is wider than the
  changelog suggests. Mitigation: spike the bump first, revert if
  >2 hours of churn; pin at 2.x with override and re-evaluate next PRQ.
- **R2:** Capacitor adds 200MB of Android Studio artifacts to the
  developer setup. Mitigation: gitignore `android/build/`,
  `android/.gradle/`, `android/app/build/`; document the one-time
  Android Studio install in `docs/deployment/android.md`.
- **R3:** iOS testing requires a physical Mac + Xcode 16+. CI can't
  fully validate the iOS bundle. Mitigation: build-only check in CI
  (`xcodebuild -workspace`), defer App Store submission to manual
  Mac workflow until a self-hosted runner is available.

## Notes

- This PRQ uses ID prefixes C1 / C2 / C3 / C4 to disambiguate from the
  M-prefixed modernization tasks in the parent PRQ.
- Per the user's "stop asking permission mid-batch" directive, this
  PRQ is the authorization for the entire scope above. Execute
  continuously; ship one PR; squash-merge when green.
