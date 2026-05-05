// Omnibus task-001 — audio-toggle's user-facing strings live in the
// i18n catalog. Source-level checks because the component renders
// state-conditional strings (one branch per enabled/disabled), which
// makes pure DOM assertions a coverage matrix; asserting the source
// references the catalog keys is faster and locks the contract that
// matters: no hardcoded English in this component.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { strings } from '@lib/i18n';

const SOURCE = readFileSync(join(__dirname, '..', '..', 'app/components/audio-toggle.tsx'), 'utf8');

describe('audio-toggle i18n (omnibus task-001)', () => {
  it('catalog has both the imperative aria-labels and the present-tense visible labels', () => {
    expect(strings.chrome.audioToggle.onLabel).toBe('Mute Pixel');
    expect(strings.chrome.audioToggle.offLabel).toBe('Unmute Pixel');
    expect(strings.chrome.audioToggle.soundOnLabel).toBe('Sound on');
    expect(strings.chrome.audioToggle.soundOffLabel).toBe('Sound off');
  });

  it('component reads from the catalog rather than inlining the strings', () => {
    expect(SOURCE).toContain('strings.chrome.audioToggle.onLabel');
    expect(SOURCE).toContain('strings.chrome.audioToggle.offLabel');
    expect(SOURCE).toContain('strings.chrome.audioToggle.soundOnLabel');
    expect(SOURCE).toContain('strings.chrome.audioToggle.soundOffLabel');
  });

  it('the old hardcoded English strings are gone from this component', () => {
    // The four literal strings that earlier sat inline in audio-
    // toggle.tsx. If any of these reappear the component has drifted
    // back off the catalog.
    expect(SOURCE).not.toMatch(/'Mute audio'/);
    expect(SOURCE).not.toMatch(/'Unmute audio'/);
    expect(SOURCE).not.toMatch(/'Sound on'/);
    expect(SOURCE).not.toMatch(/'Sound off'/);
  });
});
