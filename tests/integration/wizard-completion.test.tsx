import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWizardDialogue } from '@/components/wizard/dialogue-engine';
import type { WizardNode } from '@lib/wizard/types';

vi.mock('@lib/storage/persistence', () => ({
  saveWizardStateDebounced: vi.fn(),
  loadWizardState: vi.fn(() => null),
  clearWizardState: vi.fn(),
}));

const persistence = await import('@lib/storage/persistence');

function makeFlow(nodes: Record<string, Partial<WizardNode>>): Record<string, WizardNode> {
  const out: Record<string, WizardNode> = {};
  for (const [id, partial] of Object.entries(nodes)) {
    out[id] = { id, text: partial.text ?? '', ...partial } as WizardNode;
  }
  return out;
}

// A flow that ends in two distinct terminal shapes so the test can drive
// each path: a node with action: 'compileFullGame', and a leaf node with no
// options/multiStep. Both should mark the wizard complete (P1.1 contract).
const flow = makeFlow({
  start: {
    text: 'Pick a path',
    options: [
      { text: 'Go to compile node', next: 'compile' },
      { text: 'Go to leaf node', next: 'leaf' },
    ],
  },
  compile: {
    text: 'Your game is ready!',
    action: 'compileFullGame',
    // Has options too, but action takes precedence per P1.1.
    options: [{ text: 'Restart', next: 'start' }],
  },
  leaf: {
    text: 'Goodbye',
    // No options, no multiStep — terminal by structure.
  },
});

describe('wizard completion derived state (P1.1)', () => {
  beforeEach(() => {
    vi.mocked(persistence.loadWizardState).mockReturnValue(null);
    vi.mocked(persistence.saveWizardStateDebounced).mockClear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(flow), { status: 200 }))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('isWizardComplete is false on the start node (active dialogue)', async () => {
    const { result } = renderHook(() => useWizardDialogue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.dialogueState.currentNodeId).toBe('start');
    expect(result.current.isWizardComplete).toBe(false);
  });

  it('isWizardComplete is true on a node with action: compileFullGame', async () => {
    const { result } = renderHook(() => useWizardDialogue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.handleOptionSelect({ text: 'Go to compile node', next: 'compile' });
    });
    await waitFor(() => expect(result.current.dialogueState.currentNodeId).toBe('compile'));

    expect(result.current.isWizardComplete).toBe(true);
  });

  it('isWizardComplete is true on a leaf node (no options, no multiStep)', async () => {
    const { result } = renderHook(() => useWizardDialogue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.handleOptionSelect({ text: 'Go to leaf node', next: 'leaf' });
    });
    await waitFor(() => expect(result.current.dialogueState.currentNodeId).toBe('leaf'));

    expect(result.current.isWizardComplete).toBe(true);
  });

  it('isWizardComplete is false during initial load (isLoading true)', () => {
    // No fetch resolution yet — isLoading stays true; isWizardComplete should
    // be false to prevent flashing the CTA before the flow even loads.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {}))
    ); // never resolves
    const { result } = renderHook(() => useWizardDialogue());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isWizardComplete).toBe(false);
  });
});
