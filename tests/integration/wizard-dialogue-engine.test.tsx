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

const defaultFlow = makeFlow({
  start: {
    text: 'Welcome',
    options: [
      { text: 'Choose A', next: 'a' },
      { text: 'Choose B', next: 'b' },
    ],
  },
  a: {
    text: 'Path A',
    multiStep: ['First step', 'Second step', 'Third step'],
    options: [{ text: 'Continue', next: 'end' }],
  },
  b: {
    text: 'Path B',
    options: [
      {
        text: 'Pick a platformer',
        next: 'transition',
        action: 'transitionToSpecializedFlow',
        setVariable: { gameType: 'platformer' },
      },
    ],
  },
  transition: { text: 'After transition' },
  end: { text: 'Done' },
});

const platformerFlow = makeFlow({
  start: { text: 'Platformer specialized flow start' },
  level1: { text: 'Level 1 design' },
});

describe('useWizardDialogue (post-restructure dialogue-engine)', () => {
  beforeEach(() => {
    vi.mocked(persistence.loadWizardState).mockReturnValue(null);
    vi.mocked(persistence.saveWizardStateDebounced).mockClear();
    // Use vi.stubGlobal so vi.unstubAllGlobals in afterEach can restore the
    // original fetch — direct assignment would leak into other test files.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const path = typeof url === 'string' ? url : (url as URL).pathname;
        if (path.includes('platformer-flow')) {
          return new Response(JSON.stringify(platformerFlow), { status: 200 });
        }
        return new Response(JSON.stringify(defaultFlow), { status: 200 });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads the default flow on mount and resolves currentNode', async () => {
    const { result } = renderHook(() => useWizardDialogue());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.dialogueState.currentNodeId).toBe('start');
    expect(result.current.dialogueState.currentNode?.text).toBe('Welcome');
    expect(global.fetch).toHaveBeenCalledWith('/wizard-flow.json');
  });

  it('handleOptionSelect navigates to the option.next node', async () => {
    const { result } = renderHook(() => useWizardDialogue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      const opt = result.current.dialogueState.currentNode?.options?.[0];
      if (opt) result.current.handleOptionSelect(opt);
    });

    await waitFor(() => {
      expect(result.current.dialogueState.currentNodeId).toBe('a');
    });
  });

  it('handleOptionSelect updates sessionActions.choices', async () => {
    const { result } = renderHook(() => useWizardDialogue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const before = result.current.sessionActions.choices.length;
    act(() => {
      const opt = result.current.dialogueState.currentNode?.options?.[0];
      if (opt) result.current.handleOptionSelect(opt);
    });
    await waitFor(() => {
      expect(result.current.sessionActions.choices.length).toBeGreaterThan(before);
    });
  });

  it('advance() increments dialogueStep on a multiStep node, then navigates via single-continue option (F4.2)', async () => {
    const { result } = renderHook(() => useWizardDialogue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Navigate to the multiStep node `a` (3 steps + single "Continue" option).
    act(() => {
      result.current.handleOptionSelect({ text: 'Choose A', next: 'a' });
    });
    await waitFor(() => expect(result.current.dialogueState.currentNodeId).toBe('a'));

    expect(result.current.dialogueState.dialogueStep).toBe(0);
    act(() => result.current.advance());
    expect(result.current.dialogueState.dialogueStep).toBe(1);
    act(() => result.current.advance());
    expect(result.current.dialogueState.dialogueStep).toBe(2);

    // Past the last multiStep entry, advance() consumes the single-continue
    // option and navigates to its `next` (was a no-op pre-F4.2).
    act(() => result.current.advance());
    await waitFor(() => expect(result.current.dialogueState.currentNodeId).toBe('end'));
  });

  it('restores currentNodeId from persisted state on mount', async () => {
    vi.mocked(persistence.loadWizardState).mockReturnValue({
      version: '1',
      currentNodeId: 'a',
      activeFlowPath: '/wizard-flow.json',
      sessionActions: {
        choices: ['previous'],
        createdAssets: [],
        gameType: null,
        currentProject: null,
        completedSteps: [],
        unlockedEditor: false,
      },
      gameType: null,
      selectedGameType: null,
      updatedAt: new Date().toISOString(),
    });

    const { result } = renderHook(() => useWizardDialogue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.dialogueState.currentNodeId).toBe('a');
    expect(result.current.sessionActions.choices).toContain('previous');
  });

  describe('back-stack (P4.3)', () => {
    it('canGoBack is false on initial mount (no history yet)', async () => {
      const { result } = renderHook(() => useWizardDialogue());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canGoBack).toBe(false);
    });

    it('navigating forward enables canGoBack and goBack restores the prior node', async () => {
      const { result } = renderHook(() => useWizardDialogue());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.dialogueState.currentNodeId).toBe('start');

      act(() => {
        result.current.handleOptionSelect({ text: 'Choose A', next: 'a' });
      });
      await waitFor(() => expect(result.current.dialogueState.currentNodeId).toBe('a'));
      expect(result.current.canGoBack).toBe(true);

      act(() => result.current.goBack());
      await waitFor(() => expect(result.current.dialogueState.currentNodeId).toBe('start'));
      // The history pop drained the stack; no further Back available.
      expect(result.current.canGoBack).toBe(false);
    });

    it('multi-step forward navigation builds a stack that pops in LIFO order', async () => {
      const { result } = renderHook(() => useWizardDialogue());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // start → a → end (push start, then push a)
      act(() => result.current.navigateToNode('a'));
      await waitFor(() => expect(result.current.dialogueState.currentNodeId).toBe('a'));
      act(() => result.current.navigateToNode('end'));
      await waitFor(() => expect(result.current.dialogueState.currentNodeId).toBe('end'));

      expect(result.current.canGoBack).toBe(true);
      act(() => result.current.goBack());
      await waitFor(() => expect(result.current.dialogueState.currentNodeId).toBe('a'));
      act(() => result.current.goBack());
      await waitFor(() => expect(result.current.dialogueState.currentNodeId).toBe('start'));
      expect(result.current.canGoBack).toBe(false);
    });

    it('goBack on an empty stack is a no-op', async () => {
      const { result } = renderHook(() => useWizardDialogue());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const initialId = result.current.dialogueState.currentNodeId;
      act(() => result.current.goBack());
      // currentNodeId unchanged; no exception thrown.
      expect(result.current.dialogueState.currentNodeId).toBe(initialId);
      expect(result.current.canGoBack).toBe(false);
    });

    it('navigating to the same node does not push a duplicate history entry', async () => {
      const { result } = renderHook(() => useWizardDialogue());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Self-navigate — should not push 'start' onto history.
      act(() => result.current.navigateToNode('start'));
      expect(result.current.canGoBack).toBe(false);
    });
  });

  it('transitionToSpecializedFlow loads the specialized flow JSON', async () => {
    const { result } = renderHook(() => useWizardDialogue({ flowType: 'game-dev' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Navigate to node 'b' (which has the transition option).
    act(() => {
      result.current.handleOptionSelect({ text: 'Choose B', next: 'b' });
    });
    await waitFor(() => expect(result.current.dialogueState.currentNodeId).toBe('b'));

    // Pick the option that triggers transitionToSpecializedFlow.
    act(() => {
      const opt = result.current.dialogueState.currentNode?.options?.[0];
      if (opt) result.current.handleOptionSelect(opt);
    });

    // The engine should fetch /platformer-flow.json (the specialized flow).
    await waitFor(() => {
      const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const urls = calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes('platformer-flow.json'))).toBe(true);
    });
  });
});
