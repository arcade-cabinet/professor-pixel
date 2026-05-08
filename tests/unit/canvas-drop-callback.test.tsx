// Cover the useDrop drop+collect callback bodies in
// app/components/editor/canvas.tsx (lines 49-73). The existing
// canvas-drag.test.tsx + canvas-render-effect.test.tsx mock react-dnd
// with an inert useDrop so the drop callback never fires. This suite
// captures the spec passed to useDrop on mount, then invokes its drop
// callback manually with a fake monitor + the collect callback to
// drive the isOver readback.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

let capturedSpec:
  | {
      drop: (
        item: { componentId: string },
        monitor: { getClientOffset: () => { x: number; y: number } | null }
      ) => void;
      collect: (monitor: { isOver: () => boolean }) => { isOver: boolean };
    }
  | null = null;

vi.mock('react-dnd', () => ({
  useDrop: (specFn: () => unknown) => {
    capturedSpec = specFn() as typeof capturedSpec;
    return [{ isOver: false }, () => {}, () => {}];
  },
}));

vi.mock('@lib/pygame/runtime/simulator', async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    '@lib/pygame/runtime/simulator'
  );
  return {
    ...actual,
    setCanvasContext: vi.fn(),
    flushFrameBuffer: vi.fn(),
  };
});

import PygameEditorCanvas from '@/components/editor/canvas';

const baseProps = {
  components: [],
  selectedId: null,
  showGrid: false,
  isPlaying: false,
  onDrop: vi.fn(),
  onSelect: vi.fn(),
  onMove: vi.fn(),
  onDelete: vi.fn(),
};

beforeEach(() => {
  capturedSpec = null;
  // Stub canvas rect to a non-zero size so scaleX/Y math is finite.
  HTMLCanvasElement.prototype.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    }) as DOMRect;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PygameEditorCanvas — useDrop drop callback (lines 51-69)', () => {
  it('drop with a valid offset calls onDrop with PLACE_HALF-centered coordinates', () => {
    const onDrop = vi.fn();
    const { container } = render(<PygameEditorCanvas {...baseProps} onDrop={onDrop} />);
    // Force the canvas's intrinsic width/height to match the stubbed
    // bounding rect so scaleX = scaleY = 1. The render effect tries to
    // set canvas.width=800 on its own but only runs when getContext('2d')
    // returns a non-null context — jsdom returns null, so the effect
    // short-circuits and we have to set the dimensions ourselves.
    const canvas = container.querySelector('canvas')!;
    canvas.width = 800;
    canvas.height = 600;
    expect(capturedSpec).not.toBeNull();
    capturedSpec!.drop(
      { componentId: 'ball' },
      { getClientOffset: () => ({ x: 130, y: 90 }) }
    );
    // canvas 800×600, getBoundingClientRect 800×600 → scaleX = scaleY = 1.
    // PLACE_HALF = 30, so x = 130 - 30 = 100, y = 60.
    expect(onDrop).toHaveBeenCalledWith('ball', 100, 60);
  });

  it('drop with offset but the canvas has not mounted yet → no onDrop call', () => {
    // We can't directly null canvasRef in a rendered component, but
    // capturedSpec.drop guards on (offset && canvas). If we simulate a
    // null offset, the gate fails and onDrop is skipped.
    const onDrop = vi.fn();
    render(<PygameEditorCanvas {...baseProps} onDrop={onDrop} />);
    capturedSpec!.drop({ componentId: 'ball' }, { getClientOffset: () => null });
    expect(onDrop).not.toHaveBeenCalled();
  });
});

describe('PygameEditorCanvas — useDrop collect callback (line 70-72)', () => {
  it('collect returns isOver from the monitor', () => {
    render(<PygameEditorCanvas {...baseProps} />);
    expect(capturedSpec).not.toBeNull();
    // Simulate the dnd backend asking for the collected props with
    // isOver=true (e.g., a drag is hovering over the drop target).
    expect(capturedSpec!.collect({ isOver: () => true })).toEqual({
      isOver: true,
    });
    expect(capturedSpec!.collect({ isOver: () => false })).toEqual({
      isOver: false,
    });
  });
});
