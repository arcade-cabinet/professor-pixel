// Cover the no-category fallback in src/assets/manager.ts:92:
//   filterAssets's category filter has a defensive `'category' in asset`
//   guard; if a future asset shape lacks the field, the predicate
//   returns false. Every real asset in the catalog has `category`,
//   so the existing filter tests never reach line 92.
//
// Construct an off-shape asset (no `category` property), inject it
// via a direct Map mutation on a private field, and assert
// filterAssets({ category }) excludes it.

import { describe, expect, it } from 'vitest';
import { AssetManager } from '@lib/assets/manager';
import type { GameAsset } from '@lib/assets/types';

describe('AssetManager.filterAssets — asset without category falls through (line 92)', () => {
  it('returns false from the category predicate when the asset has no category field', () => {
    const mgr = new AssetManager();

    // Reach into the private Map. The defensive `'category' in asset`
    // guard is for future asset shapes; today's GameAsset union always
    // has it, so we type-erase to inject the off-shape value.
    const internal = mgr as unknown as { assets: Map<string, GameAsset> };
    internal.assets.set('odd-1', {
      id: 'odd-1',
      name: 'Odd',
      description: 'no-category asset',
      type: 'sprite',
      path: '/odd.png',
      tags: [],
      license: 'CC0',
      // category intentionally omitted
    } as unknown as GameAsset);

    const out = mgr.filterAssets({ category: 'characters' });
    expect(out).toEqual([]);
  });
});
