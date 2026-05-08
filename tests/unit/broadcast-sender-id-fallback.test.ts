// Cover the broadcast.ts SENDER_ID polyfill branch (line 47-49):
// when crypto.randomUUID isn't available (older Safari without
// secure context), the per-session id falls back to
// `pp-${Date.now()}-${Math.random()...}`. Existing tests run with
// crypto.randomUUID present (jsdom node v20+), so the fallback path
// stays uncov.
//
// Strategy: vi.resetModules + drop crypto.randomUUID + re-import the
// module so the SENDER_ID expression at module-load time evaluates
// the fallback branch. We then verify side effects through
// publishStorageEvent: the envelope's senderId matches the
// `pp-<digits>-<8-char>` shape produced by the fallback.

import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('broadcast.ts — SENDER_ID polyfill (line 47-49)', () => {
  it('uses the pp-<timestamp>-<rand> fallback when crypto.randomUUID is missing', async () => {
    // Replace globalThis.crypto with an object that doesn't have
    // randomUUID as an own property — `'randomUUID' in crypto` then
    // evaluates false and the SENDER_ID expression hits the fallback
    // branch. Deleting the property on the real `crypto` object is
    // restricted in jsdom, so swap the whole object instead.
    vi.stubGlobal('crypto', {} as Crypto);
    vi.resetModules();
    const broadcast = await import('@lib/storage/broadcast');

    // Capture the envelope by spying on BroadcastChannel.postMessage.
    let capturedSenderId: string | undefined;
    vi.spyOn(BroadcastChannel.prototype, 'postMessage').mockImplementation(function (
      this: BroadcastChannel,
      data: unknown
    ) {
      const env = data as { senderId?: string };
      capturedSenderId = env.senderId;
    });

    broadcast.publishStorageEvent({ type: 'projects.changed', reason: 'create' });
    // Fallback shape: 'pp-' + 13-digit timestamp + '-' + 8 base36 chars.
    expect(capturedSenderId).toMatch(/^pp-\d{13}-[0-9a-z]{1,8}$/);
  });
});
