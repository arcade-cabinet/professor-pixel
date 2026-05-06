// Web Speech API wrapper — Pixel speaks dialogue text aloud.
//
// Design notes:
// - The browser's Speech Synthesis API is finicky: voices load asynchronously
//   in some browsers (Chrome), and pending utterances cancel without firing
//   their `end` event in others (Safari). We treat it as best-effort: if it
//   fails or is unavailable, we fall through to text-only.
// - We strip emojis before speaking so the TTS doesn't read "smiling face
//   with sunglasses" out loud — kids think it's bizarre and it ruins the flow.
// - Idempotent cancel: calling speak() while a previous utterance is in flight
//   cancels and replaces it. Audio surface is one-at-a-time.

// Strips full emoji sequences including ZWJ-joined glyphs (👨‍👩‍👧),
// skin-tone modifiers (👋🏿), and emoji-presentation variation selectors
// (✊️). Uses Unicode property escapes so we don't have to enumerate
// every block; \p{Extended_Pictographic} catches all emoji codepoints,
// \p{Emoji_Modifier} catches Fitzpatrick modifiers, and the inner repeat
// captures ZWJ chains like family glyphs.
const EMOJI_RE =
  /\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?)*/gu;

export function stripEmoji(text: string): string {
  return text
    .replace(EMOJI_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function isTTSAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesChangedListenerInstalled = false;
// E3.4 — iOS Safari sometimes ships an empty voices array when speak()
// is first called, then populates it via voiceschanged minutes (or
// seconds) later. Without this queue, the very first Pixel utterance
// of the session uses the system default voice (a sterile "Alex" on
// macOS, "Samantha" on iOS) instead of a child-friendly en-US voice.
// Defer the first speak() if voices aren't ready yet; the listener
// flushes on voiceschanged.
let pendingFirstSpeak: { text: string; opts: SpeakOptions } | null = null;

function ensureVoicesChangedListener(): void {
  if (voicesChangedListenerInstalled) return;
  if (!isTTSAvailable()) return;
  const synth = window.speechSynthesis;
  // Voices load asynchronously in Chrome (and TTS-extension voices can arrive
  // hundreds of ms after page load). Reset the cache when the list changes so
  // a higher-quality voice can be picked up on the next speak().
  if (typeof synth.addEventListener === 'function') {
    synth.addEventListener('voiceschanged', () => {
      preferredVoice = null;
      // Flush any speak queued before voices were ready (iOS first-shot path).
      if (pendingFirstSpeak) {
        const { text, opts } = pendingFirstSpeak;
        pendingFirstSpeak = null;
        speak(text, opts);
      }
    });
    voicesChangedListenerInstalled = true;
  }
}

/**
 * Pre-warm the voices list. Call from a user-gesture handler (audio
 * toggle click, first dialogue advance) so iOS Safari kicks off the
 * voices fetch ahead of the first real speak(). No-op on browsers that
 * already have voices ready. Safe to call multiple times.
 */
export function prewarmTTSVoices(): void {
  if (!isTTSAvailable()) return;
  ensureVoicesChangedListener();
  // getVoices() with an empty result is what nudges iOS to populate;
  // the result itself is discarded — pickVoice() will re-fetch when
  // speak() actually runs.
  void window.speechSynthesis.getVoices();
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!isTTSAvailable()) return null;
  ensureVoicesChangedListener();
  if (preferredVoice) return preferredVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer a US English voice; fall back to any English voice; then anything.
  preferredVoice =
    voices.find((v) => /^en-US/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    voices[0] ??
    null;
  return preferredVoice;
}

export interface SpeakOptions {
  rate?: number; // 0.5..2, default 1
  pitch?: number; // 0..2, default 1
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isTTSAvailable()) return;
  // Master audio toggle gates speak — without this, the global mute button
  // can't actually silence Pixel mid-sentence. callers don't have to check.
  if (!isAudioEnabled()) return;
  const cleaned = stripEmoji(text);
  if (!cleaned) return;

  const synth = window.speechSynthesis;
  ensureVoicesChangedListener();

  // E3.4 — iOS Safari first-utterance race. If voices aren't ready yet
  // AND we don't already have a deferred utterance, queue this one and
  // bail. The voiceschanged listener will replay it. We only queue ONE
  // (the latest) — if the user advances dialogue rapidly before voices
  // arrive, only the last text gets read, which is the correct UX.
  const voice = pickVoice();
  if (!voice && synth.getVoices().length === 0) {
    pendingFirstSpeak = { text, opts };
    return;
  }

  // Idempotent cancel — replace any pending utterance.
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(cleaned);
  if (voice) utter.voice = voice;
  utter.rate = opts.rate ?? 1;
  utter.pitch = opts.pitch ?? 1;
  synth.speak(utter);
}

export function cancelSpeech(): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.cancel();
}

// Master audio toggle. Default ON so first-visit kids hear Pixel and the
// success chime — the chrome AudioToggle button gives one-click mute for
// classroom / shared-space contexts. Persisted so the choice survives
// refreshes.
const AUDIO_KEY = 'pp.audioEnabled';

/**
 * Custom event dispatched on `window` when setAudioEnabled flips. Lets any
 * surface (dialogue engine, menu badge, etc.) subscribe reactively without
 * polling. The native `storage` event only fires for cross-tab writes, so we
 * need our own signal for same-tab toggles.
 */
const AUDIO_CHANGE_EVENT = 'pp:audio-changed';

export function isAudioEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    // Default ON — anything other than the explicit OFF sentinel means on.
    return localStorage.getItem(AUDIO_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setAudioEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (enabled) {
      // Explicit '1' (instead of key removal) mirrors isSfxEnabled and keeps
      // the key present so downstream debuggability tools can inspect it.
      localStorage.setItem(AUDIO_KEY, '1');
    } else {
      localStorage.setItem(AUDIO_KEY, '0');
      cancelSpeech();
    }
  } catch {
    // Quota or privacy mode — fall through silently.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUDIO_CHANGE_EVENT, { detail: enabled }));
  }
}

/**
 * Subscribe to audio-enabled changes. Listener fires immediately with the
 * current value, and on every subsequent setAudioEnabled call (same tab via
 * the custom event, cross-tab via the native storage event).
 *
 * Returns an unsubscribe function — call it from a useEffect cleanup.
 */
export function subscribeAudioEnabled(listener: (enabled: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    listener(false);
    return () => undefined;
  }
  listener(isAudioEnabled());
  const onCustom = () => listener(isAudioEnabled());
  const onStorage = (e: StorageEvent) => {
    if (e.key === AUDIO_KEY || e.key === null) listener(isAudioEnabled());
  };
  window.addEventListener(AUDIO_CHANGE_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(AUDIO_CHANGE_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
