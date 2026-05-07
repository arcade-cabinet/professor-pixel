import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Unit-side tests for opfs-projects.ts paths that don't actually
// touch navigator.storage. The happy-path OPFS round-trip lives in
// tests/component/opfs-projects.test.ts (real Chromium).

import {
  OpfsUnavailableError,
  ProjectNotFoundError,
  isOpfsProjectsAvailable,
} from '@lib/storage/opfs-projects';

describe('OpfsUnavailableError + ProjectNotFoundError', () => {
  it('OpfsUnavailableError is an Error subclass with the right name', () => {
    const e = new OpfsUnavailableError();
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('OpfsUnavailableError');
    expect(e.message.length).toBeGreaterThan(0);
  });

  it('ProjectNotFoundError carries the missing id', () => {
    const e = new ProjectNotFoundError('proj-123');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('ProjectNotFoundError');
    expect(e.message).toContain('proj-123');
  });
});

describe('isOpfsProjectsAvailable — feature-detection branches', () => {
  let originalStorage: typeof navigator.storage | undefined;

  beforeEach(() => {
    // Cache the original so each test can swap it out per branch.
    originalStorage = navigator.storage;
  });

  afterEach(() => {
    if (originalStorage) {
      Object.defineProperty(navigator, 'storage', {
        configurable: true,
        value: originalStorage,
      });
    }
  });

  it('returns false when navigator.storage.getDirectory is missing', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {} as StorageManager,
    });
    expect(await isOpfsProjectsAvailable()).toBe(false);
  });

  it('returns false when navigator.storage.getDirectory rejects', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: vi.fn().mockRejectedValue(new Error('opfs unavailable')),
      } as unknown as StorageManager,
    });
    expect(await isOpfsProjectsAvailable()).toBe(false);
  });

  it('returns true when getDirectory resolves', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: vi.fn().mockResolvedValue({} as FileSystemDirectoryHandle),
      } as unknown as StorageManager,
    });
    expect(await isOpfsProjectsAvailable()).toBe(true);
  });
});
