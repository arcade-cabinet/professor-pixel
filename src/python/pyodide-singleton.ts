/**
 * One Pyodide per page. All consumers — runner, pygame-preview, lesson page —
 * call `getPyodide()` and share a single bootstrap promise. The CDN script-tag
 * approach gets dropped in favor of a vendored `public/pyodide/` (see T2.3).
 */

const CDN_FALLBACK_URL = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/';

export class PyodideLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PyodideLoadError';
  }
}

let bootstrapPromise: Promise<PyodideInstance> | null = null;

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
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${scriptSrc}"]`,
    );
    if (existing) {
      if (window.loadPyodide) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new PyodideLoadError(`Failed to load ${scriptSrc}`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new PyodideLoadError(`Failed to load ${scriptSrc}`));
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
    throw new PyodideLoadError(
      'Pyodide loader script failed to attach to the page',
      { cause },
    );
  }

  if (!window.loadPyodide) {
    throw new PyodideLoadError(
      'Pyodide script loaded but window.loadPyodide is undefined',
    );
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
    bootstrapPromise = bootstrap(opts).catch((err) => {
      bootstrapPromise = null;
      throw err;
    });
  }
  return bootstrapPromise;
}

export function isPyodideReady(): boolean {
  return typeof window !== 'undefined' && Boolean(window.pyodide);
}

/** Test-only: drop the cached promise so the next call re-bootstraps. */
export function __resetPyodideForTests(): void {
  bootstrapPromise = null;
  if (typeof window !== 'undefined') {
    delete (window as Window).pyodide;
  }
}
