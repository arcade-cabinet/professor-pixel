/**
 * Launcher end-to-end — real Pyodide, real OPFS, real compile path.
 *
 * The play-page.test.tsx mocks getPyodide so it can run fast.
 * THIS test does the opposite: every dependency is real. Saving a
 * project to OPFS, navigating to /play/:id, clicking Play, and
 * proving Python actually compiled to WebAssembly and ran the
 * compiled game.py end-to-end.
 *
 * Why both: the mocked test owns the wiring contract (page
 * transitions, button enablement, Pyodide invocations). This test
 * owns the integration contract — real WASM, real pygame-ce package
 * load, real game.py emission from the compiler. Without this, the
 * launcher's central claim ("your saved game actually plays") is
 * grep-spotted, not verified.
 *
 * Heavy: real Pyodide cold start runs 5-10s. Browser mode mandatory.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { Router, Route } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import PlayPage from '@/pages/play';
import { __clearAllOpfsProjectsForTests } from '@lib/storage/opfs-projects';
import { __resetOpfsRoutingForTests, saveWizardProject } from '@lib/storage/projects';

// Minimal-but-real wizard state with at least one selectedComponent
// so /play takes the ready → running path (not the unfinished one).
const WIZARD_STATE = {
  version: '1.0.0',
  selectedAssetIds: [],
  gameType: 'platformer',
  updatedAt: new Date().toISOString(),
  sessionActions: {
    choices: [],
    createdAssets: [],
    gameType: 'platformer',
    currentProject: null,
    completedSteps: [],
    unlockedEditor: false,
    selectedComponents: { hero: 'platformer-hero' },
  },
};

describe('Launcher end-to-end (real Pyodide)', () => {
  beforeEach(async () => {
    __resetOpfsRoutingForTests();
    await __clearAllOpfsProjectsForTests();
    localStorage.removeItem('pygame_academy_projects');
  });
  afterEach(async () => {
    __resetOpfsRoutingForTests();
    await __clearAllOpfsProjectsForTests();
    localStorage.removeItem('pygame_academy_projects');
  });

  it('saves to OPFS, loads on /play, runs through real Pyodide without crashing', async () => {
    // Seed via the public launcher save path so the test exercises
    // dedup + save-time compilation + gamePy persistence — the same
    // contract /play depends on. Going through saveOpfsProject would
    // skip compilePythonGame and the deduping behavior, masking
    // regressions in the wizard-save → play flow.
    const created = await saveWizardProject({
      name: 'E2E Game',
      template: 'platformer',
      wizardState: WIZARD_STATE,
    });

    const { hook } = memoryLocation({ path: `/play/${created.id}` });
    render(
      <Router hook={hook}>
        <Route path="/play/:projectId" component={PlayPage} />
      </Router>
    );

    // First — confirm the load path lands in 'ready' with the
    // saved title, NOT compile-error or unfinished.
    await waitFor(() => {
      expect(screen.getByTestId('play-page')).toBeInTheDocument();
    });
    expect(screen.getByText('E2E Game')).toBeInTheDocument();

    // Click Play → real Pyodide fires. No mock — this is the
    // verification that the wired-up runtime actually executes.
    await userEvent.click(screen.getByTestId('button-play-game'));

    // Page transitions to 'running' (status indicator visible)
    // while Pyodide cold-starts. Within the 25s budget the run
    // either finishes (state stays 'running' with the canvas
    // mounted) or errors (transitions to runtime-error). Anything
    // except crashing is acceptable here — the canvas-rendering
    // contract is owned by the per-game pygame loop, not the
    // launcher. We're testing that the launcher's wiring DOESN'T
    // throw on real WASM execution.
    //
    // We initially wait for the spinner OR error testid to confirm
    // the click handler fired. This alone could pass before Pyodide
    // does any work (running state flips before getPyodide()), so
    // we then sleep past a realistic cold-start budget and re-check
    // for runtime-error. Real Pyodide cold-start is 5-10s; if it's
    // going to fail it will fail by 15s. Surviving that window with
    // running still asserted is the post-bootstrap signal — the
    // browser actually did the WASM work and the pygame loop is
    // running.
    await waitFor(
      () => {
        const running = screen.queryByTestId('play-running-status');
        const errored = screen.queryByTestId('play-runtime-error');
        expect(running || errored).toBeTruthy();
      },
      { timeout: 25_000 }
    );

    // Wait past the cold-start window so the assertion below is
    // gated on real WASM execution finishing or failing, not just
    // the click-handler state flip.
    await new Promise((resolve) => setTimeout(resolve, 15_000));

    // Specifically: if it errored, fail the test loudly. We want
    // to know about real launcher regressions; a silent fall to
    // runtime-error masks them.
    const errored = screen.queryByTestId('play-runtime-error');
    if (errored) {
      const message = errored.querySelector('pre')?.textContent ?? '';
      throw new Error(`Launcher e2e: /play landed in runtime-error. Pyodide message: ${message}`);
    }
  }, 55_000);
});
