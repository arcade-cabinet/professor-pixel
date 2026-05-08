import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Cover the speak() / pickVoice() / prewarmTTSVoices() paths in
// src/audio/tts.ts. jsdom doesn't ship a SpeechSynthesis implementation
// so the surrounding test suite (tts-subscribe.test.ts) only exercises
// the audio-toggle helpers. Here we stub window.speechSynthesis so the
// branch arms inside speak/pickVoice get hit:
//   - speak early-returns when TTS unavailable / audio disabled
//   - speak defers to pendingFirstSpeak when voices not yet loaded
//   - pickVoice short-circuits through en-US / en / first / null
//   - voiceschanged listener flushes a deferred utterance
//   - prewarmTTSVoices is a no-op without TTS

type FakeSynth = {
  cancel: ReturnType<typeof vi.fn>;
  speak: ReturnType<typeof vi.fn>;
  getVoices: () => SpeechSynthesisVoice[];
  addEventListener?: (event: string, cb: () => void) => void;
  _voicesChangedHandlers: Array<() => void>;
  _voices: SpeechSynthesisVoice[];
};

function makeFakeSynth(voices: SpeechSynthesisVoice[] = []): FakeSynth {
  const synth: FakeSynth = {
    _voices: voices,
    _voicesChangedHandlers: [],
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices() {
      return synth._voices;
    },
    addEventListener(event, cb) {
      if (event === 'voiceschanged') synth._voicesChangedHandlers.push(cb);
    },
  };
  return synth;
}

function fakeVoice(lang: string, name = `voice-${lang}`): SpeechSynthesisVoice {
  return { lang, name, default: false, localService: true, voiceURI: name } as SpeechSynthesisVoice;
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('isTTSAvailable — falsy arms', () => {
  it('returns false when window is undefined (line 30 truthy guard)', async () => {
    vi.stubGlobal('window', undefined);
    const mod = await import('@lib/audio/tts');
    expect(mod.isTTSAvailable()).toBe(false);
  });
});

describe('speak — early-return guards', () => {
  it('no-op when TTS unavailable (line 101)', async () => {
    // window.speechSynthesis missing — `'speechSynthesis' in window` is false.
    const mod = await import('@lib/audio/tts');
    // Default jsdom: no speechSynthesis on window. Speak should just return.
    expect(() => mod.speak('hi')).not.toThrow();
  });

  it('no-op when audio is disabled (line 104 falsy arm)', async () => {
    const synth = makeFakeSynth([fakeVoice('en-US')]);
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: synth,
    });
    const mod = await import('@lib/audio/tts');
    mod.setAudioEnabled(false);
    mod.speak('hello world');
    // Audio disabled → speak short-circuits before synth.speak.
    expect(synth.speak).not.toHaveBeenCalled();
    // Tear down the stub so other tests aren't affected.
    Reflect.deleteProperty(window, 'speechSynthesis');
  });

  it('no-op when stripped text is empty (emoji-only)', async () => {
    const synth = makeFakeSynth([fakeVoice('en-US')]);
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: synth,
    });
    const mod = await import('@lib/audio/tts');
    mod.setAudioEnabled(true);
    mod.speak('🎉🎈');
    expect(synth.speak).not.toHaveBeenCalled();
    Reflect.deleteProperty(window, 'speechSynthesis');
  });
});

describe('pickVoice — short-circuit chain (line 88)', () => {
  it('prefers en-US when available', async () => {
    const enUS = fakeVoice('en-US', 'samantha');
    const synth = makeFakeSynth([fakeVoice('fr-FR'), enUS, fakeVoice('en-GB')]);
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: synth,
    });
    const utterCalls: SpeechSynthesisUtterance[] = [];
    class FakeUtter {
      voice: SpeechSynthesisVoice | null = null;
      rate = 1;
      pitch = 1;
      constructor(public text: string) {
        utterCalls.push(this as unknown as SpeechSynthesisUtterance);
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtter);
    const mod = await import('@lib/audio/tts');
    mod.setAudioEnabled(true);
    mod.speak('hello');
    expect(utterCalls[0]?.voice).toBe(enUS);
    Reflect.deleteProperty(window, 'speechSynthesis');
  });

  it('falls back to non-US English when no en-US present', async () => {
    const enGB = fakeVoice('en-GB', 'daniel');
    const synth = makeFakeSynth([fakeVoice('de-DE'), enGB, fakeVoice('ja-JP')]);
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: synth,
    });
    const utterCalls: SpeechSynthesisUtterance[] = [];
    class FakeUtter {
      voice: SpeechSynthesisVoice | null = null;
      rate = 1;
      pitch = 1;
      constructor(public text: string) {
        utterCalls.push(this as unknown as SpeechSynthesisUtterance);
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtter);
    const mod = await import('@lib/audio/tts');
    mod.setAudioEnabled(true);
    mod.speak('hello');
    expect(utterCalls[0]?.voice).toBe(enGB);
    Reflect.deleteProperty(window, 'speechSynthesis');
  });

  it('falls back to first voice when no English voice present', async () => {
    const fr = fakeVoice('fr-FR', 'thomas');
    const synth = makeFakeSynth([fr, fakeVoice('de-DE'), fakeVoice('ja-JP')]);
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: synth,
    });
    const utterCalls: SpeechSynthesisUtterance[] = [];
    class FakeUtter {
      voice: SpeechSynthesisVoice | null = null;
      rate = 1;
      pitch = 1;
      constructor(public text: string) {
        utterCalls.push(this as unknown as SpeechSynthesisUtterance);
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtter);
    const mod = await import('@lib/audio/tts');
    mod.setAudioEnabled(true);
    mod.speak('bonjour');
    expect(utterCalls[0]?.voice).toBe(fr);
    Reflect.deleteProperty(window, 'speechSynthesis');
  });
});

describe('speak — iOS first-utterance race (lines 117-119)', () => {
  it('queues the utterance when getVoices() returns empty, then flushes on voiceschanged', async () => {
    // First call: voices empty → speak defers and bails. synth.speak NOT called.
    // Then voices populate + voiceschanged fires → deferred speak replays.
    const synth = makeFakeSynth([]);
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: synth,
    });
    const utterCalls: SpeechSynthesisUtterance[] = [];
    class FakeUtter {
      voice: SpeechSynthesisVoice | null = null;
      rate = 1;
      pitch = 1;
      constructor(public text: string) {
        utterCalls.push(this as unknown as SpeechSynthesisUtterance);
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtter);
    const mod = await import('@lib/audio/tts');
    mod.setAudioEnabled(true);
    mod.speak('first');
    // Voices weren't ready — speak should have queued, not called synth.speak.
    expect(synth.speak).not.toHaveBeenCalled();

    // Populate voices and fire voiceschanged.
    synth._voices = [fakeVoice('en-US')];
    synth._voicesChangedHandlers.forEach((h) => h());

    // The voiceschanged handler replays the deferred utterance.
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(utterCalls.at(-1)?.text).toBe('first');
    Reflect.deleteProperty(window, 'speechSynthesis');
  });
});

describe('cancelSpeech', () => {
  it('calls synth.cancel when TTS is available', async () => {
    const synth = makeFakeSynth([fakeVoice('en-US')]);
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: synth,
    });
    const mod = await import('@lib/audio/tts');
    mod.cancelSpeech();
    expect(synth.cancel).toHaveBeenCalled();
    Reflect.deleteProperty(window, 'speechSynthesis');
  });

  it('is a no-op when TTS is unavailable (line 133 falsy arm)', async () => {
    const mod = await import('@lib/audio/tts');
    expect(() => mod.cancelSpeech()).not.toThrow();
  });
});

describe('prewarmTTSVoices', () => {
  it('is a no-op when TTS is unavailable (line 72 falsy arm)', async () => {
    const mod = await import('@lib/audio/tts');
    // No window.speechSynthesis → prewarm should bail silently.
    expect(() => mod.prewarmTTSVoices()).not.toThrow();
  });

  it('calls getVoices() to nudge iOS Safari when TTS available', async () => {
    const synth = makeFakeSynth([]);
    const getVoicesSpy = vi.fn(() => synth._voices);
    synth.getVoices = getVoicesSpy;
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: synth,
    });
    const mod = await import('@lib/audio/tts');
    mod.prewarmTTSVoices();
    expect(getVoicesSpy).toHaveBeenCalled();
    Reflect.deleteProperty(window, 'speechSynthesis');
  });
});
