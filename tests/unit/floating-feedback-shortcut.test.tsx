// P4.16 — `?` keyboard shortcut toggles the FloatingFeedback hint panel.
//
// The shortcut is global (document-bound keydown) so kids can summon
// the hint from anywhere. It is gated to NOT fire while typing in an
// input/textarea/contenteditable so it doesn't intercept the literal
// `?` character a kid is trying to type into the rename box, the
// asset-browser search, or Monaco. Modifier-held presses (Cmd+?,
// Ctrl+?, Alt+?) are also ignored to leave browser shortcuts alone.

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

  it('does NOT toggle when meta (Cmd) is held', () => {
    // metaKey is the only modifier we explicitly block — Cmd+? is a
    // real macOS browser shortcut. ctrlKey+? is left permissive on
    // purpose: on Windows/Linux non-US keyboards (German, Scandinavian)
    // `?` is produced via AltGr, which the browser surfaces as
    // ctrlKey+altKey both true. Blocking ctrlKey would silently kill
    // the shortcut for those users; event.key is layout-resolved so
    // the gate by glyph alone is sufficient.
    render(<FloatingFeedback {...baseProps} />);
    fireEvent.keyDown(document, { key: '?', metaKey: true });
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

  it('reveals the hidden panel when a `pp:request-hint` event fires (P4.22)', () => {
    // Ctrl+Space inside Monaco dispatches the same event; the panel
    // re-opens regardless of how it became hidden (X button or the
    // `?` shortcut). This is what wires the editor shortcut to the
    // floating panel without a parent-mediated callback.
    render(<FloatingFeedback {...baseProps} />);
    fireEvent.keyDown(document, { key: '?' });
    expect(isPanelVisible()).toBe(false);

    act(() => {
      document.dispatchEvent(new CustomEvent('pp:request-hint', { detail: { source: 'editor' } }));
    });
    expect(isPanelVisible()).toBe(true);
  });

  it('removes the pp:request-hint listener on unmount (P4.22)', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<FloatingFeedback {...baseProps} />);
    unmount();
    const hintRemovals = removeSpy.mock.calls.filter((c) => c[0] === 'pp:request-hint');
    expect(hintRemovals.length).toBeGreaterThan(0);
    removeSpy.mockRestore();
  });
});
