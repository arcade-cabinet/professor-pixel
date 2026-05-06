---
title: Pillar 7 — Deploy
updated: 2026-05-06
status: current
domain: pillar
pillar: 7
---

# Pillar 7 — Deploy

Three target shapes for the same browser app: GitHub Pages (subpath), Capacitor Android (APK + signed Play Store), Capacitor iOS (TestFlight via manual Mac+Xcode flow).

## Targets

| Target | URL / artifact | Built by | Notes |
|---|---|---|---|
| GitHub Pages | `https://<user>.github.io/professor-pixel/` | `.github/workflows/cd.yml` | Subpath — Vite `--base=/professor-pixel/` |
| Android APK (debug) | 14-day workflow artifact | `.github/workflows/cd-mobile.yml` (push:main) | Unsigned, for QA download |
| Android AAB (signed release) | Play Store via Play Console | `cd-mobile.yml` (workflow_dispatch + `inputs.release=true`) | Behind `android-release` GitHub environment |
| iOS IPA (TestFlight) | TestFlight | Manual Mac+Xcode | No CI — see [docs/DEPLOYMENT.md](../DEPLOYMENT.md) |

## BASE_URL — single source of truth

Subpath deploys broke 11 different fetch sites the first time we tried Pages. Fix: one helper, one import, every site goes through it.

`src/utils/base-url.ts`:

```ts
const RAW_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
export const baseUrl: string = RAW_BASE.endsWith('/') ? RAW_BASE : `${RAW_BASE}/`;
export const routerBase: string = baseUrl === '/' ? '' : baseUrl.slice(0, -1);
export function withBase(path: string): string {
  return path.startsWith('/') ? `${baseUrl}${path.slice(1)}` : path;
}
```

| Symbol | Use | Example value (Pages) |
|---|---|---|
| `baseUrl` | Concatenating sub-paths in fetch | `/professor-pixel/` |
| `routerBase` | wouter `<Router base>` | `/professor-pixel` |
| `withBase(path)` | Wrapping a root-relative `/foo/bar` | `/professor-pixel/foo/bar` |

Migrated sites (every place that touches a root-relative URL): `assets/catalog.ts`, `python/pyodide-cache.ts`, `python/worker.ts`, `python/asset-mount.ts`, `pygame/runtime/exporter.ts`, `app/App.tsx` (Router base), `app/components/error-boundary.tsx` (go-home), `assets/manager.ts` (image preload), `python/pyodide-singleton.ts`, `storage/client.ts`, `lessons/loader.ts`, `wizard/utils.ts`. Plus 25 mascot URLs through `src/assets/pixel-images.ts`.

Why this matters: a hardcoded `/foo` works in dev (BASE_URL=`/`) and silently 404s on Pages. The single helper means one grep audits all sites.

## GitHub Pages — `cd.yml`

Trigger: `push: main`. Build: `vite build --base=/professor-pixel/`. Deploy: `actions/deploy-pages@v4`.

Static-only — no server. Service worker handles the WASM cache (see [Pillar 6](./06-storage.md#pyodide-wasm-cache--service-worker--opfs)). `404.html` is a copy of `index.html` so wouter handles deep links.

## Capacitor Android — `cd-mobile.yml`

**Debug APK on every main push.** Triggers when paths under `app/`, `src/`, `public/`, `android/`, `capacitor.config.ts`, or `package.json` change. Uploads APK as 14-day artifact for QA download.

**Signed release on workflow_dispatch.** Behind the `android-release` GitHub environment, which gates on the four `ANDROID_KEYSTORE_*` repository secrets.

### Security hardening

| Mitigation | What it stops |
|---|---|
| `if: github.event_name == 'workflow_dispatch' && inputs.release && (github.ref == 'refs/heads/main' \|\| startsWith(github.ref, 'refs/tags/'))` | Manual signing on a feature branch |
| `git fetch --depth=0` + `git merge-base --is-ancestor "$GITHUB_SHA" origin/main` | Tag pointing at a commit not actually on main |
| Late keystore decode (right before `assembleRelease`) | Long-lived keystore on disk during build |
| `if: always()` shred + rm cleanup of keystore + `signing.properties` | Keystore residue after job completes |

### `versionCode` / `versionName` — project properties

`android/app/build.gradle` reads from project properties so CI can bump per-release without committing:

```gradle
versionCode Integer.parseInt(project.findProperty("VERSION_CODE") ?: "1")
versionName project.findProperty("VERSION_NAME") ?: "1.0"
```

CI passes `-PVERSION_CODE=N -PVERSION_NAME=X.Y.Z` on the gradle invocation.

### Capacitor short-circuit

The service worker checks `location.protocol === 'capacitor:'` and skips registration. WASM is bundled in the APK; nothing to cache. Same protocol guard in `app/main.tsx`.

## Capacitor iOS — manual flow

iOS signing on GitHub-hosted runners is enough of a fight that we don't try. The workflow:

1. macOS host with current Xcode + Apple Developer signing identity.
2. `npx cap add ios` (one-time).
3. `pnpm build && npx cap copy ios`.
4. Open `ios/App/App.xcworkspace`, archive, upload via Transporter or `xcrun altool`.
5. Promote in App Store Connect.

Full runbook in [docs/DEPLOYMENT.md → iOS workflow](../DEPLOYMENT.md#ios-testflight).

## Production-shape e2e suite

A regular dev server runs at `BASE_URL=/`. Pages serves at `/professor-pixel/`. The two have caught divergent bugs four separate times. Defense:

- `tests/e2e/production-shape.spec.ts` — 6 functional tests: home, lessons, wizard, asset catalog (in-page fetch), not-found, cold-start budget.
- `tests/e2e/production-shape-visual.spec.ts` — 9 visual baselines (3 routes × 3 viewports). darwin-only — skipped in CI via `--grep-invert "production-shape-visual"`.
- `playwright.config.ts` — `webServer` array runs both `pnpm dev` and `vite build --base=/professor-pixel/ --outDir dist-preview-pages && vite preview --port 4173`. Namespaced `dist-preview-pages/` so `reuseExistingServer` doesn't pick up stale dev artifacts.
- CI: `e2e-production-shape` job in `ci.yml` uploads `test-results/` + `playwright-report/` on failure as 14-day artifact.

## Cold-start budget

`src/python/pyodide-singleton.ts` logs `console.info('Pyodide cold-start XXXms')` once per page load. Production-shape e2e parses it from the console stream and asserts under budget. dev-hud panel (`?debug=1`) surfaces it for live inspection.

## Cross-references

- Pyodide bootstrap, voiceschanged race: [Pillar 2 — Runtime](./02-runtime.md)
- OPFS WASM cache + Capacitor SW short-circuit: [Pillar 6 — Storage](./06-storage.md#pyodide-wasm-cache--service-worker--opfs)
- Build pipeline, aliases, manifest: [Pillar 1 — Frontend](./01-frontend.md)
- Operator runbook (manual user actions for Play Store keystore + iOS Xcode): [docs/DEPLOYMENT.md](../DEPLOYMENT.md)
