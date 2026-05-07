import { describe, expect, it } from 'vitest';
import {
  type GameTemplate,
  gameTemplates,
  getTemplateById,
  getTemplateOptions,
} from '@lib/wizard/game-templates';

// game-templates.ts is a flat data registry plus two trivial selectors.
// The tests pin the public contract: every entry has the required shape,
// IDs are unique (otherwise getTemplateById hides duplicates), every
// difficulty value is in the allowed enum, and the two helpers reflect
// the underlying array.

describe('gameTemplates registry — shape invariants', () => {
  it('contains a non-empty array of templates', () => {
    expect(Array.isArray(gameTemplates)).toBe(true);
    expect(gameTemplates.length).toBeGreaterThan(0);
  });

  it('every template has the required GameTemplate fields', () => {
    for (const t of gameTemplates) {
      expect(t.id, `template missing id: ${JSON.stringify(t).slice(0, 80)}`).toBeTruthy();
      expect(typeof t.id).toBe('string');
      expect(typeof t.name).toBe('string');
      expect(typeof t.description).toBe('string');
      expect(['Beginner', 'Intermediate', 'Advanced']).toContain(t.difficulty);
      expect(Array.isArray(t.files)).toBe(true);
    }
  });

  it('IDs are unique across the registry', () => {
    // getTemplateById uses .find() which silently returns the first match.
    // A duplicate ID would mask the second template forever — pin uniqueness
    // here to catch registry editing mistakes.
    const ids = gameTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every template has at least one file unless useComponents=true', () => {
    // The custom-components template carries an empty main.py because the
    // body is generated at runtime from user-selected blocks. Every other
    // template must ship a complete starter.
    for (const t of gameTemplates) {
      expect(t.files.length).toBeGreaterThan(0);
      if (!t.useComponents) {
        // Non-component templates ship real code in every file.
        for (const f of t.files) {
          expect(f.content.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every file has a path that looks like a Python module path', () => {
    for (const t of gameTemplates) {
      for (const f of t.files) {
        expect(typeof f.path).toBe('string');
        expect(f.path).toMatch(/\.(py|json|md)$/);
      }
    }
  });
});

describe('getTemplateById', () => {
  it('returns the matching template for a known id', () => {
    const sample = gameTemplates[0]!;
    const found = getTemplateById(sample.id);
    expect(found).toBe(sample);
  });

  it('returns undefined for an unknown id', () => {
    expect(getTemplateById('does-not-exist-xyz')).toBeUndefined();
  });

  it('returns undefined for an empty string id', () => {
    expect(getTemplateById('')).toBeUndefined();
  });
});

describe('getTemplateOptions', () => {
  it('returns one entry per template, in the same order', () => {
    const opts = getTemplateOptions();
    expect(opts.length).toBe(gameTemplates.length);
    for (let i = 0; i < opts.length; i++) {
      expect(opts[i]!.id).toBe(gameTemplates[i]!.id);
    }
  });

  it('strips files/useComponents — only id/name/description/difficulty', () => {
    const opts = getTemplateOptions();
    const sample = opts[0]!;
    expect(Object.keys(sample).sort()).toEqual(['description', 'difficulty', 'id', 'name'].sort());
    // No files leak into the picker payload.
    expect((sample as Partial<GameTemplate>).files).toBeUndefined();
  });

  it('every difficulty value passed through is one of the allowed three', () => {
    for (const opt of getTemplateOptions()) {
      expect(['Beginner', 'Intermediate', 'Advanced']).toContain(opt.difficulty);
    }
  });
});
