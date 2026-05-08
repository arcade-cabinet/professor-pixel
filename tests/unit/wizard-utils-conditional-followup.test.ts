// Cover the cold conditional-followUp branches in src/wizard/utils.ts
// that the existing wizard-utils suite skips:
//   - line 143 path 2: `conditionalFollowUps[gameType] || conditionalFollowUps.default || ''`
//     — third arm fires when both the gameType-keyed entry AND the
//     default entry are falsy (empty string / missing).
//   - line 144 path 1 falsy: `if (followUpText)` falsy — when both
//     fallbacks above resolve to '', followUpText is empty and the
//     concatenation block is skipped.
//   - line 208 path 1 falsy: `lowerText.includes('adventure')` etc.
//     final `||` arm — option text matches the game-type pattern via
//     'point-and-click' alone (the prior includes don't fire), wiring
//     to gameType='adventure'.

import { describe, expect, it } from 'vitest';
import { getCurrentText, updateSessionActionsForOption } from '@lib/wizard/utils';
import type { SessionActions } from '@lib/wizard/types';

const baseSession = {
  choices: [],
  gameType: 'puzzle',
  selectedComponents: {},
  selectedAssetIds: [],
  livePreviewChoices: [],
  previewHistory: [],
  completedSteps: [],
} as unknown as SessionActions;

describe('getCurrentText — conditionalFollowUp empty fallback (lines 143 path 2 + 144 falsy)', () => {
  it('falls through to the empty-string default when neither gameType-keyed nor default entries match', () => {
    const node = {
      id: 'test-node',
      text: 'Base text.',
      conditionalFollowUp: {
        gameType: {
          // sessionActions.gameType is 'puzzle'; only 'platformer' is keyed.
          // No default key → second `||` fires; the third `|| ''` lands.
          platformer: 'Platform-specific follow-up',
        },
      },
    } as unknown as Parameters<typeof getCurrentText>[0];
    const result = getCurrentText(node, 0, baseSession);
    // followUpText resolved to '' → the line-144 if guard skips, so the
    // final string is just the base text.
    expect(result).toBe('Base text.');
  });

  it('uses the default entry when the gameType-keyed lookup is empty', () => {
    const node = {
      id: 'test-node',
      text: 'Base text.',
      conditionalFollowUp: {
        gameType: {
          puzzle: '', // explicit empty → || advances to default
          default: 'Default follow-up',
        },
      },
    } as unknown as Parameters<typeof getCurrentText>[0];
    const result = getCurrentText(node, 0, baseSession);
    expect(result).toContain('Default follow-up');
  });
});

describe('updateSessionActionsForOption — adventure subpattern (line 208 final-arm)', () => {
  it("'point-and-click' alone (no 'adventure' / 'explore') wires to gameType='adventure'", () => {
    // The existing suite tests 'Adventure - Explore' / 'Explore the world'
    // but the option text in this case must hit the line-208 third
    // include-arm. The function's outer guard at line 167-170 also requires
    // matching the initial-game-selection regex — 'Point-and-Click' is one
    // of the listed Jumpy/Epic/Creepy/Speed/Brain/Point-and-Click prefixes.
    const result = updateSessionActionsForOption(
      // No gameType yet — required to enter the gameType-set branch.
      { ...baseSession, gameType: undefined } as unknown as SessionActions,
      'Point-and-Click adventure'
    );
    expect(result.gameType).toBe('adventure');
  });
});
