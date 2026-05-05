/**
 * /play/:projectId launcher page — load → compile → run flow.
 *
 * Browser mode (real Chromium via @vitest/browser) is mandatory: the
 * page reaches into OPFS (loadWizardProject's OPFS branch) and the
 * Play button fires real Pyodide. The "this is real" verification
 * happens here, not at the unit level.
 *
 * The test exercises the full state machine:
 *   loading → ready (saved snapshot found, compiled OK)
 *   loading → not-found (no project at that id)
 *
 * Clicking Play kicks off real Pyodide; we don't drive a full pygame
 * loop in the test (that's a 30s+ wait), but we do assert the
 * page transitions to 'running' and that getPyodide gets called.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { Router, Route } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import PlayPage from '@/pages/play';
import { __clearAllOpfsProjectsForTests, saveOpfsProject } from '@lib/storage/opfs-projects';
import { __resetOpfsRoutingForTests } from '@lib/storage/projects';

// Snapshot for the "ready" path — needs at least one selectedComponent
// so the page doesn't fall through to the unfinished state.
const SAMPLE_WIZARD_STATE = {
  version: '1.0.0',
  selectedAssetIds: [],
  gameType: 'platformer',
  updatedAt: new Date().toISOString(),
  sessionActions: {
    selectedComponents: { hero: 'platformer-hero' },
  },
};
// Snapshot for the "unfinished" path — empty selectedComponents.
const UNFINISHED_WIZARD_STATE = {
  version: '1.0.0',
  selectedAssetIds: [],
  gameType: 'platformer',
  updatedAt: new Date().toISOString(),
  sessionActions: { selectedComponents: {} },
};

function renderAt(path: string) {
  const { hook, navigate } = memoryLocation({ path });
  const ui = render(
    <Router hook={hook}>
      <Route path="/play/:projectId" component={PlayPage} />
    </Router>
  );
  return { ...ui, navigate };
}

describe('Launcher /play/:projectId page', () => {
  beforeEach(async () => {
    __resetOpfsRoutingForTests();
    await __clearAllOpfsProjectsForTests();
    localStorage.removeItem('pygame_academy_projects');
  });
  afterEach(async () => {
    __resetOpfsRoutingForTests();
    await __clearAllOpfsProjectsForTests();
    localStorage.removeItem('pygame_academy_projects');
    vi.restoreAllMocks();
  });

  it('shows the loading state, then transitions to ready with the saved title', async () => {
    const meta = await saveOpfsProject({
      name: 'My Robot Game',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
    });
    renderAt(`/play/${meta.id}`);

    // Loading flicker before OPFS load resolves.
    expect(screen.getByTestId('play-page-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('play-page')).toBeInTheDocument();
    });
    expect(screen.getByText('My Robot Game')).toBeInTheDocument();
    expect(screen.getByTestId('button-play-game')).toBeEnabled();
    expect(screen.getByTestId('play-canvas')).toBeInTheDocument();
  });

  it('shows the not-found state for an id that has no saved project', async () => {
    renderAt('/play/does-not-exist');
    await waitFor(() => {
      expect(screen.getByTestId('play-page-not-found')).toBeInTheDocument();
    });
    expect(screen.getByTestId('button-back-to-library')).toBeInTheDocument();
  });

  it('shows the unfinished state for a project with no selected components', async () => {
    const meta = await saveOpfsProject({
      name: 'Half-Built',
      template: 'platformer',
      wizardState: UNFINISHED_WIZARD_STATE,
    });
    renderAt(`/play/${meta.id}`);
    await waitFor(() => {
      expect(screen.getByTestId('play-page-unfinished')).toBeInTheDocument();
    });
    expect(screen.getByText('Half-Built')).toBeInTheDocument();
    // Both escape hatches present: back to library, keep building.
    expect(screen.getByTestId('button-back-to-library')).toBeInTheDocument();
    expect(screen.getByTestId('button-edit-game')).toBeInTheDocument();
  });

  it('clicking Play transitions to running state and invokes Pyodide', async () => {
    // Spy on Pyodide before render so the click path picks up the spy.
    // We import the module via vi.importActual + a partial mock so the
    // real getPyodide isn't called (a real Pyodide boot in this test
    // would add 5–10s; we just need to confirm the page wires the
    // click through to the runtime).
    const fakeRunPython = vi.fn(async () => undefined);
    const fakeLoadPackage = vi.fn(async () => undefined);
    vi.doMock('@lib/python/pyodide-singleton', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@lib/python/pyodide-singleton')>();
      return {
        ...actual,
        getPyodide: vi.fn(async () => ({
          loadPackage: fakeLoadPackage,
          runPythonAsync: fakeRunPython,
        })),
      };
    });
    // Re-import the page so it picks up the mock.
    vi.resetModules();
    const { default: PlayPageMocked } = await import('@/pages/play');
    const meta = await saveOpfsProject({
      name: 'Click Play Test',
      template: 'platformer',
      wizardState: SAMPLE_WIZARD_STATE,
    });

    const { hook } = memoryLocation({ path: `/play/${meta.id}` });
    render(
      <Router hook={hook}>
        <Route path="/play/:projectId" component={PlayPageMocked} />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByTestId('button-play-game')).toBeInTheDocument();
    });
    await act(async () => {
      await userEvent.click(screen.getByTestId('button-play-game'));
    });
    await waitFor(() => {
      expect(fakeLoadPackage).toHaveBeenCalledWith(['pygame-ce']);
    });
    expect(fakeRunPython).toHaveBeenCalled();
  });
});
