// Cover the Export (download) + Fullscreen toggle buttons in
// app/components/pygame/runner.tsx. Both are non-Pyodide branches but
// the existing runner-recovery test only covers the failure-mode panel.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PygameRunner from '@/components/pygame/runner';

const getPyodideMock = vi.fn();
const recoverPyodideMock = vi.fn();
const compilePythonGameMock = vi.fn().mockReturnValue('# compiled stub');

vi.mock('@lib/python/pyodide-singleton', () => ({
  getPyodide: () => getPyodideMock(),
  recoverPyodide: () => recoverPyodideMock(),
}));

vi.mock('@lib/pygame/runtime/compiler', () => ({
  compilePythonGame: (...args: unknown[]) => compilePythonGameMock(...args),
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
  compilePythonGameMock.mockClear();
  // Stub URL.createObjectURL + revokeObjectURL — jsdom doesn't implement them.
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn().mockReturnValue('blob:fake-url'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('PygameRunner — Export (download) button', () => {
  it('Export button compiles the game + creates a blob URL + clicks an anchor', () => {
    // Mount with getPyodide deferred (never resolves) so isLoading stays true,
    // but the Export button is unconditionally rendered in the toolbar.
    getPyodideMock.mockImplementation(() => new Promise(() => {}));
    render(<PygameRunner selectedComponents={{ ball: 'A' }} selectedAssets={[]} />);

    // Spy on HTMLAnchorElement.click + appendChild/removeChild side effects.
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const exportBtn = screen
      .getAllByRole('button')
      .find((b) => /export/i.test(b.textContent ?? ''));
    expect(exportBtn).toBeDefined();
    fireEvent.click(exportBtn!);

    expect(compilePythonGameMock).toHaveBeenCalledWith({ ball: 'A' }, []);
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });
});

describe('PygameRunner — Fullscreen toggle', () => {
  it('Fullscreen button toggles the fixed-positioning class on the Card', () => {
    getPyodideMock.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<PygameRunner />);

    // Card is the outermost Card element — find by aria-label of its toggle.
    const fullscreenBtn = screen.getByLabelText(/fullscreen/i);
    // Pre-toggle: container does NOT have the fixed inset-0 z-50 class.
    expect(container.querySelector('.fixed.inset-0.z-50')).toBeFalsy();
    fireEvent.click(fullscreenBtn);
    expect(container.querySelector('.fixed.inset-0.z-50')).toBeTruthy();
    fireEvent.click(fullscreenBtn);
    expect(container.querySelector('.fixed.inset-0.z-50')).toBeFalsy();
  });
});

describe('PygameRunner — onClose forwarding', () => {
  it('renders the close button only when onClose is provided', () => {
    getPyodideMock.mockImplementation(() => new Promise(() => {}));
    const { rerender } = render(<PygameRunner />);
    expect(screen.queryByLabelText(/close/i)).not.toBeInTheDocument();
    rerender(<PygameRunner onClose={vi.fn()} />);
    expect(screen.getByLabelText(/close/i)).toBeInTheDocument();
  });

  it('clicking close fires onClose', () => {
    getPyodideMock.mockImplementation(() => new Promise(() => {}));
    const onClose = vi.fn();
    render(<PygameRunner onClose={onClose} />);
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(onClose).toHaveBeenCalled();
  });
});
