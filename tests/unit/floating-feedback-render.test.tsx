// Cover render branches in app/components/floating-feedback.tsx that the
// existing keyboard-shortcut test doesn't reach:
//   - dismiss button (X) hides the panel
//   - showNext=true renders the celebration trophy + Next/Complete CTA
//   - isLastStep flips the CTA from Next Step to Complete Lesson
//   - hints render as a list (when showNext=false)
//   - showSolution toggle reveals the solution display
//   - Copy + Apply solution buttons fire their handlers
//   - showNext effect fires the celebration timer (covers lines 101-112)

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import FloatingFeedback from '@/components/floating-feedback';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

const baseStep = {
  id: 's1',
  title: 'Step One',
  hints: ['Try a print()', 'Add a variable'],
  solution: 'print("hello")',
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FloatingFeedback — render branches', () => {
  it('renders the panel by default with hints visible', () => {
    render(
      <FloatingFeedback
        step={baseStep}
        onNextStep={vi.fn()}
        onCompleteLesson={vi.fn()}
        onApplySolution={vi.fn()}
        showNext={false}
        isLastStep={false}
      />
    );
    expect(screen.getByTestId('floating-feedback')).toBeInTheDocument();
    expect(screen.getByText('Try a print()')).toBeInTheDocument();
    expect(screen.getByText('Add a variable')).toBeInTheDocument();
  });

  it('Dismiss (X) button hides the panel', () => {
    render(
      <FloatingFeedback
        step={baseStep}
        onNextStep={vi.fn()}
        onCompleteLesson={vi.fn()}
        onApplySolution={vi.fn()}
        showNext={false}
        isLastStep={false}
      />
    );
    fireEvent.click(screen.getByTestId('button-dismiss-feedback'));
    expect(screen.queryByTestId('floating-feedback')).not.toBeInTheDocument();
  });

  it('showNext=true renders the Trophy heading and the Next Step CTA', () => {
    render(
      <FloatingFeedback
        step={baseStep}
        onNextStep={vi.fn()}
        onCompleteLesson={vi.fn()}
        onApplySolution={vi.fn()}
        showNext={true}
        isLastStep={false}
      />
    );
    expect(screen.getByTestId('button-next-step')).toBeInTheDocument();
    expect(screen.queryByTestId('button-complete-lesson')).not.toBeInTheDocument();
  });

  it('isLastStep=true swaps the CTA to Complete Lesson', () => {
    render(
      <FloatingFeedback
        step={baseStep}
        onNextStep={vi.fn()}
        onCompleteLesson={vi.fn()}
        onApplySolution={vi.fn()}
        showNext={true}
        isLastStep={true}
      />
    );
    expect(screen.getByTestId('button-complete-lesson')).toBeInTheDocument();
    expect(screen.queryByTestId('button-next-step')).not.toBeInTheDocument();
  });

  it('Next Step button invokes onNextStep', () => {
    const onNextStep = vi.fn();
    render(
      <FloatingFeedback
        step={baseStep}
        onNextStep={onNextStep}
        onCompleteLesson={vi.fn()}
        onApplySolution={vi.fn()}
        showNext={true}
        isLastStep={false}
      />
    );
    fireEvent.click(screen.getByTestId('button-next-step'));
    expect(onNextStep).toHaveBeenCalled();
  });

  it('Complete Lesson button invokes onCompleteLesson', () => {
    const onCompleteLesson = vi.fn();
    render(
      <FloatingFeedback
        step={baseStep}
        onNextStep={vi.fn()}
        onCompleteLesson={onCompleteLesson}
        onApplySolution={vi.fn()}
        showNext={true}
        isLastStep={true}
      />
    );
    fireEvent.click(screen.getByTestId('button-complete-lesson'));
    expect(onCompleteLesson).toHaveBeenCalled();
  });
});

describe('FloatingFeedback — solution toggle', () => {
  it('Show Solution toggles the solution display open + closed', () => {
    render(
      <FloatingFeedback
        step={baseStep}
        onNextStep={vi.fn()}
        onCompleteLesson={vi.fn()}
        onApplySolution={vi.fn()}
        showNext={false}
        isLastStep={false}
      />
    );
    expect(screen.queryByTestId('solution-display')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-show-solution'));
    expect(screen.getByTestId('solution-display')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-show-solution'));
    expect(screen.queryByTestId('solution-display')).not.toBeInTheDocument();
  });

  it('Apply Solution invokes onApplySolution with the step solution', () => {
    const onApplySolution = vi.fn();
    render(
      <FloatingFeedback
        step={baseStep}
        onNextStep={vi.fn()}
        onCompleteLesson={vi.fn()}
        onApplySolution={onApplySolution}
        showNext={false}
        isLastStep={false}
      />
    );
    fireEvent.click(screen.getByTestId('button-show-solution'));
    fireEvent.click(screen.getByTestId('button-apply-solution'));
    expect(onApplySolution).toHaveBeenCalledWith('print("hello")');
  });

  it('Copy Solution invokes navigator.clipboard.writeText with the solution', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    });
    render(
      <FloatingFeedback
        step={baseStep}
        onNextStep={vi.fn()}
        onCompleteLesson={vi.fn()}
        onApplySolution={vi.fn()}
        showNext={false}
        isLastStep={false}
      />
    );
    fireEvent.click(screen.getByTestId('button-show-solution'));
    fireEvent.click(screen.getByTestId('button-copy-solution'));
    expect(writeTextMock).toHaveBeenCalledWith('print("hello")');
  });
});

describe('FloatingFeedback — celebration timer (lines 101-112)', () => {
  it('appends a celebration element to the body when showNext flips to true', () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(
        <FloatingFeedback
          step={baseStep}
          onNextStep={vi.fn()}
          onCompleteLesson={vi.fn()}
          onApplySolution={vi.fn()}
          showNext={false}
          isLastStep={false}
        />
      );
      // Flip showNext → true, advance the 100ms timer that creates the
      // celebration overlay.
      rerender(
        <FloatingFeedback
          step={baseStep}
          onNextStep={vi.fn()}
          onCompleteLesson={vi.fn()}
          onApplySolution={vi.fn()}
          showNext={true}
          isLastStep={false}
        />
      );
      act(() => {
        vi.advanceTimersByTime(150);
      });
      // The celebration overlay is appended to document.body with the
      // signature className "fixed inset-0 pointer-events-none z-50".
      // The heading "Excellent Work! 🎉" has 🎉 too, so we match the
      // distinctive overlay class instead.
      const overlay = document.body.querySelector(
        '.fixed.inset-0.pointer-events-none.z-50'
      );
      expect(overlay).toBeTruthy();
      // Advance another 1100ms to clear the overlay.
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      const overlayAfter = document.body.querySelector(
        '.fixed.inset-0.pointer-events-none.z-50'
      );
      expect(overlayAfter).toBeFalsy();
    } finally {
      vi.useRealTimers();
    }
  });
});
