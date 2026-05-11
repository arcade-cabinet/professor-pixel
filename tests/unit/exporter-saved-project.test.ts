// Cover exportSavedProject in src/pygame/runtime/exporter.ts (lines
// 197-215). The existing exporter.test.ts covers exportProjectAsZip +
// shareOrDownload but not the saved-project loader path that resolves
// a project id, hydrates assets, and dispatches to the share/download
// pipeline.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadWizardProjectMock = vi.fn();
const getAssetByIdMock = vi.fn();

vi.mock('@lib/storage/projects', () => ({
  loadWizardProject: (id: string) => loadWizardProjectMock(id),
}));

vi.mock('@lib/assets/manager', () => ({
  assetManager: {
    getAssetById: (id: string) => getAssetByIdMock(id),
  },
}));

import { exportSavedProject } from '@lib/pygame/runtime/exporter';

beforeEach(() => {
  loadWizardProjectMock.mockReset();
  getAssetByIdMock.mockReset();
  // Stub URL + anchor side effects for the triggerDownload fallback path.
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn().mockReturnValue('blob:fake'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('exportSavedProject', () => {
  it('throws when the project id does not resolve', async () => {
    loadWizardProjectMock.mockResolvedValueOnce(null);
    await expect(exportSavedProject('no-such-id')).rejects.toThrow(/Project no-such-id not found/);
  });

  it('hydrates asset IDs against the asset manager and exports successfully', async () => {
    loadWizardProjectMock.mockResolvedValueOnce({
      name: 'My Game',
      wizardState: {
        selectedAssetIds: ['a1', 'a2', 'a3'],
        sessionActions: {
          selectedComponents: { ball: 'A' },
        },
      },
    });
    // a1 → real asset, a2 → undefined (filter drops it), a3 → real asset.
    getAssetByIdMock.mockImplementation((id: string) =>
      id === 'a1' || id === 'a3' ? { id, name: id, type: 'sprite', path: `/p/${id}` } : undefined
    );

    const result = await exportSavedProject('proj-1');
    // jsdom doesn't implement navigator.share → shareOrDownload falls back
    // to triggerDownload and returns 'downloaded'.
    expect(result).toBe('downloaded');
    // The manager was queried for each id; a2 returned undefined and got filtered.
    expect(getAssetByIdMock).toHaveBeenCalledWith('a1');
    expect(getAssetByIdMock).toHaveBeenCalledWith('a2');
    expect(getAssetByIdMock).toHaveBeenCalledWith('a3');
  });

  it('handles a snapshot with no selectedAssetIds (empty array fallback)', async () => {
    loadWizardProjectMock.mockResolvedValueOnce({
      name: 'Empty',
      wizardState: {
        // No selectedAssetIds → falls through to ?? []
        sessionActions: {},
      },
    });
    const result = await exportSavedProject('proj-2');
    expect(result).toBe('downloaded');
    expect(getAssetByIdMock).not.toHaveBeenCalled();
  });

  it('handles a snapshot with no sessionActions (selectedComponents fallback to {})', async () => {
    loadWizardProjectMock.mockResolvedValueOnce({
      name: 'No Session',
      wizardState: {
        selectedAssetIds: [],
        // sessionActions absent → falls through to ?? {}
      },
    });
    const result = await exportSavedProject('proj-3');
    expect(result).toBe('downloaded');
  });
});
