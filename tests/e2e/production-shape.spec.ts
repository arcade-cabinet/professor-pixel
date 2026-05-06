// E1.1 — Real e2e on the production-shape build.
//
// Why: every previous e2e ran against `pnpm dev` at hostname `localhost`
// with BASE_URL=/. That mode papers over an entire class of deploy bugs:
// wouter routes that don't honor `<Router base>`, asset URLs that
// hardcode `/`, service-worker registrations whose scope doesn't match
// the Pages subpath, etc. The deploy-chain audit (commit 8cc8095..ff8284c)
// found three latent ones the dev-server harness couldn't see.
//
// This suite runs against `vite preview --base=/professor-pixel/` so the
// production bundle is exercised at its real BASE_URL. Any path that
// silently falls through to a 404 will surface here as a navigation or
// asset-load error.
//
// The webServer wiring lives in playwright.config.ts; this file just
// defines the assertions.

import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';

const BASE_PATH = '/professor-pixel';

interface ErrorCollector {
  pageErrors: Error[];
  consoleErrors: ConsoleMessage[];
  failedRequests: { url: string; status: number }[];
}

function attachErrorCollector(page: Page): ErrorCollector {
  const collector: ErrorCollector = {
    pageErrors: [],
    consoleErrors: [],
    failedRequests: [],
  };
  page.on('pageerror', (err) => collector.pageErrors.push(err));
  page.on('console', (msg) => {
    if (msg.type() === 'error') collector.consoleErrors.push(msg);
  });
  page.on('response', (resp) => {
    if (resp.status() >= 400 && resp.status() !== 404) {
      // 404s on /favicon.ico etc. are noise; only flag 5xx and other 4xx.
      collector.failedRequests.push({ url: resp.url(), status: resp.status() });
    }
  });
  return collector;
}

function assertNoErrors(collector: ErrorCollector, context: string) {
  // Filter HMR bleed-through (shouldn't appear against the preview server
  // build, but defensive). Note: we collect only msg.type() === 'error',
  // so console.warn (e.g. Pyodide's FinalizationRegistry GC notes) never
  // lands here in the first place; no need to filter warns.
  const ignoreConsole = [/\[HMR\]/i];
  const realConsoleErrors = collector.consoleErrors.filter(
    (m) => !ignoreConsole.some((re) => re.test(m.text()))
  );

  expect(
    collector.pageErrors,
    `[${context}] uncaught page errors: ${collector.pageErrors.map((e) => e.message).join('; ')}`
  ).toHaveLength(0);
  expect(
    realConsoleErrors,
    `[${context}] console errors: ${realConsoleErrors.map((m) => m.text()).join('; ')}`
  ).toHaveLength(0);
  expect(
    collector.failedRequests,
    `[${context}] failed requests: ${JSON.stringify(collector.failedRequests)}`
  ).toHaveLength(0);
}

test.describe('Production-shape build (BASE_URL=/professor-pixel/)', () => {
  test('home loads at the subpath without runtime errors', async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto(`${BASE_PATH}/`);
    await page.waitForLoadState('domcontentloaded');

    // Home renders the chooser landing — Lessons / Wizard / Editor.
    await expect(page.locator('main')).toBeVisible();
    assertNoErrors(errors, 'home');
  });

  test('lessons index resolves through wouter base', async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto(`${BASE_PATH}/lessons`);
    await page.waitForLoadState('domcontentloaded');

    // Lessons index loads the lessons.json catalog through baseUrl.
    // If the BASE_URL fix in lessons/loader.ts regressed, this would 404.
    await expect(page.locator('main')).toBeVisible();
    assertNoErrors(errors, 'lessons');
  });

  test('wizard mounts and the catalog hydrates', async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto(`${BASE_PATH}/wizard`);
    await page.waitForLoadState('domcontentloaded');

    // Wizard mounts Pixel + dialogue. Asset catalog hydrates lazily on
    // first picker open, so we don't need to wait for it here, but the
    // catalog.json fetch under /professor-pixel/assets/catalog.json
    // must not 404 if the user advances. That's a separate test; here
    // we just confirm the wizard surface renders.
    await expect(page.locator('[data-testid="pixel-avatar"]')).toBeVisible({ timeout: 15_000 });
    assertNoErrors(errors, 'wizard');
  });

  test('asset catalog fetches resolve through BASE_URL', async ({ page }) => {
    const errors = attachErrorCollector(page);

    // Direct fetch test against the build's BASE-prefixed catalog URL.
    // This avoids race conditions on listener timing and SW caching,
    // and asserts the exact thing we care about: the file is reachable
    // at the path the production bundle will request.
    await page.goto(`${BASE_PATH}/`);
    await page.waitForLoadState('domcontentloaded');

    const catalogResult = await page.evaluate(async (basePath) => {
      const url = `${basePath}/assets/catalog.json`;
      const res = await fetch(url);
      return { status: res.status, url, ok: res.ok };
    }, BASE_PATH);

    expect(catalogResult.status, `catalog HTTP status from ${catalogResult.url}`).toBe(200);
    expect(catalogResult.ok).toBe(true);
    assertNoErrors(errors, 'asset-catalog');
  });

  test('not-found route renders inside the wouter base', async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto(`${BASE_PATH}/this-does-not-exist`);
    await page.waitForLoadState('domcontentloaded');

    // A bug in routerBase would cause every route to fall through to
    // NotFound — so we verify NotFound *is* reachable but not via the
    // pages we asserted above.
    await expect(page.getByTestId('not-found-home')).toBeVisible();
    assertNoErrors(errors, 'not-found');
  });

  test('Pyodide cold-start finishes within budget', async ({ page }) => {
    // E1.3 — regression alarm. The COLD_START_BUDGET_MS constant in
    // src/python/pyodide-singleton.ts is 8000ms. We don't enforce that
    // exact ceiling at the e2e layer (CI runners are noisy and Pyodide
    // can spike), but we do enforce a generous outer bound so a runaway
    // regression that doubles the budget surfaces here. The singleton
    // already logs `console.info('Pyodide cold-start XXXms')` on every
    // boot — we parse that from the console stream.
    const E2E_OUTER_BUDGET_MS = 30_000;

    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto(`${BASE_PATH}/`);
    await page.waitForLoadState('domcontentloaded');

    // Trigger Pyodide via the singleton from the page context. The
    // singleton is in the main bundle; importing it via dynamic
    // window.dispatchEvent isn't available here, so we rely on the
    // runtime starting via a real route: /lesson/python-1 (the
    // first-lesson slug from lessons.json) loads the Run/Check
    // surface which calls getPyodide() on mount.
    //
    // Boot completion signal: window.pyodide gets set in the .then
    // handler (pyodide-singleton.ts:198), and in the same tick the
    // 'Pyodide cold-start XXXms' info log fires.
    await page.goto(`${BASE_PATH}/lesson/lesson-1`);
    await page.waitForFunction(() => Boolean((window as unknown as { pyodide?: unknown }).pyodide), {
      timeout: E2E_OUTER_BUDGET_MS,
    });

    const coldStartLog = consoleLogs.find((line) => /Pyodide cold-start \d+ms/.test(line));
    expect(coldStartLog, 'singleton must log cold-start duration on boot').toBeTruthy();

    const match = coldStartLog?.match(/(\d+)ms/);
    const observedMs = match ? Number(match[1]) : NaN;
    expect(observedMs, `parsed cold-start ms from "${coldStartLog}"`).toBeGreaterThan(0);
    expect(
      observedMs,
      `cold-start ${observedMs}ms exceeds e2e outer budget ${E2E_OUTER_BUDGET_MS}ms`
    ).toBeLessThan(E2E_OUTER_BUDGET_MS);
  });
});
