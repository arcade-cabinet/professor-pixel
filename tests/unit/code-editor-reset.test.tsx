// P4.21 — Reset Code button + confirm dialog.
//
// Contract:
// 1. The Reset button is hidden when currentStep.initialCode is absent
//    (e.g. wizard editor — there's no "starter" to restore to).
// 2. Clicking Reset shows the confirm dialog (does NOT clear yet).
// 3. Cancel dismisses without calling onChange.
// 4. Confirm calls onChange with the step's initialCode.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CodeEditor from '@/components/editor/code-editor';

// Test seam: code-editor.tsx checks `window.require` / `window.monaco`
// to detect Monaco's CDN-loaded AMD shim before instantiating. The
// component test mounts without that shim, so we explicitly clear
// both before each case to make the "Monaco not yet loaded" branch
// the deterministic default.
// Global ambient declares window.require/monaco as required at the
// type level; for tests we want the "not yet loaded" state to be the
// deterministic default. Cast through a writable record so the
// assignment is structural (no `any`).
type WritableMonacoShim = Record<'require' | 'monaco', unknown>;

beforeEach(() => {
  const w = window as unknown as WritableMonacoShim;
  w.require = undefined;
  w.monaco = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const baseProps = {
  code: 'print("hello, modified")',
  onChange: vi.fn(),
  onExecute: vi.fn(),
  output: '',
  error: '',
  isExecuting: false,
};

describe('CodeEditor — Reset Code (P4.21)', () => {
  it('hides the Reset button when currentStep.initialCode is absent', () => {
    render(<CodeEditor {...baseProps} currentStep={{ id: 's', title: 't', description: 'd' }} />);
    expect(screen.queryByTestId('button-reset-code')).not.toBeInTheDocument();
  });

  it('shows the Reset button when initialCode is present and opens the confirm on click', () => {
    render(
      <CodeEditor
        {...baseProps}
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
    // onChange not called yet — confirm is required.
    expect(baseProps.onChange).not.toHaveBeenCalled();
  });

  it('Cancel dismisses without changing code', () => {
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
    fireEvent.click(screen.getByTestId('button-reset-code'));
    fireEvent.click(screen.getByTestId('reset-cancel'));
    expect(screen.queryByTestId('reset-confirm-dialog')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Confirm restores onChange with the step initialCode', () => {
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
    fireEvent.click(screen.getByTestId('button-reset-code'));
    fireEvent.click(screen.getByTestId('reset-confirm'));
    expect(onChange).toHaveBeenCalledWith('print("starter")');
    // Dialog closes on confirm.
    expect(screen.queryByTestId('reset-confirm-dialog')).not.toBeInTheDocument();
  });
});
