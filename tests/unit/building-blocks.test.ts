import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ComponentChoice,
  gameComponents,
  generateGameTemplate,
  getComponentChoice,
  getComponentSummary,
  getUserComponentChoices,
  resetComponentChoices,
  saveComponentChoice,
} from '@lib/wizard/building-blocks';

// building-blocks.ts is a 9000+ line registry of pluggable Python game
// components plus 6 helpers that persist user choices through localStorage
// and assemble a runnable Python file from those choices. jsdom gives us a
// real localStorage; the helpers and the assembler are testable end to end
// without any mocking.

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('gameComponents registry — shape invariants', () => {
  it('contains a non-empty array', () => {
    expect(Array.isArray(gameComponents)).toBe(true);
    expect(gameComponents.length).toBeGreaterThan(0);
  });

  it('every component has the GameComponent shape with both options populated', () => {
    for (const c of gameComponents) {
      expect(typeof c.id).toBe('string');
      expect(c.id.length).toBeGreaterThan(0);
      expect(typeof c.title).toBe('string');
      expect(typeof c.description).toBe('string');

      for (const opt of [c.optionA, c.optionB]) {
        expect(typeof opt.title).toBe('string');
        expect(typeof opt.description).toBe('string');
        expect(Array.isArray(opt.features)).toBe(true);
        expect(opt.features.length).toBeGreaterThan(0);
        expect(typeof opt.pythonCode).toBe('string');
        // Every option ships real Python — empty pythonCode would silently
        // produce a busted assembled template.
        expect(opt.pythonCode.length).toBeGreaterThan(0);
      }
    }
  });

  it('component IDs are unique across the registry', () => {
    // generateGameTemplate uses .find() to look up components — duplicates
    // would silently mask later entries.
    const ids = gameComponents.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getUserComponentChoices', () => {
  it('returns [] when nothing has been saved', () => {
    expect(getUserComponentChoices()).toEqual([]);
  });

  it('returns the parsed array when storage has valid JSON', () => {
    localStorage.setItem(
      'gameComponentChoices',
      JSON.stringify([{ component: 'combat', choice: 'A' }])
    );
    expect(getUserComponentChoices()).toEqual([{ component: 'combat', choice: 'A' }]);
  });

  it('returns [] (with a console.error) when storage is corrupt', () => {
    // Pin the resilience contract: corrupt JSON must NOT throw out of the
    // call site. The user's saved-choices state is best-effort.
    localStorage.setItem('gameComponentChoices', '{not json');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(getUserComponentChoices()).toEqual([]);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('saveComponentChoice / getComponentChoice', () => {
  it('round-trips a single choice', () => {
    saveComponentChoice('combat', 'A');
    expect(getComponentChoice('combat')).toBe('A');
  });

  it('overwrites an existing choice in place (does not duplicate)', () => {
    saveComponentChoice('combat', 'A');
    saveComponentChoice('combat', 'B');
    const all = getUserComponentChoices();
    const combat = all.filter((c) => c.component === 'combat');
    expect(combat.length).toBe(1);
    expect(combat[0]!.choice).toBe('B');
  });

  it('keeps multiple distinct choices', () => {
    saveComponentChoice('combat', 'A');
    saveComponentChoice('movement', 'B');
    expect(getComponentChoice('combat')).toBe('A');
    expect(getComponentChoice('movement')).toBe('B');
  });

  it('getComponentChoice returns null for unknown components', () => {
    expect(getComponentChoice('does-not-exist')).toBeNull();
  });
});

describe('resetComponentChoices', () => {
  it('clears the localStorage key', () => {
    saveComponentChoice('combat', 'A');
    resetComponentChoices();
    expect(getUserComponentChoices()).toEqual([]);
    expect(localStorage.getItem('gameComponentChoices')).toBeNull();
  });
});

describe('generateGameTemplate', () => {
  it('produces a runnable-shaped pygame template with header + colors + fps', () => {
    const out = generateGameTemplate('Platformer');
    // Header pinned: gameType is interpolated into the comment line.
    expect(out).toMatch(/Pixel's PyGame Palace - Platformer Game/);
    expect(out).toMatch(/import pygame/);
    expect(out).toMatch(/pygame\.init\(\)/);
    expect(out).toMatch(/SCREEN_WIDTH/);
    expect(out).toMatch(/FPS = 60/);
  });

  it('embeds the pythonCode of every chosen component', () => {
    const choices: ComponentChoice[] = [{ component: 'combat', choice: 'A' }];
    const combat = gameComponents.find((c) => c.id === 'combat');
    expect(combat).toBeTruthy();
    const expectedSnippet = combat!.optionA.pythonCode.split('\n')[0]!;
    const out = generateGameTemplate('TestGame', choices);
    expect(out).toContain(expectedSnippet);
  });

  it('honors choice="B" when explicitly chosen', () => {
    const choices: ComponentChoice[] = [{ component: 'combat', choice: 'B' }];
    const combat = gameComponents.find((c) => c.id === 'combat');
    const optionASnippet = combat!.optionA.pythonCode.split('\n')[0]!;
    const optionBSnippet = combat!.optionB.pythonCode.split('\n')[0]!;
    const out = generateGameTemplate('TestGame', choices);
    expect(out).toContain(optionBSnippet);
    // optionA's first line should NOT appear when B was selected — pin the
    // routing, not just the inclusion.
    if (optionASnippet !== optionBSnippet) {
      expect(out).not.toContain(optionASnippet);
    }
  });

  it('appends a default movement scaffold when no movement component is chosen', () => {
    // The assembler injects a BasicMovement class as a fallback. Pin this
    // contract — the resulting Python is incomplete without it.
    const out = generateGameTemplate('NoMovementGame', []);
    expect(out).toMatch(/Default Movement/);
    expect(out).toMatch(/class BasicMovement/);
  });

  it('skips the default movement scaffold when movement is selected', () => {
    const movement = gameComponents.find((c) => c.id === 'movement');
    if (!movement) {
      // If the registry is reorganized so 'movement' goes away, this test
      // should fail loudly rather than silently passing.
      expect.fail('expected a "movement" component in the registry');
    }
    const out = generateGameTemplate('Game', [{ component: 'movement', choice: 'A' }]);
    expect(out).not.toMatch(/# Default Movement \(no movement system selected\)/);
  });

  it('falls back to localStorage when componentChoices is undefined', () => {
    saveComponentChoice('combat', 'A');
    const out = generateGameTemplate('Game'); // no second arg
    const combat = gameComponents.find((c) => c.id === 'combat');
    const expectedSnippet = combat!.optionA.pythonCode.split('\n')[0]!;
    expect(out).toContain(expectedSnippet);
  });

  it('silently skips choices that reference unknown components', () => {
    // The .find() returns undefined and the loop body short-circuits —
    // pin this so a typo'd componentId doesn't blow up template generation.
    const out = generateGameTemplate('Game', [{ component: 'totally-fake', choice: 'A' }]);
    expect(typeof out).toBe('string');
    // Header + scaffolding still present.
    expect(out).toMatch(/import pygame/);
    expect(out).toMatch(/Default Movement/);
  });
});

describe('getComponentSummary', () => {
  it('returns {} when no choices have been saved', () => {
    expect(getComponentSummary()).toEqual({});
  });

  it('maps component title → chosen option title', () => {
    saveComponentChoice('combat', 'A');
    const combat = gameComponents.find((c) => c.id === 'combat')!;
    const summary = getComponentSummary();
    expect(summary[combat.title]).toBe(combat.optionA.title);
  });

  it('skips choices whose componentId is no longer in the registry', () => {
    // Defensive: if the registry shrinks but localStorage still has stale
    // entries, the summary should silently drop the orphan rather than
    // crash.
    localStorage.setItem(
      'gameComponentChoices',
      JSON.stringify([{ component: 'orphan-id', choice: 'A' }])
    );
    expect(getComponentSummary()).toEqual({});
  });
});
