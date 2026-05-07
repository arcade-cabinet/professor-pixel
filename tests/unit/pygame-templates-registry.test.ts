import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  gameTemplates,
  getAllTemplates,
  getTemplateById,
  getTemplatesByDifficulty,
  type GameTemplate,
} from '@lib/pygame/templates/registry';

// Pure-data registry — pin invariants so accidental drops/renames in the
// individual template files surface here.

describe('gameTemplates — registry contents', () => {
  it('exposes the five canonical PyGame templates by id', () => {
    const ids = gameTemplates.map((t) => t.id).sort();
    expect(ids).toEqual(
      ['breakout', 'collecting-game', 'pong', 'simple-platformer', 'space-shooter'].sort()
    );
  });

  it('every template has the GameTemplate-shaped fields populated', () => {
    for (const t of gameTemplates) {
      expect(t.id, `id missing on template`).toBeTruthy();
      expect(t.name, `name missing on ${t.id}`).toBeTruthy();
      expect(t.description, `description missing on ${t.id}`).toBeTruthy();
      expect(t.wizardDescription, `wizardDescription missing on ${t.id}`).toBeTruthy();
      expect(['beginner', 'intermediate', 'advanced']).toContain(t.difficulty);
      expect(Array.isArray(t.components), `components must be array on ${t.id}`).toBe(true);
      expect(typeof t.generateCode, `generateCode on ${t.id}`).toBe('function');
      expect(typeof t.preview, `preview on ${t.id}`).toBe('function');
      expect(t.settings.screenWidth).toBeGreaterThan(0);
      expect(t.settings.screenHeight).toBeGreaterThan(0);
      expect(t.settings.fps).toBeGreaterThan(0);
      expect(t.settings.title).toBeTruthy();
      expect(t.settings.backgroundColor).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });

  it('every template id is unique', () => {
    const ids = gameTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every template generateCode returns a non-trivial pygame string', () => {
    for (const t of gameTemplates) {
      const code = t.generateCode();
      expect(typeof code).toBe('string');
      expect(code).toContain('pygame');
      expect(code.length).toBeGreaterThan(100);
    }
  });
});

describe('getTemplateById', () => {
  it('returns the matching template when id exists', () => {
    const t = getTemplateById('simple-platformer');
    expect(t).toBeDefined();
    expect(t?.id).toBe('simple-platformer');
  });

  it('returns undefined for an unknown id', () => {
    expect(getTemplateById('does-not-exist')).toBeUndefined();
    expect(getTemplateById('')).toBeUndefined();
  });
});

describe('getTemplatesByDifficulty', () => {
  it.each([
    'beginner',
    'intermediate',
    'advanced',
  ] as const)('returns only templates whose difficulty matches %s', (difficulty) => {
    const out = getTemplatesByDifficulty(difficulty);
    expect(Array.isArray(out)).toBe(true);
    for (const t of out) {
      expect(t.difficulty).toBe(difficulty);
    }
  });

  it('the union of all three difficulty buckets equals gameTemplates', () => {
    const all: GameTemplate[] = [
      ...getTemplatesByDifficulty('beginner'),
      ...getTemplatesByDifficulty('intermediate'),
      ...getTemplatesByDifficulty('advanced'),
    ];
    expect(all.length).toBe(gameTemplates.length);
  });
});

describe('getAllTemplates', () => {
  it('returns the same registry array as gameTemplates', () => {
    expect(getAllTemplates()).toBe(gameTemplates);
  });
});

describe('window.testPygameTemplates — debug helper', () => {
  // The module installs a debug helper on window when imported in jsdom.
  // Pin: the helper exists, returns the registry, and logs without error.
  // (Module-import side-effect runs once at suite import, so we just probe.)
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches testPygameTemplates to window and returns the registry', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const win = window as Window & { testPygameTemplates?: () => GameTemplate[] };
    expect(typeof win.testPygameTemplates).toBe('function');
    const out = win.testPygameTemplates?.();
    expect(out).toBe(gameTemplates);
  });
});
