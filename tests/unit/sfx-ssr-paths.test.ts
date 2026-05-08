import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Cover the SSR-style typeof guards in src/audio/sfx.ts that the
// existing audio-sfx*.test.ts suite skips:
//   - line 15: getCtx() falsy when typeof window === 'undefined'
//   - line 90: isSfxEnabled() returns false when typeof localStorage === 'undefined'
//   - line 100: setSfxEnabled() bails when typeof localStorage === 'undefined'
//
// jsdom always exposes window + localStorage. To cover the missing-global
// arms we stub each global to undefined and re-import the module so the
// import-time + call-time typeof checks both see the missing global.

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('sfx — SSR fallbacks (line 15: no window in getCtx)', () => {
  it('playPop is a no-op when window is undefined', async () => {
    // Without window there is no AudioContext to construct. playPop must
    // bail through audioOk → tone → getCtx without throwing.
    vi.stubGlobal('window', undefined);
    const mod = await import('@lib/audio/sfx');
    expect(() => mod.playPop()).not.toThrow();
  });
});

describe('sfx — isSfxEnabled SSR (line 90: no localStorage)', () => {
  it("returns false when typeof localStorage === 'undefined'", async () => {
    // The default-on contract only fires inside the try; the no-storage
    // arm hard-codes false (SFX cannot persist without storage, and
    // false is the safer fallback for SSR — silent until hydrated).
    vi.stubGlobal('localStorage', undefined);
    const mod = await import('@lib/audio/sfx');
    expect(mod.isSfxEnabled()).toBe(false);
  });
});

describe('sfx — setSfxEnabled SSR (line 100: no localStorage)', () => {
  it('is a no-op when typeof localStorage === "undefined"', async () => {
    vi.stubGlobal('localStorage', undefined);
    const mod = await import('@lib/audio/sfx');
    expect(() => mod.setSfxEnabled(true)).not.toThrow();
    expect(() => mod.setSfxEnabled(false)).not.toThrow();
  });
});
