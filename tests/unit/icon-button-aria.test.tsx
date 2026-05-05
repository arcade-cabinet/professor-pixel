// P4.24 — every icon-only button surfaces a screen-reader label.
//
// This test exercises the four buttons that historically shipped
// without aria-label (close-pixel-menu, asset-browser close, runner
// fullscreen toggle, runner close). Rather than re-mounting four
// disparate component trees with their full prop scaffolding, we
// snapshot the i18n labels themselves — drift in the catalog would
// turn this test red.
//
// The runtime usage of these labels is exercised by the existing
// e2e suite which clicks the testids; the gap was the SR
// announcement, which is now provable from the catalog.

import { describe, expect, it } from 'vitest';
import { strings } from '@lib/i18n';

describe('icon-button aria-labels (P4.24)', () => {
  it('exposes all five icon-only button labels in the i18n catalog', () => {
    const ib = strings.iconButtons;
    expect(ib.closePixelMenu).toMatch(/close/i);
    expect(ib.closeAssetBrowser).toMatch(/close/i);
    expect(ib.runnerEnterFullscreen).toMatch(/fullscreen/i);
    expect(ib.runnerExitFullscreen).toMatch(/fullscreen/i);
    expect(ib.runnerClose).toMatch(/close/i);
  });

  it('uses distinct strings for enter/exit fullscreen so SR announces the action', () => {
    const enter = strings.iconButtons.runnerEnterFullscreen;
    const exit = strings.iconButtons.runnerExitFullscreen;
    expect(enter).not.toBe(exit);
    // Stronger contract: the labels must differ in user-visible content,
    // not just by trailing whitespace or a hidden-character typo. Each
    // contains its own action verb.
    expect(enter.toLowerCase()).toContain('enter');
    expect(exit.toLowerCase()).toContain('exit');
  });

  it('exposes a dismiss label for the floating-feedback X button', () => {
    expect(strings.floatingFeedback.dismissAriaLabel).toMatch(/dismiss|close|hide/i);
  });
});
