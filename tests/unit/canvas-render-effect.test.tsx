// Drive the render-effect inside app/components/editor/canvas.tsx (lines
// 76-149). jsdom returns null from canvas.getContext('2d') by default, so
// the effect short-circuits at the early-return on line 81 and every line
// below it stays uncovered. Stubbing HTMLCanvasElement.prototype.getContext
// with a fake 2D-context object exposes the rest of the effect: setCanvasContext
// connection, grid loop, per-component draw with selection highlight, the
// requestAnimationFrame loop when isPlaying, and the cleanup path that fires
// cancelAnimationFrame + setCanvasContext(null) on unmount.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('react-dnd', () => ({
  useDrop: () => [{ isOver: false }, () => {}, () => {}],
}));

const setCanvasContextMock = vi.fn();
const flushFrameBufferMock = vi.fn();
vi.mock('@lib/pygame/runtime/simulator', async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    '@lib/pygame/runtime/simulator'
  );
  return {
    ...actual,
    setCanvasContext: (...args: unknown[]) => setCanvasContextMock(...args),
    flushFrameBuffer: (...args: unknown[]) => flushFrameBufferMock(...args),
  };
});

import PygameEditorCanvas from '@/components/editor/canvas';
import type { PlacedComponent } from '@lib/pygame/components/types';

// Build a fake 2D context whose every drawing method is a vi.fn so we can
// assert the exact call shape.
function makeFakeContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    drawImage: vi.fn(),
    rect: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '' as CanvasTextAlign,
    textBaseline: '' as CanvasTextBaseline,
  } as unknown as CanvasRenderingContext2D;
}

let fakeCtx: ReturnType<typeof makeFakeContext>;
let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
let originalRAF: typeof window.requestAnimationFrame;
let originalCAF: typeof window.cancelAnimationFrame;

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
  fakeCtx = makeFakeContext();
  originalGetContext = HTMLCanvasElement.prototype.getContext;
  // jsdom returns null from getContext without the `canvas` npm package.
  // Stub it to return our fake 2D context so the render effect runs through.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx) as never;

  originalRAF = window.requestAnimationFrame;
  originalCAF = window.cancelAnimationFrame;

  setCanvasContextMock.mockReset();
  flushFrameBufferMock.mockReset();
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  window.requestAnimationFrame = originalRAF;
  window.cancelAnimationFrame = originalCAF;
  vi.restoreAllMocks();
});

describe('PygameEditorCanvas — render effect happy path', () => {
  it('with showGrid=false + no components, runs clearRect + flushFrameBuffer + connects ctx', () => {
    render(<PygameEditorCanvas {...baseProps} />);
    // setCanvasContext was called with our fake ctx (line 88).
    expect(setCanvasContextMock).toHaveBeenCalledWith(fakeCtx);
    // The clear-canvas line at the top of render() ran.
    expect((fakeCtx.clearRect as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      0,
      0,
      800,
      600
    );
    // flushFrameBuffer is the very last call inside render() before the rAF
    // gate — its presence proves the body ran end-to-end.
    expect(flushFrameBufferMock).toHaveBeenCalled();
    // No grid → no stroke calls from the grid loop.
    expect((fakeCtx.stroke as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('canvas.width + canvas.height get set to 800×600 (drawing-buffer size)', () => {
    const { container } = render(<PygameEditorCanvas {...baseProps} />);
    const canvas = container.querySelector('canvas')!;
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });
});

describe('PygameEditorCanvas — render effect grid branch', () => {
  it('with showGrid=true, the grid loop fires beginPath/moveTo/lineTo/stroke many times', () => {
    render(<PygameEditorCanvas {...baseProps} showGrid={true} />);
    // The grid loops cover x in [0, 800] step 20 → 41 vertical lines, plus
    // y in [0, 600] step 20 → 31 horizontal lines, for 72 stroke calls total.
    expect(
      (fakeCtx.stroke as ReturnType<typeof vi.fn>).mock.calls.length
    ).toBeGreaterThanOrEqual(70);
    // Grid stroke style is set before the loop — verify the assignment landed.
    // (We can't read the stroke calls' state mid-flight, but lineWidth must be 1
    // after the assignment on line 98.)
    expect(fakeCtx.lineWidth).toBe(1);
  });
});

describe('PygameEditorCanvas — render effect components branch', () => {
  it('with a placed ball, save/translate/preview/restore fire for the component', () => {
    const components: PlacedComponent[] = [
      { id: 'placed-1', componentId: 'ball', x: 100, y: 200, properties: {} },
    ];
    render(<PygameEditorCanvas {...baseProps} components={components} />);
    // save() called once for the unselected component (no selection-highlight
    // strokeRect path).
    expect((fakeCtx.save as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    // translate(comp.x, comp.y) at line 118.
    expect((fakeCtx.translate as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      100,
      200
    );
    // restore() at line 129.
    expect((fakeCtx.restore as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    // No selection highlight → strokeRect not called for the highlight path.
    // (The ball preview itself doesn't use strokeRect; ctx.arc + ctx.fill are
    // its draw primitives.)
    expect((fakeCtx.strokeRect as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('with a placed ball + selectedId matching, the highlight strokeRect at (-2,-2,64,64) fires', () => {
    const components: PlacedComponent[] = [
      { id: 'placed-1', componentId: 'ball', x: 50, y: 50, properties: {} },
    ];
    render(
      <PygameEditorCanvas
        {...baseProps}
        components={components}
        selectedId="placed-1"
      />
    );
    // Lines 121-124 — selection highlight draws an outset 64×64 square.
    expect((fakeCtx.strokeRect as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      -2,
      -2,
      64,
      64
    );
  });

  it('with an unknown componentId, the per-component branch is skipped (no crash)', () => {
    const components: PlacedComponent[] = [
      { id: 'unknown-1', componentId: '__not_in_registry__', x: 0, y: 0, properties: {} },
    ];
    expect(() =>
      render(<PygameEditorCanvas {...baseProps} components={components} />)
    ).not.toThrow();
    // No translate/save/restore for the unknown component (the if-guard at
    // line 116 fails, so the body never runs).
    expect((fakeCtx.translate as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
});

describe('PygameEditorCanvas — render effect rAF loop', () => {
  it('with isPlaying=true, requestAnimationFrame is scheduled (line 137)', () => {
    // Stub rAF so it does NOT actually re-fire render(); we only need to
    // observe that the gate at line 136 ran.
    window.requestAnimationFrame = vi.fn(() => 42) as never;
    window.cancelAnimationFrame = vi.fn();
    render(<PygameEditorCanvas {...baseProps} isPlaying={true} />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('with isPlaying=false, requestAnimationFrame is NOT scheduled', () => {
    window.requestAnimationFrame = vi.fn(() => 1) as never;
    render(<PygameEditorCanvas {...baseProps} isPlaying={false} />);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
});

describe('PygameEditorCanvas — render effect cleanup', () => {
  it('unmount cancels any in-flight rAF and clears the canvas context', () => {
    window.requestAnimationFrame = vi.fn(() => 99) as never;
    const cancelAnimationFrameSpy = vi.fn();
    window.cancelAnimationFrame = cancelAnimationFrameSpy;
    const { unmount } = render(
      <PygameEditorCanvas {...baseProps} isPlaying={true} />
    );
    setCanvasContextMock.mockClear();
    unmount();
    // Lines 144-145 — cancelAnimationFrame fires with the rAF id.
    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(99);
    // Line 147 — setCanvasContext(null) clears the global context.
    expect(setCanvasContextMock).toHaveBeenCalledWith(null);
  });

  it('unmount with isPlaying=false skips cancelAnimationFrame (animationFrameRef stayed undefined)', () => {
    const cancelAnimationFrameSpy = vi.fn();
    window.cancelAnimationFrame = cancelAnimationFrameSpy;
    const { unmount } = render(<PygameEditorCanvas {...baseProps} />);
    unmount();
    expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();
    // setCanvasContext(null) still fires on every unmount.
    expect(setCanvasContextMock).toHaveBeenCalledWith(null);
  });
});

describe('PygameEditorCanvas — getContext returns null short-circuit', () => {
  it('if getContext returns null, the effect early-returns and setCanvasContext is not called', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
    render(<PygameEditorCanvas {...baseProps} />);
    // Line 81 — early return before setCanvasContext at line 88.
    expect(setCanvasContextMock).not.toHaveBeenCalled();
  });
});
