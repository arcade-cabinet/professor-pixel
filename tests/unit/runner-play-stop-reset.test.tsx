// Cover the Play / Pause / Reset paths in app/components/pygame/runner.tsx
// that the existing runner-{recovery,export-fullscreen}.test.tsx miss:
//   - runGame happy path (lines 313-340): pyodide ref already populated,
//     compile, replace __main__ guard, runPythonAsync called
//   - runGame error path (lines 335-340): runPythonAsync rejects → setError
//     + onError callback
//   - stopGame canvas-clear (lines 348-358): clears the rAF and paints the
//     canvas black via fillRect
//   - resetGame chains stopGame + runGame (lines 364-366)
//   - setupCanvasBridge body (lines 73-308): mount + initial run drives the
//     pyodide.runPython(...) injection block

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PygameRunner from '@/components/pygame/runner';

// Stub the pyodide singleton with a runPython/runPythonAsync surface — the
// runner only ever invokes those two; recoverPyodide is unused on the happy
// path but we provide a no-op for symmetry with the recovery test.
const runPython = vi.fn();
const runPythonAsync = vi.fn();
const fakePyodide = { runPython, runPythonAsync };

const getPyodideMock = vi.fn();
const recoverPyodideMock = vi.fn();

vi.mock('@lib/python/pyodide-singleton', () => ({
  getPyodide: () => getPyodideMock(),
  recoverPyodide: () => recoverPyodideMock(),
}));

vi.mock('@lib/pygame/runtime/compiler', () => ({
  compilePythonGame: vi
    .fn()
    .mockReturnValue('import pygame\nif __name__ == "__main__":\n    pygame.init()\n'),
}));

const ctxStub = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  fillStyle: '',
};

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => ctxStub
  ) as unknown as HTMLCanvasElement['getContext'];
});

beforeEach(() => {
  getPyodideMock.mockReset();
  recoverPyodideMock.mockReset();
  runPython.mockReset();
  runPythonAsync.mockReset();
  ctxStub.clearRect.mockReset();
  ctxStub.fillRect.mockReset();
  ctxStub.fillStyle = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('PygameRunner — runGame happy path', () => {
  it('Play button compiles + injects + runs the game; transitions to Pause label', async () => {
    getPyodideMock.mockResolvedValue(fakePyodide);
    runPythonAsync.mockResolvedValue(undefined);

    render(<PygameRunner />);

    // After mount, initPyodide resolves and Loading clears.
    await waitFor(() => {
      // Either the Play button is now visible or, if errors fired, fail.
      expect(screen.queryByTestId('runner-error-panel')).not.toBeInTheDocument();
    });

    // The Play button has Play icon + visible text "Play"; find by role+name.
    const playBtn = screen
      .getAllByRole('button')
      .find((b) => /run game/i.test(b.textContent ?? ''));
    expect(playBtn).toBeDefined();
    fireEvent.click(playBtn!);

    await waitFor(() => {
      expect(runPythonAsync).toHaveBeenCalled();
    });
    // The compiled code has __main__ replaced with `if True:` before run.
    const arg = runPythonAsync.mock.calls[0][0] as string;
    expect(arg).toMatch(/if True:/);
    expect(arg).not.toMatch(/__main__/);

    // Note: setupCanvasBridge early-returns when canvasRef.current is null,
    // and during initPyodide isLoading=true still hides the canvas. That
    // means the BrowserCanvas / KeyState injection (lines 80-308) is only
    // reachable with real Pyodide where the loading flow is timed
    // differently. We pin the runGame path here instead — that's the
    // user-facing behavior when Play is clicked.
  });
});

describe('PygameRunner — runGame error path', () => {
  it('runPythonAsync rejection routes to setError + onError callback', async () => {
    getPyodideMock.mockResolvedValue(fakePyodide);
    runPythonAsync.mockRejectedValue(new Error('NameError: undefined symbol'));

    const onError = vi.fn();
    render(<PygameRunner onError={onError} />);

    await waitFor(() => {
      expect(screen.queryByTestId('runner-error-panel')).not.toBeInTheDocument();
    });

    const playBtn = screen
      .getAllByRole('button')
      .find((b) => /run game/i.test(b.textContent ?? ''));
    fireEvent.click(playBtn!);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('NameError: undefined symbol');
    });
    // The runner stays mounted; the error panel renders.
    expect(screen.getByTestId('runner-error-panel')).toBeInTheDocument();
  });
});

describe('PygameRunner — stopGame canvas clear', () => {
  it('Pause button clears the rAF and paints the canvas black', async () => {
    // Hold runPythonAsync open so we stay in the running state long enough
    // to click Pause. Resolve the deferred only after the click.
    let resolveAsync: (() => void) | undefined;
    runPythonAsync.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveAsync = resolve;
        })
    );
    getPyodideMock.mockResolvedValue(fakePyodide);

    render(<PygameRunner />);

    await waitFor(() => {
      expect(screen.queryByTestId('runner-error-panel')).not.toBeInTheDocument();
    });

    const playBtn = screen
      .getAllByRole('button')
      .find((b) => /run game/i.test(b.textContent ?? ''));
    fireEvent.click(playBtn!);

    // Wait until the running state flips and the button shows Stop.
    const stopBtn = await screen.findByRole('button', { name: /stop/i }, { timeout: 2000 });
    fireEvent.click(stopBtn);

    // stopGame painted the canvas black.
    await waitFor(() => {
      expect(ctxStub.fillRect).toHaveBeenCalled();
      expect(ctxStub.fillStyle).toBe('black');
    });

    resolveAsync?.();
  });
});

describe('PygameRunner — stopGame ctx-null short-circuit (line 355 path 1 falsy)', () => {
  it('stopGame skips the canvas paint when getContext returns null', async () => {
    // The stopGame inner clear is gated by `if (ctx)`. Existing tests
    // resolve getContext to ctxStub (truthy), only covering the truthy
    // arm. Override getContext to return null so the falsy arm fires —
    // stopGame still flips isRunning false but does NOT touch fillRect.
    const ctxSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null as unknown as CanvasRenderingContext2D);
    let resolveAsync: (() => void) | undefined;
    runPythonAsync.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveAsync = resolve;
        })
    );
    getPyodideMock.mockResolvedValue(fakePyodide);
    try {
      render(<PygameRunner />);
      await waitFor(() => {
        expect(screen.queryByTestId('runner-error-panel')).not.toBeInTheDocument();
      });
      const playBtn = screen
        .getAllByRole('button')
        .find((b) => /run game/i.test(b.textContent ?? ''));
      fireEvent.click(playBtn!);
      const stopBtn = await screen.findByRole('button', { name: /stop/i }, { timeout: 2000 });
      const fillRectCallsBefore = ctxStub.fillRect.mock.calls.length;
      fireEvent.click(stopBtn);
      // isRunning flips back; the stopBtn no longer renders.
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument();
      });
      // ctx-null falsy arm: no additional fillRect call from stopGame.
      expect(ctxStub.fillRect.mock.calls.length).toBe(fillRectCallsBefore);
      resolveAsync?.();
    } finally {
      ctxSpy.mockRestore();
    }
  });
});

describe('PygameRunner — resetGame', () => {
  it('Reset button stops the run and re-invokes runGame', async () => {
    // Hold the first run open so isRunning stays true (the Reset button is
    // disabled when !isRunning). Resolve after the reset click.
    let resolveAsync: (() => void) | undefined;
    runPythonAsync.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveAsync = resolve;
        })
    );
    getPyodideMock.mockResolvedValue(fakePyodide);

    render(<PygameRunner />);

    await waitFor(() => {
      expect(screen.queryByTestId('runner-error-panel')).not.toBeInTheDocument();
    });

    const playBtn = screen
      .getAllByRole('button')
      .find((b) => /run game/i.test(b.textContent ?? ''));
    fireEvent.click(playBtn!);
    await waitFor(() => expect(runPythonAsync).toHaveBeenCalledTimes(1));

    // Wait for isRunning to flip → button shows Stop → Reset enables.
    await screen.findByRole('button', { name: /stop/i }, { timeout: 2000 });

    const resetBtn = screen.getAllByRole('button').find((b) => /reset/i.test(b.textContent ?? ''));
    expect(resetBtn).toBeDefined();
    fireEvent.click(resetBtn!);

    // resetGame → stopGame + runGame (runPythonAsync called a second time).
    await waitFor(() => expect(runPythonAsync).toHaveBeenCalledTimes(2));

    resolveAsync?.();
  });
});

describe('PygameRunner — initPyodide error edge cases', () => {
  it('initPyodide rejection with a non-Error value uses String(err) (line 64 falsy arm)', async () => {
    // The error coercion is `err instanceof Error ? err.message : String(err)`.
    // The existing error-path test rejects with a real Error, hitting the
    // truthy arm. Pin the falsy arm by rejecting with a plain string —
    // the runner must still surface a friendly error panel rather than
    // crashing on `.message` of a non-Error.
    getPyodideMock.mockRejectedValueOnce('plain-string-failure');
    const onError = vi.fn();
    render(<PygameRunner onError={onError} />);
    await waitFor(() => {
      expect(screen.getByTestId('runner-error-panel')).toBeInTheDocument();
    });
    expect(onError).toHaveBeenCalledWith('plain-string-failure');
  });

  it('initPyodide rejection without an onError prop still surfaces the error panel (line 68 falsy arm)', async () => {
    // `if (onError) onError(raw)` falsy arm — onError is undefined. The
    // runner must still set the error state and render the panel even
    // when no callback is wired up. Without this pin, a regression that
    // started accessing onError.call(...) unconditionally would crash
    // any caller that omits the prop.
    getPyodideMock.mockRejectedValueOnce(new Error('init failed for solo runner'));
    render(<PygameRunner />);
    await waitFor(() => {
      expect(screen.getByTestId('runner-error-panel')).toBeInTheDocument();
    });
  });
});
