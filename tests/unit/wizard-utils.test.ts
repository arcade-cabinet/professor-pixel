import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectDevice,
  extractGameType,
  formatTestId,
  getButtonSize,
  getButtonVariant,
  getCurrentText,
  getGameTypeIcon,
  getLayoutMode,
  getSingleNavigableTarget,
  loadWizardFlow,
  shouldShowContinue,
  shouldShowOptions,
  shouldUseOptionGrid,
  updateSessionActionsForOption,
} from '@lib/wizard/utils';
import type { DeviceState, SessionActions, WizardNode, WizardOption } from '@lib/wizard/types';

function node(partial: Partial<WizardNode>): WizardNode {
  return { id: 't', text: '', ...partial } as WizardNode;
}

function opt(partial: Partial<WizardOption> & { text: string; next: string }): WizardOption {
  return { ...partial };
}

function makeSessionActions(overrides: Partial<SessionActions> = {}): SessionActions {
  return {
    choices: [],
    createdAssets: [],
    gameType: null,
    currentProject: null,
    completedSteps: [],
    unlockedEditor: false,
    ...overrides,
  };
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

  it('returns false for null node', () => {
    expect(shouldShowOptions(null, 0)).toBe(false);
    expect(shouldShowContinue(null, 0)).toBe(false);
  });

  it('returns false from shouldShowOptions when node has no options and is not multiStep', () => {
    const n = node({});
    expect(shouldShowOptions(n, 0)).toBe(false);
  });
});

describe('getSingleNavigableTarget', () => {
  it('returns next when single side-effect-free option', () => {
    const n = node({ options: [opt({ text: 'Continue', next: 'next-node' })] });
    expect(getSingleNavigableTarget(n)).toBe('next-node');
  });

  it('returns null for null node', () => {
    expect(getSingleNavigableTarget(null)).toBe(null);
  });

  it('returns null when multiple options', () => {
    const n = node({ options: [opt({ text: 'A', next: 'a' }), opt({ text: 'B', next: 'b' })] });
    expect(getSingleNavigableTarget(n)).toBe(null);
  });

  it('returns null when single option has side effects', () => {
    const n = node({ options: [opt({ text: 'X', next: 'a', action: 'doX' })] });
    expect(getSingleNavigableTarget(n)).toBe(null);
  });

  it('returns null when next is missing', () => {
    const n = node({ options: [{ text: 'X' } as WizardOption] });
    expect(getSingleNavigableTarget(n)).toBe(null);
  });
});

describe('detectDevice', () => {
  beforeEach(() => {
    // jsdom defaults are 1024×768 — override per test.
    vi.stubGlobal('innerWidth', 1024);
    vi.stubGlobal('innerHeight', 768);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects mobile portrait', () => {
    vi.stubGlobal('innerWidth', 375);
    vi.stubGlobal('innerHeight', 667);
    const d = detectDevice();
    expect(d).toEqual({ isMobile: true, isLandscape: false, screenWidth: 375, screenHeight: 667 });
  });

  it('detects mobile landscape', () => {
    vi.stubGlobal('innerWidth', 667);
    vi.stubGlobal('innerHeight', 375);
    const d = detectDevice();
    expect(d.isMobile).toBe(true);
    expect(d.isLandscape).toBe(true);
  });

  it('detects desktop (above mobile breakpoint)', () => {
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 800);
    expect(detectDevice().isMobile).toBe(false);
  });
});

describe('getLayoutMode', () => {
  it('returns "desktop" for non-mobile regardless of orientation', () => {
    const ds: DeviceState = {
      isMobile: false,
      isLandscape: true,
      screenWidth: 1280,
      screenHeight: 800,
    };
    expect(getLayoutMode(ds)).toBe('desktop');
    expect(getLayoutMode({ ...ds, isLandscape: false })).toBe('desktop');
  });

  it('returns "phone-landscape" for mobile + landscape', () => {
    expect(
      getLayoutMode({ isMobile: true, isLandscape: true, screenWidth: 667, screenHeight: 375 })
    ).toBe('phone-landscape');
  });

  it('returns "phone-portrait" for mobile + portrait', () => {
    expect(
      getLayoutMode({ isMobile: true, isLandscape: false, screenWidth: 375, screenHeight: 667 })
    ).toBe('phone-portrait');
  });
});

describe('extractGameType', () => {
  it('extracts the leading word before " -" and lowercases', () => {
    expect(extractGameType('Platformer - Jumpy fun')).toBe('platformer');
    expect(extractGameType('RPG - Epic quest')).toBe('rpg');
  });

  it('returns null when there is no leading word-dash pattern', () => {
    expect(extractGameType('Just a description')).toBe(null);
    expect(extractGameType('')).toBe(null);
  });
});

describe('getGameTypeIcon', () => {
  it('returns an icon for a known game type', () => {
    expect(getGameTypeIcon('Platformer - Jumpy')).toBeTruthy();
    expect(getGameTypeIcon('RPG - Epic')).toBeTruthy();
  });

  it('returns null when game type is not in the icon map', () => {
    expect(getGameTypeIcon('Mystery - Whodunit')).toBe(null);
  });

  it('returns null when no game type is extractable', () => {
    expect(getGameTypeIcon('Just text')).toBe(null);
  });
});

describe('getCurrentText', () => {
  it('returns empty string for null node', () => {
    expect(getCurrentText(null, 0)).toBe('');
  });

  it('returns the multiStep entry at dialogueStep when multiStep is present', () => {
    const n = node({ multiStep: ['line A', 'line B', 'line C'] });
    expect(getCurrentText(n, 0)).toBe('line A');
    expect(getCurrentText(n, 2)).toBe('line C');
  });

  it('returns plain text when no multiStep / conditionals', () => {
    expect(getCurrentText(node({ text: 'plain' }), 0)).toBe('plain');
  });

  it('appends followUp with double newline when present', () => {
    expect(getCurrentText(node({ text: 'top', followUp: 'extra' }), 0)).toBe('top\n\nextra');
  });

  it('uses followUp as the message when text is empty', () => {
    expect(getCurrentText(node({ text: '', followUp: 'just follow' }), 0)).toBe('just follow');
  });

  it('uses conditionalText.gameType when sessionActions.gameType matches', () => {
    const n = node({
      conditionalText: { gameType: { rpg: 'For RPG fans', default: 'For everyone' } },
    });
    const sa = makeSessionActions({ gameType: 'rpg' });
    expect(getCurrentText(n, 0, sa)).toBe('For RPG fans');
  });

  it('falls back to conditionalText.default when gameType has no specific entry', () => {
    const n = node({
      conditionalText: { gameType: { rpg: 'rpg-only', default: 'default' } },
    });
    const sa = makeSessionActions({ gameType: 'puzzle' });
    expect(getCurrentText(n, 0, sa)).toBe('default');
  });

  it('falls back to text when conditionalText is configured but yields empty', () => {
    const n = node({
      text: 'fallback',
      conditionalText: { gameType: {} },
    });
    const sa = makeSessionActions({ gameType: 'rpg' });
    expect(getCurrentText(n, 0, sa)).toBe('fallback');
  });

  it('appends conditionalFollowUp.gameType when present', () => {
    const n = node({
      text: 'top',
      conditionalFollowUp: { gameType: { rpg: 'rpg follow', default: 'def follow' } },
    });
    const sa = makeSessionActions({ gameType: 'rpg' });
    expect(getCurrentText(n, 0, sa)).toBe('top\n\nrpg follow');
  });
});

describe('updateSessionActionsForOption', () => {
  it('always appends to choices', () => {
    const sa = makeSessionActions();
    const out = updateSessionActionsForOption(sa, 'random text');
    expect(out.choices).toEqual(['random text']);
  });

  // Two predicates gate gameType setting:
  //   1. /^(Platformer|RPG|Dungeon|Racing|Puzzle|Adventure)\s*-/i  (leading word + dash)
  //   2. /^(Jumpy|Epic|Creepy|Speed|Brain|Point-and-Click)/i        (leading literal)
  // Only inputs that match one of those, AND whose lowered text contains a
  // gameType keyword from the inner if-chain, get classified.
  it.each([
    ['Platformer - Jumpy fun', 'platformer'],
    ['Jumpy character with bouncy attack', 'platformer'],
    ['RPG - Epic quest', 'rpg'],
    ['Epic sword and sorcery saga', 'rpg'],
    ['Dungeon - Creepy depths', 'dungeon'],
    ['Creepy dungeon crawler', 'dungeon'],
    ['Racing - Speed run', 'racing'],
    ['Speed racing turbo', 'racing'],
    ['Puzzle - Brain teaser', 'puzzle'],
    ['Brain puzzle tricky', 'puzzle'],
    ['Adventure - Explore', 'adventure'],
    ['Point-and-Click adventure mystery', 'adventure'],
  ])('routes %s → gameType=%s on initial selection', (text, expected) => {
    const out = updateSessionActionsForOption(makeSessionActions(), text);
    expect(out.gameType).toBe(expected);
  });

  it('does not modify gameType once already set', () => {
    const sa = makeSessionActions({ gameType: 'rpg' });
    const out = updateSessionActionsForOption(sa, 'Platformer - Jumpy');
    expect(out.gameType).toBe('rpg');
  });

  it('does not classify component-variant text as a gameType selection', () => {
    const out = updateSessionActionsForOption(makeSessionActions(), 'Real-time combat');
    expect(out.gameType).toBe(null);
  });
});

describe('loadWizardFlow', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns data.nodes when the response has nested structure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ nodes: { foo: { id: 'foo' } } }),
      })
    );
    const out = await loadWizardFlow('/wizard-flow.json');
    expect(out).toEqual({ foo: { id: 'foo' } });
  });

  it('returns the response itself when flat (no `nodes` wrapper)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ foo: { id: 'foo' } }),
      })
    );
    const out = await loadWizardFlow('/wizard-flow.json');
    expect(out).toEqual({ foo: { id: 'foo' } });
  });

  it('throws on non-OK HTTP response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' })
    );
    await expect(loadWizardFlow('/missing.json')).rejects.toThrow(/HTTP 404/);
  });

  it('rethrows on network failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    await expect(loadWizardFlow('/x')).rejects.toThrow(/boom/);
  });
});

describe('layout helpers', () => {
  it('shouldUseOptionGrid: only when desktop AND >4 options', () => {
    expect(shouldUseOptionGrid(5, false)).toBe(true);
    expect(shouldUseOptionGrid(4, false)).toBe(false);
    expect(shouldUseOptionGrid(10, true)).toBe(false); // mobile is never grid
  });

  it('getButtonVariant: outline for mobile OR >4 options, default otherwise', () => {
    expect(getButtonVariant(true, 2)).toBe('outline');
    expect(getButtonVariant(false, 5)).toBe('outline');
    expect(getButtonVariant(false, 3)).toBe('default');
  });

  it('getButtonSize: lg for mobile, default for desktop', () => {
    expect(getButtonSize(true)).toBe('lg');
    expect(getButtonSize(false)).toBe('default');
  });

  it('formatTestId: prefix-index format', () => {
    expect(formatTestId('btn', 3)).toBe('btn-3');
    expect(formatTestId('opt', 0)).toBe('opt-0');
  });
});
