// Cover the useDrag collect callback body in app/components/editor/palette.tsx
// (lines 76-78). The existing palette.test.tsx mocks react-dnd with an inert
// useDrag that never fires the spec, so the collect closure stays uncovered.
// This test captures the spec function on mount, then invokes its collect
// callback manually with a fake monitor to drive the isDragging readback.

import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

interface CapturedSpec {
  type: string;
  item: { componentId: string };
  collect: (monitor: { isDragging: () => boolean }) => { isDragging: boolean };
}

const captured: { specs: CapturedSpec[] } = { specs: [] };

vi.mock('react-dnd', () => ({
  useDrag: (specFn: () => unknown) => {
    captured.specs.push(specFn() as CapturedSpec);
    return [{ isDragging: false }, () => {}, () => {}];
  },
}));

const { default: PygameEditorPalette } = await import('@/components/editor/palette');

describe('PygameEditorPalette — useDrag collect callback (line 76)', () => {
  it('collect returns { isDragging: true } when monitor.isDragging() is true', () => {
    captured.specs = [];
    render(<PygameEditorPalette />);
    expect(captured.specs.length).toBeGreaterThan(0);
    // Pick the first card's spec — they all share the same collect impl
    // body; the assertion is that the boolean coercion `!!` is in place
    // and that the monitor's isDragging value is forwarded.
    const spec = captured.specs[0];
    expect(spec.collect({ isDragging: () => true })).toEqual({ isDragging: true });
    expect(spec.collect({ isDragging: () => false })).toEqual({ isDragging: false });
  });

  it('every palette item exposes the same drag type and a stable componentId in item', () => {
    captured.specs = [];
    render(<PygameEditorPalette />);
    expect(captured.specs.length).toBeGreaterThan(1);
    for (const spec of captured.specs) {
      expect(spec.type).toBe('pygame-component');
      expect(typeof spec.item.componentId).toBe('string');
      expect(spec.item.componentId.length).toBeGreaterThan(0);
    }
  });
});
