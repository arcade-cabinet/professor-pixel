---
title: Architecture
updated: 2026-05-04
status: current
domain: technical
---

# Architecture

> Authoritative reference for how Pixel's PyGame Palace is structured. When this doc and code disagree, the code wins **and this doc gets fixed in the same PR**.

## One-paragraph summary

A React 18 + TypeScript single-page app, built with Vite. **No backend.** All persistence is browser-side (localStorage / sessionStorage / cookies); all Python user code runs in the browser via Pyodide; a custom PyGame simulator intercepts draw/event calls and renders them onto an HTML5 canvas. The app deploys as a **static SPA to GitHub Pages**. Lesson and asset content is shipped as static JSON / generated catalog files in `public/`.

## High-level diagram

```text
┌─────────────────────────────────── Browser (only runtime) ───────────────────────────────┐
│                                                                                          │
│   React SPA (Vite build)                                                                 │
│   ├─ wouter            ── client routing                                                 │
│   ├─ TanStack Query    ── async/cache layer over local storage + static JSON             │
│   ├─ shadcn/ui + Radix ── interactive primitives                                         │
│   ├─ Tailwind CSS      ── theme via CSS vars                                             │
│   ├─ Monaco Editor     ── Python authoring                                               │
│   ├─ Pixel mascot      ── conversational UI                                              │
│   ├─ Universal Wizard  ── guided component-based game build                              │
│   └─ Pyodide + PyGame Simulator ── runs user Python on a <canvas>                        │
│                                                                                          │
│   Persistence: localStorage / sessionStorage / cookies                                   │
│   Static content: GET /assets/catalog.json, /api/static/lessons.json (served from public)│
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

## Repository layout

Capacitor-style flat layout: one `app/`, one `src/`, one `public/` at the repo root. No client/server split, no monorepo.

### `app/` — React TSX

`.tsx` files only. Aliased as `@/*`.

| Path | Role |
|------|------|
| `main.tsx`, `App.tsx` | React entry; QueryClient, Toaster, error boundaries, `wouter` routes. |
| `pages/` | Top-level routes (`home`, `lesson`, `not-found`) plus `_dev/` (asset-library, persistence, pygame-preview). |
| `components/editor/` | WYSIWYG game editor — canvas, palette, code panel, properties. |
| `components/pixel/` | Pixel mascot — presence, menu, minimized state, minimize animation. |
| `components/pygame/` | Pygame runtime UI — runner, live preview, interactive canvas, component selector. |
| `components/wizard/` | Universal Wizard — universal, dialogue-engine, layout-manager, code-runner, asset-browser, with-preview. |
| `components/ui/` | shadcn/ui primitives. |
| `assets/pixel/` | Bundled mascot portraits — imported as `@assets/pixel/*.png`. |

### `src/` — TypeScript logic

`.ts` files only. Aliased as `@lib/*`. Decomposed by domain — no `lib/` junk drawer.

| Path | Role |
|------|------|
| `assets/` | Asset registry. `catalog.ts` lazily fetches `/assets/catalog.json`; `manager.ts` indexes; `downloader.ts` fetches Pyodide-side assets; `curated-themes.ts` for theme bundles. |
| `errors/` | `educational.ts` (Python-error → friendly explanation), `tracker.ts` (analytics), `global-handler.ts` (window error/unhandledrejection). |
| `grading/` | Rule-based grader (output mode + AST-rules mode). |
| `hooks/` | Reusable React hooks (debug, device-type, edge-swipe, editor-history, health-monitor, input-bridge, media-query, orientation, retry-query, toast). |
| `monitoring/` | Console logger, health monitor, performance monitor. |
| `net/` | TanStack Query client (`query-client.ts`), `data.ts`, `retry.ts`, `update-bridge.ts`. |
| `python/` | Pyodide bootstrap (`runner.ts`) + Python error handler. |
| `pygame/components/` | PyGame component library. Two parallel layers: canvas-rendering primitives (`types.ts` + ball/paddle/sprite/etc.) and gameplay systems (`system-types.ts` + combat/movement/world/ui-systems/). |
| `pygame/runtime/` | Simulator, compiler, 3D support, test components. |
| `pygame/templates/` | Game-type templates (platformer, pong, shooter, breakout, collecting). |
| `storage/` | `local.ts`, `mode.ts`, `persistence.ts` (versioned wizard/session state with debounce + migration), `session-history.ts`, `client.ts` (the unified `ClientStorage`). |
| `types/` | Cross-domain types — `schema.ts` (User/Lesson/Project/UserProgress) and `pyodide.d.ts` (ambient Pyodide globals). |
| `utils/` | `cn.ts` (Tailwind merge). |
| `wizard/` | Wizard types, building blocks, code generator, dialog, game templates, scene generator, constants. |

Every directory exposes a barrel `index.ts`.

### `public/` — Static assets

Served as-is by Vite. `assets/catalog.json` is generated.

### `tests/`

| Path | Runtime |
|------|---------|
| `setup/common.ts` | Global setup (jsdom, jest-dom matchers). |
| `helpers/test-utils.ts` | RTL helpers and storage mocks. |
| `unit/` | Pure-logic tests (Vitest, jsdom). |
| `integration/` | Multi-module tests (Vitest, jsdom, longer timeout). |
| `component/` | React component tests in real Chromium (Vitest browser via @vitest/browser + Playwright). |
| `e2e/` | Playwright. |

### `scripts/`

| Path | Role |
|------|------|
| `build-asset-catalog.mjs` | Walks `public/assets/` and writes `public/assets/catalog.json`. Wired into `predev` and `prebuild`. |
| `asset-generator/` | Build-side Python generators + raw PNG/sound source + theme catalogs. **Never bundled.** Source for the assets that get refined into `public/assets/`. |

### Aliases

- `@/*` → `./app/*` (TSX)
- `@lib/*` → `./src/*` (TS logic)
- `@assets/*` → `./app/assets/*` (bundled images imported into the bundle)

## Data flow

### Lesson view

1. User visits `/lesson/:lessonId`.
2. `LessonPage` issues a query that resolves through `ClientStorage` (lessons are loaded from `/api/static/lessons.json` — a static file in `public/`).
3. The Monaco editor renders `initialCode`; the PyGame simulator stands by.
4. On **Run**, Python is sent to Pyodide; PyGame draw calls are intercepted and painted on the canvas.
5. On **Check**, the rule-based grader evaluates output and/or AST rules and returns structured feedback.

### Wizard flow

1. User starts at `/wizard`.
2. The Universal Wizard loads a JSON-driven flow keyed by game type (platformer, RPG, dungeon, …).
3. Pixel walks the user through A/B choices; the wizard composes pre-built components (Title Screen → Gameplay → End Credits).
4. Persistence (`@lib/storage/persistence`) tracks active flow path, current node, session actions, and selected components in localStorage with versioned migration and debounced writes; session UI state lives in sessionStorage.
5. Live preview compiles the assembly and runs it in the same Pyodide+canvas seam used by lessons.
6. On export, the project is zipped (README + runnable PyGame source) and downloaded.

### Asset catalog

1. `scripts/build-asset-catalog.mjs` runs as `predev`/`prebuild`, walking `public/assets/` and emitting `public/assets/catalog.json` (sprites + sounds + backgrounds, with category and tag inference from file paths and names).
2. `@lib/assets/catalog` lazily fetches the JSON on first access and caches the typed result.
3. `@lib/assets/manager`'s singleton `assetManager` fires `ready()` on first construction; consumers needing strict ordering `await assetManager.ready()`.

## Build pipeline

```text
src + app + public ── tsc (npm run check) ── type errors gate everything else
                   └─ vite build ─────────► dist/   (static SPA + bundled assets)
```

- **Dev:** `npm run dev` → `predev` regenerates the catalog → Vite dev server on **port 5173**, HMR.
- **Prod:** `npm run build` → `prebuild` regenerates the catalog → tsc → `vite build` → `dist/`.
- **GitHub Pages:** the Pages workflow runs `vite build` with a computed `--base="$BASE"`, copies `index.html` to `404.html` for SPA routing, and uploads `dist/`.

## Deployment surfaces

| Surface | What runs | How |
|---------|-----------|-----|
| GitHub Pages | Static SPA (`dist/`) | `.github/workflows/cd.yml` on `push: main` |
| Local preview | Static SPA (`dist/`) | `npm run preview` |

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for environment specifics.

## Boundaries and rules of thumb

- **`app/` holds TSX; `src/` holds TS.** No mixing. `app/` may import from `src/` (via `@lib/*`) but `src/` never imports from `app/`.
- **Python never runs outside Pyodide.** The PyGame simulator is the only code that knows about both Python output and the canvas.
- **Async UI state goes through TanStack Query.** Components don't `fetch` directly.
- **Storage is behind `@lib/storage/persistence`.** Versioned, migrated, debounced. Components call `saveWizardState` / `loadWizardState` / `saveSessionState`.
- **Replit dev plugins are dev-only.** Guarded by `NODE_ENV !== 'production'` and `REPL_ID` presence in `vite.config.ts`.

## Known debt (snapshot)

- `src/types/schema.ts` is plain TS — no Zod yet. Migration tracked in [`STATE.md`](STATE.md).
- The two parallel pygame-component layers (`types.ts` canvas primitives vs. `system-types.ts` gameplay systems) need to be unified or have their split documented in `STATE.md`.
- React 18 + Vite 5 will be bumped to React 19 + Vite 8 + Vitest 4 in a follow-up PR.

## See also

- [`DESIGN.md`](DESIGN.md) — product vision, voice, UX principles
- [`TESTING.md`](TESTING.md) — test strategy, test ID conventions, runners
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — environments, secrets, deploy steps
- [`STATE.md`](STATE.md) — what's done, what's next
