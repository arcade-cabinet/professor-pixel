---
title: Finishing pillar — everything remaining
status: ACTIVE
priority: HIGH
owner: jonbogaty@gmail.com
created: 2026-05-04
---

# Finishing pillar

Sweep everything remaining in `docs/STATE.md → Next` into one PR. No more carve-offs.

## Scope (everything left)

1. **Coverage floor + ratchet doctrine** (was modernization-M2.2)
2. **Wizard dialogue integration tests** (was modernization-M2.3 carve-off)
3. **Simulator harness + M4.2 frame-rate test** (was modernization-M4.2 carve-off)
4. **Per-game-type playtest fixes** (was the 5×`docs/playtests/` carve-off): the analysis.md PRIORITY FIXES list — fix `transitionToSpecializedFlow` engine path coverage, remove single-option "continue" buttons, auto-advance after asset selection. Where possible these become engine fixes + tests; flow-JSON-only items get noted in the playtest docs but not redesigned.
5. **STATE.md/CHANGELOG sweep** — Active flips to RELEASED, every Next item moves to Done, and `Next` becomes empty (which is the goal).

## Tasks

### F1 — Coverage floor

- [x] F1.1 vitest.config.ts coverage.thresholds = {6, 4, 4, 6}; comment block documents ratchet doctrine.
- [x] F1.2 docs/pillars/01-frontend.md "Coverage" subsection.

### F2 — Wizard dialogue integration tests

- [ ] F2.1 `tests/integration/wizard-dialogue-engine.test.tsx` (recreated for post-restructure dialogue-engine.tsx) — `renderHook(useWizardDialogue)` + mocked `loadWizardState` / `saveWizardStateDebounced` / `fetch`. Cover: flow loads and `currentNode` resolves; `handleOptionSelect(option)` updates `sessionActions.choices`; `advance()` increments `dialogueStep`; persisted `currentNodeId` restores on mount; `transitionToSpecializedFlow` action triggers a second flow load (the playtest analysis "blocking" item).

### F3 — Simulator harness + frame-rate test

- [ ] F3.1 `tests/helpers/simulator-harness.ts` — `createFakeCanvasContext()` returning a stub recording calls + `getLedger()`/`clearLedger()`; `controlledTime()` returning `{ now(), advance(ms), install(), uninstall() }` to deterministically drive `performance.now`.
- [ ] F3.2 `src/pygame/runtime/simulator.ts` — add `getCurrentFPS(): number` test-friendly probe.
- [ ] F3.3 `tests/unit/pygame-simulator.test.ts` — harness mounts/unmounts; `pygame.draw.circle(...)` enqueues a circle DrawCommand; `flushFrameBuffer()` plays it through (`fillStyle = '#ff0000'`, `arc(...)`, `fill()`); `pygame.time.Clock().tick(60)` paced via `controlledTime()` advancing 16ms per tick yields `getCurrentFPS()` in the 55–65 band over 10 frames (the M4.2 test).

### F4 — Playtest analysis fixes (engine, not flows)

- [ ] F4.1 `transitionToSpecializedFlow` engine path — trace the failure analysis.md flagged, fix the bug. Add an integration test in F2.1's file asserting the specialized flow loads.
- [ ] F4.2 Remove single-option "continue" buttons. Update `shouldShowContinue` / `shouldShowOptions` in `src/wizard/utils.ts` so a single option whose text matches a "continue" pattern routes to the existing `<ContinueButton>` instead of a 1-item options list.
- [ ] F4.3 Auto-advance after asset selection. When an option carries `selectAsset`, advance the dialogue automatically. Touch `handleOptionSelect` in `dialogue-engine.tsx` and add a test.

### F5 — Docs / state sweep

- [ ] F5.1 Update each of `docs/playtests/{platformer,dungeon,puzzle,rpg,racing,space}.md` — annotate the resolved CRITICAL WEAK POINTS entries with **CLOSED:** prefix + the commit. Don't delete the prose — they're observation logs of past failure modes.
- [ ] F5.2 Update `docs/playtests/analysis.md` — same annotation treatment for the PRIORITY FIXES list.
- [ ] F5.3 Update `docs/STATE.md` — finishing pillar Next → Done; Next becomes empty. Active flips to RELEASED.
- [ ] F5.4 `.agent-state/directive.md` Status: ACTIVE → RELEASED.

## Out of scope

- Coverage push to 90/85/90/90 — ratchet doctrine handles that going forward.
- New game types beyond the 7 already supported.
- Audio (PygameSound) test harness — silently functional, not under regression.
- Flow-JSON-only design fixes (themed asset bundles, A/B variants) — these are content design, not engineering; logged in playtest docs as observations, picked up by content authors as separate non-engineering work.
