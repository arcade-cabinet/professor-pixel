// P4.31 — "Expected output" badge + tooltip on the comparison canvas.
//
// Source-level contract: the catalog has the strings, and live-
// preview.tsx wraps the badge in a Tooltip. Drift in either fails
// the suite.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { strings } from '@lib/i18n';

const LIVE_PREVIEW_SOURCE = readFileSync(
  join(__dirname, '..', '..', 'app/components/pygame/live-preview.tsx'),
  'utf8'
);

describe('expected-output tooltip (P4.31)', () => {
  it('catalog has the badge label and explanatory tooltip', () => {
    expect(strings.livePreview.alternativeBadge).toBe('Expected output');
    expect(strings.livePreview.alternativeTooltip).toMatch(/should look|expected|compare/i);
    expect(strings.livePreview.compareButtonTooltip).toMatch(/side by side/i);
  });

  it('the badge text comes from the catalog, not a hardcoded "Alternative"', () => {
    expect(LIVE_PREVIEW_SOURCE).toContain('strings.livePreview.alternativeBadge');
    // The old hardcoded label must be gone.
    expect(LIVE_PREVIEW_SOURCE).not.toMatch(/>\s*Alternative\s*</);
  });

  it('the badge is wrapped in a Tooltip with explanatory content', () => {
    // Anchor on the testid set on the Badge to find the surrounding
    // tooltip block, then assert the tooltip content references the
    // catalog explanation.
    const tooltipMatch = LIVE_PREVIEW_SOURCE.match(
      /<Tooltip(?:\s[^>]*)?>[\s\S]*?badge-expected-output[\s\S]*?<\/Tooltip>/
    );
    expect(
      tooltipMatch,
      'Badge with testid badge-expected-output not wrapped in Tooltip'
    ).not.toBeNull();
    expect(tooltipMatch![0]).toContain('strings.livePreview.alternativeTooltip');
  });
});
