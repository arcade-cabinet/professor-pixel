// Cover runner.tsx runGame catch arms that the existing
// runner-play-stop-reset.test.tsx skips:
//   - line 336 path 1 falsy: `err instanceof Error` falsy → String(err)
//     fallback. Existing test rejects with new Error('boom'), only
//     covering the truthy arm.
//   - line 338 path 1 falsy: `if (onError)` falsy → no onError prop, the
//     error path still sets local error state without calling the
//     undefined callback.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PygameRunner from '@/components/pygame/runner';

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
  compilePythonGame: vi.fn().mockReturnValue(
    'import pygame\nif __name__ == "__main__":\n    pygame.init()\n'
  ),
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

describe('PygameRunner — runGame catch with non-Error throw (line 336 falsy)', () => {
  it('runPythonAsync rejecting with a non-Error value falls back to String(err)', async () => {
    getPyodideMock.mockResolvedValue(fakePyodide);
    runPython.mockReturnValue(undefined);
    // Reject with a non-Error value → `err instanceof Error` is false →
    // String(err) is used instead of err.message.
    runPythonAsync.mockRejectedValue('plain-string-rejection');
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
      expect(onError).toHaveBeenCalledWith('plain-string-rejection');
    });
  });
});

describe('PygameRunner — runGame catch without onError prop (line 338 falsy)', () => {
  it('rejection without an onError prop still surfaces the error panel', async () => {
    getPyodideMock.mockResolvedValue(fakePyodide);
    runPython.mockReturnValue(undefined);
    runPythonAsync.mockRejectedValue(new Error('boom'));
    // No onError prop — the `if (onError)` guard at line 338 short-circuits.
    render(<PygameRunner />);
    await waitFor(() => {
      expect(screen.queryByTestId('runner-error-panel')).not.toBeInTheDocument();
    });
    const playBtn = screen
      .getAllByRole('button')
      .find((b) => /run game/i.test(b.textContent ?? ''));
    fireEvent.click(playBtn!);
    // The error panel renders.
    await waitFor(() => {
      expect(screen.getByTestId('runner-error-panel')).toBeInTheDocument();
    });
  });
});
