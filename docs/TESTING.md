---
title: Testing
updated: 2026-05-04
status: current
domain: quality
---

# Testing

> Strategy, tooling, conventions, and the actual commands that run them.

## Strategy at a glance

| Layer | Runner | Lives in | Purpose |
|------|--------|----------|---------|
| **Unit** | Vitest (`jsdom`) | `client/src/**/__tests__/`, `client/src/**/*.test.{ts,tsx}` | Isolated logic + small components |
| **Backend unit** | Vitest (`node`, `vitest.backend.config.ts`) | `server/**/*.test.ts`, `shared/**/*.test.ts` | Express handlers, storage, schema |
| **End-to-end** | Playwright | `tests/e2e/` | Real browser, full user journeys, multi-resolution |
| **Legacy cross-browser** | Selenium | `tests/selenium/` | Frozen — kept for legacy ChromeDriver/Selenium-only checks until Playwright equivalents land |

**Playwright is the source of truth** for "does this feature work?". Vitest is the source of truth for "does this function behave?". When in doubt, an e2e test wins over a unit test that mocks too much.

## Running tests

The repo currently exposes no `npm test` script — invoke runners directly. (Adding `test`, `test:e2e`, and `test:backend` scripts is tracked in [`STATE.md`](STATE.md).)

```bash
# Unit (client + jsdom)
npx vitest run                              # one-shot
npx vitest                                  # watch mode
npx vitest --ui                             # browser-based runner UI
COVERAGE=true npx vitest run --coverage     # with coverage (excludes integration tests)

# Backend
npx vitest run --config vitest.backend.config.ts

# End-to-end (Playwright) — requires the dev server (auto-started by config on :5000)
npx playwright test                                  # all projects
npx playwright test smoke-tests.spec.ts              # one suite
npx playwright test --project=mobile-portrait        # one viewport
npx playwright test --headed                         # show browsers
npx playwright show-report                           # open last HTML report

# Comprehensive runner (custom orchestrator)
npx tsx tests/e2e/run-comprehensive-tests.ts             # everything
npx tsx tests/e2e/run-comprehensive-tests.ts --critical  # critical-only (~5 min)
npx tsx tests/e2e/run-comprehensive-tests.ts --high      # critical + high (~10 min)
npx tsx tests/e2e/run-comprehensive-tests.ts --headed    # show browser UI
npx tsx tests/e2e/run-comprehensive-tests.ts --suite <name>
npx tsx tests/e2e/run-comprehensive-tests.ts --project <browser>

# Convenience scripts
./run-playwright-tests.sh                  # full multi-resolution sweep
./run-tests.sh                             # short local smoke set
node run-tests.js                          # node-driven helper
```

## Playwright projects (viewports)

Defined in `playwright.config.ts`:

| Project | Viewport | Notes |
|---------|----------|-------|
| `desktop-chromium` | 1920×1080 | Default desktop |
| `desktop-firefox` | 1920×1080 | Cross-engine sanity |
| `tablet-portrait` | 768×1024 (iPad) | Touch enabled |
| `tablet-landscape` | 1024×768 (iPad) | Touch enabled |
| `mobile-portrait` | 375×667 (iPhone 8) | `isMobile`, touch |
| `mobile-landscape` | 667×375 (iPhone 8) | `isMobile`, touch |
| `mobile-modern` | iPhone 12 default | Modern mobile baseline |

The config retries twice on CI (`process.env.CI`), runs single-worker on CI, and captures screenshot/video/trace on failure.

## What we test for

The Playwright suite was built **specifically to catch the runtime errors plain unit tests missed**. Each spec watches for:

- **Vite error overlays** — build/compile errors that surface in dev.
- **Uncaught JS exceptions** — type errors, undefined access.
- **Import / export failures** — missing modules, broken dependency graphs.
- **Network failures** — failed `/api/*` calls, missing assets.
- **React render errors** — error-boundary trips, component crashes.

These are wired up in `tests/e2e/utils/error-detection.ts`; every spec opts into the watcher.

## Test ID conventions

Every interactive element gets a `data-testid` so e2e tests don't depend on copy or DOM structure. The conventions are **enforced by code review**, and Playwright actions go through `tests/e2e/utils/wizard-actions.ts` rather than ad-hoc selectors.

```tsx
// {action}-{target}
<button data-testid="button-select-jump">Jump</button>
<input data-testid="input-jump-force" />

// {type}-{description}-{id} for dynamic items
<div data-testid={`component-${component.id}-instance`} />
```

If a Playwright spec needs to target an element that doesn't have a `data-testid`, **add the attribute** — don't fall back to text or class selectors.

## Unit test conventions

- Co-locate: `Foo.tsx` ↔ `Foo.test.tsx` (or under `__tests__/`).
- Use **`@testing-library/react`** + **`@testing-library/user-event`**. Query by role/text — not by class.
- Mock the network with **MSW** (`tests/setup.ts` wires it). Don't stub `fetch` directly.
- For Pyodide / PyGame logic, use the fixtures in `tests/fixtures/` and the helpers around `pyodide-fixture.ts`.
- One concept per test. Test names describe the **behaviour** (`renders an error when the asset 404s`), not the implementation (`calls handleAssetError`).
- No `it.todo`, no `.skip`, no commented-out tests. Either fix or delete.

## Coverage

Both Vitest configs target `90/85/90/90` (lines / branches / functions / statements). Reports land in:

- `coverage/` — frontend (`v8`, text + json + html + lcov)
- `coverage-backend/` — backend

Coverage runs intentionally **exclude** integration and e2e tests (they live in their own pipelines). Coverage of the e2e layer is tracked separately by Playwright trace artefacts, not lines-of-code.

## CI integration

`/.github/workflows/ci.yml` currently runs `npm run check` and the production build on every PR and on `push: main`/`develop`. The Playwright + Vitest steps are not yet wired into CI; that's a follow-up tracked in [`STATE.md`](STATE.md). Outline of the target pipeline:

```yaml
- npm ci
- npm run check                    # tsc
- npx vitest run --coverage         # frontend unit + integration
- npx vitest run --config vitest.backend.config.ts --coverage
- npx playwright install --with-deps
- npx playwright test               # full multi-resolution
- upload coverage + Playwright report artifacts
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Cannot find dependency 'jsdom'` | Fresh clone | `npm ci` (jsdom is a direct dep) |
| Pyodide tests fail to load | Python bootstrap path mismatch | Check `tests/fixtures/fake-pygame.py` is reachable; verify Pyodide CDN reachable in test env |
| Playwright times out at startup | `npm run dev` slow / port 5000 busy | Increase `webServer.timeout` in `playwright.config.ts`; free port 5000 |
| Coverage missing for a file | Globs in `vitest.config.ts` exclude/include | Update `include` / `exclude` rather than disabling the threshold |
| Selenium suite breaks after browser update | ChromeDriver mismatch | Pin `chromedriver` version in `package.json`; preferred fix is to retire the spec into Playwright |

## Future enhancements (target state)

- Visual regression with Playwright screenshots (per-project baselines).
- Accessibility checks via `@testing-library/jest-dom` + `axe-playwright`.
- Performance benchmarks for Pyodide cold-start and frame-rate of the simulator.
- Mutation testing (e.g. `stryker`) on the grader and PyGame simulator.
- Retire the Selenium suite once Playwright covers all its checks.

## See also

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — what's actually being tested
- [`../STANDARDS.md`](../STANDARDS.md) — the rules tests are enforcing
- [`STATE.md`](STATE.md) — what's done, what's next on the testing front
