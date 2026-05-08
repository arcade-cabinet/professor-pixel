// Cover the getCtx catch branch in src/audio/sfx.ts (line 24-25):
// when `new AudioContext()` throws (Safari private mode, sandboxed
// iframes, autoplay blocked at construction time, etc.) the helper
// must return null, and the playX functions must short-circuit
// gracefully without surfacing the throw to the caller.
//
// The existing audio-sfx.test.ts uses a FakeAudioContext that never
// throws; this suite swaps in a throwing constructor.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Module-scoped flag so vi.mock can read it at module-evaluation time.
let masterAudioOn = true;

vi.mock('@lib/audio/tts', () => ({
  isAudioEnabled: () => masterAudioOn,
}));

class ThrowingAudioContext {
  constructor() {
    throw new DOMException('NotAllowedError: AudioContext blocked');
  }
}

async function freshSfx(): Promise<typeof import('@lib/audio/sfx')> {
  vi.resetModules();
  return await import('@lib/audio/sfx');
}

beforeEach(() => {
  masterAudioOn = true;
  window.localStorage.clear();
  vi.stubGlobal('AudioContext', ThrowingAudioContext);
  delete (window as unknown as Record<string, unknown>).webkitAudioContext;
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('audio/sfx — getCtx catch branch (line 25)', () => {
  it('playSuccess swallows AudioContext construction throw', async () => {
    const sfx = await freshSfx();
    expect(() => sfx.playSuccess()).not.toThrow();
  });

  it('playError swallows AudioContext construction throw', async () => {
    const sfx = await freshSfx();
    expect(() => sfx.playError()).not.toThrow();
  });

  it('playPop swallows AudioContext construction throw', async () => {
    const sfx = await freshSfx();
    expect(() => sfx.playPop()).not.toThrow();
  });
});

describe('audio/sfx — getCtx no-Ctor branch (line 21)', () => {
  it('returns null when neither AudioContext nor webkitAudioContext exists', async () => {
    // Wipe both Ctors so getCtx hits the early-return null at line 21.
    vi.stubGlobal('AudioContext', undefined);
    delete (window as unknown as Record<string, unknown>).webkitAudioContext;
    const sfx = await freshSfx();
    expect(() => sfx.playSuccess()).not.toThrow();
    expect(() => sfx.playError()).not.toThrow();
    expect(() => sfx.playPop()).not.toThrow();
  });
});
