/**
 * Accessibility regression suite. Runs axe-core against each major route via
 * @axe-core/playwright; the test fails if a violation tagged `wcag2a`,
 * `wcag2aa`, or `wcag22aa` is detected.
 *
 * Why per-route, not per-component: axe needs the page assembled (real focus
 * order, real ARIA composition from nested components) to evaluate landmarks,
 * heading hierarchy, color-contrast on actual rendered colors. Per-component
 * a11y assertions live with the components themselves (e.g. tests/component/
 * page-banner.test.tsx asserts the `<header>` landmark exists).
 *
 * Adding a new route to this suite: append a `routes` entry. Marking a known
 * violation that's tracked in a separate ticket: chain `.disableRules([...])`
 * with a one-line comment explaining the deferral. Don't disable rules without
 * a tracking note.
 */
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa'] as const;

const routes = [
  { name: 'home', path: '/' },
  { name: 'lesson', path: '/lesson/lesson-1' },
];

for (const { name, path } of routes) {
  test(`${name} (${path}) — no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(path);
    // Give the route a moment to settle (TanStack Query, lesson loader, etc.)
    // before scanning. Without this, axe sometimes scans skeleton states.
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withTags([...WCAG_TAGS]).analyze();

    expect(
      results.violations,
      `axe found ${results.violations.length} violation(s) on ${path}:\n${results.violations
        .map(
          (v) =>
            `  - [${v.id}] ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})`
        )
        .join('\n')}`
    ).toEqual([]);
  });
}
