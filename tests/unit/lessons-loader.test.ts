import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Loader exposes a module-level cache, so we re-import per test via
// vi.resetModules() to keep the cache state isolated. The __resetLessonsForTests
// helper handles intra-import resets, but vi.resetModules covers the
// "first import" path explicitly.

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function makeValidLesson(overrides: Record<string, unknown> = {}) {
  return {
    id: 'l1',
    title: 'Lesson One',
    description: 'desc',
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
    ...overrides,
  };
}

describe('loadLessons — happy path', () => {
  it('fetches, validates, and returns the lesson catalog', async () => {
    const lessons = [makeValidLesson()];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => lessons,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { loadLessons } = await import('@lib/lessons/loader');
    const out = await loadLessons();
    expect(out).toEqual(lessons);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]![0]).toMatch(/lessons\.json$/);
  });

  it('caches the resolved promise — second call does not re-fetch', async () => {
    const lessons = [makeValidLesson()];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => lessons,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { loadLessons } = await import('@lib/lessons/loader');
    const a = await loadLessons();
    const b = await loadLessons();
    expect(a).toEqual(lessons);
    expect(b).toEqual(lessons);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('__resetLessonsForTests drops the cache so the next call refetches', async () => {
    const lessons = [makeValidLesson()];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => lessons,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { loadLessons, __resetLessonsForTests } = await import('@lib/lessons/loader');
    await loadLessons();
    expect(fetchMock).toHaveBeenCalledOnce();
    __resetLessonsForTests();
    await loadLessons();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('loadLessons — error paths', () => {
  it('throws on non-OK HTTP response (and does NOT cache the failure)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' })
      .mockResolvedValueOnce({ ok: true, json: async () => [makeValidLesson()] });
    vi.stubGlobal('fetch', fetchMock);

    const { loadLessons } = await import('@lib/lessons/loader');
    await expect(loadLessons()).rejects.toThrow(/HTTP 404/);
    // Pin: a failed fetch must NOT poison the cache. Next call retries.
    const out = await loadLessons();
    expect(out.length).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws on schema validation failure with a useful issue message', async () => {
    // Missing required `title` triggers zod failure.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'bad', order: 0, content: { introduction: '', steps: [] } }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const { loadLessons } = await import('@lib/lessons/loader');
    await expect(loadLessons()).rejects.toThrow(/schema validation/);
  });

  it('schema-validation failure also clears the cache (next call retries)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'bad' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [makeValidLesson()],
      });
    vi.stubGlobal('fetch', fetchMock);

    const { loadLessons } = await import('@lib/lessons/loader');
    await expect(loadLessons()).rejects.toThrow();
    const out = await loadLessons();
    expect(out.length).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rethrows network errors (fetch reject)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    const { loadLessons } = await import('@lib/lessons/loader');
    await expect(loadLessons()).rejects.toThrow(/offline/);
  });

  it('schema-validation error message is truncated to 5 issues', async () => {
    // Build an array of 10 invalid lessons so zod produces >5 issues.
    const invalid = Array.from({ length: 10 }, (_, i) => ({ id: `l${i}` }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => invalid,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { loadLessons } = await import('@lib/lessons/loader');
    let caught: Error | null = null;
    try {
      await loadLessons();
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).toBeTruthy();
    // The message joins issues with '; ' — counting separators is the
    // most stable way to pin the 5-issue cap (4 separators between 5 items).
    const semicolons = (caught!.message.match(/; /g) || []).length;
    expect(semicolons).toBeLessThanOrEqual(4);
  });
});
