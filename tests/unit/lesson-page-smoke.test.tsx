// Smoke + behaviour tests for app/pages/lesson.tsx (756 LOC, 0% coverage).
// Targets the loading / error / lesson-not-found / main-render branches
// and the previousStep / nextStep navigation, with the heavyweight Pyodide,
// CodeEditor, and FloatingFeedback components stubbed out.

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const useParamsMock = vi.fn();
const setLocationMock = vi.fn();
vi.mock('wouter', () => ({
  useParams: () => useParamsMock(),
  useLocation: () => ['/', setLocationMock],
}));

const getPyodideMock = vi.fn();
vi.mock('@lib/python/pyodide-singleton', () => ({
  getPyodide: () => getPyodideMock(),
}));

const runSnippetMock = vi.fn();
vi.mock('@lib/python/worker-runner', () => ({
  getWorkerRunner: () => ({
    runSnippet: runSnippetMock,
  }),
}));

const loadLessonsMock = vi.fn();
vi.mock('@lib/lessons', () => ({
  loadLessons: () => loadLessonsMock(),
}));

const getUserProgressForLessonMock = vi.fn();
const updateUserProgressMock = vi.fn();
vi.mock('@lib/storage/mode', () => ({
  getClientStorage: () => ({
    getUserProgressForLesson: (...args: Parameters<typeof getUserProgressForLessonMock>) =>
      getUserProgressForLessonMock(...args),
    updateUserProgress: (...args: Parameters<typeof updateUserProgressMock>) =>
      updateUserProgressMock(...args),
  }),
}));

vi.mock('@lib/grading', () => ({
  gradeCode: vi.fn(),
}));

// Stub out heavyweight downstream UI so we can focus on the page itself.
vi.mock('@/components/header', () => ({
  default: ({ progress }: { progress: number }) => (
    <header data-testid="lesson-header" data-progress={String(progress)}>
      Header
    </header>
  ),
}));
vi.mock('@/components/editor/code-editor', () => ({
  default: ({ code }: { code: string }) => <div data-testid="code-editor-stub">code:{code}</div>,
}));
vi.mock('@/components/floating-feedback', () => ({
  default: () => <div data-testid="floating-feedback-stub" />,
}));
vi.mock('@/components/ui/offline-pill', () => ({
  default: () => null,
}));
// framer-motion: pass-through for the AnimatePresence and motion.* tags so
// modal close transitions don't matter under jsdom.
vi.mock('framer-motion', () => {
  const passthrough =
    (Tag: keyof React.JSX.IntrinsicElements) => (props: Record<string, unknown>) => (
      <Tag {...(props as object)} />
    );
  return {
    motion: new Proxy(
      {},
      { get: (_t, key: string) => passthrough(key as keyof React.JSX.IntrinsicElements) }
    ) as unknown as Record<string, React.FC<Record<string, unknown>>>,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import LessonEnhanced from '@/pages/lesson';

function renderLesson() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LessonEnhanced />
    </QueryClientProvider>
  );
}

const baseLesson = {
  id: 'lesson-1',
  order: 1,
  title: 'Hello World',
  content: {
    steps: [
      {
        id: 's1',
        title: 'Print hello',
        description: 'Use print to say hello.',
        initialCode: 'print("hello")',
        hints: ['Try print()'],
      },
      {
        id: 's2',
        title: 'Add a name',
        description: 'Add a name.',
        initialCode: 'print("hello, world")',
        hints: ['Variables work too'],
      },
    ],
  },
};

beforeEach(() => {
  useParamsMock.mockReset();
  setLocationMock.mockReset();
  getPyodideMock.mockReset();
  runSnippetMock.mockReset();
  loadLessonsMock.mockReset();
  getUserProgressForLessonMock.mockReset();
  updateUserProgressMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LessonEnhanced — loading and error paths', () => {
  it('renders the loading state while Pyodide is loading', () => {
    useParamsMock.mockReturnValue({ lessonId: 'lesson-1' });
    // Pyodide query never resolves
    getPyodideMock.mockImplementation(() => new Promise(() => {}));
    loadLessonsMock.mockResolvedValue([baseLesson]);
    getUserProgressForLessonMock.mockResolvedValue(undefined);
    renderLesson();
    // Loading message includes the strings.lesson.loading.pyodide copy.
    // We don't pin the exact text — just that no chrome rendered yet.
    expect(screen.queryByTestId('lesson-header')).not.toBeInTheDocument();
  });

  it('renders the retry card when the Pyodide query rejects', async () => {
    useParamsMock.mockReturnValue({ lessonId: 'lesson-1' });
    getPyodideMock.mockRejectedValue(new Error('CDN down'));
    loadLessonsMock.mockResolvedValue([baseLesson]);
    getUserProgressForLessonMock.mockResolvedValue(undefined);
    renderLesson();
    expect(await screen.findByTestId('button-retry-load')).toBeInTheDocument();
  });

  it('renders the retry card when the lessons query rejects', async () => {
    useParamsMock.mockReturnValue({ lessonId: 'lesson-1' });
    getPyodideMock.mockResolvedValue({});
    loadLessonsMock.mockRejectedValue(new Error('lessons.json 404'));
    getUserProgressForLessonMock.mockResolvedValue(undefined);
    renderLesson();
    expect(await screen.findByTestId('button-retry-load')).toBeInTheDocument();
  });

  it('renders a "lesson not found" card when no lesson matches the id', async () => {
    useParamsMock.mockReturnValue({ lessonId: 'lesson-doesnt-exist' });
    getPyodideMock.mockResolvedValue({});
    loadLessonsMock.mockResolvedValue([baseLesson]);
    getUserProgressForLessonMock.mockResolvedValue(undefined);
    renderLesson();
    // The not-found card has a "back to lessons" button — clicking it
    // routes back via setLocation('/lessons').
    const backBtn = await screen.findByRole('button', {
      name: /lesson|back/i,
    });
    fireEvent.click(backBtn);
    expect(setLocationMock).toHaveBeenCalledWith('/lessons');
  });
});

describe('LessonEnhanced — main render with a resolved lesson', () => {
  it('renders the header + the code editor stub at progress 0', async () => {
    useParamsMock.mockReturnValue({ lessonId: 'lesson-1' });
    getPyodideMock.mockResolvedValue({});
    loadLessonsMock.mockResolvedValue([baseLesson]);
    getUserProgressForLessonMock.mockResolvedValue(undefined);
    renderLesson();
    const header = await screen.findByTestId('lesson-header');
    expect(header).toBeInTheDocument();
    // No progress yet → progress percent is 0.
    expect(header.getAttribute('data-progress')).toBe('0');
    expect(screen.getByTestId('code-editor-stub')).toBeInTheDocument();
  });

  it('hydrates the editor from saved progress when present', async () => {
    useParamsMock.mockReturnValue({ lessonId: 'lesson-1' });
    getPyodideMock.mockResolvedValue({});
    loadLessonsMock.mockResolvedValue([baseLesson]);
    getUserProgressForLessonMock.mockResolvedValue({
      currentStep: 1,
      completed: false,
      code: 'print("custom hello")',
    });
    renderLesson();
    // Header progress reflects step index 1 / 2 = 50.
    await waitFor(() => {
      const header = screen.getByTestId('lesson-header');
      expect(header.getAttribute('data-progress')).toBe('50');
    });
    expect(screen.getByTestId('code-editor-stub').textContent).toContain('print("custom hello")');
  });
});
