// Smoke-cover src/assets/downloader.ts (285 LOC, 0% → 100%).
// Three exports (directAssetLinks, assetDownloadScript, assetUsageGuide)
// — all module-level constants. Importing the module is enough to flip
// coverage; we add a few structural assertions to lock down the shape
// (so a future refactor that drops a section gets caught).

import { describe, expect, it } from 'vitest';
import {
  directAssetLinks,
  assetDownloadScript,
  assetUsageGuide,
  type AssetDownload,
} from '@lib/assets/downloader';

describe('directAssetLinks', () => {
  it('exposes fonts, sprites, and sounds entry arrays', () => {
    expect(directAssetLinks.fonts).toBeInstanceOf(Array);
    expect(directAssetLinks.sprites).toBeInstanceOf(Array);
    expect(directAssetLinks.sounds).toBeInstanceOf(Array);
  });

  it('every link entry has the required CC0/asset shape', () => {
    const all = [
      ...directAssetLinks.fonts,
      ...directAssetLinks.sprites,
      ...directAssetLinks.sounds,
    ];
    for (const item of all) {
      expect(typeof item.name).toBe('string');
      expect(typeof item.sourceUrl).toBe('string');
      expect(typeof item.localPath).toBe('string');
      expect(typeof item.license).toBe('string');
      // directLink is optional (null when no CDN URL is known).
      if (item.directLink !== null) {
        expect(typeof item.directLink).toBe('string');
      }
    }
  });
});

describe('assetDownloadScript', () => {
  it('is a non-empty Python string', () => {
    expect(typeof assetDownloadScript).toBe('string');
    expect(assetDownloadScript.length).toBeGreaterThan(0);
    expect(assetDownloadScript).toContain('import');
  });
});

describe('assetUsageGuide', () => {
  it('is a non-empty markdown-ish string with sections', () => {
    expect(typeof assetUsageGuide).toBe('string');
    expect(assetUsageGuide.length).toBeGreaterThan(0);
    expect(assetUsageGuide).toContain('# Using Assets');
    expect(assetUsageGuide).toContain('## 1.');
  });
});

describe('AssetDownload type', () => {
  it('compiles a structurally-valid value', () => {
    const sample: AssetDownload = {
      name: 'sample',
      sourceUrl: 'https://example.com',
      localPath: 'assets/sample.png',
      license: 'CC0',
      type: 'sprite',
    };
    expect(sample.name).toBe('sample');
  });
});
