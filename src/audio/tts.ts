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

const EMOJI_RE =
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1FA00}-\u{1FAFF}]/gu;

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

function pickVoice(): SpeechSynthesisVoice | null {
  if (!isTTSAvailable()) return null;
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
