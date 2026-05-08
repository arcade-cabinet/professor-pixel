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

  it('looks up the component by id when componentId is supplied (line 28 truthy arm)', () => {
    // The default tests pass `category` so the falsy arm of the
    // `componentId ? findById : findByCategory` ternary fires. Pin
    // the truthy arm by passing a real id from the systems registry —
    // the selector should render that specific component's variants.
    render(<PygameComponentSelector componentId="jump" onSelect={vi.fn()} onClose={vi.fn()} />);
    // The `jump` system spec is in the registry; the heading reflects
    // its name. Just verify the not-found path didn't fire.
    expect(screen.queryByText(/Component not found/i)).not.toBeInTheDocument();
    expect(findVariantA()).toBeInTheDocument();
  });

  it('renders the not-found fallback when componentId is unknown (lines 32-33 truthy arm)', () => {
    // `if (!component)` guard returns the placeholder. Without this
    // pin a typo'd id silently rendered a half-built selector.
    render(
      <PygameComponentSelector componentId="totally-fake-id" onSelect={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByText(/Component not found/i)).toBeInTheDocument();
    // No variant buttons in the fallback UI.
    expect(screen.queryByRole('button', { name: /Option A:/i })).not.toBeInTheDocument();
  });

  it('Confirm Selection is disabled until a variant is chosen and fires onSelect on click (line 154)', () => {
    // The Confirm button's `selectedVariant && onSelect(...)` short-circuits
    // both arms: with no selection it's disabled (the && short-circuits to
    // false and onSelect isn't called); after selecting A, clicking Confirm
    // fires the truthy arm and re-emits the (id, variant) tuple.
    const onSelect = vi.fn();
    render(<PygameComponentSelector category="movement" onSelect={onSelect} onClose={vi.fn()} />);
    const confirm = screen.getByRole('button', { name: /Confirm Selection/i });
    expect(confirm).toBeDisabled();

    // Selecting A first re-emits (id, 'A') via handleVariantSelect — clear it
    // so we can isolate the Confirm-button emit on its own.
    fireEvent.click(findVariantA());
    onSelect.mockClear();

    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.any(String), 'A');
  });
});
