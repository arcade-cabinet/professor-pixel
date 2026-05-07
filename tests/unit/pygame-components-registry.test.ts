import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  allComponents,
  drawCloud,
  drawHeart,
  drawStar,
  getAllComponents,
  getComponentById,
  getComponentByType,
  hexToRgb,
  pygameComponents,
  type ComponentType,
  type PyGameComponent,
} from '@lib/pygame/components/registry';
import type { AnyPyGameComponent } from '@lib/pygame/components/types';

// Pure-data registry for the Pygame component library. Pin invariants so
// accidental drops/renames in the individual component files surface here.

describe('pygameComponents — registry contents', () => {
  it('exposes the canonical 12 component ids', () => {
    const ids = pygameComponents.map((c) => c.id).sort();
    expect(ids).toEqual(
      [
        'background',
        'ball',
        'button',
        'collectible',
        'enemy',
        'healthBar',
        'paddle',
        'particleEffect',
        'platform',
        'scoreText',
        'sprite',
        'timer',
      ].sort()
    );
  });

  it('every component has the expected shape (id/type/name/description + behavior fns)', () => {
    for (const c of pygameComponents) {
      expect(c.id, 'id missing').toBeTruthy();
      expect(c.type, `type missing on ${c.id}`).toBeTruthy();
      expect(c.name, `name missing on ${c.id}`).toBeTruthy();
      expect(c.description, `description missing on ${c.id}`).toBeTruthy();
      expect(typeof c.preview, `preview must be a function on ${c.id}`).toBe('function');
      expect(typeof c.generateCode, `generateCode must be a function on ${c.id}`).toBe('function');
      expect(c.defaultProperties, `defaultProperties missing on ${c.id}`).toBeTruthy();
    }
  });

  it('every component id is unique', () => {
    const ids = pygameComponents.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('allComponents', () => {
  it('is the same array reference as pygameComponents (back-compat alias)', () => {
    expect(allComponents).toBe(pygameComponents);
  });
});

describe('getComponentById', () => {
  it.each([
    'ball',
    'paddle',
    'sprite',
    'platform',
    'enemy',
  ])('returns the component for known id %s', (id) => {
    const c = getComponentById(id);
    expect(c).toBeDefined();
    expect(c?.id).toBe(id);
  });

  it('returns undefined for unknown id', () => {
    expect(getComponentById('does-not-exist')).toBeUndefined();
    expect(getComponentById('')).toBeUndefined();
  });
});

describe('getComponentByType', () => {
  // The first ball-typed component is 'ball'; first paddle-typed is 'paddle'.
  // We don't assert the specific id since multiple components could share a
  // type — only that returned component's type matches the lookup.
  it.each([
    'ball',
    'paddle',
    'enemy',
    'collectible',
    'sprite',
  ] as const)('returns a component whose type matches %s', (type) => {
    const c = getComponentByType(type as ComponentType);
    expect(c).toBeDefined();
    expect(c?.type).toBe(type);
  });

  it('returns undefined for an unmatched type', () => {
    // Cast through unknown — we want to probe the runtime branch.
    expect(getComponentByType('not-a-real-type' as unknown as ComponentType)).toBeUndefined();
  });
});

describe('getAllComponents', () => {
  it('returns the same array reference as pygameComponents', () => {
    expect(getAllComponents()).toBe(pygameComponents);
  });
});

describe('hexToRgb', () => {
  it.each([
    ['#000000', [0, 0, 0]],
    ['#FFFFFF', [255, 255, 255]],
    ['#FF0000', [255, 0, 0]],
    ['#00FF00', [0, 255, 0]],
    ['#0000FF', [0, 0, 255]],
    ['000000', [0, 0, 0]], // optional leading #
    ['#aabbcc', [170, 187, 204]],
  ])('parses %s → %j', (hex, expected) => {
    expect(hexToRgb(hex)).toEqual(expected);
  });

  it('returns [0,0,0] for malformed hex (not 6 hex chars)', () => {
    expect(hexToRgb('invalid')).toEqual([0, 0, 0]);
    expect(hexToRgb('')).toEqual([0, 0, 0]);
    expect(hexToRgb('#fff')).toEqual([0, 0, 0]); // 3-char shorthand not supported
  });
});

// Drawing helpers exercise canvas APIs. The component-test suite covers them
// in a real Chromium; here in jsdom we just confirm they don't throw when
// given a stub 2D context with the methods they call.
function makeStubCtx(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    bezierCurveTo: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('drawStar', () => {
  it('draws a star path and fills it (no throw under stub ctx)', () => {
    const ctx = makeStubCtx();
    expect(() => drawStar(ctx, 10, 10, 5, 5)).not.toThrow();
    expect(ctx.beginPath).toHaveBeenCalledOnce();
    expect(ctx.fill).toHaveBeenCalledOnce();
    expect(ctx.closePath).toHaveBeenCalledOnce();
    // 2*points moveTo/lineTo combined = 10 calls; first one is moveTo.
    expect((ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect((ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls.length).toBe(9);
  });
});

describe('drawHeart', () => {
  it('draws a heart with 4 bezier segments + fill', () => {
    const ctx = makeStubCtx();
    expect(() => drawHeart(ctx, 0, 0, 20)).not.toThrow();
    expect(ctx.beginPath).toHaveBeenCalledOnce();
    expect((ctx.bezierCurveTo as ReturnType<typeof vi.fn>).mock.calls.length).toBe(4);
    expect(ctx.fill).toHaveBeenCalledOnce();
  });
});

describe('drawCloud', () => {
  it('draws three arcs + fill', () => {
    const ctx = makeStubCtx();
    expect(() => drawCloud(ctx, 0, 0, 10)).not.toThrow();
    expect((ctx.arc as ReturnType<typeof vi.fn>).mock.calls.length).toBe(3);
    expect(ctx.fill).toHaveBeenCalledOnce();
  });
});

describe('window.testPygameComponents — debug helper', () => {
  // The module installs this on window when imported under jsdom.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches testPygameComponents to window and returns the registry', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const win = window as Window & { testPygameComponents?: () => AnyPyGameComponent[] };
    expect(typeof win.testPygameComponents).toBe('function');
    const out = win.testPygameComponents?.();
    expect(out).toBe(pygameComponents);
  });
});

describe('PyGameComponent type re-export', () => {
  it('PyGameComponent / ComponentType type symbols are exported (compile-time pin)', () => {
    // Type-only smoke test — referencing the type at value level via a
    // tagged const ensures the export survives a refactor that drops the
    // type re-export from the registry barrel.
    const _smokePyGameComponent = null as PyGameComponent | null;
    const _smokeComponentType = 'ball' as ComponentType;
    expect(_smokePyGameComponent).toBe(null);
    expect(_smokeComponentType).toBe('ball');
  });
});
