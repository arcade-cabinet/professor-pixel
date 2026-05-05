import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import LessonsIndex from '@/pages/lessons';

// Mock the lesson loader so each test can stub success / empty / error
// without hitting the real JSON catalog.
vi.mock('@lib/lessons', async () => {
  const actual = await vi.importActual<typeof import('@lib/lessons')>('@lib/lessons');
  return {
    ...actual,
    loadLessons: vi.fn(),
  };
});

vi.mock('@lib/storage/mode', () => ({
  getClientStorage: () => ({
    getUserProgress: vi.fn(async () => []),
  }),
}));

vi.mock('@lib/storage/profile', () => ({
  loadProfile: () => null,
  saveProfile: vi.fn(),
}));

import { loadLessons } from '@lib/lessons';

function renderWithProviders() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { hook } = memoryLocation({ path: '/lessons' });
  return render(
    <QueryClientProvider client={client}>
      <Router hook={hook}>
        <LessonsIndex />
      </Router>
    </QueryClientProvider>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('Lessons page — error + empty branches', () => {
  it('renders the error state with refresh + skip-to-wizard CTAs when fetch fails', async () => {
    vi.mocked(loadLessons).mockRejectedValueOnce(new Error('network down'));
    renderWithProviders();
    // React Query reports the error on next tick; findByTestId polls until visible.
    expect(await screen.findByTestId('lessons-error-state')).toBeInTheDocument();
    expect(screen.getByTestId('lessons-error-refresh')).toBeInTheDocument();
    expect(screen.getByTestId('lessons-error-skip')).toBeInTheDocument();
    expect(screen.getByText(/couldn't reach the lesson library/i)).toBeInTheDocument();
  });

  it('renders the empty state with a single skip-to-wizard CTA when the catalog is empty', async () => {
    vi.mocked(loadLessons).mockResolvedValueOnce([]);
    renderWithProviders();
    expect(await screen.findByTestId('lessons-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('lessons-empty-skip')).toBeInTheDocument();
    expect(screen.getByText(/no lessons available yet/i)).toBeInTheDocument();
  });

  it('renders a Skeleton row layout while lessons are loading (P4.13)', () => {
    // Don't resolve loadLessons — leave React Query in pending state so
    // the loading branch renders. The skeleton container marks itself
    // aria-busy so AT users know to wait, and renders four placeholder
    // rows shaped like the real lesson cards (icon-circle + 2 text bars)
    // to prime the eye for the list and prevent layout shift on arrival.
    vi.mocked(loadLessons).mockImplementation(() => new Promise(() => {}));
    renderWithProviders();
    const skeleton = screen.getByTestId('lessons-loading-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  });
});
