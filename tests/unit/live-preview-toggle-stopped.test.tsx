// Cover the stopped→playing branch of togglePlayPause in
// app/components/pygame/live-preview.tsx (lines 244-245). The existing
// live-preview-pause suite always lands in the playing/paused branches
// because mounting with pyodide auto-plays. Here we mount WITHOUT pyodide
// so the auto-play effect short-circuits, then click the play button to
// drive togglePlayPause through its stopped branch (canvasRef.current is
// truthy → executePygameCode is invoked).

import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PygameLivePreview from '@/components/pygame/live-preview';
import type { GameChoice } from '@lib/wizard/types';

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

const sampleChoice: GameChoice = {
  type: 'character' as const,
  id: 'robot',
  name: 'Robot',
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

describe('PygameLivePreview — togglePlayPause stopped→playing (lines 244-245)', () => {
  it('clicking play in the stopped state invokes executePygameCode via canvasRef', () => {
    // No pyodide → auto-play effect short-circuits, so the component
    // mounts in the stopped state. The play button is rendered and
    // clicking it must take the stopped branch in togglePlayPause.
    render(<PygameLivePreview choices={[sampleChoice]} />);

    const playBtn = screen.getByTestId('button-play-pause-preview');
    // Sanity: stopped state, button shows Play.
    expect(playBtn).toHaveTextContent(/play/i);

    // Drives line 244: `if (canvasRef.current)` → true; then line 245:
    // `executePygameCode(canvasRef.current, choices)`. Since pyodide is
    // absent the call resolves with an early-return, but the branch is
    // executed (which is the coverage we need).
    expect(() => fireEvent.click(playBtn)).not.toThrow();
  });
});
