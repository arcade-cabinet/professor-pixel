// Cover the gradingResult render branches in code-editor.tsx that the
// existing code-editor-* tests skip. The console output area at lines
// 488-545 has a four-arm chain (gradingResult → error → output → ready)
// plus inner ternaries on `passed` and a conditional on
// `expectedOutput && actualOutput`. Existing tests only render with
// gradingResult absent, leaving every arm of this block cold.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CodeEditor from '@/components/editor/code-editor';

type WritableShim = Record<'require' | 'monaco' | 'visualViewport', unknown>;

beforeEach(() => {
  const w = window as unknown as WritableShim;
  w.require = undefined;
  w.monaco = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const baseProps = {
  code: '',
  onChange: vi.fn(),
  onExecute: vi.fn(),
  output: '',
  error: '',
  isExecuting: false,
};

describe('CodeEditor — gradingResult console arms', () => {
  it('renders the passed grading-result block with check icon (lines 488 truthy, 494/495 truthy, 513 truthy)', () => {
    render(
      <CodeEditor
        {...baseProps}
        gradingResult={{
          passed: true,
          feedback: 'All tests passed!',
          expectedOutput: 'Hello',
          actualOutput: 'Hello',
        }}
      />
    );
    const block = screen.getByTestId('grading-result');
    expect(block).toBeInTheDocument();
    expect(block).toHaveTextContent('Test Passed!');
    expect(block).toHaveTextContent('Hello');
    expect(block).toHaveClass('console-success');
  });

  it('renders the failed grading-result block with X icon (494/495 falsy, 513 falsy)', () => {
    render(
      <CodeEditor
        {...baseProps}
        gradingResult={{
          passed: false,
          feedback: 'Output did not match.',
          expectedOutput: 'Hello',
          actualOutput: 'Goodbye',
        }}
      />
    );
    const block = screen.getByTestId('grading-result');
    expect(block).toBeInTheDocument();
    expect(block).toHaveTextContent('Test Failed');
    expect(block).toHaveTextContent('Goodbye');
    expect(block).toHaveClass('console-error');
  });

  it('omits the expected/actual diff when expectedOutput is missing (line 500 short-circuit)', () => {
    render(
      <CodeEditor
        {...baseProps}
        gradingResult={{
          passed: false,
          feedback: 'Runtime error.',
          // Both expectedOutput + actualOutput omitted → line 500's `&&` chain
          // short-circuits and the inner diff block is not rendered.
        }}
      />
    );
    const block = screen.getByTestId('grading-result');
    expect(block).toBeInTheDocument();
    expect(block).toHaveTextContent('Runtime error.');
    expect(block).not.toHaveTextContent('Expected:');
  });

  it('falls through to the error arm when gradingResult is absent + error present (line 488 falsy)', () => {
    render(<CodeEditor {...baseProps} error="SyntaxError: invalid syntax" />);
    expect(screen.getByTestId('console-error')).toBeInTheDocument();
    expect(screen.queryByTestId('grading-result')).not.toBeInTheDocument();
  });

  it('falls through to the output arm when gradingResult + error are absent + output present', () => {
    render(<CodeEditor {...baseProps} output="Hello, world!" />);
    expect(screen.getByTestId('console-output')).toBeInTheDocument();
  });

  it('falls through to the ready arm when nothing is set', () => {
    render(<CodeEditor {...baseProps} />);
    expect(screen.getByTestId('console-ready')).toBeInTheDocument();
  });
});
