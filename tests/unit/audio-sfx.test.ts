import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// IMPORTANT: vi.mock must come BEFORE any import that pulls in the
// module being mocked. The hook imports `isAudioEnabled` from
// `./tts`; we mock that to control the master gate from tests.
let masterAudioOn = true;

vi.mock('@lib/audio/tts', () => ({
  isAudioEnabled: () => masterAudioOn,
}));

import { isSfxEnabled, setSfxEnabled, playSuccess, playError, playPop } from '@lib/audio/sfx';

// AudioContext is created lazily inside getCtx() the first time a
// play* function fires. The test stubs it on globalThis so the lazy
// constructor finds the mock.
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
  // Reset the module-level `ctx` cache so the next test gets a fresh
  // AudioContext instance. Re-import via vi.resetModules would also
  // work but is heavier; relying on the fact that
  // `audioContextCtorCalls` is reset in beforeEach is what matters
  // for assertions, not the cached ctx itself.
});

describe('isSfxEnabled / setSfxEnabled', () => {
  it('defaults to true when localStorage has no SFX key', () => {
    expect(isSfxEnabled()).toBe(true);
  });

  it('returns true when SFX key is "1"', () => {
    window.localStorage.setItem('pp.sfxEnabled', '1');
    expect(isSfxEnabled()).toBe(true);
  });

  it('returns false ONLY when the explicit OFF sentinel "0" is present', () => {
    window.localStorage.setItem('pp.sfxEnabled', '0');
    expect(isSfxEnabled()).toBe(false);
  });

  it('any value other than "0" is treated as enabled', () => {
    // Pin "non-0 = on" semantics — protects against a future refactor
    // that accidentally treats arbitrary values as off.
    window.localStorage.setItem('pp.sfxEnabled', 'true');
    expect(isSfxEnabled()).toBe(true);
  });

  it('setSfxEnabled(true) writes "1"', () => {
    setSfxEnabled(true);
    expect(window.localStorage.getItem('pp.sfxEnabled')).toBe('1');
  });

  it('setSfxEnabled(false) writes "0"', () => {
    setSfxEnabled(false);
    expect(window.localStorage.getItem('pp.sfxEnabled')).toBe('0');
  });

  it('survives localStorage throwing on getItem (private mode)', () => {
    const originalGetItem = window.localStorage.getItem;
    window.localStorage.getItem = () => {
      throw new DOMException('SecurityError');
    };
    try {
      // Defaults to enabled when the storage check fails — non-vocal
      // SFX, no privacy concern with sounding off in private mode.
      expect(isSfxEnabled()).toBe(true);
    } finally {
      window.localStorage.getItem = originalGetItem;
    }
  });

  it('setSfxEnabled silently no-ops when localStorage throws', () => {
    const originalSetItem = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new DOMException('SecurityError');
    };
    try {
      expect(() => setSfxEnabled(false)).not.toThrow();
    } finally {
      window.localStorage.setItem = originalSetItem;
    }
  });
});

describe('playSuccess', () => {
  it('plays a 3-tone major-triad arpeggio when both gates are on', () => {
    playSuccess();
    // 3 tones (C5, E5, G5) → 3 oscillators + 3 gain envelopes.
    expect(createdOscillators).toHaveLength(3);
    expect(createdGains).toHaveLength(3);
    expect(createdOscillators[0].frequency.value).toBeCloseTo(523.25);
    expect(createdOscillators[1].frequency.value).toBeCloseTo(659.25);
    expect(createdOscillators[2].frequency.value).toBeCloseTo(783.99);
  });

  it('is a no-op when master audio is OFF', () => {
    masterAudioOn = false;
    playSuccess();
    // No AudioContext should even be constructed.
    expect(audioContextCtorCalls).toBe(0);
    expect(createdOscillators).toHaveLength(0);
  });

  it('is a no-op when SFX channel is OFF (master ON)', () => {
    window.localStorage.setItem('pp.sfxEnabled', '0');
    playSuccess();
    expect(createdOscillators).toHaveLength(0);
  });
});

describe('playError', () => {
  it('plays 2 descending square-wave blips at 220Hz + 174.61Hz', () => {
    playError();
    expect(createdOscillators).toHaveLength(2);
    expect(createdOscillators[0].type).toBe('square');
    expect(createdOscillators[0].frequency.value).toBeCloseTo(220);
    expect(createdOscillators[1].type).toBe('square');
    expect(createdOscillators[1].frequency.value).toBeCloseTo(174.61);
  });
});

describe('playPop', () => {
  it('plays a single short triangle blip at 880Hz', () => {
    playPop();
    expect(createdOscillators).toHaveLength(1);
    expect(createdOscillators[0].type).toBe('triangle');
    expect(createdOscillators[0].frequency.value).toBeCloseTo(880);
  });
});

// AudioContext lifecycle uses vi.resetModules() + dynamic re-import
// to clear sfx.ts's module-level `ctx` cache between tests. The
// "earlier tests" in this file already cached a FakeAudioContext, so
// without a module reset, lifecycle tests would see the stale ctx and
// skip the constructor entirely.
describe('AudioContext lifecycle', () => {
  it('lazily constructs AudioContext on first play and reuses it on subsequent plays', async () => {
    vi.resetModules();
    const sfx = await import('@lib/audio/sfx');
    audioContextCtorCalls = 0;

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
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.stubGlobal('AudioContext', undefined);
    (window as unknown as Record<string, unknown>).webkitAudioContext = FakeAudioContext;
    audioContextCtorCalls = 0;

    const sfx = await import('@lib/audio/sfx');
    sfx.playPop();
    expect(audioContextCtorCalls).toBe(1);
  });

  it('silently no-ops when neither AudioContext nor webkitAudioContext is available', async () => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.stubGlobal('AudioContext', undefined);
    delete (window as unknown as Record<string, unknown>).webkitAudioContext;
    createdOscillators = [];

    const sfx = await import('@lib/audio/sfx');
    expect(() => sfx.playPop()).not.toThrow();
    expect(createdOscillators).toHaveLength(0);
  });
});
