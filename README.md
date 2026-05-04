---
title: README
updated: 2026-05-04
status: current
domain: product
---

# Pixel's PyGame Palace

A conversational, mascot-driven web platform that teaches kids Python game development. **Pixel**, a cyberpunk mascot, guides users through guided wizard flows and a WYSIWYG editor to assemble pre-built game components — Title Screen → Gameplay → End Credits — adapting to the chosen game type (platformer, RPG, dungeon, racing, puzzle, adventure, space).

Python runs in the browser via **Pyodide**; PyGame draw calls are intercepted by a custom simulator that renders to HTML5 canvas. No server-side code execution.

## Quick start

```bash
npm install            # install dependencies
npm run dev            # start dev server (Express + Vite, NODE_ENV=development)
npm run check          # type-check (tsc, no emit)
npm run build          # production build (vite + esbuild server bundle)
npm start              # run production build
npm run db:push        # apply Drizzle schema to the database
```

Default dev server port: **5000**. The Express server serves the Vite dev middleware in development and the built SPA in production.

## Testing

```bash
npx vitest run                       # unit tests
npx playwright test                  # end-to-end tests
npx tsx tests/e2e/run-comprehensive-tests.ts --critical   # smoke + critical e2e (~5 min)
./run-playwright-tests.sh            # full multi-resolution e2e
```

See [`docs/TESTING.md`](docs/TESTING.md) for the full testing strategy.

## Stack

| Layer | Tech |
|------|------|
| Frontend | React 18, TypeScript, Vite, wouter (router), TanStack Query, shadcn/ui + Radix, Tailwind CSS, Monaco Editor, Framer Motion |
| Backend | Express 4, TypeScript (tsx in dev, esbuild in prod), passport-local, express-session |
| Code execution | Pyodide (Python in browser) + custom PyGame simulator on `<canvas>` |
| Data | Drizzle ORM, Neon Postgres (serverless), `connect-pg-simple` (sessions) |
| Validation | Zod, react-hook-form |
| Testing | Vitest, Playwright, Selenium (legacy), MSW, Testing Library |

## Repository layout

```
client/        React SPA
server/        Express API + Vite dev middleware
shared/        Types and Zod schemas shared between client + server
apps/mobile/   Mobile companion app
packages/      Internal workspace packages
assets/        Game-template assets used by the wizard
public/        Static assets served by Vite
scripts/       Tooling scripts
tests/         vitest + playwright + selenium suites
docs/          Project documentation (architecture, design, testing, etc.)
```

## Documentation

| Document | What's in it |
|----------|--------------|
| [`CLAUDE.md`](CLAUDE.md) | Per-repo entry point for Claude Code |
| [`AGENTS.md`](AGENTS.md) | Operating protocols, conventions, and patterns for human + AI contributors |
| [`STANDARDS.md`](STANDARDS.md) | Code quality, design, and accessibility non-negotiables |
| [`CHANGELOG.md`](CHANGELOG.md) | Notable changes per release |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, boundaries, data flow |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Product vision, Pixel's voice, UX principles |
| [`docs/TESTING.md`](docs/TESTING.md) | Test strategy, coverage, how to run |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Environments, secrets, deploy procedures |
| [`docs/STATE.md`](docs/STATE.md) | Current state — done, next, active plans |
| [`docs/playtests/`](docs/playtests/) | Per-game-type playtest notes |

## Contributing

1. Read [`STANDARDS.md`](STANDARDS.md) and [`AGENTS.md`](AGENTS.md) before opening a PR.
2. Branch from `main`, use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, …).
3. Write or update tests alongside behavior changes — `Docs → Tests → Code`.
4. Run `npm run check` and the relevant test suites locally before pushing.
5. PRs are squash-merged; release notes are generated automatically by release-please.

## License

See [`LICENSE`](LICENSE) (or open an issue if missing).
