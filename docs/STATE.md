---
title: State
updated: 2026-05-04
status: current
domain: context
---

# State

> What's done, what's actively in flight, what's queued. Updated whenever a meaningful slice ships or the next-up changes. If this doc and `git log` disagree, fix this doc.

## Active

### Documentation overhaul (this branch: `docs/standards-overhaul`)

Bringing the repo up to the standard-repo profile. In progress on the open PR.

- [x] `CLAUDE.md` — profile-driven (ts-library + python-lib + mobile-android + nas-assets + standard-repo)
- [x] `README.md` — quick start, stack, doc index
- [x] `AGENTS.md` — operating protocols, workflow
- [x] `STANDARDS.md` — TS/lint/a11y/security non-negotiables
- [x] `CHANGELOG.md` — Keep a Changelog format, themed v0.1.0 history
- [x] `docs/ARCHITECTURE.md`
- [x] `docs/DESIGN.md`
- [x] `docs/TESTING.md` (supersedes `TESTING_GUIDE.md`)
- [x] `docs/DEPLOYMENT.md`
- [x] `docs/STATE.md` (this file)
- [x] `docs/playtests/` — `playtest-*.md` moved, frontmatter added, index README written
- [x] `.github/dependabot.yml` — npm + actions, weekly, minor/patch grouped
- [x] `release-please-config.json` + manifest
- [x] `.github/workflows/release.yml` — release-please + signed build artefact
- [x] Audit `ci.yml` / rename `deploy.yml` → `cd.yml`, bump `actions/checkout@v6`, add concurrency
- [ ] Remove `replit.md`, `TESTING_GUIDE.md`

## Done (recent milestones)

| Milestone | When | Notes |
|-----------|------|-------|
| Initial development complete (v1.0.0 baseline) | 2025-09 | See [`CHANGELOG.md`](../CHANGELOG.md) for the themed summary |
| Multi-resolution Playwright suite | 2025-09 | 7 viewports, runtime-error detection wired in |
| Universal wizard with JSON-driven flows | 2025-09 | Replaced Yarn dialogue files; supports 7 game types |
| WYSIWYG editor with drag-and-drop | 2025-09 | Component property inspector, code view, live preview |
| Project export (zip + README) | 2025-09 | Runnable PyGame source on disk |
| GitHub Pages deploy workflow | 2025-09 | Static SPA deploys on `push: main` |

## Next (queued, no commitment yet)

Sized roughly so any one item is a single PR.

### Standards alignment (follow-on from this PR)

- **Add `npm test`/`test:e2e`/`test:backend` scripts.** Today everything goes through `npx`.
- **Wire Vitest + Playwright into `ci.yml`.** The build step already runs; tests don't.
- **Bump `actions/checkout@v4` → `@v6`** across workflows once release.yml lands.
- **Convert `shared/schema.ts` to Zod.** TypeScript interfaces today; the standard is Zod-first with `z.infer` re-exports.
- **Treat `@typescript-eslint/no-explicit-any` as `error`** (currently `warn`). Fix existing `any`s in the same PR.

### Backend

- **Decide the database story.** `db:push` script + `connect-pg-simple` dep are leftovers without a chosen DB. Either wire Drizzle + Neon (and document migrations) or remove the script and dep.
- **Wire real auth.** `passport-local` and `express-session` are in deps; the route layer still stamps a `mock-user-id`. Connect them and remove the mock.
- **Health endpoint.** `/healthz` returning 200 + version. Used by future CD checks and uptime monitors.

### Frontend / UX

- **Retire the Selenium suite** once Playwright covers all its remaining cases.
- **Visual regression baseline** (Playwright screenshots, per-project).
- **`@axe-playwright` accessibility checks** in the e2e suite.
- **Mobile companion app** under `apps/mobile/`. Empty today; deferred until web platform stabilises.

### Pyodide / PyGame

- **Cold-start budget.** First-load Pyodide is the biggest perf cost; track + budget it.
- **Frame-rate test** for the simulator under realistic component counts.

### Content

- **Per-game-type playtest follow-ups.** Each `docs/playtests/` file lists open tuning items; convert the most-blocking into wizard PRs.

## Blocked / waiting

_None right now._

## Conventions for this file

- **Active** is the work in flight on the current branch (or branches you intend to merge soon). Move items out as they ship.
- **Done** keeps recent milestones for context — prune anything older than the last release line in `CHANGELOG.md`.
- **Next** is intentionally short and unowned; this is a queue, not a roadmap.
- Each line should fit in one breath. Detail goes in the linked PR or doc.
- Update `updated:` in the frontmatter on every edit.
