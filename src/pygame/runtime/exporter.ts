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

const PYODIDE_CDN_VERSION = '0.26.4';
const PYODIDE_CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_CDN_VERSION}/full/`;

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
    const src =
      (asset as { url?: string; path?: string }).url ??
      (asset as { url?: string; path?: string }).path;
    if (!src) {
      failed.push(`${asset.name ?? 'unnamed asset'} (no url/path)`);
      continue;
    }
    try {
      const res = await fetchFn(src);
      if (!res.ok) {
        failed.push(`${src} (HTTP ${res.status})`);
        continue;
      }
      const buf = await res.arrayBuffer();
      const fname = src.split('/').pop() ?? `${asset.id ?? 'asset'}.bin`;
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
 * user cancels. Returns the action that was actually taken.
 */
export async function shareOrDownload(exported: ExportedProject): Promise<'shared' | 'downloaded'> {
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
      // AbortError (user dismissed), or unsupported — fall through to download.
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('navigator.share failed, falling back to download:', err);
      }
    }
  }
  triggerDownload(exported);
  return 'downloaded';
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'my-game'
  );
}

function buildBootstrapHtml(title: string): string {
  // Self-contained Pyodide loader. Loads pygame-ce, runs game.py, renders to
  // a canvas. Friendly "loading..." UI for the seconds it takes Pyodide to
  // boot. Errors surface in a visible panel so the kid isn't staring at a
  // blank page.
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #1a1a2e; color: #eee; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
    h1 { margin: 1rem; }
    #status { margin: 0.5rem; font-size: 0.9rem; opacity: 0.8; }
    #error { background: #722; padding: 1rem; border-radius: 0.5rem; max-width: 80ch; white-space: pre-wrap; display: none; }
    canvas { border: 2px solid #444; background: #000; image-rendering: pixelated; max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <div id="status">Loading Python… (this can take ~10s the first time)</div>
  <pre id="error"></pre>
  <canvas id="canvas" width="800" height="600"></canvas>
  <script src="${PYODIDE_CDN_BASE}pyodide.js"></script>
  <script>
    (async () => {
      const status = document.getElementById('status');
      const error = document.getElementById('error');
      try {
        status.textContent = 'Loading Python…';
        const pyodide = await loadPyodide({ indexURL: '${PYODIDE_CDN_BASE}' });
        status.textContent = 'Loading pygame…';
        await pyodide.loadPackage(['pygame-ce']);
        status.textContent = 'Loading your game…';
        const code = await fetch('game.py').then((r) => r.text());
        status.textContent = 'Running!';
        await pyodide.runPythonAsync(code);
      } catch (e) {
        status.textContent = 'Something went wrong.';
        error.style.display = 'block';
        error.textContent = String(e && e.message ? e.message : e);
        console.error(e);
      }
    })();
  </script>
</body>
</html>
`;
}

function buildReadme(title: string): string {
  return `# ${title}

You made this with Pixel's PyGame Palace! 🎮

## How to play it

1. **Easy way:** Just double-click \`index.html\` and your game opens in your web browser.
2. **If that doesn't work:** Right-click \`index.html\` → "Open with" → pick your browser (Chrome, Firefox, Safari…).

The first time it loads, it might take ~10 seconds — your browser is downloading
Python so it can run your game. After that, it's fast!

## How to share it

Send the **whole folder** (or the ZIP file) to a friend. They can play it the
same way: open \`index.html\`.

> Note: this game uses an internet connection the first time you load it (to
> download Python). After that, it usually works offline if your browser
> caches it.

## Files in this bundle

- \`game.py\` — your game's Python code
- \`index.html\` — the page that runs your game
- \`assets/\` — the pictures and sounds your game uses

## Want to change something?

Open \`game.py\` in any text editor (or paste it back into Pixel's PyGame Palace
to keep building!). Save your changes, refresh \`index.html\`, and you'll see
the new version.
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
