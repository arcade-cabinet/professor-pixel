// Cover the createPygameEnvironment exports in src/pygame/runtime/simulator.ts.
// This is a separate surface from `pygameShim` (the Pyodide-injected one)
// — used as a JS-only sandbox harness. We drive each module's methods.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPygameEnvironment,
  resetPygameState,
  setCanvasContext,
  getFrameBuffer,
  flushFrameBuffer,
} from '@lib/pygame/runtime/simulator';

beforeEach(() => {
  resetPygameState();
  setCanvasContext({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    closePath: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    drawImage: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  setCanvasContext(null);
  vi.restoreAllMocks();
});

describe('createPygameEnvironment — top-level pygame object', () => {
  it('init/quit log + the locals constants are spread onto the root', () => {
    const pygame = createPygameEnvironment();
    expect(() => pygame.init()).not.toThrow();
    expect(() => pygame.quit()).not.toThrow();
    // Spreading pygame.locals onto pygame itself means QUIT/KEYDOWN/etc.
    // are accessible at the root.
    const root = pygame as unknown as Record<string, unknown>;
    expect(root.QUIT).toBe(12);
    expect(root.KEYDOWN).toBe(2);
    expect(root.K_LEFT).toBeTypeOf('number');
  });
});

describe('createPygameEnvironment — display module', () => {
  it('set_mode returns a main RenderingSurface; flip + update flush', () => {
    const pygame = createPygameEnvironment();
    const surface = pygame.display.set_mode([100, 80]);
    pygame.draw.circle(surface, [255, 0, 0], [10, 10], 5);
    expect(getFrameBuffer().length).toBeGreaterThan(0);
    pygame.display.flip();
    expect(getFrameBuffer().length).toBe(0);
    pygame.draw.rect(surface, [0, 255, 0], [0, 0, 5, 5]);
    pygame.display.update();
    expect(getFrameBuffer().length).toBe(0);
  });

  it('set_caption logs without throwing', () => {
    const pygame = createPygameEnvironment();
    expect(() => pygame.display.set_caption('Game')).not.toThrow();
  });
});

describe('createPygameEnvironment — draw module', () => {
  it('rect with object-style rect arg uses x/y/width/height fields', () => {
    const pygame = createPygameEnvironment();
    const surface = pygame.display.set_mode([200, 200]);
    flushFrameBuffer();
    // create a Rect via the constructor from pygameShim's Rect class:
    const PygameRectCtor = pygame.Rect as unknown as new (
      x: number,
      y: number,
      w: number,
      h: number
    ) => unknown;
    const rectArg = new PygameRectCtor(3, 7, 11, 13);
    // The simulator's draw.rect accepts both tuple-style and PygameRect-shape
    // — we go through the unknown cast to avoid a strict-class TS check on
    // the ad-hoc shape that fakeable classes don't satisfy.
    pygame.draw.rect(
      surface,
      [255, 255, 0],
      rectArg as Parameters<typeof pygame.draw.rect>[2]
    );
    const cmd = getFrameBuffer().find((c) => c.type === 'rect');
    expect(cmd?.args[1]).toBe(3);
    expect(cmd?.args[2]).toBe(7);
    expect(cmd?.args[3]).toBe(11);
    expect(cmd?.args[4]).toBe(13);
  });

  it('line + polygon emit DrawCommands on the main surface', () => {
    const pygame = createPygameEnvironment();
    const surface = pygame.display.set_mode([200, 200]);
    flushFrameBuffer();
    pygame.draw.line(surface, [0, 0, 0], [0, 0], [50, 50], 2);
    pygame.draw.polygon(surface, [255, 0, 0], [
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    const cmds = getFrameBuffer();
    expect(cmds.some((c) => c.type === 'line')).toBe(true);
    expect(cmds.some((c) => c.type === 'polygon')).toBe(true);
  });

  it('ellipse emits an ellipse DrawCommand', () => {
    const pygame = createPygameEnvironment();
    const surface = pygame.display.set_mode([200, 200]);
    flushFrameBuffer();
    pygame.draw.ellipse(surface, [128, 128, 128], [5, 7, 30, 20]);
    const cmd = getFrameBuffer().find((c) => c.type === 'ellipse');
    expect(cmd).toBeDefined();
    expect(cmd?.args[1]).toBe(5);
    expect(cmd?.args[2]).toBe(7);
  });

  it('off-main draw does NOT emit any commands', () => {
    const pygame = createPygameEnvironment();
    flushFrameBuffer();
    // pygame.transform.scale returns a non-main surface.
    const main = pygame.display.set_mode([100, 100]);
    flushFrameBuffer();
    const offMain = pygame.transform.scale(main, [50, 50]);
    pygame.draw.circle(offMain, [255, 0, 0], [5, 5], 3);
    pygame.draw.rect(offMain, [255, 0, 0], [0, 0, 5, 5]);
    pygame.draw.line(offMain, [255, 0, 0], [0, 0], [5, 5], 1);
    pygame.draw.polygon(offMain, [255, 0, 0], [
      [0, 0],
      [5, 5],
    ]);
    pygame.draw.ellipse(offMain, [255, 0, 0], [0, 0, 5, 5]);
    expect(getFrameBuffer().length).toBe(0);
  });
});

describe('createPygameEnvironment — font / image / transform / mixer modules', () => {
  it('font.SysFont constructs a PygameFont and Font is a class', () => {
    const pygame = createPygameEnvironment();
    const f = pygame.font.SysFont(null, 16);
    expect(typeof f).toBe('object');
    // Font is the class itself (not a constructor function call).
    const FontClass = pygame.font.Font as unknown as new (n: string, s: number) => unknown;
    expect(typeof new FontClass('Arial', 24)).toBe('object');
  });

  it('PygameFont.render emits a text DrawCommand and returns a sized surface', () => {
    const pygame = createPygameEnvironment();
    flushFrameBuffer();
    const FontClass = pygame.font.Font as unknown as new (
      name: string | null,
      size: number
    ) => { render: (text: string) => { width: number; height: number } };
    const font = new FontClass(null, 20);
    const surface = font.render('hi');
    expect(surface.width).toBeGreaterThan(0);
    expect(surface.height).toBeGreaterThan(0);
    expect(getFrameBuffer().some((c) => c.type === 'text')).toBe(true);
  });

  it('PygameFont.size_text returns approximate text dimensions', () => {
    const pygame = createPygameEnvironment();
    const FontClass = pygame.font.Font as unknown as new (
      name: string | null,
      size: number
    ) => { size_text: (text: string) => [number, number] };
    const font = new FontClass(null, 20);
    const dims = font.size_text('hello');
    expect(dims[0]).toBeGreaterThan(0);
    expect(dims[1]).toBeGreaterThan(0);
  });

  it('image.load + image.save log without throwing', () => {
    const pygame = createPygameEnvironment();
    expect(typeof pygame.image.load('hero.png')).toBe('object');
    expect(() => pygame.image.save({} as never, 'out.png')).not.toThrow();
  });

  it('transform.rotate + flip return surface objects (placeholder semantics)', () => {
    const pygame = createPygameEnvironment();
    const surf = pygame.display.set_mode([100, 100]);
    expect(typeof pygame.transform.rotate(surf, 45)).toBe('object');
    expect(typeof pygame.transform.flip(surf, true, false)).toBe('object');
  });

  it('mixer.init/quit + mixer.music.{load, play, stop, set_volume} log', () => {
    const pygame = createPygameEnvironment();
    expect(() => pygame.mixer.init()).not.toThrow();
    expect(() => pygame.mixer.quit()).not.toThrow();
    pygame.mixer.music.load('theme.ogg');
    pygame.mixer.music.play(2);
    pygame.mixer.music.stop();
    pygame.mixer.music.set_volume(0.5);
  });
});

describe('createPygameEnvironment — sprite Sprite + Group', () => {
  it('Group.add / .remove / .empty / .update / .draw cycle works', () => {
    const pygame = createPygameEnvironment();
    const SpriteClass = pygame.sprite.Sprite as unknown as new () => {
      image: unknown;
      rect: { x: number; y: number } | null;
      update: () => void;
      kill: () => void;
    };
    const GroupClass = pygame.sprite.Group as unknown as new () => {
      add: (s: unknown) => void;
      remove: (s: unknown) => void;
      empty: () => void;
      update: () => void;
      draw: (s: unknown) => void;
      sprites: unknown[];
    };
    const main = pygame.display.set_mode([100, 100]);
    flushFrameBuffer();
    const group = new GroupClass();
    const a = new SpriteClass();
    a.image = pygame.image.load('a.png');
    a.rect = { x: 10, y: 20 };
    const b = new SpriteClass();
    group.add(a);
    group.add(b);
    expect(group.sprites).toHaveLength(2);
    // update calls .update() on each sprite.
    expect(() => group.update()).not.toThrow();
    // draw blits each sprite that has both image + rect — `a` does, `b` doesn't.
    group.draw(main);
    // The blit() call on the main surface pushes a 'blit' DrawCommand.
    const blits = getFrameBuffer().filter((c) => c.type === 'blit');
    expect(blits.length).toBeGreaterThanOrEqual(1);
    // remove(a) drops it back to 1.
    group.remove(a);
    expect(group.sprites).toHaveLength(1);
    // empty wipes the rest.
    group.empty();
    expect(group.sprites).toHaveLength(0);
  });
});

describe('createPygameEnvironment — random helpers', () => {
  it('randint returns an integer in [min, max]', () => {
    const pygame = createPygameEnvironment();
    const r = pygame.random.randint(1, 5);
    expect(r).toBeGreaterThanOrEqual(1);
    expect(r).toBeLessThanOrEqual(5);
    expect(Number.isInteger(r)).toBe(true);
  });

  it('random returns a float in [0, 1)', () => {
    const pygame = createPygameEnvironment();
    const f = pygame.random.random();
    expect(f).toBeGreaterThanOrEqual(0);
    expect(f).toBeLessThan(1);
  });

  it('choice returns an element of the array', () => {
    const pygame = createPygameEnvironment();
    const arr = ['a', 'b', 'c'];
    const c = pygame.random.choice(arr);
    expect(arr).toContain(c);
  });

  it('shuffle returns the array (mutated in place)', () => {
    const pygame = createPygameEnvironment();
    const arr = [1, 2, 3, 4, 5];
    const shuffled = pygame.random.shuffle(arr);
    // Shape preserved.
    expect((shuffled as number[])).toHaveLength(5);
    // Same set of elements (Fisher–Yates is in-place).
    expect((shuffled as number[]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('createPygameEnvironment — event / key / time modules', () => {
  it('event.get returns []; event.poll returns null; event.Event spreads dict', () => {
    const pygame = createPygameEnvironment();
    expect(pygame.event.get()).toEqual([]);
    expect(pygame.event.poll()).toBeNull();
    const ev = pygame.event.Event(2, { key: 'A' });
    expect(ev.type).toBe(2);
    expect((ev as { key?: string }).key).toBe('A');
  });

  it('key.get_pressed → 512-length false array; key.name returns Key{n}', () => {
    const pygame = createPygameEnvironment();
    expect(pygame.key.get_pressed()).toHaveLength(512);
    expect(pygame.key.name(42)).toBe('Key42');
  });

  it('time.Clock + time.get_ticks return usable values', () => {
    const pygame = createPygameEnvironment();
    const ClockClass = pygame.time.Clock as unknown as new () => { tick: (fps?: number) => number };
    const c = new ClockClass();
    expect(typeof c.tick(60)).toBe('number');
    expect(typeof pygame.time.get_ticks()).toBe('number');
  });
});

describe('createPygameEnvironment — Color + Surface + Rect constructors', () => {
  it('Color() returns [r,g,b,a] with default alpha 255', () => {
    const pygame = createPygameEnvironment();
    expect(pygame.Color(10, 20, 30)).toEqual([10, 20, 30, 255]);
    expect(pygame.Color(10, 20, 30, 128)).toEqual([10, 20, 30, 128]);
  });

  it('Surface is a class that constructs a non-main RenderingSurface', () => {
    const pygame = createPygameEnvironment();
    const SurfaceClass = pygame.Surface as unknown as new (
      w: number,
      h: number
    ) => { get_width: () => number; get_height: () => number };
    const s = new SurfaceClass(64, 48);
    expect(s.get_width()).toBe(64);
    expect(s.get_height()).toBe(48);
  });
});
