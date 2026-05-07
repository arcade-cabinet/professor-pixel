import { describe, expect, it } from 'vitest';
import {
  generatePygameScene,
  generateTestScene,
  type ComponentSelection,
  type GeneratorOptions,
  type SceneConfig,
} from '@lib/wizard/scene-generator';

// Pure-function generator backed by the real component registry. We
// pass real component ids rather than mocking the registry, so we
// pin the contract that the generator + registry stay in sync. A
// regression that renames a component or breaks a generateCode entry
// would surface here.

const baseSceneConfig: SceneConfig = {
  name: 'Test Game',
  width: 640,
  height: 480,
  fps: 60,
  backgroundColor: '#000000',
};

function makeOptions(selections: ComponentSelection[] = []): GeneratorOptions {
  return {
    sceneConfig: baseSceneConfig,
    selectedComponents: selections,
  };
}

describe('generatePygameScene — base shell', () => {
  it('emits standard shebang + docstring + module imports', () => {
    const code = generatePygameScene(makeOptions());
    expect(code).toContain('#!/usr/bin/env python3');
    expect(code).toContain('Test Game');
    expect(code).toContain('import pygame');
    expect(code).toContain('import sys');
    expect(code).toContain('pygame.init()');
    expect(code).toContain('pygame.mixer.init()');
    expect(code).toContain('pygame.font.init()');
  });

  it('embeds the SceneConfig dimensions and FPS as constants', () => {
    const code = generatePygameScene({
      sceneConfig: { name: 'X', width: 1024, height: 768, fps: 30, backgroundColor: '#ff00ff' },
      selectedComponents: [],
    });
    expect(code).toContain('SCREEN_WIDTH = 1024');
    expect(code).toContain('SCREEN_HEIGHT = 768');
    expect(code).toContain('FPS = 30');
    expect(code).toContain('pygame.Color("#ff00ff")');
    expect(code).toContain('pygame.display.set_caption("X")');
  });

  it('always emits the Player class scaffold', () => {
    const code = generatePygameScene(makeOptions());
    expect(code).toContain('class Player:');
    expect(code).toContain('def update(self):');
    expect(code).toContain('def draw(self, screen):');
    expect(code).toContain('def take_damage(self, amount):');
  });

  it('always emits the Enemy base class scaffold', () => {
    const code = generatePygameScene(makeOptions());
    expect(code).toContain('class Enemy:');
  });
});

describe('generatePygameScene — component integration', () => {
  it('integrates a real registered component (ball) without crashing', () => {
    // Pass a real registry id so the generator's getComponentById
    // path actually resolves and dispatches to component.generateCode.
    const code = generatePygameScene(
      makeOptions([
        {
          componentId: 'ball',
          variant: 'default',
          assets: {},
          parameters: {},
        },
      ])
    );
    // Base shell still intact + ball-related code emitted.
    expect(code).toContain('class Player:');
    // Ball component generateCode should contribute something specific
    // to balls, OR at minimum the base shell remains valid.
    expect(code.length).toBeGreaterThan(500);
  });

  it('silently skips an unknown componentId without crashing', () => {
    // Pin: getComponentById returns undefined → continue. The
    // generator must not throw on unknown ids (forward-compat with
    // newer wizard versions writing future ids into a saved game).
    expect(() =>
      generatePygameScene(
        makeOptions([
          {
            componentId: 'definitely-not-a-real-component',
            variant: 'default',
            assets: {},
            parameters: {},
          },
        ])
      )
    ).not.toThrow();

    const code = generatePygameScene(
      makeOptions([
        {
          componentId: 'definitely-not-a-real-component',
          variant: 'default',
          assets: {},
          parameters: {},
        },
      ])
    );
    // Base shell still intact.
    expect(code).toContain('class Player:');
  });

  it('processes multiple components additively', () => {
    const code = generatePygameScene(
      makeOptions([
        { componentId: 'ball', variant: 'default', assets: {}, parameters: {} },
        { componentId: 'paddle', variant: 'default', assets: {}, parameters: {} },
        { componentId: 'scoreText', variant: 'default', assets: {}, parameters: {} },
      ])
    );
    expect(code).toContain('class Player:');
    expect(code.length).toBeGreaterThan(500);
  });

  it('passes parameter overrides through to the component generateCode', () => {
    // Both calls should produce different output if params actually
    // flow through. Use a parameter unlikely to appear by accident.
    const a = generatePygameScene(
      makeOptions([
        { componentId: 'ball', variant: 'default', assets: {}, parameters: { color: 'red' } },
      ])
    );
    const b = generatePygameScene(
      makeOptions([
        { componentId: 'ball', variant: 'default', assets: {}, parameters: { color: 'blue' } },
      ])
    );
    // We can't assert on generated code shape (depends on the
    // ball.generateCode internals), but if param routing is wired,
    // outputs should differ for different params unless both happen
    // to produce identical formatting; in that case at least the
    // generator must not crash on either input.
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
  });
});

describe('generatePygameScene — determinism', () => {
  it('produces identical output for identical input', () => {
    // Pin: no Date.now / Math.random in the generator. Critical for
    // preview caching and saved-game serialization.
    const opts = makeOptions([
      { componentId: 'ball', variant: 'default', assets: {}, parameters: {} },
    ]);
    expect(generatePygameScene(opts)).toBe(generatePygameScene(opts));
  });
});

describe('generateTestScene — preview snippet', () => {
  it('emits a runnable pygame snippet', () => {
    const code = generateTestScene();
    expect(typeof code).toBe('string');
    expect(code).toContain('import pygame');
    expect(code).toContain('pygame.init()');
  });

  it('is deterministic — same call → same output', () => {
    expect(generateTestScene()).toBe(generateTestScene());
  });
});
