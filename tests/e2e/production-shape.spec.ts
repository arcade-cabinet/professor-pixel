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
  // Filter expected console noise — Pyodide emits warnings about
  // FinalizationRegistry availability that aren't bugs.
  const ignoreConsole = [/FinalizationRegistry/i, /\[HMR\]/i];
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
    let catalogStatus: number | null = null;
    let catalogUrl: string | null = null;

    // Attach listener BEFORE navigation so the catalog request (fired
    // from assetManager's eager hydration during module load) lands
    // in our handler.
    page.on('response', (resp) => {
      if (resp.url().includes('/assets/catalog.json')) {
        catalogStatus = resp.status();
        catalogUrl = resp.url();
      }
    });

    await page.goto(`${BASE_PATH}/wizard`);
    await page.waitForLoadState('domcontentloaded');

    // Wait specifically for the catalog response since it's lazy off
    // the React tree mount; eager hydration races with navigation.
    await page.waitForResponse((r) => r.url().includes('/assets/catalog.json'), {
      timeout: 15_000,
    });

    expect(catalogStatus, `catalog HTTP status: ${catalogStatus}`).toBe(200);
    expect(
      catalogUrl,
      `catalog URL must include the BASE path: ${catalogUrl}`
    ).toContain(`${BASE_PATH}/assets/catalog.json`);
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
});
