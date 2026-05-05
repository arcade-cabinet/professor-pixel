/**
 * Launcher /play/:projectId — runs a saved game from the OPFS library
 * as a finished game (not the wizard editor).
 *
 * Flow:
 *   1. Load snapshot from OPFS via loadWizardProject(projectId)
 *   2. Hydrate selectedAssets from the catalog using saved IDs
 *   3. Compile to game.py via the same compilePythonGame the export
 *      pipeline uses — that means /play and exporter share a
 *      single source of truth for "what does this game actually run"
 *   4. Boot Pyodide, run the compiled code, render to canvas
 *
 * No wizard chrome. No editor. No multi-step UI. The kid clicked a
 * tile in My Games and wants to play, period. The page is intentionally
 * thin: title + canvas + "Back to library" / "Edit" buttons.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { loadWizardProject } from '@lib/storage/projects';
import { compilePythonGame } from '@lib/pygame/runtime/compiler';
import { assetManager } from '@lib/assets/manager';
import type { GameAsset } from '@lib/assets/types';
import { getPyodide } from '@lib/python/pyodide-singleton';
import { strings } from '@lib/i18n';

type State =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'unfinished'; title: string } // mid-wizard save with no components yet
  | { kind: 'compile-error'; message: string }
  | { kind: 'ready'; pythonCode: string; title: string }
  | { kind: 'running'; pythonCode: string; title: string }
  | { kind: 'runtime-error'; pythonCode: string; title: string; message: string };

export default function PlayPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const [state, setState] = useState<State>({ kind: 'loading' });

  // Step 1: load the project + compile.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const snapshot = await loadWizardProject(projectId);
      if (cancelled) return;
      if (!snapshot) {
        setState({ kind: 'not-found' });
        return;
      }
      const assetIds = snapshot.wizardState.selectedAssetIds ?? [];
      const selectedAssets = assetIds
        .map((id) => assetManager.getAssetById(id))
        .filter((a): a is GameAsset => Boolean(a));
      const sessionActions = snapshot.wizardState.sessionActions;
      const selectedComponents =
        (sessionActions?.selectedComponents as Record<string, string> | undefined) ?? {};
      // A mid-wizard auto-save fires before the kid has chosen any
      // components. compilePythonGame would emit a stub game that
      // displays a black canvas and burns Pyodide cold-start time
      // for nothing. Surface the unfinished state instead so the kid
      // can route back into the wizard to keep building.
      if (Object.keys(selectedComponents).length === 0) {
        setState({ kind: 'unfinished', title: snapshot.name });
        return;
      }
      try {
        const pythonCode = compilePythonGame(selectedComponents, selectedAssets);
        setState({
          kind: 'ready',
          pythonCode,
          title: snapshot.name,
        });
      } catch (err) {
        setState({
          kind: 'compile-error',
          message: (err as Error).message ?? 'Failed to compile game code',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Step 2: when the kid clicks Play, boot Pyodide and run.
  const onPlay = async () => {
    if (state.kind !== 'ready' && state.kind !== 'runtime-error') return;
    setState({ kind: 'running', pythonCode: state.pythonCode, title: state.title });
    try {
      const pyodide = await getPyodide();
      await pyodide.loadPackage(['pygame-ce']);
      // Mount the canvas onto Pyodide's pygame target. PygameLive
      // preview uses setCanvasContext for the same purpose; using
      // runPythonAsync directly lets the saved game.py run as-written
      // without the per-frame draw-command interception the wizard
      // preview applies (the wizard uses the simulator for snappy
      // step-by-step feedback; the launcher wants the real thing).
      await pyodide.runPythonAsync(state.pythonCode);
    } catch (err) {
      setState({
        kind: 'runtime-error',
        pythonCode: state.pythonCode,
        title: state.title,
        message: (err as Error).message ?? 'Game crashed',
      });
    }
  };

  if (state.kind === 'loading') {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"
        data-testid="play-page-loading"
      >
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{strings.play.loading ?? 'Loading your game…'}</span>
        </div>
      </main>
    );
  }

  if (state.kind === 'not-found') {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-8 dark:bg-gray-900"
        data-testid="play-page-not-found"
      >
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {strings.play.notFoundTitle ?? "We couldn't find that game"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {strings.play.notFoundBody ??
            "It might have been deleted, or this link doesn't match a project in your library."}
        </p>
        <Link href="/">
          <Button data-testid="button-back-to-library">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {strings.play.backToLibrary ?? 'Back to My Games'}
          </Button>
        </Link>
      </main>
    );
  }

  // unfinished — mid-wizard save with no chosen components. Direct
  // the kid back into the wizard to finish building.
  if (state.kind === 'unfinished') {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-8 dark:bg-gray-900"
        data-testid="play-page-unfinished"
      >
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{state.title}</h1>
        <p className="max-w-md text-center text-gray-600 dark:text-gray-400">
          {strings.play.unfinishedBody}
        </p>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline" data-testid="button-back-to-library">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {strings.play.backToLibrary}
            </Button>
          </Link>
          <Link href={`/wizard?resume=${projectId}`}>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-edit-game"
            >
              <Pencil className="mr-2 h-4 w-4" />
              {strings.play.keepBuilding}
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  // compile-error renders without a title because we couldn't load
  // the snapshot far enough to know what the kid named it. Surface a
  // "Back to library" affordance and the diagnostic so they can recover.
  if (state.kind === 'compile-error') {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-8 dark:bg-gray-900"
        data-testid="play-compile-error"
      >
        <div
          className="w-full max-w-2xl rounded-lg bg-red-50 p-4 text-red-900 dark:bg-red-900/30 dark:text-red-100"
          role="alert"
        >
          <p className="font-semibold">
            {strings.play.compileErrorTitle ?? "We couldn't build this game"}
          </p>
          <pre className="mt-2 whitespace-pre-wrap text-sm">{state.message}</pre>
        </div>
        <Link href="/">
          <Button data-testid="button-back-to-library">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {strings.play.backToLibrary ?? 'Back to My Games'}
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900" data-testid="play-page">
      <header className="mx-auto mb-4 flex w-full max-w-4xl items-center justify-between">
        <Link href="/">
          <Button variant="ghost" data-testid="button-back-to-library">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {strings.play.backToLibrary ?? 'Back to My Games'}
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{state.title}</h1>
        <Link href={`/wizard?resume=${projectId}`}>
          <Button variant="ghost" data-testid="button-edit-game">
            <Pencil className="mr-2 h-4 w-4" />
            {strings.play.edit ?? 'Edit'}
          </Button>
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4">
        <canvas
          id="canvas"
          width={800}
          height={600}
          className="rounded-xl border-2 border-gray-300 bg-black shadow-lg dark:border-gray-700"
          data-testid="play-canvas"
          style={{ imageRendering: 'pixelated' }}
        />

        {state.kind === 'ready' && (
          <Button
            size="lg"
            onClick={onPlay}
            data-testid="button-play-game"
            className="bg-purple-600 hover:bg-purple-700"
          >
            ▶ {strings.play.play ?? 'Play'}
          </Button>
        )}

        {state.kind === 'running' && (
          <div
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
            data-testid="play-running-status"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{strings.play.running ?? 'Loading Python and pygame…'}</span>
          </div>
        )}

        {state.kind === 'runtime-error' && (
          <div
            className="w-full rounded-lg bg-red-50 p-4 text-red-900 dark:bg-red-900/30 dark:text-red-100"
            data-testid="play-runtime-error"
            role="alert"
          >
            <p className="font-semibold">{strings.play.runtimeErrorTitle ?? 'The game crashed'}</p>
            <pre className="mt-2 whitespace-pre-wrap text-sm">{state.message}</pre>
            <Button
              className="mt-3"
              variant="outline"
              size="sm"
              onClick={onPlay}
              data-testid="button-retry-play"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              {strings.play.retry ?? 'Try again'}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
