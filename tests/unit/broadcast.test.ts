// P4.26 — broadcast.ts publishes/subscribes via BroadcastChannel and
// drops loop-back from the same tab.
//
// jsdom ships a BroadcastChannel polyfill (or rather, modern jsdom
// supports it natively as of 23.x). Two channels with the same name
// in the same process route messages to each other — that's enough
// to simulate "tab A publishes, tab B subscribes" without spinning
// up a real worker.

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  publishStorageEvent,
  subscribeStorageEvents,
  _resetChannelForTests,
} from '@lib/storage/broadcast';

afterEach(() => {
  _resetChannelForTests();
});

describe('broadcast.ts (P4.26)', () => {
  it('does not invoke the subscriber when the same tab publishes (loop avoidance)', async () => {
    // The module-level SENDER_ID is constant for the test process, so
    // a single-tab test simulates the loop-avoidance contract: own
    // messages must not call back into the subscriber.
    const handler = vi.fn();
    const unsubscribe = subscribeStorageEvents(handler);
    publishStorageEvent({ type: 'projects.changed', reason: 'create' });
    // BroadcastChannel delivers asynchronously; flush a microtask.
    await new Promise((r) => setTimeout(r, 0));
    expect(handler).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('invokes the subscriber when a DIFFERENT origin (sibling channel) publishes', async () => {
    // Simulate "another tab" by opening a second channel directly,
    // bypassing the module's cached singleton + sender id. The
    // subscriber on the main channel sees an envelope from a sender
    // it doesn't recognize and should fire.
    const handler = vi.fn();
    const unsubscribe = subscribeStorageEvents(handler);
    const otherTab = new BroadcastChannel('pp.storage.v1');
    otherTab.postMessage({
      senderId: 'someone-else',
      ts: Date.now(),
      event: { type: 'projects.changed', reason: 'create' },
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: 'projects.changed',
      reason: 'create',
    });
    otherTab.close();
    unsubscribe();
  });

  it('unsubscribe stops further deliveries', async () => {
    const handler = vi.fn();
    const unsubscribe = subscribeStorageEvents(handler);
    unsubscribe();
    const otherTab = new BroadcastChannel('pp.storage.v1');
    otherTab.postMessage({
      senderId: 'someone-else',
      ts: Date.now(),
      event: { type: 'projects.changed', reason: 'delete' },
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(handler).not.toHaveBeenCalled();
    otherTab.close();
  });

  it('drops malformed envelopes without throwing', async () => {
    const handler = vi.fn();
    const unsubscribe = subscribeStorageEvents(handler);
    const otherTab = new BroadcastChannel('pp.storage.v1');
    otherTab.postMessage(null);
    otherTab.postMessage('not-an-envelope');
    otherTab.postMessage({ senderId: 'x' /* no event */ });
    await new Promise((r) => setTimeout(r, 0));
    expect(handler).not.toHaveBeenCalled();
    otherTab.close();
    unsubscribe();
  });
});
