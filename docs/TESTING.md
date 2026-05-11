---
title: Testing
updated: 2026-05-08
status: current
domain: quality
---

# Testing

> Strategy, tooling, conventions, and the actual commands that run them.

## Strategy at a glance

Vitest 3 with native `projects` declares three classifications, each with the runtime it needs. Playwright owns e2e.

| Layer | Runner | Lives in | Runtime | Purpose |
|------|--------|----------|---------|---------|
| **Unit** | Vitest | `tests/unit/` | jsdom | Pure-logic, fast |
| **Integration** | Vitest | `tests/integration/` | jsdom (longer timeout) | Multi-module glue (hooks, persistence, dialogue engine) |
| **Component** | Vitest browser | `tests/component/` | Real Chromium via `@vitest/browser` + Playwright | React components in a real browser |
| **End-to-end** | Playwright | `tests/e2e/` | Real Chromium / Firefox / mobile | Full user journeys, multi-resolution |

**Playwright is the source of truth** for "does this feature work?". Vitest unit tests are the source of truth for "does this function behave?". Vitest component tests are for "does this React component render and respond as expected in a real browser?". When in doubt, prefer the higher-fidelity layer.

## Running tests

```bash
# Vitest projects (run from the workspace root)
npm test                       # all Vitest projects
pnpm test:unit              # unit only
pnpm test:integration       # integration only
pnpm test:component         # component only — requires Playwright Chromium
pnpm test:watch             # watch mode (all projects)
pnpm test:ui                # browser-based runner UI
pnpm test:coverage          # coverage report

# Playwright (e2e)
npx playwright install --with-deps chromium   # one-time, or after Playwright upgrades
pnpm test:e2e                              # all projects
npx playwright test smoke-tests.spec.ts       # one suite
npx playwright test --project=mobile-portrait # one viewport
npx playwright test --headed                  # show browsers
npx playwright show-report                    # open last HTML report

# Comprehensive runner (custom orchestrator over Playwright)
npx tsx tests/e2e/run-comprehensive-tests.ts             # everything
npx tsx tests/e2e/run-comprehensive-tests.ts --critical  # critical-only (~5 min)
npx tsx tests/e2e/run-comprehensive-tests.ts --high      # critical + high (~10 min)
```

Playwright auto-starts the dev server on **port 5173** via the `webServer` block in `playwright.config.ts`.

## Tree

```
tests/
  setup/common.ts            global setup — jsdom matchers, mocks for matchMedia/IntersectionObserver/ResizeObserver
  helpers/test-utils.ts      RTL helpers, LocalStorageMock, SessionStorageMock, CookieMock, fixtures
  unit/                      Vitest unit (jsdom)
    persistence.test.ts
  integration/               Vitest integration (jsdom)
    wizard-dialogue-engine.test.tsx
  component/                 Vitest browser (real Chromium)
    responsive-wizard.test.tsx
  e2e/                       Playwright
    *.spec.ts
    utils/                   error-detection, wizard-actions
    global-setup.ts
    run-comprehensive-tests.ts
```

## Vitest configuration

`vitest.config.ts` declares three projects. Each gets its own setup, environment, and aliases (`@`, `@lib`, `@assets` matching `vite.config.ts`).

```ts
projects: [
  { test: { name: 'unit',        environment: 'jsdom', include: ['tests/unit/**/*.test.{ts,tsx}'] } },
  { test: { name: 'integration', environment: 'jsdom', include: ['tests/integration/**/*.test.{ts,tsx}'], testTimeout: 15000 } },
  { test: { name: 'component',   include: ['tests/component/**/*.test.{ts,tsx}'],
            browser: { enabled: true, provider: 'playwright', headless: true,
                       instances: [{ browser: 'chromium' }] } } },
]
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
- **Network failures** — failed asset fetches, broken `/api/static/*.json` references.
- **React render errors** — error-boundary trips, component crashes.

These are wired up in `tests/e2e/utils/error-detection.ts`; every spec opts into the watcher.

## Test ID conventions

Every interactive element gets a `data-testid` so e2e tests don't depend on copy or DOM structure. Playwright actions go through `tests/e2e/utils/wizard-actions.ts` rather than ad-hoc selectors.

```tsx
// {action}-{target}
<button data-testid="button-select-jump">Jump</button>
<input data-testid="input-jump-force" />

// {type}-{description}-{id} for dynamic items
<div data-testid={`component-${component.id}-instance`} />
```

If a Playwright spec needs to target an element that doesn't have a `data-testid`, **add the attribute** — don't fall back to text or class selectors.

## Unit / integration / component test conventions

- **Layer choice.** Logic that doesn't touch the DOM → unit. Logic that crosses two modules and hits storage / hooks → integration. Behaviour that needs a real layout, real CSS, real event loop → component.
- **Use `@testing-library/react`** + **`@testing-library/user-event`**. Query by role/text — not by class.
- **Mocks.** `vi.mock('@lib/storage/persistence', …)` for storage in jsdom layers. Component-layer tests should run against the real implementation when possible.
- **One concept per test.** Test names describe the **behaviour** (`renders an error when the asset 404s`), not the implementation (`calls handleAssetError`).
- **No `it.todo`, no `.skip`, no commented-out tests.** Either fix or delete.

## Coverage

`vitest.config.ts` ships v8 coverage with `text + html + lcov` reporters and writes to `coverage/`. Include globs are `app/**/*.{ts,tsx}` and `src/**/*.{ts,tsx}`; barrels and `*.stories.tsx` are excluded. Thresholds are not enforced yet — adding them is tracked in [`STATE.md`](STATE.md).

## CI integration

`.github/workflows/ci.yml` runs:

```yaml
- pnpm install --frozen-lockfile
- pnpm check                              # tsc
- pnpm build                              # production build
- npx playwright install --with-deps chromium
- pnpm catalog                            # build asset catalog
- pnpm test:unit                          # blocking
- pnpm test:integration                   # advisory (until pre-existing tests catch up)
- pnpm test:component                     # advisory (until pre-existing tests catch up)
```

`test:e2e` lives in a separate workflow (Playwright traces are heavy artifacts).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Cannot find dependency 'jsdom'` | Fresh clone | `pnpm install --frozen-lockfile` (jsdom is a direct dep) |
| `browserType.launch: Executable doesn't exist` for component tests | Playwright Chromium not installed | `npx playwright install --with-deps chromium` |
| Pyodide tests fail to load | Pyodide CDN unreachable | Mock at `window.loadPyodide` (see `src/types/pyodide.d.ts`) |
| Playwright times out at startup | `pnpm dev` slow / port 5173 busy | Increase `webServer.timeout` in `playwright.config.ts`; free port 5173 |
| Asset catalog 404 in tests | `predev`/`prebuild` didn't run | `pnpm catalog` |

## Visual + Android smoke harnesses (artifact-only)

Added 2026-05-08 from the functional truth audit (T1, T2). Both harnesses
write screenshots to a **gitignored** `artifacts/` directory for human
review. There are intentionally NO committed baselines and NO diff-based
regression assertions yet — until UI/UX confidence is real, baselines
would just enshrine current-state flaws. Visual regression with diffs
becomes meaningful only after the audit fix list closes.

| Harness | Trigger | Output |
|---|---|---|
| Web routes (Playwright) | `pnpm test:e2e` (the file `tests/e2e/visual-routes-smoke.spec.ts` runs alongside other e2e specs) | `artifacts/screenshots/web/<viewport>/<route>.png` |
| Android (Maestro) | `pnpm test:android:smoke` (gated on `adb devices` + `maestro --version`) | `artifacts/screenshots/android/0[1-3]-*.png` |

Both contracts pin only "did the page render without throwing" — the
reviewer opens the artifact directory to assess visual quality. Gating
on Maestro/adb means the script exits cleanly with a friendly skip on
machines without an emulator.

See `artifacts/README.md` for the directory layout, clear-out recipe,
and the audit doctrine the harnesses encode.

## Future enhancements

- Coverage thresholds (90/85/90/90 lines/branches/functions/statements) re-enabled. Current configured floors in `vitest.config.ts`: statements 87, branches 80, functions 85, lines 88. Current measured actuals: 88.69 / 83.21 / 86.05 / 89.63 — see the lineage table in `vitest.config.ts` for ratchet history.
- Visual regression baselines committed once UI/UX is confidence-locked. The Playwright + Maestro harnesses already capture the screenshots; flipping them into pass/fail mode is a one-line change once we want it.
- Accessibility checks via `@axe-core/playwright`. (Already partially shipped via `tests/integration/axe-*.test.tsx`; expanding to e2e is the future enhancement.)
- Performance benchmarks for Pyodide cold-start and frame-rate of the simulator.
- Mutation testing (e.g. `stryker`) on the grader and PyGame simulator.
- Catalog self-test that runs every lesson's bundled `solution` through real Pyodide + the grader. (The unit-time surface-marker check already shipped — see `tests/unit/lessons-content.test.ts`. The full Pyodide round-trip is the future enhancement.)

## See also

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — what's actually being tested
- [`../STANDARDS.md`](../STANDARDS.md) — the rules tests are enforcing
- [`STATE.md`](STATE.md) — what's done, what's next on the testing front
