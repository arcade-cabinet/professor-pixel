// Cover app/components/wizard/code-runner.tsx (127 LOC, 0% → ~100%).
// Three placeholder editor wrappers (WizardCodeEditor, ProfessionalEditor,
// CodeBlockBuilder) plus a default switch component (WizardCodeRunner)
// that picks one of them by `type` prop.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WizardCodeRunner, {
  WizardCodeEditor,
  ProfessionalEditor,
  CodeBlockBuilder,
} from '@/components/wizard/code-runner';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WizardCodeEditor', () => {
  it('renders the heading and the placeholder body', () => {
    render(<WizardCodeEditor type="code-editor" />);
    expect(screen.getByText('Code Editor')).toBeInTheDocument();
    expect(screen.getByText(/Code editor implementation pending/)).toBeInTheDocument();
  });

  it('renders the close button only when onClose is provided', () => {
    const { rerender } = render(<WizardCodeEditor type="code-editor" />);
    expect(screen.queryByTestId('close-code-editor')).not.toBeInTheDocument();
    rerender(<WizardCodeEditor type="code-editor" onClose={vi.fn()} />);
    expect(screen.getByTestId('close-code-editor')).toBeInTheDocument();
  });

  it('forwards onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<WizardCodeEditor type="code-editor" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-code-editor'));
    expect(onClose).toHaveBeenCalled();
  });

  it('applies the className to the wrapper', () => {
    const { container } = render(
      <WizardCodeEditor type="code-editor" className="test-class" />
    );
    expect(container.querySelector('.test-class')).toBeTruthy();
  });
});

describe('ProfessionalEditor', () => {
  it('renders the heading and the placeholder body', () => {
    render(<ProfessionalEditor type="professional-editor" />);
    expect(screen.getByText('Professional Editor')).toBeInTheDocument();
    expect(screen.getByText(/Professional editor implementation pending/)).toBeInTheDocument();
  });

  it('forwards onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<ProfessionalEditor type="professional-editor" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-professional-editor'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('CodeBlockBuilder', () => {
  it('renders the heading and the placeholder body', () => {
    render(<CodeBlockBuilder type="block-builder" />);
    expect(screen.getByText('Code Block Builder')).toBeInTheDocument();
    expect(screen.getByText(/Code block builder implementation pending/)).toBeInTheDocument();
  });

  it('forwards onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<CodeBlockBuilder type="block-builder" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-code-block-builder'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('WizardCodeRunner — switch dispatch', () => {
  it('dispatches to WizardCodeEditor when type=code-editor', () => {
    render(<WizardCodeRunner type="code-editor" />);
    expect(screen.getByText('Code Editor')).toBeInTheDocument();
  });

  it('dispatches to ProfessionalEditor when type=professional-editor', () => {
    render(<WizardCodeRunner type="professional-editor" />);
    expect(screen.getByText('Professional Editor')).toBeInTheDocument();
  });

  it('dispatches to CodeBlockBuilder when type=block-builder', () => {
    render(<WizardCodeRunner type="block-builder" />);
    expect(screen.getByText('Code Block Builder')).toBeInTheDocument();
  });

  it('renders nothing for an unrelated type (none)', () => {
    const { container } = render(<WizardCodeRunner type="none" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for an unrelated type (pygame-runner)', () => {
    const { container } = render(<WizardCodeRunner type="pygame-runner" />);
    expect(container.firstChild).toBeNull();
  });

  it('forwards onClose down through the switch', () => {
    const onClose = vi.fn();
    render(<WizardCodeRunner type="code-editor" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-code-editor'));
    expect(onClose).toHaveBeenCalled();
  });
});
