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
    //
    // We use `=== true` (NOT `!t.useComponents`) so the guard fires only on
    // explicitly-component templates. A template that omits `useComponents`
    // and accidentally ships an empty file would still fail the assertion —
    // that's the invariant we want to protect.
    for (const t of gameTemplates) {
      expect(t.files.length).toBeGreaterThan(0);
      if (t.useComponents !== true) {
        for (const f of t.files) {
          expect(f.content.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('useComponents, when present, is strictly boolean', () => {
    // Catches the "copy-paste shipped a string" mistake; without this,
    // `useComponents: "true"` would silently bypass the empty-content
    // check above (string "true" is truthy and `!== true` is true).
    for (const t of gameTemplates) {
      if (t.useComponents !== undefined) {
        expect(typeof t.useComponents).toBe('boolean');
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

  it('returns undefined for an empty-string id (no template with id="")', () => {
    // Pins the data invariant — no template in the registry has an empty
    // id — by way of the lookup contract. There is no special-case empty
    // handling in getTemplateById; this is behavior-pinning of the
    // registry, not the function.
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

  it('strips files + useComponents from EVERY option entry', () => {
    // Tighter than spot-checking the first entry: assert across the whole
    // table. The reviewer's note: an Object.keys check on a single hand-
    // built object literal is tautological — the keys are guaranteed by
    // the construction site. This loop catches any future refactor that
    // changes getTemplateOptions to use `{ ...template }` (spread) and
    // accidentally leaks files/useComponents.
    for (const opt of getTemplateOptions()) {
      const keys = Object.keys(opt).sort();
      expect(keys).toEqual(['description', 'difficulty', 'id', 'name']);
      expect((opt as Partial<GameTemplate>).files).toBeUndefined();
      expect((opt as Partial<GameTemplate>).useComponents).toBeUndefined();
    }
  });

  it('every difficulty value passed through is one of the allowed three', () => {
    for (const opt of getTemplateOptions()) {
      expect(['Beginner', 'Intermediate', 'Advanced']).toContain(opt.difficulty);
    }
  });
});
