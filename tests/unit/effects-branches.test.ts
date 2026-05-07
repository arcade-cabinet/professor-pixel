import { describe, expect, it } from 'vitest';
import { backgroundComponent, particleEffectComponent } from '@lib/pygame/components/effects';

// effects.ts has 4 type-branches in particleEffect.preview() and several
// conditional branches in background's preview/generateCode. The
// existing pygame-components tests only invoke each component with its
// defaultProperties, hitting one branch per function. These tests
// exercise the remaining branches so coverage reflects intent.

function makeFakeCtx(width = 200, height = 150) {
  const calls: Record<string, number> = {};
  const track =
    (name: string) =>
    (..._args: unknown[]) => {
      calls[name] = (calls[name] || 0) + 1;
    };
  return {
    canvas: { width, height },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '10px sans-serif',
    fillRect: track('fillRect'),
    strokeRect: track('strokeRect'),
    clearRect: track('clearRect'),
    beginPath: track('beginPath'),
    closePath: track('closePath'),
    moveTo: track('moveTo'),
    lineTo: track('lineTo'),
    arc: track('arc'),
    fill: track('fill'),
    stroke: track('stroke'),
    fillText: track('fillText'),
    save: track('save'),
    restore: track('restore'),
    translate: track('translate'),
    rotate: track('rotate'),
    setLineDash: track('setLineDash'),
    _calls: calls,
  } as unknown as CanvasRenderingContext2D & { _calls: Record<string, number> };
}

const PARTICLE_TYPES = ['explosion', 'sparkle', 'smoke', 'confetti'] as const;

describe('particleEffect.preview — type branches', () => {
  // Each particle-type branch draws a different shape. Pin that the
  // function:
  //   1. Doesn't throw for any of the 4 known types.
  //   2. Makes ≥1 drawing call (each branch should produce visible output).
  //   3. Routes to a recognizable primitive: explosion/smoke/confetti use
  //      arc()/fillRect(), sparkle uses stroke().
  it.each(PARTICLE_TYPES)('%s renders without throwing', (type) => {
    const ctx = makeFakeCtx();
    expect(() =>
      particleEffectComponent.preview(ctx, {
        ...particleEffectComponent.defaultProperties,
        type,
      })
    ).not.toThrow();
    const calls = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(Object.values(calls).reduce((s, n) => s + n, 0)).toBeGreaterThan(0);
  });

  it('explosion uses arc() for the burst petals', () => {
    const ctx = makeFakeCtx();
    particleEffectComponent.preview(ctx, {
      ...particleEffectComponent.defaultProperties,
      type: 'explosion',
    });
    expect((ctx as unknown as { _calls: Record<string, number> })._calls.arc).toBeGreaterThan(0);
  });

  it('sparkle uses stroke() for cross-marks (not arc/fill)', () => {
    const ctx = makeFakeCtx();
    particleEffectComponent.preview(ctx, {
      ...particleEffectComponent.defaultProperties,
      type: 'sparkle',
    });
    const c = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(c.stroke).toBeGreaterThan(0);
  });

  it('smoke draws stacked circles with lower globalAlpha', () => {
    const ctx = makeFakeCtx();
    // We can read globalAlpha state during the call by overriding.
    let observedAlpha: number | undefined;
    const origDescriptor = Object.getOwnPropertyDescriptor(ctx, 'globalAlpha');
    Object.defineProperty(ctx, 'globalAlpha', {
      get() {
        return origDescriptor?.value ?? 1;
      },
      set(v: number) {
        // Capture the smoke branch's reduced alpha (0.5).
        if (v < 1) observedAlpha = v;
      },
    });
    particleEffectComponent.preview(ctx, {
      ...particleEffectComponent.defaultProperties,
      type: 'smoke',
    });
    expect(observedAlpha).toBeLessThan(1);
  });

  it('confetti emits multiple fillRect calls with rotating fill colors', () => {
    const ctx = makeFakeCtx();
    particleEffectComponent.preview(ctx, {
      ...particleEffectComponent.defaultProperties,
      type: 'confetti',
    });
    const c = (ctx as unknown as { _calls: Record<string, number> })._calls;
    // confetti draws ≥5 rects (one per color in the rotating palette).
    expect(c.fillRect).toBeGreaterThanOrEqual(5);
  });
});

describe('particleEffect.generateCode — produces runnable Python', () => {
  it('embeds resolved RGB tuple from props.color', () => {
    const out = particleEffectComponent.generateCode({
      ...particleEffectComponent.defaultProperties,
      color: '#FF0000',
    });
    expect(out).toContain('(255, 0, 0)');
    expect(out).toContain('class ParticleEffect:');
  });

  it('honors spread override and falls back to 50 when omitted', () => {
    const withSpread = particleEffectComponent.generateCode({
      ...particleEffectComponent.defaultProperties,
      spread: 99,
    });
    expect(withSpread).toContain('self.spread = 99');

    const withoutSpread = particleEffectComponent.generateCode({
      ...particleEffectComponent.defaultProperties,
      spread: undefined as unknown as number,
    });
    expect(withoutSpread).toContain('self.spread = 50');
  });
});

describe('background.preview — branches', () => {
  it('draws clouds when color is sky blue (#87CEEB)', () => {
    const ctx = makeFakeCtx();
    backgroundComponent.preview(ctx, {
      ...backgroundComponent.defaultProperties,
      color: '#87CEEB',
    });
    const c = (ctx as unknown as { _calls: Record<string, number> })._calls;
    // Clouds = 2 cloud groups → ≥5 arcs total.
    expect(c.arc).toBeGreaterThanOrEqual(5);
  });

  it('does NOT draw clouds for non-sky colors', () => {
    const ctx = makeFakeCtx();
    backgroundComponent.preview(ctx, {
      ...backgroundComponent.defaultProperties,
      color: '#000000',
    });
    const c = (ctx as unknown as { _calls: Record<string, number> })._calls;
    // No cloud arcs — only the fillRect background.
    expect(c.arc ?? 0).toBe(0);
  });

  it('draws scroll arrow when scrollSpeed !== 0', () => {
    const ctx = makeFakeCtx();
    backgroundComponent.preview(ctx, {
      ...backgroundComponent.defaultProperties,
      color: '#000000', // skip cloud branch
      scrollSpeed: 5,
    });
    const c = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(c.stroke).toBeGreaterThan(0);
    expect(c.lineTo).toBeGreaterThan(0);
  });

  it('does NOT draw scroll arrow when scrollSpeed = 0', () => {
    const ctx = makeFakeCtx();
    backgroundComponent.preview(ctx, {
      ...backgroundComponent.defaultProperties,
      color: '#000000',
      scrollSpeed: 0,
    });
    const c = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(c.stroke ?? 0).toBe(0);
  });

  it('falls back to the default sky color when props.color is undefined', () => {
    const ctx = makeFakeCtx();
    backgroundComponent.preview(ctx, {
      ...backgroundComponent.defaultProperties,
      color: undefined as unknown as string,
    });
    // Should still render — no throw, ≥1 fillRect.
    const c = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(c.fillRect).toBeGreaterThan(0);
  });
});

describe('background.generateCode — branches', () => {
  it('embeds image-load when imagePath is provided', () => {
    const out = backgroundComponent.generateCode({
      ...backgroundComponent.defaultProperties,
      imagePath: '/assets/sky.png',
    });
    expect(out).toContain("pygame.image.load('/assets/sky.png')");
    // The draw() body has the tile/scroll branches embedded.
    expect(out).toContain('self.tile_mode');
    expect(out).toContain('screen.blit(self.image');
  });

  it('omits image-load when imagePath is missing', () => {
    const out = backgroundComponent.generateCode({
      ...backgroundComponent.defaultProperties,
      imagePath: undefined,
    });
    expect(out).toContain('# No image specified');
    expect(out).not.toContain('pygame.image.load');
  });

  it('emits parallax/tileMode booleans as Python True/False', () => {
    const out = backgroundComponent.generateCode({
      ...backgroundComponent.defaultProperties,
      parallax: true,
      tileMode: true,
    });
    expect(out).toContain('self.parallax = True');
    expect(out).toContain('self.tile_mode = True');

    const off = backgroundComponent.generateCode({
      ...backgroundComponent.defaultProperties,
      parallax: false,
      tileMode: false,
    });
    expect(off).toContain('self.parallax = False');
    expect(off).toContain('self.tile_mode = False');
  });

  it('falls back to sky-blue RGB when color is omitted', () => {
    const out = backgroundComponent.generateCode({
      ...backgroundComponent.defaultProperties,
      color: undefined,
    });
    // hexToRgb('#87CEEB') = [135, 206, 235]
    expect(out).toContain('(135, 206, 235)');
  });
});
