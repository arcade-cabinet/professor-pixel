import { useQuery } from '@tanstack/react-query';
import type { Lesson, UserProgress } from '@lib/types/schema';
import { loadLessons } from './loader';
import { sequenceLessons, type SequencedLessons } from './sequence';

/** Lazily fetch + validate the lesson catalog. */
export function useLessons() {
  return useQuery<Lesson[], Error>({
    queryKey: ['lessons'],
    queryFn: () => loadLessons(),
    staleTime: Infinity, // catalog is static; only refetch on hard reload
  });
}

/** Combine the catalog with the user's progress to produce the home-page split. */
export function useSequencedLessons(progress: UserProgress[] = []): {
  data: SequencedLessons | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useLessons();
  return {
    data: data ? sequenceLessons(data, progress) : undefined,
    isLoading,
    error: error ?? null,
  };
}
