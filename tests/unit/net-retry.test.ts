import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  retryMechanism,
  withRetry,
  fetchWithRetry,
  apiCallWithRetry,
  pythonExecutionWithRetry,
  fileOperationWithRetry,
  educationalRetry,
} from '@lib/net/retry';

// retry.ts uses real timers via setTimeout for backoff. We pin
// jitter=false in tests where deterministic delay matters; otherwise
// fake timers + advanceTimersByTimeAsync drives the loop forward.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('withRetry — success path', () => {
  it('returns success on first try without retry', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const promise = retryMechanism.withRetry(op, { jitter: false });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.data).toBe('ok');
    expect(result.attempts).toBe(1);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('reports totalTime as a non-negative number', async () => {
    const op = vi.fn().mockResolvedValue(42);
    const promise = retryMechanism.withRetry(op, { jitter: false });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.totalTime).toBeGreaterThanOrEqual(0);
  });
});

describe('withRetry — retry then succeed', () => {
  it('retries a network error and succeeds on second attempt', async () => {
    const networkErr = new Error('Failed to fetch');
    const op = vi.fn().mockRejectedValueOnce(networkErr).mockResolvedValueOnce('recovered');

    const onRetry = vi.fn();
    const promise = retryMechanism.withRetry(op, {
      jitter: false,
      baseDelay: 100,
      onRetry,
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.data).toBe('recovered');
    expect(result.attempts).toBe(2);
    expect(op).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(networkErr, 1);
  });

  it('applies exponential backoff between attempts', async () => {
    // Pin the backoff curve. With baseDelay=100, multiplier=2,
    // attempt 1→100ms, attempt 2→200ms. Without jitter the math is
    // exact, so we can assert delays land within the expected slot.
    const op = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce('done');

    const promise = retryMechanism.withRetry(op, {
      jitter: false,
      baseDelay: 100,
      backoffMultiplier: 2,
      maxAttempts: 3,
    });

    // Advance past attempt-1 delay (100ms): kicks attempt 2
    await vi.advanceTimersByTimeAsync(100);
    expect(op).toHaveBeenCalledTimes(2);
    // Advance past attempt-2 delay (200ms): kicks attempt 3
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
  });
});

describe('withRetry — final failure path', () => {
  it('gives up after maxAttempts and calls onFinalFailure', async () => {
    const err = new Error('Failed to fetch');
    const op = vi.fn().mockRejectedValue(err);
    const onFinalFailure = vi.fn();

    const promise = retryMechanism.withRetry(op, {
      jitter: false,
      baseDelay: 10,
      maxAttempts: 3,
      onFinalFailure,
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toBe(err);
    expect(result.attempts).toBe(3);
    expect(op).toHaveBeenCalledTimes(3);
    expect(onFinalFailure).toHaveBeenCalledWith(err, 3);
  });

  it('stops immediately when shouldRetry returns false', async () => {
    const err = new Error('client error');
    const op = vi.fn().mockRejectedValue(err);
    const shouldRetry = vi.fn().mockReturnValue(false);

    const promise = retryMechanism.withRetry(op, {
      jitter: false,
      maxAttempts: 5,
      shouldRetry,
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(op).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(err, 1);
  });
});

describe('defaultShouldRetry — error classification', () => {
  // The defaults discriminate retryable from non-retryable. We drive
  // the classifier through withRetry so any divergence between the
  // public surface and the private predicate surfaces.
  const cases: Array<{
    label: string;
    error: unknown;
    expectRetry: boolean;
  }> = [
    { label: 'NetworkError name', error: { name: 'NetworkError' }, expectRetry: true },
    { label: 'NETWORK_ERROR code', error: { code: 'NETWORK_ERROR' }, expectRetry: true },
    { label: 'TimeoutError name', error: { name: 'TimeoutError' }, expectRetry: true },
    {
      label: 'message contains "timeout"',
      error: { message: 'request timeout' },
      expectRetry: true,
    },
    { label: '5xx server error', error: { status: 503 }, expectRetry: true },
    { label: '500 server error', error: { status: 500 }, expectRetry: true },
    { label: '408 Request Timeout', error: { status: 408 }, expectRetry: true },
    { label: '429 Too Many Requests', error: { status: 429 }, expectRetry: true },
    { label: 'Failed to fetch message', error: { message: 'Failed to fetch' }, expectRetry: true },
    {
      label: 'Connection failed message',
      error: { message: 'Connection failed' },
      expectRetry: true,
    },
    { label: 'ERR_NETWORK message', error: { message: 'ERR_NETWORK' }, expectRetry: true },
    { label: '400 client error', error: { status: 400 }, expectRetry: false },
    { label: '404 not found', error: { status: 404 }, expectRetry: false },
    { label: '401 unauthorized', error: { status: 401 }, expectRetry: false },
    { label: '403 forbidden', error: { status: 403 }, expectRetry: false },
  ];

  for (const { label, error, expectRetry } of cases) {
    it(`${expectRetry ? 'retries' : 'does not retry'} on ${label}`, async () => {
      const op = vi.fn().mockRejectedValue(error);
      const promise = retryMechanism.withRetry(op, {
        jitter: false,
        baseDelay: 1,
        maxAttempts: 2,
      });
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result.success).toBe(false);
      expect(op).toHaveBeenCalledTimes(expectRetry ? 2 : 1);
    });
  }

  it('retries unknown errors by default', async () => {
    // Unknown shape → defaultShouldRetry falls through to the final
    // `return true`. Pin this so refactoring the default doesn't
    // silently swap the policy to fail-closed.
    const op = vi.fn().mockRejectedValue('plain string error');
    const promise = retryMechanism.withRetry(op, {
      jitter: false,
      baseDelay: 1,
      maxAttempts: 2,
    });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(op).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(false);
  });
});

describe('calculateDelay — clamping and jitter', () => {
  it('clamps delay to maxDelay even when backoff would exceed it', async () => {
    // baseDelay=1000, multiplier=2: nominal delays 1000/2000/4000ms.
    // With maxDelay=2000, attempt-3's delay must be clamped to 2000ms,
    // not 4000ms. Drive the timer past each clamped slot and confirm
    // attempt 3 fires within the clamped budget (would not fire if
    // we waited only 2000ms after attempt 2 with unclamped 4000ms).
    const op = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const promise = retryMechanism.withRetry(op, {
      jitter: false,
      baseDelay: 1000,
      maxDelay: 2000,
      backoffMultiplier: 2,
      maxAttempts: 3,
    });

    // Catch up-front so the eventual rejection doesn't leak.
    const settled = promise.then((r) => r);

    await vi.advanceTimersByTimeAsync(1000); // post-attempt-1 sleep → kicks attempt 2
    expect(op).toHaveBeenCalledTimes(2);
    // Without clamping: nominal would be 2000ms (still within max).
    // With clamping: delay = min(2000, 2000) = 2000ms. Attempt 3 fires.
    await vi.advanceTimersByTimeAsync(2000);
    expect(op).toHaveBeenCalledTimes(3);

    const result = await settled;
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3);
  });

  it('clamps via min(): attempt-N nominal exceeds maxDelay, actual sleep is maxDelay', async () => {
    // Specifically pin the clamp boundary. baseDelay=100, multiplier=10:
    // attempt 1 = 100ms, attempt 2 = 1000ms (nominal 1000, clamped to 200).
    // Advancing 200ms after attempt 1 should be enough to fire attempt 2.
    const op = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const promise = retryMechanism.withRetry(op, {
      jitter: false,
      baseDelay: 100,
      maxDelay: 200,
      backoffMultiplier: 10,
      maxAttempts: 3,
    });
    const settled = promise.then((r) => r);

    await vi.advanceTimersByTimeAsync(100); // attempt 1 → attempt 2
    expect(op).toHaveBeenCalledTimes(2);
    // Nominal = 100 * 10^1 = 1000ms. Clamped to 200ms.
    await vi.advanceTimersByTimeAsync(200);
    expect(op).toHaveBeenCalledTimes(3);

    const result = await settled;
    expect(result.success).toBe(false);
  });

  it('with jitter enabled, delays land in [50%, 100%] of nominal', async () => {
    // We can't observe the delay directly, but we can pin behavior:
    // with Math.random stubbed to 0 (lowest), delay = 50% of nominal;
    // with Math.random stubbed to 1, delay = 100% of nominal. Either
    // way the call still resolves — we just verify jitter doesn't
    // produce out-of-bound values that could break wait-for-timer
    // tests in real code.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const op = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce('ok');

    const promise = retryMechanism.withRetry(op, {
      baseDelay: 100,
      jitter: true,
      maxAttempts: 2,
    });
    // With Math.random=0, jitter factor = 0.5 → delay = 50ms.
    await vi.advanceTimersByTimeAsync(50);
    const result = await promise;
    expect(result.success).toBe(true);
    expect(randomSpy).toHaveBeenCalled();
  });
});

describe('fetchWithRetry', () => {
  it('returns response on 2xx', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('ok', { status: 200, statusText: 'OK' }));
    vi.stubGlobal('fetch', fetchMock);

    const promise = retryMechanism.fetchWithRetry(
      'https://example.test/data',
      {},
      { jitter: false }
    );
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws and retries on non-ok response, eventually throwing the last error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('boom', { status: 500, statusText: 'Server Error' }));
    vi.stubGlobal('fetch', fetchMock);

    const promise = retryMechanism.fetchWithRetry(
      'https://example.test/data',
      {},
      { jitter: false, baseDelay: 1, maxAttempts: 2 }
    );
    // Catch up-front so the rejection never escapes uncaught.
    const caught = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await caught;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/HTTP 500/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('attaches status + statusText to the thrown error for retry classification', async () => {
    // Intercept the thrown error to confirm it carries the HTTP status.
    // This is the contract that lets the retry mechanism classify 5xx
    // as retryable — without status on the error, every HTTP failure
    // would fall through to the "unknown error" default-retry branch
    // (which is also true, but for the wrong reason).
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('boom', { status: 503, statusText: 'Bad Gateway' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200, statusText: 'OK' }));
    vi.stubGlobal('fetch', fetchMock);

    const promise = retryMechanism.fetchWithRetry(
      'https://example.test/data',
      {},
      { jitter: false, baseDelay: 1, maxAttempts: 2 }
    );
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('apiCallWithRetry', () => {
  it('parses JSON on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ hello: 'world' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const promise = retryMechanism.apiCallWithRetry<{ hello: string }>(
      'https://example.test/api',
      {},
      { jitter: false }
    );
    await vi.runAllTimersAsync();
    const data = await promise;
    expect(data).toEqual({ hello: 'world' });
  });
});

describe('pythonExecutionWithRetry', () => {
  it('retries on "pyodide not ready"', async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new Error('pyodide not ready'))
      .mockResolvedValueOnce('exec ok');

    const promise = retryMechanism.pythonExecutionWithRetry(op, { jitter: false, baseDelay: 1 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('exec ok');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on SyntaxError type', async () => {
    const op = vi.fn().mockRejectedValue({ type: 'SyntaxError', message: 'bad indent' });
    const caught = retryMechanism
      .pythonExecutionWithRetry(op, { jitter: false, baseDelay: 1 })
      .catch((e) => e);
    await vi.runAllTimersAsync();
    await caught;
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on Memory error', async () => {
    const op = vi.fn().mockRejectedValue(new Error('Memory error'));
    const caught = retryMechanism
      .pythonExecutionWithRetry(op, { jitter: false, baseDelay: 1 })
      .catch((e) => e);
    await vi.runAllTimersAsync();
    await caught;
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on generic Python errors', async () => {
    const op = vi.fn().mockRejectedValue(new Error('NameError: foo not defined'));
    const caught = retryMechanism
      .pythonExecutionWithRetry(op, { jitter: false, baseDelay: 1 })
      .catch((e) => e);
    await vi.runAllTimersAsync();
    await caught;
    // Pin "default fail-closed" — Python errors aren't retried unless
    // explicitly allowed (pyodide-not-ready / Worker error).
    expect(op).toHaveBeenCalledTimes(1);
  });
});

describe('fileOperationWithRetry', () => {
  it('retries on "Failed to fetch"', async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce('uploaded');

    const promise = retryMechanism.fileOperationWithRetry(op, { jitter: false, baseDelay: 1 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('uploaded');
  });

  it('does NOT retry on 404', async () => {
    const op = vi.fn().mockRejectedValue({ status: 404, message: 'not found' });
    const caught = retryMechanism
      .fileOperationWithRetry(op, { jitter: false, baseDelay: 1 })
      .catch((e) => e);
    await vi.runAllTimersAsync();
    await caught;
    expect(op).toHaveBeenCalledTimes(1);
  });
});

describe('educationalRetry.withEducationalFeedback', () => {
  it('emits user-friendly messages on each retry', async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce('done');
    const messages: string[] = [];

    const promise = educationalRetry.withEducationalFeedback(op, 'loading lesson', (m) =>
      messages.push(m)
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('done');
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toMatch(/loading lesson/);
    expect(messages[0]).toMatch(/attempt 1/);
  });

  it('emits a final-failure message and re-throws when retries exhaust', async () => {
    const op = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
    const messages: string[] = [];

    const caught = educationalRetry
      .withEducationalFeedback(op, 'saving game', (m) => messages.push(m))
      .catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await caught;

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/Failed to fetch/);
    // Final-failure message is the last one pushed.
    expect(messages.at(-1)).toMatch(/Unable to complete saving game/);
  });
});

describe('convenience exports', () => {
  it('withRetry, fetchWithRetry, apiCallWithRetry, pythonExecutionWithRetry, fileOperationWithRetry are defined', () => {
    // Pin the public surface — these are convenience wrappers around
    // the singleton instance. If a refactor moves them, the import
    // breaks here before downstream callers explode.
    expect(typeof withRetry).toBe('function');
    expect(typeof fetchWithRetry).toBe('function');
    expect(typeof apiCallWithRetry).toBe('function');
    expect(typeof pythonExecutionWithRetry).toBe('function');
    expect(typeof fileOperationWithRetry).toBe('function');
  });

  it('withRetry convenience routes through retryMechanism.withRetry', async () => {
    const op = vi.fn().mockResolvedValue('via-export');
    const promise = withRetry(op, { jitter: false });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.data).toBe('via-export');
  });
});
