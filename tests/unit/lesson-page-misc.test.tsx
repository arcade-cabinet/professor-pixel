// Lesson-page edge cases the smoke + extras + nav suites missed:
//   - executeCode early-return when code.trim() is empty (lines 165-167)
//   - saved-progress hydration without `code` falls back to initialCode
//     (lines 143-145 — the else-if branch)
//   - handleNextStep advances + resets output/error (lines 270-280)

import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const useParamsMock = vi.fn();
vi.mock('wouter', () => ({
  useParams: () => useParamsMock(),
  useLocation: () => ['/', vi.fn()],
}));

const getPyodideMock = vi.fn();
vi.mock('@lib/python/pyodide-singleton', () => ({
  getPyodide: () => getPyodideMock(),
}));

const runSnippetMock = vi.fn();
vi.mock('@lib/python/worker-runner', () => ({
  getWorkerRunner: () => ({ runSnippet: runSnippetMock }),
}));

const loadLessonsMock = vi.fn();
vi.mock('@lib/lessons', () => ({
  loadLessons: () => loadLessonsMock(),
}));

const getUserProgressForLessonMock = vi.fn();
const updateUserProgressMock = vi.fn();
vi.mock('@lib/storage/mode', () => ({
  getClientStorage: () => ({
    getUserProgressForLesson: (
      ...args: Parameters<typeof getUserProgressForLessonMock>
    ) => getUserProgressForLessonMock(...args),
    updateUserProgress: (
      ...args: Parameters<typeof updateUserProgressMock>
    ) => updateUserProgressMock(...args),
  }),
}));

vi.mock('@lib/grading', () => ({ gradeCode: vi.fn() }));
vi.mock('@/components/header', () => ({
  default: () => <header data-testid="lesson-header">Header</header>,
}));
vi.mock('@/components/editor/code-editor', () => ({
  default: ({
    code,
    onExecute,
  }: {
    code: string;
    onExecute: (input: string, runAutoGrading: boolean) => void;
  }) => (
    <div>
      <pre data-testid="code-editor-stub">code:{code}</pre>
      <button
        type="button"
        data-testid="editor-execute-stub"
        onClick={() => onExecute('', false)}
      >
        editor-execute
      </button>
    </div>
  ),
}));
vi.mock('@/components/floating-feedback', () => ({ default: () => null }));
vi.mock('@/components/ui/offline-pill', () => ({ default: () => null }));
vi.mock('framer-motion', () => {
  const passthrough =
    (Tag: keyof React.JSX.IntrinsicElements) =>
    (props: Record<string, unknown>) => <Tag {...(props as object)} />;
  return {
    motion: new Proxy(
      {},
      { get: (_t, key: string) => passthrough(key as keyof React.JSX.IntrinsicElements) }
    ) as unknown as Record<string, React.FC<Record<string, unknown>>>,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import LessonEnhanced from '@/pages/lesson';

const lesson1 = {
  id: 'lesson-1',
  order: 1,
  title: 'Hello',
  content: {
    steps: [
      { id: 's1', title: 'Step 1', description: 'd1', initialCode: 'print(1)' },
      { id: 's2', title: 'Step 2', description: 'd2', initialCode: 'print(2)' },
    ],
  },
};

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

beforeEach(() => {
  useParamsMock.mockReset().mockReturnValue({ lessonId: 'lesson-1' });
  getPyodideMock.mockReset().mockResolvedValue({});
  runSnippetMock.mockReset();
  loadLessonsMock.mockReset().mockResolvedValue([lesson1]);
  getUserProgressForLessonMock.mockReset();
  updateUserProgressMock.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LessonEnhanced — saved progress without code falls back to initialCode', () => {
  it('hydrates editor from step.initialCode when progress.code is undefined', async () => {
    getUserProgressForLessonMock.mockResolvedValue({
      currentStep: 1,
      completed: false,
      // intentionally no `code` field — exercises the else-if at line 143.
    });
    renderLesson();
    await screen.findByTestId('lesson-header');
    // Editor should hold the step-2 initialCode 'print(2)'.
    await waitFor(() => {
      expect(screen.getByTestId('code-editor-stub').textContent).toContain(
        'print(2)'
      );
    });
  });
});

describe('LessonEnhanced — executeCode early returns', () => {
  it('with empty code, executeCode is a no-op (no runSnippet call)', async () => {
    getUserProgressForLessonMock.mockResolvedValue({
      currentStep: 0,
      completed: false,
      code: '   ', // whitespace-only → trim() → '' → early return
    });
    renderLesson();
    await screen.findByTestId('lesson-header');
    fireEvent.click(screen.getByTestId('editor-execute-stub'));
    // Give the early-return path time to settle.
    await new Promise((r) => setTimeout(r, 30));
    expect(runSnippetMock).not.toHaveBeenCalled();
  });
});

describe('LessonEnhanced — Next button on a non-last step', () => {
  it('clicking Next advances currentStepIndex and persists the new step + initialCode', async () => {
    getUserProgressForLessonMock.mockResolvedValue(undefined);
    renderLesson();
    await screen.findByTestId('lesson-header');
    const nextBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.trim().startsWith('Next'));
    expect(nextBtn).toBeDefined();
    fireEvent.click(nextBtn!);
    await waitFor(() => {
      const calls = updateUserProgressMock.mock.calls;
      const advance = calls.some(([, , data]) => {
        const d = data as { currentStep?: number; code?: string };
        return d?.currentStep === 1 && d?.code === 'print(2)';
      });
      expect(advance).toBe(true);
    });
  });
});
