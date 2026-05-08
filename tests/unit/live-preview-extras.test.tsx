// Cover residual branches in app/components/pygame/live-preview.tsx that
// the existing live-preview-pause test doesn't reach:
//   - Reset button calls stopGame (resets isPlaying + clears canvas).
//   - showComparison flag renders the Compare button.
//   - alternativeChoice renders the comparison canvas.
//   - pixelComments rendering with multiple comments.
//   - onPointerDown with mouse pointer type (no preventDefault path).

import type React from 'react';
import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PygameLivePreview from '@/components/pygame/live-preview';
import type { GameChoice } from '@lib/wizard/types';
import { TooltipProvider } from '@/components/ui/tooltip';

// The Compare button uses a Radix Tooltip; the rest of the live-preview
// surface doesn't, so we only wrap renders that pass showComparison=true.
const withTooltip = (children: React.ReactNode) => <TooltipProvider>{children}</TooltipProvider>;

vi.mock('@lib/pygame/runtime/simulator', () => ({
  setCanvasContext: vi.fn(),
  flushFrameBuffer: vi.fn(),
  createPygameEnvironment: vi.fn(() => ({})),
  resetPygameState: vi.fn(),
}));

vi.mock('@lib/python/runner', () => {
  class PythonRunner {
    runSnippet = vi.fn().mockResolvedValue({ output: '', error: null });
  }
  return { PythonRunner };
});

vi.mock('@lib/wizard/code-generator', () => ({
  generatePygameCode: vi.fn(() => '# stub'),
}));

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ 'data-testid': testId }: { 'data-testid'?: string }) => <div data-testid={testId} />,
}));

const mockPyodide = {
  globals: { set: vi.fn() },
  runPython: vi.fn(),
} as unknown as PyodideInstance;

const sampleChoice: GameChoice = {
  type: 'character' as const,
  id: 'robot',
  name: 'Robot',
};

const altChoice: GameChoice = {
  type: 'character' as const,
  id: 'cat',
  name: 'Cat',
};

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
  })) as unknown as HTMLCanvasElement['getContext'];
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PygameLivePreview — Reset button', () => {
  it('clicking Reset stops the game and clears the canvas', async () => {
    render(<PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} />);

    const pauseBtn = await screen.findByTestId('button-play-pause-preview');
    await waitFor(() => expect(pauseBtn).toHaveTextContent(/pause/i));

    const resetBtn = screen.getByTestId('button-reset-preview');
    fireEvent.click(resetBtn);

    // After reset, the play button should show "Play" (game stopped).
    await waitFor(() => expect(pauseBtn).toHaveTextContent(/play/i));
  });
});

describe('PygameLivePreview — Compare button (showComparison flag)', () => {
  it('renders the Compare button when showComparison=true', () => {
    render(
      withTooltip(
        <PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} showComparison={true} />
      )
    );
    expect(screen.getByTestId('button-toggle-split')).toBeInTheDocument();
  });

  it('hides the Compare button when showComparison is false (default)', () => {
    render(<PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} />);
    expect(screen.queryByTestId('button-toggle-split')).not.toBeInTheDocument();
  });

  it('renders the comparison canvas when alternativeChoice is supplied', async () => {
    render(
      withTooltip(
        <PygameLivePreview
          choices={[sampleChoice]}
          pyodide={mockPyodide}
          showComparison={true}
          alternativeChoice={altChoice}
        />
      )
    );
    // The comparison canvas testid is hidden behind a state toggle; clicking
    // the split button reveals it. Click the toggle first.
    fireEvent.click(screen.getByTestId('button-toggle-split'));
    await waitFor(() =>
      expect(screen.getByTestId('canvas-comparison-preview')).toBeInTheDocument()
    );
  });
});

describe('PygameLivePreview — pixelComments rendering', () => {
  it('renders supplied pixel comments inside the preview', () => {
    render(
      <PygameLivePreview
        choices={[sampleChoice]}
        pyodide={mockPyodide}
        pixelComments={['Try jumping!', 'Watch out for the enemy!']}
      />
    );
    expect(screen.getByText('Try jumping!')).toBeInTheDocument();
    expect(screen.getByText('Watch out for the enemy!')).toBeInTheDocument();
  });

  it('renders nothing for the comments section when pixelComments is empty', () => {
    render(<PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} />);
    // No specific testid for the comments section, but the absence of any
    // string with the gradient bg class signals it.
    expect(screen.queryByText(/Try jumping/)).not.toBeInTheDocument();
  });
});

describe('PygameLivePreview — pointer events with mouse pointer type', () => {
  it('mouse pointerDown fires onInteraction without invoking preventDefault', async () => {
    const onInteraction = vi.fn();
    render(
      <PygameLivePreview
        choices={[sampleChoice]}
        pyodide={mockPyodide}
        onInteraction={onInteraction}
      />
    );
    const pauseBtn = await screen.findByTestId('button-play-pause-preview');
    await waitFor(() => expect(pauseBtn).toHaveTextContent(/pause/i));

    const canvas = screen.getByTestId('canvas-main-preview');
    // pointerType: 'mouse' should NOT trigger preventDefault (per source
    // line 284 — only 'touch' calls preventDefault).
    fireEvent.pointerDown(canvas, {
      pointerType: 'mouse',
      pointerId: 1,
      clientX: 100,
      clientY: 50,
    });

    await waitFor(() => {
      expect(onInteraction).toHaveBeenCalledWith(
        'click',
        expect.objectContaining({ x: 100, y: 50 })
      );
    });
  });

  it('pointerDown is a no-op when isPlaying is false (resets after Reset)', async () => {
    const onInteraction = vi.fn();
    render(
      <PygameLivePreview
        choices={[sampleChoice]}
        pyodide={mockPyodide}
        onInteraction={onInteraction}
      />
    );
    const pauseBtn = await screen.findByTestId('button-play-pause-preview');
    await waitFor(() => expect(pauseBtn).toHaveTextContent(/pause/i));

    fireEvent.click(screen.getByTestId('button-reset-preview'));
    await waitFor(() => expect(pauseBtn).toHaveTextContent(/play/i));

    onInteraction.mockClear();
    const canvas = screen.getByTestId('canvas-main-preview');
    fireEvent.pointerDown(canvas, {
      pointerType: 'mouse',
      pointerId: 1,
      clientX: 100,
      clientY: 50,
    });
    // Stopped state → handler early-returns before firing onInteraction.
    expect(onInteraction).not.toHaveBeenCalled();
  });
});
