// Cover the listOpfsProjects iteration + gamePy / thumbnail load
// branches and deleteOpfsProject in src/storage/opfs-projects.ts that
// the existing projects-opfs-branches.test.ts skips because it mocks
// the entire opfs-projects module.
//
// Specifically:
//   - lines 213-217: listOpfsProjects iterates `games.values()`,
//     skips entries that aren't directories, and skips dirs whose
//     project.json fails to load
//   - lines 262-268: loadOpfsProject's optional game.py text load
//     (success path: file exists; failure path: file absent)
//   - lines 282-289: deleteOpfsProject calls removeEntry, swallows
//     NotFoundError so the operation is idempotent

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listOpfsProjects,
  loadOpfsProject,
  deleteOpfsProject,
} from '@lib/storage/opfs-projects';

let originalStorage: typeof navigator.storage | undefined;

type FakeFile = { content: string | Blob; type?: string };

function makeFakeDir(
  files: Record<string, FakeFile> = {},
  subdirs: Record<string, FileSystemDirectoryHandle> = {}
): FileSystemDirectoryHandle {
  const dir = {
    kind: 'directory' as const,
    name: 'fake',
    getFileHandle: vi.fn(async (name: string, options?: { create?: boolean }) => {
      if (!(name in files)) {
        if (options?.create) {
          files[name] = { content: '' };
        } else {
          throw new DOMException(`File not found: ${name}`, 'NotFoundError');
        }
      }
      const file = files[name];
      return {
        kind: 'file',
        name,
        getFile: async () => {
          const blob =
            file.content instanceof Blob
              ? file.content
              : new Blob([file.content], { type: file.type ?? 'text/plain' });
          return Object.assign(blob, {
            text: async () =>
              file.content instanceof Blob
                ? await file.content.text()
                : (file.content as string),
          });
        },
        createWritable: async () => ({
          write: async () => {},
          close: async () => {},
        }),
      } as unknown as FileSystemFileHandle;
    }),
    getDirectoryHandle: vi.fn(async (name: string, options?: { create?: boolean }) => {
      if (!(name in subdirs)) {
        if (options?.create) {
          subdirs[name] = makeFakeDir();
        } else {
          throw new DOMException(`Dir not found: ${name}`, 'NotFoundError');
        }
      }
      return subdirs[name];
    }),
    removeEntry: vi.fn(async (name: string) => {
      if (!(name in subdirs)) {
        throw new DOMException(`Not found: ${name}`, 'NotFoundError');
      }
      delete subdirs[name];
    }),
    // listOpfsProjects iterates with for-await-of on `dir.values()`.
    values: async function* () {
      for (const name in subdirs) {
        yield subdirs[name];
      }
      for (const name in files) {
        // Yield a file-shaped entry to exercise the kind !== 'directory'
        // skip in listOpfsProjects.
        yield {
          kind: 'file',
          name,
        } as unknown as FileSystemHandle;
      }
    },
  };
  return dir as unknown as FileSystemDirectoryHandle;
}

const validMeta = (id: string) => ({
  schema_version: 1,
  id,
  name: 'X',
  template: 't',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const validWizard = {
  version: '1.0.0',
  currentNodeId: 'pickGame',
  gameType: 'platformer',
  selectedAssetIds: [],
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  originalStorage = navigator.storage;
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake-thumb');
  globalThis.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  if (originalStorage) {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: originalStorage,
    });
  }
  vi.restoreAllMocks();
});

describe('listOpfsProjects — iteration (lines 213-217)', () => {
  it('lists each directory entry, skips file entries, skips corrupt-meta dirs', async () => {
    // proj-1: valid meta — should appear in the list.
    const proj1 = makeFakeDir({
      'project.json': { content: JSON.stringify(validMeta('proj-1')) },
    });
    // proj-2: corrupt meta — should be skipped.
    const proj2 = makeFakeDir({
      'project.json': { content: 'not-json' },
    });
    // games dir holds both subdirs PLUS a stray file at the top level.
    const gamesDir = makeFakeDir(
      { 'stray.txt': { content: 'rogue file' } },
      { 'proj-1': proj1, 'proj-2': proj2 }
    );
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: async () => makeFakeDir({}, { games: gamesDir }),
      },
    });

    const list = await listOpfsProjects();
    // Only proj-1 surfaces — proj-2's corrupt meta is skipped, and the
    // stray.txt entry is filtered out by the kind !== 'directory' check.
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('proj-1');
  });
});

describe('loadOpfsProject — optional game.py load (lines 262-268)', () => {
  it('returns gamePy text when game.py exists in the project dir', async () => {
    const projDir = makeFakeDir({
      'project.json': { content: JSON.stringify(validMeta('proj-1')) },
      'wizard-state.json': { content: JSON.stringify(validWizard) },
      'game.py': { content: 'print("hi")' },
    });
    const gamesDir = makeFakeDir({}, { 'proj-1': projDir });
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: async () => makeFakeDir({}, { games: gamesDir }),
      },
    });

    const result = await loadOpfsProject('proj-1');
    expect(result?.gamePy).toBe('print("hi")');
  });

  it('returns gamePy=null when game.py is absent (older saves predate the launcher)', async () => {
    const projDir = makeFakeDir({
      'project.json': { content: JSON.stringify(validMeta('proj-1')) },
      'wizard-state.json': { content: JSON.stringify(validWizard) },
      // No game.py.
    });
    const gamesDir = makeFakeDir({}, { 'proj-1': projDir });
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: async () => makeFakeDir({}, { games: gamesDir }),
      },
    });

    const result = await loadOpfsProject('proj-1');
    expect(result?.gamePy).toBeNull();
  });
});

describe('deleteOpfsProject — idempotent removeEntry (lines 282-289)', () => {
  it('removes the project directory when it exists', async () => {
    const projDir = makeFakeDir({
      'project.json': { content: JSON.stringify(validMeta('proj-1')) },
    });
    const gamesDir = makeFakeDir({}, { 'proj-1': projDir });
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: async () => makeFakeDir({}, { games: gamesDir }),
      },
    });

    await expect(deleteOpfsProject('proj-1')).resolves.toBeUndefined();
    // After delete, listing should not include it.
    expect(await listOpfsProjects()).toHaveLength(0);
  });

  it('idempotently swallows NotFoundError when the project is already gone', async () => {
    const gamesDir = makeFakeDir(); // empty
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: async () => makeFakeDir({}, { games: gamesDir }),
      },
    });
    await expect(deleteOpfsProject('never-existed')).resolves.toBeUndefined();
  });
});
