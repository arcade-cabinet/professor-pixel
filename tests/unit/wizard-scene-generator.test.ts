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
  it('integrates a real registered component (ball) — output diverges from base', () => {
    // Pass a real registry id so the generator's getComponentById
    // path actually resolves and dispatches to component.generateCode.
    // Pin against base shell to require the component's generateCode
    // to actually contribute output, not just a length-over-500 token
    // from the base template.
    const base = generatePygameScene(makeOptions());
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
    expect(code).toContain('class Player:');
    expect(code).not.toBe(base);
    expect(code.length).toBeGreaterThan(base.length);
  });

  it('silently skips an unknown componentId — output is base-identical', () => {
    // Pin: getComponentById returns undefined → continue. The
    // generator must not throw on unknown ids (forward-compat with
    // newer wizard versions writing future ids into a saved game)
    // AND the output must equal the base shell since no component
    // contribution lands.
    const base = generatePygameScene(makeOptions());
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
    expect(code).toBe(base);
  });

  it('processes multiple components additively — each contributes vs single', () => {
    // Multiple components should produce a longer output than a
    // single one. Pin to require additive contribution rather than
    // just code.length>500 which can pass on the base shell alone.
    const single = generatePygameScene(
      makeOptions([{ componentId: 'ball', variant: 'default', assets: {}, parameters: {} }])
    );
    const multi = generatePygameScene(
      makeOptions([
        { componentId: 'ball', variant: 'default', assets: {}, parameters: {} },
        { componentId: 'paddle', variant: 'default', assets: {}, parameters: {} },
        { componentId: 'scoreText', variant: 'default', assets: {}, parameters: {} },
      ])
    );
    expect(multi).toContain('class Player:');
    expect(multi.length).toBeGreaterThan(single.length);
    expect(multi).not.toBe(single);
  });

  it('passes parameter overrides through to the component generateCode', () => {
    // Pin: outputs MUST differ when parameters differ, otherwise
    // parameter routing is silently broken and games would all look
    // identical regardless of user choices. Ball's generateCode
    // interpolates `color` (hex → RGB tuple), so distinct hex inputs
    // must produce distinct output.
    const a = generatePygameScene(
      makeOptions([
        { componentId: 'ball', variant: 'default', assets: {}, parameters: { color: '#FF0000' } },
      ])
    );
    const b = generatePygameScene(
      makeOptions([
        { componentId: 'ball', variant: 'default', assets: {}, parameters: { color: '#00FF00' } },
      ])
    );
    expect(a).not.toBe(b);
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
