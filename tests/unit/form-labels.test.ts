// Omnibus task-005 — three inputs that previously relied on aria-
// label or visual context now have explicit `<label htmlFor>` +
// matching `id` attributes. Source-level checks because the inputs
// live inside conditionally-rendered branches (Card edit-mode in
// home, conditional category filter in asset-browser) — asserting
// the source structure is the simplest contract that covers all
// rendering paths.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { strings } from '@lib/i18n';

const ROOT = join(__dirname, '..', '..');
const HOME = readFileSync(join(ROOT, 'app/pages/home.tsx'), 'utf8');
const PROFILE = readFileSync(join(ROOT, 'app/pages/profile.tsx'), 'utf8');
const ASSET_BROWSER = readFileSync(join(ROOT, 'app/components/wizard/asset-browser.tsx'), 'utf8');

describe('form-label associations (omnibus task-005)', () => {
  it('home.tsx project-rename input pairs with a label via htmlFor', () => {
    expect(HOME).toMatch(/htmlFor=\{`my-game-rename-input-\$\{project\.id\}`\}/);
    expect(HOME).toMatch(
      /<label\s+htmlFor=\{`my-game-rename-input-\$\{project\.id\}`\}[^>]*className="sr-only"/
    );
    expect(HOME).toMatch(/id=\{`my-game-rename-input-\$\{project\.id\}`\}/);
  });

  it('profile.tsx name input pairs with a label via htmlFor', () => {
    expect(PROFILE).toContain('htmlFor="profile-name-input"');
    expect(PROFILE).toContain('id="profile-name-input"');
    expect(PROFILE).toMatch(/<label\s+htmlFor="profile-name-input"\s+className="sr-only"/);
  });

  it('asset-browser category select pairs with a label via htmlFor', () => {
    expect(ASSET_BROWSER).toContain('htmlFor="asset-category-filter"');
    expect(ASSET_BROWSER).toContain('id="asset-category-filter"');
    expect(ASSET_BROWSER).toContain('strings.assetBrowser.categoryFilterLabel');
  });

  it('catalog has the asset-browser category-filter label key', () => {
    expect(strings.assetBrowser.categoryFilterLabel).toBe('Filter assets by category');
  });
});
