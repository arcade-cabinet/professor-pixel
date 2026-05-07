import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientStorage } from '@lib/storage/client';
import type { InsertProject } from '@lib/types/schema';

// ClientStorage talks to localStorage and fetch. jsdom provides a real
// localStorage; we stub fetch per test. vi.resetModules isn't needed —
// the class is stateless across constructions (storage lives in
// localStorage, which is process-global).

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ClientStorage — user methods', () => {
  it('createAnonymousUser persists + returns the user; getUser hits the same row', async () => {
    const storage = new ClientStorage();
    const user = await storage.createAnonymousUser('alice');
    expect(user.username).toBe('alice');
    expect(user.id).toBeTruthy();

    const fetched = await storage.getUser(user.id);
    expect(fetched).toEqual(user);
  });

  it('getUser returns undefined for an unknown id', async () => {
    const storage = new ClientStorage();
    expect(await storage.getUser('does-not-exist')).toBeUndefined();
  });

  it('getUserByUsername finds the matching user', async () => {
    const storage = new ClientStorage();
    await storage.createAnonymousUser('alice');
    const bob = await storage.createAnonymousUser('bob');
    const found = await storage.getUserByUsername('bob');
    expect(found?.id).toBe(bob.id);
  });

  it('getUserByUsername returns undefined when no match', async () => {
    const storage = new ClientStorage();
    await storage.createAnonymousUser('alice');
    expect(await storage.getUserByUsername('nobody')).toBeUndefined();
  });
});

describe('ClientStorage — getLessons (fallback paths)', () => {
  it('returns fallback when fetch throws (offline)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const storage = new ClientStorage();
    const lessons = await storage.getLessons();
    expect(Array.isArray(lessons)).toBe(true);
    expect(lessons.length).toBeGreaterThan(0);
    // Fallback exposes the canonical "Python Basics" starter lesson.
    expect(lessons[0]!.id).toBe('lesson-1');
    expect(lessons[0]!.title).toMatch(/Python Basics/);
  });

  it('returns fallback when fetch responds non-OK', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' })
    );
    const storage = new ClientStorage();
    const lessons = await storage.getLessons();
    expect(lessons[0]!.id).toBe('lesson-1');
  });

  it('throws on schema-validation failure (corrupt catalog is loud, not silent)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'broken' }], // missing required fields
      })
    );
    const storage = new ClientStorage();
    await expect(storage.getLessons()).rejects.toThrow(/schema validation/);
  });

  it('returns the parsed catalog when fetch + schema both succeed', async () => {
    const validLesson = {
      id: 'l1',
      title: 'Title',
      description: 'd',
      order: 0,
      content: {
        introduction: 'intro',
        steps: [
          {
            id: 's1',
            title: 'Step',
            description: '',
            initialCode: '',
            solution: 'pass',
            hints: [],
          },
        ],
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => [validLesson] })
    );
    const storage = new ClientStorage();
    const lessons = await storage.getLessons();
    expect(lessons).toEqual([validLesson]);
  });

  it('getLesson(id) finds in the catalog', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const storage = new ClientStorage();
    const found = await storage.getLesson('lesson-1');
    expect(found?.id).toBe('lesson-1');
    expect(await storage.getLesson('does-not-exist')).toBeUndefined();
  });
});

describe('ClientStorage — progress methods', () => {
  it('updateUserProgress creates a new row on first write', async () => {
    const storage = new ClientStorage();
    const row = await storage.updateUserProgress('alice', 'lesson-1', { currentStep: 2 });
    expect(row.userId).toBe('alice');
    expect(row.lessonId).toBe('lesson-1');
    expect(row.currentStep).toBe(2);
    expect(row.completed).toBe(false); // default
    expect(row.id).toBeTruthy();
  });

  it('updateUserProgress merges into existing row (preserves id)', async () => {
    const storage = new ClientStorage();
    const first = await storage.updateUserProgress('alice', 'lesson-1', { currentStep: 1 });
    const second = await storage.updateUserProgress('alice', 'lesson-1', { currentStep: 5 });
    expect(second.id).toBe(first.id);
    expect(second.currentStep).toBe(5);
  });

  it('getUserProgress returns only that user’s rows', async () => {
    const storage = new ClientStorage();
    await storage.updateUserProgress('alice', 'l1', { currentStep: 1 });
    await storage.updateUserProgress('alice', 'l2', { currentStep: 1 });
    await storage.updateUserProgress('bob', 'l1', { currentStep: 1 });
    const aliceRows = await storage.getUserProgress('alice');
    expect(aliceRows.length).toBe(2);
    expect(aliceRows.every((r) => r.userId === 'alice')).toBe(true);
  });

  it('getUserProgressForLesson returns the matching row', async () => {
    const storage = new ClientStorage();
    await storage.updateUserProgress('alice', 'lesson-1', { currentStep: 3 });
    const row = await storage.getUserProgressForLesson('alice', 'lesson-1');
    expect(row?.currentStep).toBe(3);
    expect(await storage.getUserProgressForLesson('alice', 'lesson-99')).toBeUndefined();
  });

  it('clearUserProgress wipes all rows for that user but preserves others', async () => {
    const storage = new ClientStorage();
    await storage.updateUserProgress('alice', 'l1', { currentStep: 1 });
    await storage.updateUserProgress('alice', 'l2', { currentStep: 2 });
    await storage.updateUserProgress('bob', 'l1', { currentStep: 9 });

    await storage.clearUserProgress('alice');

    expect((await storage.getUserProgress('alice')).length).toBe(0);
    const bobRows = await storage.getUserProgress('bob');
    expect(bobRows.length).toBe(1);
    expect(bobRows[0]!.currentStep).toBe(9);
  });
});

describe('ClientStorage — project CRUD', () => {
  function makeProjectInput(overrides: Partial<InsertProject> = {}): InsertProject {
    return {
      userId: 'alice',
      name: 'My Game',
      template: 'platformer',
      published: false,
      files: [],
      assets: [],
      ...overrides,
    };
  }

  it('createProject + getProject round-trip', async () => {
    const storage = new ClientStorage();
    const created = await storage.createProject(makeProjectInput());
    expect(created.id).toBeTruthy();
    expect(created.published).toBe(false);
    expect(created.createdAt).toBeInstanceOf(Date);

    const fetched = await storage.getProject(created.id);
    expect(fetched?.id).toBe(created.id);
  });

  it('createProject ALWAYS sets published=false (override in input is ignored)', async () => {
    const storage = new ClientStorage();
    const sneaky = await storage.createProject(makeProjectInput({ published: true }));
    expect(sneaky.published).toBe(false);
  });

  it('updateProject merges + persists', async () => {
    const storage = new ClientStorage();
    const created = await storage.createProject(makeProjectInput({ name: 'Old' }));
    const updated = await storage.updateProject(created.id, { name: 'New' });
    expect(updated.name).toBe('New');
    expect(updated.id).toBe(created.id);
    const refetched = await storage.getProject(created.id);
    expect(refetched?.name).toBe('New');
  });

  it('updateProject throws "Project not found" for unknown id', async () => {
    const storage = new ClientStorage();
    await expect(storage.updateProject('does-not-exist', { name: 'X' })).rejects.toThrow(
      /Project not found/
    );
  });

  it('deleteProject removes the row', async () => {
    const storage = new ClientStorage();
    const created = await storage.createProject(makeProjectInput());
    await storage.deleteProject(created.id);
    expect(await storage.getProject(created.id)).toBeUndefined();
  });

  it('deleteProject is idempotent for unknown ids', async () => {
    const storage = new ClientStorage();
    await expect(storage.deleteProject('does-not-exist')).resolves.toBeUndefined();
  });

  it('listProjects returns only this user’s projects', async () => {
    const storage = new ClientStorage();
    await storage.createProject(makeProjectInput({ userId: 'alice', name: 'A' }));
    await storage.createProject(makeProjectInput({ userId: 'alice', name: 'B' }));
    await storage.createProject(makeProjectInput({ userId: 'bob', name: 'C' }));
    const aliceProjects = await storage.listProjects('alice');
    expect(aliceProjects.length).toBe(2);
    expect(aliceProjects.every((p) => p.userId === 'alice')).toBe(true);
  });
});

describe('ClientStorage — gallery / publish flow', () => {
  it('publishProject flips published + sets publishedAt', async () => {
    const storage = new ClientStorage();
    const created = await storage.createProject({
      userId: 'alice',
      name: 'P',
      template: 'platformer',
      published: false,
      files: [],
      assets: [],
    });
    expect(created.published).toBe(false);

    const pub = await storage.publishProject(created.id);
    expect(pub.published).toBe(true);
    expect(pub.publishedAt).toBeInstanceOf(Date);
  });

  it('unpublishProject flips published back + clears publishedAt', async () => {
    const storage = new ClientStorage();
    const created = await storage.createProject({
      userId: 'alice',
      name: 'P',
      template: 'platformer',
      published: false,
      files: [],
      assets: [],
    });
    await storage.publishProject(created.id);
    const unp = await storage.unpublishProject(created.id);
    expect(unp.published).toBe(false);
    expect(unp.publishedAt).toBeUndefined();
  });

  it('listPublishedProjects returns only published rows across all users', async () => {
    const storage = new ClientStorage();
    const a = await storage.createProject({
      userId: 'alice',
      name: 'A',
      template: 't',
      published: false,
      files: [],
      assets: [],
    });
    await storage.createProject({
      userId: 'bob',
      name: 'B',
      template: 't',
      published: false,
      files: [],
      assets: [],
    });
    await storage.publishProject(a.id);
    const published = await storage.listPublishedProjects();
    expect(published.length).toBe(1);
    expect(published[0]!.id).toBe(a.id);
  });
});
