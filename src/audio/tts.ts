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
    });
    voicesChangedListenerInstalled = true;
  }
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
  const cleaned = stripEmoji(text);
  if (!cleaned) return;

  const synth = window.speechSynthesis;
  // Idempotent cancel — replace any pending utterance.
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(cleaned);
  const voice = pickVoice();
  if (voice) utter.voice = voice;
  utter.rate = opts.rate ?? 1;
  utter.pitch = opts.pitch ?? 1;
  synth.speak(utter);
}

export function cancelSpeech(): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.cancel();
}

// Audio is opt-in — kids/parents may not want voice in classrooms or shared
// spaces. We default OFF and persist the user's choice.
const AUDIO_KEY = 'pp.audioEnabled';

export function isAudioEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(AUDIO_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAudioEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (enabled) {
      localStorage.setItem(AUDIO_KEY, '1');
    } else {
      localStorage.removeItem(AUDIO_KEY);
      cancelSpeech();
    }
  } catch {
    // Quota or privacy mode — fall through silently.
  }
}
