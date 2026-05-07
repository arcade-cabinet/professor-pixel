import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiCallWithRetry,
  educationalRetry,
  fetchWithRetry,
  fileOperationWithRetry,
  pythonExecutionWithRetry,
  retryMechanism,
  useRetry,
  withRetry,
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

  it('with jitter enabled at lower bound (Math.random=0), delay = 50% of nominal', async () => {
    // Lower bound: Math.random=0 → jitter factor = 0.5 → delay = 50ms
    // for a nominal of 100ms. Advancing 49ms is not enough; 50ms is.
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
    await vi.advanceTimersByTimeAsync(49);
    expect(op).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    const result = await promise;
    expect(result.success).toBe(true);
    expect(randomSpy).toHaveBeenCalled();
  });

  it('with jitter enabled at upper bound (Math.random=1), delay = 100% of nominal', async () => {
    // Upper bound: Math.random=1 → jitter factor = 1.0 → delay =
    // full 100ms. Advancing 99ms is not enough; 100ms is. Pins the
    // [50%, 100%] contract from both ends so a refactor that breaks
    // the upper clamp would surface here.
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const op = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce('ok');

    const promise = retryMechanism.withRetry(op, {
      baseDelay: 100,
      jitter: true,
      maxAttempts: 2,
    });
    await vi.advanceTimersByTimeAsync(99);
    expect(op).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    const result = await promise;
    expect(result.success).toBe(true);
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
    // Intercept the thrown error via onRetry to confirm it carries
    // the HTTP status + statusText. This is the contract that lets
    // the retry mechanism classify 5xx as retryable — without status
    // attached, every HTTP failure would fall through to the "unknown
    // error" default-retry branch (which is also true, but for the
    // wrong reason and would mask a regression).
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('boom', { status: 503, statusText: 'Bad Gateway' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200, statusText: 'OK' }));
    vi.stubGlobal('fetch', fetchMock);

    const onRetry = vi.fn();
    const promise = retryMechanism.fetchWithRetry(
      'https://example.test/data',
      {},
      { jitter: false, baseDelay: 1, maxAttempts: 2, onRetry }
    );
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // The onRetry callback receives the actual thrown error from the
    // first attempt. Pin status + statusText on that error.
    expect(onRetry).toHaveBeenCalledTimes(1);
    const [firstErr] = onRetry.mock.calls[0] as [
      Error & { status?: number; statusText?: string },
      number,
    ];
    expect(firstErr).toBeInstanceOf(Error);
    expect(firstErr.status).toBe(503);
    expect(firstErr.statusText).toBe('Bad Gateway');
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

describe('useRetry hook', () => {
  // useRetry wraps retryMechanism.withRetry and tracks attempt-count +
  // error state in React state so components can render retry UI.
  // We exercise the hook with renderHook and act() — fake timers are
  // already configured in the suite-level beforeEach.

  it('initial state is idle (not retrying, count 0, canRetry true)', () => {
    const { result } = renderHook(() => useRetry(3));
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.lastError).toBeNull();
    expect(result.current.canRetry).toBe(true);
  });

  it('returns the operation result on first-try success and resets state', async () => {
    const { result } = renderHook(() => useRetry(3));
    const op = vi.fn().mockResolvedValue('ok');

    let resolved!: string;
    let pending!: Promise<string>;
    act(() => {
      pending = result.current.retry(op);
    });
    await vi.runAllTimersAsync();
    await act(async () => {
      resolved = await pending;
    });

    expect(resolved).toBe('ok');
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.lastError).toBeNull();
    expect(result.current.canRetry).toBe(true);
  });

  it('retries until success and resets state when it lands', async () => {
    const { result } = renderHook(() => useRetry(3));
    const op = vi
      .fn()
      .mockRejectedValueOnce(new Error('NetworkError: down'))
      .mockResolvedValueOnce('eventually');

    let resolved!: string;
    let pending!: Promise<string>;
    act(() => {
      pending = result.current.retry(op);
    });
    await vi.runAllTimersAsync();
    await act(async () => {
      resolved = await pending;
    });

    expect(resolved).toBe('eventually');
    expect(op).toHaveBeenCalledTimes(2);
    // After success, the retry resets state to idle.
    expect(result.current.retryCount).toBe(0);
  });

  it('throws + records final-failure state when retries exhaust', async () => {
    const { result } = renderHook(() => useRetry(2));
    const op = vi.fn().mockRejectedValue(new Error('NetworkError: persistent'));

    let pending!: Promise<unknown>;
    act(() => {
      // Catch on the promise chain itself so we never have an unhandled
      // rejection — even if act/timer ordering changes between vitest
      // versions, the catch handler will still own the error.
      pending = result.current.retry(op).catch((e) => e);
    });
    await vi.runAllTimersAsync();
    let caught: unknown;
    await act(async () => {
      caught = await pending;
    });

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/persistent/);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.canRetry).toBe(false);
    expect(result.current.lastError).toBe(caught);
  });

  it('reset() clears state back to idle', async () => {
    const { result } = renderHook(() => useRetry(1));
    const op = vi.fn().mockRejectedValue(new Error('NetworkError: fail'));

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.retry(op).catch((e) => e);
    });
    await vi.runAllTimersAsync();
    await act(async () => {
      await pending;
    });
    expect(result.current.canRetry).toBe(false);

    act(() => {
      result.current.reset();
    });
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.lastError).toBeNull();
    expect(result.current.canRetry).toBe(true);
  });
});
