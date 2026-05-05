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

  zip.file('index.html', buildBootstrapHtml(title, pythonCode));

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

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'my-game'
  );
}

function buildBootstrapHtml(title: string, pythonCode: string): string {
  // Self-contained Pyodide loader. Loads pygame-ce, runs game.py, renders to
  // a canvas. Friendly "loading..." UI for the seconds it takes Pyodide to
  // boot. Errors surface in a visible panel so the kid isn't staring at a
  // blank page.
  //
  // The bootstrap is hybrid:
  //   * Served over http(s):// (or any protocol where fetch works) → fetch
  //     game.py at runtime so edits to the side-by-side file take effect on
  //     refresh. This honours the README's "edit game.py, refresh, see the
  //     change" promise.
  //   * Opened from file:// → use the inlined base64 copy. Chrome/Edge block
  //     fetch() of sibling files under the file:// origin.
  //   * fetch() fails for any other reason → fall back to the inlined copy.
  // Base64 (vs. a JS string-literal escape) sidesteps every quoting corner
  // case (backticks, ${}, unicode line separators, etc.) that could break a
  // kid's game silently if the compiled Python ever contained them.
  const safeTitle = escapeHtml(title);
  const pythonB64 = base64UTF8(pythonCode);
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
    // Compiled game source is inlined as a base64 string so the bundle works
    // under file:// (where fetch() fails with CORS errors in Chrome/Edge).
    // BUT — when served over http(s)://, we prefer fetch('game.py') so that
    // edits to the side-by-side game.py file take effect on refresh. The
    // README promises "edit game.py, refresh, see the change"; honour that
    // when the protocol allows. The base64 copy is the safety net.
    const GAME_PY_B64 = "${pythonB64}";
    function decodeInlinedGame() {
      const bytes = Uint8Array.from(atob(GAME_PY_B64), (c) => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    }
    async function loadGameSource() {
      // file:// origins can't fetch sibling files in Chrome/Edge — go straight
      // to the inlined copy. Other protocols (http, https, blob, etc.) try
      // the live game.py first and fall back to the inline copy on any error.
      if (location.protocol === 'file:') return decodeInlinedGame();
      try {
        const r = await fetch('game.py');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.text();
      } catch (e) {
        console.warn('Falling back to inlined game.py:', e);
        return decodeInlinedGame();
      }
    }
    (async () => {
      const status = document.getElementById('status');
      const error = document.getElementById('error');
      try {
        status.textContent = 'Loading Python…';
        const pyodide = await loadPyodide({ indexURL: '${PYODIDE_CDN_BASE}' });
        status.textContent = 'Loading pygame…';
        await pyodide.loadPackage(['pygame-ce']);
        status.textContent = 'Loading your game…';
        const code = await loadGameSource();
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

function base64UTF8(s: string): string {
  // btoa() only handles latin-1; encode to UTF-8 bytes first so emoji and
  // non-ASCII identifiers in the compiled Python survive.
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
