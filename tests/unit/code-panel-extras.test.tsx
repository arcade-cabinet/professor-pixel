import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PygameEditorCodePanel from '@/components/editor/code-panel';
import FloatingFeedback from '@/components/floating-feedback';

// Cover code-panel.tsx branches that the existing code-panel-copy.test.tsx
// skipped:
//   * lines 62-73 — non-empty `components` prop drives the generateCode
//     loop and componentVars list.
//   * line 91 — componentVars.forEach in the game loop.
//   * lines 126-136 — handleDownload branch (Blob + createObjectURL +
//     <a download> click + revokeObjectURL).

const toastSpy = vi.fn();
vi.mock('@lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastSpy }),
}));

beforeEach(() => {
  toastSpy.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PygameEditorCodePanel — generated code', () => {
  it('emits component code lines + draw calls when components are provided', () => {
    // 'ball' is a real registered component with generateCode().
    render(
      <PygameEditorCodePanel
        components={[
          {
            id: 'ph-1',
            componentId: 'ball',
            x: 100,
            y: 200,
            properties: {},
          },
        ]}
      />
    );
    // The generated <pre><code> contains a "# Bouncing Ball" header
    // (componentDef.name) and a draw call referencing the var name.
    const code = screen.getByText(/import pygame/).closest('pre');
    expect(code?.textContent).toContain('ball_0 =');
    expect(code?.textContent).toContain('ball_0.draw(screen)');
  });

  it('silently skips PlacedComponents whose componentId does not resolve', () => {
    // generateCode loop's `if (componentDef && componentDef.generateCode)`
    // guard hits the false arm — no var line, no draw line.
    render(
      <PygameEditorCodePanel
        components={[
          {
            id: 'ph-bad',
            componentId: 'totally-fake-id',
            x: 0,
            y: 0,
            properties: {},
          },
        ]}
      />
    );
    const code = screen.getByText(/import pygame/).closest('pre');
    expect(code?.textContent).not.toMatch(/totally-fake-id/);
    // Still has the boilerplate.
    expect(code?.textContent).toContain('pygame.display.flip');
  });
});

describe('PygameEditorCodePanel — Download', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let createSpy: ReturnType<typeof vi.fn>;
  let revokeSpy: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
  });

  beforeEach(() => {
    createSpy = vi.fn().mockReturnValue('blob:fake-url');
    revokeSpy = vi.fn();
    URL.createObjectURL = createSpy as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeSpy as unknown as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('Download button creates a Blob URL, simulates click, then revokes', async () => {
    render(<PygameEditorCodePanel components={[]} />);
    const downloadBtn = screen
      .getAllByRole('button')
      .find((b) => /download/i.test(b.textContent ?? ''));
    expect(downloadBtn).toBeDefined();

    // Spy on the synthesized <a> click that the handler will dispatch.
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    fireEvent.click(downloadBtn!);

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:fake-url');

    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
    const payload = toastSpy.mock.calls[toastSpy.mock.calls.length - 1][0];
    expect(payload.title).toMatch(/downloaded/i);
  });
});

describe('FloatingFeedback — copy/apply/dismiss/showNext branches', () => {
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

  let writeTextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeTextSpy = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextSpy },
    });
  });

  it('Copy success path fires the success toast', async () => {
    writeTextSpy.mockResolvedValue(undefined);
    render(<FloatingFeedback {...baseProps} />);
    // Show the solution first so the copy button is rendered.
    fireEvent.click(screen.getByTestId('button-show-solution'));
    fireEvent.click(screen.getByTestId('button-copy-solution'));
    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
    const payload = toastSpy.mock.calls.at(-1)?.[0] as { variant?: string };
    expect(payload.variant).not.toBe('destructive');
  });

  it('Copy reject path fires the destructive toast (no false-positive)', async () => {
    writeTextSpy.mockRejectedValue(new Error('NotAllowedError'));
    render(<FloatingFeedback {...baseProps} />);
    fireEvent.click(screen.getByTestId('button-show-solution'));
    fireEvent.click(screen.getByTestId('button-copy-solution'));
    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
    const payload = toastSpy.mock.calls.at(-1)?.[0] as { variant?: string };
    expect(payload.variant).toBe('destructive');
  });

  it('Apply Solution forwards the solution string to onApplySolution + fires apply toast', () => {
    const onApplySolution = vi.fn();
    render(<FloatingFeedback {...baseProps} onApplySolution={onApplySolution} />);
    fireEvent.click(screen.getByTestId('button-show-solution'));
    fireEvent.click(screen.getByTestId('button-apply-solution'));
    expect(onApplySolution).toHaveBeenCalledWith('print("hi")');
    expect(toastSpy).toHaveBeenCalled();
  });

  it('Dismiss button hides the panel', () => {
    render(<FloatingFeedback {...baseProps} />);
    expect(screen.queryByTestId('button-dismiss-feedback')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-dismiss-feedback'));
    expect(screen.queryByTestId('button-dismiss-feedback')).not.toBeInTheDocument();
  });

  it('Show Solution toggles the solution display open', () => {
    render(<FloatingFeedback {...baseProps} />);
    expect(screen.queryByTestId('solution-display')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-show-solution'));
    expect(screen.getByTestId('solution-display')).toBeInTheDocument();
    // We don't assert on the close path because AnimatePresence keeps the
    // element rendered during exit transitions in tests with no animation
    // mocking — covering the show-arm is enough for the toggle branch.
  });
});
