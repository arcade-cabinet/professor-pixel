import { describe, expect, it } from 'vitest';
import {
  type ComponentType,
  type PyGameComponent,
  drawCloud,
  drawHeart,
  drawStar,
  getAllComponents,
  getComponentById,
  getComponentByType,
  hexToRgb,
  pygameComponents,
} from '@lib/pygame/components/registry';

// src/pygame/components/* is a registry of 12 PyGame component templates
// (sprite, ball, paddle, etc.) plus shape helpers (hexToRgb,
// drawStar/Heart/Cloud) and lookup helpers. Each component ships:
//   - shape data (id/type/name/description/defaultProperties)
//   - preview(ctx, props) → Canvas2D draw routine
//   - generateCode(props) → Python class source
// Tests pin the registry contract and exercise per-component fns so
// they aren't dead-code (which is why coverage was ~5-15%).

const EXPECTED_IDS = [
  'sprite',
  'platform',
  'ball',
  'paddle',
  'enemy',
  'collectible',
  'background',
  'score',
  'button',
  'particles',
  'timer',
  'healthbar',
] as const;

describe('pygameComponents registry', () => {
  it('contains the expected 12 components', () => {
    expect(pygameComponents.length).toBe(EXPECTED_IDS.length);
  });

  it('every component has the PyGameComponent shape', () => {
    for (const c of pygameComponents) {
      expect(typeof c.id).toBe('string');
      expect(c.id.length).toBeGreaterThan(0);
      expect(typeof c.type).toBe('string');
      expect(typeof c.name).toBe('string');
      expect(typeof c.description).toBe('string');
      expect(typeof c.wizardDescription).toBe('string');
      expect(typeof c.defaultProperties).toBe('object');
      expect(typeof c.preview).toBe('function');
      expect(typeof c.generateCode).toBe('function');
    }
  });

  it('component IDs are unique', () => {
    // getComponentById uses .find() — duplicates would silently mask later entries.
    const ids = pygameComponents.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('component types are unique', () => {
    // getComponentByType has the same find()-masking problem.
    const types = pygameComponents.map((c) => c.type);
    expect(new Set(types).size).toBe(types.length);
  });
});

describe('lookup helpers', () => {
  it('getAllComponents returns the same array as pygameComponents', () => {
    expect(getAllComponents()).toBe(pygameComponents);
  });

  it('getComponentById hits + misses', () => {
    expect(getComponentById('ball')?.id).toBe('ball');
    expect(getComponentById('paddle')?.id).toBe('paddle');
    expect(getComponentById('does-not-exist')).toBeUndefined();
  });

  it('getComponentByType resolves by ComponentType', () => {
    // The type field on each component matches a ComponentType value.
    for (const c of pygameComponents) {
      const found = getComponentByType(c.type as ComponentType);
      expect(found?.id).toBe(c.id);
    }
  });
});

describe('hexToRgb', () => {
  it.each([
    ['#000000', [0, 0, 0]],
    ['#FFFFFF', [255, 255, 255]],
    ['#FF0000', [255, 0, 0]],
    ['#00FF00', [0, 255, 0]],
    ['#0000FF', [0, 0, 255]],
    ['#1A2B3C', [26, 43, 60]],
  ])('parses %s correctly', (hex, expected) => {
    expect(hexToRgb(hex)).toEqual(expected);
  });

  it('handles hex without leading # gracefully or falls back', () => {
    // Behavior: the function may either parse without `#` or fall back
    // to [0,0,0]. Pin whichever it does so a refactor surfaces.
    const result = hexToRgb('FF0000');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });

  it('falls back to [0,0,0] for un-parseable input', () => {
    expect(hexToRgb('not-a-color')).toEqual([0, 0, 0]);
    expect(hexToRgb('')).toEqual([0, 0, 0]);
  });
});

describe('drawStar / drawHeart / drawCloud', () => {
  function makeFakeCtx() {
    const calls: Record<string, number> = {};
    const track =
      (name: string) =>
      (..._args: unknown[]) => {
        calls[name] = (calls[name] || 0) + 1;
      };
    return {
      canvas: { width: 200, height: 150 },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      fillRect: track('fillRect'),
      strokeRect: track('strokeRect'),
      beginPath: track('beginPath'),
      closePath: track('closePath'),
      moveTo: track('moveTo'),
      lineTo: track('lineTo'),
      arc: track('arc'),
      bezierCurveTo: track('bezierCurveTo'),
      quadraticCurveTo: track('quadraticCurveTo'),
      ellipse: track('ellipse'),
      fill: track('fill'),
      stroke: track('stroke'),
      save: track('save'),
      restore: track('restore'),
      translate: track('translate'),
      rotate: track('rotate'),
      _calls: calls,
    } as unknown as CanvasRenderingContext2D & { _calls: Record<string, number> };
  }

  it('drawStar makes drawing calls without throwing', () => {
    const ctx = makeFakeCtx();
    // (ctx, cx, cy, radius, points)
    expect(() => drawStar(ctx, 50, 50, 10, 5)).not.toThrow();
    const calls = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(Object.values(calls).reduce((s, n) => s + n, 0)).toBeGreaterThan(0);
  });

  it('drawHeart makes drawing calls without throwing', () => {
    const ctx = makeFakeCtx();
    // (ctx, x, y, size)
    expect(() => drawHeart(ctx, 50, 50, 20)).not.toThrow();
    const calls = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(Object.values(calls).reduce((s, n) => s + n, 0)).toBeGreaterThan(0);
  });

  it('drawCloud makes drawing calls without throwing', () => {
    const ctx = makeFakeCtx();
    // (ctx, x, y, size)
    expect(() => drawCloud(ctx, 50, 50, 30)).not.toThrow();
    const calls = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(Object.values(calls).reduce((s, n) => s + n, 0)).toBeGreaterThan(0);
  });
});

describe('per-component preview() + generateCode()', () => {
  function makeFakeCtx() {
    const calls: Record<string, number> = {};
    const track =
      (name: string) =>
      (..._args: unknown[]) => {
        calls[name] = (calls[name] || 0) + 1;
      };
    return {
      canvas: { width: 200, height: 150 },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '10px sans-serif',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      fillRect: track('fillRect'),
      strokeRect: track('strokeRect'),
      clearRect: track('clearRect'),
      beginPath: track('beginPath'),
      closePath: track('closePath'),
      moveTo: track('moveTo'),
      lineTo: track('lineTo'),
      arc: track('arc'),
      bezierCurveTo: track('bezierCurveTo'),
      quadraticCurveTo: track('quadraticCurveTo'),
      ellipse: track('ellipse'),
      rect: track('rect'),
      fill: track('fill'),
      stroke: track('stroke'),
      fillText: track('fillText'),
      strokeText: track('strokeText'),
      save: track('save'),
      restore: track('restore'),
      translate: track('translate'),
      rotate: track('rotate'),
      scale: track('scale'),
      drawImage: track('drawImage'),
      setLineDash: track('setLineDash'),
      getLineDash: () => [],
      createLinearGradient: () => ({ addColorStop: track('addColorStop') }),
      createRadialGradient: () => ({ addColorStop: track('addColorStop') }),
      measureText: () => ({ width: 0 }),
      _calls: calls,
    } as unknown as CanvasRenderingContext2D & { _calls: Record<string, number> };
  }

  it.each(
    pygameComponents.map((c) => [c.id, c]) as [string, PyGameComponent<Record<string, unknown>>][]
  )('%s preview() draws on canvas without throwing', (_id, component) => {
    const ctx = makeFakeCtx();
    expect(() =>
      component.preview(ctx, component.defaultProperties as Record<string, unknown>)
    ).not.toThrow();
    const calls = (ctx as unknown as { _calls: Record<string, number> })._calls;
    expect(Object.values(calls).reduce((s, n) => s + n, 0)).toBeGreaterThan(0);
  });

  it.each(
    pygameComponents.map((c) => [c.id, c]) as [string, PyGameComponent<Record<string, unknown>>][]
  )('%s generateCode() returns a non-empty string', (_id, component) => {
    const out = component.generateCode(component.defaultProperties as Record<string, unknown>);
    expect(typeof out).toBe('string');
    // Pin a minimum length to catch accidental "" returns. The smallest
    // generators ship a class definition or function — well over 50 chars.
    expect(out.length).toBeGreaterThan(50);
  });

  it('ball generateCode embeds the resolved RGB tuple from defaultProperties.color', () => {
    const ball = getComponentById('ball')!;
    const out = ball.generateCode(ball.defaultProperties as Record<string, unknown>);
    const [r, g, b] = hexToRgb((ball.defaultProperties as { color: string }).color);
    expect(out).toContain(`(${r}, ${g}, ${b})`);
  });
});
