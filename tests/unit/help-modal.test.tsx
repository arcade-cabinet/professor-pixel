// P4.15 — Help / FAQ modal contract tests.
//
// The modal renders 6 question/answer entries from the i18n catalog, is
// driven by a controlled `open` prop, and must close on Escape (Radix
// Dialog handles the focus trap + Escape). These tests pin the entry
// count, the title rendering, and the controlled-close path.

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import HelpModal from '@/components/help-modal';
import { strings } from '@lib/i18n';

describe('HelpModal (P4.15)', () => {
  it('renders the title and all 6 catalog entries when open', () => {
    render(<HelpModal open={true} onOpenChange={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(strings.help.title)).toBeInTheDocument();

    // Six entries seeded in the catalog; iteration order is the
    // declaration order. Each entry exposes a stable testid.
    const entryCount = Object.keys(strings.help.questions).length;
    expect(entryCount).toBe(6);
    for (let i = 0; i < entryCount; i++) {
      expect(screen.getByTestId(`help-entry-${i}`)).toBeInTheDocument();
    }
  });

  it('does not render the dialog content when open=false', () => {
    render(<HelpModal open={false} onOpenChange={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onOpenChange(false) when Escape is pressed', () => {
    const onOpenChange = vi.fn();
    render(<HelpModal open={true} onOpenChange={onOpenChange} />);
    // Radix Dialog binds keydown at the document; firing on document
    // exercises the same listener path the kid hits.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
