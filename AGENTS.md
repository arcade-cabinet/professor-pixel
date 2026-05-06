---
title: AGENTS
updated: 2026-05-04
status: current
domain: technical
---

# AGENTS.md

Operating protocols for human and AI contributors. Tooling-specific entry points (Claude Code, Cursor, Copilot) include this file by reference.

> **Identity & critical rules** live in [`CLAUDE.md`](CLAUDE.md). **Code quality non-negotiables** live in [`STANDARDS.md`](STANDARDS.md). This file is about *how to work*.

## Doctrine

**Docs → Tests → Code.** Document the intended behavior, write the failing test, then implement. If the test reveals the spec is wrong, revise docs first, then test, then code. Never let code drift from spec silently.

**One topic per branch, one commit per concern.** Squash-merge to `main`. Use Conventional Commits (`feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`, `ci`, `build`).

**Stubs / TODOs / `pass` bodies / `it.todo` / `as any` are bugs.** Fix or delete them; never leave "come back later" markers. The same applies to dead code paths and unreachable branches.

**Refactors, not shims.** When a module moves, every caller moves with it in the same commit. No compatibility re-exports.

## Architecture in one paragraph

A React SPA (Vite 5, wouter, shadcn/ui, TanStack Query) — **no backend**. All persistence is browser-side (localStorage / sessionStorage / cookies). Python user code runs in the browser via Pyodide; a custom PyGame simulator intercepts draw calls and renders to a `<canvas>`. The Replit dev plugins (`@replit/vite-plugin-*`) are dev-only ergonomics. Vitest 3 owns unit / integration / component tests (the latter via `@vitest/browser` + Playwright); Playwright owns e2e. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Working areas

Capacitor-style flat layout: one `app/`, one `src/`, one `public/` at the repo root.

| Path | Purpose | Owner concerns |
|------|---------|----------------|
| `app/` | React TSX (`.tsx` only): pages, wizard, editor, mascot, ui primitives | UX, accessibility, perf |
| `src/` | Non-TSX TS logic: assets, errors, grading, hooks, monitoring, net, python, pygame, storage, types, utils, wizard | Decomposition discipline |
| `public/` | Static assets served as-is. `assets/catalog.json` is generated. | Asset provenance, naming |
| `tests/` | `setup/`, `helpers/`, `unit/`, `integration/`, `component/`, `e2e/` | Layer choice, flakiness budget |
| `scripts/` | `build-asset-catalog.mjs` + `asset-generator/` (Python source generators, never bundled) | Build tooling |
| `docs/` | All project documentation | Currency — update with the change |

Aliases: `@/*` → `./app/*`, `@lib/*` → `./src/*`, `@assets/*` → `./app/assets/*`.

## Patterns

**Cross-domain types.** Define types in `src/types/schema.ts` (or the relevant domain folder under `src/`) as Zod schemas — `z.infer<typeof Schema>` is the canonical type. No untyped data crossing module boundaries; validate at every external seam (network JSON, localStorage, postMessage). See [`docs/pillars/03-lesson-engine.md`](docs/pillars/03-lesson-engine.md).

**State.** Server state goes through TanStack Query — no manual fetch in components. Local UI state stays in React. Don't introduce Redux/MobX/Zustand without a written reason and a migration plan.

**Forms.** `react-hook-form` + Zod resolver. Errors render inline; no `alert()`s.

**Styling.** Tailwind utilities for layout and spacing; shadcn/ui components for interactive primitives; CSS variables for theme tokens. No inline `style={}` except for dynamic numeric values.

**Routing.** `wouter` only. Don't add another router.

**Python execution.** All user-authored Python runs through Pyodide. There is no server, so it physically cannot run anywhere else — but never `eval` it on the host either. The PyGame simulator is the seam between user code and the canvas.

**Testing seams.** Every interactive element gets a `data-testid` of the form `{action}-{target}` (e.g. `button-select-jump`, `input-jump-force`). Dynamic elements use `{type}-{description}-{id}`. E2E tests rely on these — don't remove them.

## Workflow

1. **Pick the smallest meaningful change.** A single concern. If it grows, split it.
2. **Update docs first** if the change alters behavior, contracts, or UX.
3. **Write or update the failing test.** Vitest for logic, Playwright for user-visible behavior. Don't claim something works without a passing test that would have failed before.
4. **Implement.** Keep the diff focused. No drive-by refactors.
5. **Verify locally** before pushing — `pnpm check`, the relevant test suite, and a manual sanity pass for UI changes.
6. **Commit with intent.** Conventional Commits. Body explains *why*, not *what* (the diff shows what).
7. **Open a PR**, link any related issue, fill the checklist, wait for CI.

## Verification before claiming completion

- `pnpm check` exits 0
- The test suite covering the change passes
- For UI changes, you actually loaded the page in a browser and exercised the path
- No new Biome complaints (`pnpm lint`)
- No new `console.error` / `console.warn` in the dev console for the affected route

If you can't verify a UI change in a browser, say so explicitly in the PR. Don't claim a green CI is the same as "this works."

## Destructive operations — ask first

The following require explicit human approval each time, even for AI agents operating with broad autonomy:

- `git push --force` (use `--force-with-lease` instead, and only on your own feature branch)
- `git reset --hard` against anything that's been pushed
- Dropping or recreating database tables (`drizzle-kit push` against a non-dev DB)
- Removing files that aren't tracked by git (they may be a teammate's WIP)
- Modifying CI/CD secrets or workflows that touch production

## Tooling

| Tool | Purpose |
|------|---------|
| `pnpm` | package manager (lockfile is `pnpm-lock.yaml`) |
| `tsx` | TypeScript execution for the dev server |
| `vite` | client build + dev server (mounted as Express middleware in dev) |
| `esbuild` | bundles the Express server for production |
| `vitest` | unit + integration tests |
| `playwright` | e2e tests (canonical) |
| `biome` | lint + format (replaces ESLint + Prettier as of M1.5) |
| `drizzle-kit` | schema migrations |
| `release-please` | release notes + version bumps from Conventional Commits |

## When in doubt

1. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for cross-pillar contracts, then the relevant pillar in [`docs/pillars/`](docs/pillars/) — frontend, runtime, lesson engine, grading, design system, storage, deploy.
2. Read [`docs/DESIGN.md`](docs/DESIGN.md) for product vision and Pixel's voice.
3. Check [`docs/STATE.md`](docs/STATE.md) for active work.
4. Search the codebase — there's likely an existing pattern.
5. Open a draft PR and ask. Cheaper than guessing.
