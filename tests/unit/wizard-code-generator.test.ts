import { describe, expect, it } from 'vitest';
import { generatePygameCode, generateTestCode } from '@lib/wizard/code-generator';
import type { GameChoice } from '@/components/pygame/live-preview';

// Pure code-generator — takes wizard choices + params, returns a
// Python source string. Tests assert structural invariants of the
// emitted code rather than exact whitespace, since formatter changes
// in the generator should not break tests.

describe('generatePygameCode — base shape', () => {
  it('emits valid pygame imports + setup with no choices', () => {
    const code = generatePygameCode([]);
    expect(code).toContain('import pygame');
    expect(code).toContain('import random');
    expect(code).toContain('from pygame.locals import *');
    expect(code).toContain('pygame.init()');
    expect(code).toContain('pygame.display.set_mode((640, 360))');
    expect(code).toContain('clock = pygame.time.Clock()');
  });

  it('uses default speed/jumpHeight/enemySpeed when params omitted', () => {
    const code = generatePygameCode([]);
    expect(code).toContain('speed = 5');
    expect(code).toContain('jump_height = 10');
    expect(code).toContain('enemy_speed = 3');
  });

  it('honors explicit GameParams overrides', () => {
    const code = generatePygameCode([], { speed: 12, jumpHeight: 25, enemySpeed: 7 });
    expect(code).toContain('speed = 12');
    expect(code).toContain('jump_height = 25');
    expect(code).toContain('enemy_speed = 7');
    // No leftover defaults.
    expect(code).not.toContain('speed = 5');
  });

  it('emits the standard ground_y / gravity initial constants', () => {
    const code = generatePygameCode([]);
    expect(code).toContain('gravity = 0.5');
    expect(code).toContain('ground_y = 300');
  });
});

describe('generatePygameCode — character choice', () => {
  it('adds a Player class when a character choice is present', () => {
    const choice: GameChoice = { type: 'character', id: 'hero', name: 'Hero' };
    const code = generatePygameCode([choice]);
    expect(code).toContain('class Player');
    expect(code).toContain('def __init__(self)');
    expect(code).toContain('def update(self)');
    expect(code).toContain('def jump(self)');
    expect(code).toContain('def move_left(self)');
    expect(code).toContain('def move_right(self)');
  });

  it('embeds the character id into the Player.type field', () => {
    // Pin the character-id propagation — the generated game uses the
    // type for branching elsewhere, and a regression that drops the
    // id would silently render every character interchangeable.
    const choice: GameChoice = { type: 'character', id: 'wizard', name: 'Wizard' };
    const code = generatePygameCode([choice]);
    expect(code).toMatch(/self\.type\s*=\s*"wizard"/);
  });
});

describe('generatePygameCode — enemy choice', () => {
  it('emits enemy-related code when an enemy choice is present', () => {
    const choice: GameChoice = { type: 'enemy', id: 'goblin', name: 'Goblin' };
    const code = generatePygameCode([choice]);
    // Generator emits an Enemy class (or equivalent enemy logic).
    // Both forms appear in real templates; assert at least one.
    expect(code.toLowerCase()).toMatch(/enemy|goblin/);
  });
});

describe('generatePygameCode — collectible choice', () => {
  it('emits collectible logic when a collectible choice is present', () => {
    const choice: GameChoice = { type: 'collectible', id: 'coin', name: 'Coin' };
    const code = generatePygameCode([choice]);
    expect(code.toLowerCase()).toMatch(/collectible|coin/);
  });
});

describe('generatePygameCode — background choice', () => {
  it('emits background fill / draw code when a background choice is present', () => {
    const choice: GameChoice = { type: 'background', id: 'forest', name: 'Forest' };
    const code = generatePygameCode([choice]);
    // Background choices change the fill color or draw env.
    // At minimum, screen.fill or background-related code should appear
    // in the generated output.
    expect(code).toMatch(/screen\.fill|background/i);
  });
});

describe('generatePygameCode — multiple choices combine', () => {
  it('processes multiple choices additively without losing earlier ones', () => {
    const choices: GameChoice[] = [
      { type: 'character', id: 'hero', name: 'Hero' },
      { type: 'enemy', id: 'goblin', name: 'Goblin' },
      { type: 'collectible', id: 'coin', name: 'Coin' },
    ];
    const code = generatePygameCode(choices);
    // All three contributions should be visible.
    expect(code).toContain('class Player'); // from character
    expect(code.toLowerCase()).toMatch(/enemy|goblin/);
    expect(code.toLowerCase()).toMatch(/collectible|coin/);
  });

  it('produces deterministic output for the same input', () => {
    // Pin determinism — a refactor that introduced Date.now() or
    // Math.random() into the generator would break preview caching
    // and serialization. This test catches that.
    const choices: GameChoice[] = [
      { type: 'character', id: 'hero', name: 'Hero' },
      { type: 'enemy', id: 'goblin', name: 'Goblin' },
    ];
    const a = generatePygameCode(choices, { speed: 7 });
    const b = generatePygameCode(choices, { speed: 7 });
    expect(a).toBe(b);
  });
});

describe('generatePygameCode — unknown choice types', () => {
  it('does not crash on an unrecognized choice type', () => {
    // The switch has no default branch, so unknown types silently
    // fall through without contributing to the template — and the
    // base shell remains valid pygame code.
    const choice = { type: 'unknown-future-type', id: 'x', name: 'X' } as unknown as GameChoice;
    expect(() => generatePygameCode([choice])).not.toThrow();
    const code = generatePygameCode([choice]);
    expect(code).toContain('pygame.init()');
  });
});

describe('generateTestCode — preview snippet', () => {
  it('emits a runnable pygame snippet with a frame loop', () => {
    const code = generateTestCode();
    expect(code).toContain('import pygame');
    expect(code).toContain('pygame.init()');
    expect(code).toContain('pygame.display.set_mode((640, 360))');
    // 180-frame fixed loop = 3 seconds at 60 FPS.
    expect(code).toContain('for frame in range(180)');
    expect(code).toContain('clock.tick(60)');
    expect(code).toContain('pygame.quit()');
  });

  it('is deterministic — same call → same output', () => {
    expect(generateTestCode()).toBe(generateTestCode());
  });
});
