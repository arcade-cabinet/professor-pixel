// Pyodide OPFS cache — service worker.
//
// Intercepts requests to /pyodide/* and serves them from OPFS
// (Origin Private File System) when available, falling through to
// the network on a cache miss and writing the response back to OPFS
// for future requests.
//
// Why a service worker rather than overriding fetch in app code:
//   1. Pyodide's loadPyodide() issues fetch() calls itself for
//      .wasm/.zip/.json. We don't own those calls — they originate
//      from the worker that imports pyodide.mjs. A service worker is
//      the only spot that catches every request to /pyodide/*
//      regardless of who initiated it.
//   2. The 8.6MB pyodide.asm.wasm + 2.3MB python_stdlib.zip + 1MB
//      pyodide.asm.js add up to ~12MB. Re-downloading on every cold
//      start kills cold-start time on the Chromebooks kids run on.
//      OPFS gives us per-origin persistent storage that survives
//      tab close.
//   3. http-cache (Cache API) is a fine alternative but has weaker
//      eviction guarantees than OPFS on Chromium. OPFS quota is
//      requested under storage.persist() in the page; the SW just
//      reads/writes through navigator.storage.getDirectory().
//
// Versioning: the SW key includes PYODIDE_VERSION (matches the
// vendored copy). When the package bumps, the new key misses OPFS
// and re-fetches; old keyspace is purged on activate.

const PYODIDE_VERSION = '0.29.3';
const OPFS_DIR = `pyodide-cache-v${PYODIDE_VERSION}`;
const PYODIDE_PREFIX = '/pyodide/';

self.addEventListener('install', (event) => {
  // Skip waiting so a fresh SW activates immediately on first install
  // — no stale interceptor races against our fetch path.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clients claim ensures the page that registered us starts
      // routing through the SW without a reload.
      await self.clients.claim();
      // Purge any older pyodide-cache-* directories so a version bump
      // reclaims storage. Newer versions are skipped (forward-compat).
      try {
        const root = await navigator.storage.getDirectory();
        // @ts-ignore — values() is on FileSystemDirectoryHandle but TS
        // lib.dom doesn't yet ship the iterator types in older versions.
        for await (const entry of root.values()) {
          if (
            entry.kind === 'directory' &&
            entry.name.startsWith('pyodide-cache-v') &&
            entry.name !== OPFS_DIR
          ) {
            await root.removeEntry(entry.name, { recursive: true });
          }
        }
      } catch (_err) {
        // OPFS unavailable (Safari Lockdown Mode, private window in
        // some browsers). Cache will simply miss every time — the
        // network path still works.
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Only intercept same-origin /pyodide/* GETs. Range requests get
  // forwarded to the network because OPFS doesn't natively serve
  // partial responses and Pyodide's wasm streaming compile may
  // negotiate ranges; letting it through to the (origin) static
  // server is fine because the file lives there too.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(PYODIDE_PREFIX)) return;
  if (event.request.method !== 'GET') return;
  if (event.request.headers.get('range')) return;

  event.respondWith(handlePyodideRequest(event.request, url));
});

// Allowlist of file extensions Pyodide actually requests. Anything else
// passes through to the network without being cached. This is belt-and-
// suspenders security against a future Pyodide release fetching, e.g.,
// a .html crash report or a directory listing — neither belongs in our
// WASM/data cache. Defense in depth on top of the same-origin + flat-
// path checks above.
const ALLOWED_EXTENSIONS = new Set(['wasm', 'js', 'mjs', 'json', 'zip', 'data', 'whl']);

function isAllowedFile(fileName) {
  // Reject empty, traversal, and nested paths up front.
  if (!fileName || fileName.includes('..') || fileName.includes('/')) return false;
  // Reject filenames with no extension or weird control chars.
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0 || dot === fileName.length - 1) return false;
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) return false;
  const ext = fileName.slice(dot + 1).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

async function handlePyodideRequest(request, url) {
  const fileName = url.pathname.slice(PYODIDE_PREFIX.length);
  if (!isAllowedFile(fileName)) {
    // Pass through to network; don't read or write OPFS for paths we
    // don't recognize. Pyodide only fetches flat .wasm / .js / .mjs /
    // .json / .zip / .data files; anything else is either a bug or an
    // attack and we shouldn't persist it.
    return fetch(request);
  }

  // Try OPFS first.
  try {
    const cached = await readFromOpfs(fileName);
    if (cached) return cached;
  } catch (_err) {
    // OPFS read failed — fall through to network.
  }

  // Cache miss. Fetch, then mirror to OPFS in the background so the
  // response stream isn't blocked on the write.
  const networkResponse = await fetch(request);
  if (!networkResponse.ok) return networkResponse;

  // Belt-and-suspenders: only persist responses whose Content-Type
  // matches what we'd expect for the allowed extensions. A 2xx HTML
  // body served at /pyodide/foo.wasm (CDN misroute, captive portal
  // login page) would otherwise corrupt the cache.
  const ct = (networkResponse.headers.get('content-type') || '').toLowerCase();
  const expectedCt = guessContentType(fileName);
  const ctMatches =
    ct === expectedCt ||
    ct.startsWith(expectedCt) ||
    // Pyodide's CDN sometimes serves .wasm as application/octet-stream;
    // permit that too. We don't want to break the network path on a
    // strict mismatch — just refuse to cache.
    expectedCt === 'application/octet-stream';
  // Tee the response so we can both return one half to Pyodide and
  // drain the other into OPFS without consuming the body twice.
  const responseToReturn = networkResponse.clone();
  if (ctMatches) {
    writeToOpfs(fileName, networkResponse).catch(() => {
      // OPFS write failed (quota, Lockdown Mode). The next cold start
      // re-fetches; not fatal.
    });
  }
  return responseToReturn;
}

async function readFromOpfs(fileName) {
  const dir = await getOpfsDir();
  if (!dir) return null;
  // Defensive: a previous SW version (or an interrupted write before
  // the atomic-rename refactor) may have left a half-written file at
  // the canonical name. The atomic write below ensures new writes
  // never publish a partial file, but old caches need to be tolerated
  // — if anything looks off we drop and re-fetch instead of serving
  // truncated bytes that would crash WebAssembly.compileStreaming.
  let fileHandle;
  try {
    fileHandle = await dir.getFileHandle(fileName);
  } catch (_err) {
    return null; // Not in cache.
  }
  const file = await fileHandle.getFile();
  if (file.size === 0) {
    // Zero-byte sentinel = aborted write from an older SW. Evict.
    try {
      await dir.removeEntry(fileName);
    } catch (_err) {}
    return null;
  }
  // Re-derive Content-Type from the extension. We could store
  // headers as sidecar metadata but the only consumers are Pyodide's
  // fetch + WebAssembly.compileStreaming, both of which key off
  // Content-Type. The extensions are stable.
  const contentType = guessContentType(fileName);
  return new Response(file, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(file.size),
      'X-Cache': 'opfs-hit',
    },
  });
}

async function writeToOpfs(fileName, response) {
  const dir = await getOpfsDir();
  if (!dir) return;
  // Atomic write: stream the body into <fileName>.tmp, then once the
  // pipe completes successfully, swap the temp into place. A reader
  // that opens <fileName> mid-write either sees the previous version
  // or a NotFound; never a half-streamed truncated file. Without
  // this, an interrupted pipeTo (tab close, network drop) leaves a
  // partial file at the canonical name and the next cold start
  // serves it from OPFS with X-Cache: opfs-hit, crashing pyodide.
  const tmpName = `${fileName}.tmp`;
  // Clean up any stale .tmp from a prior interrupted write before
  // creating a fresh one.
  try {
    await dir.removeEntry(tmpName);
  } catch (_err) {}
  const tmpHandle = await dir.getFileHandle(tmpName, { create: true });
  const writable = await tmpHandle.createWritable();
  try {
    await response.body.pipeTo(writable);
  } catch (err) {
    // pipeTo rejected — writable is already aborted by spec. Make
    // sure no .tmp lingers to confuse the next write.
    try {
      await dir.removeEntry(tmpName);
    } catch (_e) {}
    throw err;
  }
  // pipeTo resolved → writable is closed and the bytes are flushed.
  // Now atomically promote tmp → fileName. Prefer move() (single
  // rename, no readers can observe an in-between state); fall back to
  // copy-then-delete on browsers that don't ship FileSystemFileHandle
  // .move() yet (Safari < 17.4).
  try {
    if (typeof tmpHandle.move === 'function') {
      await tmpHandle.move(fileName);
      return;
    }
  } catch (_err) {
    // move() not supported or failed — fall through to copy fallback.
  }
  const finalHandle = await dir.getFileHandle(fileName, { create: true });
  const finalWritable = await finalHandle.createWritable();
  const tmpFile = await tmpHandle.getFile();
  await finalWritable.write(tmpFile);
  await finalWritable.close();
  try {
    await dir.removeEntry(tmpName);
  } catch (_err) {}
}

async function getOpfsDir() {
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(OPFS_DIR, { create: true });
  } catch (_err) {
    return null;
  }
}

function guessContentType(fileName) {
  if (fileName.endsWith('.wasm')) return 'application/wasm';
  if (fileName.endsWith('.json')) return 'application/json';
  if (fileName.endsWith('.zip')) return 'application/zip';
  if (fileName.endsWith('.mjs') || fileName.endsWith('.js'))
    return 'application/javascript';
  return 'application/octet-stream';
}
