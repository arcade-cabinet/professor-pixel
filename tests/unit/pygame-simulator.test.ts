import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createPygameEnvironment,
  flushFrameBuffer,
  getCurrentFPS,
  getFrameBuffer,
  resetPygameState,
  setCanvasContext,
} from '@lib/pygame/runtime/simulator';
import {
  controlledTime,
  createFakeCanvasContext,
  type ControlledClock,
  type FakeCanvasContext,
} from '../helpers/simulator-harness';

describe('pygame simulator (deterministic harness)', () => {
  let canvas: FakeCanvasContext;
  let clock: ControlledClock;

  beforeEach(() => {
    canvas = createFakeCanvasContext();
    clock = controlledTime(0);
    clock.install();
    setCanvasContext(canvas.ctx);
    resetPygameState();
  });

  afterEach(() => {
    setCanvasContext(null);
    resetPygameState();
    clock.uninstall();
  });

  it('pygame.draw.circle on the main surface enqueues a circle DrawCommand', () => {
    const pygame = createPygameEnvironment();
    const surface = pygame.display.set_mode([800, 600]);

    pygame.draw.circle(surface, [255, 0, 0], [10, 20], 5);

    const buf = getFrameBuffer();
    expect(buf).toHaveLength(1);
    expect(buf[0].type).toBe('circle');
    expect(buf[0].args).toEqual(['rgb(255, 0, 0)', 10, 20, 5]);
  });

  it('flushFrameBuffer plays the circle command through to the canvas context', () => {
    const pygame = createPygameEnvironment();
    const surface = pygame.display.set_mode([800, 600]);

    pygame.draw.circle(surface, [255, 0, 0], [10, 20], 5);
    flushFrameBuffer();

    const ledger = canvas.getLedger();
    // Expected ordered ops: set fillStyle → beginPath → arc → fill.
    const types = ledger.map((c) => c.type);
    expect(types).toContain('set:fillStyle');
    expect(types).toContain('beginPath');
    expect(types).toContain('arc');
    expect(types).toContain('fill');

    const fillStyleEntry = ledger.find((c) => c.type === 'set:fillStyle');
    expect(fillStyleEntry?.args[0]).toBe('rgb(255, 0, 0)');

    const arcEntry = ledger.find((c) => c.type === 'arc');
    expect(arcEntry?.args.slice(0, 3)).toEqual([10, 20, 5]);
  });

  it('rect command flushes through to fillRect with the right geometry', () => {
    const pygame = createPygameEnvironment();
    const surface = pygame.display.set_mode([800, 600]);

    pygame.draw.rect(surface, [0, 128, 255], [10, 20, 30, 40]);
    flushFrameBuffer();

    const ledger = canvas.getLedger();
    const fillRect = ledger.find((c) => c.type === 'fillRect');
    expect(fillRect).toBeDefined();
    expect(fillRect?.args).toEqual([10, 20, 30, 40]);
    const fillStyle = ledger.find((c) => c.type === 'set:fillStyle');
    expect(fillStyle?.args[0]).toBe('rgb(0, 128, 255)');
  });

  it('Clock.tick paced at 16ms per frame yields getCurrentFPS in the 55–65 band (M4.2)', () => {
    const pygame = createPygameEnvironment();
    const Clock = pygame.time.Clock as unknown as new () => {
      tick: (fps?: number) => number;
      get_fps: () => number;
    };
    const clk = new Clock();

    // Warm-up tick so deltaTime is non-zero on the first measured frame.
    clk.tick(60);
    clock.advance(16);

    // Pace 10 frames at exactly 16ms → 1000/16 = 62.5 FPS. Round() lands at 63.
    for (let i = 0; i < 10; i += 1) {
      clk.tick(60);
      clock.advance(16);
    }

    const fps = getCurrentFPS();
    expect(fps).toBeGreaterThanOrEqual(55);
    expect(fps).toBeLessThanOrEqual(65);
  });

  it('Clock.tick paced at 33ms per frame yields ~30 FPS (out of band — sanity check)', () => {
    const pygame = createPygameEnvironment();
    const Clock = pygame.time.Clock as unknown as new () => {
      tick: (fps?: number) => number;
    };
    const clk = new Clock();

    clk.tick(30);
    clock.advance(33);
    for (let i = 0; i < 10; i += 1) {
      clk.tick(30);
      clock.advance(33);
    }

    const fps = getCurrentFPS();
    expect(fps).toBeGreaterThanOrEqual(28);
    expect(fps).toBeLessThanOrEqual(32);
  });
});
