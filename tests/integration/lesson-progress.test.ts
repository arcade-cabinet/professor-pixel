/**
 * @vitest-environment jsdom
 *
 * Step-level resume: ClientStorage persists currentStep + code, and the
 * lesson page reads them on mount. The page UI itself depends on Pyodide,
 * which can't run in jsdom — but the storage path (which is the durable
 * piece) can. This test exercises that path end-to-end.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClientStorage } from '@lib/storage/client';

describe('Lesson progress storage round-trip (T4.3)', () => {
  let storage: ClientStorage;

  beforeEach(() => {
    localStorage.clear();
    storage = new ClientStorage();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('persists currentStep across reloads', async () => {
    await storage.updateUserProgress('local-user', 'lesson-3', {
      currentStep: 3,
      code: "print('halfway')",
    });
    // Simulate page reload: fresh ClientStorage instance reading the same localStorage.
    const fresh = new ClientStorage();
    const restored = await fresh.getUserProgressForLesson('local-user', 'lesson-3');
    expect(restored?.currentStep).toBe(3);
    expect(restored?.code).toBe("print('halfway')");
  });

  it('marks completed when the lesson finishes', async () => {
    await storage.updateUserProgress('local-user', 'lesson-1', {
      currentStep: 5,
      completed: true,
    });
    const restored = await storage.getUserProgressForLesson('local-user', 'lesson-1');
    expect(restored?.completed).toBe(true);
  });

  it('isolates progress per lesson', async () => {
    await storage.updateUserProgress('local-user', 'lesson-1', { currentStep: 2 });
    await storage.updateUserProgress('local-user', 'lesson-2', { currentStep: 4 });
    const a = await storage.getUserProgressForLesson('local-user', 'lesson-1');
    const b = await storage.getUserProgressForLesson('local-user', 'lesson-2');
    expect(a?.currentStep).toBe(2);
    expect(b?.currentStep).toBe(4);
  });

  it('overwrites earlier progress on the same lesson', async () => {
    await storage.updateUserProgress('local-user', 'lesson-1', { currentStep: 1 });
    await storage.updateUserProgress('local-user', 'lesson-1', { currentStep: 3 });
    const restored = await storage.getUserProgressForLesson('local-user', 'lesson-1');
    expect(restored?.currentStep).toBe(3);
  });

  it('returns undefined for a lesson the user has never opened', async () => {
    const restored = await storage.getUserProgressForLesson('local-user', 'never-touched');
    expect(restored).toBeUndefined();
  });
});
