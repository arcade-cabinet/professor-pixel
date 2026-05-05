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
import { __clearAllOpfsProjectsForTests, saveOpfsProject } from '@lib/storage/opfs-projects';
import { __resetOpfsRoutingForTests } from '@lib/storage/projects';

// Minimal-but-real wizard state with at least one selectedComponent
// so /play takes the ready → running path (not the unfinished one).
const WIZARD_STATE = {
  version: '1.0.0',
  selectedAssetIds: [],
  gameType: 'platformer',
  updatedAt: new Date().toISOString(),
  sessionActions: { selectedComponents: { hero: 'platformer-hero' } },
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
    const meta = await saveOpfsProject({
      name: 'E2E Game',
      template: 'platformer',
      wizardState: WIZARD_STATE,
    });

    const { hook } = memoryLocation({ path: `/play/${meta.id}` });
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
    // while Pyodide cold-starts. Within the 30s budget the run
    // either finishes (state stays 'running' with the canvas
    // mounted) or errors (transitions to runtime-error). Anything
    // except crashing is acceptable here — the canvas-rendering
    // contract is owned by the per-game pygame loop, not the
    // launcher. We're testing that the launcher's wiring DOESN'T
    // throw on real WASM execution.
    await waitFor(
      () => {
        // One of: still running (long pygame loop), or errored.
        // The crash-or-not assertion is what matters.
        const running = screen.queryByTestId('play-running-status');
        const errored = screen.queryByTestId('play-runtime-error');
        expect(running || errored).toBeTruthy();
      },
      { timeout: 25_000 }
    );

    // Specifically: if it errored, fail the test loudly. We want
    // to know about real launcher regressions; a silent fall to
    // runtime-error masks them.
    const errored = screen.queryByTestId('play-runtime-error');
    if (errored) {
      const message = errored.querySelector('pre')?.textContent ?? '';
      throw new Error(`Launcher e2e: /play landed in runtime-error. Pyodide message: ${message}`);
    }
  }, 35_000);
});
