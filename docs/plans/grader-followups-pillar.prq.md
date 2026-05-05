---
title: Grader follow-ups pillar — worker-side variableExists + dev HUD overlay
status: ACTIVE
priority: HIGH
owner: jonbogaty@gmail.com
created: 2026-05-04
---

# Grader follow-ups pillar

Two carved-off items from `docs/STATE.md → Next` that the modernization pillar deferred. Now in scope because:

1. The `any` cleanup pillar gave us a fully-typed `PyodideInstance` ambient. Threading globals across the worker boundary no longer fights the type system.
2. PR #21 establishes the type-design vocabulary (`ErrorShape` probe, narrow Window casts, validateAndMigrate boundary). Reuse where applicable.

## Goal

- **G1 — `runtimeRules.variableExists` actually works for worker-routed lessons.** Today the rule queries main-thread Pyodide globals, but the worker runs the user's code in its own Pyodide, so the rule reads a Pyodide that never executed the snippet. For worker-routed lessons the rule is silently false. Move the lookup to the worker side, mirroring the `trackFunctions` plumbing that landed in M5.1.
- **G2 — Dev HUD overlay for cold-start budget instrumentation.** The cold-start budget instrumentation landed in M4.1 but only emits to console. Add a small floating debug-info panel (visible only when `?debug=1` or `localStorage.debug='1'`) showing the last cold-start measurement, current Pyodide state, and the active worker-vs-main-thread routing.

## Tasks

### G1 — Worker-side variableExists

- [ ] G1.1 `RunOptions.inspectGlobals?: string[]` added to `worker-runner.ts`. Plumbed through `WorkerPythonRunner.runSnippet → remote.runSnippet`.
  - Verification: `pnpm check` clean.
- [ ] G1.2 `WorkerRunner.runSnippet` (worker.ts) accepts `inspectGlobals?: string[]` and adds returned `globals: Record<string, unknown>` to `RunResult`. Use Pyodide's `pyodide.globals.get(name)` per name; for any name that returns a `PyProxy`, call `toJs({ dict_converter: Object.fromEntries })` if a dict, otherwise just pass through. For `undefined` values, omit the key from the returned record (so consumers can use `name in globals` to check existence).
  - Verification: `pnpm check` clean; new test in `tests/unit/grading/runtime.test.ts` for the existence-vs-falsy semantics.
- [ ] G1.3 `engine.ts` collects `inspectGlobals` from every step's `runtimeRules.variableExists` (mirror `collectTrackFunctions`); passes to `runSnippet`; threads `globals` into `validateRuntime`.
  - Verification: `pnpm check` clean.
- [ ] G1.4 `runtime.ts` `validateRuntime` signature gets `globals?: Record<string, unknown>` parameter (after `functionCalls`). The `variableExists` loop reads `name in globals` instead of `pyodide.globals.get(name) !== undefined`. The legacy `pyodide` parameter stays for AST validation paths. Update the doc comment.
  - Verification: `pnpm check` clean; existing tests still green.
- [ ] G1.5 New test `tests/unit/grading/variable-exists-worker.test.ts` (or extend existing) exercising the full worker path: `runner.runSnippet({ code: 'x = 0; y = ""', inspectGlobals: ['x', 'y', 'z'] })` returns `globals: { x: 0, y: "" }` (no `z`); `validateRuntime` with `variableExists: ['x', 'y', 'z']` produces 2 passed + 1 failed.

### G2 — Dev HUD overlay

- [ ] G2.1 New `app/components/dev-hud.tsx` — fixed bottom-right floating panel. Reads from existing `__performanceMonitor` ambient (cold-start measurements landed in M4.1) and the page's worker runner singleton. Three rows: cold-start ms, Pyodide state (`uninitialized` / `loading` / `ready` / `error`), worker-vs-main mode for current lesson.
- [ ] G2.2 Mounted at the App root, gated by `useDebugFlag()` hook reading `localStorage.debug === '1'` or `URLSearchParams.has('debug')`. SSR-safe (returns `false` during initial render to avoid hydration mismatch — but this is a pure client SPA so just guard the `localStorage` access).
- [ ] G2.3 Hide behind a CSS-only collapse (chevron toggle) — opens to a 280×120 panel, collapses to a 32×32 button. Persists collapsed state in `localStorage.debug-hud-collapsed`.
- [ ] G2.4 Component test in `tests/component/dev-hud.test.tsx` — mounts with `localStorage.debug='1'`, asserts the three rows render; without the flag, asserts nothing renders.

### Docs

- [ ] D1 Update `docs/STATE.md` — move grader-followups PRQ from Next → Done milestone row.
- [ ] D2 Update `docs/pillars/04-grading.md` — note the `inspectGlobals` plumbing in the worker section.
- [ ] D3 Update `docs/pillars/01-frontend.md` — add a one-line dev-hud reference under "Component conventions" or a new "Debug surfaces" subsection.

## Out of scope

- The dev HUD does not need toggleable verbosity, log streaming, or settings persistence beyond the collapsed state. It's a visible-when-debugging readout, not a devtools panel.
- We're not changing `functionCalled` plumbing — it already works correctly via the worker tracer.
