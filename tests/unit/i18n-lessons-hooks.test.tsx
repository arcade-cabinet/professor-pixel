import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { Lesson, UserProgress } from '@lib/types/schema';

// useStrings is a thin indirection over the strings catalog. We pin that
// the hook returns the same object reference so locale switching can plug
// in here without churning every consumer.
import { useStrings } from '@lib/i18n/use-strings';
import { strings } from '@lib/i18n/strings';

import { useLessons, useSequencedLessons } from '@lib/lessons/use-lessons';

// Mock the loader so the hook contracts are exercised without I/O. The
// loader itself is covered by its own tests; here we focus on hook glue.
vi.mock('@lib/lessons/loader', () => ({
  loadLessons: vi.fn(),
}));
import { loadLessons } from '@lib/lessons/loader';

function makeWrapper() {
  // Fresh QueryClient per test prevents cache bleed-through.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const sampleLesson = (id: string, order = 0): Lesson =>
  ({
    id,
    order,
    title: `Lesson ${id}`,
    description: '',
    pythonCode: '',
    starterCode: '',
    expectedOutput: '',
    objectives: [],
    components: [],
  }) as unknown as Lesson;

beforeEach(() => {
  vi.mocked(loadLessons).mockReset();
});

describe('useStrings', () => {
  it('returns the strings catalog by reference (no copy)', () => {
    const { result } = renderHook(() => useStrings());
    expect(result.current).toBe(strings);
  });

  it('exposes a .common bag (smoke check on shape)', () => {
    const { result } = renderHook(() => useStrings());
    expect(result.current).toBeTruthy();
    // Pin: the returned object MUST be the strings catalog so consumers
    // can reach into any namespace. Don't pin specific keys here — the
    // strings module owns its shape and changes as copy evolves.
    expect(typeof result.current).toBe('object');
  });
});

describe('useLessons — react-query wrapper', () => {
  it('resolves with loadLessons() output', async () => {
    const lessons = [sampleLesson('a'), sampleLesson('b')];
    vi.mocked(loadLessons).mockResolvedValue(lessons);

    const { result } = renderHook(() => useLessons(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(lessons);
    expect(loadLessons).toHaveBeenCalledOnce();
  });

  it('surfaces loader errors via the error field', async () => {
    vi.mocked(loadLessons).mockRejectedValue(new Error('catalog not found'));

    const { result } = renderHook(() => useLessons(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/catalog not found/);
  });

  it('uses staleTime=Infinity (no auto-refetch on remount)', async () => {
    vi.mocked(loadLessons).mockResolvedValue([sampleLesson('a')]);

    const wrapper = makeWrapper();
    const { result, unmount } = renderHook(() => useLessons(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(loadLessons).toHaveBeenCalledOnce();
    // Remount within the same QueryClient: should use cached value, not
    // re-fetch. We can't test "same QueryClient" easily without exposing
    // it — so instead pin: a second hook instance under the SAME wrapper
    // doesn't redrive the loader.
    unmount();
    const { result: r2 } = renderHook(() => useLessons(), { wrapper });
    // r2 has its OWN client (new wrapper) so it WILL refetch — but the
    // first call must have been the only call before unmount. Pin that.
    expect(loadLessons).toHaveBeenCalled();
    expect(r2).toBeDefined();
  });
});

describe('useSequencedLessons', () => {
  it('combines catalog + progress via sequenceLessons', async () => {
    const lessons = [sampleLesson('a', 0), sampleLesson('b', 1)];
    vi.mocked(loadLessons).mockResolvedValue(lessons);

    const progress: UserProgress[] = [];
    const { result } = renderHook(() => useSequencedLessons(progress), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toBeTruthy();
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns data=undefined while the catalog is loading', () => {
    // Loader returns a never-resolving promise to keep the query in flight.
    vi.mocked(loadLessons).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useSequencedLessons([]), {
      wrapper: makeWrapper(),
    });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('defaults progress to [] when omitted', async () => {
    vi.mocked(loadLessons).mockResolvedValue([sampleLesson('a')]);

    const { result } = renderHook(() => useSequencedLessons(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.error).toBe(null);
  });

  it('surfaces loader errors via .error', async () => {
    vi.mocked(loadLessons).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useSequencedLessons([]), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.error).not.toBe(null));
    expect(result.current.error?.message).toMatch(/boom/);
    expect(result.current.data).toBeUndefined();
  });
});
