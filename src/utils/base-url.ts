// Vite's BASE_URL resolved once at import time. `/` in dev and Capacitor;
// `/<repo>/` on GitHub Pages (set by cd.yml --base). The `import.meta` guard
// keeps jsdom test contexts working where `import.meta.env` is unset.
const RAW_BASE: string = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';

/** BASE_URL guaranteed to end with `/`. Use when concatenating sub-paths. */
export const baseUrl: string = RAW_BASE.endsWith('/') ? RAW_BASE : `${RAW_BASE}/`;

/** BASE_URL with trailing slash stripped. Use for wouter `<Router base>`. */
export const routerBase: string = baseUrl === '/' ? '' : baseUrl.slice(0, -1);

/** Resolve a root-relative path (`/assets/foo.png`) under BASE_URL. */
export function withBase(path: string): string {
  return path.startsWith('/') ? `${baseUrl}${path.slice(1)}` : path;
}
