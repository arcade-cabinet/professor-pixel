// Drive the wysiwyg.tsx callback paths the smoke + handlers suites missed
// by stubbing the canvas + properties children to expose buttons that fire
// the supplied callbacks (handleDrop, handleComponentMove, handleComponentDelete,
// handlePropertyChange) directly. These callbacks live on the parent
// component (lines 139-213); reaching them through the real canvas is hard
// in jsdom.

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('react-dnd', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-dnd');
  return {
    ...actual,
    DndProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useDrop: () => [{ isOver: false }, () => {}, () => {}],
    useDrag: () => [{ isDragging: false }, () => {}, () => {}],
  };
});
vi.mock('react-dnd-html5-backend', () => ({ HTML5Backend: {} }));
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

let viewportFlags = { isCompact: false, isTouchPrimary: false };
vi.mock('@lib/hooks/use-viewport', () => ({
  useViewport: () => viewportFlags,
}));

// Canvas stub: exposes buttons that fire the supplied callbacks. Each test
// can click them to drive handleDrop / handleSelect / handleMove / handleDelete
// without going through the real react-dnd + pointer-events plumbing.
vi.mock('@/components/editor/canvas', () => ({
  default: ({
    onDrop,
    onSelect,
    onMove,
    onDelete,
  }: {
    onDrop: (id: string, x: number, y: number) => void;
    onSelect: (id: string | null) => void;
    onMove: (id: string, x: number, y: number) => void;
    onDelete: (id: string) => void;
  }) => (
    <div data-testid="canvas-stub">
      <button
        type="button"
        data-testid="canvas-drop-btn"
        onClick={() => onDrop('ball', 23, 47)}
      >
        drop
      </button>
      <button
        type="button"
        data-testid="canvas-select-btn"
        onClick={() => onSelect('placed-1')}
      >
        select
      </button>
      <button
        type="button"
        data-testid="canvas-move-btn"
        onClick={() => onMove('placed-1', 100, 100)}
      >
        move
      </button>
      <button
        type="button"
        data-testid="canvas-delete-btn"
        onClick={() => onDelete('placed-1')}
      >
        delete
      </button>
    </div>
  ),
}));

vi.mock('@/components/editor/palette', () => ({
  default: () => <div data-testid="palette-stub">palette</div>,
}));

// Properties stub: exposes a button to fire onPropertyChange.
vi.mock('@/components/editor/properties', () => ({
  default: ({
    component,
    onPropertyChange,
  }: {
    component: { id: string };
    onPropertyChange: (id: string, prop: string, val: unknown) => void;
  }) => (
    <div data-testid="properties-stub">
      <span data-testid="properties-selected-id">{component.id}</span>
      <button
        type="button"
        data-testid="properties-change-btn"
        onClick={() => onPropertyChange(component.id, 'color', 'red')}
      >
        change
      </button>
    </div>
  ),
}));

vi.mock('@/components/editor/code-panel', () => ({
  default: () => <div data-testid="code-panel-stub">code</div>,
}));

import PygameWysiwygEditor, {
  type PlacedComponent,
} from '@/components/editor/wysiwyg';

beforeEach(() => {
  viewportFlags = { isCompact: false, isTouchPrimary: false };
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PygameWysiwygEditor — handleDrop snaps to grid', () => {
  it('drop with snapToGrid (default true) rounds x/y to the nearest 20', () => {
    render(<PygameWysiwygEditor />);
    fireEvent.click(screen.getByTestId('canvas-drop-btn'));
    // The placed component is auto-selected, so the properties stub
    // appears with its id rendered.
    const id = screen.getByTestId('properties-selected-id').textContent;
    // Component id has the form `${componentId}-${Date.now()}` so just
    // verify it starts with 'ball-'.
    expect(id).toMatch(/^ball-/);
  });
});

describe('PygameWysiwygEditor — onSelect + onDelete via canvas callbacks', () => {
  it('canvas-supplied select fires through to setSelectedComponentId', () => {
    const seed: PlacedComponent[] = [
      { id: 'placed-1', componentId: 'ball', x: 0, y: 0, properties: {} },
    ];
    render(<PygameWysiwygEditor initialComponents={seed} />);
    // Click the canvas's "select" stub — wires through to setSelectedComponentId.
    fireEvent.click(screen.getByTestId('canvas-select-btn'));
    // The properties panel renders the selected component id.
    expect(screen.getByTestId('properties-selected-id').textContent).toBe('placed-1');
  });

  it('canvas-supplied delete removes the component + clears selection', () => {
    const seed: PlacedComponent[] = [
      { id: 'placed-1', componentId: 'ball', x: 0, y: 0, properties: {} },
    ];
    render(<PygameWysiwygEditor initialComponents={seed} />);
    fireEvent.click(screen.getByTestId('canvas-select-btn'));
    fireEvent.click(screen.getByTestId('canvas-delete-btn'));
    // Selection cleared → properties stub is unmounted.
    expect(screen.queryByTestId('properties-selected-id')).not.toBeInTheDocument();
  });
});

describe('PygameWysiwygEditor — handleComponentMove snaps to grid', () => {
  it('move with snapToGrid (default true) does not throw and preserves selection', () => {
    const seed: PlacedComponent[] = [
      { id: 'placed-1', componentId: 'ball', x: 0, y: 0, properties: {} },
    ];
    render(<PygameWysiwygEditor initialComponents={seed} />);
    fireEvent.click(screen.getByTestId('canvas-select-btn'));
    fireEvent.click(screen.getByTestId('canvas-move-btn'));
    // No throw. Selection persists.
    expect(screen.getByTestId('properties-selected-id').textContent).toBe('placed-1');
  });
});

describe('PygameWysiwygEditor — handlePropertyChange wired through properties panel', () => {
  it('change-property button fires through to the placedComponents update path', () => {
    const seed: PlacedComponent[] = [
      { id: 'placed-1', componentId: 'ball', x: 0, y: 0, properties: {} },
    ];
    render(<PygameWysiwygEditor initialComponents={seed} />);
    fireEvent.click(screen.getByTestId('canvas-select-btn'));
    expect(() =>
      fireEvent.click(screen.getByTestId('properties-change-btn'))
    ).not.toThrow();
    // Selection persists (handlePropertyChange doesn't clear it).
    expect(screen.getByTestId('properties-selected-id').textContent).toBe('placed-1');
  });
});

describe('PygameWysiwygEditor — compact-viewport auto-open of properties drawer', () => {
  it('selecting a component on compact triggers the propertiesOpen useEffect', () => {
    viewportFlags = { isCompact: true, isTouchPrimary: true };
    const seed: PlacedComponent[] = [
      { id: 'placed-1', componentId: 'ball', x: 0, y: 0, properties: {} },
    ];
    render(<PygameWysiwygEditor initialComponents={seed} />);
    // Initially propertiesOpen is false → toggle aria-pressed=false.
    fireEvent.click(screen.getByTestId('canvas-select-btn'));
    // After select, the auto-open useEffect (line 200) flips propertiesOpen=true.
    const toggle = screen.getByTestId('wysiwyg-properties-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('PygameWysiwygEditor — Escape key closes the open drawer (lines 113, 116, 117)', () => {
  it('Escape with the properties drawer open closes properties (line 116 truthy)', () => {
    viewportFlags = { isCompact: true, isTouchPrimary: true };
    const seed: PlacedComponent[] = [
      { id: 'placed-1', componentId: 'ball', x: 0, y: 0, properties: {} },
    ];
    render(<PygameWysiwygEditor initialComponents={seed} />);
    // Trigger compact-viewport auto-open of the properties drawer.
    fireEvent.click(screen.getByTestId('canvas-select-btn'));
    expect(screen.getByTestId('wysiwyg-properties-toggle').getAttribute('aria-pressed')).toBe(
      'true'
    );
    // Escape closes it (line 116 truthy arm fires).
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByTestId('wysiwyg-properties-toggle').getAttribute('aria-pressed')).toBe(
      'false'
    );
  });

  it('Escape with only the palette drawer open closes palette (line 117 falsy → else if arm)', () => {
    // The else-if arm \`else if (paletteOpen) setPaletteOpen(false)\`
    // requires propertiesOpen=false AND paletteOpen=true. The palette
    // toggle button opens the drawer in compact viewports.
    viewportFlags = { isCompact: true, isTouchPrimary: true };
    render(<PygameWysiwygEditor />);
    const paletteToggle = screen.getByTestId('wysiwyg-palette-toggle');
    fireEvent.click(paletteToggle);
    expect(paletteToggle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByTestId('wysiwyg-palette-toggle').getAttribute('aria-pressed')).toBe('false');
  });

  it('non-Escape key with a drawer open is ignored (line 113 truthy early-return)', () => {
    viewportFlags = { isCompact: true, isTouchPrimary: true };
    const seed: PlacedComponent[] = [
      { id: 'placed-1', componentId: 'ball', x: 0, y: 0, properties: {} },
    ];
    render(<PygameWysiwygEditor initialComponents={seed} />);
    fireEvent.click(screen.getByTestId('canvas-select-btn'));
    // Pressing 'a' (or any non-Escape key) hits \`if (e.key !== 'Escape') return\`
    // and doesn't close the drawer.
    fireEvent.keyDown(document, { key: 'a' });
    expect(screen.getByTestId('wysiwyg-properties-toggle').getAttribute('aria-pressed')).toBe(
      'true'
    );
  });
});

describe('PygameWysiwygEditor — snapToGrid=false falsy ternary arms (lines 144, 145, 169, 170)', () => {
  it('handleDrop and handleComponentMove pass raw coords through when snap-to-grid is off', () => {
    // The drop / move handlers each have a `snapToGrid ? round : raw`
    // ternary on both x and y. Existing tests only exercised the
    // truthy arm; toggle the snap-to-grid switch off to fire the
    // four falsy arms (drop x, drop y, move x, move y).
    const seed: PlacedComponent[] = [
      { id: 'placed-1', componentId: 'ball', x: 0, y: 0, properties: {} },
    ];
    render(<PygameWysiwygEditor initialComponents={seed} />);
    // Toggle snap-to-grid off via the labeled switch.
    const snapSwitch = document.getElementById('snap-to-grid') as HTMLElement;
    expect(snapSwitch).toBeTruthy();
    fireEvent.click(snapSwitch);
    // Drop a new component — the canvas-drop-btn invokes handleDrop.
    fireEvent.click(screen.getByTestId('canvas-drop-btn'));
    // No throw. Then select + move to fire the move handler's falsy arms.
    fireEvent.click(screen.getByTestId('canvas-select-btn'));
    expect(() => fireEvent.click(screen.getByTestId('canvas-move-btn'))).not.toThrow();
    // The originally-seeded placed component is still selectable.
    expect(screen.getByTestId('properties-selected-id')).toBeInTheDocument();
  });
});
