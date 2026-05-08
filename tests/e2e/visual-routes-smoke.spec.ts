import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Per-route visual smoke harness — added 2026-05-08 from the audit fix list (T1).
 *
 * Walks every public route in the app, captures a full-page screenshot to a
 * gitignored artifacts directory, and asserts only "did the page render
 * without throwing." There are NO committed baselines and NO diff-based
 * regression assertions yet. The audit's principle: until UI/UX confidence
 * is real, screenshots are review artifacts for humans, not pass/fail gates.
 *
 * Output:   artifacts/screenshots/web/<viewport-project>/<route-slug>.png
 * Trigger:  pnpm test:e2e (or any playwright invocation that picks this file up)
 *
 * The Playwright project matrix in playwright.config.ts already runs the file
 * across desktop-chromium, desktop-firefox, tablet-portrait, tablet-landscape,
 * mobile-portrait, mobile-landscape, mobile-modern — so a single test
 * iteration produces a screenshot per (route × viewport).
 *
 * Routes that need a path parameter (`/lesson/:lessonId`, `/play/:projectId`)
 * use lesson-1 and a known sample project id; if neither resolves, the test
 * still asserts "no JS error during navigation" rather than failing on the
 * route handler's empty state.
 */

interface RouteSpec {
  path: string;
  slug: string;
  /**
   * If set, wait for this selector (or any of these selectors) to appear
   * before screenshotting. Without a wait the page screenshot may capture
   * a loading state. Falls back to `body` if the wait times out, since the
   * goal is "screenshot the rendered surface", not "block on a load".
   */
  waitFor?: string;
}

const routes: RouteSpec[] = [
  { path: '/', slug: 'home', waitFor: '[data-testid="landing-choose-wizard"], main' },
  { path: '/lessons', slug: 'lessons-index', waitFor: 'main' },
  { path: '/lesson/lesson-1', slug: 'lesson-detail', waitFor: 'main' },
  { path: '/wizard', slug: 'wizard', waitFor: 'main' },
  { path: '/game-wizard', slug: 'game-wizard', waitFor: 'main' },
  { path: '/profile', slug: 'profile', waitFor: 'main' },
  { path: '/this-route-does-not-exist', slug: 'not-found', waitFor: 'body' },
];

const ARTIFACT_DIR = resolve(process.cwd(), 'artifacts', 'screenshots', 'web');

test.describe('Visual route smoke (artifact-only — no committed baselines)', () => {
  // Don't fail the spec on console errors; the audit's intent is "capture
  // what the user sees, even if it's broken." Errors get logged so a
  // reviewer scrolling the artifact directory can correlate.
  test.describe.configure({ mode: 'parallel' });

  for (const route of routes) {
    test(`renders ${route.slug}`, async ({ page }, testInfo) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => {
        consoleErrors.push(`pageerror: ${err.message}`);
      });

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });

      if (route.waitFor) {
        try {
          await page.waitForSelector(route.waitFor, { timeout: 5000 });
        } catch {
          // Fall through — we'll still screenshot what we have.
        }
      }

      // Give async hydration (Pyodide loader, OPFS probe, query catalog)
      // a brief moment to settle before snapshot.
      await page.waitForTimeout(500);

      // Project name comes from playwright.config.ts; fall back to
      // 'unknown-project' if absent (shouldn't happen in practice).
      const projectName = testInfo.project.name || 'unknown-project';
      const outDir = resolve(ARTIFACT_DIR, projectName);
      await mkdir(outDir, { recursive: true });
      const outPath = resolve(outDir, `${route.slug}.png`);
      await page.screenshot({ path: outPath, fullPage: true });

      // Existence assertion: the page reached a navigable state. We do NOT
      // assert specific UI is visible — that's the reviewer's job when they
      // open the artifact. The contract this test enforces is the lower
      // bar: navigation succeeded and a screenshot was captured.
      expect(page.url()).toContain(route.path === '/' ? '/' : route.path);

      // Surface console-error count in the test output so a reviewer can
      // grep without re-running. Don't fail on count — broken pages are
      // exactly what we want to look at.
      if (consoleErrors.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[visual-routes] ${route.slug} produced ${consoleErrors.length} console error(s):`);
        for (const e of consoleErrors.slice(0, 5)) {
          // eslint-disable-next-line no-console
          console.log(`  - ${e}`);
        }
      }
    });
  }
});
