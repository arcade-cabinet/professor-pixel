import { describe, expect, it } from 'vitest';
import { shouldShowContinue, shouldShowOptions } from '@lib/wizard/utils';
import type { WizardNode, WizardOption } from '@lib/wizard/types';

function node(partial: Partial<WizardNode>): WizardNode {
  return { id: 't', text: '', ...partial } as WizardNode;
}

function opt(partial: Partial<WizardOption> & { text: string; next: string }): WizardOption {
  return { ...partial };
}

describe('shouldShowOptions / shouldShowContinue — single-continue collapse (F4.2)', () => {
  it('collapses a single "Continue" option to ContinueButton, not options list', () => {
    const n = node({ options: [opt({ text: 'Continue', next: 'next-node' })] });
    expect(shouldShowOptions(n, 0)).toBe(false);
    expect(shouldShowContinue(n, 0)).toBe(true);
  });

  it('matches case-insensitive continue patterns ("OK", "Got it", "Let\'s go")', () => {
    for (const text of [
      'ok',
      'OK',
      'Got it',
      "Let's go",
      'Sounds good',
      'Sure',
      'Next',
      'continue!',
    ]) {
      const n = node({ options: [opt({ text, next: 'x' })] });
      expect(shouldShowContinue(n, 0)).toBe(true);
      expect(shouldShowOptions(n, 0)).toBe(false);
    }
  });

  it('keeps a 2+ option node as an options list (no collapse)', () => {
    const n = node({
      options: [opt({ text: 'Continue', next: 'a' }), opt({ text: 'Skip', next: 'b' })],
    });
    expect(shouldShowOptions(n, 0)).toBe(true);
    expect(shouldShowContinue(n, 0)).toBe(false);
  });

  it('keeps a single option with action / setVariable / updatePreview as an options list', () => {
    const withAction = node({ options: [opt({ text: 'Continue', next: 'a', action: 'doX' })] });
    expect(shouldShowOptions(withAction, 0)).toBe(true);
    expect(shouldShowContinue(withAction, 0)).toBe(false);

    const withSetVar = node({
      options: [opt({ text: 'Continue', next: 'a', setVariable: { gameType: 'rpg' } })],
    });
    expect(shouldShowOptions(withSetVar, 0)).toBe(true);
    expect(shouldShowContinue(withSetVar, 0)).toBe(false);
  });

  it('keeps a non-continue single option ("Pick the dragon") as an options list', () => {
    const n = node({ options: [opt({ text: 'Pick the dragon', next: 'a' })] });
    expect(shouldShowOptions(n, 0)).toBe(true);
    expect(shouldShowContinue(n, 0)).toBe(false);
  });

  it('on a multiStep node, shows continue mid-stream and collapses options at the end if single-continue', () => {
    const n = node({
      multiStep: ['line 1', 'line 2', 'line 3'],
      options: [opt({ text: 'Continue', next: 'next-node' })],
    });
    // mid-stream: continue (multiStep)
    expect(shouldShowContinue(n, 0)).toBe(true);
    expect(shouldShowOptions(n, 0)).toBe(false);
    // end-of-multiStep: still continue (single-option collapse)
    expect(shouldShowContinue(n, 2)).toBe(true);
    expect(shouldShowOptions(n, 2)).toBe(false);
  });
});
