// Cover line 95 of src/audio/sfx.ts — the isSfxEnabled catch
// fallback that returns true when localStorage.getItem throws (e.g.
// Safari private mode, opaque-origin iframe). Existing audio-sfx.test.ts
// asserts the read paths but never makes getItem throw.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isSfxEnabled } from '@lib/audio/sfx';

beforeEach(() => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('SecurityError', 'SecurityError');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isSfxEnabled — catch fallback (line 95)', () => {
  it('returns true (default ON) when localStorage.getItem throws', () => {
    expect(isSfxEnabled()).toBe(true);
  });
});
