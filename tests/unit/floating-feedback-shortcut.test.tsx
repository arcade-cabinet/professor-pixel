// P4.16 — `?` keyboard shortcut toggles the FloatingFeedback hint panel.
//
// The shortcut is global (document-bound keydown) so kids can summon
// the hint from anywhere. It is gated to NOT fire while typing in an
// input/textarea/contenteditable so it doesn't intercept the literal
// `?` character a kid is trying to type into the rename box, the
// asset-browser search, or Monaco. Modifier-held presses (Cmd+?,
// Ctrl+?, Alt+?) are also ignored to leave browser shortcuts alone.

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import FloatingFeedback from '@/components/floating-feedback';

const baseStep = {
  id: 'step-1',
  title: 'Hello world',
  hints: ['Try `print("hi")`'],
  solution: 'print("hi")',
};

const baseProps = {
  step: baseStep,
  onNextStep: vi.fn(),
  onCompleteLesson: vi.fn(),
  onApplySolution: vi.fn(),
  showNext: false,
  isLastStep: false,
};

// The hint panel always renders a dismiss button (testid stable across
// the showNext/grading branches) — that's our visibility probe.
const isPanelVisible = () => screen.queryByTestId('button-dismiss-feedback') !== null;

describe('FloatingFeedback `?` keyboard shortcut (P4.16)', () => {
  it('hides the panel on `?` press, then shows it again on a second press', () => {
    render(<FloatingFeedback {...baseProps} />);
    expect(isPanelVisible()).toBe(true);

    fireEvent.keyDown(document, { key: '?' });
    expect(isPanelVisible()).toBe(false);

    fireEvent.keyDown(document, { key: '?' });
    expect(isPanelVisible()).toBe(true);
  });

  it('does NOT toggle when the focus is in an INPUT (kid is typing a `?` literally)', () => {
    render(
      <>
        <input data-testid="rename-input" />
        <FloatingFeedback {...baseProps} />
      </>
    );
    const input = screen.getByTestId('rename-input');
    input.focus();
    fireEvent.keyDown(input, { key: '?' });
    // Panel is still visible — the shortcut yielded to the input.
    expect(isPanelVisible()).toBe(true);
  });

  it('does NOT toggle when a modifier key is held', () => {
    render(<FloatingFeedback {...baseProps} />);
    fireEvent.keyDown(document, { key: '?', metaKey: true });
    expect(isPanelVisible()).toBe(true);
    fireEvent.keyDown(document, { key: '?', ctrlKey: true });
    expect(isPanelVisible()).toBe(true);
  });

  it('removes the listener on unmount (no leak across mount/remount)', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<FloatingFeedback {...baseProps} />);
    unmount();
    // At least one of the removeEventListener calls is for keydown.
    const keydownRemovals = removeSpy.mock.calls.filter((c) => c[0] === 'keydown');
    expect(keydownRemovals.length).toBeGreaterThan(0);
    removeSpy.mockRestore();
  });
});
