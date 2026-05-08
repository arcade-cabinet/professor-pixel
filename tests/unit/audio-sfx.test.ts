import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// IMPORTANT: vi.mock must come BEFORE any import that pulls in the
// module being mocked. The hook imports `isAudioEnabled` from
// `./tts`; we mock that to control the master gate from tests.
let masterAudioOn = true;

vi.mock('@lib/audio/tts', () => ({
  isAudioEnabled: () => masterAudioOn,
}));

// AudioContext is created lazily inside getCtx() the first time a
// play* function fires. Tests stub it on globalThis so the lazy
// constructor finds the mock.
//
// The `ctx` variable inside src/audio/sfx.ts is MODULE-SCOPED — once
// constructed, it's cached for the lifetime of the module. That means
// every test must `vi.resetModules() + dynamic import` to get a fresh
// module with no cached ctx, otherwise a regression where gating
// fails could pass spuriously: getCtx() would return the cached ctx
// without incrementing `audioContextCtorCalls`, and the assertion
// "no construction happened" would silently hold.
interface FakeOsc {
  type: OscillatorType;
  frequency: { value: number };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}
interface FakeGain {
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
}

let createdOscillators: FakeOsc[];
let createdGains: FakeGain[];
let audioContextCtorCalls: number;

class FakeAudioContext {
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  constructor() {
    audioContextCtorCalls += 1;
  }
  createOscillator(): FakeOsc {
    const osc: FakeOsc = {
      type: 'sine',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    createdOscillators.push(osc);
    return osc;
  }
  createGain(): FakeGain {
    const env: FakeGain = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    createdGains.push(env);
    return env;
  }
}

// Helper: reset module + counters and dynamic-import a fresh sfx
// module. Returns the freshly-imported module so each test gets a
// guaranteed-clean `ctx` cache.
async function freshSfx(): Promise<typeof import('@lib/audio/sfx')> {
  vi.resetModules();
  createdOscillators = [];
  createdGains = [];
  audioContextCtorCalls = 0;
  return await import('@lib/audio/sfx');
}

beforeEach(() => {
  masterAudioOn = true;
  createdOscillators = [];
  createdGains = [];
  audioContextCtorCalls = 0;
  window.localStorage.clear();
  vi.stubGlobal('AudioContext', FakeAudioContext);
  // Wipe webkitAudioContext between tests — the fallback path needs
  // explicit absence to be tested independently.
  delete (window as unknown as Record<string, unknown>).webkitAudioContext;
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('isSfxEnabled / setSfxEnabled', () => {
  it('defaults to true when localStorage has no SFX key', async () => {
    const sfx = await freshSfx();
    expect(sfx.isSfxEnabled()).toBe(true);
  });

  it('returns true when SFX key is "1"', async () => {
    window.localStorage.setItem('pp.sfxEnabled', '1');
    const sfx = await freshSfx();
    expect(sfx.isSfxEnabled()).toBe(true);
  });

  it('returns false ONLY when the explicit OFF sentinel "0" is present', async () => {
    window.localStorage.setItem('pp.sfxEnabled', '0');
    const sfx = await freshSfx();
    expect(sfx.isSfxEnabled()).toBe(false);
  });

  it('any value other than "0" is treated as enabled', async () => {
    // Pin "non-0 = on" semantics — protects against a future refactor
    // that accidentally treats arbitrary values as off.
    window.localStorage.setItem('pp.sfxEnabled', 'true');
    const sfx = await freshSfx();
    expect(sfx.isSfxEnabled()).toBe(true);
  });

  it('setSfxEnabled(true) writes "1"', async () => {
    const sfx = await freshSfx();
    sfx.setSfxEnabled(true);
    expect(window.localStorage.getItem('pp.sfxEnabled')).toBe('1');
  });

  it('setSfxEnabled(false) writes "0"', async () => {
    const sfx = await freshSfx();
    sfx.setSfxEnabled(false);
    expect(window.localStorage.getItem('pp.sfxEnabled')).toBe('0');
  });

  it('survives localStorage throwing on getItem (private mode)', async () => {
    const originalGetItem = window.localStorage.getItem;
    window.localStorage.getItem = () => {
      throw new DOMException('SecurityError');
    };
    try {
      const sfx = await freshSfx();
      // Defaults to enabled when the storage check fails — non-vocal
      // SFX, no privacy concern with sounding off in private mode.
      expect(sfx.isSfxEnabled()).toBe(true);
    } finally {
      window.localStorage.getItem = originalGetItem;
    }
  });

  it('setSfxEnabled silently no-ops when localStorage throws', async () => {
    const originalSetItem = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new DOMException('SecurityError');
    };
    try {
      const sfx = await freshSfx();
      expect(() => sfx.setSfxEnabled(false)).not.toThrow();
    } finally {
      window.localStorage.setItem = originalSetItem;
    }
  });
});

describe('playSuccess', () => {
  it('plays a 3-tone major-triad arpeggio when both gates are on', async () => {
    const sfx = await freshSfx();
    sfx.playSuccess();
    // 3 tones (C5, E5, G5) → 3 oscillators + 3 gain envelopes.
    expect(createdOscillators).toHaveLength(3);
    expect(createdGains).toHaveLength(3);
    expect(createdOscillators[0].frequency.value).toBeCloseTo(523.25);
    expect(createdOscillators[1].frequency.value).toBeCloseTo(659.25);
    expect(createdOscillators[2].frequency.value).toBeCloseTo(783.99);
  });

  it('is a no-op when master audio is OFF', async () => {
    masterAudioOn = false;
    const sfx = await freshSfx();
    sfx.playSuccess();
    // No AudioContext should even be constructed.
    expect(audioContextCtorCalls).toBe(0);
    expect(createdOscillators).toHaveLength(0);
  });

  it('is a no-op when SFX channel is OFF (master ON)', async () => {
    window.localStorage.setItem('pp.sfxEnabled', '0');
    const sfx = await freshSfx();
    sfx.playSuccess();
    // Pin both: no construction AND no oscillators. Without the
    // ctor-count check, a gating regression that still hit getCtx()
    // could be hidden by the cached-ctx path.
    expect(audioContextCtorCalls).toBe(0);
    expect(createdOscillators).toHaveLength(0);
  });
});

describe('playError', () => {
  it('plays 2 descending square-wave blips at 220Hz + 174.61Hz', async () => {
    const sfx = await freshSfx();
    sfx.playError();
    expect(createdOscillators).toHaveLength(2);
    expect(createdOscillators[0].type).toBe('square');
    expect(createdOscillators[0].frequency.value).toBeCloseTo(220);
    expect(createdOscillators[1].type).toBe('square');
    expect(createdOscillators[1].frequency.value).toBeCloseTo(174.61);
  });

  it('is a no-op when master audio is OFF (line 75 truthy arm)', async () => {
    masterAudioOn = false;
    const sfx = await freshSfx();
    sfx.playError();
    expect(audioContextCtorCalls).toBe(0);
    expect(createdOscillators).toHaveLength(0);
  });
});

describe('playPop', () => {
  it('plays a single short triangle blip at 880Hz', async () => {
    const sfx = await freshSfx();
    sfx.playPop();
    expect(createdOscillators).toHaveLength(1);
    expect(createdOscillators[0].type).toBe('triangle');
    expect(createdOscillators[0].frequency.value).toBeCloseTo(880);
  });

  it('is a no-op when master audio is OFF (line 82 truthy arm)', async () => {
    masterAudioOn = false;
    const sfx = await freshSfx();
    sfx.playPop();
    expect(audioContextCtorCalls).toBe(0);
    expect(createdOscillators).toHaveLength(0);
  });
});

describe('AudioContext lifecycle', () => {
  it('does NOT construct AudioContext during module import (lazy init)', async () => {
    // Counter MUST be reset BEFORE the import so we can catch a
    // regression where the module eagerly constructs a context at
    // top level. If we reset after, an eager ctor would silently be
    // erased and the test would pass spuriously.
    vi.resetModules();
    createdOscillators = [];
    createdGains = [];
    audioContextCtorCalls = 0;
    await import('@lib/audio/sfx');
    expect(audioContextCtorCalls).toBe(0);
  });

  it('lazily constructs AudioContext on first play and reuses it on subsequent plays', async () => {
    vi.resetModules();
    createdOscillators = [];
    createdGains = [];
    audioContextCtorCalls = 0;
    const sfx = await import('@lib/audio/sfx');

    expect(audioContextCtorCalls).toBe(0);
    sfx.playPop();
    expect(audioContextCtorCalls).toBe(1);
    sfx.playPop();
    sfx.playSuccess();
    // Module-level cached ctx — subsequent plays reuse the same
    // instance. Pin this so a future refactor doesn't accidentally
    // re-construct on every call (would explode under rapid playback).
    expect(audioContextCtorCalls).toBe(1);
  });

  it('falls back to webkitAudioContext when AudioContext is undefined (legacy Safari)', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('AudioContext', undefined);
    (window as unknown as Record<string, unknown>).webkitAudioContext = FakeAudioContext;
    const sfx = await freshSfx();
    sfx.playPop();
    expect(audioContextCtorCalls).toBe(1);
  });

  it('silently no-ops when neither AudioContext nor webkitAudioContext is available', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('AudioContext', undefined);
    delete (window as unknown as Record<string, unknown>).webkitAudioContext;
    const sfx = await freshSfx();
    expect(() => sfx.playPop()).not.toThrow();
    expect(createdOscillators).toHaveLength(0);
  });
});
