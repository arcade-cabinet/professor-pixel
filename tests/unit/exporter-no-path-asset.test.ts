// Cover the "no path" defensive branch in exporter.ts (lines 86-89):
// when an asset has an undefined / empty path, exporter pushes a
// failure marker into the README's "failed assets" list and continues
// instead of aborting. Existing exporter.test.ts always supplies a
// concrete path, so this defensive branch stays uncov.

import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';

vi.mock('@lib/assets/manager', () => ({
  assetManager: { getAssetById: () => undefined },
}));

import { exportProjectAsZip } from '@lib/pygame/runtime/exporter';
import type { GameAsset } from '@lib/assets/types';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('exportProjectAsZip — asset with no path (lines 86-89)', () => {
  it('records a "no path" failure marker for an asset whose path is undefined', async () => {
    const assets: GameAsset[] = [
      {
        id: 'broken',
        name: 'Broken Asset',
        type: 'character',
        // path intentionally absent — defense-in-depth against a partial
        // mock or schema-drift asset that slips into the bundle path.
      } as unknown as GameAsset,
    ];

    const fetchStub = vi.fn();
    const result = await exportProjectAsZip({
      selectedComponents: {},
      selectedAssets: assets,
      fetchImpl: fetchStub,
    });

    const zip = await JSZip.loadAsync(result.blob);
    // The exporter should not have fetched anything for the no-path asset.
    expect(fetchStub).not.toHaveBeenCalled();
    // The MISSING.txt manifest should record the failure.
    const missing = await zip.file('assets/MISSING.txt')?.async('string');
    expect(missing).toBeTruthy();
    expect(missing).toContain('Broken Asset');
    expect(missing).toContain('no path');
  });

  it('records "unnamed asset" when both path AND name are missing', async () => {
    const assets: GameAsset[] = [
      {
        id: 'broken-2',
        type: 'character',
        // Neither name nor path — exercises the `asset.name ?? 'unnamed asset'`
        // null-coalescing branch.
      } as unknown as GameAsset,
    ];

    const result = await exportProjectAsZip({
      selectedComponents: {},
      selectedAssets: assets,
      fetchImpl: vi.fn(),
    });

    const zip = await JSZip.loadAsync(result.blob);
    const missing = await zip.file('assets/MISSING.txt')?.async('string');
    expect(missing).toContain('unnamed asset');
    expect(missing).toContain('no path');
  });
});
