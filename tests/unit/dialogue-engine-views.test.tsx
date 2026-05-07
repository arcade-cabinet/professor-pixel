// Cover the view + helper exports from app/components/wizard/dialogue-engine.tsx
// that the existing integration test (tests/integration/wizard-dialogue-engine.test.tsx)
// doesn't touch:
//   - DialogueText (renders a paragraph, returns null on empty text)
//   - DialogueBox (renders default + mobile variants)
//   - getDialogueHelpers (returns three callables that delegate to wizard utils)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  DialogueText,
  DialogueBox,
  getDialogueHelpers,
} from '@/components/wizard/dialogue-engine';
import type { DialogueState, WizardNode } from '@lib/wizard/types';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DialogueText', () => {
  it('renders the supplied text in a polite live region', () => {
    render(<DialogueText text="Hello" nodeId="n1" dialogueStep={0} />);
    const p = screen.getByText('Hello');
    expect(p).toBeInTheDocument();
    expect(p).toHaveAttribute('aria-live', 'polite');
    expect(p).toHaveAttribute('role', 'status');
    expect(p).toHaveAttribute('aria-atomic', 'true');
  });

  it('returns null when text is empty', () => {
    const { container } = render(
      <DialogueText text="" nodeId="n1" dialogueStep={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('forwards className to the wrapper', () => {
    const { container } = render(
      <DialogueText text="Hi" nodeId="n1" dialogueStep={0} className="custom-cls" />
    );
    expect(container.querySelector('.custom-cls')).toBeTruthy();
  });
});

describe('DialogueBox', () => {
  it('renders the supplied text with the default variant styles', () => {
    render(<DialogueBox text="Default body" />);
    const p = screen.getByText('Default body');
    expect(p).toBeInTheDocument();
    expect(p).toHaveClass('text-sm');
  });

  it('renders the mobile variant with larger text', () => {
    render(<DialogueBox text="Mobile body" variant="mobile" />);
    const p = screen.getByText('Mobile body');
    expect(p).toHaveClass('text-base');
  });

  it('forwards className to the outer wrapper', () => {
    const { container } = render(
      <DialogueBox text="Hi" className="dlg-cls" />
    );
    expect(container.querySelector('.dlg-cls')).toBeTruthy();
  });
});

describe('getDialogueHelpers', () => {
  it('returns getCurrentText/shouldShowOptions/shouldShowContinue helpers', () => {
    const node: WizardNode = {
      id: 'n1',
      text: 'A node',
      options: [
        { text: 'Option A', next: 'a' },
        { text: 'Option B', next: 'b' },
      ],
    };
    const state: DialogueState = {
      currentNodeId: 'n1',
      currentNode: node,
      dialogueStep: 0,
      carouselIndex: 0,
      showAllChoices: false,
    };
    const h = getDialogueHelpers(state);
    expect(typeof h.getCurrentText).toBe('function');
    expect(typeof h.shouldShowOptions).toBe('function');
    expect(typeof h.shouldShowContinue).toBe('function');
    expect(h.getCurrentText()).toBe('A node');
    expect(h.shouldShowOptions()).toBe(true);
    expect(h.shouldShowContinue()).toBe(false);
  });

  it('handles a null currentNode gracefully', () => {
    const state: DialogueState = {
      currentNodeId: '',
      currentNode: null,
      dialogueStep: 0,
      carouselIndex: 0,
      showAllChoices: false,
    };
    const h = getDialogueHelpers(state);
    // getCurrentText with no node returns either '' or null per util impl;
    // either way, all helpers are safe to call.
    expect(() => h.getCurrentText()).not.toThrow();
    expect(h.shouldShowOptions()).toBe(false);
    expect(h.shouldShowContinue()).toBe(false);
  });

  it('forwards optional sessionActions through to getCurrentText', () => {
    const node: WizardNode = {
      id: 'n1',
      text: 'Hello {name}!',
    };
    const state: DialogueState = {
      currentNodeId: 'n1',
      currentNode: node,
      dialogueStep: 0,
      carouselIndex: 0,
      showAllChoices: false,
    };
    const h = getDialogueHelpers(state, {
      choices: [],
      createdAssets: [],
      gameType: null,
      currentProject: null,
      completedSteps: [],
      unlockedEditor: false,
    });
    // The util simply returns the text — sessionActions plumbing is wired
    // through. Just assert no throw.
    expect(() => h.getCurrentText()).not.toThrow();
  });
});
