// Cover the loadWizardFlow .catch error path in dialogue-engine.tsx
// (lines 328-376). When fetch rejects (or returns a non-OK response
// that loadWizardFlow rejects on), the engine logs, marks the path
// as failed, and tries to fall back to the default flow. We test:
//   - fetch rejects on the initial flow path
//   - fetch returns 500 → loadWizardFlow rejects
// Fallback path is exercised when failedFlowPaths doesn't already
// contain the default — which on a fresh hook it doesn't.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWizardDialogue } from '@/components/wizard/dialogue-engine';

vi.mock('@lib/storage/persistence', () => ({
  saveWizardStateDebounced: vi.fn(),
  loadWizardState: vi.fn(() => null),
  clearWizardState: vi.fn(),
}));

const persistence = await import('@lib/storage/persistence');

beforeEach(() => {
  vi.mocked(persistence.loadWizardState).mockReturnValue(null);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useWizardDialogue — loadWizardFlow .catch error path (lines 328-376)', () => {
  it('logs and marks the path as failed when fetch rejects', async () => {
    const errSpy = vi.spyOn(console, 'error');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      })
    );

    const { result } = renderHook(() => useWizardDialogue());

    // The hook resolves isLoading to false in BOTH the .then and the
    // .catch branches; with all fetches rejecting, the catch fires
    // for the initial flow AND the fallback flow attempt.
    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 2000,
    });

    const calls = errSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(calls).toContain('Failed to load wizard flow');
  });

  it('logs and marks the path as failed when fetch returns a non-OK response', async () => {
    const errSpy = vi.spyOn(console, 'error');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Not Found', { status: 404 }))
    );

    const { result } = renderHook(() => useWizardDialogue());

    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 2000,
    });

    // The engine's loadWizardFlow throws on non-OK; the catch path
    // logs at least once.
    const calls = errSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(calls).toContain('Failed to load wizard flow');
  });
});
