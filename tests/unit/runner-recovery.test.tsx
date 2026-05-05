import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PygameRunner from '@/components/pygame/runner';

// The recovery panel UI is what we're pinning. We don't need real Pyodide;
// we need getPyodide to succeed once (initial mount) then fail on every
// subsequent retry so we can drive into the recovery-failed branch.

const getPyodideMock = vi.fn();
const recoverPyodideMock = vi.fn();

vi.mock('@lib/python/pyodide-singleton', () => ({
  getPyodide: () => getPyodideMock(),
  recoverPyodide: () => recoverPyodideMock(),
}));

// Compiler isn't called until the kid hits Play; mount alone won't trigger
// it. Stub for safety.
vi.mock('@lib/pygame/runtime/compiler', () => ({
  compilePythonGame: vi.fn().mockReturnValue('# stub'),
}));

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
  })) as unknown as HTMLCanvasElement['getContext'];
});

beforeEach(() => {
  getPyodideMock.mockReset();
  recoverPyodideMock.mockReset();
});

afterEach(() => {
  localStorage.clear();
});

describe('PygameRunner — recovery-failed branch (P9.3)', () => {
  it('shows the recovery-failed panel after two consecutive recovery attempts fail', async () => {
    // First call: initial mount fails → primary error panel renders.
    // Subsequent calls: also fail → 1st retry stays on primary panel
    // (threshold absorbs transient flakes), 2nd retry trips into the
    // recovery-failed panel.
    getPyodideMock.mockRejectedValue(new Error('CDN down'));

    render(<PygameRunner />);

    // Primary error panel from initial mount failure.
    const errorPanel = await screen.findByTestId('runner-error-panel');
    expect(errorPanel).toBeInTheDocument();
    expect(screen.queryByTestId('runner-recovery-failed-panel')).not.toBeInTheDocument();

    // First retry — still primary panel (threshold ≥2).
    fireEvent.click(screen.getByTestId('runner-recover-button'));
    await waitFor(() => expect(screen.getByTestId('runner-error-panel')).toBeInTheDocument());
    expect(screen.queryByTestId('runner-recovery-failed-panel')).not.toBeInTheDocument();

    // Second retry — recovery-failed panel takes over.
    fireEvent.click(screen.getByTestId('runner-recover-button'));
    await waitFor(() =>
      expect(screen.getByTestId('runner-recovery-failed-panel')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('runner-error-panel')).not.toBeInTheDocument();
  });

  it('Try once more re-attempts initPyodide and stays on recovery-failed when it still throws', async () => {
    getPyodideMock.mockRejectedValue(new Error('CDN down'));

    render(<PygameRunner />);
    await screen.findByTestId('runner-error-panel');

    // Drive into the recovery-failed panel.
    fireEvent.click(screen.getByTestId('runner-recover-button'));
    await waitFor(() => expect(screen.getByTestId('runner-error-panel')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('runner-recover-button'));
    await screen.findByTestId('runner-recovery-failed-panel');

    const callsBefore = getPyodideMock.mock.calls.length;

    fireEvent.click(screen.getByTestId('runner-recovery-failed-retry'));

    // initPyodide was invoked again.
    await waitFor(() => expect(getPyodideMock.mock.calls.length).toBeGreaterThan(callsBefore));
    // Still failing → recovery-failed panel stays on screen.
    await waitFor(() =>
      expect(screen.getByTestId('runner-recovery-failed-panel')).toBeInTheDocument()
    );
  });
});
