---
title: Wizard / coverage / simulator-harness pillar
status: ACTIVE
priority: HIGH
owner: jonbogaty@gmail.com
created: 2026-05-04
---

# Wizard / coverage / simulator-harness pillar

Three carved-off items from `docs/STATE.md → Next` (modernization-M2.2 + -M2.3 + -M4.2). They cluster naturally because the simulator harness unblocks both M4.2 (frame-rate test) and a chunk of the coverage ratchet (right now `src/pygame/runtime/simulator.ts` is 0% covered at 1800 LOC).

## Goal

- **W1 — Pin a coverage floor with explicit ratchet doctrine.** Set thresholds at a touch above the current baseline (6/4/4/6) so regressions are blocked. Add prose to `vitest.config.ts` documenting the per-PR ratchet protocol.
- **W2 — Replace the deleted `wizard-dialogue-engine.test.tsx` with focused integration tests.** The deleted test was quarantined because the wizard dialogue engine moved from `client/src/components/wizard-dialogue-engine.tsx` to `app/components/wizard/dialogue-engine.tsx` with the layout reshuffle. New tests target the post-restructure shape: option selection updates session actions, persisted state restores on mount, dialogue step advances on `advance()`, flow loading via `fetch` mock.
- **W3 — Stand up a deterministic simulator test harness, then author the M4.2 frame-rate test.** Harness provides a fake `CanvasRenderingContext2D` recording calls + a controlled time source. With it: assert `pygame.draw.circle(...)` enqueues the right `DrawCommand`; `flushFrameBuffer()` plays them back through the recorder; `pygame.time.Clock().tick(60)` lands a `currentFPS` reading near 60 when frames are paced at 16.67ms.

## Tasks

### W1 — Coverage floor + ratchet doctrine

- [ ] W1.1 `vitest.config.ts` — add `coverage.thresholds` with `statements: 6, branches: 4, functions: 4, lines: 6`. Block-comment above explains: this is a floor, not a goal; ratchet up per-PR as new tests land; never lower without unanimous review.
- [ ] W1.2 `docs/pillars/01-frontend.md` — short "Coverage" subsection under "Component conventions" pointing at the threshold config and stating the ratchet doctrine.

### W2 — Wizard dialogue integration tests

- [ ] W2.1 `tests/integration/wizard-dialogue-engine.test.tsx` (recreated) — use `renderHook(useWizardDialogue)`, mock `loadWizardState` + `saveWizardStateDebounced` from `@lib/storage/persistence`, mock `fetch` for flow loading. Assert: (a) flow loads and `currentNode` resolves; (b) `handleOptionSelect(option)` updates `sessionActions.choices`; (c) `advance()` increments `dialogueStep`; (d) persisted state on mount restores `currentNodeId`.
- [ ] W2.2 Confirm `pnpm test:integration` runs the new file (`tests/integration/**/*.test.{ts,tsx}` glob is already in `vitest.config.ts`).

### W3 — Simulator harness + frame-rate test

- [ ] W3.1 New `tests/helpers/simulator-harness.ts` — exports `createFakeCanvasContext()` returning a stub recording calls (`{ type: 'fillRect', args: [...] }`-style ledger) plus `clearLedger()` and `getLedger()`; exports `controlledTime()` returning `{ now(): number; advance(ms: number) }` and a `vi.spyOn(performance, 'now')` install/uninstall pair.
- [ ] W3.2 `src/pygame/runtime/simulator.ts` — add `getCurrentFPS(): number` test-friendly probe (today `currentFPS` is module-internal and only readable via the `PygameClock.get_fps()` instance method).
- [ ] W3.3 New `tests/unit/pygame-simulator.test.ts` covering: harness mounts and unmounts cleanly; `pygame.draw.circle(surface, [255,0,0], [10,20], 5)` enqueues a circle DrawCommand; `flushFrameBuffer()` plays the command through to the fake context (`fillStyle = '#ff0000'`, `arc(10,20,5,0,τ)`, `fill()`); `pygame.time.Clock().tick(60)` — paced via `controlledTime()` advancing 16ms per tick — yields `getCurrentFPS()` in the 55–65 band over 10 frames (the M4.2 test).

### Docs

- [ ] D1 `docs/STATE.md` — wizard/coverage/simulator-harness PRQ Next → Done.
- [ ] D2 `docs/pillars/02-runtime.md` — note the simulator harness in `tests/helpers/` and what it makes testable.

## Out of scope

- We do not chase the 90/85/90/90 figures from the original modernization PRQ. Those require thousands of new tests; per-PR ratchet is the realistic path.
- The simulator harness covers canvas + clock determinism. Audio (PygameSound) and input events are not in this PR — they're not under test today and adding them would balloon the harness.
