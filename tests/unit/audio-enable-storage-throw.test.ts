// Cover storage-throw catch arms in src/audio/tts.ts:
//   - isAudioEnabled (around line 156-158) — default true on getItem throw
//   - setAudioEnabled (around line 173) — silent fall-through on
//     setItem throw

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAudioEnabled, setAudioEnabled } from '@lib/audio/tts';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isAudioEnabled — catch fallback', () => {
  it('returns true (default ON) when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError', 'SecurityError');
    });
    expect(isAudioEnabled()).toBe(true);
  });
});

describe('setAudioEnabled — catch fallback', () => {
  it('does NOT throw when localStorage.setItem fails (quota/privacy mode)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    // Should not raise — the catch swallows the storage error so the
    // dispatch event still fires.
    expect(() => setAudioEnabled(true)).not.toThrow();
    expect(() => setAudioEnabled(false)).not.toThrow();
  });
});
