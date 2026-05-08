// Cover the SSR + no-addEventListener paths in src/audio/tts.ts that
// the existing tts-* suites skip:
//   - line 51 path 1 falsy: synth without addEventListener (older
//     embedded webviews / certain mobile browsers expose
//     speechSynthesis but not the EventTarget mixin). The voiceschanged
//     listener install short-circuits but ensureVoicesChangedListener
//     itself still returns cleanly.
//   - line 162 path 0 truthy: setAudioEnabled returns early when
//     localStorage is undefined (SSR).
//   - line 175 path 1 falsy: setAudioEnabled does NOT dispatch the
//     audio-changed event when window is undefined — the typeof guard
//     short-circuits.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('tts — ensureVoicesChangedListener with synth lacking addEventListener (line 51 falsy)', () => {
  it('does not throw when speak() runs against a synth missing addEventListener', async () => {
    // Some embedded webviews ship speechSynthesis as a plain object
    // without the EventTarget mixin. The line-51 guard
    // `typeof synth.addEventListener === 'function'` falsy arm prevents
    // us from crashing in that environment; the listener simply isn't
    // installed and pickVoice runs against whatever getVoices() returns.
    const fakeVoice = {
      lang: 'en-US',
      name: 'Stub',
      voiceURI: 'stub',
      localService: true,
      default: true,
    } as unknown as SpeechSynthesisVoice;
    const synth = {
      // No addEventListener / removeEventListener.
      getVoices: () => [fakeVoice],
      speak: vi.fn(),
      cancel: vi.fn(),
    } as unknown as SpeechSynthesis;
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: synth,
    });
    // Stub SpeechSynthesisUtterance so the speak() call doesn't crash on
    // the global constructor reference.
    class FakeUtterance {
      voice: SpeechSynthesisVoice | null = null;
      rate = 1;
      pitch = 1;
      constructor(public text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: FakeUtterance,
    });
    const mod = await import('@lib/audio/tts');
    expect(() => mod.speak('hello')).not.toThrow();
    expect(synth.speak).toHaveBeenCalled();
    Reflect.deleteProperty(window, 'speechSynthesis');
    Reflect.deleteProperty(window, 'SpeechSynthesisUtterance');
  });
});

describe('tts — setAudioEnabled SSR guards (lines 162, 175)', () => {
  it('returns early when localStorage is undefined (line 162 truthy)', async () => {
    vi.stubGlobal('localStorage', undefined);
    const mod = await import('@lib/audio/tts');
    // No throw on either polarity — the function is a no-op without
    // localStorage and bails before the dispatch path.
    expect(() => mod.setAudioEnabled(true)).not.toThrow();
    expect(() => mod.setAudioEnabled(false)).not.toThrow();
  });

  it('does not dispatch audio-changed when window is undefined (line 175 falsy)', async () => {
    // localStorage must remain available so we get past line 162. We
    // stub window to undefined globally — but localStorage is implemented
    // on Window in jsdom, so we plumb a fresh fake.
    const lsBacking = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => lsBacking.get(k) ?? null,
      setItem: (k: string, v: string) => lsBacking.set(k, v),
      removeItem: (k: string) => lsBacking.delete(k),
      clear: () => lsBacking.clear(),
      key: () => null,
      get length() {
        return lsBacking.size;
      },
    });
    vi.stubGlobal('window', undefined);
    const mod = await import('@lib/audio/tts');
    expect(() => mod.setAudioEnabled(true)).not.toThrow();
    // Even though setAudioEnabled wrote to localStorage, no window event
    // dispatch happened (the falsy arm). lsBacking has the key set.
    expect(lsBacking.get('pp.audioEnabled')).toBe('1');
  });
});
