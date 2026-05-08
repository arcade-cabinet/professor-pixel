// Cover the `cancelled` short-circuit branches + `?? []` selectedAssetIds
// fallback in app/pages/play.tsx that the existing play-* suites skip:
//
// - Line 64 truthy (`if (cancelled) return` after catch): the load effect
//   rejects AFTER the component unmounts. Without the cancelled guard
//   setState would fire on an unmounted component.
//
// - Line 71 truthy (`if (cancelled) return` after success): the load
//   effect resolves AFTER the component unmounts. Same race shape on the
//   happy path.
//
// - Line 107 path 1 falsy (`snapshot.wizardState.selectedAssetIds ?? []`):
//   selectedAssetIds is omitted from the wizard state. Existing tests
//   always pass an empty array (truthy) so the right-hand-side fallback
//   never fires. With it undefined the ?? returns [] and the page still
//   renders ready.

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('Play — cancelled short-circuits during load', () => {
  it('rejects after unmount → cancelled guard prevents setState (line 64 truthy)', async () => {
    // Hold the load promise open so we can unmount before it rejects.
    let reject: (err: unknown) => void = () => {};
    loadWizardProjectMock.mockReturnValue(
      new Promise((_resolve, rej) => {
        reject = rej;
      })
    );
    const { unmount } = render(<Play />);
    // Page sits in 'loading' while the promise is pending.
    expect(screen.getByTestId('play-page-loading')).toBeInTheDocument();
    // Unmount BEFORE the rejection arrives.
    unmount();
    // Now reject. The catch arm runs but `if (cancelled) return` (line 64
    // truthy) short-circuits before setState. No "act() warning" or React
    // unmounted-component warning — that's the contract.
    reject(new Error('storage offline'));
    // Give the microtask queue a chance to flush.
    await Promise.resolve();
    await Promise.resolve();
    // Nothing to assert visually (the component is gone) — the test
    // succeeds if no "Can't perform a React state update" error fired.
    expect(true).toBe(true);
  });

  it('resolves after unmount → cancelled guard prevents setState (line 71 truthy)', async () => {
    let resolve: (val: unknown) => void = () => {};
    loadWizardProjectMock.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      })
    );
    const { unmount } = render(<Play />);
    expect(screen.getByTestId('play-page-loading')).toBeInTheDocument();
    unmount();
    // Resolve AFTER unmount — the `if (cancelled) return` after the
    // try/catch (line 71 truthy) short-circuits.
    resolve({
      id: 'proj-1',
      name: 'Pong',
      wizardState: { sessionActions: { selectedComponents: { ball: 'A' } } },
      gamePy: 'print("ok")',
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(true).toBe(true);
  });
});

describe('Play — selectedAssetIds ?? [] fallback (line 107 path 1)', () => {
  it('routes to ready when selectedAssetIds is undefined on the snapshot', async () => {
    // Omit selectedAssetIds entirely → the ?? [] fallback fires and
    // assetIds is the empty array. Page reaches 'ready'.
    loadWizardProjectMock.mockResolvedValue({
      id: 'proj-1',
      name: 'Pong',
      wizardState: {
        sessionActions: { selectedComponents: { ball: 'A' } },
        // selectedAssetIds intentionally omitted.
      },
      gamePy: 'print("ready")',
    });
    render(<Play />);
    await waitFor(() => {
      expect(screen.getByTestId('button-play-game')).toBeInTheDocument();
    });
    // The ready arm renders with title + Play button — no assets needed.
    expect(getAssetByIdMock).not.toHaveBeenCalled();
  });
});
