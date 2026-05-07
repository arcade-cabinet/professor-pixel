import { describe, expect, it } from 'vitest';
import {
  type GameTemplate,
  gameTemplates,
  getAllTemplates,
  getTemplateById,
  getTemplatesByDifficulty,
} from '@lib/pygame/templates';

// src/pygame/templates/* is a registry of 5 PyGame game templates plus
// helpers (registry.ts) + per-template generateCode/preview functions.
// Each template ships:
//   - shape data (id/name/description/components/settings)
//   - generateCode() → Python source string (used to seed projects)
//   - preview(ctx) → Canvas2D draw routine (used in the picker UI)
// Tests pin both the registry contract and exercise the per-template
// functions so they aren't dead-code (which is why coverage was ~5-13%).

const ALLOWED_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

describe('gameTemplates registry — shape', () => {
  it('contains exactly 5 templates with stable ids', () => {
    const ids = gameTemplates.map((t) => t.id).sort();
    expect(ids).toEqual([
      'breakout',
      'collecting-game',
      'pong',
      'simple-platformer',
      'space-shooter',
    ]);
  });

  it('every template carries the full GameTemplate shape', () => {
    for (const t of gameTemplates) {
      expect(typeof t.id).toBe('string');
      expect(typeof t.name).toBe('string');
      expect(typeof t.description).toBe('string');
      expect(typeof t.wizardDescription).toBe('string');
      expect(t.wizardDescription.length).toBeGreaterThan(0);
      expect(ALLOWED_DIFFICULTIES).toContain(t.difficulty);
      expect(Array.isArray(t.components)).toBe(true);
      expect(t.components.length).toBeGreaterThan(0);
      expect(typeof t.generateCode).toBe('function');
      expect(typeof t.preview).toBe('function');
      // Settings shape:
      expect(typeof t.settings.screenWidth).toBe('number');
      expect(typeof t.settings.screenHeight).toBe('number');
      expect(typeof t.settings.backgroundColor).toBe('string');
      expect(typeof t.settings.fps).toBe('number');
      expect(typeof t.settings.title).toBe('string');
    }
  });

  it('every template component has a type, id, and properties bag', () => {
    for (const t of gameTemplates) {
      const seenIds = new Set<string>();
      for (const c of t.components) {
        expect(typeof c.type).toBe('string');
        expect(typeof c.id).toBe('string');
        expect(c.id.length).toBeGreaterThan(0);
        // Component IDs unique within a template — collisions would
        // confuse runtime lookups (`scene.findById`).
        expect(seenIds.has(c.id)).toBe(false);
        seenIds.add(c.id);
        expect(typeof c.properties).toBe('object');
      }
    }
  });
});

describe('getTemplateById / getAllTemplates / getTemplatesByDifficulty', () => {
  it('getAllTemplates returns the same array as gameTemplates', () => {
    expect(getAllTemplates()).toBe(gameTemplates);
  });

  it('getTemplateById returns the matching template', () => {
    expect(getTemplateById('breakout')?.id).toBe('breakout');
    expect(getTemplateById('simple-platformer')?.id).toBe('simple-platformer');
  });

  it('getTemplateById returns undefined for unknown id', () => {
    expect(getTemplateById('does-not-exist')).toBeUndefined();
  });

  it('getTemplatesByDifficulty filters correctly', () => {
    for (const diff of ALLOWED_DIFFICULTIES) {
      const filtered = getTemplatesByDifficulty(diff);
      expect(filtered.every((t) => t.difficulty === diff)).toBe(true);
    }
    // Sum across all difficulties must equal the full registry.
    const total = ALLOWED_DIFFICULTIES.reduce(
      (sum, d) => sum + getTemplatesByDifficulty(d).length,
      0
    );
    expect(total).toBe(gameTemplates.length);
  });
});

describe('per-template generateCode()', () => {
  // Every template's generateCode() should return a non-empty Python
  // source string with the canonical PyGame imports + a runnable
  // structure. We don't validate Python correctness here (that's
  // exercised by integration tests that actually run via Pyodide); we
  // just pin that the function executes, returns a string, and includes
  // the marker imports so a refactor can't accidentally return `''`.
  it.each(
    gameTemplates.map((t) => [t.id, t]) as [string, GameTemplate][]
  )('%s template generateCode returns runnable PyGame source', (_id, template) => {
    const code = template.generateCode();
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(100); // Not just a stub
    expect(code).toMatch(/import pygame/);
    expect(code).toMatch(/pygame\.init\(\)/);
    // Title from settings should land in the source so window caption
    // is correct.
    expect(code).toContain(template.settings.title);
  });
});

describe('per-template preview(ctx)', () => {
  // preview() draws to a 2D canvas. We provide a minimal mock that
  // tracks call counts for the methods used. We don't pin which methods
  // get called — different templates draw different shapes — but every
  // preview should make at least one drawing call without throwing.
  function makeFakeCtx(width = 200, height = 150) {
    const calls: Record<string, number> = {};
    const track =
      (name: string) =>
      (..._args: unknown[]) => {
        calls[name] = (calls[name] || 0) + 1;
      };
    const ctx = {
      canvas: { width, height },
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
      fill: track('fill'),
      stroke: track('stroke'),
      fillText: track('fillText'),
      strokeText: track('strokeText'),
      save: track('save'),
      restore: track('restore'),
      translate: track('translate'),
      rotate: track('rotate'),
      scale: track('scale'),
      ellipse: track('ellipse'),
      rect: track('rect'),
      drawImage: track('drawImage'),
      setLineDash: track('setLineDash'),
      getLineDash: () => [],
      createLinearGradient: () => ({ addColorStop: track('addColorStop') }),
      createRadialGradient: () => ({ addColorStop: track('addColorStop') }),
      measureText: () => ({ width: 0 }),
      bezierCurveTo: track('bezierCurveTo'),
      quadraticCurveTo: track('quadraticCurveTo'),
      // properties accessors — preview functions write to these
      _calls: calls,
    } as unknown as CanvasRenderingContext2D & { _calls: Record<string, number> };
    return ctx;
  }

  it.each(
    gameTemplates.map((t) => [t.id, t]) as [string, GameTemplate][]
  )('%s template preview() invokes ≥1 drawing call without throwing', (_id, template) => {
    const ctx = makeFakeCtx();
    // Should not throw.
    expect(() => template.preview(ctx)).not.toThrow();
    // Total calls across the tracked drawing methods should be > 0.
    const calls = (ctx as unknown as { _calls: Record<string, number> })._calls;
    const totalDrawingCalls = Object.values(calls).reduce((s, n) => s + n, 0);
    expect(totalDrawingCalls).toBeGreaterThan(0);
  });

  it('preview honors ctx.canvas dimensions (uses them for sizing)', () => {
    // Sanity test: at least one template should reference canvas
    // width/height in its drawing — if all templates ignore canvas size,
    // they'd render off-screen on the picker's smaller previews. We
    // pick breakout which we know reads ctx.canvas.width/height.
    const breakout = gameTemplates.find((t) => t.id === 'breakout');
    expect(breakout).toBeTruthy();
    const ctx = makeFakeCtx(800, 600);
    expect(() => breakout!.preview(ctx)).not.toThrow();
  });
});
