// Cover the polygon / ellipse / text / blit cases inside flushFrameBuffer
// (src/pygame/runtime/simulator.ts lines 651-714) plus the line-rendering
// shim variants the existing simulator tests skip. These cases are reached
// by enqueuing DrawCommands of the matching type via the
// createPygameEnvironment() shim's draw.polygon / draw.ellipse / Surface.blit
// (or pygameShim's Font.render for the text command), then calling
// flushFrameBuffer() and verifying the canvasContext mock received the right
// draw calls.
//
// Why createPygameEnvironment instead of pygameShim: pygameShim.draw.polygon
// approximates polygons with line segments, so it never emits a real
// 'polygon' DrawCommand. createPygameEnvironment is the canonical path that
// pushes the real type='polygon' / type='ellipse' commands the flush switch
// branches on.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  pygameShim,
  createPygameEnvironment,
  resetPygameState,
  setCanvasContext,
  flushFrameBuffer,
} from '@lib/pygame/runtime/simulator';

let ctx: {
  fillRect: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  closePath: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  ellipse: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
  arc: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  font: string;
};

beforeEach(() => {
  resetPygameState();
  ctx = {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    ellipse: vi.fn(),
    fillText: vi.fn(),
    arc: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
  };
  setCanvasContext(ctx as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  setCanvasContext(null);
  vi.restoreAllMocks();
});

describe('flushFrameBuffer — polygon case (lines 651-664)', () => {
  it('polygon draws beginPath/moveTo/lineTo*/closePath/fill on the canvas ctx', () => {
    const env = createPygameEnvironment();
    const screen = env.display.set_mode([800, 600]);
    const points: [number, number][] = [
      [10, 10],
      [50, 10],
      [30, 60],
    ];
    env.draw.polygon(screen, [255, 0, 0], points);
    flushFrameBuffer();
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 10);
    expect(ctx.lineTo).toHaveBeenCalledWith(50, 10);
    expect(ctx.lineTo).toHaveBeenCalledWith(30, 60);
    expect(ctx.closePath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillStyle).toMatch(/rgb\(255, 0, 0\)/);
  });

  it('polygon with empty points list short-circuits (no closePath/fill)', () => {
    const env = createPygameEnvironment();
    const screen = env.display.set_mode([800, 600]);
    env.draw.polygon(screen, [0, 255, 0], []);
    flushFrameBuffer();
    // The if (points && points.length > 0) gate at line 653 stops the body.
    expect(ctx.closePath).not.toHaveBeenCalled();
  });
});

describe('flushFrameBuffer — ellipse case (lines 666-687)', () => {
  it('ellipse draws ctx.ellipse() centered + filled', () => {
    const env = createPygameEnvironment();
    const screen = env.display.set_mode([800, 600]);
    env.draw.ellipse(screen, [0, 0, 255], [10, 20, 100, 50]);
    flushFrameBuffer();
    // Center: (10 + 100/2, 20 + 50/2) = (60, 45). Radii: (50, 25).
    expect(ctx.ellipse).toHaveBeenCalledWith(60, 45, 50, 25, 0, 0, 2 * Math.PI);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillStyle).toMatch(/rgb\(0, 0, 255\)/);
  });
});

describe('flushFrameBuffer — text case (lines 689-701)', () => {
  it('Font.render → text command → fillText on flush', () => {
    const font = pygameShim.font.Font(null, 24);
    font.render('hello', false, [255, 255, 255]);
    flushFrameBuffer();
    expect(ctx.fillText).toHaveBeenCalledWith('hello', 0, 0);
    expect(ctx.fillStyle).toMatch(/rgb\(255, 255, 255\)/);
    expect(ctx.font).toContain('24px');
  });
});

describe('flushFrameBuffer — blit case (lines 703-714)', () => {
  it('Surface.blit pushes a blit command + fillRect placeholder on flush', () => {
    const env = createPygameEnvironment();
    const screen = env.display.set_mode([800, 600]);
    const fontSurf = pygameShim.font.Font(null, 16).render('x', false, [0, 0, 0]);
    screen.blit(fontSurf, [25, 30]);
    flushFrameBuffer();
    expect(ctx.fillRect).toHaveBeenCalledWith(25, 30, fontSurf.width, fontSurf.height);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('Surface.blit accepts a PygameRect dest (drives the dest.x/dest.y branch)', () => {
    const env = createPygameEnvironment();
    const screen = env.display.set_mode([800, 600]);
    const src = pygameShim.font.Font(null, 12).render('y', false, [0, 0, 0]);
    const destRect = pygameShim.Rect(40, 50, 0, 0);
    screen.blit(src, destRect);
    flushFrameBuffer();
    expect(ctx.fillRect).toHaveBeenCalledWith(40, 50, src.width, src.height);
  });
});

describe('flushFrameBuffer — line case via env.draw.line', () => {
  it('line draws beginPath/moveTo/lineTo/stroke', () => {
    const env = createPygameEnvironment();
    const screen = env.display.set_mode([800, 600]);
    env.draw.line(screen, [255, 255, 0], [0, 0], [100, 100], 3);
    flushFrameBuffer();
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 100);
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.lineWidth).toBe(3);
  });
});

describe('flushFrameBuffer — error swallow + frameBuffer drain', () => {
  it('a broken canvas method during flush is caught and frameBuffer is still drained', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const env = createPygameEnvironment();
    const screen = env.display.set_mode([800, 600]);
    env.draw.polygon(
      screen,
      [255, 0, 0],
      [
        [0, 0],
        [10, 10],
      ]
    );
    ctx.beginPath = vi.fn(() => {
      throw new Error('canvas boom');
    });
    flushFrameBuffer();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Pygame rendering error'),
      expect.any(Error)
    );
    // Second flush is a no-op — frameBuffer was drained in the finally.
    ctx.beginPath = vi.fn();
    flushFrameBuffer();
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });
});
