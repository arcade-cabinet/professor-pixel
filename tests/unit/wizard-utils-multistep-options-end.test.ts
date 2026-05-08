// Cover line 84 of src/wizard/utils.ts:
//   shouldShowOptions on a multiStep node where the user has reached
//   the last dialogue step AND the node has multiple distinct options
//   (NOT a single-continue collapse). The branch returns
//   `!!currentNode.options`. Existing wizard-utils.test.ts only
//   exercises the single-continue collapse case.

import { describe, expect, it } from 'vitest';
import { shouldShowOptions } from '@lib/wizard/utils';
import type { WizardNode, WizardOption } from '@lib/wizard/types';

function node(partial: Partial<WizardNode>): WizardNode {
  return { id: 't', text: '', ...partial } as WizardNode;
}

function opt(partial: Partial<WizardOption> & { text: string; next: string }): WizardOption {
  return { ...partial };
}

describe('shouldShowOptions — multiStep last step with multiple options (line 84)', () => {
  it('returns true when at the end of a multiStep with two real choices', () => {
    const n = node({
      multiStep: ['intro line 1', 'intro line 2'],
      options: [
        opt({ text: 'Pick A', next: 'a' }),
        opt({ text: 'Pick B', next: 'b' }),
      ],
    });
    // dialogueStep === multiStep.length - 1 → fall through past the
    // multiStep guard. Two distinct options → not the
    // single-continue collapse → return !!options === true.
    expect(shouldShowOptions(n, 1)).toBe(true);
  });

  it('returns false when at the end of a multiStep with no options at all', () => {
    const n = node({
      multiStep: ['only line'],
    });
    expect(shouldShowOptions(n, 0)).toBe(false);
  });
});
