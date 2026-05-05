// P4.26 — Cross-tab sync of saved-project mutations.
//
// When a kid opens the same site in two tabs (forgets it was open in
// one, opens it in another, or experiments with two browsers side by
// side), localStorage stays in sync but the in-memory React Query
// cache does not. Tab A saves, Tab B's My Games list still shows the
// pre-save state until the kid manually refreshes.
//
// BroadcastChannel solves this with one line of subscribe + one line
// of publish — same-origin, no server. Each tab publishes after a
// successful storage mutation; every other tab's subscriber listens
// and invalidates the relevant React Query keys.
//
// Loop avoidance: each tab generates a per-session sender id at
// module-load time. Outbound messages carry that id; the subscriber
// drops messages whose senderId matches its own. Without this, a tab
// would receive its own broadcasts and trigger a second invalidation
// (harmless but wasteful).
//
// Browser support: BroadcastChannel is available in Chrome 54+,
// Firefox 38+, Safari 15.4+, Edge 79+. The module feature-detects;
// older browsers silently no-op (kids on iOS 14 just lose cross-tab
// sync, which is the same UX as today). No localStorage 'storage'
// event fallback because that fires only when localStorage actually
// changes — it doesn't help for mutations that go through async
// storage abstractions, and it's racy when the same tab writes.

const CHANNEL_NAME = 'pp.storage.v1';

/** Project-list mutations that other tabs care about. */
export type StorageEvent = {
  type: 'projects.changed';
  reason: 'create' | 'update' | 'delete' | 'clone' | 'rename';
};

interface BroadcastEnvelope {
  senderId: string;
  ts: number;
  event: StorageEvent;
}

// Per-session sender id. Stable for the life of the tab. We can't use
// a UUID because crypto.randomUUID() is not in older Safari without
// secure context — Math.random + timestamp is sufficient because the
// id only needs to be unique among CONCURRENT tabs of THIS origin.
const SENDER_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? (crypto as { randomUUID: () => string }).randomUUID()
    : `pp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (channel) return channel;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    // Some private modes throw on construction; treat as absent.
    return null;
  }
  return channel;
}

/**
 * Publish a storage event to other tabs. No-op when BroadcastChannel
 * isn't available. Failures during postMessage are swallowed — a kid
 * shouldn't see a broken save because the cross-tab signal couldn't
 * be sent.
 */
export function publishStorageEvent(event: StorageEvent): void {
  const ch = getChannel();
  if (!ch) return;
  try {
    const envelope: BroadcastEnvelope = { senderId: SENDER_ID, ts: Date.now(), event };
    ch.postMessage(envelope);
  } catch {
    // Channel closed or message un-cloneable; ignore.
  }
}

/**
 * Subscribe to storage events from OTHER tabs. The returned function
 * unsubscribes. The handler is NOT called for events this tab itself
 * published (loop avoidance via the per-session SENDER_ID).
 */
export function subscribeStorageEvents(handler: (event: StorageEvent) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const onMessage = (msg: MessageEvent<BroadcastEnvelope>) => {
    const env = msg.data;
    if (!env || typeof env !== 'object') return;
    if (env.senderId === SENDER_ID) return; // skip our own
    if (!env.event || typeof env.event !== 'object') return;
    handler(env.event);
  };
  ch.addEventListener('message', onMessage);
  return () => ch.removeEventListener('message', onMessage);
}

/**
 * Test-only: reset the cached channel + sender so a fresh session can
 * be simulated. The SENDER_ID itself is module-const, so for tests
 * that need to simulate "another tab" you instead spin up a real
 * BroadcastChannel with the same channel name and let the subscriber
 * see a different sender id.
 */
export function _resetChannelForTests(): void {
  if (channel) {
    try {
      channel.close();
    } catch {
      // ignore
    }
  }
  channel = null;
}

export const _SENDER_ID_FOR_TESTS = SENDER_ID;
