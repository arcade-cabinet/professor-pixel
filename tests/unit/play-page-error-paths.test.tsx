// Cover the play.tsx error branches that the real-Pyodide component
// test (tests/component/play-page.test.tsx) doesn't reach:
//   - loadWizardProject rejection → compile-error state with err.message
//   - getPyodide rejection from onPlay → runtime-error state with msg
//   - recoverPyodide() called in the runtime-error retry branch
//   - selectedAssets resolved + mountAssetsForGame invoked in onPlay

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const useParamsMock = vi.fn();
vi.mock('wouter', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('wouter');
  return {
    ...actual,
    useParams: () => useParamsMock(),
    Link: ({
      children,
      href,
    }: {
      children: React.ReactNode;
      href: string;
    }) => <a href={href}>{children}</a>,
  };
});

const loadWizardProjectMock = vi.fn();
vi.mock('@lib/storage/projects', () => ({
  loadWizardProject: (id: string) => loadWizardProjectMock(id),
}));

const compilePythonGameMock = vi.fn();
vi.mock('@lib/pygame/runtime/compiler', () => ({
  compilePythonGame: (...args: unknown[]) => compilePythonGameMock(...args),
}));

const getAssetByIdMock = vi.fn();
const readyMock = vi.fn();
vi.mock('@lib/assets/manager', () => ({
  assetManager: {
    getAssetById: (id: string) => getAssetByIdMock(id),
    ready: () => readyMock(),
  },
}));

const getPyodideMock = vi.fn();
const recoverPyodideMock = vi.fn();
vi.mock('@lib/python/pyodide-singleton', () => ({
  getPyodide: () => getPyodideMock(),
  recoverPyodide: () => recoverPyodideMock(),
}));

const mountAssetsForGameMock = vi.fn();
vi.mock('@lib/python/asset-mount', () => ({
  mountAssetsForGame: (...args: unknown[]) => mountAssetsForGameMock(...args),
}));

import Play from '@/pages/play';

beforeEach(() => {
  useParamsMock.mockReset().mockReturnValue({ projectId: 'proj-1' });
  loadWizardProjectMock.mockReset();
  compilePythonGameMock.mockReset();
  getAssetByIdMock.mockReset();
  readyMock.mockReset().mockResolvedValue(undefined);
  getPyodideMock.mockReset();
  recoverPyodideMock.mockReset();
  mountAssetsForGameMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Play — compile-error branches', () => {
  it('loadWizardProject rejection routes to compile-error with the err.message', async () => {
    loadWizardProjectMock.mockRejectedValue(new Error('storage corrupt'));
    render(<Play />);
    expect(await screen.findByTestId('play-compile-error')).toBeInTheDocument();
    expect(screen.getByText(/storage corrupt/)).toBeInTheDocument();
  });

  it('compile-error from inner compile try/catch lands in the same panel', async () => {
    loadWizardProjectMock.mockResolvedValue({
      id: 'proj-1',
      name: 'Pong',
      wizardState: {
        sessionActions: { selectedComponents: { ball: 'A' } },
        selectedAssetIds: ['a1'],
      },
      // No gamePy → forces the compilePythonGame branch.
    });
    getAssetByIdMock.mockReturnValue(undefined); // filter drops it
    compilePythonGameMock.mockImplementation(() => {
      throw new Error('compiler bug — invalid choice key');
    });
    render(<Play />);
    expect(await screen.findByTestId('play-compile-error')).toBeInTheDocument();
    expect(screen.getByText(/compiler bug/)).toBeInTheDocument();
  });

  it('compile-error from non-Error throw uses the literal fallback message (line 123 path 1 falsy)', async () => {
    // The inner compile try/catch builds the message via
    // `(err as Error).message ?? 'Failed to compile game code'`. Existing
    // tests throw `new Error('...')` so .message is always truthy. Throw
    // a plain object cast as Error → .message is undefined → the ??
    // fallback fires.
    loadWizardProjectMock.mockResolvedValue({
      id: 'proj-1',
      name: 'Pong',
      wizardState: {
        sessionActions: { selectedComponents: { ball: 'A' } },
        selectedAssetIds: [],
      },
    });
    compilePythonGameMock.mockImplementation(() => {
      // Plain object — no Error subclass, no .message property.
      throw {} as unknown as Error;
    });
    render(<Play />);
    expect(await screen.findByTestId('play-compile-error')).toBeInTheDocument();
    expect(
      screen.getByText(/Failed to compile game code/)
    ).toBeInTheDocument();
  });
});

describe('Play — onPlay runtime-error path', () => {
  it('getPyodide rejection from onPlay sets runtime-error + preserves the title/code', async () => {
    loadWizardProjectMock.mockResolvedValue({
      id: 'proj-1',
      name: 'Pong',
      wizardState: {
        sessionActions: { selectedComponents: { ball: 'A' } },
        selectedAssetIds: [],
      },
      gamePy: 'print("ready")',
    });
    getPyodideMock.mockRejectedValue(new Error('Pyodide CDN down'));
    render(<Play />);
    // Wait for the ready button to appear.
    const playBtn = await screen.findByTestId('button-play-game');
    fireEvent.click(playBtn);
    await waitFor(() => {
      expect(screen.getByTestId('play-runtime-error')).toBeInTheDocument();
    });
    expect(screen.getByText(/Pyodide CDN down/)).toBeInTheDocument();
    // recoverPyodide is NOT called on the FIRST failure — only on retry.
    expect(recoverPyodideMock).not.toHaveBeenCalled();
  });

  it('clicking the runtime-error retry resets Pyodide via recoverPyodide()', async () => {
    loadWizardProjectMock.mockResolvedValue({
      id: 'proj-1',
      name: 'Pong',
      wizardState: {
        sessionActions: { selectedComponents: { ball: 'A' } },
        selectedAssetIds: [],
      },
      gamePy: 'print("ready")',
    });
    getPyodideMock.mockRejectedValue(new Error('first crash'));
    render(<Play />);
    const playBtn = await screen.findByTestId('button-play-game');
    fireEvent.click(playBtn);
    await screen.findByTestId('play-runtime-error');
    // Now click the retry button. It re-fires onPlay; this time the
    // state.kind === 'runtime-error' branch calls recoverPyodide() first.
    const retryBtn = await screen.findByRole('button', {
      name: /try again|retry/i,
    });
    fireEvent.click(retryBtn);
    await waitFor(() => {
      expect(recoverPyodideMock).toHaveBeenCalled();
    });
  });
});

describe('Play — onPlay happy path drives mountAssetsForGame + runPythonAsync', () => {
  it('successful onPlay mounts assets and runs the Python code', async () => {
    loadWizardProjectMock.mockResolvedValue({
      id: 'proj-1',
      name: 'Pong',
      wizardState: {
        sessionActions: { selectedComponents: { ball: 'A' } },
        selectedAssetIds: ['a1', 'a2'],
      },
      gamePy: 'pygame.init()',
    });
    // a1 resolves, a2 returns undefined → filter drops it.
    getAssetByIdMock.mockImplementation((id: string) =>
      id === 'a1' ? { id: 'a1', name: 'a1', type: 'sprite', path: '/a1.png' } : undefined
    );
    const runPythonAsync = vi.fn().mockResolvedValue(undefined);
    const loadPackage = vi.fn().mockResolvedValue(undefined);
    getPyodideMock.mockResolvedValue({ runPythonAsync, loadPackage });
    mountAssetsForGameMock.mockResolvedValue(undefined);
    render(<Play />);
    fireEvent.click(await screen.findByTestId('button-play-game'));
    await waitFor(() => {
      expect(runPythonAsync).toHaveBeenCalledWith('pygame.init()');
    });
    // Asset mount called with the resolved-asset list (just a1).
    expect(mountAssetsForGameMock).toHaveBeenCalled();
    const assets = mountAssetsForGameMock.mock.calls[0][1] as Array<{ id: string }>;
    expect(assets).toHaveLength(1);
    expect(assets[0].id).toBe('a1');
  });
});
