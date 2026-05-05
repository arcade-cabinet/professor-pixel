// P4.28 — Live preview pause overlay uses kid-friendly copy.
//
// Before: "⏸ Paused" + "Press Resume (or P) to continue" — fine for
// adults, but the imperative phrasing and the parens-aside reads
// awkward to a 7-year-old. After: "Game paused" + "Tap Resume or
// press P to keep playing".
//
// Source-level contract: the i18n catalog owns the strings, so the
// test asserts (a) the catalog entries exist and read the right way,
// and (b) the live-preview component references those keys (not
// hardcoded strings), preventing a regression where someone inlines
// the text and breaks future translation.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { strings } from '@lib/i18n';

const LIVE_PREVIEW_SOURCE = readFileSync(
  join(__dirname, '..', '..', 'app/components/pygame/live-preview.tsx'),
  'utf8'
);

describe('live preview pause overlay copy (P4.28)', () => {
  it('catalog has the kid-friendly heading and hint', () => {
    expect(strings.livePreview.pauseHeading).toBe('Game paused');
    expect(strings.livePreview.pauseHint).toMatch(/resume|press p/i);
    // Should NOT use the old technical phrasing.
    expect(strings.livePreview.pauseHeading).not.toMatch(/^Paused$/);
  });

  it('live-preview.tsx references the catalog keys, not hardcoded strings', () => {
    expect(LIVE_PREVIEW_SOURCE).toContain('strings.livePreview.pauseHeading');
    expect(LIVE_PREVIEW_SOURCE).toContain('strings.livePreview.pauseHint');
    // Old copy must be gone.
    expect(LIVE_PREVIEW_SOURCE).not.toContain('Press Resume (or P) to continue');
  });
});
