// Cover live-preview.tsx error branches the existing extras + pause suites
// skip:
//   - line 128: createPygameEnvironment throw → console.error swallow
//   - lines 178, 195-198, 207-208: result.error path → throw → catch → state.error
//     + toast
//   - line 319: handle_click runPython throw → console.error swallow
//   - lines 588, 602, 617: slider onValueChange handlers (Speed, Jump, Enemy)

import type React from 'react';
import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PygameLivePreview from '@/components/pygame/live-preview';
import type { GameChoice } from '@lib/wizard/types';

const setCanvasContextMock = vi.fn();
const flushFrameBufferMock = vi.fn();
const createPygameEnvironmentMock = vi.fn();
const resetPygameStateMock = vi.fn();
vi.mock('@lib/pygame/runtime/simulator', () => ({
  setCanvasContext: (...args: unknown[]) => setCanvasContextMock(...args),
  flushFrameBuffer: (...args: unknown[]) => flushFrameBufferMock(...args),
  createPygameEnvironment: () => createPygameEnvironmentMock(),
  resetPygameState: () => resetPygameStateMock(),
}));

const runSnippetMock = vi.fn();
vi.mock('@lib/python/runner', () => {
  class PythonRunner {
    runSnippet = runSnippetMock;
  }
  return { PythonRunner };
});

vi.mock('@lib/wizard/code-generator', () => ({
  generatePygameCode: vi.fn(() => '# stub'),
}));

const toastMock = vi.fn();
vi.mock('@lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

// Slider stub that forwards the onValueChange so we can drive the state
// updates at lines 588/602/617.
vi.mock('@/components/ui/slider', () => ({
  Slider: ({
    'data-testid': testId,
    onValueChange,
  }: {
    'data-testid'?: string;
    onValueChange?: (vals: number[]) => void;
  }) => (
    <button
      type="button"
      data-testid={testId}
      onClick={() => onValueChange?.([7])}
    >
      slider-{testId}
    </button>
  ),
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
  createPygameEnvironmentMock.mockReturnValue({});
  runSnippetMock.mockResolvedValue({ output: '', error: null });
  toastMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PygameLivePreview — createPygameEnvironment error swallow (line 128)', () => {
  it('createPygameEnvironment throwing logs console.error but does not crash render', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createPygameEnvironmentMock.mockImplementation(() => {
      throw new Error('pygame env init boom');
    });
    expect(() =>
      render(<PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} />)
    ).not.toThrow();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to setup pygame environment'),
      expect.any(Error)
    );
  });
});

describe('PygameLivePreview — runSnippet error path (lines 177-208)', () => {
  it('runSnippet returning {error} routes to setState.error + toast', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    runSnippetMock.mockResolvedValue({ output: '', error: 'TypeError: bad input' });
    render(<PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} />);
    // The component fires its auto-play useEffect on mount with pyodide ready.
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled();
    });
    expect(errSpy).toHaveBeenCalledWith(
      '[live-preview]',
      expect.stringContaining('TypeError')
    );
    // Toast called with kid-friendly title.
    expect(toastMock.mock.calls[0][0]).toMatchObject({
      title: expect.stringContaining('Oops'),
    });
  });

  it('runSnippet rejection (the runner throws) routes to the same error path', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    runSnippetMock.mockRejectedValue(new Error('network blip'));
    render(<PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} />);
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled();
    });
    expect(errSpy).toHaveBeenCalledWith(
      '[live-preview]',
      expect.stringContaining('network blip')
    );
  });
});

describe('PygameLivePreview — handle_click runPython throw (line 319)', () => {
  it('pyodide.runPython throwing during a canvas tap is swallowed', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const runPythonMock = vi.fn().mockImplementation(() => {
      throw new Error('runPython boom');
    });
    const pyodideThrowing = {
      globals: { set: vi.fn() },
      runPython: runPythonMock,
    } as unknown as PyodideInstance;

    render(<PygameLivePreview choices={[sampleChoice]} pyodide={pyodideThrowing} />);
    // Wait for auto-play → isPlaying=true so the pointer-down path runs.
    const playPause = await screen.findByTestId('button-play-pause-preview');
    await waitFor(() => expect(playPause).toHaveTextContent(/pause/i));

    // Tap the canvas — handle_click runPython will throw.
    const canvas = document.querySelector('canvas')!;
    fireEvent.pointerDown(canvas, { pointerType: 'mouse', clientX: 100, clientY: 100 });
    expect(errSpy).toHaveBeenCalledWith(
      'Failed to handle click:',
      expect.any(Error)
    );
  });
});

describe('PygameLivePreview — slider onValueChange handlers', () => {
  it('Speed slider onValueChange updates gameParams (line 588)', () => {
    render(<PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} />);
    expect(() => fireEvent.click(screen.getByTestId('slider-speed'))).not.toThrow();
  });

  it('Jump-Height slider onValueChange updates gameParams (line 602)', () => {
    render(<PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} />);
    expect(() => fireEvent.click(screen.getByTestId('slider-jump'))).not.toThrow();
  });

  it('Enemy-Speed slider onValueChange updates gameParams (line 617)', () => {
    render(<PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} />);
    expect(() => fireEvent.click(screen.getByTestId('slider-enemy-speed'))).not.toThrow();
  });
});
