// Cover the drag-move + delete branches in app/components/editor/canvas.tsx
// that the existing canvas.test.tsx misses (lines 209-212, 217-252):
//   - clicking on an existing component → onSelect(id) + drag arm
//   - pointermove on window streams onMove(id, x, y)
//   - pointerup on window clears the drag and removes listeners
//   - pointercancel on window clears the drag (mobile interruption path)
//   - setPointerCapture is called (and its catch branch swallows errors)
//   - showGrid + isPlaying branches in the render effect

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('react-dnd', () => ({
  useDrop: () => [{ isOver: false }, () => {}, () => {}],
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

const { default: PygameEditorCanvas } = await import('@/components/editor/canvas');

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

// Force the canvas to have a non-zero bounding rect so the scaleX/scaleY math
// produces a finite coordinate (jsdom getBoundingClientRect returns 0×0 by
// default, which collapses the (clientX-rect.left) * scaleX expression to
// NaN and breaks every component-hit check). Match the canvas internal size
// (800×600 — set inside the useEffect) so scaleX === scaleY === 1 and
// clientX/Y map straight through to the canvas-internal coordinate space.
function stubCanvasRect(canvas: HTMLCanvasElement) {
  canvas.width = 800;
  canvas.height = 600;
  canvas.getBoundingClientRect = () =>
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
}

function fakePointerEvent(
  props: Partial<PointerEvent> = {}
): React.PointerEvent<HTMLCanvasElement> {
  return {
    pointerId: 1,
    pointerType: 'mouse',
    clientX: 0,
    clientY: 0,
    preventDefault: vi.fn(),
    ...props,
  } as unknown as React.PointerEvent<HTMLCanvasElement>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PygameEditorCanvas — component selection + drag-move', () => {
  it('clicking on an existing component selects it (and arms drag)', () => {
    const onSelect = vi.fn();
    const onMove = vi.fn();
    render(
      <PygameEditorCanvas
        {...baseProps}
        components={[
          { id: 'p1', componentId: 'ball', x: 100, y: 100, properties: {} },
        ]}
        onSelect={onSelect}
        onMove={onMove}
      />
    );
    const canvas = screen.getByTestId('place-canvas') as HTMLCanvasElement;
    stubCanvasRect(canvas);
    fireEvent.pointerDown(canvas, fakePointerEvent({ clientX: 130, clientY: 130 }));
    expect(onSelect).toHaveBeenCalledWith('p1');
  });

  it('streams onMove via window pointermove while dragging', () => {
    const onMove = vi.fn();
    render(
      <PygameEditorCanvas
        {...baseProps}
        components={[
          { id: 'p1', componentId: 'ball', x: 100, y: 100, properties: {} },
        ]}
        onMove={onMove}
      />
    );
    const canvas = screen.getByTestId('place-canvas') as HTMLCanvasElement;
    stubCanvasRect(canvas);
    fireEvent.pointerDown(canvas, fakePointerEvent({ clientX: 130, clientY: 130 }));

    // Now the component listens on window for pointermove. Dispatching a
    // PointerEvent against window with the matching pointerId should drive
    // the onMove handler.
    const moveEv = new Event('pointermove') as PointerEvent;
    Object.defineProperties(moveEv, {
      pointerId: { value: 1 },
      clientX: { value: 200 },
      clientY: { value: 200 },
    });
    window.dispatchEvent(moveEv);

    expect(onMove).toHaveBeenCalled();
    // First call: id is 'p1', and the cursor at clientX=200,clientY=200 with
    // rect.left=0, scaleX=1 yields x=200-PLACE_HALF=170, y=200-PLACE_HALF=170.
    expect(onMove.mock.calls[0][0]).toBe('p1');
    expect(onMove.mock.calls[0][1]).toBe(170);
    expect(onMove.mock.calls[0][2]).toBe(170);
  });

  it('mismatched pointerId on pointermove is ignored', () => {
    const onMove = vi.fn();
    render(
      <PygameEditorCanvas
        {...baseProps}
        components={[
          { id: 'p1', componentId: 'ball', x: 100, y: 100, properties: {} },
        ]}
        onMove={onMove}
      />
    );
    const canvas = screen.getByTestId('place-canvas') as HTMLCanvasElement;
    stubCanvasRect(canvas);
    fireEvent.pointerDown(canvas, fakePointerEvent({ clientX: 130, clientY: 130 }));

    // Dispatch a pointermove with a different pointerId — should be ignored.
    const moveEv = new Event('pointermove') as PointerEvent;
    Object.defineProperties(moveEv, {
      pointerId: { value: 999 },
      clientX: { value: 400 },
      clientY: { value: 400 },
    });
    window.dispatchEvent(moveEv);

    expect(onMove).not.toHaveBeenCalled();
  });

  it('pointerup releases the drag (so a subsequent pointermove is ignored)', () => {
    const onMove = vi.fn();
    render(
      <PygameEditorCanvas
        {...baseProps}
        components={[
          { id: 'p1', componentId: 'ball', x: 100, y: 100, properties: {} },
        ]}
        onMove={onMove}
      />
    );
    const canvas = screen.getByTestId('place-canvas') as HTMLCanvasElement;
    stubCanvasRect(canvas);
    fireEvent.pointerDown(canvas, fakePointerEvent({ clientX: 130, clientY: 130 }));

    const upEv = new Event('pointerup') as PointerEvent;
    Object.defineProperties(upEv, { pointerId: { value: 1 } });
    window.dispatchEvent(upEv);

    onMove.mockClear();
    const moveAfter = new Event('pointermove') as PointerEvent;
    Object.defineProperties(moveAfter, {
      pointerId: { value: 1 },
      clientX: { value: 300 },
      clientY: { value: 300 },
    });
    window.dispatchEvent(moveAfter);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('pointercancel also releases the drag (mobile gesture interrupted)', () => {
    const onMove = vi.fn();
    render(
      <PygameEditorCanvas
        {...baseProps}
        components={[
          { id: 'p1', componentId: 'ball', x: 100, y: 100, properties: {} },
        ]}
        onMove={onMove}
      />
    );
    const canvas = screen.getByTestId('place-canvas') as HTMLCanvasElement;
    stubCanvasRect(canvas);
    fireEvent.pointerDown(canvas, fakePointerEvent({ clientX: 130, clientY: 130 }));

    const cancelEv = new Event('pointercancel') as PointerEvent;
    Object.defineProperties(cancelEv, { pointerId: { value: 1 } });
    window.dispatchEvent(cancelEv);

    onMove.mockClear();
    const moveAfter = new Event('pointermove') as PointerEvent;
    Object.defineProperties(moveAfter, {
      pointerId: { value: 1 },
      clientX: { value: 300 },
      clientY: { value: 300 },
    });
    window.dispatchEvent(moveAfter);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('mismatched pointerId on pointerup leaves the drag active', () => {
    const onMove = vi.fn();
    render(
      <PygameEditorCanvas
        {...baseProps}
        components={[
          { id: 'p1', componentId: 'ball', x: 100, y: 100, properties: {} },
        ]}
        onMove={onMove}
      />
    );
    const canvas = screen.getByTestId('place-canvas') as HTMLCanvasElement;
    stubCanvasRect(canvas);
    fireEvent.pointerDown(canvas, fakePointerEvent({ clientX: 130, clientY: 130 }));

    const upEv = new Event('pointerup') as PointerEvent;
    Object.defineProperties(upEv, { pointerId: { value: 999 } });
    window.dispatchEvent(upEv);

    // Drag is still live — a matching pointermove should still emit onMove.
    const moveAfter = new Event('pointermove') as PointerEvent;
    Object.defineProperties(moveAfter, {
      pointerId: { value: 1 },
      clientX: { value: 300 },
      clientY: { value: 300 },
    });
    window.dispatchEvent(moveAfter);
    expect(onMove).toHaveBeenCalled();
  });

  it('swallows setPointerCapture / releasePointerCapture errors (older browsers)', () => {
    const onSelect = vi.fn();
    render(
      <PygameEditorCanvas
        {...baseProps}
        components={[
          { id: 'p1', componentId: 'ball', x: 100, y: 100, properties: {} },
        ]}
        onSelect={onSelect}
      />
    );
    const canvas = screen.getByTestId('place-canvas') as HTMLCanvasElement;
    stubCanvasRect(canvas);
    // Force setPointerCapture to throw — exercises the catch branch.
    canvas.setPointerCapture = () => {
      throw new Error('not supported');
    };
    canvas.releasePointerCapture = () => {
      throw new Error('not supported');
    };
    expect(() =>
      fireEvent.pointerDown(canvas, fakePointerEvent({ clientX: 130, clientY: 130 }))
    ).not.toThrow();
    // And pointerup with throwing release also should not throw.
    const upEv = new Event('pointerup') as PointerEvent;
    Object.defineProperties(upEv, { pointerId: { value: 1 } });
    expect(() => window.dispatchEvent(upEv)).not.toThrow();
  });
});

describe('PygameEditorCanvas — render branches', () => {
  it('renders the empty-canvas hint when no components are placed', () => {
    render(<PygameEditorCanvas {...baseProps} />);
    expect(
      screen.getByText(/Drag components here, or tap one to arm it/i)
    ).toBeInTheDocument();
  });

  it('hides the empty-canvas hint once a component is placed', () => {
    render(
      <PygameEditorCanvas
        {...baseProps}
        components={[
          { id: 'p1', componentId: 'ball', x: 0, y: 0, properties: {} },
        ]}
      />
    );
    expect(
      screen.queryByText(/Drag components here, or tap one to arm it/i)
    ).not.toBeInTheDocument();
  });

  it('hides the empty-canvas hint when armed (the prompt becomes the testid)', () => {
    render(<PygameEditorCanvas {...baseProps} armedComponentId="ball" />);
    expect(
      screen.queryByText(/Drag components here, or tap one to arm it/i)
    ).not.toBeInTheDocument();
  });

  it('runs the showGrid render branch without crashing', () => {
    expect(() =>
      render(<PygameEditorCanvas {...baseProps} showGrid={true} />)
    ).not.toThrow();
  });

  it('runs the isPlaying render branch (requestAnimationFrame loop) without crashing', () => {
    // jsdom has rAF; it shouldn't run synchronously and we cleanup on unmount.
    const { unmount } = render(
      <PygameEditorCanvas {...baseProps} isPlaying={true} />
    );
    expect(() => unmount()).not.toThrow();
  });

  it('focuses the canvas when armedComponentId becomes set', () => {
    const { rerender } = render(<PygameEditorCanvas {...baseProps} />);
    rerender(<PygameEditorCanvas {...baseProps} armedComponentId="ball" />);
    const canvas = screen.getByTestId('place-canvas-ball');
    expect(document.activeElement).toBe(canvas);
  });
});
