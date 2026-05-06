---
title: Docs Index
updated: 2026-05-06
status: current
domain: meta
---

# Docs Index

Seven strategic pillars under `pillars/`, each a single authoritative file with its own frontmatter. Cross-pillar contracts live in `ARCHITECTURE.md`. Operational concerns (deploy, testing, state) sit at the top level. Working PRQs live under `plans/`; merged PRQs move to `plans/_archive/`.

## Pillars

| # | Pillar | File | What's in it |
|---|--------|------|--------------|
| 1 | Frontend | [`pillars/01-frontend.md`](pillars/01-frontend.md) | React 19 + Vite + TypeScript + Tailwind + shadcn + Monaco; `app/` vs `src/` boundary; aliases; build pipeline; wouter base; audio toggle; edge-swipe; skeleton/aria-busy |
| 2 | Runtime | [`pillars/02-runtime.md`](pillars/02-runtime.md) | Pyodide bootstrap (worker + main-thread singleton); Comlink; timeouts; OPFS WASM cache; iOS voiceschanged race; PyGame simulator on canvas |
| 3 | Lesson engine | [`pillars/03-lesson-engine.md`](pillars/03-lesson-engine.md) | Zod schema, authoring workflow, sequencing + prerequisites, step-level resume |
| 4 | Grading | [`pillars/04-grading.md`](pillars/04-grading.md) | AST rules + runtime rules; partial credit + scoring; resource caps; every rule kind with examples |
| 5 | Design system | [`pillars/05-design-system.md`](pillars/05-design-system.md) | Tokens, Tailwind config, Pixel mascot voice, accessibility primitives |
| 6 | Storage | [`pillars/06-storage.md`](pillars/06-storage.md) | OPFS saved-games library; migration sentinel; write-then-rename atomicity; Pyodide WASM OPFS cache; Emscripten FS asset mounting |
| 7 | Deploy | [`pillars/07-deploy.md`](pillars/07-deploy.md) | GitHub Pages subpath; Capacitor Android APK + signed-release; iOS TestFlight; `src/utils/base-url.ts`; production-shape e2e; trusted-ref CI guards |

## Cross-pillar

| File | What's in it |
|------|--------------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | High-level diagram, boundaries between pillars, build pipeline. No per-pillar detail — that lives in `pillars/`. |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | GitHub Pages, Capacitor Android, iOS TestFlight runbooks. Per-OS workflows; secrets; environments; rollback. |
| [`TESTING.md`](TESTING.md) | Unit / integration / component / e2e split; runners; production-shape suite; test-id conventions. |
| [`STATE.md`](STATE.md) | What's done, active, queued. Updated whenever a slice ships. If this and `git log` disagree, fix this. |
| [`DESIGN.md`](DESIGN.md) | Product vision, voice, educational philosophy. UI-token specifics live in `pillars/05-design-system.md`. |

## Plans (working documents)

Active PRQs sit at the top of `plans/`. Merged PRQs move to `plans/_archive/` so the active surface stays focused.

| File | What's in it |
|------|--------------|
| [`plans/post-30-consolidation.prq.md`](plans/post-30-consolidation.prq.md) | Active. Docs structure, plan-file archive, runbook closure for everything that fell out of #30. |
| [`plans/_archive/`](plans/_archive/) | Historical record of every merged pillar PRQ. See `_archive/README.md` for the index. |

## Playtests

| File | What's in it |
|------|--------------|
| [`playtests/`](playtests/) | Per-game-type playtest notes (platformer, dungeon, racing, puzzle, rpg, space, analysis). Engine-level CRITICAL items closed; remaining `**WEAK**`/`**FIX**` items are content-design tracks. |
