import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Unit-side coverage for opfs-migration.ts: the paths that bail early
// without requiring real OPFS. Browser-mode tests in
// tests/component/opfs-migration.test.ts cover the happy path against
// a real navigator.storage.getDirectory() in Chromium.

// vi.hoisted runs the factory ahead of vi.mock hoisting, so the mock
// fns survive the reorder.
const opfsMock = vi.hoisted(() => ({
  isOpfsProjectsAvailable: vi.fn(),
  saveOpfsProject: vi.fn(),
}));

vi.mock('@lib/storage/opfs-projects', () => opfsMock);

import {
  __resetMigrationForTests,
  migrateLocalStorageProjectsToOpfs,
} from '@lib/storage/opfs-migration';

beforeEach(() => {
  __resetMigrationForTests();
  opfsMock.isOpfsProjectsAvailable.mockReset();
  opfsMock.saveOpfsProject.mockReset();
  localStorage.clear();
});

afterEach(() => {
  __resetMigrationForTests();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('migrateLocalStorageProjectsToOpfs — early bails', () => {
  it('returns ran=false when OPFS is unavailable', async () => {
    opfsMock.isOpfsProjectsAvailable.mockResolvedValue(false);
    const result = await migrateLocalStorageProjectsToOpfs();
    expect(result).toEqual({ ran: false, migrated: 0, skipped: [] });
    expect(opfsMock.saveOpfsProject).not.toHaveBeenCalled();
  });

  it('caches the bootstrap promise — concurrent callers share one run', async () => {
    opfsMock.isOpfsProjectsAvailable.mockResolvedValue(false);
    const [a, b] = await Promise.all([
      migrateLocalStorageProjectsToOpfs(),
      migrateLocalStorageProjectsToOpfs(),
    ]);
    expect(a).toBe(b);
    // Even with two callers, the OPFS-availability probe ran exactly once.
    expect(opfsMock.isOpfsProjectsAvailable).toHaveBeenCalledTimes(1);
  });

  it('__resetMigrationForTests clears the cached promise', async () => {
    opfsMock.isOpfsProjectsAvailable.mockResolvedValue(false);
    await migrateLocalStorageProjectsToOpfs();
    __resetMigrationForTests();
    await migrateLocalStorageProjectsToOpfs();
    expect(opfsMock.isOpfsProjectsAvailable).toHaveBeenCalledTimes(2);
  });
});
