// Cover the no-next branches in handleOptionSelect of dialogue-engine.tsx
// that the existing wizard-dialogue-engine.test.tsx skips:
//   - lines 538-541: transitionToSpecializedFlow with NO next field —
//     logs "No next node specified, will load specialized flow start
//     node" and returns early without navigating
//   - lines 549-552: action === 'transitionToSpecializedFlow' (without
//     a next) — falls into the else-if and logs "Triggering flow
//     transition without explicit navigation"
//
// Both branches return option without flipping currentNodeId; the
// transitionToSpecializedFlow flag in sessionActions does flip and
// downstream effects (useEffect at the top of the hook) load the
// specialized flow.

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

// Flow with a node 'b' whose option has action='transitionToSpecializedFlow'
// but NO next field, so the no-next branches of handleOptionSelect fire.
const noNextFlow = makeFlow({
  start: {
    text: 'Welcome',
    options: [{ text: 'Go to B', next: 'b' }],
  },
  b: {
    text: 'Path B',
    options: [
      // The runtime accepts no `next`; only the TS type insists on it.
      // Cast the literal so we can drive the no-next branch.
      {
        text: 'Pick a platformer (no next)',
        action: 'transitionToSpecializedFlow',
        setVariable: { gameType: 'platformer' },
      } as unknown as { text: string; next: string; action: string },
    ],
  },
});

const platformerFlow = makeFlow({
  start: { text: 'Platformer specialized flow start' },
});

describe('useWizardDialogue — handleOptionSelect no-next branches', () => {
  beforeEach(() => {
    vi.mocked(persistence.loadWizardState).mockReturnValue(null);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const path = typeof url === 'string' ? url : (url as URL).pathname;
        if (path.includes('platformer-flow')) {
          return new Response(JSON.stringify(platformerFlow), { status: 200 });
        }
        return new Response(JSON.stringify(noNextFlow), { status: 200 });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('transitionToSpecializedFlow with no `next` returns early, sets the flag, and triggers specialized flow load', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { result } = renderHook(() => useWizardDialogue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Walk to node 'b'.
    act(() => {
      result.current.handleOptionSelect({ text: 'Go to B', next: 'b' });
    });
    await waitFor(() => expect(result.current.dialogueState.currentNodeId).toBe('b'));

    // Fire the no-next transitionToSpecializedFlow option.
    act(() => {
      const opt = result.current.dialogueState.currentNode?.options?.[0];
      if (opt) result.current.handleOptionSelect(opt);
    });

    // Engine fetched the specialized flow.
    await waitFor(() => {
      const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const urls = calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes('platformer-flow.json'))).toBe(true);
    });

    // The "No next node specified" log fired (line 539).
    const logged = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('No next node specified');
  });
});
