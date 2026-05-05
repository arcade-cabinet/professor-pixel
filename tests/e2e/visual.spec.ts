/**
 * Visual regression baseline. Captures golden screenshots per route and
 * compares each subsequent CI run against the committed baseline.
 *
 * Playwright's `toHaveScreenshot()` writes goldens to
 * `tests/e2e/visual.spec.ts-snapshots/<test-name>-<project>.png` on the first
 * run (when --update-snapshots is set) and asserts pixel-diff <= threshold on
 * every run after.
 *
 * Threshold: `maxDiffPixelRatio: 0.01` (1% of pixels may differ). The ratio
 * absorbs subpixel font-rendering wobble across Chromium versions; large
 * meaningful diffs (a missing element, a wrong color) blow well past 1%.
 *
 * Per playwright.config.ts there are 7 projects (desktop-chromium, -firefox,
 * tablet-portrait, -landscape, mobile-portrait, -landscape, mobile-modern).
 * The `routes` × `7 projects` grid sets up our baseline matrix.
 *
 * To regenerate goldens after an intentional UI change:
 *   pnpm test:e2e --update-snapshots --grep visual
 * Then commit the updated `*-snapshots/` folder alongside the UI change.
 */
import { expect, test } from '@playwright/test';

const routes = [
  { name: 'home', path: '/' },
  { name: 'lesson', path: '/lesson/lesson-1' },
];

for (const { name, path } of routes) {
  test(`${name} (${path}) — visual baseline`, async ({ page }) => {
    await page.goto(path);
    // Wait for the route to fully settle: TanStack Query results in, lesson loader done,
    // any opening animation completed. Without this, screenshots flake on the
    // first frame of fade-in animations.
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
}
