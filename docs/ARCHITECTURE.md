---
title: Architecture
updated: 2026-05-04
status: current
domain: technical
---

# Architecture

> Authoritative reference for how Pixel's PyGame Palace is structured. When this doc and code disagree, the code wins **and this doc gets fixed in the same PR**.

## One-paragraph summary

A React 18 + TypeScript single-page app served by a small Express + TypeScript API. The client speaks REST/JSON to the server through TanStack Query; both sides share types and Zod schemas from `shared/`. **All Python user code runs in the browser** via Pyodide; a custom PyGame simulator intercepts draw/event calls and renders them onto an HTML5 canvas. The current data layer is an **in-memory** `MemStorage` behind an `IStorage` interface — no database is wired up despite the `db:push` script that's left over from earlier scaffolding. The app is deployed as a **static SPA to GitHub Pages**; in dev the Express server hosts Vite middleware, and in prod the Express bundle is unused on Pages and present only for self-hosting / Replit.

## High-level diagram

```
┌─────────────────────────────────────── Browser ─────────────────────────────────────────┐
│                                                                                          │
│   React SPA (Vite build)                                                                 │
│   ├─ wouter            ── client routing                                                 │
│   ├─ TanStack Query    ── server state, caching                                          │
│   ├─ shadcn/ui + Radix ── interactive primitives                                         │
│   ├─ Tailwind CSS      ── theme via CSS vars                                             │
│   ├─ Monaco Editor     ── Python authoring                                               │
│   ├─ Pixel             ── mascot, conversational UI                                      │
│   ├─ Universal Wizard  ── guided component-based game build                              │
│   └─ Pyodide + PyGame Simulator ── runs user Python on a <canvas>                        │
│                                                                                          │
│                  │                                                                       │
│                  │ fetch /api/* (JSON)                                                   │
│                  ▼                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                   │
┌─────────────────────────────────────── Express server ──────────────────────────────────┐
│   server/index.ts        ── app factory, request logger, error handler                  │
│   server/routes.ts       ── REST routes for lessons, progress, projects, gallery        │
│   server/storage.ts      ── IStorage interface + MemStorage (in-memory) impl            │
│   server/vite.ts         ── dev: mounts Vite middleware; prod: serves built SPA         │
│                                                                                          │
│   No database layer is wired up today. The IStorage seam is ready for one.              │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Modules

### Client — `client/src/`

| Path | Role |
|------|------|
| `main.tsx`, `App.tsx` | React entry; wires the QueryClient, Toaster, error boundaries, and `wouter` Switch routes |
| `pages/` | `home`, `lesson`, `not-found`, plus dev/test pages (`AssetLibraryTest`, `PygamePreviewTest`, `PersistenceTest`) |
| `components/` | Feature components (universal wizard, Pixel presence, code editor, asset browser, error boundary, …) |
| `components/ui/` | shadcn/ui primitives (button, dialog, popover, …) — generated, hand-extended sparingly |
| `hooks/` | Reusable React hooks |
| `lib/` | Pure logic: PyGame simulator, code grading, asset library, persistence, error tracking, analytics |
| `lib/python/` | Pyodide bootstrap and Python-side helpers |
| `lib/pygame-components/` | Component definitions used by the wizard (paddle, sprite, platform, …) |
| `lib/grading/` | Rule-based grader (output-mode + AST-rules mode) |
| `lib/asset-library/` | Asset browsing and binding |
| `types/` | Client-only TS types |
| `index.css` | Theme tokens (`--background`, `--foreground`, …) |

### Server — `server/`

| File | Role |
|------|------|
| `index.ts` | Express app factory; JSON + urlencoded middleware; per-request `/api/*` logger; centralised error handler |
| `routes.ts` | REST: `GET /api/lessons`, `GET /api/lessons/:id`, `GET/PATCH /api/progress`, project CRUD, gallery publish/unpublish |
| `storage.ts` | `IStorage` interface + `MemStorage` Map-backed implementation (users, lessons, progress, projects) |
| `vite.ts` | Dev: spins up Vite in middleware mode bound to the same HTTP server; prod: `serveStatic` from `dist/public` |

### Shared — `shared/`

| File | Role |
|------|------|
| `schema.ts` | TypeScript interfaces (`User`, `Lesson`, `UserProgress`, `Project`, `InsertProject`, …) — **plain TS today, no Zod schemas yet** |
| `storage-client.ts` | Client-side helpers that wrap fetch calls against the API |

> **Migration note.** `STANDARDS.md` requires Zod-first cross-boundary types. `shared/schema.ts` predates that rule — converting it to Zod schemas (with `z.infer` re-exports) is tracked in [`STATE.md`](STATE.md).

### Workspace packages — `packages/`

| Package | Purpose |
|---------|---------|
| `code-sandbox` | Reusable Python-in-browser execution helpers |
| `shared-types` | TS types shared with future workspaces (kept minimal) |
| `tutor-core` | Tutor/grader logic intended for reuse by other apps |

These packages are **internal** — not published. They compile alongside the main app and exist to keep concern boundaries crisp.

### `apps/mobile/`

Reserved directory for a future mobile companion. **Currently empty**; ignore until populated.

### `assets/` and `client/public/assets/`

| Path | Used for |
|------|---------|
| `assets/` (root) | Source-of-truth game-template artwork, fonts, sounds. Pixel mascot art lives here. Includes `generate_assets.py` and `generate_sounds.py`. |
| `client/public/assets/` | Subset served to the browser at runtime, organised by category (`backgrounds`, `characters`, `enemies`, `items`, `tiles`, `vehicles`, `effects`, `audio`, `misc`). |

## Data flow

### Lesson view

1. User visits `/lesson/:lessonId`.
2. `LessonPage` issues `GET /api/lessons/:id` via TanStack Query.
3. `MemStorage` returns the lesson.
4. The Monaco editor renders `initialCode`; the PyGame simulator stands by.
5. On **Run**, Python is sent to Pyodide (in-browser); PyGame draw calls are intercepted and painted on the canvas.
6. On **Check**, the rule-based grader evaluates output and/or AST rules, returning structured feedback.

### Wizard flow

1. User starts at `/wizard` (or `/game-wizard` with `flowType="game-dev"`).
2. The Universal Wizard loads a JSON-driven flow keyed by game type (platformer, RPG, dungeon, …).
3. Pixel walks the user through A/B choices; the wizard composes pre-built components (Title Screen → Gameplay → End Credits).
4. Persistence (`localStorage` + project store) tracks step, choices, and assembled scenes.
5. Live preview compiles the assembly and runs it in the same Pyodide+canvas seam used by lessons.
6. On export, the project is zipped (README + runnable PyGame source) and downloaded.

### Auth

A `mock-user-id` is currently stamped into progress writes (`server/routes.ts`). Real `passport-local` sessions are scaffolded in `package.json` deps but not wired into the route layer yet.

## Build pipeline

```
src ── tsc (npm run check) ── type errors gate everything else
   ├─ client (Vite) ───────────────► dist/public/        (static SPA)
   └─ server (esbuild bundle) ─────► dist/index.js       (Node ESM, externals preserved)
```

- **Dev:** `npm run dev` → `tsx server/index.ts` → Express mounts Vite middleware on the same port. HMR works through the same HTTP server.
- **Prod:** `npm run build` → Vite builds the SPA, esbuild bundles the Express server. `npm start` runs the bundled server, which serves the static SPA from `dist/public/`.
- **GitHub Pages deploy:** the Pages workflow builds `vite` only with a computed `--base="$BASE"`, copies `index.html` to `404.html` for SPA routing, and uploads `dist/public/`. **The Express server is not deployed to Pages.**

## Deployment surfaces

| Surface | What runs | How |
|---------|-----------|-----|
| GitHub Pages | Static SPA (`dist/public/`) | `.github/workflows/deploy.yml` on `push: main` |
| Replit / self-host | Full stack (Express + SPA) | `npm run build && npm start` |

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for environment specifics.

## Boundaries and rules of thumb

- **`client/` never imports from `server/`** and vice versa. Cross-cutting types live in `shared/`. The `@/`, `@shared/`, and `@assets/` aliases enforce this in IDE and at build time.
- **Python never runs on the server.** Pyodide is the seam. The PyGame simulator is the only code that knows about both Python output and the canvas.
- **Server state is owned by TanStack Query.** Components don't `fetch` directly. Mutations invalidate the relevant query keys.
- **Storage is behind `IStorage`.** When a real DB is introduced, only `server/storage.ts` should change; routes shouldn't notice.
- **Replit dev plugins are dev-only.** They're guarded by `process.env.NODE_ENV !== 'production'` checks and `REPL_ID` presence.

## Known debt (snapshot)

- `shared/schema.ts` is plain TS — no Zod yet (target state per `STANDARDS.md`).
- `MemStorage` resets on every server restart; persistence is browser-side only via `localStorage` and the export flow.
- Auth uses a `mock-user-id`; passport setup is dependency-only.
- Three test runners coexist (Vitest + Playwright + Selenium); Selenium is frozen and should be retired once Playwright coverage is equivalent. See [`TESTING.md`](TESTING.md).
- `db:push` script and `connect-pg-simple` dep are leftovers from a database direction that wasn't taken; either wire it up or remove. Tracked in [`STATE.md`](STATE.md).

## See also

- [`DESIGN.md`](DESIGN.md) — product vision, voice, UX principles
- [`TESTING.md`](TESTING.md) — test strategy, test ID conventions, runners
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — environments, secrets, deploy steps
- [`STATE.md`](STATE.md) — what's done, what's next
- [`../STANDARDS.md`](../STANDARDS.md) — code, design, a11y non-negotiables
