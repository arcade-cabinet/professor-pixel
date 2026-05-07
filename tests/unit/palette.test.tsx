import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock react-dnd's useDrag to avoid the DndProvider requirement.
// useDrag returns [collected, dragRef, dragPreviewRef]; we only care
// about the collected.isDragging flag (always false) and providing
// callable refs so the component renders without throwing.
vi.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, () => {}, () => {}],
}));

// Defer the import until after the mock is registered.
const { default: PygameEditorPalette } = await import('@/components/editor/palette');

describe('PygameEditorPalette — drag mode (no onArm)', () => {
  it('renders the palette header + at least one component card', () => {
    render(<PygameEditorPalette />);
    expect(screen.getByText(/Component Palette/i)).toBeInTheDocument();
    // The registry exposes ~12 entries; a known stable id is "ball".
    expect(screen.getByTestId('palette-item-ball')).toBeInTheDocument();
  });

  it('renders palette items as <div> in drag-only mode (not <button>)', () => {
    render(<PygameEditorPalette />);
    const item = screen.getByTestId('palette-item-ball');
    expect(item.tagName).toBe('DIV');
  });

  it('renders the Game Objects category heading', () => {
    render(<PygameEditorPalette />);
    // Multiple matches expected (h4 + badges); just assert ≥1.
    expect(screen.getAllByText(/Game Objects/i).length).toBeGreaterThanOrEqual(1);
  });

  it('applies the optional className to the outer Card', () => {
    const { container } = render(<PygameEditorPalette className="custom-palette-class" />);
    expect(container.querySelector('.custom-palette-class')).toBeTruthy();
  });
});

describe('PygameEditorPalette — armed/onArm mode', () => {
  it('renders palette items as <button> when onArm is supplied', () => {
    const onArm = vi.fn();
    render(<PygameEditorPalette onArm={onArm} />);
    const item = screen.getByTestId('palette-item-ball');
    expect(item.tagName).toBe('BUTTON');
  });

  it('clicking an armable item invokes onArm with the component id', () => {
    const onArm = vi.fn();
    render(<PygameEditorPalette onArm={onArm} />);
    fireEvent.click(screen.getByTestId('palette-item-ball'));
    expect(onArm).toHaveBeenCalledWith('ball');
  });

  it('the armed item gets aria-pressed=true and shows the tap-to-place hint', () => {
    const onArm = vi.fn();
    render(<PygameEditorPalette onArm={onArm} armedComponentId="ball" />);
    const item = screen.getByTestId('palette-item-ball');
    expect(item).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Tap the canvas to place/i)).toBeInTheDocument();
  });

  it('non-armed items have aria-pressed=false', () => {
    const onArm = vi.fn();
    render(<PygameEditorPalette onArm={onArm} armedComponentId="ball" />);
    const otherItem = screen.getByTestId('palette-item-paddle');
    expect(otherItem).toHaveAttribute('aria-pressed', 'false');
  });

  it('aria-label changes between armed and unarmed states', () => {
    const onArm = vi.fn();
    render(<PygameEditorPalette onArm={onArm} armedComponentId="ball" />);
    const armed = screen.getByTestId('palette-item-ball');
    expect(armed.getAttribute('aria-label')).toMatch(/Armed/);
    const unarmed = screen.getByTestId('palette-item-paddle');
    expect(unarmed.getAttribute('aria-label')).toMatch(/Tap to arm/);
  });
});
