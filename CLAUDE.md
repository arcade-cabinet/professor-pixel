<!-- profile: ts-library + python-lib + mobile-android + standard-repo + nas-assets v1 -->
# professor-pixel

Pixel's PyGame Palace — a conversational, mascot-driven React platform that teaches kids Python/Pygame game development through guided wizard flows and a WYSIWYG editor. Pure browser app (Pyodide for Python execution); no server.

## Profiles loaded

@/Users/jbogaty/.claude/profiles/ts-library.md
@/Users/jbogaty/.claude/profiles/python-lib.md
@/Users/jbogaty/.claude/profiles/mobile-android.md
@/Users/jbogaty/.claude/profiles/nas-assets.md
@/Users/jbogaty/.claude/profiles/standard-repo.md

## Repo-specific

- **Dev:** `pnpm dev` (Vite, port 5173). `predev` regenerates the asset catalog.
- **Build:** `pnpm build` (`tsc && vite build`). `prebuild` regenerates the asset catalog.
- **Type check:** `pnpm check` (`tsc --noEmit`).
- **Tests:**
  - `pnpm test:unit` — Vitest unit (jsdom)
  - `pnpm test:integration` — Vitest integration (jsdom, longer timeout)
  - `pnpm test:component` — Vitest component (real Chromium via @vitest/browser)
  - `pnpm test:e2e` — Playwright
  - `npm test` — all Vitest projects
- **Asset catalog:** `pnpm catalog` (writes `public/assets/catalog.json` from `public/assets/`).

## Layout

Capacitor-style flat layout: one `app/`, one `src/`, one `public/` at the repo root. No client/server split, no monorepo.

- `app/` — React TSX (wouter, React Query, shadcn/ui, Tailwind, Monaco)
  - `app/components/{editor,pixel,pygame,wizard,ui}/` — domain-grouped UI
  - `app/pages/` — page-level routes (`_dev/` for dev-only screens)
  - `app/assets/pixel/` — bundled mascot portraits (imported as `@assets/pixel/*`)
- `src/` — non-TSX TypeScript logic, decomposed by domain (no `lib/` junk drawer)
  - `src/{assets,errors,grading,hooks,monitoring,net,python,storage,types,utils,wizard}/`
  - `src/pygame/{components,runtime,templates}/` — pygame simulation/components/templates
  - Every directory exposes a barrel `index.ts`
- `public/` — static assets served as-is. `public/assets/catalog.json` is generated.
- `tests/`
  - `tests/setup/` — global setup (jsdom)
  - `tests/helpers/` — RTL test helpers
  - `tests/unit/`, `tests/integration/`, `tests/component/`, `tests/e2e/`
- `scripts/`
  - `scripts/build-asset-catalog.mjs` — emits `public/assets/catalog.json`
  - `scripts/asset-generator/` — Python source generators + raw source assets (build-side only, never bundled)
- `docs/` — architecture, design, deployment, state, testing.

Aliases: `@/*` → `./app/*` (TSX), `@lib/*` → `./src/*` (TS logic), `@assets/*` → `./app/assets/*` (bundled images).

## Notes

- Origin: Replit (see `@replit/vite-plugin-*` deps). The legacy Express server, drizzle-kit, passport, and the per-folder Selenium suite were removed during R1–R10 in favour of pure browser deployment.
- `pyproject.toml` is for ancillary asset tooling (numpy/pillow) only.
- Pyodide is loaded from CDN at runtime; the global `Window.loadPyodide` ambient lives in `src/types/pyodide.d.ts`.
