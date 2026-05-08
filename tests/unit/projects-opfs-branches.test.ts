// Cover the OPFS branches of src/storage/projects.ts that the
// localStorage-backed projects.test.ts skips. Targets uncovered lines
// 50-87 (dataUrlToBlob + blobToDataUrl + opfsItemToProject thumbnail
// path), 205-234 (saveWizardProject thumbnail + compile branch), 339-354
// (loadWizardProject schema-fail + thumbnail), 416-499 (cloneWizardProject
// OPFS), 520-534 (renameWizardProject OPFS thumbnail).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const opfsAvailable = vi.fn();
const listOpfs = vi.fn();
const saveOpfs = vi.fn();
const loadOpfs = vi.fn();
const deleteOpfs = vi.fn();
vi.mock('@lib/storage/opfs-projects', () => ({
  isOpfsProjectsAvailable: () => opfsAvailable(),
  listOpfsProjects: () => listOpfs(),
  saveOpfsProject: (...args: unknown[]) => saveOpfs(...args),
  loadOpfsProject: (...args: unknown[]) => loadOpfs(...args),
  deleteOpfsProject: (...args: unknown[]) => deleteOpfs(...args),
}));

const compilePythonGameMock = vi.fn();
vi.mock('@lib/pygame/runtime/compiler', () => ({
  compilePythonGame: (...args: unknown[]) => compilePythonGameMock(...args),
}));

const getAssetByIdMock = vi.fn();
vi.mock('@lib/assets/manager', () => ({
  assetManager: { getAssetById: (id: string) => getAssetByIdMock(id) },
}));

vi.mock('@lib/storage/broadcast', () => ({
  publishStorageEvent: vi.fn(),
}));

import {
  __resetOpfsRoutingForTests,
  saveWizardProject,
  loadWizardProject,
  cloneWizardProject,
  renameWizardProject,
  listWizardProjects,
} from '@lib/storage/projects';

// Build a fetch stub that translates any URL we feed it into a Blob whose
// FileReader.readAsDataURL eventually emits the expected data URL. jsdom's
// FileReader is real; we just need fetch + URL.revokeObjectURL stubs.
const revokeSpy = vi.fn();
const realFetch = globalThis.fetch;

beforeEach(() => {
  __resetOpfsRoutingForTests();
  opfsAvailable.mockReset().mockResolvedValue(true);
  // Default to empty list so saveWizardProjectOpfs's name-dedup scan finds
  // nothing and proceeds to the new-id path. Tests that need specific list
  // contents override this in-test.
  listOpfs.mockReset().mockResolvedValue([]);
  saveOpfs.mockReset();
  loadOpfs.mockReset();
  deleteOpfs.mockReset();
  compilePythonGameMock.mockReset();
  getAssetByIdMock.mockReset();
  revokeSpy.mockReset();
  globalThis.URL.revokeObjectURL = revokeSpy as never;
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake') as never;
  // fetch returns a Blob containing a small bytestring — blobToDataUrl
  // builds a real data URL out of that via FileReader.
  globalThis.fetch = vi.fn(async () => ({
    blob: async () => new Blob(['thumb-bytes'], { type: 'image/png' }),
  })) as never;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('projects (OPFS) — listWizardProjects + opfsItemToProject', () => {
  it('lists OPFS items and converts thumbnailUrl → data URL via fetch + FileReader', async () => {
    listOpfs.mockResolvedValue([
      {
        id: 'p1',
        name: 'Robot',
        template: 'platformer',
        createdAt: new Date(),
        updatedAt: new Date(),
        thumbnailUrl: 'blob:abc',
      },
    ]);
    const result = await listWizardProjects();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
    // dataUrl conversion went through fetch + FileReader → data URL prefix.
    expect(result[0].thumbnailDataUrl).toMatch(/^data:image\/png/);
    // The item's blob URL was revoked after read (line 87).
    expect(revokeSpy).toHaveBeenCalledWith('blob:abc');
  });

  it('listWizardProjects with thumbnailUrl=null skips fetch', async () => {
    listOpfs.mockResolvedValue([
      {
        id: 'p1',
        name: 'NoThumb',
        template: 'shooter',
        createdAt: new Date(),
        updatedAt: new Date(),
        thumbnailUrl: null,
      },
    ]);
    const result = await listWizardProjects();
    expect(result[0].thumbnailDataUrl).toBeUndefined();
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('listWizardProjects swallows thumbnail fetch failure but still revokes', async () => {
    listOpfs.mockResolvedValue([
      {
        id: 'p1',
        name: 'Bad',
        template: 'shooter',
        createdAt: new Date(),
        updatedAt: new Date(),
        thumbnailUrl: 'blob:bad',
      },
    ]);
    globalThis.fetch = vi.fn(async () => {
      throw new Error('fetch boom');
    }) as never;
    const result = await listWizardProjects();
    // Thumbnail dropped on failure (line 84-86) but project still listed.
    expect(result[0].thumbnailDataUrl).toBeUndefined();
    expect(revokeSpy).toHaveBeenCalledWith('blob:bad');
  });
});

describe('projects (OPFS) — saveWizardProject thumbnail + compile branches', () => {
  it('save without existingId revokes thumbnailUrls of every existing item (line 195 path 0 truthy)', async () => {
    // The dedup-scan loop after listOpfsProjects revokes thumbnailUrl
    // for every returned item to avoid leaking object URLs. Existing
    // tests either pass existingId (skipping the loop) or default the
    // list to empty (skipping the inner truthy arm). Seed two items
    // with truthy thumbnailUrls so the `if (item.thumbnailUrl)` guard
    // fires its truthy arm twice.
    listOpfs.mockResolvedValue([
      {
        id: 'sp1',
        name: 'Other',
        template: 't',
        created_at: new Date().toISOString(),
        thumbnailUrl: 'blob:url-1',
      },
      {
        id: 'sp2',
        name: 'AlsoOther',
        template: 't',
        created_at: new Date().toISOString(),
        thumbnailUrl: 'blob:url-2',
      },
    ]);
    saveOpfs.mockResolvedValue({
      id: 'sp3',
      name: 'New',
      template: 't',
      created_at: new Date().toISOString(),
    });
    await saveWizardProject({
      wizardState: { sessionActions: { selectedComponents: {} } } as never,
      name: 'New',
      template: 't',
    });
    // Both URLs revoked.
    expect(revokeSpy).toHaveBeenCalledWith('blob:url-1');
    expect(revokeSpy).toHaveBeenCalledWith('blob:url-2');
  });

  it('save with thumbnailDataUrl converts data URL → blob (line 205-206)', async () => {
    saveOpfs.mockResolvedValue({
      id: 'sp1',
      name: 'X',
      template: 't',
      created_at: new Date().toISOString(),
    });
    await saveWizardProject({
      wizardState: { sessionActions: { selectedComponents: {} } } as never,
      name: 'X',
      template: 't',
      thumbnailDataUrl: 'data:image/png;base64,iVBORw=',
    });
    expect(saveOpfs).toHaveBeenCalled();
    const args = saveOpfs.mock.calls[0][0];
    expect(args.thumbnailBlob).toBeInstanceOf(Blob);
  });

  it('save swallows thumbnail decode failure with console.warn (line 207-209)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Make fetch reject so the dataUrlToBlob throws.
    globalThis.fetch = vi.fn(async () => {
      throw new Error('decode boom');
    }) as never;
    saveOpfs.mockResolvedValue({
      id: 'sp1',
      name: 'X',
      template: 't',
      created_at: new Date().toISOString(),
    });
    await saveWizardProject({
      wizardState: { sessionActions: { selectedComponents: {} } } as never,
      name: 'X',
      template: 't',
      thumbnailDataUrl: 'data:image/png;base64,iVBORw=',
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('failed to decode thumbnail'),
      expect.any(Error)
    );
  });

  it('save with selectedComponents compiles game.py (line 223-228)', async () => {
    compilePythonGameMock.mockReturnValue('print("hi")');
    getAssetByIdMock.mockImplementation((id: string) =>
      id === 'a1' ? { id: 'a1', name: 'a1', type: 'sprite', path: '/a1.png' } : undefined
    );
    saveOpfs.mockResolvedValue({
      id: 'sp1',
      name: 'X',
      template: 't',
      created_at: new Date().toISOString(),
    });
    await saveWizardProject({
      wizardState: {
        sessionActions: { selectedComponents: { ball: 'A' } },
        selectedAssetIds: ['a1', 'a2'],
      } as never,
      name: 'X',
      template: 't',
    });
    expect(compilePythonGameMock).toHaveBeenCalled();
    // Filter dropped a2 (returned undefined).
    const compiledAssets = compilePythonGameMock.mock.calls[0][1] as Array<{ id: string }>;
    expect(compiledAssets).toHaveLength(1);
    expect(compiledAssets[0].id).toBe('a1');
    expect(saveOpfs.mock.calls[0][0].gamePy).toBe('print("hi")');
  });

  it('save swallows compilePythonGame failure with console.warn (line 229-235)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    compilePythonGameMock.mockImplementation(() => {
      throw new Error('compiler crash');
    });
    saveOpfs.mockResolvedValue({
      id: 'sp1',
      name: 'X',
      template: 't',
      created_at: new Date().toISOString(),
    });
    await saveWizardProject({
      wizardState: {
        sessionActions: { selectedComponents: { ball: 'A' } },
        selectedAssetIds: [],
      } as never,
      name: 'X',
      template: 't',
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('compilePythonGame failed'),
      expect.any(Error)
    );
    // gamePy stays undefined when compile throws.
    expect(saveOpfs.mock.calls[0][0].gamePy).toBeUndefined();
  });
});

describe('projects (OPFS) — loadWizardProject branches', () => {
  it('OPFS load with schema-invalid wizardState returns null + warns + revokes (lines 339-344)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    loadOpfs.mockResolvedValue({
      meta: { id: 'p1', name: 'X', template: 't' },
      // Schema requires an object; pass a non-object (string) to fail safeParse.
      wizardState: 'not-a-wizard-state' as never,
      thumbnailUrl: 'blob:abc',
      gamePy: undefined,
    });
    const result = await loadWizardProject('p1');
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('OPFS wizard snapshot failed schema validation'),
      expect.any(Array)
    );
    expect(revokeSpy).toHaveBeenCalledWith('blob:abc');
  });

  it('OPFS load schema-fail + null thumbnailUrl skips revoke (line 343 path 1 falsy)', async () => {
    // The schema-fail branch only revokes if loaded.thumbnailUrl is
    // truthy. The prior test covered the truthy arm; the falsy arm
    // (no thumbnail to revoke) sat cold. Passing thumbnailUrl: null
    // exercises the `if (loaded.thumbnailUrl)` falsy path.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    loadOpfs.mockResolvedValue({
      meta: { id: 'p1', name: 'X', template: 't' },
      wizardState: 'not-a-wizard-state' as never,
      thumbnailUrl: null,
      gamePy: undefined,
    });
    const result = await loadWizardProject('p1');
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalled();
    // Falsy arm — revokeObjectURL must NOT have been called.
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('OPFS load happy path materializes thumbnail data URL + revokes (lines 346-355)', async () => {
    loadOpfs.mockResolvedValue({
      meta: { id: 'p1', name: 'X', template: 't' },
      wizardState: {
        version: '1.0.0',
        currentNodeId: 'pickGame',
        gameType: 'platformer',
        selectedAssetIds: [],
        updatedAt: new Date().toISOString(),
      },
      thumbnailUrl: 'blob:abc',
      gamePy: 'print("hi")',
    });
    const result = await loadWizardProject('p1');
    expect(result).not.toBeNull();
    expect(result?.thumbnailDataUrl).toMatch(/^data:image\/png/);
    expect(result?.gamePy).toBe('print("hi")');
    expect(revokeSpy).toHaveBeenCalledWith('blob:abc');
  });

  it('OPFS load with thumbnail fetch failure drops the data URL + revokes', async () => {
    loadOpfs.mockResolvedValue({
      meta: { id: 'p1', name: 'X', template: 't' },
      wizardState: {
        version: '1.0.0',
        currentNodeId: 'pickGame',
        gameType: 'platformer',
        selectedAssetIds: [],
        updatedAt: new Date().toISOString(),
      },
      thumbnailUrl: 'blob:abc',
      gamePy: undefined,
    });
    globalThis.fetch = vi.fn(async () => {
      throw new Error('thumb fetch boom');
    }) as never;
    const result = await loadWizardProject('p1');
    expect(result).not.toBeNull();
    expect(result?.thumbnailDataUrl).toBeUndefined();
    expect(revokeSpy).toHaveBeenCalledWith('blob:abc');
  });

  it('OPFS load returning null falls through to localStorage path (no result there either)', async () => {
    loadOpfs.mockResolvedValue(null);
    // localStorage backend has no project under this id either, so the
    // outer storage.getProject(id) returns null at line 367-368.
    const result = await loadWizardProject('does-not-exist');
    expect(result).toBeNull();
  });
});

describe('projects (OPFS) — cloneWizardProject', () => {
  it('throws when source id does not exist (lines 419-420)', async () => {
    loadOpfs.mockResolvedValue(null);
    await expect(cloneWizardProject('missing-id')).rejects.toThrow(/not found/);
  });

  it('clone picks lowest-free Remix N suffix (lines 422-428)', async () => {
    loadOpfs.mockResolvedValue({
      meta: { id: 'src', name: 'My Game', template: 't' },
      wizardState: {
        version: '1.0.0',
        currentNodeId: 'pickGame',
        gameType: 'platformer',
        selectedAssetIds: [],
        updatedAt: new Date().toISOString(),
      },
      thumbnailUrl: null,
      gamePy: 'g',
    });
    listOpfs.mockResolvedValue([
      { id: 'a', name: 'My Game — Remix 1', thumbnailUrl: null },
      { id: 'b', name: 'My Game — Remix 2', thumbnailUrl: null },
    ]);
    saveOpfs.mockResolvedValue({
      id: 'new-clone',
      name: 'My Game — Remix 3',
      template: 't',
      created_at: new Date().toISOString(),
    });
    const cloned = await cloneWizardProject('src');
    expect(saveOpfs).toHaveBeenCalled();
    expect(saveOpfs.mock.calls[0][0].name).toBe('My Game — Remix 3');
    expect(cloned.name).toBe('My Game — Remix 3');
  });

  it('clone with thumbnail copies blob + materializes data URL on returned Project (lines 430-462)', async () => {
    loadOpfs.mockResolvedValue({
      meta: { id: 'src', name: 'Has Thumb', template: 't' },
      wizardState: {
        version: '1.0.0',
        currentNodeId: 'pickGame',
        gameType: 'platformer',
        selectedAssetIds: [],
        updatedAt: new Date().toISOString(),
      },
      thumbnailUrl: 'blob:src',
      gamePy: undefined,
    });
    listOpfs.mockResolvedValue([
      { id: 'src', name: 'Has Thumb', thumbnailUrl: 'blob:list-1' },
    ]);
    saveOpfs.mockResolvedValue({
      id: 'cloned',
      name: 'Has Thumb — Remix 1',
      template: 't',
      created_at: new Date().toISOString(),
    });
    const cloned = await cloneWizardProject('src');
    // The list scan's blob URLs were revoked (line 442-444).
    expect(revokeSpy).toHaveBeenCalledWith('blob:list-1');
    // Source's thumbnailUrl was revoked (line 438).
    expect(revokeSpy).toHaveBeenCalledWith('blob:src');
    expect(cloned.thumbnailDataUrl).toMatch(/^data:image\/png/);
  });

  it('clone with thumbnail fetch failure copies no blob (lines 435-437)', async () => {
    loadOpfs.mockResolvedValue({
      meta: { id: 'src', name: 'Bad Thumb', template: 't' },
      wizardState: {
        version: '1.0.0',
        currentNodeId: 'pickGame',
        gameType: 'platformer',
        selectedAssetIds: [],
        updatedAt: new Date().toISOString(),
      },
      thumbnailUrl: 'blob:bad',
      gamePy: undefined,
    });
    listOpfs.mockResolvedValue([]);
    globalThis.fetch = vi.fn(async () => {
      throw new Error('boom');
    }) as never;
    saveOpfs.mockResolvedValue({
      id: 'cloned',
      name: 'Bad Thumb — Remix 1',
      template: 't',
      created_at: new Date().toISOString(),
    });
    const cloned = await cloneWizardProject('src');
    expect(saveOpfs.mock.calls[0][0].thumbnailBlob).toBeUndefined();
    expect(cloned.thumbnailDataUrl).toBeUndefined();
  });
});

describe('projects (OPFS) — renameWizardProject', () => {
  it('throws on empty trimmed name (lines 514-516)', async () => {
    await expect(renameWizardProject('id', '   ')).rejects.toThrow(/empty/);
  });

  it('throws when project not found in OPFS (lines 519-520)', async () => {
    loadOpfs.mockResolvedValue(null);
    await expect(renameWizardProject('missing', 'New Name')).rejects.toThrow(/not found/);
  });

  it('rename happy path materializes existing thumbnail to data URL (lines 526-534)', async () => {
    loadOpfs.mockResolvedValue({
      meta: { id: 'p1', name: 'Old', template: 't' },
      wizardState: {
        version: '1.0.0',
        currentNodeId: 'pickGame',
        gameType: 'platformer',
        selectedAssetIds: [],
        updatedAt: new Date().toISOString(),
      },
      thumbnailUrl: 'blob:thumb',
      gamePy: undefined,
    });
    saveOpfs.mockResolvedValue({
      id: 'p1',
      name: 'New Name',
      template: 't',
      created_at: new Date().toISOString(),
    });
    const result = await renameWizardProject('p1', 'New Name');
    expect(result.name).toBe('New Name');
    expect(result.thumbnailDataUrl).toMatch(/^data:image\/png/);
    expect(revokeSpy).toHaveBeenCalledWith('blob:thumb');
  });

  it('rename swallows thumbnail fetch failure but still revokes (lines 531-533)', async () => {
    loadOpfs.mockResolvedValue({
      meta: { id: 'p1', name: 'Old', template: 't' },
      wizardState: {
        version: '1.0.0',
        currentNodeId: 'pickGame',
        gameType: 'platformer',
        selectedAssetIds: [],
        updatedAt: new Date().toISOString(),
      },
      thumbnailUrl: 'blob:bad',
      gamePy: undefined,
    });
    globalThis.fetch = vi.fn(async () => {
      throw new Error('boom');
    }) as never;
    saveOpfs.mockResolvedValue({
      id: 'p1',
      name: 'New Name',
      template: 't',
      created_at: new Date().toISOString(),
    });
    const result = await renameWizardProject('p1', 'New Name');
    expect(result.thumbnailDataUrl).toBeUndefined();
    expect(revokeSpy).toHaveBeenCalledWith('blob:bad');
  });
});
