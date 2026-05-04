<!-- profile: ts-library + python-lib + mobile-android + standard-repo + nas-assets v1 -->
# professor-pixel

Pixel's PyGame Palace — a conversational, mascot-driven React+Express platform that teaches kids Python/Pygame game development through guided wizard flows and a WYSIWYG editor.

## Profiles loaded

@/Users/jbogaty/.claude/profiles/ts-library.md
@/Users/jbogaty/.claude/profiles/python-lib.md
@/Users/jbogaty/.claude/profiles/mobile-android.md
@/Users/jbogaty/.claude/profiles/nas-assets.md
@/Users/jbogaty/.claude/profiles/standard-repo.md

## Repo-specific

- **Run:** `npm run dev` (tsx server/index.ts, NODE_ENV=development)
- **Test:** `npm test` via vitest configs (`vitest.config.ts`, `vitest.backend.config.ts`); E2E via `./run-playwright-tests.sh` or `playwright test`
- **Type check:** `npm run check` (tsc)
- **Build:** `npm run build` (vite build + esbuild server bundle)
- **Start (prod):** `npm start` (node dist/index.js)
- **DB:** `npm run db:push` (drizzle-kit)

## Layout

- `client/` — React SPA (wouter, React Query, shadcn/ui, Tailwind, Monaco editor)
- `server/` — Express API (TypeScript via tsx, passport-local sessions)
- `shared/` — types/schemas shared between client + server
- `apps/mobile/` — mobile companion app
- `packages/` — internal packages
- `assets/` — game-template assets used by the wizard
- `tests/` — vitest + playwright + selenium suites
- `coverage-backend/` — backend coverage output

## Notes

- Origin: Replit (see `.replit` and the `@replit/vite-plugin-*` deps). Watch for Replit-specific assumptions when running locally; the legacy `replit.md` overview was migrated into `docs/ARCHITECTURE.md` and `docs/DESIGN.md`.
- Three test runners coexist: vitest (unit), playwright (e2e), selenium (legacy/cross-browser). Prefer vitest+playwright for new work.
- `pyproject.toml` is for ancillary asset tooling (numpy/pillow), not the main project.
