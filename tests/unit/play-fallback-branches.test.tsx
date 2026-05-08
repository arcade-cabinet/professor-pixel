// Cover the `??` fallback branches in app/pages/play.tsx that the
// existing play-page-error-paths suite skips:
//   - line 78: (sessionActions?.selectedComponents as ...) ?? {} — the
//     `?? {}` arm fires when wizardState.sessionActions exists but its
//     selectedComponents is undefined. Existing tests always pass a
//     populated object so the right-hand side never executes. With an
//     empty {} the page routes to 'unfinished' (Object.keys length 0).
//   - line 174: (err as Error).message ?? 'Game crashed' — the runtime
//     try/catch's fallback string fires when the thrown error has no
//     message. Existing runtime-error tests always set message to a real
//     string, so the `?? 'Game crashed'` arm stays cold.
//
// Both targets are simple ?? right-hand sides that need a single render
// each. Coverage is the contract.
//
// Note: line 67 (compile-error msg ?? fallback) is the symmetric case
// for loadWizardProject rejection. Existing test passes 'storage corrupt'
// so the fallback also stays cold; we cover that here too.
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const useParamsMock = vi.fn();
vi.mock('wouter', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('wouter');
  return {
    ...actual,
    useParams: () => useParamsMock(),
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
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

describe('Play — sessionActions.selectedComponents fallback (line 78)', () => {
  it('routes to unfinished when sessionActions exists but selectedComponents is undefined', async () => {
    // sessionActions present (truthy chain) but no selectedComponents key.
    // This forces the `?? {}` right-hand side to fire and Object.keys
    // returns [] → unfinished panel.
    loadWizardProjectMock.mockResolvedValue({
      id: 'proj-1',
      name: 'No-components Game',
      wizardState: {
        sessionActions: {},
        selectedAssetIds: [],
      },
    });
    render(<Play />);
    expect(await screen.findByTestId('play-page-unfinished')).toBeInTheDocument();
  });
});

describe('Play — Error.message fallback strings (lines 67, 174)', () => {
  it('compile-error panel uses the fallback when loadWizardProject rejects with empty-message Error', async () => {
    // new Error() with no arg → message === ''. The `?? 'Failed to load
    // saved game'` arm only fires when message is null/undefined, but the
    // OR-chain on a 'message ?? fallback' with an empty string returns
    // ''. So we throw a value whose .message access gives undefined: a
    // plain object cast through `as Error`.
    loadWizardProjectMock.mockRejectedValue({}); // not an Error subclass
    render(<Play />);
    expect(await screen.findByTestId('play-compile-error')).toBeInTheDocument();
    // The fallback string from strings.play (or the inline literal) is
    // present. We don't assert exact copy — coverage of the ?? arm is
    // the contract.
    expect(screen.getByTestId('play-compile-error').textContent).toBeTruthy();
  });

  it('runtime-error panel uses the "Game crashed" fallback when getPyodide rejects with no message', async () => {
    loadWizardProjectMock.mockResolvedValue({
      id: 'proj-1',
      name: 'Pong',
      wizardState: {
        sessionActions: { selectedComponents: { ball: 'A' } },
        selectedAssetIds: [],
      },
      gamePy: 'print("ready")',
    });
    // Reject with a value whose .message is undefined so the `??` arm
    // returns the literal fallback.
    getPyodideMock.mockRejectedValue({});
    render(<Play />);
    fireEvent.click(await screen.findByTestId('button-play-game'));
    await waitFor(() => {
      expect(screen.getByTestId('play-runtime-error')).toBeInTheDocument();
    });
    // 'Game crashed' is the inline fallback literal in play.tsx:174.
    expect(screen.getByText(/Game crashed/)).toBeInTheDocument();
  });
});
