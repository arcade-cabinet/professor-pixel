import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock react-dnd's useDrop the same way the palette test mocks useDrag —
// the editor's canvas registers as a drop target for palette items.
vi.mock('react-dnd', () => ({
  useDrop: () => [{ isOver: false }, () => {}, () => {}],
}));

// flushFrameBuffer + setCanvasContext are pygame-runtime side effects
// that pull in the simulator. They're harmless to call but noisy in
// jsdom — stub them.
vi.mock('@lib/pygame/runtime/simulator', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@lib/pygame/runtime/simulator');
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

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PygameEditorCanvas — render', () => {
  it('renders the canvas element with the default testid', () => {
    render(<PygameEditorCanvas {...baseProps} />);
    expect(screen.getByTestId('place-canvas')).toBeInTheDocument();
  });

  it('switches the testid when armedComponentId is set', () => {
    render(<PygameEditorCanvas {...baseProps} armedComponentId="ball" />);
    expect(screen.getByTestId('place-canvas-ball')).toBeInTheDocument();
  });

  it('Delete button is rendered when selectedId is non-null', () => {
    const onDelete = vi.fn();
    render(
      <PygameEditorCanvas
        {...baseProps}
        components={[{ id: 'p1', componentId: 'ball', x: 100, y: 100, properties: {} }]}
        selectedId="p1"
        onDelete={onDelete}
      />
    );
    const deleteBtn = screen
      .getAllByRole('button')
      .find((b) => /Delete/i.test(b.textContent ?? ''));
    expect(deleteBtn).toBeDefined();
    fireEvent.click(deleteBtn!);
    expect(onDelete).toHaveBeenCalledWith('p1');
  });

  it('Delete button is hidden when selectedId is null', () => {
    render(<PygameEditorCanvas {...baseProps} selectedId={null} />);
    const deleteBtn = screen
      .queryAllByRole('button')
      .find((b) => /Delete/i.test(b.textContent ?? ''));
    expect(deleteBtn).toBeUndefined();
  });
});

describe('PygameEditorCanvas — keyboard placement (armed mode)', () => {
  it('Enter places the armed component at the canvas center', () => {
    const onDrop = vi.fn();
    render(<PygameEditorCanvas {...baseProps} armedComponentId="ball" onDrop={onDrop} />);
    const canvas = screen.getByTestId('place-canvas-ball');
    fireEvent.keyDown(canvas, { key: 'Enter' });
    // The exact center coords depend on canvas.width/height which jsdom
    // doesn't honor when assigned in the useEffect. We only pin the id
    // forwarding + that *some* coords were emitted.
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop.mock.calls[0][0]).toBe('ball');
  });

  it('Space (\" \") places the armed component', () => {
    const onDrop = vi.fn();
    render(<PygameEditorCanvas {...baseProps} armedComponentId="ball" onDrop={onDrop} />);
    fireEvent.keyDown(screen.getByTestId('place-canvas-ball'), { key: ' ' });
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop.mock.calls[0][0]).toBe('ball');
  });

  it('non-Enter/Space keys are ignored', () => {
    const onDrop = vi.fn();
    render(<PygameEditorCanvas {...baseProps} armedComponentId="ball" onDrop={onDrop} />);
    fireEvent.keyDown(screen.getByTestId('place-canvas-ball'), { key: 'a' });
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('Enter is a no-op when no component is armed', () => {
    const onDrop = vi.fn();
    render(<PygameEditorCanvas {...baseProps} onDrop={onDrop} />);
    fireEvent.keyDown(screen.getByTestId('place-canvas'), { key: 'Enter' });
    expect(onDrop).not.toHaveBeenCalled();
  });
});

describe('PygameEditorCanvas — pointer placement', () => {
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

  it('armed-mode pointer down places the component at the click location', () => {
    const onDrop = vi.fn();
    render(<PygameEditorCanvas {...baseProps} armedComponentId="ball" onDrop={onDrop} />);
    const canvas = screen.getByTestId('place-canvas-ball');
    fireEvent.pointerDown(canvas, fakePointerEvent({ clientX: 100, clientY: 100 }));
    expect(onDrop).toHaveBeenCalled();
    // First arg matches the armed id.
    expect(onDrop.mock.calls[0][0]).toBe('ball');
  });

  it('clicking on empty canvas with no armed item deselects', () => {
    const onSelect = vi.fn();
    render(<PygameEditorCanvas {...baseProps} onSelect={onSelect} />);
    fireEvent.pointerDown(
      screen.getByTestId('place-canvas'),
      fakePointerEvent({ clientX: 1, clientY: 1 })
    );
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('touch pointer type does not throw on pointer down', () => {
    const onSelect = vi.fn();
    render(<PygameEditorCanvas {...baseProps} onSelect={onSelect} />);
    expect(() =>
      fireEvent.pointerDown(
        screen.getByTestId('place-canvas'),
        fakePointerEvent({
          pointerType: 'touch',
          clientX: 1,
          clientY: 1,
        })
      )
    ).not.toThrow();
    // jsdom getBoundingClientRect returns 0x0; the deselect arm fires
    // because the touch lands inside no component.
    expect(onSelect).toHaveBeenCalled();
  });
});
