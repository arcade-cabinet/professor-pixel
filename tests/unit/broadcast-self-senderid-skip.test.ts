// Cover line 98 of src/storage/broadcast.ts:
//   if (env.senderId === SENDER_ID) return; // skip our own
//
// The existing broadcast.test.ts asserts the loop-avoidance CONTRACT
// (handler isn't called when this tab publishes) — but per spec a
// BroadcastChannel does NOT fire messages back to the same instance
// that posted them, so the sender-id check actually never runs in
// that test. To surface line 98 we open a SECOND channel inside the
// test and post a message with the module's own SENDER_ID.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeStorageEvents, _SENDER_ID_FOR_TESTS } from '@lib/storage/broadcast';

describe('broadcast subscribeStorageEvents — self senderId skip (line 98)', () => {
  let unsubscribe: () => void;
  let handler: ReturnType<typeof vi.fn>;
  let otherTab: BroadcastChannel;

  beforeEach(() => {
    handler = vi.fn();
    unsubscribe = subscribeStorageEvents(
      handler as unknown as Parameters<typeof subscribeStorageEvents>[0]
    );
    otherTab = new BroadcastChannel('pp.storage.v1');
  });

  afterEach(() => {
    otherTab.close();
    unsubscribe();
  });

  it('skips messages whose senderId matches our own SENDER_ID', async () => {
    // Post via a sibling channel using OUR module's SENDER_ID. The
    // subscriber's onMessage runs and the senderId-guard short-
    // circuits — line 98 fires.
    otherTab.postMessage({
      senderId: _SENDER_ID_FOR_TESTS,
      ts: Date.now(),
      event: { type: 'projects.changed', reason: 'create' },
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(handler).not.toHaveBeenCalled();
  });
});
