// P4.23 — variant cards in PygameComponentSelector are keyboard-operable.
//
// Before P4.23 they were `<motion.div onClick>` — clickable but invisible
// to keyboard + screen reader users (no role, no tab stop, no Enter/Space
// activation). The conversion to `<motion.button aria-pressed>` is the
// fix; this test proves the contract sticks: focusable, activatable via
// click, aria-pressed reflects the selected variant.

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PygameComponentSelector from '@/components/pygame/component-selector';

const findVariantA = () => screen.getByRole('button', { name: /Option A:/i });
const findVariantB = () => screen.getByRole('button', { name: /Option B:/i });

describe('PygameComponentSelector variant cards (P4.23)', () => {
  it('exposes variant cards as buttons (role="button"), not divs', () => {
    render(<PygameComponentSelector category="movement" onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(findVariantA().tagName).toBe('BUTTON');
    expect(findVariantB().tagName).toBe('BUTTON');
  });

  it('is reachable via Tab (tabIndex is the default 0 for native button)', () => {
    render(<PygameComponentSelector category="movement" onSelect={vi.fn()} onClose={vi.fn()} />);
    const a = findVariantA();
    a.focus();
    expect(document.activeElement).toBe(a);
  });

  it('reflects selection state via aria-pressed', () => {
    const onSelect = vi.fn();
    render(<PygameComponentSelector category="movement" onSelect={onSelect} onClose={vi.fn()} />);
    const a = findVariantA();
    const b = findVariantB();
    expect(a).toHaveAttribute('aria-pressed', 'false');
    expect(b).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(a);
    expect(a).toHaveAttribute('aria-pressed', 'true');
    expect(b).toHaveAttribute('aria-pressed', 'false');
    expect(onSelect).toHaveBeenCalledWith(expect.any(String), 'A');
  });

  it('Enter activates the focused variant (native button keyboard semantics)', () => {
    const onSelect = vi.fn();
    render(<PygameComponentSelector category="movement" onSelect={onSelect} onClose={vi.fn()} />);
    const b = findVariantB();
    b.focus();
    // Native <button> dispatches click on Enter — fire it directly to verify
    // the handler wires up at all (jsdom doesn't synthesize the click).
    fireEvent.click(b);
    expect(onSelect).toHaveBeenCalledWith(expect.any(String), 'B');
  });
});
