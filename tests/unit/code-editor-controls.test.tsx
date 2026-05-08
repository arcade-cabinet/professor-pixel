// Cover the Run / Run+Check buttons, expected-output panel, and input-values
// flow in app/components/editor/code-editor.tsx (lines 389-468). These are
// straightforward renders + click forwarding + controlled-input changes.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CodeEditor from '@/components/editor/code-editor';

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
  code: 'print("hi")',
  onChange: vi.fn(),
  onExecute: vi.fn(),
  output: '',
  error: '',
  isExecuting: false,
};

describe('CodeEditor — execute buttons', () => {
  it('Run Code button forwards onExecute(inputValues, false)', () => {
    const onExecute = vi.fn();
    render(<CodeEditor {...baseProps} onExecute={onExecute} />);
    fireEvent.click(screen.getByTestId('button-run-code'));
    expect(onExecute).toHaveBeenCalledWith('', false);
  });

  it('Run & Check button forwards onExecute(inputValues, true)', () => {
    const onExecute = vi.fn();
    render(<CodeEditor {...baseProps} onExecute={onExecute} />);
    fireEvent.click(screen.getByTestId('button-run-check'));
    expect(onExecute).toHaveBeenCalledWith('', true);
  });

  it('execute buttons are disabled while isExecuting=true', () => {
    render(<CodeEditor {...baseProps} isExecuting={true} />);
    expect(screen.getByTestId('button-run-code')).toBeDisabled();
    expect(screen.getByTestId('button-run-check')).toBeDisabled();
  });

  it('button label changes to "Running..." while executing', () => {
    render(<CodeEditor {...baseProps} isExecuting={true} />);
    expect(screen.getByText(/Running\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText(/Checking\.\.\./i)).toBeInTheDocument();
  });
});

describe('CodeEditor — expected output panel', () => {
  it('renders the expected-output panel when currentStep has tests', () => {
    render(
      <CodeEditor
        {...baseProps}
        currentStep={{
          id: 's',
          title: 't',
          description: 'd',
          tests: [
            {
              expectedOutput: 'hello',
            },
          ],
        }}
      />
    );
    expect(screen.getByText(/Expected Output/i)).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('shows the per-test input hint when tests[0].input is set', () => {
    render(
      <CodeEditor
        {...baseProps}
        currentStep={{
          id: 's',
          title: 't',
          description: 'd',
          tests: [
            {
              expectedOutput: '42',
              input: 'John',
            },
          ],
        }}
      />
    );
    expect(screen.getByText(/Input provided/i)).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('hides the expected-output panel when no tests are supplied', () => {
    render(<CodeEditor {...baseProps} currentStep={{ id: 's', title: 't', description: 'd' }} />);
    expect(screen.queryByText(/Expected Output/i)).not.toBeInTheDocument();
  });
});

describe('CodeEditor — Input Values control', () => {
  it('typing into the input updates the controlled state and forwards on Run', () => {
    const onExecute = vi.fn();
    render(<CodeEditor {...baseProps} onExecute={onExecute} />);
    const input = screen.getByTestId('input-values') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Alice, 30' } });
    expect(input.value).toBe('Alice, 30');
    fireEvent.click(screen.getByTestId('button-run-code'));
    expect(onExecute).toHaveBeenCalledWith('Alice, 30', false);
  });
});

describe('CodeEditor — currentStep render', () => {
  it('renders title + description when currentStep is supplied', () => {
    render(
      <CodeEditor
        {...baseProps}
        currentStep={{
          id: 's',
          title: 'Make it print',
          description: 'Use print() to output text.',
        }}
      />
    );
    expect(screen.getByText('Make it print')).toBeInTheDocument();
    expect(screen.getByText(/Use print\(\) to output text/)).toBeInTheDocument();
  });
});
