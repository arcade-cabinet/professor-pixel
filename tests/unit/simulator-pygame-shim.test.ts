// Cover the pygameShim module surface in src/pygame/runtime/simulator.ts:
//   - PygameRect helpers: colliderect, contains([x,y]), contains(rect),
//     move, inflate (lines 195-223)
//   - PygameSound: play / stop / set_volume / get_volume (lines 235-246)
//   - PygameClock: tick, get_fps, get_time (lines 254-273)
//   - PygameSurface fill/blit when not the main surface (line 141 false branch)
//   - pygameShim.time.{Clock, get_ticks, wait}
//   - pygameShim.font.{init, Font, get_default_font}
//   - pygameShim.image.load
//   - pygameShim.mixer.{init, quit, Sound, music.*}
//   - pygameShim.draw.{line, polygon}
//   - pygameShim.event.{get, pump, Event}
//   - pygameShim.key.{get_pressed, get_focused}
//   - pygameShim.transform.{scale, rotate, flip}
//   - pygameShim.{Color, Rect}
//
// All of these are pure JS — driving them populates the simulator's
// frameBuffer / state, which we read back via the existing
// getFrameBuffer / getCurrentFPS exports.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  pygameShim,
  resetPygameState,
  setCanvasContext,
  getFrameBuffer,
  flushFrameBuffer,
  getCurrentFPS,
} from '@lib/pygame/runtime/simulator';

beforeEach(() => {
  resetPygameState();
  // Stage a minimal canvas context so isRenderingActive flips true and
  // the draw.* calls actually push DrawCommands into the frame buffer.
  setCanvasContext({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    drawImage: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  setCanvasContext(null);
  vi.restoreAllMocks();
});

describe('pygameShim — Rect helpers', () => {
  it('colliderect detects overlap and disjoint rects', () => {
    const a = pygameShim.Rect(0, 0, 10, 10);
    const b = pygameShim.Rect(5, 5, 10, 10);
    const c = pygameShim.Rect(20, 20, 10, 10);
    expect(a.colliderect(b)).toBe(true);
    expect(a.colliderect(c)).toBe(false);
  });

  it('contains([x,y]) detects point-in-rect', () => {
    const r = pygameShim.Rect(0, 0, 10, 10);
    expect(r.contains([5, 5])).toBe(true);
    expect(r.contains([100, 100])).toBe(false);
    // edge case — left/top inclusive, right/bottom exclusive.
    expect(r.contains([0, 0])).toBe(true);
    expect(r.contains([10, 10])).toBe(false);
  });

  it('contains(rect) detects fully-enclosed rect', () => {
    const big = pygameShim.Rect(0, 0, 100, 100);
    const small = pygameShim.Rect(10, 10, 20, 20);
    const overlap = pygameShim.Rect(80, 80, 50, 50);
    expect(big.contains(small)).toBe(true);
    expect(big.contains(overlap)).toBe(false);
  });

  it('move returns a new translated rect (immutable)', () => {
    const r = pygameShim.Rect(0, 0, 10, 10);
    const moved = r.move(5, 7);
    expect(moved.x).toBe(5);
    expect(moved.y).toBe(7);
    expect(r.x).toBe(0); // original untouched
  });

  it('inflate grows the rect symmetrically about its center', () => {
    const r = pygameShim.Rect(10, 10, 20, 20);
    const inflated = r.inflate(10, 10);
    expect(inflated.x).toBe(5);
    expect(inflated.y).toBe(5);
    expect(inflated.width).toBe(30);
    expect(inflated.height).toBe(30);
  });
});

describe('pygameShim — Sound (mixer.Sound) wrapper', () => {
  it('play/stop log without throwing', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const s = pygameShim.mixer.Sound('beep.wav');
    expect(() => s.play()).not.toThrow();
    expect(() => s.stop()).not.toThrow();
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('set_volume clamps to [0, 1] and get_volume reflects it', () => {
    const s = pygameShim.mixer.Sound('beep.wav');
    s.set_volume(0.5);
    expect(s.get_volume()).toBe(0.5);
    s.set_volume(2);
    expect(s.get_volume()).toBe(1);
    s.set_volume(-1);
    expect(s.get_volume()).toBe(0);
  });
});

describe('pygameShim — Clock', () => {
  it('tick paces FPS reporting; get_time returns elapsed since last tick', () => {
    const clock = pygameShim.time.Clock();
    clock.tick(60);
    // After tick, currentFPS gets recomputed; getCurrentFPS returns the
    // last value. Just confirm it's a positive integer.
    const fps = getCurrentFPS();
    expect(typeof fps).toBe('number');
    expect(fps).toBeGreaterThanOrEqual(0);
    // get_time should also be a number (delta since last tick).
    expect(typeof clock.get_time()).toBe('number');
    // get_fps returns the latest currentFPS read.
    expect(typeof clock.get_fps()).toBe('number');
  });
});

describe('pygameShim — font / time / display modules', () => {
  it('font.init returns true; Font(name, size) constructs; default-font name is Arial', () => {
    expect(pygameShim.font.init()).toBe(true);
    expect(typeof pygameShim.font.Font('Arial', 24)).toBe('object');
    expect(pygameShim.font.get_default_font()).toBe('Arial');
  });

  it('time.get_ticks returns a positive number; time.wait logs without blocking', () => {
    expect(typeof pygameShim.time.get_ticks()).toBe('number');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => pygameShim.time.wait(50)).not.toThrow();
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('display.set_caption + get_surface return without throwing', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => pygameShim.display.set_caption('My Game')).not.toThrow();
    expect(typeof pygameShim.display.get_surface()).toBe('object');
    logSpy.mockRestore();
  });

  it('display.flip + display.update flush the framebuffer', () => {
    const surface = pygameShim.display.set_mode([400, 300]);
    pygameShim.draw.circle(surface, [255, 0, 0], [10, 10], 5);
    expect(getFrameBuffer().length).toBeGreaterThan(0);
    pygameShim.display.flip();
    expect(getFrameBuffer().length).toBe(0);
    // Same with update().
    pygameShim.draw.circle(surface, [0, 255, 0], [20, 20], 5);
    pygameShim.display.update();
    expect(getFrameBuffer().length).toBe(0);
  });
});

describe('pygameShim — image / mixer / event / key / transform modules', () => {
  it('image.load returns a placeholder RenderingSurface and logs', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const surf = pygameShim.image.load('hero.png');
    expect(surf.get_width()).toBe(64);
    expect(surf.get_height()).toBe(64);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('mixer.init returns true; mixer.quit logs', () => {
    expect(pygameShim.mixer.init()).toBe(true);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => pygameShim.mixer.quit()).not.toThrow();
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('mixer.music.{load, play, stop, set_volume} all log without throwing', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    pygameShim.mixer.music.load('theme.ogg');
    pygameShim.mixer.music.play(0);
    pygameShim.mixer.music.stop();
    pygameShim.mixer.music.set_volume(0.5);
    expect(logSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    logSpy.mockRestore();
  });

  it('event.get returns empty array; pump is a no-op; Event spreads its dict', () => {
    expect(pygameShim.event.get()).toEqual([]);
    expect(() => pygameShim.event.pump()).not.toThrow();
    const ev = pygameShim.event.Event(2, { key: 'Space' });
    expect(ev.type).toBe(2);
    expect((ev as { key?: string }).key).toBe('Space');
  });

  it('key.get_pressed returns a 512-length false array; get_focused returns true', () => {
    const pressed = pygameShim.key.get_pressed();
    expect(pressed).toHaveLength(512);
    expect(pressed.every((v: boolean) => v === false)).toBe(true);
    expect(pygameShim.key.get_focused()).toBe(true);
  });

  it('transform.scale/rotate/flip return a surface (placeholder semantics)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const surface = pygameShim.display.set_mode([100, 100]);
    expect(typeof pygameShim.transform.scale(surface, [50, 50])).toBe('object');
    expect(typeof pygameShim.transform.rotate(surface, 90)).toBe('object');
    expect(typeof pygameShim.transform.flip(surface, true, false)).toBe('object');
    logSpy.mockRestore();
  });
});

describe('pygameShim — draw module (line, polygon)', () => {
  it('draw.line pushes a line DrawCommand on the main surface', () => {
    const surface = pygameShim.display.set_mode([400, 300]);
    pygameShim.draw.line(surface, [0, 0, 0], [0, 0], [100, 100], 2);
    const cmds = getFrameBuffer();
    expect(cmds.some((c) => c.type === 'line')).toBe(true);
  });

  it('draw.polygon emits one line per edge (closed polygon)', () => {
    const surface = pygameShim.display.set_mode([400, 300]);
    flushFrameBuffer(); // clear any pending commands
    pygameShim.draw.polygon(
      surface,
      [255, 0, 0],
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]
    );
    const cmds = getFrameBuffer();
    // 4 edges → 4 line commands.
    const lineCmds = cmds.filter((c) => c.type === 'line');
    expect(lineCmds.length).toBeGreaterThanOrEqual(4);
  });

  it('draw on a non-main surface does NOT emit framebuffer commands', () => {
    flushFrameBuffer();
    const offscreen = pygameShim.transform.scale(pygameShim.display.set_mode([100, 100]), [50, 50]);
    flushFrameBuffer(); // wipe set_mode's clear
    pygameShim.draw.circle(offscreen, [255, 0, 0], [10, 10], 5);
    // Off-main draws are no-ops; framebuffer stays empty.
    expect(getFrameBuffer().length).toBe(0);
  });

  it('draw.rect with object-style rect arg uses x/y/width/height fields', () => {
    const surface = pygameShim.display.set_mode([400, 300]);
    flushFrameBuffer();
    pygameShim.draw.rect(surface, [0, 255, 0], { x: 5, y: 7, width: 20, height: 30 });
    const cmds = getFrameBuffer();
    const rectCmd = cmds.find((c) => c.type === 'rect');
    expect(rectCmd).toBeDefined();
    // args = [color, x, y, width, height]
    expect(rectCmd?.args[1]).toBe(5);
    expect(rectCmd?.args[2]).toBe(7);
    expect(rectCmd?.args[3]).toBe(20);
    expect(rectCmd?.args[4]).toBe(30);
  });
});

describe('pygameShim — Color constants', () => {
  it('exposes the standard 8 named colors as RGB triples', () => {
    expect(pygameShim.Color.RED).toEqual([255, 0, 0]);
    expect(pygameShim.Color.GREEN).toEqual([0, 255, 0]);
    expect(pygameShim.Color.BLUE).toEqual([0, 0, 255]);
    expect(pygameShim.Color.WHITE).toEqual([255, 255, 255]);
    expect(pygameShim.Color.BLACK).toEqual([0, 0, 0]);
    expect(pygameShim.Color.YELLOW).toEqual([255, 255, 0]);
    expect(pygameShim.Color.CYAN).toEqual([0, 255, 255]);
    expect(pygameShim.Color.MAGENTA).toEqual([255, 0, 255]);
  });
});

describe('pygameShim — quit + init', () => {
  it('init returns true; quit clears the canvas + framebuffer', () => {
    expect(pygameShim.init()).toBe(true);
    const surface = pygameShim.display.set_mode([100, 100]);
    pygameShim.draw.circle(surface, [255, 0, 0], [10, 10], 5);
    expect(getFrameBuffer().length).toBeGreaterThan(0);
    pygameShim.quit();
    expect(getFrameBuffer().length).toBe(0);
  });
});
