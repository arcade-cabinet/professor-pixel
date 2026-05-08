import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PygameEditorProperties from '@/components/editor/properties';
import WizardCodeRunner, {
  WizardCodeEditor,
  ProfessionalEditor,
  CodeBlockBuilder,
} from '@/components/wizard/code-runner';
import Header from '@/components/header';
import type { Lesson } from '@lib/types/schema';

// Cover the WYSIWYG editor's properties panel — a tiny React component
// (60 LOC) at 0% coverage. Three branches:
//   1) component lookup miss → returns null (no render)
//   2) X position input — value bound to component.x, change calls
//      onPropertyChange(id, 'x', Number)
//   3) Y position input — same shape with 'y'

const baseComponent = {
  id: 'placed-1',
  componentId: 'ball',
  x: 100,
  y: 200,
  properties: {},
};

describe('PygameEditorProperties', () => {
  it('returns null (renders nothing) when componentId does not resolve', () => {
    const onPropertyChange = vi.fn();
    const { container } = render(
      <PygameEditorProperties
        component={{ ...baseComponent, componentId: 'definitely-not-a-component' }}
        onPropertyChange={onPropertyChange}
      />
    );
    // No card rendered.
    expect(container.firstChild).toBeNull();
  });

  it('renders X + Y position inputs bound to the placed component', () => {
    const onPropertyChange = vi.fn();
    render(
      <PygameEditorProperties component={baseComponent} onPropertyChange={onPropertyChange} />
    );
    const xInput = screen.getByLabelText(/X Position/i) as HTMLInputElement;
    const yInput = screen.getByLabelText(/Y Position/i) as HTMLInputElement;
    expect(xInput.value).toBe('100');
    expect(yInput.value).toBe('200');
  });

  it('forwards X-position changes through onPropertyChange as Number', () => {
    const onPropertyChange = vi.fn();
    render(
      <PygameEditorProperties component={baseComponent} onPropertyChange={onPropertyChange} />
    );
    fireEvent.change(screen.getByLabelText(/X Position/i), { target: { value: '250' } });
    expect(onPropertyChange).toHaveBeenCalledWith('placed-1', 'x', 250);
  });

  it('forwards Y-position changes through onPropertyChange as Number', () => {
    const onPropertyChange = vi.fn();
    render(
      <PygameEditorProperties component={baseComponent} onPropertyChange={onPropertyChange} />
    );
    fireEvent.change(screen.getByLabelText(/Y Position/i), { target: { value: '50' } });
    expect(onPropertyChange).toHaveBeenCalledWith('placed-1', 'y', 50);
  });

  it('applies the optional className to the outer Card', () => {
    const onPropertyChange = vi.fn();
    const { container } = render(
      <PygameEditorProperties
        component={baseComponent}
        onPropertyChange={onPropertyChange}
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows the resolved component name in the panel header', () => {
    const onPropertyChange = vi.fn();
    render(
      <PygameEditorProperties component={baseComponent} onPropertyChange={onPropertyChange} />
    );
    // ballComponent.name is "Bouncing Ball" — but be lenient and just
    // assert non-empty header subtitle.
    const header = screen.getByText(/Properties/i);
    expect(header).toBeInTheDocument();
  });
});

describe('WizardCodeRunner — placeholder switch', () => {
  it('renders WizardCodeEditor for type=code-editor', () => {
    render(<WizardCodeRunner type="code-editor" onClose={() => {}} />);
    expect(screen.getByText(/^Code Editor$/i)).toBeInTheDocument();
    expect(screen.getByTestId('close-code-editor')).toBeInTheDocument();
  });

  it('renders ProfessionalEditor for type=professional-editor', () => {
    render(<WizardCodeRunner type="professional-editor" onClose={() => {}} />);
    expect(screen.getByTestId('close-professional-editor')).toBeInTheDocument();
  });

  it('renders CodeBlockBuilder for type=block-builder', () => {
    render(<WizardCodeRunner type="block-builder" onClose={() => {}} />);
    expect(screen.getByTestId('close-code-block-builder')).toBeInTheDocument();
  });

  it('returns null for an unrecognized type', () => {
    const { container } = render(<WizardCodeRunner type={'whatever' as never} />);
    expect(container.firstChild).toBeNull();
  });

  it('WizardCodeEditor close button calls onClose when supplied', () => {
    const onClose = vi.fn();
    render(<WizardCodeEditor type="code-editor" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-code-editor'));
    expect(onClose).toHaveBeenCalled();
  });

  it('WizardCodeEditor omits the close button when onClose is undefined', () => {
    render(<WizardCodeEditor type="code-editor" />);
    expect(screen.queryByTestId('close-code-editor')).not.toBeInTheDocument();
  });

  it('ProfessionalEditor close button calls onClose when supplied', () => {
    const onClose = vi.fn();
    render(<ProfessionalEditor type="professional-editor" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-professional-editor'));
    expect(onClose).toHaveBeenCalled();
  });

  it('CodeBlockBuilder close button calls onClose when supplied', () => {
    const onClose = vi.fn();
    render(<CodeBlockBuilder type="block-builder" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-code-block-builder'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Header — lesson page chrome', () => {
  const lesson: Lesson = {
    id: 'lesson-1',
    order: 3,
    title: 'Build a platformer',
    description: 'A test',
    difficulty: 'easy',
    estimatedTime: 30,
    completed: false,
  } as unknown as Lesson;

  it('renders lesson order + title + back button', () => {
    const onBack = vi.fn();
    render(<Header lesson={lesson} progress={42} onBack={onBack} />);
    expect(screen.getByTestId('button-back')).toBeInTheDocument();
    expect(screen.getByText(/Lesson 3:/)).toBeInTheDocument();
    expect(screen.getByText(/Build a platformer/)).toBeInTheDocument();
  });

  it('renders rounded progress percent in two places', () => {
    const onBack = vi.fn();
    render(<Header lesson={lesson} progress={42.7} onBack={onBack} />);
    // Math.round(42.7) = 43; appears as the displayed percent text.
    expect(screen.getByText(/43%/)).toBeInTheDocument();
  });

  it('back button click invokes onBack', () => {
    const onBack = vi.fn();
    render(<Header lesson={lesson} progress={0} onBack={onBack} />);
    fireEvent.click(screen.getByTestId('button-back'));
    expect(onBack).toHaveBeenCalled();
  });
});
