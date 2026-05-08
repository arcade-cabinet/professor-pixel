import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Cover SSR-style typeof guards in src/storage/profile.ts that the
// existing profile suite skips because jsdom always exposes
// localStorage:
//   - line 31: loadProfile() returns null when localStorage is missing
//   - line 120: saveProfile() skips writing when localStorage is missing
//     (still returns the merged in-memory profile shape)
//   - line 131: clearProfile() is a no-op when localStorage is missing

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('profile storage SSR — loadProfile (line 31)', () => {
  it("returns null when typeof localStorage === 'undefined'", async () => {
    vi.stubGlobal('localStorage', undefined);
    const mod = await import('@lib/storage/profile');
    expect(mod.loadProfile()).toBeNull();
  });
});

describe('profile storage SSR — saveProfile (line 120)', () => {
  it('does not write when localStorage is missing but still returns the merged profile', async () => {
    vi.stubGlobal('localStorage', undefined);
    const mod = await import('@lib/storage/profile');
    // saveProfile takes a patch; with no existing profile + no
    // localStorage, the function still returns a fresh profile with
    // the supplied name, demonstrating it didn't throw on the missing
    // setItem path.
    const result = mod.saveProfile({ name: 'Pixel' });
    expect(result.name).toBe('Pixel');
    expect(typeof result.createdAt).toBe('string');
  });
});

describe('profile storage SSR — clearProfile (line 131)', () => {
  it('is a no-op when localStorage is missing', async () => {
    vi.stubGlobal('localStorage', undefined);
    const mod = await import('@lib/storage/profile');
    expect(() => mod.clearProfile()).not.toThrow();
  });
});
