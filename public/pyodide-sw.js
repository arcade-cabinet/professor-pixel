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

async function handlePyodideRequest(request, url) {
  const fileName = url.pathname.slice(PYODIDE_PREFIX.length);
  if (!fileName || fileName.includes('..') || fileName.includes('/')) {
    // Defensive: don't pull arbitrary paths into OPFS. Pyodide only
    // requests flat files (pyodide.asm.wasm, python_stdlib.zip, etc).
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

  // Tee the response so we can both return one half to Pyodide and
  // drain the other into OPFS without consuming the body twice.
  const responseToReturn = networkResponse.clone();
  writeToOpfs(fileName, networkResponse).catch(() => {
    // OPFS write failed (quota, Lockdown Mode). The next cold start
    // re-fetches; not fatal.
  });
  return responseToReturn;
}

async function readFromOpfs(fileName) {
  const dir = await getOpfsDir();
  if (!dir) return null;
  let fileHandle;
  try {
    fileHandle = await dir.getFileHandle(fileName);
  } catch (_err) {
    return null; // Not in cache.
  }
  const file = await fileHandle.getFile();
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
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  // Stream straight from the network response body into OPFS.
  await response.body.pipeTo(writable);
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
