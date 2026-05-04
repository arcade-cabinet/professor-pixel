---
title: Docs Index
updated: 2026-05-04
status: current
domain: meta
---

# Docs Index

The five strategic pillars each have a single authoritative file under `pillars/`.
Cross-pillar contracts live in `ARCHITECTURE.md`. Operational concerns (deploy, testing) sit at the top level.

## Pillars

| # | Pillar | File | What's in it |
|---|--------|------|--------------|
| 1 | Frontend | [`pillars/01-frontend.md`](pillars/01-frontend.md) | React 18 + Vite + TypeScript + Tailwind + shadcn + Monaco; the `app/` vs `src/` boundary; aliases; build pipeline |
| 2 | Runtime | [`pillars/02-runtime.md`](pillars/02-runtime.md) | Pyodide loader, vendored & version-pinned; Web Worker via Comlink; timeouts; the PyGame simulator on the canvas |
| 3 | Lesson engine | [`pillars/03-lesson-engine.md`](pillars/03-lesson-engine.md) | Zod schema, authoring workflow, sequencing & prerequisites, step-level resume |
| 4 | Grading | [`pillars/04-grading.md`](pillars/04-grading.md) | AST rules + runtime rules; partial credit + scoring; resource caps; every rule kind documented |
| 5 | Design system | [`pillars/05-design-system.md`](pillars/05-design-system.md) | Tokens, Tailwind config, Pixel mascot voice, accessibility primitives |

## Cross-pillar

| File | What's in it |
|------|--------------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | High-level diagram, the boundaries between pillars, the build pipeline. No per-pillar detail — that lives in `pillars/`. |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | GitHub Pages workflow, secrets, environments, rollback |
| [`TESTING.md`](TESTING.md) | Unit / integration / component / e2e split, runners, test-id conventions |
| [`STATE.md`](STATE.md) | What's done, what's active, what's queued. Updated whenever a slice ships. |
| [`DESIGN.md`](DESIGN.md) | Product vision, voice, educational philosophy. UI-token specifics live in `pillars/05-design-system.md`. |

## Plans (working documents)

| File | What's in it |
|------|--------------|
| [`plans/foundations-pillar-completion.prq.md`](plans/foundations-pillar-completion.prq.md) | The PRQ that defined the runtime + lessons + grading + docs work. Kept as historical record. |

## Playtests

| File | What's in it |
|------|--------------|
| [`playtests/`](playtests/) | Per-game-type playtest notes (platformer, dungeon, racing, puzzle, rpg, space, analysis) |
