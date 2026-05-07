import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAudioEnabled, subscribeAudioEnabled } from '@lib/audio/tts';
import { simulatePygame } from '@lib/pygame/runtime/simulator';

// Cover the four uncovered branches of src/audio/tts.ts:
//   line 157:  isAudioEnabled — localStorage.getItem throws → returns true
//   line 189:  subscribeAudioEnabled — no window → listener(false), no-op unsubscribe
//   line 195:  subscribeAudioEnabled — storage event with non-AUDIO_KEY key (ignored)
//
// jsdom always exposes `window`. To cover the no-window branch we use
// vi.resetModules + vi.stubGlobal('window', undefined) before re-importing.

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('isAudioEnabled — localStorage throws', () => {
  it('returns true when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('locked profile');
    });
    expect(isAudioEnabled()).toBe(true);
  });
});

describe('subscribeAudioEnabled — non-window envs', () => {
  it('synchronously fires listener with false and returns no-op unsubscribe', async () => {
    // Re-import after stubbing window=undefined so the typeof check inside
    // the module sees the missing global. vi.stubGlobal applies to the
    // import-time check too because we reset modules first.
    vi.resetModules();
    vi.stubGlobal('window', undefined);
    const mod = await import('@lib/audio/tts');
    const listener = vi.fn();
    const unsubscribe = mod.subscribeAudioEnabled(listener);
    expect(listener).toHaveBeenCalledWith(false);
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });
});

describe('subscribeAudioEnabled — storage event filtering', () => {
  it('ignores storage events for unrelated keys', () => {
    const listener = vi.fn();
    const unsub = subscribeAudioEnabled(listener);
    listener.mockClear(); // drop the synchronous initial fire

    const irrelevantEvent = new StorageEvent('storage', {
      key: 'something.else.entirely',
      newValue: '0',
    });
    window.dispatchEvent(irrelevantEvent);
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });

  it('fires listener when storage event key is null (cross-tab clear)', () => {
    const listener = vi.fn();
    const unsub = subscribeAudioEnabled(listener);
    listener.mockClear();

    const clearEvent = new StorageEvent('storage', { key: null, newValue: null });
    window.dispatchEvent(clearEvent);
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('unsubscribe removes both event listeners', () => {
    const listener = vi.fn();
    const unsub = subscribeAudioEnabled(listener);
    unsub();
    listener.mockClear();
    // After unsubscribe no events should reach the listener.
    window.dispatchEvent(new CustomEvent('pp:audio-changed', { detail: true }));
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('simulatePygame — getColorFromCode default branch + outer catch', () => {
  it('falls through to the supplied default color when no name matches', () => {
    // No color name in the line and no recognizable RGB literal, so
    // getColorFromCode hits the final `return defaultColor` branch and
    // simulatePygame uses the rect default '#FF0000'.
    const code = 'pygame.draw.rect(screen, custom_pal, (10, 20, 30, 40))';
    const result = simulatePygame(code);
    const rect = result.objects.find((o) => o.type === 'rect');
    // Default color is #FF0000 for rect — but the regex passes here so
    // getColorFromCode runs against `custom_pal` which doesn't match any
    // named branch → returns the function's default ('#FF0000').
    expect(rect?.color).toBe('#FF0000');
  });
});
