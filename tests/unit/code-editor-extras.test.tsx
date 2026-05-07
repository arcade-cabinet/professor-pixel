// Cover the still-uncovered branches in app/components/editor/code-editor.tsx
// that the existing code-editor-{controls,reset,visual-viewport}.test.tsx
// suites don't reach:
//   - scrollIntoView fires when the soft keyboard transitions from
//     closed → open (line 158, the "justOpened" branch)
//   - showResetConfirm focus management effect: opens → focuses cancel,
//     closes → restores focus to the Reset button (lines 344-350)
//   - confirmReset's catch branch: when onChange throws, the error is
//     swallowed and the dialog still closes (line 332-334)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CodeEditor from '@/components/editor/code-editor';

// Same Monaco shim discipline as the sibling tests — ensure the "Monaco
// not yet loaded" branch is the deterministic default.
type WritableShim = Record<'require' | 'monaco' | 'visualViewport', unknown>;

beforeEach(() => {
  const w = window as unknown as WritableShim;
  w.require = undefined;
  w.monaco = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
  const w = window as unknown as Partial<WritableShim>;
  delete w.visualViewport;
});

function installVisualViewportStub(initial: { height: number }) {
  const listeners = new Map<string, Set<(ev: Event) => void>>();
  const stub = {
    height: initial.height,
    offsetTop: 0,
    addEventListener(type: string, fn: (ev: Event) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: (ev: Event) => void) {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent(ev: Event) {
      listeners.get(ev.type)?.forEach((fn) => fn(ev));
      return true;
    },
  };
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: stub,
  });
  return stub;
}

const baseProps = {
  code: '',
  onChange: vi.fn(),
  onExecute: vi.fn(),
  output: '',
  error: '',
  isExecuting: false,
};

describe('CodeEditor — keyboard-just-opened scrollIntoView', () => {
  it('calls scrollIntoView when the keyboard transitions from closed → open', async () => {
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 800,
    });
    const vv = installVisualViewportStub({ height: 800 });

    // jsdom doesn't implement scrollIntoView at all — define a stub so the
    // editorRef.scrollIntoView call has something to invoke. We can then
    // assert on the stub directly (no spyOn needed).
    const scrollMock = vi.fn();
    Element.prototype.scrollIntoView = scrollMock;

    vi.useFakeTimers();
    render(<CodeEditor {...baseProps} />);

    // Fire the keyboard-open transition.
    act(() => {
      vv.height = 480;
      vv.dispatchEvent(new Event('resize'));
    });
    // The effect schedules a 50ms timeout before scrolling.
    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(scrollMock).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('CodeEditor — Reset confirm focus management', () => {
  it('focuses Cancel when the dialog opens and restores focus to Reset on close', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(
      <CodeEditor
        {...baseProps}
        onChange={onChange}
        currentStep={{
          id: 's',
          title: 't',
          description: 'd',
          initialCode: 'print("starter")',
        }}
      />
    );

    const resetBtn = screen.getByTestId('button-reset-code');
    fireEvent.click(resetBtn);
    // After open, the cancel button should be focused (alertdialog WAI-ARIA).
    const cancelBtn = screen.getByTestId('reset-cancel');
    expect(document.activeElement).toBe(cancelBtn);

    // Close via Cancel — the post-close timer restores focus to Reset.
    fireEvent.click(cancelBtn);
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(document.activeElement).toBe(resetBtn);

    vi.useRealTimers();
  });
});

describe('CodeEditor — confirmReset error handling', () => {
  it('swallows onChange throws and still closes the dialog', () => {
    const onChange = vi.fn(() => {
      throw new Error('boom — failed to apply reset');
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CodeEditor
        {...baseProps}
        onChange={onChange}
        currentStep={{
          id: 's',
          title: 't',
          description: 'd',
          initialCode: 'print("starter")',
        }}
      />
    );

    fireEvent.click(screen.getByTestId('button-reset-code'));
    expect(screen.getByTestId('reset-confirm-dialog')).toBeInTheDocument();

    // Confirm — onChange throws; the catch swallows; finally closes the dialog.
    expect(() => fireEvent.click(screen.getByTestId('reset-confirm'))).not.toThrow();
    expect(onChange).toHaveBeenCalledWith('print("starter")');
    expect(screen.queryByTestId('reset-confirm-dialog')).not.toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
