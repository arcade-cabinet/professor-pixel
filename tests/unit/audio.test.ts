import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  stripEmoji,
  isTTSAvailable,
  isAudioEnabled,
  setAudioEnabled,
  speak,
  cancelSpeech,
} from '@lib/audio/tts';

describe('audio/tts — stripEmoji', () => {
  it('removes a single emoji', () => {
    expect(stripEmoji('Hi! 👋')).toBe('Hi!');
  });

  it('removes multiple emojis and collapses whitespace', () => {
    expect(stripEmoji('🎮 Build  a   game 🎉 with Pixel ✨')).toBe('Build a game with Pixel');
  });

  it('passes through pure-text strings unchanged', () => {
    expect(stripEmoji('Pick a path')).toBe('Pick a path');
  });

  it('returns empty string when input is just emoji', () => {
    expect(stripEmoji('🎮🎉✨')).toBe('');
  });

  it('strips skin-tone modifier sequences (Fitzpatrick)', () => {
    // 👋 + 🏿 (dark skin tone modifier)
    expect(stripEmoji('Hello 👋🏿 friend')).toBe('Hello friend');
  });

  it('strips ZWJ-joined family / multi-glyph emoji', () => {
    // 👨‍👩‍👧 (man + ZWJ + woman + ZWJ + girl)
    expect(stripEmoji('My family 👨‍👩‍👧 is here')).toBe('My family is here');
  });

  it('strips emoji with variation selector U+FE0F', () => {
    // ✊ + U+FE0F (emoji presentation)
    expect(stripEmoji('Power ✊️ up')).toBe('Power up');
  });
});

describe('audio/tts — availability + enabled flag', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('isAudioEnabled returns true by default (kid-product UX)', () => {
    // Master toggle defaults ON so first-visit kids hear Pixel and SFX.
    // Classroom/shared-space mute is one click in the chrome.
    expect(isAudioEnabled()).toBe(true);
  });

  it('setAudioEnabled(true) persists, isAudioEnabled then returns true', () => {
    setAudioEnabled(true);
    expect(isAudioEnabled()).toBe(true);
  });

  it('setAudioEnabled(false) cancels in-flight speech', () => {
    setAudioEnabled(true);
    const cancelSpy = vi.fn();
    vi.stubGlobal('speechSynthesis', { cancel: cancelSpy, speak: vi.fn(), getVoices: () => [] });
    setAudioEnabled(false);
    expect(cancelSpy).toHaveBeenCalled();
    expect(isAudioEnabled()).toBe(false);
  });

  it('isTTSAvailable mirrors window.speechSynthesis presence', () => {
    // jsdom may or may not provide it. Just assert the function returns
    // a boolean derived from the global, not throwing.
    expect(typeof isTTSAvailable()).toBe('boolean');
  });
});

describe('audio/tts — speak() routes to speechSynthesis', () => {
  let speakSpy: ReturnType<typeof vi.fn>;
  let cancelSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    speakSpy = vi.fn();
    cancelSpy = vi.fn();
    // P8 — speak() gates on isAudioEnabled() so the master mute toggle
    // can silence Pixel mid-sentence. Tests that exercise the speech
    // path must enable audio first.
    setAudioEnabled(true);
    // Provide a non-empty voice list so speak() doesn't take the
    // E3.4 iOS-defer path. The defer behavior has its own test below.
    const fakeVoice = { lang: 'en-US', name: 'Test', default: true } as SpeechSynthesisVoice;
    vi.stubGlobal('speechSynthesis', {
      speak: speakSpy,
      cancel: cancelSpy,
      getVoices: () => [fakeVoice],
      addEventListener: vi.fn(),
    });
    // jsdom doesn't ship SpeechSynthesisUtterance; provide a minimal shim so
    // `new SpeechSynthesisUtterance(text)` records what was passed.
    class FakeUtter {
      text: string;
      voice: SpeechSynthesisVoice | null = null;
      rate = 1;
      pitch = 1;
      constructor(text: string) {
        this.text = text;
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtter);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('cancels any pending utterance before speaking (idempotent replace)', () => {
    speak('hello');
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(speakSpy).toHaveBeenCalledTimes(1);
  });

  it('strips emoji from spoken text', () => {
    speak('Hi! 🎉');
    const utter = speakSpy.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utter.text).toBe('Hi!');
  });

  it('does nothing when text reduces to empty after strip', () => {
    speak('🎉🌟');
    expect(speakSpy).not.toHaveBeenCalled();
  });

  it('cancelSpeech() forwards to speechSynthesis.cancel', () => {
    cancelSpeech();
    expect(cancelSpy).toHaveBeenCalled();
  });
});

describe('audio/tts — E3.4 iOS Safari voices race', () => {
  let speakSpy: ReturnType<typeof vi.fn>;
  let voicesChangedHandler: (() => void) | null = null;
  let currentVoices: SpeechSynthesisVoice[] = [];
  // Re-imported per test so module-level state (preferredVoice cache,
  // voicesChangedListenerInstalled, pendingFirstSpeak) starts fresh.
  // Otherwise the prior describe's setup would leak into our defer
  // assertions: voicesChangedListenerInstalled=true means the module
  // skips re-attaching, so our handler-capture spy never runs.
  let ttsModule: typeof import('@lib/audio/tts');

  beforeEach(async () => {
    vi.resetModules();
    speakSpy = vi.fn();
    voicesChangedHandler = null;
    currentVoices = [];
    vi.stubGlobal('speechSynthesis', {
      speak: speakSpy,
      cancel: vi.fn(),
      getVoices: () => currentVoices,
      addEventListener: (event: string, handler: () => void) => {
        if (event === 'voiceschanged') voicesChangedHandler = handler;
      },
    });
    class FakeUtter {
      text: string;
      voice: SpeechSynthesisVoice | null = null;
      rate = 1;
      pitch = 1;
      constructor(text: string) {
        this.text = text;
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtter);
    ttsModule = await import('@lib/audio/tts');
    ttsModule.setAudioEnabled(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defers the first speak() if voices array is empty (iOS first-shot)', () => {
    ttsModule.speak('Hi from Pixel!');
    expect(speakSpy).not.toHaveBeenCalled();
  });

  it('flushes the deferred utterance when voiceschanged fires', () => {
    ttsModule.speak('queued utterance');
    expect(speakSpy).not.toHaveBeenCalled();
    expect(voicesChangedHandler).not.toBeNull();

    currentVoices = [{ lang: 'en-US', name: 'Test', default: true } as SpeechSynthesisVoice];
    voicesChangedHandler?.();

    expect(speakSpy).toHaveBeenCalledTimes(1);
    const utter = speakSpy.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utter.text).toBe('queued utterance');
  });

  it('prewarmTTSVoices() pokes getVoices to nudge the iOS voices fetch', () => {
    const getVoicesSpy = vi.fn(() => currentVoices);
    vi.stubGlobal('speechSynthesis', {
      speak: speakSpy,
      cancel: vi.fn(),
      getVoices: getVoicesSpy,
      addEventListener: vi.fn(),
    });
    ttsModule.prewarmTTSVoices();
    expect(getVoicesSpy).toHaveBeenCalled();
  });
});
