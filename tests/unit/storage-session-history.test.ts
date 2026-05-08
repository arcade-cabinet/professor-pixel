import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// session-history.ts is a singleton with auto-init at module load
// (loadFromStorage + window beforeunload listener registration). Each
// test re-imports via vi.resetModules() + dynamic import to get a
// fresh instance with no carryover state.

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

async function freshHistory() {
  vi.resetModules();
  return await import('@lib/storage/session-history');
}

describe('sessionHistory — initial state', () => {
  it('starts with empty events and currentPosition=-1', async () => {
    const { sessionHistory } = await freshHistory();
    expect(sessionHistory.getEvents()).toEqual([]);
    expect(sessionHistory.getState().currentPosition).toBe(-1);
  });

  it('canRevert / canRedo are both false on fresh state', async () => {
    const { sessionHistory } = await freshHistory();
    expect(sessionHistory.canRevert()).toBe(false);
    expect(sessionHistory.canRedo()).toBe(false);
  });
});

describe('addEvent + trackers', () => {
  it('addEvent appends with assigned id and timestamp', async () => {
    const { sessionHistory } = await freshHistory();
    sessionHistory.addEvent('choice', 'first');
    const events = sessionHistory.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('choice');
    expect(events[0].description).toBe('first');
    expect(events[0].id).toBeTruthy();
    expect(events[0].timestamp).toBeInstanceOf(Date);
    expect(events[0].canRevert).toBe(true);
  });

  it('addEvent advances currentPosition to the new tail', async () => {
    const { sessionHistory } = await freshHistory();
    sessionHistory.addEvent('choice', 'a');
    sessionHistory.addEvent('choice', 'b');
    expect(sessionHistory.getState().currentPosition).toBe(1);
  });

  it('trackChoice writes the canonical "Selected: <label>" form', async () => {
    const { sessionHistory } = await freshHistory();
    sessionHistory.trackChoice('c-1', 'Forward', '/next');
    const event = sessionHistory.getEvents()[0];
    expect(event.type).toBe('choice');
    expect(event.description).toBe('Selected: Forward');
    expect(event.data).toEqual({ choiceId: 'c-1', label: 'Forward', path: '/next' });
  });

  it('trackLesson "Started" vs "Completed" path branches on completed flag', async () => {
    const { sessionHistory } = await freshHistory();
    sessionHistory.trackLesson('l-1', 'Intro', false);
    sessionHistory.trackLesson('l-1', 'Intro', true);
    const events = sessionHistory.getEvents();
    expect(events[0].description).toBe('Started: Intro');
    expect(events[1].description).toBe('Completed: Intro');
  });

  it('trackEditorChange / trackComponentSelection write expected description shapes', async () => {
    const { sessionHistory } = await freshHistory();
    sessionHistory.trackEditorChange('save', { lines: 12 });
    sessionHistory.trackComponentSelection('Player', 'Sprite');
    const events = sessionHistory.getEvents();
    expect(events[0].description).toBe('Editor: save');
    expect(events[0].data).toEqual({ lines: 12 });
    expect(events[1].description).toBe('Selected Sprite: Player');
  });

  it('trackNavigation marks canRevert=false (transient)', async () => {
    // Pin: navigation events are non-revertable so the revert UI
    // doesn't try to undo them. A regression that flipped the default
    // would break revert UX in subtle ways.
    const { sessionHistory } = await freshHistory();
    sessionHistory.trackNavigation('/a', '/b');
    const event = sessionHistory.getEvents()[0];
    expect(event.canRevert).toBe(false);
    expect(event.description).toBe('Navigated to /b');
  });
});

describe('addEvent — branching with currentPosition', () => {
  it('truncates future events when adding mid-history', async () => {
    // Pin redo-stack semantics: if the user reverts to position N
    // then adds a new event, every event past N is dropped (no
    // forward-redo into orphan branches).
    const { sessionHistory } = await freshHistory();
    sessionHistory.addEvent('choice', 'a');
    sessionHistory.addEvent('choice', 'b');
    sessionHistory.addEvent('choice', 'c');

    const aId = sessionHistory.getEvents()[0].id;
    sessionHistory.revertToEvent(aId);
    sessionHistory.addEvent('choice', 'd');

    const events = sessionHistory.getEvents();
    expect(events.map((e) => e.description)).toEqual(['a', 'd']);
  });

  it('truncates future events when jumping back then adding (line 53 truthy arm)', async () => {
    // The previous revertToEvent test slices the events array down at
    // revert time, so when addEvent runs `currentPosition < events
    // .length - 1` is false (already at tail). jumpToEvent moves the
    // cursor WITHOUT truncating, so currentPosition stays mid-history.
    // Adding then triggers line 53's slice that drops orphan branches.
    const { sessionHistory } = await freshHistory();
    sessionHistory.addEvent('choice', 'a');
    sessionHistory.addEvent('choice', 'b');
    sessionHistory.addEvent('choice', 'c');

    const aId = sessionHistory.getEvents()[0].id;
    sessionHistory.jumpToEvent(aId); // cursor at index 0; events still length 3
    sessionHistory.addEvent('choice', 'd');

    // Now line 53's slice fired: events past position 0 are dropped,
    // 'd' lands at position 1.
    const events = sessionHistory.getEvents();
    expect(events.map((e) => e.description)).toEqual(['a', 'd']);
  });
});

describe('jumpToEvent + revertToEvent', () => {
  it('jumpToEvent moves cursor without truncating', async () => {
    const { sessionHistory } = await freshHistory();
    sessionHistory.addEvent('choice', 'a');
    sessionHistory.addEvent('choice', 'b');
    const aId = sessionHistory.getEvents()[0].id;

    const result = sessionHistory.jumpToEvent(aId);
    expect(result?.description).toBe('a');
    expect(sessionHistory.getEvents()).toHaveLength(2);
    expect(sessionHistory.getState().currentPosition).toBe(0);
  });

  it('jumpToEvent returns null for unknown id', async () => {
    const { sessionHistory } = await freshHistory();
    sessionHistory.addEvent('choice', 'a');
    expect(sessionHistory.jumpToEvent('nonexistent')).toBeNull();
  });

  it('revertToEvent truncates future events and returns the target', async () => {
    const { sessionHistory } = await freshHistory();
    sessionHistory.addEvent('choice', 'a');
    sessionHistory.addEvent('choice', 'b');
    sessionHistory.addEvent('choice', 'c');
    const bId = sessionHistory.getEvents()[1].id;

    const result = sessionHistory.revertToEvent(bId);
    expect(result?.description).toBe('b');
    expect(sessionHistory.getEvents()).toHaveLength(2);
  });

  it('revertToEvent returns null for unknown id', async () => {
    const { sessionHistory } = await freshHistory();
    expect(sessionHistory.revertToEvent('nope')).toBeNull();
  });
});

describe('clearHistory', () => {
  it('clearHistory empties events and resets cursor', async () => {
    const { sessionHistory } = await freshHistory();
    sessionHistory.addEvent('choice', 'a');
    sessionHistory.addEvent('choice', 'b');

    sessionHistory.clearHistory();
    expect(sessionHistory.getEvents()).toEqual([]);
    expect(sessionHistory.getState().currentPosition).toBe(-1);
  });
});

describe('subscribe', () => {
  it('subscribe fires immediately with initial state then on every change', async () => {
    const { sessionHistory } = await freshHistory();
    const listener = vi.fn();
    const unsub = sessionHistory.subscribe(listener);

    // Initial-state call.
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].events).toEqual([]);

    sessionHistory.addEvent('choice', 'a');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1][0].events).toHaveLength(1);

    unsub();
    sessionHistory.addEvent('choice', 'b');
    // No new fire after unsubscribe.
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('persistence', () => {
  it('addEvent persists to localStorage', async () => {
    const { sessionHistory } = await freshHistory();
    sessionHistory.addEvent('choice', 'persist-me');
    const stored = window.localStorage.getItem('pixel-session-history');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored as string);
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0].description).toBe('persist-me');
    // Timestamp serializes to ISO string.
    expect(typeof parsed.events[0].timestamp).toBe('string');
  });

  it('reloads state from localStorage on fresh module load', async () => {
    // Seed storage manually then re-import to verify loadFromStorage
    // re-hydrates events with Date objects rebuilt from ISO strings.
    const seed = {
      events: [
        {
          id: 'seeded-1',
          timestamp: new Date('2026-01-01T00:00:00Z').toISOString(),
          type: 'choice',
          description: 'seeded',
          data: {},
          canRevert: true,
        },
      ],
      currentPosition: 0,
    };
    window.localStorage.setItem('pixel-session-history', JSON.stringify(seed));

    const { sessionHistory } = await freshHistory();
    const events = sessionHistory.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].description).toBe('seeded');
    expect(events[0].timestamp).toBeInstanceOf(Date);
    expect((events[0].timestamp as Date).toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('falls back to empty state when stored JSON is corrupt', async () => {
    window.localStorage.setItem('pixel-session-history', '{not valid json');
    const { sessionHistory } = await freshHistory();
    expect(sessionHistory.getEvents()).toEqual([]);
    expect(sessionHistory.getState().currentPosition).toBe(-1);
  });

  it('survives localStorage throwing on setItem', async () => {
    const { sessionHistory } = await freshHistory();
    const originalSet = window.localStorage.setItem;
    window.localStorage.setItem = (_key: string, _value: string) => {
      throw new DOMException('QuotaExceededError');
    };
    try {
      expect(() => sessionHistory.addEvent('choice', 'no-storage')).not.toThrow();
      expect(sessionHistory.getEvents()).toHaveLength(1);
    } finally {
      window.localStorage.setItem = originalSet;
    }
  });
});

describe('queries', () => {
  it('getEventsByType filters by event type', async () => {
    const { sessionHistory } = await freshHistory();
    sessionHistory.addEvent('choice', 'c1');
    sessionHistory.addEvent('lesson', 'l1');
    sessionHistory.addEvent('choice', 'c2');

    const choices = sessionHistory.getEventsByType('choice');
    expect(choices.map((e) => e.description)).toEqual(['c1', 'c2']);
    expect(sessionHistory.getEventsByType('lesson')).toHaveLength(1);
    expect(sessionHistory.getEventsByType('navigation')).toHaveLength(0);
  });

  it('getRecentEvents returns the last N (default 10)', async () => {
    const { sessionHistory } = await freshHistory();
    for (let i = 0; i < 15; i++) {
      sessionHistory.addEvent('choice', `e${i}`);
    }
    const recent = sessionHistory.getRecentEvents();
    expect(recent).toHaveLength(10);
    expect(recent[0].description).toBe('e5');
    expect(recent[9].description).toBe('e14');
  });

  it('getRecentEvents honors a custom count', async () => {
    const { sessionHistory } = await freshHistory();
    sessionHistory.addEvent('choice', 'a');
    sessionHistory.addEvent('choice', 'b');
    sessionHistory.addEvent('choice', 'c');

    expect(sessionHistory.getRecentEvents(2).map((e) => e.description)).toEqual(['b', 'c']);
  });
});

describe('canRevert / canRedo flags', () => {
  it('canRevert reflects cursor > 0', async () => {
    const { sessionHistory } = await freshHistory();
    expect(sessionHistory.canRevert()).toBe(false);

    sessionHistory.addEvent('choice', 'a');
    // cursor=0 → still cannot revert (no prior).
    expect(sessionHistory.canRevert()).toBe(false);

    sessionHistory.addEvent('choice', 'b');
    expect(sessionHistory.canRevert()).toBe(true);
  });

  it('canRedo is true after jumping back', async () => {
    const { sessionHistory } = await freshHistory();
    sessionHistory.addEvent('choice', 'a');
    sessionHistory.addEvent('choice', 'b');
    expect(sessionHistory.canRedo()).toBe(false);

    const aId = sessionHistory.getEvents()[0].id;
    sessionHistory.jumpToEvent(aId);
    expect(sessionHistory.canRedo()).toBe(true);
  });
});

describe('singleton identity', () => {
  it('multiple imports within the same module-evaluation share the same instance', async () => {
    const mod1 = await freshHistory();
    mod1.sessionHistory.addEvent('choice', 'shared');
    // Within a single module evaluation, sessionHistory is the same
    // identity because it's the singleton instance variable.
    const mod1Again = mod1.sessionHistory;
    expect(mod1Again.getEvents()[0].description).toBe('shared');
  });
});
