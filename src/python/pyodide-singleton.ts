/**
 * One Pyodide per page. All consumers — runner, pygame-preview, lesson page —
 * call `getPyodide()` and share a single bootstrap promise. The CDN script-tag
 * approach gets dropped in favor of a vendored `public/pyodide/` (see T2.3).
 */

// Falls back to the CDN only if the vendored copy is missing — the version
// must match the `pyodide` package pinned in package.json (currently 0.29.3).
const CDN_FALLBACK_URL = 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/';

export class PyodideLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PyodideLoadError';
  }
}

let bootstrapPromise: Promise<PyodideInstance> | null = null;

/**
 * Cold-start budget (see docs/pillars/02-runtime.md):
 *   - <3000ms on a mid-tier laptop
 *   - <8000ms on a Chromebook
 *
 * Anything beyond `COLD_START_BUDGET_MS` warns to console; this is a leading
 * indicator (consult perf timeline before tuning). The budget is set against
 * the 95th-percentile observed in a fast-network dev session — if it consistently
 * trips on real users, the answer is precaching `python_stdlib.zip` or pre-warming
 * a worker on idle, not raising the budget.
 */
const COLD_START_BUDGET_MS = 8000;
let coldStartMs: number | null = null;

/** Returns the last observed cold-start duration, or null if Pyodide hasn't booted. */
export function getColdStartMs(): number | null {
  return coldStartMs;
}

interface BootstrapOptions {
  indexURL?: string;
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
}

function resolveIndexURL(): string {
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  // Vendored Pyodide lives under public/pyodide/ (see T2.3). Until the
  // postinstall ships it, fall back to the CDN.
  return `${baseUrl}/pyodide/`;
}

async function loadPyodideScript(scriptSrc: string): Promise<void> {
  if (typeof window !== 'undefined' && window.loadPyodide) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${scriptSrc}"]`);
    if (existing) {
      if (window.loadPyodide) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new PyodideLoadError(`Failed to load ${scriptSrc}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new PyodideLoadError(`Failed to load ${scriptSrc}`));
    document.head.appendChild(script);
  });
}

async function bootstrap(opts: BootstrapOptions): Promise<PyodideInstance> {
  if (typeof window === 'undefined') {
    throw new PyodideLoadError('Pyodide cannot be loaded outside the browser');
  }

  const indexURL = opts.indexURL ?? resolveIndexURL();
  // Probe the vendored copy first; fall back to the CDN if it 404s. The
  // probe stays cheap because the request is HEAD-style on a small loader file.
  let scriptSrc = `${indexURL}pyodide.js`;
  try {
    const probe = await fetch(scriptSrc, { method: 'HEAD' });
    if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
  } catch {
    scriptSrc = `${CDN_FALLBACK_URL}pyodide.js`;
  }

  try {
    await loadPyodideScript(scriptSrc);
  } catch (cause) {
    throw new PyodideLoadError('Pyodide loader script failed to attach to the page', { cause });
  }

  if (!window.loadPyodide) {
    throw new PyodideLoadError('Pyodide script loaded but window.loadPyodide is undefined');
  }

  try {
    const instance = await window.loadPyodide({
      indexURL: scriptSrc.startsWith(CDN_FALLBACK_URL) ? CDN_FALLBACK_URL : indexURL,
      stdout: opts.stdout,
      stderr: opts.stderr,
    });
    window.pyodide = instance;
    return instance;
  } catch (cause) {
    throw new PyodideLoadError('Pyodide initialization failed', { cause });
  }
}

export function getPyodide(opts: BootstrapOptions = {}): Promise<PyodideInstance> {
  if (!bootstrapPromise) {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    bootstrapPromise = bootstrap(opts)
      .then((instance) => {
        const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
        coldStartMs = end - start;
        if (coldStartMs > COLD_START_BUDGET_MS) {
          console.warn(
            `Pyodide cold-start ${Math.round(coldStartMs)}ms exceeds budget ${COLD_START_BUDGET_MS}ms`
          );
        } else {
          console.info(`Pyodide cold-start ${Math.round(coldStartMs)}ms`);
        }
        return instance;
      })
      .catch((err) => {
        bootstrapPromise = null;
        throw err;
      });
  }
  return bootstrapPromise;
}

export function isPyodideReady(): boolean {
  return typeof window !== 'undefined' && Boolean(window.pyodide);
}

/**
 * Pyodide state for diagnostics/HUD readouts. `loading` means a bootstrap
 * promise is in flight; `ready` means it resolved and `window.pyodide` is set.
 * `error` is sticky between catch and the next `getPyodide()` retry —
 * bootstrapPromise is cleared in the .catch handler, but coldStartMs stays
 * null since it's only set on success.
 */
export type PyodideState = 'uninitialized' | 'loading' | 'ready' | 'error';

export function getPyodideState(): PyodideState {
  if (isPyodideReady()) return 'ready';
  if (bootstrapPromise) return 'loading';
  // The HUD doesn't get a way to distinguish "never started" from "failed and
  // cleared" — both look the same after the catch handler nulls the promise.
  // That's fine: the HUD's job is to show current state, not history.
  return 'uninitialized';
}

/** Test-only: drop the cached promise so the next call re-bootstraps. */
export function __resetPyodideForTests(): void {
  bootstrapPromise = null;
  if (typeof window !== 'undefined') {
    delete (window as Window).pyodide;
  }
}
