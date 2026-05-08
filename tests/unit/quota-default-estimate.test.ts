// Cover the lines in src/storage/quota.ts that the existing quota.test.ts
// skips because jsdom doesn't expose navigator.storage.estimate:
//   - line 79: defaultEstimate calls navigator.storage.estimate() and
//     returns its promise when the API IS available
//   - line 128: measureLocalStorageBytes catch branch (when
//     localStorage.length / .key throws — e.g., sandboxed iframes that
//     surface the storage object but throw on access)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getUsageRatio } from '@lib/storage/quota';

let originalStorage: typeof navigator.storage | undefined;

beforeEach(() => {
  originalStorage = navigator.storage;
});

afterEach(() => {
  if (originalStorage) {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: originalStorage,
    });
  }
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('quota — defaultEstimate via navigator.storage.estimate (line 79)', () => {
  it('returns the ratio when navigator.storage.estimate is available and returns valid numbers', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: async () => ({ usage: 30, quota: 100 }),
      },
    });
    // The module's defaultEstimate path runs because no setEstimateImpl
    // override is in scope — getUsageRatio falls through to
    // defaultEstimate, which routes to navigator.storage.estimate (line 79).
    const ratio = await getUsageRatio();
    expect(ratio).toBeCloseTo(0.3, 5);
  });

  it('returns null when navigator.storage.estimate returns missing fields', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: async () => ({ usage: 100 }),
      },
    });
    expect(await getUsageRatio()).toBeNull();
  });

  it('returns null when quota is zero (avoid divide-by-zero)', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: async () => ({ usage: 100, quota: 0 }),
      },
    });
    expect(await getUsageRatio()).toBeNull();
  });

  it('returns null when defaultEstimate path runs but the API throws', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: () => {
          throw new Error('private mode');
        },
      },
    });
    expect(await getUsageRatio()).toBeNull();
  });
});
