// Cover the schema-rejection skip branches of src/storage/opfs-migration.ts
// (lines 115-148, 159-178) plus the sentinel-write failure path (line 217)
// and the dataUrlToBlob helper (line 224-225). The existing
// opfs-migration.test.ts covers the early-bails (OPFS unavailable, sentinel
// already exists, raw=null, JSON.parse failure) but stops short of the
// per-row validation gauntlet inside the project loop.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const opfsMock = vi.hoisted(() => ({
  isOpfsProjectsAvailable: vi.fn(),
  saveOpfsProject: vi.fn(),
}));

vi.mock('@lib/storage/opfs-projects', () => opfsMock);

import {
  __resetMigrationForTests,
  migrateLocalStorageProjectsToOpfs,
} from '@lib/storage/opfs-migration';

// Stub navigator.storage so the sentinel-existence probe at line 196-204
// returns false (so the migration runs) and writeSentinel succeeds (or
// fails on demand for the line-217 test).
let originalStorage: StorageManager | undefined;
function stubNavigatorStorage(opts: { sentinelWriteFails?: boolean } = {}) {
  const fakeRoot = {
    getFileHandle: vi.fn(async (_name: string, options?: { create?: boolean }) => {
      if (options?.create) {
        if (opts.sentinelWriteFails) {
          throw new Error('sentinel-write boom');
        }
        return {
          createWritable: async () => ({
            write: async () => {},
            close: async () => {},
          }),
        };
      }
      // No-options call: the sentinel-exists probe. Reject so the migration
      // body runs.
      throw new Error('sentinel not found');
    }),
  };
  Object.defineProperty(navigator, 'storage', {
    value: { getDirectory: async () => fakeRoot },
    configurable: true,
  });
}

beforeEach(() => {
  __resetMigrationForTests();
  opfsMock.isOpfsProjectsAvailable.mockReset().mockResolvedValue(true);
  opfsMock.saveOpfsProject.mockReset().mockResolvedValue({
    id: 'p1',
    name: 'X',
    template: 't',
    created_at: new Date().toISOString(),
  });
  localStorage.clear();
  originalStorage = (navigator as Navigator & { storage?: StorageManager }).storage;
});

afterEach(() => {
  __resetMigrationForTests();
  vi.restoreAllMocks();
  localStorage.clear();
  if (originalStorage !== undefined) {
    Object.defineProperty(navigator, 'storage', { value: originalStorage, configurable: true });
  }
});

describe('opfs-migration — per-project shape skips (lines 114-148)', () => {
  it('skips projects that are null / non-objects (line 114-117)', async () => {
    stubNavigatorStorage();
    localStorage.setItem(
      'pygame_academy_projects',
      JSON.stringify({ k1: null, k2: 'string-not-object', k3: 42 })
    );
    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result.ran).toBe(true);
    expect(result.migrated).toBe(0);
    // All three were skipped via the typeof !== 'object' gate.
    expect(result.skipped).toHaveLength(3);
    expect(opfsMock.saveOpfsProject).not.toHaveBeenCalled();
  });

  it('skips projects with missing or non-string id (lines 119-122)', async () => {
    stubNavigatorStorage();
    localStorage.setItem(
      'pygame_academy_projects',
      JSON.stringify({
        k: { name: 'no-id', template: 't', files: [] },
      })
    );
    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result.skipped).toContain('<missing id>');
  });

  it('skips projects with missing name (lines 123-126)', async () => {
    stubNavigatorStorage();
    localStorage.setItem(
      'pygame_academy_projects',
      JSON.stringify({
        p1: { id: 'p1', template: 't', files: [] },
      })
    );
    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result.skipped).toContain('p1');
  });

  it('skips projects with missing template (lines 127-130)', async () => {
    stubNavigatorStorage();
    localStorage.setItem(
      'pygame_academy_projects',
      JSON.stringify({
        p1: { id: 'p1', name: 'X', files: [] },
      })
    );
    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result.skipped).toContain('p1');
  });

  it('skips projects with non-array files (lines 131-134)', async () => {
    stubNavigatorStorage();
    localStorage.setItem(
      'pygame_academy_projects',
      JSON.stringify({
        p1: { id: 'p1', name: 'X', template: 't', files: 'not-array' },
      })
    );
    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result.skipped).toContain('p1');
  });

  it('skips projects with no wizard-state.json file (lines 143-148)', async () => {
    stubNavigatorStorage();
    localStorage.setItem(
      'pygame_academy_projects',
      JSON.stringify({
        p1: {
          id: 'p1',
          name: 'X',
          template: 't',
          files: [{ path: 'something-else.json', content: '{}' }],
        },
      })
    );
    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result.skipped).toContain('p1');
    expect(opfsMock.saveOpfsProject).not.toHaveBeenCalled();
  });

  it('skips projects whose wizard snapshot fails JSON.parse (lines 151-156)', async () => {
    stubNavigatorStorage();
    localStorage.setItem(
      'pygame_academy_projects',
      JSON.stringify({
        p1: {
          id: 'p1',
          name: 'X',
          template: 't',
          files: [{ path: 'wizard-state.json', content: '{not valid json' }],
        },
      })
    );
    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result.skipped).toContain('p1');
    expect(opfsMock.saveOpfsProject).not.toHaveBeenCalled();
  });
});

describe('opfs-migration — thumbnail + saveOpfs failure paths', () => {
  it('migrates a project with thumbnail data URL → calls saveOpfs with a Blob (line 158-160)', async () => {
    stubNavigatorStorage();
    // jsdom's fetch on data: URLs is unreliable — stub it explicitly.
    const realFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(
      async () =>
        ({
          blob: async () => new Blob(['png-bytes'], { type: 'image/png' }),
        }) as Response
    ) as never;
    localStorage.setItem(
      'pygame_academy_projects',
      JSON.stringify({
        p1: {
          id: 'p1',
          name: 'Robot',
          template: 'platformer',
          files: [
            {
              path: 'wizard-state.json',
              content: JSON.stringify({ version: '1.0.0' }),
            },
          ],
          thumbnailDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
        },
      })
    );
    const result = await migrateLocalStorageProjectsToOpfs();
    globalThis.fetch = realFetch;
    expect(result.migrated).toBe(1);
    const args = opfsMock.saveOpfsProject.mock.calls[0][0];
    expect(args.thumbnailBlob).toBeInstanceOf(Blob);
  });

  it('thumbnail decode failure logs warn but still migrates without thumb (lines 161-164)', async () => {
    stubNavigatorStorage();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Make fetch (which dataUrlToBlob uses) throw.
    const realFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => {
      throw new Error('thumb decode boom');
    }) as never;
    localStorage.setItem(
      'pygame_academy_projects',
      JSON.stringify({
        p1: {
          id: 'p1',
          name: 'X',
          template: 't',
          files: [
            {
              path: 'wizard-state.json',
              content: JSON.stringify({}),
            },
          ],
          thumbnailDataUrl: 'data:image/png;base64,corruptbytes',
        },
      })
    );
    const result = await migrateLocalStorageProjectsToOpfs();
    globalThis.fetch = realFetch;
    expect(result.migrated).toBe(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("couldn't decode thumbnail"),
      expect.any(Error)
    );
    // saveOpfs called WITHOUT a thumbnailBlob.
    const args = opfsMock.saveOpfsProject.mock.calls[0][0];
    expect(args.thumbnailBlob).toBeUndefined();
  });

  it('saveOpfsProject failure → row goes into skipped + sentinel deliberately not written (lines 175-191)', async () => {
    stubNavigatorStorage();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    opfsMock.saveOpfsProject.mockRejectedValue(new Error('OPFS quota exceeded'));
    localStorage.setItem(
      'pygame_academy_projects',
      JSON.stringify({
        p1: {
          id: 'p1',
          name: 'X',
          template: 't',
          files: [{ path: 'wizard-state.json', content: '{}' }],
        },
      })
    );
    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result.migrated).toBe(0);
    expect(result.skipped).toContain('p1');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('failed to migrate project p1'),
      expect.any(Error)
    );
    // The "deliberately not written" warn at line 189-191 fires.
    expect(
      warn.mock.calls.some(
        (c) => typeof c[0] === 'string' && c[0].includes('OPFS write failure')
      )
    ).toBe(true);
  });
});

describe('opfs-migration — sentinel-write failure (line 213-218)', () => {
  it('failed sentinel write logs warn but migration still reports success', async () => {
    stubNavigatorStorage({ sentinelWriteFails: true });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Empty localStorage → migration writes the sentinel + returns ran=true.
    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result.ran).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('failed to write sentinel'),
      expect.any(Error)
    );
  });
});
