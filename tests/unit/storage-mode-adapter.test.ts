import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// StorageAdapter is a thin pass-through over ClientStorage. We mock the
// ClientStorage class so each adapter method's plumbing — argument
// shape, default-userId, and storage routing — is pinned without an
// actual localStorage / OPFS round-trip.
//
// vi.resetModules() in beforeEach ensures the module-level
// `clientStorageInstance` singleton is fresh per test, so getClientStorage()
// idempotency can be verified.

const fakeStorageMethods = {
  getLessons: vi.fn(),
  getLesson: vi.fn(),
  getUserProgress: vi.fn(),
  getUserProgressForLesson: vi.fn(),
  updateUserProgress: vi.fn(),
  listProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  listPublishedProjects: vi.fn(),
};

vi.mock('@lib/storage/client', () => ({
  // Real class so `new ClientStorage()` works after vi.resetModules().
  // Returning fakeStorageMethods from the constructor is allowed in JS;
  // wrapping it as a class keeps the `new`-ability stable across module
  // re-imports.
  ClientStorage: class {
    constructor() {
      Object.assign(this, fakeStorageMethods);
    }
  },
}));

beforeEach(() => {
  vi.resetModules();
  for (const fn of Object.values(fakeStorageMethods)) fn.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getClientStorage — singleton', () => {
  it('returns the same ClientStorage instance on repeated calls', async () => {
    const { getClientStorage } = await import('@lib/storage/mode');
    const a = getClientStorage();
    const b = getClientStorage();
    expect(a).toBe(b);
  });

  it('shares the storage across StorageAdapter instances (singleton routing)', async () => {
    const { StorageAdapter, getClientStorage } = await import('@lib/storage/mode');
    const a = new StorageAdapter();
    const b = new StorageAdapter();
    // Each adapter holds the singleton, so calls from both go to the
    // same ClientStorage method object.
    await a.getLessons();
    await b.getLessons();
    expect(fakeStorageMethods.getLessons).toHaveBeenCalledTimes(2);
    // The singleton itself stayed identity-stable across the two adapter
    // constructions.
    expect(getClientStorage()).toBe(getClientStorage());
  });
});

describe('StorageAdapter — lesson methods', () => {
  it('getLessons() forwards to ClientStorage.getLessons', async () => {
    fakeStorageMethods.getLessons.mockResolvedValue(['lesson-a']);
    const { StorageAdapter } = await import('@lib/storage/mode');
    const adapter = new StorageAdapter();
    const out = await adapter.getLessons();
    expect(fakeStorageMethods.getLessons).toHaveBeenCalledOnce();
    expect(out).toEqual(['lesson-a']);
  });

  it('getLesson(id) passes the id through', async () => {
    fakeStorageMethods.getLesson.mockResolvedValue({ id: 'l1' });
    const { StorageAdapter } = await import('@lib/storage/mode');
    const adapter = new StorageAdapter();
    await adapter.getLesson('l1');
    expect(fakeStorageMethods.getLesson).toHaveBeenCalledWith('l1');
  });
});

describe('StorageAdapter — progress methods (default userId = "anonymous-user")', () => {
  it('getUserProgress() defaults userId', async () => {
    const { StorageAdapter } = await import('@lib/storage/mode');
    const adapter = new StorageAdapter();
    await adapter.getUserProgress();
    expect(fakeStorageMethods.getUserProgress).toHaveBeenCalledWith('anonymous-user');
  });

  it('getUserProgress(userId) honors explicit userId', async () => {
    const { StorageAdapter } = await import('@lib/storage/mode');
    const adapter = new StorageAdapter();
    await adapter.getUserProgress('alice');
    expect(fakeStorageMethods.getUserProgress).toHaveBeenCalledWith('alice');
  });

  it('getUserProgressForLesson() reorders args (lessonId, userId) → (userId, lessonId)', async () => {
    const { StorageAdapter } = await import('@lib/storage/mode');
    const adapter = new StorageAdapter();
    await adapter.getUserProgressForLesson('lesson-1');
    expect(fakeStorageMethods.getUserProgressForLesson).toHaveBeenCalledWith(
      'anonymous-user',
      'lesson-1'
    );

    await adapter.getUserProgressForLesson('lesson-2', 'bob');
    expect(fakeStorageMethods.getUserProgressForLesson).toHaveBeenCalledWith('bob', 'lesson-2');
  });

  it('updateUserProgress() reorders args (lessonId, data, userId) → (userId, lessonId, data)', async () => {
    const { StorageAdapter } = await import('@lib/storage/mode');
    const adapter = new StorageAdapter();
    const data = { currentStep: 3 };
    await adapter.updateUserProgress('lesson-1', data);
    expect(fakeStorageMethods.updateUserProgress).toHaveBeenCalledWith(
      'anonymous-user',
      'lesson-1',
      data
    );

    await adapter.updateUserProgress('lesson-2', data, 'carol');
    expect(fakeStorageMethods.updateUserProgress).toHaveBeenCalledWith('carol', 'lesson-2', data);
  });
});

describe('StorageAdapter — project methods', () => {
  it('listProjects() defaults userId', async () => {
    const { StorageAdapter } = await import('@lib/storage/mode');
    const adapter = new StorageAdapter();
    await adapter.listProjects();
    expect(fakeStorageMethods.listProjects).toHaveBeenCalledWith('anonymous-user');
  });

  it('getProject(id) passes the id through', async () => {
    const { StorageAdapter } = await import('@lib/storage/mode');
    const adapter = new StorageAdapter();
    await adapter.getProject('p1');
    expect(fakeStorageMethods.getProject).toHaveBeenCalledWith('p1');
  });

  it('createProject() injects userId into the project payload', async () => {
    const { StorageAdapter } = await import('@lib/storage/mode');
    const adapter = new StorageAdapter();
    const project = {
      name: 'My Game',
      template: 'platformer',
      published: false,
      createdAt: new Date(),
      files: [],
      assets: [],
    } as Parameters<typeof adapter.createProject>[0];
    await adapter.createProject(project);
    expect(fakeStorageMethods.createProject).toHaveBeenCalledWith({
      ...project,
      userId: 'anonymous-user',
    });

    await adapter.createProject(project, 'dave');
    expect(fakeStorageMethods.createProject).toHaveBeenCalledWith({
      ...project,
      userId: 'dave',
    });
  });

  it('updateProject(id, updates) passes through both args', async () => {
    const { StorageAdapter } = await import('@lib/storage/mode');
    const adapter = new StorageAdapter();
    const updates = { name: 'Renamed' };
    await adapter.updateProject('p1', updates);
    expect(fakeStorageMethods.updateProject).toHaveBeenCalledWith('p1', updates);
  });

  it('deleteProject(id) passes the id through', async () => {
    const { StorageAdapter } = await import('@lib/storage/mode');
    const adapter = new StorageAdapter();
    await adapter.deleteProject('p1');
    expect(fakeStorageMethods.deleteProject).toHaveBeenCalledWith('p1');
  });

  it('listPublishedProjects() takes no args and forwards', async () => {
    const { StorageAdapter } = await import('@lib/storage/mode');
    const adapter = new StorageAdapter();
    await adapter.listPublishedProjects();
    expect(fakeStorageMethods.listPublishedProjects).toHaveBeenCalledOnce();
    expect(fakeStorageMethods.listPublishedProjects).toHaveBeenCalledWith();
  });
});
