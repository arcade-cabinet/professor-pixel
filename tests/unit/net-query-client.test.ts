import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, getQueryFn } from '@lib/net/query-client';

// Captures every fetch call so tests can assert URL/method/body shape
// without coupling to vi.fn().mock.calls' verbose tuple style.
let lastFetchInput: RequestInfo | URL | undefined;
let lastFetchInit: RequestInit | undefined;

function makeResponse(opts: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  body?: unknown;
  bodyText?: string;
}): Response {
  // Minimal Response shape — the implementation only reads .ok, .status,
  // .statusText, .text(), .json(). A real Response would work but
  // constructing one in jsdom requires a Headers polyfill matrix that
  // is more brittle than this synthetic.
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    statusText: opts.statusText ?? '',
    text: async () => opts.bodyText ?? '',
    // Explicit `'body' in opts` so a test can pass `body: null` and
    // observe the implementation handle it — `??` would coerce null
    // to the `{}` fallback and hide a real bug.
    json: async () => ('body' in opts ? opts.body : {}),
  } as unknown as Response;
}

function stubFetchResolves(response: Response) {
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    lastFetchInput = input;
    lastFetchInit = init;
    return Promise.resolve(response);
  });
}

beforeEach(() => {
  lastFetchInput = undefined;
  lastFetchInit = undefined;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Helper: build the context arg react-query 5 passes to a queryFn.
// The runtime impl only reads `queryKey`; cast through unknown so the
// stricter context shape (which requires a real QueryClient) doesn't
// force us to allocate one in unit tests.
function makeCtx(queryKey: readonly unknown[]) {
  return {
    queryKey,
    signal: new AbortController().signal,
    meta: undefined,
  } as unknown as Parameters<ReturnType<typeof getQueryFn>>[0];
}

describe('apiRequest', () => {
  it('makes a GET request without body and credentials: "include"', async () => {
    stubFetchResolves(makeResponse({ ok: true, status: 200 }));

    await apiRequest('GET', '/api/users');

    expect(lastFetchInput).toBe('/api/users');
    expect(lastFetchInit?.method).toBe('GET');
    expect(lastFetchInit?.credentials).toBe('include');
    // Semantic: no Content-Type header (avoids brittle exact-shape
    // assertion that would break if the implementation switched to
    // a Headers instance or added other headers).
    const headers = (lastFetchInit?.headers ?? {}) as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
    expect(lastFetchInit?.body).toBeUndefined();
  });

  it('serializes body to JSON and sets Content-Type when data is provided', async () => {
    stubFetchResolves(makeResponse({ ok: true, status: 201 }));

    const data = { name: 'Alice', age: 30 };
    await apiRequest('POST', '/api/users', data);

    expect(lastFetchInit?.method).toBe('POST');
    expect(lastFetchInit?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(lastFetchInit?.body).toBe(JSON.stringify(data));
  });

  it('returns the Response object on 2xx', async () => {
    const response = makeResponse({ ok: true, status: 200, body: { hello: 'world' } });
    stubFetchResolves(response);

    const result = await apiRequest('GET', '/api/health');
    expect(result).toBe(response);
  });

  it('throws "<status>: <text>" on a non-OK response with body text', async () => {
    stubFetchResolves(
      makeResponse({ ok: false, status: 500, statusText: 'Server Error', bodyText: 'oops' })
    );

    await expect(apiRequest('GET', '/api/broken')).rejects.toThrow('500: oops');
  });

  it('falls back to statusText when the body is empty', async () => {
    stubFetchResolves(
      makeResponse({ ok: false, status: 404, statusText: 'Not Found', bodyText: '' })
    );

    await expect(apiRequest('GET', '/api/missing')).rejects.toThrow('404: Not Found');
  });

  it('omits body when data is undefined', async () => {
    // Only `undefined` (intentionally absent) skips body serialization.
    // The implementation uses `data !== undefined` rather than a
    // truthy check so primitive payloads (`''`, `0`, `false`, `null`)
    // are correctly serialized — they're valid JSON.
    stubFetchResolves(makeResponse({ ok: true, status: 200 }));

    await apiRequest('POST', '/api/empty', undefined);

    expect(lastFetchInit?.body).toBeUndefined();
    const headers = (lastFetchInit?.headers ?? {}) as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it.each([
    { label: 'empty string', value: '', serialized: '""' },
    { label: 'zero', value: 0, serialized: '0' },
    { label: 'false', value: false, serialized: 'false' },
    { label: 'null', value: null, serialized: 'null' },
  ])('serializes primitive payload ($label) — JSON.stringify is canonical', async ({
    value,
    serialized,
  }) => {
    // Pin each primitive branch: the bodies that the previous
    // truthy-check accidentally dropped. Found by CodeRabbit on PR
    // #71 — endpoints that expect a primitive body would silently
    // receive nothing.
    stubFetchResolves(makeResponse({ ok: true, status: 200 }));

    await apiRequest('POST', '/api/primitive', value);

    expect(lastFetchInit?.body).toBe(serialized);
    expect(lastFetchInit?.headers).toEqual({ 'Content-Type': 'application/json' });
  });
});

describe('getQueryFn', () => {
  it('joins queryKey with "/" to form the URL', async () => {
    stubFetchResolves(makeResponse({ ok: true, status: 200, body: { users: [] } }));

    const fn = getQueryFn<{ users: unknown[] }>({ on401: 'throw' });
    await fn(makeCtx(['/api', 'users', 'list']));

    expect(lastFetchInput).toBe('/api/users/list');
    expect(lastFetchInit?.credentials).toBe('include');
  });

  it('parses 2xx JSON response and returns it', async () => {
    const body = { id: 'u1', name: 'Bob' };
    stubFetchResolves(makeResponse({ ok: true, status: 200, body }));

    const fn = getQueryFn<typeof body>({ on401: 'throw' });
    const result = await fn(makeCtx(['/api', 'user']));

    expect(result).toEqual(body);
  });

  it('returns null on 401 when on401="returnNull"', async () => {
    stubFetchResolves(makeResponse({ ok: false, status: 401, statusText: 'Unauthorized' }));

    const fn = getQueryFn<unknown>({ on401: 'returnNull' });
    const result = await fn(makeCtx(['/api', 'me']));

    expect(result).toBeNull();
  });

  it('throws on 401 when on401="throw"', async () => {
    stubFetchResolves(
      makeResponse({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        bodyText: 'login required',
      })
    );

    const fn = getQueryFn<unknown>({ on401: 'throw' });
    await expect(fn(makeCtx(['/api', 'me']))).rejects.toThrow('401: login required');
  });

  it('throws on non-401 errors regardless of on401 setting', async () => {
    stubFetchResolves(
      makeResponse({ ok: false, status: 500, statusText: 'Server Error', bodyText: 'down' })
    );

    const fn = getQueryFn<unknown>({ on401: 'returnNull' });
    await expect(fn(makeCtx(['/api', 'broken']))).rejects.toThrow('500: down');
  });
});
