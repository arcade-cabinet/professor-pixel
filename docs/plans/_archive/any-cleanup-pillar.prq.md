---
title: any cleanup pillar
status: active
domain: typescript-discipline
created: 2026-05-04
parent: docs/plans/modernization-pillar.prq.md
---

# `any` cleanup pillar

Carved off `modernization-pillar.prq.md` M2.1 after the bulk `any → unknown` attempt was rolled back (60+ cascading TS errors). The PRQ's own Risk callout named this: *"some are in third-party type gaps... those need a structural fix, not a per-instance one."* The structural fix is what this pillar delivers.

## Goal

Drive the codebase to zero `any` annotations by typing the seams properly, then flip Biome's `noExplicitAny` to `error` so regressions can't land.

## Inventory at branch start

`rg -c ":\s*any\b" -g '*.{ts,tsx}' -g '!*.d.ts'` counts **151** colon-any annotations across 22 files; an additional **12** `<any>` generics and **50** `as any` casts bring the rough total to **213** instances.

Top offenders:

| File | colon-any |
|---|---|
| `src/monitoring/console-logger.ts` | 43 |
| `src/pygame/runtime/simulator.ts` | 19 |
| `src/monitoring/health.ts` | 13 |
| `src/net/retry.ts` | 10 |
| `src/hooks/use-retry-query.ts` | 8 |
| `src/types/schema.ts` | 4 |
| `src/storage/session-history.ts` | 4 |
| `src/net/update-bridge.ts` | 4 |
| `src/net/data.ts` | 4 |
| `src/hooks/use-debug.ts` | 4 |
| `app/components/editor/properties.tsx` | 4 |

## Why a per-instance pass failed before

`pyodide: any` is sprinkled through `simulator.ts`, `error-handler.ts`, `update-bridge.ts`, and 3 components. Mechanically rewriting these to `unknown` triggers ~60 errors at every `pyodide.runPython(...)` / `pyodide.globals.set(...)` call site, because the `unknown`-typed value has no methods. The fix is to use the existing `PyodideInstance` ambient interface (in `src/types/pyodide.d.ts`) at every annotation site that holds a Pyodide instance.

For `runPython` return values (currently `unknown`), call sites need explicit casts at the boundary — `pyodide.runPython(...) as string`, etc. — because Pyodide can return arbitrary Python values and TypeScript can't infer them.

The remaining `any`s split into roughly three buckets:

1. **Log/event payloads** (`data?: any` in `LogEntry`, `payload: any` in retry/event types) → `unknown`.
2. **Legacy state shapes** (`Partial<unknown>` in storage/persistence migration code) → typed migration helpers.
3. **Third-party library escape hatches** (Monaco editor instance refs, drag-and-drop ref typings) → narrow types from the library when available, `unknown` + cast at boundary otherwise.

## Tasks

### A1 — Pyodide site sweep

- [ ] A1.1 Replace every `pyodide: any` / `pyodide?: any` / `useRef<any>` (Pyodide instance shape) with `PyodideInstance` / `PyodideInstance | null`. Sites: `app/components/wizard/with-preview.tsx:14`, `app/components/pygame/live-preview.tsx:47`, `app/components/pygame/runner.tsx:29`, `src/net/update-bridge.ts:20,27,393`, `src/python/error-handler.ts:757`, `src/pygame/runtime/simulator.ts:841,900,1007,1636`.
- [ ] A1.2 Replace `(window as any).pyodide` / `(globalThis as any).pyodideInstance` accesses with the typed `Window.pyodide` ambient already in `src/types/pyodide.d.ts`. Sites: `src/monitoring/health.ts:65,113`, `src/python/error-handler.ts:402,602`.
- [ ] A1.3 Add explicit return-type casts at `pyodide.runPython` call sites where the result is consumed (string output → `as string`, number → `as number`, dict → `as Record<string, unknown>`). Audit-driven: only cast at sites that compile-fail after A1.1.

### A2 — Log/event payload sweep

- [ ] A2.1 `src/monitoring/console-logger.ts` — flip `data?: any` on `LogEntry` to `data?: unknown`; cascade through every `log({ data: ... })` call site. Most consumers either `JSON.stringify(data)` (safe with unknown) or do nothing with it.
- [ ] A2.2 `src/monitoring/health.ts` — `metadata?: any` on health probe payloads → `unknown`.
- [ ] A2.3 `src/net/retry.ts` + `src/hooks/use-retry-query.ts` — retry-callback payload `any` → `unknown`. Caught errors need `instanceof Error` guards or `String(err)` coercions.
- [ ] A2.4 `src/errors/tracker.ts` — error-tracker context `any` → `unknown` with `instanceof` guards in serializer.

### A3 — Storage/persistence shape typing

- [ ] A3.1 `src/storage/persistence.ts` + `src/storage/session-history.ts` + `src/storage/mode.ts` — author `LegacyPersistedShape` type capturing the v1 fields the migration helper reads, replace `Partial<unknown>` and `data: any` with the typed shape + `Record<string, unknown>` for the unknown-key bag.
- [ ] A3.2 `src/types/schema.ts` — replace 4 `any`s with the Zod `infer` types they're standing in for.

### A4 — Component / editor refs

- [ ] A4.1 `app/components/editor/code-editor.tsx:52` — Monaco `useRef<any>` → import Monaco's editor type (`monaco.editor.IStandaloneCodeEditor | null`).
- [ ] A4.2 `app/components/editor/properties.tsx` — 4 `any`s on property-inspector value bag → discriminated-union over the property kinds the inspector actually handles (`StringProp | NumberProp | BoolProp | ...`).
- [ ] A4.3 `app/components/wizard/universal.tsx` — 3 `any`s on wizard step payload → `Record<string, unknown>` since payload shape varies by flow; downstream consumers cast at use site.

### A5 — pygame simulator + components

- [ ] A5.1 `src/pygame/runtime/simulator.ts` remaining 15 non-Pyodide `any`s — most are component-config-value bags. Replace with `Record<string, unknown>` or the appropriate component config type from `src/pygame/components/types.ts`.
- [ ] A5.2 `src/pygame/components/types.ts` — 2 `any`s on component value getters → generics.

### A6 — Net + hooks tail

- [ ] A6.1 `src/net/update-bridge.ts` — non-Pyodide `any` (1 leftover after A1.1) → typed bridge-message union.
- [ ] A6.2 `src/net/data.ts` — 4 `any`s on cached-response payload → `unknown` (call sites already use Zod for validation).
- [ ] A6.3 `src/hooks/use-debug.ts` — 4 `any`s on debug-panel rows → `Record<string, unknown>`.

### A7 — Test helpers

- [ ] A7.1 `tests/helpers/test-utils.ts` + `tests/e2e/run-comprehensive-tests.ts` — 4 `any`s on RTL/Playwright option bags → the library-provided types.

### A8 — `<any>` generics + `as any` casts

- [ ] A8.1 Walk the 12 `<any>` generic instantiations and 50 `as any` casts. Most cluster in monitoring + tests; expect ~10 to remain as **annotated** `as unknown as <T>` boundary casts at MSW handler shims (third-party type gap) — those are documented exceptions, not violations.

### A9 — Flip Biome to `error`

- [ ] A9.1 `biome.json` — `noExplicitAny` from `warn` to `error`. Run `pnpm biome check --error-on-warnings` to confirm clean. CI now blocks regressions.

### A10 — Docs

- [ ] A10.1 `docs/STATE.md` — move `any cleanup PRQ` from Next → Done as a single milestone row; update the "remaining carve-offs" Next list.
- [ ] A10.2 `docs/pillars/01-frontend.md` — add a "TypeScript discipline" subsection naming the `noExplicitAny: error` posture and the documented escape-hatch pattern (`as unknown as T` with a `// no-explicit-any: <reason>` comment).

## Stop conditions

- All `[ ]` flip to `[x]`.
- `pnpm check` clean.
- `pnpm biome check --error-on-warnings` clean.
- `pnpm test:unit` + `pnpm test:integration` + `pnpm test:component` green.
- Branch ready to PR + squash-merge.

## Out of scope

- Refactoring the Pyodide return-value typing into structured types per call (lesson-runner / simulator generate bespoke return shapes per call; case-by-case casts are correct here, not a global type).
- Coverage thresholds — that's the separate `wizard / coverage / simulator-harness` PRQ.
- `runtimeRules.variableExists` worker-side fix — separate `grader follow-ups` PRQ.
