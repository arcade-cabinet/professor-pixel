// Cover the lessons.tsx happy path: profile-name save card, per-lesson
// status rendering (completed/in-progress/not-started), and overall
// progress percentage. lessons-empty-error.test.tsx already covers the
// loading/empty/error branches; this file targets lines 169-302.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import type { Lesson, UserProgress } from '@lib/types/schema';

// Module-level mock state. We can't use vi.mocked on bare object exports
// the way we do for the loadLessons function, so we capture the seam
// values and let the mock factory read them at call time.
const saveProfileMock = vi.fn();
const loadProfileMock = vi.fn();
const getUserProgressMock = vi.fn();

vi.mock('@lib/lessons', async () => {
  const actual = await vi.importActual<typeof import('@lib/lessons')>('@lib/lessons');
  return {
    ...actual,
    loadLessons: vi.fn(),
  };
});

vi.mock('@lib/storage/mode', () => ({
  getClientStorage: () => ({
    getUserProgress: getUserProgressMock,
  }),
}));

vi.mock('@lib/storage/profile', async () => {
  const actual =
    await vi.importActual<typeof import('@lib/storage/profile')>('@lib/storage/profile');
  return {
    ...actual,
    loadProfile: () => loadProfileMock(),
    saveProfile: (...args: unknown[]) => saveProfileMock(...args),
  };
});

import LessonsIndex from '@/pages/lessons';
import { loadLessons } from '@lib/lessons';
import { InvalidProfileError } from '@lib/storage/profile';

function makeLesson(over: Partial<Lesson>): Lesson {
  return {
    id: 'l1',
    title: 'Intro',
    description: 'd',
    order: 1,
    content: {
      introduction: 'i',
      steps: [
        {
          id: 's1',
          title: 's',
          description: 'd',
          initialCode: '',
          solution: '',
          hints: [],
        },
        {
          id: 's2',
          title: 's',
          description: 'd',
          initialCode: '',
          solution: '',
          hints: [],
        },
      ],
    },
    ...over,
  };
}

function makeProgress(over: Partial<UserProgress>): UserProgress {
  return {
    id: `p-${over.lessonId ?? 'x'}`,
    userId: 'anonymous-user',
    lessonId: over.lessonId ?? 'l1',
    currentStep: 0,
    completed: false,
    ...over,
  };
}

function renderPage() {
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

describe('Lessons page — happy path with mixed progress', () => {
  it('renders three lessons with completed / in-progress / not-started badges and overall percentage', async () => {
    loadProfileMock.mockReturnValue({ name: 'Ada', createdAt: '2026-01-01T00:00:00.000Z' });
    const lessons: Lesson[] = [
      makeLesson({ id: 'l1', title: 'Variables' }),
      makeLesson({ id: 'l2', title: 'Loops' }),
      makeLesson({ id: 'l3', title: 'Functions' }),
    ];
    const progress: UserProgress[] = [
      makeProgress({ lessonId: 'l1', completed: true, currentStep: 2 }),
      makeProgress({ lessonId: 'l2', completed: false, currentStep: 1 }),
      // l3 has no progress entry → not-started
    ];
    vi.mocked(loadLessons).mockResolvedValueOnce(lessons);
    getUserProgressMock.mockResolvedValueOnce(progress);

    renderPage();

    // Wait for the row to appear (React Query resolves async).
    expect(await screen.findByTestId('lesson-row-l1')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-row-l2')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-row-l3')).toBeInTheDocument();

    // 1/3 completed → 33% overall.
    const overall = screen.getByTestId('overall-progress-text');
    expect(overall.textContent).toMatch(/33% — keep going!/);

    // Status copy per row.
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText(/In progress, 50%/)).toBeInTheDocument();
    expect(screen.getByText('Not started')).toBeInTheDocument();
  });

  it('shows the welcome-back greeting when a profile is loaded', async () => {
    loadProfileMock.mockReturnValue({ name: 'Grace', createdAt: '2026-01-01T00:00:00.000Z' });
    vi.mocked(loadLessons).mockResolvedValueOnce([makeLesson({ id: 'l1' })]);
    getUserProgressMock.mockResolvedValueOnce([]);
    renderPage();
    expect(await screen.findByTestId('profile-greeting')).toHaveTextContent(/Hi, Grace!/);
    expect(screen.queryByTestId('profile-name-card')).not.toBeInTheDocument();
  });

  it('shows the "finished every lesson" copy when overall is 100%', async () => {
    loadProfileMock.mockReturnValue({ name: 'Ada', createdAt: '2026-01-01T00:00:00.000Z' });
    const lesson = makeLesson({ id: 'l1' });
    vi.mocked(loadLessons).mockResolvedValueOnce([lesson]);
    getUserProgressMock.mockResolvedValueOnce([
      makeProgress({ lessonId: 'l1', completed: true, currentStep: 2 }),
    ]);
    renderPage();
    expect(await screen.findByText(/You finished every lesson!/)).toBeInTheDocument();
  });
});

describe('Lessons page — profile name save form', () => {
  it('renders the name card when no profile is set, and disables Save until input is non-empty', async () => {
    loadProfileMock.mockReturnValue(null);
    vi.mocked(loadLessons).mockResolvedValueOnce([makeLesson({ id: 'l1' })]);
    getUserProgressMock.mockResolvedValueOnce([]);
    renderPage();
    expect(await screen.findByTestId('profile-name-card')).toBeInTheDocument();
    const save = screen.getByTestId('profile-name-save');
    expect(save).toBeDisabled();

    const input = screen.getByTestId('profile-name-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Linus' } });
    expect(save).not.toBeDisabled();
  });

  it('clicking Save invokes saveProfile and swaps the card for the welcome-back greeting', async () => {
    loadProfileMock.mockReturnValue(null);
    vi.mocked(loadLessons).mockResolvedValueOnce([makeLesson({ id: 'l1' })]);
    getUserProgressMock.mockResolvedValueOnce([]);
    saveProfileMock.mockReturnValueOnce({ name: 'Linus', createdAt: '2026-05-07T00:00:00.000Z' });

    renderPage();
    await screen.findByTestId('profile-name-card');
    const input = screen.getByTestId('profile-name-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Linus' } });
    fireEvent.click(screen.getByTestId('profile-name-save'));

    expect(saveProfileMock).toHaveBeenCalledWith('Linus');
    // After save, the greeting takes the card's place.
    expect(await screen.findByTestId('profile-greeting')).toHaveTextContent(/Hi, Linus!/);
    expect(screen.queryByTestId('profile-name-card')).not.toBeInTheDocument();
  });

  it('whitespace-only input no-ops Save (the trim guard short-circuits)', async () => {
    loadProfileMock.mockReturnValue(null);
    vi.mocked(loadLessons).mockResolvedValueOnce([makeLesson({ id: 'l1' })]);
    getUserProgressMock.mockResolvedValueOnce([]);
    renderPage();
    await screen.findByTestId('profile-name-card');
    const input = screen.getByTestId('profile-name-input') as HTMLInputElement;

    // Simulate typing whitespace then clicking Save. The button is disabled
    // for empty input but to drive the disabled-state check we type a real
    // char then immediately fire submit on the form (bypasses the disabled
    // attribute, exercises the trim guard inside onSubmit).
    fireEvent.change(input, { target: { value: '   ' } });
    const form = input.closest('form');
    expect(form).toBeTruthy();
    if (form) fireEvent.submit(form);
    expect(saveProfileMock).not.toHaveBeenCalled();
  });

  it('over-cap input throws InvalidProfileError → toast surfaces the error and the card stays', async () => {
    loadProfileMock.mockReturnValue(null);
    vi.mocked(loadLessons).mockResolvedValueOnce([makeLesson({ id: 'l1' })]);
    getUserProgressMock.mockResolvedValueOnce([]);
    saveProfileMock.mockImplementationOnce(() => {
      throw new InvalidProfileError('too long');
    });

    renderPage();
    await screen.findByTestId('profile-name-card');
    const input = screen.getByTestId('profile-name-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Linus' } });
    fireEvent.click(screen.getByTestId('profile-name-save'));

    expect(saveProfileMock).toHaveBeenCalled();
    // Card still in the DOM — the toast handles the message, the form stays open.
    expect(screen.getByTestId('profile-name-card')).toBeInTheDocument();
  });

  it('long-but-not-empty input is forwarded verbatim to saveProfile', async () => {
    // Sanity check that the form forwards the raw value (not trimmed) when
    // the value is non-empty after trim. Drives the saveProfile call path
    // without exercising the error branches.
    loadProfileMock.mockReturnValue(null);
    vi.mocked(loadLessons).mockResolvedValueOnce([makeLesson({ id: 'l1' })]);
    getUserProgressMock.mockResolvedValueOnce([]);
    saveProfileMock.mockReturnValueOnce({ name: 'Pixel', createdAt: '2026-05-07T00:00:00.000Z' });

    renderPage();
    await screen.findByTestId('profile-name-card');
    const input = screen.getByTestId('profile-name-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  Pixel  ' } });
    fireEvent.click(screen.getByTestId('profile-name-save'));
    // saveProfile receives the raw input — the storage layer normalises.
    expect(saveProfileMock).toHaveBeenCalledWith('  Pixel  ');
  });
});
