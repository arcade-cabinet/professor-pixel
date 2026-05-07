import { describe, expect, it } from 'vitest';
import {
  allComponents,
  getCategories,
  getComponentById,
  getComponentsByCategory,
  pygameComponents,
} from '@lib/pygame/components/systems-index';
import type { PygameSystemSpec } from '@lib/pygame/components/system-types';

// systems-index aggregates 8 PygameSystemSpec entries (A/B-variant Python
// gameplay snippets) by category: movement {jump, walk}, combat {shooting,
// melee}, ui {health, score}, world {gravity, collision}.
//
// Tests pin the registry shape (every spec has both A and B variants with
// non-empty pythonCode), helper round-trips, and category fan-out.

const EXPECTED_BY_CATEGORY = {
  movement: ['jump', 'walk'],
  combat: ['shooting', 'melee'],
  ui: ['health', 'score'],
  world: ['gravity', 'collision'],
} as const;

describe('systems-index — registry shape', () => {
  it('allComponents has 8 entries', () => {
    expect(allComponents.length).toBe(8);
  });

  it('every spec carries the full PygameSystemSpec shape with both variants populated', () => {
    for (const c of allComponents) {
      expect(typeof c.id).toBe('string');
      expect(c.id.length).toBeGreaterThan(0);
      expect(typeof c.name).toBe('string');
      expect(['movement', 'combat', 'ui', 'world']).toContain(c.category);
      expect(typeof c.assetSlots).toBe('object');
      // Both A and B variants are required and non-empty.
      for (const variant of ['A', 'B'] as const) {
        const v = c.variants[variant];
        expect(typeof v.name).toBe('string');
        expect(v.name.length).toBeGreaterThan(0);
        expect(typeof v.description).toBe('string');
        expect(typeof v.pythonCode).toBe('string');
        expect(v.pythonCode.length).toBeGreaterThan(50);
      }
      expect(typeof c.parameters).toBe('object');
    }
  });

  it('IDs are unique across the registry', () => {
    // getComponentById uses .find() — duplicate IDs would silently mask.
    const ids = allComponents.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every spec self-categorizes consistently with pygameComponents groups', () => {
    // Cross-check: a spec at pygameComponents.movement[*] must have
    // category === 'movement'. Catches a spec that's been moved between
    // groups but kept its old category string.
    for (const cat of getCategories()) {
      for (const spec of pygameComponents[cat] as PygameSystemSpec[]) {
        expect(spec.category).toBe(cat);
      }
    }
  });
});

describe('pygameComponents grouping', () => {
  it('exposes the four categories with their expected member ids', () => {
    for (const [cat, expectedIds] of Object.entries(EXPECTED_BY_CATEGORY)) {
      const group = pygameComponents[cat as keyof typeof pygameComponents];
      const ids = group.map((c) => c.id).sort();
      expect(ids).toEqual([...expectedIds].sort());
    }
  });

  it('union of all groups equals allComponents (no orphans, no doubles)', () => {
    const fromGroups = Object.values(pygameComponents)
      .flat()
      .map((c) => c.id)
      .sort();
    const fromFlat = allComponents.map((c) => c.id).sort();
    expect(fromGroups).toEqual(fromFlat);
  });
});

describe('getComponentById', () => {
  it('returns the matching spec for every known id', () => {
    for (const c of allComponents) {
      expect(getComponentById(c.id)?.id).toBe(c.id);
    }
  });

  it('returns undefined for an unknown id', () => {
    expect(getComponentById('does-not-exist')).toBeUndefined();
  });
});

describe('getComponentsByCategory', () => {
  it('returns the correct group for each known category', () => {
    for (const [cat, expectedIds] of Object.entries(EXPECTED_BY_CATEGORY)) {
      const group = getComponentsByCategory(cat as keyof typeof pygameComponents);
      const ids = group.map((c) => c.id).sort();
      expect(ids).toEqual([...expectedIds].sort());
    }
  });
});

describe('getCategories', () => {
  it('returns exactly the four registered categories', () => {
    expect(getCategories().sort()).toEqual(['combat', 'movement', 'ui', 'world']);
  });
});
