/**
 * One-shot localStorage→OPFS migration for pre-launcher saves.
 *
 * Browser mode (real Chromium via @vitest/browser) is mandatory:
 * navigator.storage.getDirectory() doesn't exist in jsdom and we
 * exercise real localStorage AND real OPFS in the same test.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetMigrationForTests,
  migrateLocalStorageProjectsToOpfs,
} from '@lib/storage/opfs-migration';
import {
  __clearAllOpfsProjectsForTests,
  listOpfsProjects,
  loadOpfsProject,
} from '@lib/storage/opfs-projects';

const LOCALSTORAGE_KEY = 'pygame_academy_projects';
const SENTINEL_FILE = 'migration-from-localstorage-v1.done';

async function clearSentinel() {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(SENTINEL_FILE);
  } catch {
    // Already gone.
  }
}

describe('localStorage → OPFS launcher migration', () => {
  beforeEach(async () => {
    __resetMigrationForTests();
    await __clearAllOpfsProjectsForTests();
    await clearSentinel();
    localStorage.removeItem(LOCALSTORAGE_KEY);
  });
  afterEach(async () => {
    __resetMigrationForTests();
    await __clearAllOpfsProjectsForTests();
    await clearSentinel();
    localStorage.removeItem(LOCALSTORAGE_KEY);
  });

  it('migrates two localStorage projects into OPFS, preserves ids', async () => {
    const projects = {
      'id-1': {
        id: 'id-1',
        userId: 'anonymous-user',
        name: 'Robot Quest',
        template: 'platformer',
        published: false,
        files: [
          {
            path: 'wizard-state.json',
            content: JSON.stringify({ version: '1.0.0', gameType: 'platformer' }),
          },
        ],
        assets: [],
        createdAt: new Date().toISOString(),
      },
      'id-2': {
        id: 'id-2',
        userId: 'anonymous-user',
        name: 'Knight',
        template: 'shooter',
        published: false,
        files: [
          {
            path: 'wizard-state.json',
            content: JSON.stringify({ version: '1.0.0', gameType: 'shooter' }),
          },
        ],
        assets: [],
        createdAt: new Date().toISOString(),
      },
    };
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(projects));

    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result.ran).toBe(true);
    expect(result.migrated).toBe(2);
    expect(result.skipped).toEqual([]);

    const list = await listOpfsProjects();
    expect(list.map((p) => p.id).sort()).toEqual(['id-1', 'id-2']);

    const loaded = await loadOpfsProject('id-1');
    expect(loaded?.meta.name).toBe('Robot Quest');
    expect(loaded?.wizardState.gameType).toBe('platformer');
  });

  it('is idempotent — second invocation reports ran=false', async () => {
    localStorage.setItem(
      LOCALSTORAGE_KEY,
      JSON.stringify({
        x: {
          id: 'x',
          userId: 'anonymous-user',
          name: 'X',
          template: 'platformer',
          published: false,
          files: [{ path: 'wizard-state.json', content: '{"version":"1.0.0"}' }],
          assets: [],
          createdAt: new Date().toISOString(),
        },
      })
    );
    const first = await migrateLocalStorageProjectsToOpfs();
    expect(first.ran).toBe(true);
    expect(first.migrated).toBe(1);

    // Reset the in-memory promise cache so we'd otherwise re-run; the
    // sentinel file should still gate it.
    __resetMigrationForTests();
    const second = await migrateLocalStorageProjectsToOpfs();
    expect(second.ran).toBe(false);
    expect(second.migrated).toBe(0);
  });

  it('does NOT delete the localStorage entries (safety net for one release)', async () => {
    const initial = JSON.stringify({
      y: {
        id: 'y',
        userId: 'anonymous-user',
        name: 'Y',
        template: 'platformer',
        published: false,
        files: [{ path: 'wizard-state.json', content: '{"version":"1.0.0"}' }],
        assets: [],
        createdAt: new Date().toISOString(),
      },
    });
    localStorage.setItem(LOCALSTORAGE_KEY, initial);
    await migrateLocalStorageProjectsToOpfs();
    expect(localStorage.getItem(LOCALSTORAGE_KEY)).toBe(initial);
  });

  it('skips projects with corrupt wizard-state JSON without aborting the batch', async () => {
    localStorage.setItem(
      LOCALSTORAGE_KEY,
      JSON.stringify({
        ok: {
          id: 'ok',
          userId: 'anonymous-user',
          name: 'OK',
          template: 'platformer',
          published: false,
          files: [{ path: 'wizard-state.json', content: '{"version":"1.0.0"}' }],
          assets: [],
          createdAt: new Date().toISOString(),
        },
        bad: {
          id: 'bad',
          userId: 'anonymous-user',
          name: 'Bad',
          template: 'platformer',
          published: false,
          files: [{ path: 'wizard-state.json', content: '{not valid json' }],
          assets: [],
          createdAt: new Date().toISOString(),
        },
      })
    );
    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result.migrated).toBe(1);
    expect(result.skipped).toContain('bad');
    expect((await listOpfsProjects()).map((p) => p.id)).toEqual(['ok']);
  });

  it('handles empty localStorage gracefully — writes sentinel, migrates zero', async () => {
    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result.ran).toBe(true);
    expect(result.migrated).toBe(0);
    // Re-run should now be sentinel-gated.
    __resetMigrationForTests();
    const second = await migrateLocalStorageProjectsToOpfs();
    expect(second.ran).toBe(false);
  });

  it('survives a corrupt localStorage payload by writing sentinel and reporting zero', async () => {
    localStorage.setItem(LOCALSTORAGE_KEY, '{not parseable');
    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result.ran).toBe(true);
    expect(result.migrated).toBe(0);
    // Sentinel must have been written so we don't retry-storm.
    __resetMigrationForTests();
    const second = await migrateLocalStorageProjectsToOpfs();
    expect(second.ran).toBe(false);
  });
});
