---
title: Deployment
updated: 2026-05-04
status: current
domain: ops
---

# Deployment

> Where the app runs, how it gets there, and what to check when it doesn't.

## Targets

| Target | What runs | Trigger | Defined in |
|--------|-----------|---------|------------|
| **GitHub Pages** | Static SPA (`dist/public/`) | `push: main` or manual dispatch | `.github/workflows/cd.yml` |
| **Replit** | Full stack (Express + SPA) | Push to the Replit-linked branch | Replit project settings + `.replit` |
| **Self-hosted Node** | Full stack | Manual `npm run build && npm start` | This doc |

The Express server (`server/index.ts` → `dist/index.js`) is **not** deployed to GitHub Pages — only the static SPA bundle is. Anything that needs the API needs a Replit or self-hosted target.

## GitHub Pages

The canonical public deploy. The workflow:

1. Checks out `main`.
2. Sets up Node (`lts/*`) and runs `npm ci`.
3. Computes the Pages base path from the repo name (`/$REPO/` or `/` for `*.github.io` repos).
4. Runs `npx vite build --base="$BASE"` (server build is **not** invoked).
5. Copies `dist/public/index.html` → `dist/public/404.html` so client-side routing survives Pages' 404 fallback.
6. Uploads `dist/public/` and deploys via `actions/deploy-pages@v4`.

### Pages-specific notes

- The site is fully static after build — Pyodide is loaded at runtime, the PyGame simulator runs in the browser, and persistence is `localStorage`-only on this target.
- API calls (`/api/*`) **fail on Pages** because there's no Express layer. The product currently mocks user IDs and runs without the API for anonymous flows; any feature relying on a real `/api/*` endpoint is a Replit-only or self-host feature today.
- SPA routes work because of the `index.html` → `404.html` fallback. Don't remove that step.

### Concurrency

The workflow uses a `pages` concurrency group with `cancel-in-progress: true`. Pushing twice in a minute will cancel the first build — fine, the second is the source of truth.

## Replit

Replit was the original development surface; the project still ships with `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-runtime-error-modal`, and `@replit/vite-plugin-dev-banner`. These activate only when `process.env.NODE_ENV !== 'production' && process.env.REPL_ID` is set — production builds and non-Replit environments are unaffected.

To run on Replit:

```bash
npm install
npm run dev      # development with HMR + Replit overlays
# or
npm run build && npm start   # production-style on Replit's Node runtime
```

`.replit` is the Replit run/config descriptor. The legacy `replit.md` "AI overview" has been removed; its content lives in [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`DESIGN.md`](DESIGN.md).

## Self-host

Any Node 20+ runtime can serve the full stack:

```bash
npm ci
npm run check              # type-check
npm run build              # SPA + server bundle
NODE_ENV=production node dist/index.js
```

Express listens on the port chosen by `server/index.ts`. The default in dev is **5000**; production reads `PORT` from the environment if set.

## Environments and secrets

The current build has **no required secrets** for the Pages target — it's a static bundle. For the Express target:

| Variable | Purpose | Required by |
|----------|---------|-------------|
| `NODE_ENV` | `development` enables Vite middleware + Replit dev plugins | `server/index.ts`, `vite.config.ts` |
| `PORT` | Override the Express listen port | `server/index.ts` |
| `REPL_ID` | Activates Replit dev plugins (set automatically by Replit) | `vite.config.ts` |
| `SESSION_SECRET` | Required when `passport` / `express-session` are wired up to a real auth flow (not currently active) | `server/index.ts` (future) |

`.env` is gitignored. Production secrets come from the deployment platform's secret store (GitHub Actions secrets for Pages workflows that need them in future, Replit Secrets for Replit, the host's env mechanism for self-host).

## CI/CD pipeline

The standard-repo doctrine is **ci → release → cd**:

| Stage | Workflow | Status |
|-------|----------|--------|
| **CI** (lint, type-check, test, build) | `.github/workflows/ci.yml` | Active — runs `npm run check` and `npm run build`. Tests not yet wired in (tracked in [`STATE.md`](STATE.md)). |
| **Release** (tag, build versioned artefact, generate notes) | `.github/workflows/release.yml` | Active — release-please raises the release PR; merging it cuts a tag and uploads a versioned artefact with a build-provenance attestation. |
| **CD** (deploy on `push: main`) | `.github/workflows/cd.yml` | Active for GitHub Pages. |

## Rolling back

### GitHub Pages

The workflow uploads a single Pages artefact per run. To roll back:

1. Identify the last good commit on `main`.
2. `gh workflow run "Deploy to GitHub Pages" --ref <commit-sha>` (or revert + push).
3. Watch the run; the new deploy replaces the previous Pages artefact within a couple minutes.

There's no "promote a previous artefact" path on GitHub Pages — re-build from the good commit.

### Replit / self-host

`git checkout <good-sha>` and re-run the build/start sequence. There's no built-in blue/green; treat any rollback as a redeploy.

## Health checks

There's no dedicated health endpoint today. The Express request logger emits a line per `/api/*` call (`server/index.ts`), and the centralised error handler returns JSON `{ message }` for any caught error. Adding `/healthz` is tracked in [`STATE.md`](STATE.md).

For the Pages target, the indicator that "deploy worked" is the workflow's final `actions/deploy-pages@v4` step success — `https://<owner>.github.io/<repo>/` should serve the new SPA within a minute of that step completing.

## Common failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Pages site shows old content after deploy | Browser cache / CDN | Hard reload; Pages' CDN settles within ~60s |
| SPA 404 on direct URL after deploy | Missing `404.html` fallback | Re-check that step in `deploy.yml`; don't remove it |
| `npm run dev` hangs at startup | Vite middleware port conflict | Free port 5000 or set `PORT=...` |
| `npm start` exits immediately in prod | `dist/index.js` missing | Run `npm run build` first |
| API calls 404 on the public site | You're on Pages — there's no Express there | Move the feature to a Replit/self-host deploy or stub it client-side |

## See also

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — what gets built and how
- [`TESTING.md`](TESTING.md) — pre-deploy verification
- [`../STANDARDS.md`](../STANDARDS.md) — secrets-in-source rules
- [`STATE.md`](STATE.md) — open deploy-related work
