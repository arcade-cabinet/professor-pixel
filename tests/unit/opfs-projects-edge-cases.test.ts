// Cover the opfs-projects.ts edge branches the existing opfs-projects.test.ts
// + projects-opfs-branches.test.ts skip:
//   - line 106: getGamesDir throws OpfsUnavailableError when
//     navigator.storage is missing (drives saveOpfsProject's bubble-up)
//   - line 136: readJsonFile JSON.parse catch returns null (corrupt
//     meta.json on load)
//   - lines 140-141: readJsonFile schema-validation failure logs +
//     returns null
//   - lines 161-164: generateId crypto-less fallback (the polyfill UUID
//     branch when crypto.randomUUID is missing)
//   - line 273: loadOpfsProject thumbnail URL.createObjectURL
//
// All paths hit via a fake FileSystemDirectoryHandle that we plant on
// navigator.storage.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpfsUnavailableError, loadOpfsProject, saveOpfsProject } from '@lib/storage/opfs-projects';

let originalStorage: typeof navigator.storage | undefined;

// Helpers to build fake file/dir handles. We model the OPFS shape just
// enough that the production code can read meta.json + wizard.json +
// thumbnail.png + game.py through them.
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
          // Provide a .text() that reads the blob's content.
          return Object.assign(blob, {
            text: async () =>
              file.content instanceof Blob ? await file.content.text() : (file.content as string),
          });
        },
        createWritable: async () => ({
          write: async (data: string | BufferSource | Blob) => {
            files[name].content = typeof data === 'string' ? data : (data as Blob);
          },
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
    removeEntry: vi.fn(async () => {}),
  };
  return dir as unknown as FileSystemDirectoryHandle;
}

beforeEach(() => {
  originalStorage = navigator.storage;
  // Stub URL.createObjectURL so the thumbnail branch returns a string.
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

describe('opfs-projects — getGamesDir throws OpfsUnavailableError (line 106)', () => {
  it('saveOpfsProject bubbles OpfsUnavailableError when navigator.storage is undefined', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: undefined,
    });
    await expect(
      saveOpfsProject({
        name: 'X',
        template: 't',
        wizardState: { version: '1.0.0' } as never,
      })
    ).rejects.toBeInstanceOf(OpfsUnavailableError);
  });
});

describe('opfs-projects — readJsonFile corrupt-JSON returns null (line 136)', () => {
  it('loadOpfsProject with corrupt meta.json returns null', async () => {
    const projDir = makeFakeDir({
      'project.json': { content: '{not valid json' },
    });
    const gamesDir = makeFakeDir({}, { 'proj-1': projDir });
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: async () => makeFakeDir({}, { games: gamesDir }),
      },
    });
    const result = await loadOpfsProject('proj-1');
    expect(result).toBeNull();
  });
});

describe('opfs-projects — readJsonFile schema fail logs + returns null (lines 140-141)', () => {
  it('loadOpfsProject with meta.json that fails schema validation returns null + warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Plant meta.json with valid JSON but a shape that fails the schema
    // (e.g. missing required `id` or `name`).
    const projDir = makeFakeDir({
      'project.json': { content: JSON.stringify({ totally: 'wrong' }) },
    });
    const gamesDir = makeFakeDir({}, { 'proj-1': projDir });
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: async () => makeFakeDir({}, { games: gamesDir }),
      },
    });
    const result = await loadOpfsProject('proj-1');
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('failed schema validation'),
      expect.any(Array)
    );
  });
});

describe('opfs-projects — generateId crypto-less fallback (lines 161-164)', () => {
  it('saveOpfsProject without crypto.randomUUID still generates a UUID-shaped id', async () => {
    const originalCrypto = globalThis.crypto;
    // Drop crypto.randomUUID so generateId falls into the polyfill.
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
    });

    const gamesDir = makeFakeDir();
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: async () => makeFakeDir({}, { games: gamesDir }),
      },
    });

    const result = await saveOpfsProject({
      name: 'Test',
      template: 't',
      wizardState: {
        version: '1.0.0',
        currentNodeId: 'pickGame',
        gameType: 'platformer',
        selectedAssetIds: [],
        updatedAt: new Date().toISOString(),
      } as never,
    });
    // UUID v4 shape: 8-4-4-4-12 hex chars.
    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );

    // Restore.
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
  });
});

describe('opfs-projects — loadOpfsProject returns null when wizard file missing (line 260)', () => {
  it('returns null when project.json is valid but wizard-state.json is absent', async () => {
    // valid meta loaded, but the wizard file is missing. readJsonFile
    // for wizard-state.json returns null (not in the dir map; the
    // makeFakeDir.getFileHandle throws NotFoundError, readJsonFile
    // catches and returns null). The `if (!wizardState) return null`
    // guard at line 260 takes its truthy arm.
    const validMeta = {
      schema_version: 1,
      id: 'proj-bad',
      name: 'No Wizard',
      template: 't',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const projDir = makeFakeDir({
      'project.json': { content: JSON.stringify(validMeta) },
      // wizard-state.json deliberately absent
    });
    const gamesDir = makeFakeDir({}, { 'proj-bad': projDir });
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: async () => makeFakeDir({}, { games: gamesDir }),
      },
    });
    const result = await loadOpfsProject('proj-bad');
    expect(result).toBeNull();
  });
});

describe('opfs-projects — loadOpfsProject thumbnail URL.createObjectURL (line 273)', () => {
  it('loadOpfsProject with a thumbnail.png file produces a thumbnailUrl', async () => {
    const validMeta = {
      schema_version: 1,
      id: 'proj-1',
      name: 'X',
      template: 't',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const validWizard = {
      version: '1.0.0',
      currentNodeId: 'pickGame',
      gameType: 'platformer',
      selectedAssetIds: [],
      updatedAt: new Date().toISOString(),
    };
    const projDir = makeFakeDir({
      'project.json': { content: JSON.stringify(validMeta) },
      'wizard-state.json': { content: JSON.stringify(validWizard) },
      'thumbnail.png': { content: new Blob(['png-bytes'], { type: 'image/png' }) },
    });
    const gamesDir = makeFakeDir({}, { 'proj-1': projDir });
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: async () => makeFakeDir({}, { games: gamesDir }),
      },
    });
    const result = await loadOpfsProject('proj-1');
    expect(result).not.toBeNull();
    expect(result!.thumbnailUrl).toBe('blob:fake-thumb');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
