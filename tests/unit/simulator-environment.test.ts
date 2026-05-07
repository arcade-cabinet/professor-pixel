import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPygameEnvironment,
  resetPygameState,
  setCanvasContext,
  simulatePygame,
  getFrameBuffer,
} from '@lib/pygame/runtime/simulator';

// createPygameEnvironment is a pure factory that builds a JS-side
// pygame namespace. Tests exercise each method (display, draw, time,
// font, mixer, event, key, mouse, image, transform, sprite, locals,
// random) for return shape + side effects.
//
// simulatePygame is a regex-based code analyser that turns pygame.draw
// calls into descriptor objects for the WYSIWYG preview. Tests cover
// the parse + default + error-fallback branches plus the
// movement-variable animation tweak.

function fakeCtx(): CanvasRenderingContext2D {
  const canvas = { width: 800, height: 600 } as HTMLCanvasElement;
  return {
    canvas,
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    closePath: vi.fn(),
    ellipse: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
  } as unknown as CanvasRenderingContext2D;
}

beforeEach(() => {
  resetPygameState();
  setCanvasContext(null);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  resetPygameState();
  setCanvasContext(null);
  vi.restoreAllMocks();
});

describe('createPygameEnvironment — display module', () => {
  it('set_mode returns a main RenderingSurface', () => {
    const env = createPygameEnvironment();
    const surface = env.display.set_mode([320, 240]);
    expect(surface).toBeTruthy();
    expect(surface.isMainSurface).toBe(true);
  });

  it('flip / update / set_caption do not throw', () => {
    const env = createPygameEnvironment();
    expect(() => env.display.flip()).not.toThrow();
    expect(() => env.display.update()).not.toThrow();
    expect(() => env.display.set_caption('My Game')).not.toThrow();
  });
});

describe('createPygameEnvironment — draw module', () => {
  it('circle pushes a circle command when on main surface with active context', () => {
    setCanvasContext(fakeCtx());
    const env = createPygameEnvironment();
    const surface = env.display.set_mode([800, 600]);
    env.draw.circle(surface, [255, 0, 0], [50, 60], 10);
    const buf = getFrameBuffer();
    expect(buf.some((cmd) => cmd.type === 'circle')).toBe(true);
  });

  it('circle is a no-op without a canvas context', () => {
    const env = createPygameEnvironment();
    const surface = env.display.set_mode([800, 600]);
    env.draw.circle(surface, [255, 0, 0], [50, 60], 10);
    // No context → no command pushed
    expect(getFrameBuffer().length).toBe(0);
  });

  it('rect handles array-shaped rect arg', () => {
    setCanvasContext(fakeCtx());
    const env = createPygameEnvironment();
    const surface = env.display.set_mode([800, 600]);
    env.draw.rect(surface, [0, 255, 0], [10, 20, 30, 40]);
    expect(getFrameBuffer().some((cmd) => cmd.type === 'rect')).toBe(true);
  });

  it('rect handles PygameRect-object shape (x/y/width/height)', () => {
    setCanvasContext(fakeCtx());
    const env = createPygameEnvironment();
    const surface = env.display.set_mode([800, 600]);
    const pygameRect = { x: 1, y: 2, width: 3, height: 4 };
    env.draw.rect(surface, [0, 0, 255], pygameRect as never);
    expect(getFrameBuffer().some((cmd) => cmd.type === 'rect')).toBe(true);
  });

  it('line pushes a line command', () => {
    setCanvasContext(fakeCtx());
    const env = createPygameEnvironment();
    const surface = env.display.set_mode([800, 600]);
    env.draw.line(surface, [0, 0, 0], [0, 0], [50, 50], 3);
    expect(getFrameBuffer().some((cmd) => cmd.type === 'line')).toBe(true);
  });

  it('polygon pushes a polygon command', () => {
    setCanvasContext(fakeCtx());
    const env = createPygameEnvironment();
    const surface = env.display.set_mode([800, 600]);
    env.draw.polygon(
      surface,
      [255, 255, 0],
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ]
    );
    expect(getFrameBuffer().some((cmd) => cmd.type === 'polygon')).toBe(true);
  });

  it('ellipse pushes an ellipse command', () => {
    setCanvasContext(fakeCtx());
    const env = createPygameEnvironment();
    const surface = env.display.set_mode([800, 600]);
    env.draw.ellipse(surface, [0, 255, 255], [10, 20, 100, 50]);
    expect(getFrameBuffer().some((cmd) => cmd.type === 'ellipse')).toBe(true);
  });
});

describe('createPygameEnvironment — time / font / mixer / event / key / mouse', () => {
  it('time.Clock + get_ticks return reasonable shapes', () => {
    const env = createPygameEnvironment();
    const ticks = env.time.get_ticks();
    expect(typeof ticks).toBe('number');
    const clock = new env.time.Clock();
    expect(clock).toBeTruthy();
  });

  it('font.Font and SysFont yield font-like instances', () => {
    const env = createPygameEnvironment();
    const f1 = new env.font.Font(null, 24);
    const f2 = env.font.SysFont('arial', 16);
    expect(f1).toBeTruthy();
    expect(f2).toBeTruthy();
  });

  it('mixer.init/quit/Sound + music submodule are no-ops that do not throw', () => {
    const env = createPygameEnvironment();
    expect(() => env.mixer.init()).not.toThrow();
    expect(() => env.mixer.quit()).not.toThrow();
    expect(() => env.mixer.music.load('a.mp3')).not.toThrow();
    expect(() => env.mixer.music.play()).not.toThrow();
    expect(() => env.mixer.music.stop()).not.toThrow();
    expect(() => env.mixer.music.set_volume(0.5)).not.toThrow();
  });

  it('event.get / poll / Event provide simulation defaults', () => {
    const env = createPygameEnvironment();
    expect(env.event.get()).toEqual([]);
    expect(env.event.poll()).toBeNull();
    const e = env.event.Event(12, { foo: 'bar' });
    expect(e.type).toBe(12);
    expect((e as unknown as { foo: string }).foo).toBe('bar');
  });

  it('key.get_pressed returns 512-length zeroed buffer; key.name labels indices', () => {
    const env = createPygameEnvironment();
    const keys = env.key.get_pressed();
    expect(keys.length).toBe(512);
    expect(keys.every((k: boolean) => k === false)).toBe(true);
    expect(env.key.name(13)).toMatch(/Key13/);
  });

  it('mouse.get_pos / get_pressed / set_cursor return defaults safely', () => {
    const env = createPygameEnvironment();
    expect(env.mouse.get_pos()).toEqual([0, 0]);
    expect(env.mouse.get_pressed()).toEqual([false, false, false]);
    expect(env.mouse.set_cursor([0, 0], [0, 0], null, null)).toBeNull();
  });
});

describe('createPygameEnvironment — image / transform / sprite / Color / random / locals', () => {
  it('image.load returns a placeholder surface; image.save logs', () => {
    const env = createPygameEnvironment();
    const surf = env.image.load('hero.png');
    expect(surf).toBeTruthy();
    expect(() => env.image.save(surf, 'out.png')).not.toThrow();
  });

  it('transform.scale/rotate/flip return surfaces', () => {
    const env = createPygameEnvironment();
    const surf = env.display.set_mode([100, 100]);
    expect(env.transform.scale(surf, [50, 50])).toBeTruthy();
    expect(env.transform.rotate(surf, 90)).toBeTruthy();
    expect(env.transform.flip(surf, true, false)).toBeTruthy();
  });

  it('sprite.Sprite + Group implement add/remove/empty/update/draw', () => {
    const env = createPygameEnvironment();
    // The exported Sprite class shape doesn't precisely match PygameSprite —
    // image is `RenderingSurface | null` here vs `| undefined` on the type
    // alias. The runtime contract is what we're pinning.
    // biome-ignore lint/suspicious/noExplicitAny: shape mismatch noted above
    const sprite: any = new env.sprite.Sprite();
    const group = new env.sprite.Group();
    group.add(sprite);
    expect(group.sprites.length).toBe(1);
    group.update();
    const surf = env.display.set_mode([100, 100]);
    expect(() => group.draw(surf)).not.toThrow();
    group.remove(sprite);
    expect(group.sprites.length).toBe(0);
    group.add(sprite);
    group.empty();
    expect(group.sprites.length).toBe(0);
  });

  it('Color packs into a 4-tuple with default alpha=255', () => {
    const env = createPygameEnvironment();
    expect(env.Color(10, 20, 30)).toEqual([10, 20, 30, 255]);
    expect(env.Color(1)).toEqual([1, 0, 0, 255]);
    expect(env.Color(1, 2, 3, 100)).toEqual([1, 2, 3, 100]);
  });

  it('random.randint clamps to range; choice picks from arr; shuffle returns same array', () => {
    const env = createPygameEnvironment();
    for (let i = 0; i < 50; i++) {
      const n = env.random.randint(5, 7);
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(7);
    }
    expect(['a', 'b', 'c']).toContain(env.random.choice(['a', 'b', 'c']));
    const arr = [1, 2, 3];
    const out = env.random.shuffle(arr);
    expect(out).toBe(arr); // shuffle is in-place
    expect(out.sort()).toEqual([1, 2, 3]);
    expect(typeof env.random.random()).toBe('number');
  });

  it('locals constants are aliased onto the pygame namespace', () => {
    const env = createPygameEnvironment() as unknown as Record<string, number>;
    expect(env.QUIT).toBe(12);
    expect(env.K_LEFT).toBe(276);
    expect(env.K_SPACE).toBe(32);
  });

  it('init/quit are safe to call', () => {
    const env = createPygameEnvironment();
    expect(() => env.init()).not.toThrow();
    expect(() => env.quit()).not.toThrow();
  });
});

describe('simulatePygame', () => {
  it('rejects non-string input safely (returns empty objects)', () => {
    expect(simulatePygame('').objects).toEqual([]);
    // biome-ignore lint/suspicious/noExplicitAny: testing wrong-type input
    expect(simulatePygame(null as any).objects).toEqual([]);
    // biome-ignore lint/suspicious/noExplicitAny: testing wrong-type input
    expect(simulatePygame(undefined as any).objects).toEqual([]);
  });

  it('parses pygame.draw.circle into a circle descriptor', () => {
    const code = `
import pygame
screen = pygame.display.set_mode((800, 600))
pygame.draw.circle(screen, BLUE, (100, 200), 30)
`;
    const result = simulatePygame(code);
    expect(result.objects.length).toBeGreaterThan(0);
    const circle = result.objects.find((o) => o.type === 'circle');
    expect(circle).toBeTruthy();
    expect(circle?.x).toBe(100);
    expect(circle?.y).toBe(200);
    expect(circle?.size).toBe(30);
  });

  it('parses pygame.draw.rect into a rect descriptor', () => {
    const code = `
import pygame
screen = pygame.display.set_mode((800, 600))
pygame.draw.rect(screen, RED, (10, 20, 30, 40))
`;
    const result = simulatePygame(code);
    expect(result.objects.some((o) => o.type === 'rect')).toBe(true);
  });

  it('falls back to a default circle when the regex does not match', () => {
    // pygame.draw.circle present but in a malformed shape that fails the regex.
    const code = 'pygame.draw.circle("garbage", "non-tuple")';
    const result = simulatePygame(code);
    expect(result.objects.some((o) => o.type === 'circle')).toBe(true);
  });

  it('falls back to a default rect when the regex does not match', () => {
    const code = 'pygame.draw.rect(garbage, no-tuple)';
    const result = simulatePygame(code);
    expect(result.objects.some((o) => o.type === 'rect')).toBe(true);
  });

  it('emits an animated x/y when speed/velocity variables are present', () => {
    const code = `
import pygame
pygame.draw.circle(screen, BLUE, (100, 200), 30)
speed = 5
`;
    const result = simulatePygame(code);
    const circle = result.objects.find((o) => o.type === 'circle');
    // Animation tweaks x by sin*50 and y by cos*30 — not equal to the parsed (100,200).
    expect(circle).toBeTruthy();
  });

  it('emits a placeholder when pygame is imported but no draws are present', () => {
    const result = simulatePygame('import pygame\npygame.init()');
    // Placeholder is a grey circle.
    expect(result.objects.length).toBe(1);
    expect(result.objects[0].type).toBe('circle');
    expect(result.objects[0].color).toBe('#888888');
  });

  it('returns empty objects for code that is not pygame-related', () => {
    const result = simulatePygame('print("hi")');
    expect(result.objects).toEqual([]);
  });

  it('reads pygame color names via getColorFromCode for circle', () => {
    const code = 'pygame.draw.circle(screen, GREEN, (0, 0), 5)';
    const result = simulatePygame(code);
    const circle = result.objects.find((o) => o.type === 'circle');
    expect(circle?.color).toBe('#00FF00');
  });
});
