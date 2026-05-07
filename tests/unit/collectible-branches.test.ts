import { describe, expect, it } from 'vitest';
import { collectibleComponent } from '@lib/pygame/components/collectible';

// collectible.preview has 4 type-branches (coin, powerup, key, health).
// The default properties only exercise 'coin'; the registry/components
// test only invokes preview with defaults. Pin each remaining branch
// so a regression that drops a shape is caught.

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
    quadraticCurveTo: track('quadraticCurveTo'),
    bezierCurveTo: track('bezierCurveTo'),
    _calls: calls,
  } as unknown as CanvasRenderingContext2D & { _calls: Record<string, number> };
}

const TYPES = ['coin', 'powerup', 'key', 'health'] as const;

describe('collectible.preview — type branches', () => {
  it.each(TYPES)('%s renders without throwing + makes ≥1 drawing call', (type) => {
    const ctx = makeFakeCtx();
    expect(() =>
      collectibleComponent.preview(ctx, {
        ...collectibleComponent.defaultProperties,
        type,
      })
    ).not.toThrow();
    const calls = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(Object.values(calls).reduce((s, n) => s + n, 0)).toBeGreaterThan(0);
  });

  it('coin: arc + fillText (the $ glyph)', () => {
    const ctx = makeFakeCtx();
    collectibleComponent.preview(ctx, { ...collectibleComponent.defaultProperties, type: 'coin' });
    const c = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(c.arc).toBeGreaterThan(0);
    expect(c.fillText).toBeGreaterThan(0);
  });

  it('powerup: drawStar — emits stroke (cross of the star)', () => {
    const ctx = makeFakeCtx();
    collectibleComponent.preview(ctx, {
      ...collectibleComponent.defaultProperties,
      type: 'powerup',
    });
    const c = (ctx as unknown as { _calls: Record<string, number> })._calls;
    // drawStar uses moveTo + lineTo for each star arm and fills.
    expect(c.fill).toBeGreaterThan(0);
  });

  it('key: fillRect (shaft) + arc (ring)', () => {
    const ctx = makeFakeCtx();
    collectibleComponent.preview(ctx, { ...collectibleComponent.defaultProperties, type: 'key' });
    const c = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(c.fillRect).toBeGreaterThan(0);
    expect(c.arc).toBeGreaterThan(0);
  });

  it('health: drawHeart — emits fill (the closed heart shape)', () => {
    const ctx = makeFakeCtx();
    collectibleComponent.preview(ctx, {
      ...collectibleComponent.defaultProperties,
      type: 'health',
    });
    const c = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(c.fill).toBeGreaterThan(0);
  });

  it('falls back to undefined→coin if props.type is missing', () => {
    // type defaults to 'coin' via the `props.type || 'coin'` guard.
    const ctx = makeFakeCtx();
    collectibleComponent.preview(ctx, {
      ...collectibleComponent.defaultProperties,
      type: undefined as unknown as 'coin',
    });
    const c = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(c.arc).toBeGreaterThan(0);
    expect(c.fillText).toBeGreaterThan(0);
  });
});

describe('collectible.generateCode — props propagate', () => {
  it('embeds resolved RGB tuple from props.color', () => {
    const out = collectibleComponent.generateCode({
      ...collectibleComponent.defaultProperties,
      color: '#FF0000',
    });
    expect(out).toContain('(255, 0, 0)');
    expect(out).toContain('class Collectible:');
  });

  it('respawns=true emits Python True; respawns=false emits False', () => {
    const on = collectibleComponent.generateCode({
      ...collectibleComponent.defaultProperties,
      respawns: true,
    });
    expect(on).toContain('self.respawns = True');

    const off = collectibleComponent.generateCode({
      ...collectibleComponent.defaultProperties,
      respawns: false,
    });
    expect(off).toContain('self.respawns = False');
  });

  it('embeds props.value into self.value', () => {
    const out = collectibleComponent.generateCode({
      ...collectibleComponent.defaultProperties,
      value: 99,
    });
    expect(out).toContain('self.value = 99');
  });

  it('coin draw branch uses pygame.draw.circle; non-coin uses pygame.draw.rect', () => {
    const coin = collectibleComponent.generateCode({
      ...collectibleComponent.defaultProperties,
      type: 'coin',
    });
    expect(coin).toContain("if self.type == 'coin'");
    expect(coin).toContain('pygame.draw.circle');
    expect(coin).toContain('pygame.draw.rect');
  });
});
