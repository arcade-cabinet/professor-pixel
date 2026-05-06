// Mounts game assets into Pyodide's emscripten filesystem so the
// generated `pygame.image.load('/assets/foo.png')` calls in the kid's
// game.py resolve. Without this, every selected sprite falls through
// to the compiler's try/except magenta placeholder — silent visual
// regression that's been live since the asset catalog landed.
//
// Used by `app/pages/play.tsx` (launcher) and the live-preview path.
// Same helper, same mount points, same path semantics.

import type { GameAsset } from '@lib/assets/types';
import { withBase } from '@lib/utils/base-url';

/**
 * Fetch each selected asset and write it into Pyodide's emscripten FS at
 * the same path string the compiler emits (`asset.path`, root-relative
 * like `/assets/vehicles/foo.png`). Idempotent — Pyodide's writeFile
 * overwrites silently, so re-running an already-mounted game is fine.
 *
 * Asset paths are root-relative (`/assets/foo.png`); we fetch through
 * `withBase()` so on a Pages subpath deploy the network request resolves
 * correctly.
 *
 * Each parent directory is mkdir'd ahead of writeFile because emscripten's
 * mkdir doesn't auto-create intermediates. A single parent failure is
 * non-fatal (the dir might already exist from a prior call); the asset
 * write itself is the load-bearing operation and propagates errors.
 */
export async function mountAssetsForGame(
  pyodide: PyodideInstance,
  assets: GameAsset[]
): Promise<void> {
  const fetchTasks = assets
    .filter((a) => a.path && a.path.startsWith('/'))
    .map(async (asset) => {
      const fetchUrl = withBase(asset.path);
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        // A missing asset shouldn't crash the whole boot — pygame's own
        // image.load will surface a runtime error if the FS path is
        // missing, and the compiler emits a try/except around each load
        // that swallows it into a magenta placeholder. Log so devs see
        // the regression without breaking the kid's play session.
        console.warn(`[asset-mount] skipping ${asset.path} — fetch failed (HTTP ${res.status})`);
        return;
      }
      const buf = new Uint8Array(await res.arrayBuffer());

      // mkdir each parent. Emscripten's mkdir throws on existing dirs,
      // and writeFile won't auto-create. Walk the path components.
      const parts = asset.path.split('/').filter(Boolean);
      const dirs = parts.slice(0, -1);
      let cumulative = '';
      for (const dir of dirs) {
        cumulative += `/${dir}`;
        try {
          pyodide.FS.mkdir(cumulative);
        } catch {
          // Already exists — emscripten throws ErrnoError(EEXIST=17).
          // No structured error type exposed across the boundary, so a
          // bare catch is the right shape here.
        }
      }

      pyodide.FS.writeFile(asset.path, buf);
    });

  await Promise.all(fetchTasks);
}
