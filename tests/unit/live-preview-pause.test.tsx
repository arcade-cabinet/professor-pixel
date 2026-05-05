import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PygameLivePreview from '@/components/pygame/live-preview';

// We can't run Pyodide in jsdom, but the pause/resume contract doesn't need
// it: the rAF gate is a ref the component owns. We mock the simulator + the
// Python runner so executePygameCode resolves without touching the network
// or instantiating a real Pyodide. Then we drive the UI through the Pause /
// Resume / P-key paths and assert the rAF flush gate matches state.

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

// Slider pulls in radix-use-size which calls `new ResizeObserver`. The
// jsdom ResizeObserver shim is a vi.fn(), not a real class. Stub the
// Slider — we don't exercise it in the pause/resume contract.
vi.mock('@/components/ui/slider', () => ({
  Slider: ({ 'data-testid': testId }: { 'data-testid'?: string }) => <div data-testid={testId} />,
}));

import { flushFrameBuffer } from '@lib/pygame/runtime/simulator';

const mockPyodide = {
  globals: { set: vi.fn() },
  runPython: vi.fn(),
} as unknown as PyodideInstance;

const sampleChoice = {
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
  vi.mocked(flushFrameBuffer).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Drive a couple of real rAF ticks so we can observe whether the gate is
// open (flushFrameBuffer called) or closed (not called).
async function tickRAF(count = 2): Promise<void> {
  for (let i = 0; i < count; i++) {
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    });
  }
}

describe('PygameLivePreview — Pause / Resume (P6)', () => {
  it('halts the rAF flush while paused and resumes from the same frame', async () => {
    render(<PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} />);

    // The auto-play effect kicks off executePygameCode on mount; wait for the
    // Pause button to appear (initial render shows Play).
    const pauseBtn = await screen.findByTestId('button-play-pause-preview');
    await waitFor(() => expect(pauseBtn).toHaveTextContent(/pause/i));

    // Loop is running — flushFrameBuffer should be called on each tick.
    await tickRAF(3);
    expect(vi.mocked(flushFrameBuffer).mock.calls.length).toBeGreaterThan(0);

    // Pause via the toolbar button.
    fireEvent.click(pauseBtn);

    // Paused overlay appears; button now reads "Resume".
    await waitFor(() => expect(screen.getByTestId('paused-overlay')).toBeInTheDocument());
    expect(pauseBtn).toHaveTextContent(/resume/i);

    // While paused, rAF callbacks fire but flushFrameBuffer should NOT be
    // called (the gate is closed).
    vi.mocked(flushFrameBuffer).mockClear();
    await tickRAF(3);
    expect(vi.mocked(flushFrameBuffer)).not.toHaveBeenCalled();

    // Resume via the same button — overlay clears, flushes resume.
    fireEvent.click(pauseBtn);
    await waitFor(() => expect(screen.queryByTestId('paused-overlay')).not.toBeInTheDocument());
    await tickRAF(3);
    expect(vi.mocked(flushFrameBuffer).mock.calls.length).toBeGreaterThan(0);
  });

  it('responds to the P key when the preview wrapper has focus', async () => {
    render(<PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} />);

    // Wait for the playing state.
    const pauseBtn = await screen.findByTestId('button-play-pause-preview');
    await waitFor(() => expect(pauseBtn).toHaveTextContent(/pause/i));

    const wrapper = screen.getByTestId('live-preview-wrapper');
    fireEvent.keyDown(wrapper, { key: 'p' });

    await waitFor(() => expect(screen.getByTestId('paused-overlay')).toBeInTheDocument());

    fireEvent.keyDown(wrapper, { key: 'p' });
    await waitFor(() => expect(screen.queryByTestId('paused-overlay')).not.toBeInTheDocument());
  });

  it('canvas accepts onPointerDown for unified mouse + touch interaction (P4.5)', async () => {
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
    // getBoundingClientRect in jsdom returns 0/0/0/0 by default; clientX/Y of
    // 50/30 still produces a deterministic offset for pygame coordinates.
    fireEvent.pointerDown(canvas, {
      pointerType: 'touch',
      pointerId: 1,
      clientX: 50,
      clientY: 30,
    });

    await waitFor(() => {
      expect(onInteraction).toHaveBeenCalledWith(
        'click',
        expect.objectContaining({ x: 50, y: 30 })
      );
    });
  });

  it('does not pause when P is pressed inside an editable target', async () => {
    render(
      <div>
        <PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} />
        <textarea data-testid="editor-stand-in" />
      </div>
    );
    const pauseBtn = await screen.findByTestId('button-play-pause-preview');
    await waitFor(() => expect(pauseBtn).toHaveTextContent(/pause/i));

    // Pressing P on a textarea (kid is typing code) must not toggle pause.
    // Since the keydown listener is attached to the wrapper, dispatching on
    // the textarea outside it shouldn't reach it. Belt-and-suspenders: if
    // the textarea is inside the wrapper, the editable-target guard must fire.
    const wrapper = screen.getByTestId('live-preview-wrapper');
    const fakeTextarea = document.createElement('textarea');
    wrapper.appendChild(fakeTextarea);
    fakeTextarea.focus();
    // Dispatch a real keydown bubbling up to wrapper.
    fakeTextarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));

    expect(screen.queryByTestId('paused-overlay')).not.toBeInTheDocument();
  });
});
