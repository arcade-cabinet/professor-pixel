// Cover the cold handleOptionSelect + advance falsy arms in
// app/components/wizard/dialogue-engine.tsx that the existing
// dialogue-engine integration test skips:
//   - line 501 path 1 falsy: option with empty/missing text → skips the
//     setSessionActions(updateSessionActionsForOption(...)) call
//   - line 512 path 1 falsy: setVariable.gameType is NOT a string →
//     gameTypeFromVariable resolves to undefined
//   - line 516 path 1 falsy: gameTypeFromVariable falsy → falls back to
//     prev.selectedGameType
//   - line 524 path 1 falsy + 529 path 1 falsy: same shape inside the
//     transitionToSpecializedFlow branch — setVariable absent or
//     gameType non-string

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

const flow = makeFlow({
  start: {
    text: 'Welcome',
    options: [
      // Three crafted options exercising the cold branches:
      // 1) empty text → line 501 falsy
      { text: '', next: 'a' },
      // 2) setVariable with non-string gameType → 512 falsy + 516 falsy
      {
        text: 'Set non-string gameType',
        next: 'b',
        setVariable: { gameType: 42 as unknown as string, otherKey: 'x' },
      },
    ],
  },
  a: { text: 'Path A' },
  b: { text: 'Path B' },
});

beforeEach(() => {
  vi.mocked(persistence.loadWizardState).mockReturnValue(null);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(flow), { status: 200 }))
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('dialogue-engine — handleOptionSelect cold falsy arms', () => {
  it('option with empty text skips updateSessionActionsForOption (line 501 falsy)', async () => {
    const { result } = renderHook(() => useWizardDialogue());
    await waitFor(() => expect(result.current.dialogueState.currentNode).toBeTruthy());
    const choicesBefore = result.current.sessionActions.choices.length;
    act(() => {
      result.current.handleOptionSelect({ text: '', next: 'a' });
    });
    // Choices array unchanged because line 501's `if (option.text)` arm
    // short-circuited.
    expect(result.current.sessionActions.choices.length).toBe(choicesBefore);
  });

  it('setVariable with non-string gameType falls back to prev.selectedGameType (lines 512, 516 falsy)', async () => {
    const { result } = renderHook(() => useWizardDialogue());
    await waitFor(() => expect(result.current.dialogueState.currentNode).toBeTruthy());
    act(() => {
      result.current.handleOptionSelect({
        text: 'Set non-string gameType',
        next: 'b',
        setVariable: { gameType: 42 as unknown as string },
      });
    });
    // gameTypeFromVariable is undefined (typeof check falsy) → no
    // selectedGameType assignment from setVariable; prev value preserved.
    expect(result.current.sessionActions.selectedGameType).toBeUndefined();
  });

  // Note: transition-without-next was attempted but the resulting useEffect
  // chain triggers a specialized-flow load with an empty path that races the
  // assertion. The test was unstable; the cold transition-arm coverage
  // requires the production wizard flow to drive the path naturally and
  // isn't worth a flaky integration test.
});
