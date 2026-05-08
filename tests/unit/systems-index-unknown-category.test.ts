// Cover the `|| []` fallback branch in
// src/pygame/components/systems-index.ts (line 45):
//   return pygameComponents[category] || [];
//
// The existing pygame-systems.test.ts only iterates known categories
// (movement / combat / ui / world), so the fallback for an unknown
// category never fires. Pass an off-list category so the `|| []` arm
// returns the empty array.

import { describe, expect, it } from 'vitest';
import { getComponentsByCategory } from '@lib/pygame/components/systems-index';

describe('getComponentsByCategory — unknown category fallback (line 45)', () => {
  it('returns an empty array when the category is not in pygameComponents', () => {
    // Cast through unknown — the function signature constrains the
    // public type to the four known categories, but the implementation
    // defends against drift. We exercise that defense.
    const result = getComponentsByCategory(
      'nonexistent-category' as unknown as Parameters<typeof getComponentsByCategory>[0]
    );
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });
});
