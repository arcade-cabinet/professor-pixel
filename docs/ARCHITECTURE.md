---
title: Architecture
updated: 2026-05-05
status: current
domain: technical
---

# Architecture

> Cross-pillar contracts and the build pipeline. Per-pillar detail lives in [`pillars/`](pillars/).
> When this doc and code disagree, the code wins **and this doc gets fixed in the same PR**.

## One-paragraph summary

A React 18 + TypeScript single-page app, built with Vite. **No backend.** All persistence is browser-side (localStorage / sessionStorage / cookies); all Python user code runs in the browser via Pyodide on a Web Worker; a custom PyGame simulator intercepts draw/event calls and renders them onto an HTML5 canvas. The app deploys as a **static SPA to GitHub Pages**. Lesson and asset content is shipped as static JSON / generated catalog files in `public/`.

## High-level diagram

```text
┌─────────────────────────────────── Browser (only runtime) ───────────────────────────────┐
│                                                                                          │
│   React SPA (Vite build)                                                                 │
│   ├─ Pillar 1 — Frontend                                                                 │
│   │     wouter, TanStack Query, shadcn/Radix, Tailwind, Monaco, Framer Motion            │
│   │                                                                                      │
│   ├─ Pillar 2 — Runtime                                                                  │
│   │     Pyodide (vendored under public/pyodide/) on a Web Worker via Comlink             │
│   │     PyGame simulator on <canvas>                                                     │
│   │                                                                                      │
│   ├─ Pillar 3 — Lesson engine                                                            │
│   │     Zod-validated catalog from /api/static/lessons.json                              │
│   │     Loader + sequencer + per-step resume                                             │
│   │                                                                                      │
│   ├─ Pillar 4 — Grading                                                                  │
│   │     AST + runtime rules; partial credit; per-test caps                               │
│   │                                                                                      │
│   └─ Pillar 5 — Design system                                                            │
│         Tokens via CSS variables; shadcn/Radix primitives; Pixel mascot voice            │
│                                                                                          │
│   Persistence: localStorage / sessionStorage / cookies                                   │
│   Static content: GET /assets/catalog.json, /api/static/lessons.json                     │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

See each pillar's file in [`pillars/`](pillars/) for internal detail.

## Repository layout

Capacitor-style flat: one `app/`, one `src/`, one `public/` at the repo root.

```text
app/                React TSX (.tsx only)         → pillars/01-frontend.md
src/                TypeScript domain logic       → all pillars
public/             Static assets, served as-is
tests/              unit / integration / component / e2e
scripts/            build-asset-catalog, copy-pyodide
docs/               this directory
```

| Alias | Resolves to |
|-------|-------------|
| `@/*` | `./app/*` (TSX) |
| `@lib/*` | `./src/*` (TS logic) |
| `@assets/*` | `./app/assets/*` (bundled images) |

## Cross-pillar boundary rules

- **`app/` holds TSX; `src/` holds TS.** No mixing. `app/` may import from `src/` (via `@lib/*`); `src/` never imports from `app/`. If you need React-aware logic in `src/`, expose a hook (`use-*.ts`).
- **Python never runs outside Pyodide.** The PyGame simulator is the only code that knows about both Python output and the canvas.
- **Async UI state goes through TanStack Query.** Components don't `fetch` directly. The lesson catalog and Pyodide bootstrap both flow through `useQuery`.
- **Storage is behind `@lib/storage/persistence`.** Versioned, migrated, debounced. Components call `saveWizardState` / `loadWizardState` / `saveSessionState`.
- **Cross-domain data is Zod.** Anything coming from network JSON, localStorage, or postMessage is validated at the boundary. The TS type is `z.infer<typeof Schema>` so the validator and the type can never drift.
- **Replit dev plugins are dev-only.** Guarded by `NODE_ENV !== 'production'` and `REPL_ID` presence in `vite.config.ts`.

## Build pipeline

```text
src + app + public ── tsc (pnpm check) ── type errors gate everything else
                   └─ vite build ─────────► dist/   (static SPA + bundled assets)
```

| Hook | Command |
|------|---------|
| `postinstall` | `node scripts/copy-pyodide.mjs` — vendor Pyodide |
| `predev` / `prebuild` | `build-asset-catalog.mjs && copy-pyodide.mjs` |
| `dev` | `vite` on port 5173, HMR |
| `build` | `tsc && vite build` |
| `preview` | `vite preview` of `dist/` |

GitHub Pages deploy: `.github/workflows/cd.yml` runs `vite build` with a computed `--base="$BASE"`, copies `index.html` to `404.html` for SPA routing, uploads `dist/`.

## Data flows (cross-pillar entry points)

### Lesson view

1. User visits `/lesson/:lessonId`.
2. `LessonPage` runs `useQuery(['lessons', lessonId], loadLessons)` — the loader fetches `/api/static/lessons.json` and validates with `LessonSchema.array().parse(...)`.
3. `useQuery(['pyodide'], getPyodide)` boots the main-thread Pyodide singleton (Pillar 2). Run/Check execution goes through `getWorkerRunner()` (worker-backed) — the singleton is held only because the grader's AST validator runs Python `ast.parse` on the main thread.
4. Monaco renders `step.initialCode`; on **Run**, code goes through the worker runner with a hard timeout; on **Check**, the grader (Pillar 4) returns a `GradeResult` with score + per-rule pass/fail.
5. `UserProgress` is persisted to localStorage on every advance.

### Wizard flow

1. User starts at `/wizard`.
2. The Universal Wizard loads a JSON-driven flow keyed by game type.
3. Persistence (`@lib/storage/persistence`) tracks active flow path, current node, session actions, selected components in localStorage with versioned migration.
4. Live preview compiles the assembly and runs it in the same Pyodide+canvas seam used by lessons.
5. On export, the project is zipped (README + runnable PyGame source) and downloaded.

### Asset catalog

1. `scripts/build-asset-catalog.mjs` runs as `predev`/`prebuild`, walking `public/assets/` and emitting `public/assets/catalog.json`.
2. `@lib/assets/catalog` lazily fetches the JSON on first access and caches the typed result.
3. `@lib/assets/manager`'s singleton `assetManager` fires `ready()` on first construction; consumers needing strict ordering `await assetManager.ready()`.

## Deployment surfaces

| Surface | What runs | How |
|---------|-----------|-----|
| GitHub Pages | Static SPA (`dist/`) | `.github/workflows/cd.yml` on `push: main` |
| Local preview | Static SPA (`dist/`) | `pnpm preview` |
| PWA install | Same `dist/`, installed to home screen | `public/manifest.webmanifest` + Chrome install prompt / iOS Safari Add-to-Home-Screen |
| Android (Capacitor) | `android/` shell wrapping `dist/` | `.github/workflows/cd-mobile.yml` on `push: main` (debug) or `workflow_dispatch` (signed release) |
| iOS (Capacitor) | `ios/` shell wrapping `dist/` | Manual Mac+Xcode flow → TestFlight |

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for environment specifics.

## Storage + Pyodide cache

Two persistence layers, both per-origin and OPFS-backed.

**Saved games library (`src/storage/`).** Kid-saved projects live in OPFS at `/games/{id}/{project.json, wizard-state.json, game.py, thumbnail.png}` (see `src/storage/opfs-projects.ts`). The dual-backend `src/storage/projects.ts` routes through a cached `shouldUseOpfs()` probe: jsdom and private-mode browsers fall through to the legacy `localStorage["pygame_academy_projects"]` blob. A one-shot `src/storage/opfs-migration.ts` runs at app boot under `navigator.locks.request('opfs-migration-v1')` (cross-tab safe) and copies legacy localStorage rows into OPFS the first time the app sees a browser where OPFS is available. The migration sentinel (`migration-from-localstorage-v1.done`) only seals when zero OPFS write failures occurred — transient I/O failures retry on the next boot.

**Pyodide WASM cache (`public/pyodide-sw.js`).** The vendored Pyodide payload (~12MB: pyodide.asm.wasm + python_stdlib.zip + pyodide.asm.js) is intercepted by a service worker that serves cache hits from OPFS and atomic-writes misses through `<file>.tmp` rename so an interrupted pipe (tab close, network drop) never publishes a half-written file. The worker rejects requests outside an allowlist of `[wasm js mjs json zip data]` extensions and only persists 200 OK responses whose Content-Type matches the expected MIME, defending against CDN misroute and captive-portal HTML poisoning the cache. Version bumps (`PYODIDE_VERSION` in the SW) purge older `pyodide-cache-vN/` directories on activate. Inside the Capacitor WebView (`window.location.protocol === 'capacitor:'`) SW registration is skipped — the WASM is shipped directly in the APK/IPA bundle, so there's nothing to cache.

## Launcher vs export

Two distinct distribution channels for kid-built games:

- **Launcher (`/play/:projectId`).** The app's own first-class run-mode. Reads from OPFS, compiles via the same `compilePythonGame` the export pipeline uses (single source of truth), boots Pyodide, runs the saved `game.py`. No wizard chrome, no editor — just title + canvas + Back/Edit. The kid's library lives entirely in-app.
- **Export (`src/pygame/runtime/exporter.ts`).** One-way send-mode bundle for sharing to Drive / iCloud. Produces a zip with `game.py` + assets + a landing `index.html` that points back at the platform launcher. There is no import-from-zip — re-loading a shared zip into the app would be fragile to schema drift and a real security surface (arbitrary `game.py` execution from an attacker-controlled file). Kids who receive a shared zip read it as source code; if they want to remix, they fork the project in their own copy of the platform.

## See also

- [`pillars/`](pillars/) — per-pillar implementation detail
- [`DESIGN.md`](DESIGN.md) — product vision, voice, UX principles
- [`TESTING.md`](TESTING.md) — test strategy, runners, CI integration
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — environments, secrets, deploy steps
- [`STATE.md`](STATE.md) — what's done, what's next
