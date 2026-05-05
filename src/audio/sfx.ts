// Tiny sound-effect engine using the Web Audio API. No samples — just
// procedurally-generated tones, so we add zero asset weight to the bundle.
//
// Three sounds: success (happy chord chirp), error (low buzz), pop (short
// click for option selection).
//
// AudioContext is created lazily on first play — Chrome requires a user
// gesture before audio can play, so we don't construct it eagerly.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  // Safari uses webkitAudioContext as a fallback.
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

interface ToneSpec {
  freq: number;
  duration: number;
  type?: OscillatorType;
  attack?: number;
  release?: number;
  gain?: number;
}

function tone(spec: ToneSpec, startOffset = 0): void {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime + startOffset;
  const osc = audio.createOscillator();
  const env = audio.createGain();
  osc.type = spec.type ?? 'sine';
  osc.frequency.value = spec.freq;
  const peak = spec.gain ?? 0.18;
  const attack = spec.attack ?? 0.005;
  const release = spec.release ?? 0.08;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(peak, now + attack);
  env.gain.linearRampToValueAtTime(0, now + spec.duration + release);
  osc.connect(env);
  env.connect(audio.destination);
  osc.start(now);
  osc.stop(now + spec.duration + release + 0.02);
}

// Master audio toggle gates ALL audio surfaces (TTS + SFX) with one click.
// Per-channel gates (isSfxEnabled) still work as a sub-preference once the
// master is on.
import { isAudioEnabled } from './tts';

function audioOk(): boolean {
  return isAudioEnabled() && isSfxEnabled();
}

export function playSuccess(): void {
  if (!audioOk()) return;
  // Major triad arpeggio: C5, E5, G5
  tone({ freq: 523.25, duration: 0.08 });
  tone({ freq: 659.25, duration: 0.08 }, 0.07);
  tone({ freq: 783.99, duration: 0.14 }, 0.14);
}

export function playError(): void {
  if (!audioOk()) return;
  // Two low descending square-wave blips — mildly buzzy, not harsh.
  tone({ freq: 220, duration: 0.12, type: 'square', gain: 0.12 });
  tone({ freq: 174.61, duration: 0.16, type: 'square', gain: 0.12 }, 0.13);
}

export function playPop(): void {
  if (!audioOk()) return;
  // Short triangle blip for option clicks.
  tone({ freq: 880, duration: 0.04, type: 'triangle', gain: 0.1 });
}

const SFX_KEY = 'pp.sfxEnabled';

export function isSfxEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    // Default ON — SFX are non-vocal and short, no privacy concern.
    return localStorage.getItem(SFX_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setSfxEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SFX_KEY, enabled ? '1' : '0');
  } catch {
    // Privacy mode — best effort.
  }
}
