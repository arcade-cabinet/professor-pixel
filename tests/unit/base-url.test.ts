import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// base-url.ts captures BASE_URL at import time. To exercise the
// trailing-slash branch and the routerBase ternary, we dynamic-import
// the module after stubbing import.meta.env.BASE_URL so each test
// observes a different captured value.

describe('base-url — withBase()', () => {
  it('prefixes a root-relative path with the captured baseUrl', async () => {
    const { withBase, baseUrl } = await import('@lib/utils/base-url');
    // Default BASE_URL in jsdom is '/'.
    expect(baseUrl).toBe('/');
    expect(withBase('/assets/x.png')).toBe('/assets/x.png');
  });

  it('returns non-root-relative paths unchanged (no prefix)', async () => {
    const { withBase } = await import('@lib/utils/base-url');
    expect(withBase('assets/x.png')).toBe('assets/x.png');
    expect(withBase('https://cdn.example/x.png')).toBe('https://cdn.example/x.png');
    expect(withBase('')).toBe('');
  });
});

describe('base-url — captured BASE_URL variants', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('appends a trailing slash when BASE_URL lacks one', async () => {
    vi.stubEnv('BASE_URL', '/repo-name');
    const { baseUrl, routerBase, withBase } = await import('@lib/utils/base-url');
    expect(baseUrl).toBe('/repo-name/');
    // routerBase strips the trailing slash (wouter <Router base> wants no trailing /).
    expect(routerBase).toBe('/repo-name');
    expect(withBase('/x.png')).toBe('/repo-name/x.png');
  });

  it('keeps the trailing slash when BASE_URL already ends with one', async () => {
    vi.stubEnv('BASE_URL', '/repo-name/');
    const { baseUrl, routerBase } = await import('@lib/utils/base-url');
    expect(baseUrl).toBe('/repo-name/');
    expect(routerBase).toBe('/repo-name');
  });

  it('routerBase is empty string when BASE_URL is "/" (jsdom default)', async () => {
    vi.stubEnv('BASE_URL', '/');
    const { baseUrl, routerBase } = await import('@lib/utils/base-url');
    expect(baseUrl).toBe('/');
    expect(routerBase).toBe('');
  });

  it("falls back to '/' when import.meta.env.BASE_URL is undefined (line 4 || fallback)", async () => {
    // The capture line is `(typeof import.meta !== 'undefined' &&
    // import.meta.env?.BASE_URL) || '/'`. Stubbing BASE_URL to an empty
    // string triggers the `|| '/'` fallback (empty string is falsy under
    // ||) — exercising the cold path of the OR chain. Existing tests
    // always set BASE_URL to a truthy string, leaving this fallback arm
    // uncovered.
    vi.stubEnv('BASE_URL', '');
    const { baseUrl, routerBase } = await import('@lib/utils/base-url');
    expect(baseUrl).toBe('/');
    expect(routerBase).toBe('');
  });
});
