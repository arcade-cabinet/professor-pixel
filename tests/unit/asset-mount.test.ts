// Unit tests for the Pyodide-FS asset mounter. The launcher (/play)
// calls this between `pyodide.loadPackage(['pygame-ce'])` and
// `runPythonAsync`, so a regression here means kid-saved games fall
// back to magenta-placeholder sprites silently.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mountAssetsForGame } from '@lib/python/asset-mount';
import type { GameAsset } from '@lib/assets/types';

interface MockFS {
  writeFile: ReturnType<typeof vi.fn>;
  mkdir: ReturnType<typeof vi.fn>;
}

interface MockPyodide {
  FS: MockFS;
}

function makeMockPyodide(opts: { mkdirThrowsExisting?: Set<string> } = {}): MockPyodide {
  const mkdirThrows = opts.mkdirThrowsExisting ?? new Set();
  return {
    FS: {
      writeFile: vi.fn(),
      mkdir: vi.fn((path: string) => {
        if (mkdirThrows.has(path)) {
          // Simulate emscripten ErrnoError(EEXIST) — the helper's
          // bare-catch contract requires it to swallow these.
          throw new Error(`ErrnoError: EEXIST: ${path}`);
        }
      }),
    },
  };
}

function makeAsset(path: string, id = path): GameAsset {
  return {
    id,
    name: id,
    description: id,
    type: 'sprite',
    path,
    tags: [],
    license: 'CC0',
    category: 'characters',
  } as GameAsset;
}

describe('mountAssetsForGame', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    // Stub BASE_URL to '/' so withBase is a no-op in test
    // (tests run with the default vite jsdom env which has BASE_URL=/).
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('writes each asset into emscripten FS at its catalog path', async () => {
    const buf = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic
    globalThis.fetch = vi.fn(
      () =>
        Promise.resolve(new Response(buf, { status: 200 })) as unknown as ReturnType<typeof fetch>
    ) as typeof fetch;

    const py = makeMockPyodide();
    const assets: GameAsset[] = [
      makeAsset('/assets/vehicles/foo.png'),
      makeAsset('/assets/characters/bar.png'),
    ];

    await mountAssetsForGame(py as unknown as PyodideInstance, assets);

    expect(py.FS.writeFile).toHaveBeenCalledTimes(2);
    expect(py.FS.writeFile).toHaveBeenCalledWith(
      '/assets/vehicles/foo.png',
      expect.any(Uint8Array)
    );
    expect(py.FS.writeFile).toHaveBeenCalledWith(
      '/assets/characters/bar.png',
      expect.any(Uint8Array)
    );
  });

  it('mkdir each parent directory before writeFile', async () => {
    globalThis.fetch = vi.fn(
      () =>
        Promise.resolve(
          new Response(new Uint8Array([1, 2, 3]), { status: 200 })
        ) as unknown as ReturnType<typeof fetch>
    ) as typeof fetch;

    const py = makeMockPyodide();
    await mountAssetsForGame(py as unknown as PyodideInstance, [
      makeAsset('/assets/vehicles/foo.png'),
    ]);

    expect(py.FS.mkdir).toHaveBeenCalledWith('/assets');
    expect(py.FS.mkdir).toHaveBeenCalledWith('/assets/vehicles');
  });

  it('swallows mkdir errors on existing directories (idempotent)', async () => {
    globalThis.fetch = vi.fn(
      () =>
        Promise.resolve(
          new Response(new Uint8Array([1, 2]), { status: 200 })
        ) as unknown as ReturnType<typeof fetch>
    ) as typeof fetch;

    const py = makeMockPyodide({
      mkdirThrowsExisting: new Set(['/assets', '/assets/vehicles']),
    });
    // Should NOT throw despite both mkdir calls failing.
    await expect(
      mountAssetsForGame(py as unknown as PyodideInstance, [makeAsset('/assets/vehicles/foo.png')])
    ).resolves.toBeUndefined();
    expect(py.FS.writeFile).toHaveBeenCalledTimes(1);
  });

  it('skips assets with non-root-relative paths (data URLs, http://)', async () => {
    const fetchSpy = vi.fn(
      () =>
        Promise.resolve(
          new Response(new Uint8Array([1]), { status: 200 })
        ) as unknown as ReturnType<typeof fetch>
    ) as typeof fetch;
    globalThis.fetch = fetchSpy;

    const py = makeMockPyodide();
    await mountAssetsForGame(py as unknown as PyodideInstance, [
      makeAsset('data:image/png;base64,iVBOR...'),
      makeAsset('https://example.com/foo.png'),
    ]);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(py.FS.writeFile).not.toHaveBeenCalled();
  });

  it('logs and skips on fetch failure rather than crashing the boot', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = vi.fn(
      () =>
        Promise.resolve(new Response('not found', { status: 404 })) as unknown as ReturnType<
          typeof fetch
        >
    ) as typeof fetch;

    const py = makeMockPyodide();
    await expect(
      mountAssetsForGame(py as unknown as PyodideInstance, [makeAsset('/assets/missing.png')])
    ).resolves.toBeUndefined();

    expect(py.FS.writeFile).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('skipping /assets/missing.png'));
    warnSpy.mockRestore();
  });

  it('handles an empty asset list cleanly', async () => {
    const py = makeMockPyodide();
    await expect(mountAssetsForGame(py as unknown as PyodideInstance, [])).resolves.toBeUndefined();
    expect(py.FS.writeFile).not.toHaveBeenCalled();
  });
});
