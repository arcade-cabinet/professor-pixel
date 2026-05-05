// Project exporter — bundles a kid's compiled game into a self-contained
// ZIP they can share, post, or run offline by opening index.html.
//
// Bundle layout:
//   index.html            — Pyodide bootstrap, points at game.py
//   game.py               — generated Python source (from compilePythonGame)
//   README.md             — friendly "how to run" + "share this with friends"
//   assets/<asset_name>   — each selected asset, fetched from public/ at
//                           export time
//
// Pyodide is loaded from the official CDN at runtime by index.html. We don't
// vendor Pyodide into the ZIP (megabytes of WASM that we'd have to keep
// up-to-date). The CDN URL is pinned to a known-good version.

import JSZip from 'jszip';
import { compilePythonGame } from './compiler';
import type { GameAsset } from '@lib/assets/types';
import { assetManager } from '@lib/assets/manager';
import { loadWizardProject } from '@lib/storage/projects';

// The export is source-only: game.py + assets/ + a small launcher HTML.
// Pyodide is NOT bundled per-game — that would mean shipping 12MB of WASM
// runtime with every export. Instead, the platform itself (Pixel's PyGame
// Palace) acts as the launcher: kids drop a .zip into the launcher's
// "Open game" UI and it runs in the same Pyodide+OPFS sandbox the editor
// uses. One runtime, many games; runtime upgrades automatically; PWA
// install works because the platform is on a real https origin (file://
// can't host a PWA). See task-65 for the launcher build-out.
//
// The bundled index.html is a friendly fallback for the case where someone
// double-clicks the export without the launcher: it tells them how to load
// the game in the launcher, and (for kids who already have Python) how to
// run game.py natively. We don't try to load Pyodide from CDN and pretend
// the export is "double-click and play" — that pretense is what the
// launcher architecture replaces.

export interface ExportProjectOptions {
  selectedComponents: Record<string, string>;
  selectedAssets: GameAsset[];
  /** Optional title shown in the bundled HTML. Defaults to "My Pygame Game". */
  title?: string;
  /** Override fetch for tests. */
  fetchImpl?: typeof fetch;
}

export interface ExportedProject {
  blob: Blob;
  filename: string;
}

/**
 * Build a complete, self-contained ZIP bundle of the kid's game.
 *
 * Returns the Blob + a default filename. Call `triggerDownload()` to save it,
 * or use the Blob directly (e.g. for share-sheet integrations).
 */
export async function exportProjectAsZip(options: ExportProjectOptions): Promise<ExportedProject> {
  const { selectedComponents, selectedAssets, title = 'My Pygame Game' } = options;
  const fetchFn = options.fetchImpl ?? fetch;

  const zip = new JSZip();

  const pythonCode = compilePythonGame(selectedComponents, selectedAssets);
  zip.file('game.py', pythonCode);

  zip.file('index.html', buildBootstrapHtml(title));

  zip.file('README.md', buildReadme(title));

  // Inline the assets the game references. We fetch from the running app's
  // /assets/ path; if a fetch fails (e.g. broken catalog URL), we record it
  // in the README rather than aborting — the rest of the bundle still works.
  const failed: string[] = [];
  const assetsFolder = zip.folder('assets');
  if (!assetsFolder) {
    throw new Error('Failed to create assets/ folder in zip');
  }
  for (const asset of selectedAssets) {
    // GameAsset.path is required per src/assets/types.ts. The defensive
    // string check protects against partially-formed objects that slip in
    // from mocks or future schema drift.
    const src = asset.path;
    if (!src) {
      failed.push(`${asset.name ?? 'unnamed asset'} (no path)`);
      continue;
    }
    try {
      const res = await fetchFn(src);
      if (!res.ok) {
        failed.push(`${src} (HTTP ${res.status})`);
        continue;
      }
      const buf = await res.arrayBuffer();
      // Sanitize the basename: even though `asset.path` comes from our own
      // catalog today, a future ingestion path could allow user-supplied
      // values. Strip the directory prefix, then collapse anything that
      // isn't a safe filename character to '_'. Belt-and-suspenders against
      // CWE-22 path traversal in the consumer's unzip step.
      // pop() returns '' (not undefined) when src ends with '/', so use ||
      // not ?? — both empty-string and undefined fall back to the asset id.
      const rawName = src.split('/').pop() || `${asset.id || 'asset'}.bin`;
      const fname = rawName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'asset.bin';
      assetsFolder.file(fname, buf);
    } catch (err) {
      failed.push(`${src} (${(err as Error).message})`);
    }
  }
  if (failed.length) {
    zip.file(
      'assets/MISSING.txt',
      `These assets failed to bundle and may be missing at runtime:\n\n${failed.join('\n')}\n`
    );
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return {
    blob,
    filename: `${slugify(title)}.zip`,
  };
}

export function triggerDownload(exported: ExportedProject): void {
  const url = URL.createObjectURL(exported.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exported.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Try Web Share API first (mobile-friendly: dispatches to Messages, AirDrop,
 * etc.); fall back to triggering a download if sharing isn't supported or the
 * user cancels. Returns the action that was actually taken — including
 * `'cancelled'` if the user explicitly dismissed the share sheet, in which
 * case we do NOT fall back to a download (re-downloading would override an
 * intentional cancel).
 */
export async function shareOrDownload(
  exported: ExportedProject
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  // navigator.canShare requires the File-share path; not all browsers support
  // sharing files (Firefox desktop, older Safari). Detect properly.
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([exported.blob], exported.filename, {
        type: 'application/zip',
      });
      const data: ShareData = { files: [file], title: exported.filename };
      const canShare = typeof navigator.canShare === 'function' ? navigator.canShare(data) : true;
      if (canShare) {
        await navigator.share(data);
        return 'shared';
      }
    } catch (err) {
      const name = (err as Error)?.name;
      // AbortError = user explicitly dismissed the share sheet. Respect that
      // intent: do NOT auto-download. The caller can show a "tap Save again
      // when ready" affordance if they want.
      if (name === 'AbortError') {
        return 'cancelled';
      }
      // NotAllowedError = transient activation expired between zip-gen and
      // share (common on iOS Safari when the export takes a few hundred ms).
      // The user didn't explicitly say "no", so falling through to the
      // download path delivers the file without user re-activation.
      if (name !== 'NotAllowedError') {
        console.warn('navigator.share failed, falling back to download:', err);
      }
    }
  }
  triggerDownload(exported);
  return 'downloaded';
}

/**
 * P4.17 — Export a saved /home project as a ZIP.
 *
 * Loads the project's wizard snapshot, hydrates the asset IDs against
 * the asset catalog (the snapshot stores IDs only — catalog stays the
 * source of truth for paths, etc.), then defers to `exportProjectAsZip`
 * + `shareOrDownload`. Returned action is the same tri-state as the
 * underlying call so the caller can toast "Saved!" / "Shared!" /
 * "Cancelled".
 *
 * Throws if the project id doesn't resolve (kid clicked Export on a
 * row that was deleted from another tab); the caller surfaces a toast.
 */
export async function exportSavedProject(
  projectId: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const snapshot = await loadWizardProject(projectId);
  if (!snapshot) {
    throw new Error(`Project ${projectId} not found`);
  }
  const ids = snapshot.wizardState.selectedAssetIds ?? [];
  const selectedAssets = ids
    .map((id) => assetManager.getAssetById(id))
    .filter((a): a is GameAsset => Boolean(a));
  const sessionActions = snapshot.wizardState.sessionActions;
  const exported = await exportProjectAsZip({
    selectedComponents: sessionActions?.selectedComponents ?? {},
    selectedAssets,
    title: snapshot.name,
  });
  return shareOrDownload(exported);
}

/**
 * Slugify a project name for use as a filename. Exported so callers
 * (toasts, share-sheet titles) report the same string the actual
 * download uses — a kid told "Saved as my-cool-game.zip" should find
 * exactly that file in their Downloads folder.
 */
export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'my-game'
  );
}

function buildBootstrapHtml(title: string): string {
  // The export is a SEND-MODE ARTIFACT, not a self-runnable game. The
  // kid's authoritative copy lives in the launcher's OPFS library inside
  // Pixel's PyGame Palace. This HTML is what someone sees if they
  // double-click index.html out of the zip without going through the
  // launcher: a friendly "this is a game from Pixel's PyGame Palace,
  // here's where to play it" landing page.
  //
  // We deliberately do NOT load Pyodide here, do NOT run game.py, do NOT
  // pretend the bundle is double-click-and-play. Doing that would mean
  // shipping 12MB of Pyodide per export AND maintaining a parallel
  // runtime story; the launcher exists exactly to avoid that. Anyone
  // who wants to actually play the game opens the launcher. Anyone who
  // wants to read or hand-modify the source opens game.py in a text
  // editor — the README explains how to run it with their own Python.
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle} — Pixel's PyGame Palace</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #1a1a2e; color: #eee; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 2rem; box-sizing: border-box; }
    h1 { margin: 1rem 0 0.25rem; }
    .subtitle { opacity: 0.7; margin-bottom: 2rem; }
    .card { background: #2a2a3e; padding: 1.5rem; border-radius: 0.75rem; max-width: 36rem; margin-bottom: 1rem; }
    .card h2 { margin-top: 0; }
    code { background: #0009; padding: 0.1rem 0.4rem; border-radius: 0.25rem; font-size: 0.9em; }
    a { color: #88aaff; }
  </style>
</head>
<body>
  <h1>🎮 ${safeTitle}</h1>
  <div class="subtitle">A game made with Pixel's PyGame Palace</div>
  <div class="card">
    <h2>How to play this game</h2>
    <p>This bundle is a sharing format — open <strong>Pixel's PyGame
    Palace</strong> and you'll find this project in your My Games library
    to play and remix.</p>
  </div>
  <div class="card">
    <h2>Want to peek at the code?</h2>
    <p>Open <code>game.py</code> in any text editor. The
    <code>README.md</code> file in this folder has instructions for running
    it with your own Python interpreter (Windows / macOS / Linux).</p>
  </div>
</body>
</html>
`;
}

function buildReadme(title: string): string {
  return `# ${title}

You made this with Pixel's PyGame Palace! 🎮

This is a **share bundle** — a snapshot of your game that you can drop into
Google Drive, iCloud Drive, AirDrop, email, etc. The full version of your
game lives in your Pixel's PyGame Palace library; this folder is for getting
a copy somewhere else.

## How to play it

Open **Pixel's PyGame Palace** and find this game in your **My Games**
library. That's where it plays — same place you built it.

If you're on a different device than where you authored it, open Pixel's
PyGame Palace there. (You'll need internet the first time the launcher
loads on a new device, then it works offline.)

## Want to peek at the code?

Open \`game.py\` in any text editor — that's the Python code your game runs.
You can read it, learn from it, even change it. (If you change it here, the
copy back in Pixel's PyGame Palace doesn't update automatically — that one
stays the source of truth for your library.)

### Run game.py with your own Python

If you have Python set up on your computer and want to run \`game.py\` with
your own interpreter (faster than the browser version, full pygame
features), install \`pygame-ce\` and run it directly:

**Windows:**
\`\`\`
py -m pip install pygame-ce
py game.py
\`\`\`
(If \`py\` isn't found, install Python from https://www.python.org/downloads/
and check "Add Python to PATH" during setup.)

**macOS:**
\`\`\`
python3 -m pip install pygame-ce
python3 game.py
\`\`\`
(If \`python3\` isn't found, install it via https://www.python.org/downloads/
or \`brew install python\` if you use Homebrew.)

**Linux:**
\`\`\`
python3 -m pip install --user pygame-ce
python3 game.py
\`\`\`
(On Ubuntu/Debian, \`sudo apt install python3 python3-pip\` first if needed.)

**Chromebook (Linux mode):** Same as Linux above, after enabling Linux from
Settings → Advanced → Developers.

## Files in this bundle

- \`game.py\` — the Python code that runs your game
- \`index.html\` — a friendly landing page if you double-click the folder
- \`assets/\` — the pictures and sounds your game uses
- \`README.md\` — this file

## How to share it

Send the whole folder (or the ZIP file) wherever you want — Google Drive,
iCloud, email, Discord, USB stick. Anyone with Pixel's PyGame Palace can
play it.
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

