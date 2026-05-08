import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Cover the SSR-style typeof guards in src/storage/opfs-projects.ts
// that the existing OPFS tests skip because jsdom always exposes
// navigator:
//   - line 94: isOpfsProjectsAvailable() returns false when navigator
//     is undefined
//   - line 293: __clearAllOpfsProjectsForTests() bails when navigator
//     is undefined or .storage.getDirectory is missing
//
// vi.resetModules + vi.stubGlobal('navigator', undefined) so the
// import-time + call-time typeof checks both see the missing global.

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('opfs-projects SSR — no navigator (lines 94, 293)', () => {
  it('isOpfsProjectsAvailable() resolves to false when navigator is undefined', async () => {
    vi.stubGlobal('navigator', undefined);
    const mod = await import('@lib/storage/opfs-projects');
    expect(await mod.isOpfsProjectsAvailable()).toBe(false);
  });

  it('__clearAllOpfsProjectsForTests is a no-op when navigator is undefined', async () => {
    vi.stubGlobal('navigator', undefined);
    const mod = await import('@lib/storage/opfs-projects');
    await expect(mod.__clearAllOpfsProjectsForTests()).resolves.toBeUndefined();
  });
});
