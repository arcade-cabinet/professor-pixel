import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';

// Stub the asset-catalog singleton at module load — its real-module
// constructor fires a fetch the moment it's imported, which in jsdom
// surfaces as an unhandled rejection that taints unrelated tests.
// All exporter tests in this file work with explicit asset arrays
// passed in, so a no-op getAssetById is sufficient.
vi.mock('@lib/assets/manager', () => ({
  assetManager: { getAssetById: () => undefined },
}));

import { exportProjectAsZip, shareOrDownload } from '@lib/pygame/runtime/exporter';
import type { GameAsset } from '@lib/assets/types';

function makeFetchStub(
  responses: Record<string, { ok: boolean; status?: number; body?: ArrayBuffer }>
) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const r = responses[url];
    if (!r) {
      return new Response('not found', { status: 404, statusText: 'Not Found' });
    }
    if (!r.ok) {
      return new Response(null, { status: r.status ?? 500 });
    }
    return new Response(r.body ?? new ArrayBuffer(0), { status: 200 });
  });
}

describe('exportProjectAsZip', () => {
  it('produces a zip containing game.py, index.html, README.md', async () => {
    const result = await exportProjectAsZip({
      selectedComponents: {},
      selectedAssets: [],
      title: 'Test Game',
      fetchImpl: makeFetchStub({}),
    });

    const zip = await JSZip.loadAsync(result.blob);
    expect(zip.file('game.py')).toBeTruthy();
    expect(zip.file('index.html')).toBeTruthy();
    expect(zip.file('README.md')).toBeTruthy();
  });

  it('embeds the title in index.html (escaped)', async () => {
    const result = await exportProjectAsZip({
      selectedComponents: {},
      selectedAssets: [],
      title: 'Sky <Quest> & Co',
      fetchImpl: makeFetchStub({}),
    });

    const zip = await JSZip.loadAsync(result.blob);
    const html = await zip.file('index.html')?.async('string');
    expect(html).toContain('Sky &lt;Quest&gt; &amp; Co');
    // Confirm raw injection didn't slip through.
    expect(html).not.toContain('<Quest>');
  });

  it('produces a SHARE-MODE bundle: no Pyodide, no loadPyodide, no PWA manifest', async () => {
    // The export is a one-way send-mode artifact (Drive/iCloud share).
    // The kid's authoritative game lives in the launcher's OPFS library;
    // this zip is for getting a copy to another person/device. So:
    //  - No <script src=".../pyodide.js"> tag (no CDN, no bundled runtime).
    //  - No loadPyodide() call in the HTML.
    //  - No manifest.webmanifest (PWA install only honored on https origins,
    //    not from a double-clicked file:// zip — would be theater).
    //  - No pyodide/ folder in the zip.
    const result = await exportProjectAsZip({
      selectedComponents: {},
      selectedAssets: [],
      title: 'Send-Mode Game',
      fetchImpl: makeFetchStub({}),
    });
    const zip = await JSZip.loadAsync(result.blob);
    const html = (await zip.file('index.html')?.async('string')) ?? '';
    expect(html).not.toMatch(/loadPyodide/);
    expect(html).not.toMatch(/pyodide\.js/);
    expect(html).not.toMatch(/cdn\.jsdelivr/);
    expect(html).not.toMatch(/<link rel="manifest"/);
    expect(zip.file('manifest.webmanifest')).toBeFalsy();
    // No pyodide/ folder either.
    for (const name of Object.keys(zip.files)) {
      expect(name).not.toMatch(/^pyodide\//);
    }
  });

  it('landing HTML directs the player to the launcher (no false runnable promise)', async () => {
    const result = await exportProjectAsZip({
      selectedComponents: {},
      selectedAssets: [],
      title: 'Landing Test',
      fetchImpl: makeFetchStub({}),
    });
    const zip = await JSZip.loadAsync(result.blob);
    const html = (await zip.file('index.html')?.async('string')) ?? '';
    // Mentions the launcher product by name so a kid landing here knows
    // where to play it.
    expect(html).toMatch(/Pixel's PyGame Palace/);
    // README explains both the launcher path AND the native-Python path
    // for kids who want to hand-run game.py.
    const readme = (await zip.file('README.md')?.async('string')) ?? '';
    expect(readme).toMatch(/My Games/);
    expect(readme).toMatch(/pygame-ce/);
  });

  it('uses the title to derive the zip filename (slugified)', async () => {
    const result = await exportProjectAsZip({
      selectedComponents: {},
      selectedAssets: [],
      title: 'My Cool Game!!',
      fetchImpl: makeFetchStub({}),
    });
    expect(result.filename).toBe('my-cool-game.zip');
  });

  it('falls back to my-game.zip when title slugifies to empty', async () => {
    const result = await exportProjectAsZip({
      selectedComponents: {},
      selectedAssets: [],
      title: '!!!',
      fetchImpl: makeFetchStub({}),
    });
    expect(result.filename).toBe('my-game.zip');
  });

  it('fetches each asset and includes it under assets/', async () => {
    const robotPng = new Uint8Array([1, 2, 3, 4]).buffer;
    const fetchStub = makeFetchStub({
      '/assets/robot.png': { ok: true, body: robotPng },
    });

    const assets: GameAsset[] = [
      {
        id: 'robot',
        name: 'Robot Hero',
        type: 'character',
        path: '/assets/robot.png',
      } as unknown as GameAsset,
    ];

    const result = await exportProjectAsZip({
      selectedComponents: {},
      selectedAssets: assets,
      fetchImpl: fetchStub,
    });

    const zip = await JSZip.loadAsync(result.blob);
    expect(zip.file('assets/robot.png')).toBeTruthy();
    expect(fetchStub).toHaveBeenCalledWith('/assets/robot.png');
  });

  it('sanitizes asset basenames against path-traversal characters', async () => {
    // Even though asset.path comes from our own catalog today, defense-in-depth:
    // a malformed path like ../../evil.png must not produce an entry that an
    // unzip tool could place outside the assets/ folder.
    const evilBuf = new Uint8Array([9]).buffer;
    const fetchStub = makeFetchStub({
      '/assets/../../evil.png': { ok: true, body: evilBuf },
    });

    const assets: GameAsset[] = [
      {
        id: 'evil',
        name: 'Evil',
        type: 'character',
        path: '/assets/../../evil.png',
      } as unknown as GameAsset,
    ];

    const result = await exportProjectAsZip({
      selectedComponents: {},
      selectedAssets: assets,
      fetchImpl: fetchStub,
    });

    const zip = await JSZip.loadAsync(result.blob);
    // basename split('/').pop() → 'evil.png' which is already safe; but the
    // sanitizer also handles cases like 'foo/../bar.png' that some pop()
    // edge-cases could leak. Verify no entry contains '..' or path separators.
    for (const name of Object.keys(zip.files)) {
      expect(name).not.toMatch(/\.\./);
    }
    // The sanitized file should still land under assets/.
    expect(zip.file('assets/evil.png')).toBeTruthy();
  });

  it('falls back to {asset.id}.bin when asset.path ends with a trailing slash (line 107)', async () => {
    // src.split('/').pop() returns '' (empty string, not undefined) when
    // the path ends with '/'. The `||` chain in exporter.ts:107 catches
    // that and falls back to `${asset.id}.bin`. Existing tests always
    // pass paths with a real basename so the right-hand fallback never
    // executes.
    const buf = new Uint8Array([7, 7, 7]).buffer;
    const fetchStub = makeFetchStub({
      '/assets/weird/': { ok: true, body: buf },
    });
    const assets: GameAsset[] = [
      {
        id: 'weird-id',
        name: 'Weird Path',
        type: 'character',
        path: '/assets/weird/',
      } as unknown as GameAsset,
    ];
    const result = await exportProjectAsZip({
      selectedComponents: {},
      selectedAssets: assets,
      fetchImpl: fetchStub,
    });
    const zip = await JSZip.loadAsync(result.blob);
    expect(zip.file('assets/weird-id.bin')).toBeTruthy();
  });

  it('falls back to asset.bin when sanitization reduces the basename to "" (line 108)', async () => {
    // The sanitizer maps anything outside [a-zA-Z0-9._-] to '_'. A
    // basename composed entirely of safe characters like '_' would still
    // remain non-empty, so we craft one whose chars are ALL replaced by
    // '_' AND whose pre-sanitization name is empty after pop. Easiest:
    // path ends with '/' AND id is also empty/falsy → `${asset.id ||
    // 'asset'}.bin` resolves to 'asset.bin' before sanitization runs;
    // sanitization sees 'asset.bin' (already safe). Different angle:
    // give a path with a basename that is a single ' ' (NUL), which
    // gets replaced to '_' (so non-empty post-sanitize). To hit the
    // line-108 fallback we need a basename of just '/' or empty after
    // sanitize — which only happens through the same trailing-slash
    // path. Given that, the line-108 fallback is effectively a
    // belt-and-suspenders against pop returning a value composed
    // entirely of separator characters that the regex collapses; we
    // reach it by giving an id that's an empty string AND a trailing
    // slash, which routes through line-107's `'asset'` fallback to
    // 'asset.bin' — already safe. The truly empty post-sanitize case
    // requires a basename of only invalid chars THAT regex collapses
    // to ''. The current regex replaces, doesn't drop, so a basename
    // of '????' becomes '____' (still non-empty). Net: line 108 is
    // belt-and-suspenders defensive code; assert the trailing-slash
    // empty-id case lands on the literal 'asset.bin'.
    const buf = new Uint8Array([1]).buffer;
    const fetchStub = makeFetchStub({
      '/assets/x/': { ok: true, body: buf },
    });
    const assets: GameAsset[] = [
      {
        id: '',
        name: 'Empty Id',
        type: 'character',
        path: '/assets/x/',
      } as unknown as GameAsset,
    ];
    const result = await exportProjectAsZip({
      selectedComponents: {},
      selectedAssets: assets,
      fetchImpl: fetchStub,
    });
    const zip = await JSZip.loadAsync(result.blob);
    // Empty id → line 107 routes to 'asset.bin'.
    expect(zip.file('assets/asset.bin')).toBeTruthy();
  });

  it('records failed assets in MISSING.txt without aborting the bundle', async () => {
    const fetchStub = makeFetchStub({
      '/assets/exists.png': { ok: true, body: new ArrayBuffer(2) },
      '/assets/broken.png': { ok: false, status: 404 },
    });

    const assets: GameAsset[] = [
      {
        id: 'a',
        name: 'OK',
        type: 'character',
        path: '/assets/exists.png',
      } as unknown as GameAsset,
      {
        id: 'b',
        name: 'Broken',
        type: 'character',
        path: '/assets/broken.png',
      } as unknown as GameAsset,
    ];

    const result = await exportProjectAsZip({
      selectedComponents: {},
      selectedAssets: assets,
      fetchImpl: fetchStub,
    });

    const zip = await JSZip.loadAsync(result.blob);
    expect(zip.file('assets/exists.png')).toBeTruthy();
    expect(zip.file('assets/broken.png')).toBeFalsy();
    const missing = await zip.file('assets/MISSING.txt')?.async('string');
    expect(missing).toContain('/assets/broken.png');
    expect(missing).toContain('HTTP 404');
  });
});

describe('shareOrDownload', () => {
  const exported = {
    blob: new Blob(['fake-zip-bytes'], { type: 'application/zip' }),
    filename: 'test.zip',
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses navigator.share when available + canShare returns true', async () => {
    const shareSpy = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', {
      share: shareSpy,
      canShare: vi.fn(() => true),
    });
    const action = await shareOrDownload(exported);
    expect(action).toBe('shared');
    expect(shareSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to download when navigator.canShare returns false', async () => {
    const shareSpy = vi.fn();
    vi.stubGlobal('navigator', {
      share: shareSpy,
      canShare: vi.fn(() => false),
    });
    // Stub URL.createObjectURL/revokeObjectURL since jsdom won't accept Blob
    // for createObjectURL in some configurations.
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    });
    const action = await shareOrDownload(exported);
    expect(action).toBe('downloaded');
    expect(shareSpy).not.toHaveBeenCalled();
  });

  it('falls back to download when navigator.share rejects (not AbortError)', async () => {
    const shareSpy = vi.fn(async () => {
      throw new Error('share unavailable');
    });
    vi.stubGlobal('navigator', {
      share: shareSpy,
      canShare: vi.fn(() => true),
    });
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    });
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const action = await shareOrDownload(exported);
    expect(action).toBe('downloaded');
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it('returns "cancelled" on AbortError without auto-downloading', async () => {
    // User explicitly dismissed the share sheet — re-pushing a download
    // would override their intent. Return 'cancelled' and let the caller
    // decide whether to offer a manual "save instead" affordance.
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    const shareSpy = vi.fn(async () => {
      throw abortErr;
    });
    const downloadSpy = vi.fn();
    vi.stubGlobal('navigator', {
      share: shareSpy,
      canShare: vi.fn(() => true),
    });
    // If triggerDownload were invoked it would call createObjectURL on the
    // global URL — failing this spy assertion catches the regression.
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: downloadSpy,
      revokeObjectURL: vi.fn(),
    });
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const action = await shareOrDownload(exported);
    expect(action).toBe('cancelled');
    expect(downloadSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it('skips canShare gate (defaults to true) when navigator.canShare is not a function (line 158)', async () => {
    // Older browsers (Firefox desktop, some Android WebViews) expose
    // navigator.share but not navigator.canShare. The ternary in
    // exporter.ts:158 falls back to `true` so the share path still
    // attempts. Existing tests always provide canShare as a function;
    // this case exercises the `: true` arm.
    const shareSpy = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', {
      share: shareSpy,
      // canShare deliberately omitted (typeof === 'undefined' !== 'function')
    });
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    });
    const action = await shareOrDownload(exported);
    expect(action).toBe('shared');
    expect(shareSpy).toHaveBeenCalled();
  });

  it('falls back to download silently on NotAllowedError (transient activation expired)', async () => {
    const notAllowedErr = new Error('user activation required');
    notAllowedErr.name = 'NotAllowedError';
    const shareSpy = vi.fn(async () => {
      throw notAllowedErr;
    });
    vi.stubGlobal('navigator', {
      share: shareSpy,
      canShare: vi.fn(() => true),
    });
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    });
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const action = await shareOrDownload(exported);
    expect(action).toBe('downloaded');
    // No warn for NotAllowedError — the kid didn't say "no", iOS Safari
    // just lost the user-activation token after the await.
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
});

describe('exportSavedProject (P4.17)', () => {
  it('throws when the project id does not resolve', async () => {
    // The integration paths (full snapshot → ZIP) are covered in the
    // exportProjectAsZip + shareOrDownload suites above. This test
    // pins the missing-project guardrail specific to the new helper.
    // Use vi.doMock + dynamic import so the storage mock applies only
    // for this test and doesn't bleed into other suites that rely on
    // the real persistence layer. Static imports of the same module
    // earlier in the file are unaffected by doMock — but the dynamic
    // re-import below re-binds against the mocked module graph.
    vi.resetModules();
    vi.doMock('@lib/storage/projects', () => ({
      loadWizardProject: vi.fn(async () => null),
    }));
    // Stub the asset manager too — its singleton bootstrap fires a
    // fetch on import in jsdom, surfacing as an unhandled rejection.
    vi.doMock('@lib/assets/manager', () => ({
      assetManager: { getAssetById: () => undefined },
    }));
    try {
      const { exportSavedProject } = await import('@lib/pygame/runtime/exporter');
      await expect(exportSavedProject('missing-id')).rejects.toThrow(/not found/i);
    } finally {
      vi.doUnmock('@lib/storage/projects');
      vi.doUnmock('@lib/assets/manager');
      vi.resetModules();
    }
  });
});
