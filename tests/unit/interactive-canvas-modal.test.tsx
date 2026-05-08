// Drive the entity-config-modal flow in app/components/pygame/interactive-canvas.tsx
// (lines 81-110, 120-148, 416, 434, 452, 473, 491, 511, 522). The existing
// interactive-canvas-smoke.test.tsx renders the toolbar + entity list but
// stubs react-dnd with an inert useDrop that never fires the drop callback
// — so the entire setShowConfigModal pathway, the modal's onChange
// handlers, and handleSaveEntity stay uncovered.
//
// This suite captures the useDrop spec at mount time, fires drop({...}, monitor)
// manually to open the modal, then drives every Input.onChange in the
// modal body before clicking "Add Entity" to exercise handleSaveEntity.

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Capture the spec passed to useDrop so the test can fire its drop callback
// later. The collect() result + ref pair stays inert.
let capturedSpec:
  | {
      drop: (item: unknown, monitor: { getClientOffset: () => { x: number; y: number } | null }) => void;
      canDrop?: () => boolean;
    }
  | null = null;
vi.mock('react-dnd', () => ({
  useDrop: (specFn: () => unknown) => {
    capturedSpec = specFn() as typeof capturedSpec;
    return [{ isOver: false, canDrop: true }, () => {}, () => {}];
  },
}));

const toastMock = vi.fn();
vi.mock('@lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

import InteractiveGameCanvas from '@/components/pygame/interactive-canvas';
import type { GameConfig, Scene } from '@lib/types/schema';

function makeScene(): Scene {
  return {
    id: 'main',
    name: 'Main Scene',
    entities: [],
    width: 800,
    height: 600,
    gridSize: 20,
  };
}

function makeConfig(scene: Scene): GameConfig {
  return {
    id: 'g1',
    name: 'Test Game',
    version: 1,
    scenes: [scene],
    componentChoices: [],
    assets: [],
    settings: {} as GameConfig['settings'],
  };
}

// Wrap a drop call in act() so React processes the resulting state updates
// before the test makes its assertions. Calling capturedSpec.drop directly
// without act() lets setState fire outside of React's batch window — the
// modal-open state never flushes to the DOM.
function actDrop(item: unknown, offset: { x: number; y: number } | null) {
  act(() => {
    capturedSpec!.drop(item, { getClientOffset: () => offset });
  });
}

// Stub canvasRef.current.getBoundingClientRect — without a non-zero rect
// the drop handler's offset.x - rect.left math becomes NaN. Set it on every
// HTMLDivElement; the canvas drop zone is a div with the data-testid.
function stubAllRects() {
  HTMLDivElement.prototype.getBoundingClientRect = () =>
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

beforeEach(() => {
  capturedSpec = null;
  toastMock.mockReset();
  stubAllRects();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InteractiveGameCanvas — drop opens config modal', () => {
  it('firing drop with a sprite asset opens the modal with grid-snapped position', () => {
    const onConfigChange = vi.fn();
    render(
      <InteractiveGameCanvas
        gameConfig={makeConfig(makeScene())}
        onConfigChange={onConfigChange}
      />
    );
    expect(capturedSpec).not.toBeNull();
    // Initially the modal isn't open — the entity-name input doesn't exist.
    expect(screen.queryByTestId('input-entity-name')).not.toBeInTheDocument();
    // Fire drop({ ... }, monitor with getClientOffset returning a point).
    actDrop(
      {
        id: 'sprite-ball',
        type: 'entity',
        name: 'Ball',
        defaultProperties: { color: 'red' },
      },
      { x: 73, y: 48 }
    );
    // After drop, the modal opens — its name input renders.
    expect(screen.getByTestId('input-entity-name')).toBeInTheDocument();
    // gridSnap defaults to TRUE on initial render with gridSize=20 →
    // 73 snaps to 80, 48 snaps to 40 (lines 91-94).
    expect((screen.getByTestId('input-entity-x') as HTMLInputElement).value).toBe('80');
    expect((screen.getByTestId('input-entity-y') as HTMLInputElement).value).toBe('40');
  });

  it('drop with no client offset (offscreen drop) does NOT open the modal', () => {
    render(
      <InteractiveGameCanvas
        gameConfig={makeConfig(makeScene())}
        onConfigChange={vi.fn()}
      />
    );
    actDrop({ id: 'sprite-ball', type: 'entity', name: 'Ball' }, null);
    expect(screen.queryByTestId('input-entity-name')).not.toBeInTheDocument();
  });

  it('drop with type !== "entity" coerces dropped item to a decoration', () => {
    render(
      <InteractiveGameCanvas
        gameConfig={makeConfig(makeScene())}
        onConfigChange={vi.fn()}
      />
    );
    actDrop({ id: 'tree-1', type: 'sprite', name: 'Tree' }, { x: 100, y: 100 });
    // Modal opens with name 'Tree' — the type=='entity' ternary at line 100
    // falls to 'decoration' for non-entity items. We can't read the type
    // directly, but the modal renders → branch is exercised.
    expect(screen.getByTestId('input-entity-name')).toBeInTheDocument();
    expect((screen.getByTestId('input-entity-name') as HTMLInputElement).value).toBe(
      'Tree'
    );
  });
});

describe('InteractiveGameCanvas — modal input onChange handlers', () => {
  function openModal() {
    actDrop(
      {
        id: 'sprite-ball',
        type: 'entity',
        name: 'Ball',
        defaultProperties: {},
      },
      { x: 100, y: 100 }
    );
  }

  it('typing in the name input updates entity-name state (line 416)', () => {
    render(
      <InteractiveGameCanvas
        gameConfig={makeConfig(makeScene())}
        onConfigChange={vi.fn()}
      />
    );
    openModal();
    const nameInput = screen.getByTestId('input-entity-name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Beach Ball' } });
    expect(nameInput.value).toBe('Beach Ball');
  });

  it('typing in the X / Y position inputs updates state (lines 434, 452)', () => {
    render(
      <InteractiveGameCanvas
        gameConfig={makeConfig(makeScene())}
        onConfigChange={vi.fn()}
      />
    );
    openModal();
    const xInput = screen.getByTestId('input-entity-x') as HTMLInputElement;
    const yInput = screen.getByTestId('input-entity-y') as HTMLInputElement;
    fireEvent.change(xInput, { target: { value: '250' } });
    fireEvent.change(yInput, { target: { value: '300' } });
    expect(xInput.value).toBe('250');
    expect(yInput.value).toBe('300');
  });

  it('non-numeric values fall through the parseInt|0 fallback for X/Y', () => {
    render(
      <InteractiveGameCanvas
        gameConfig={makeConfig(makeScene())}
        onConfigChange={vi.fn()}
      />
    );
    openModal();
    const xInput = screen.getByTestId('input-entity-x') as HTMLInputElement;
    // type=number inputs in jsdom treat 'abc' as empty string → parseInt('') is NaN → ||0.
    fireEvent.change(xInput, { target: { value: '' } });
    expect(xInput.value).toBe('0');
  });

  it('typing in the width / height inputs updates state (lines 473, 491)', () => {
    render(
      <InteractiveGameCanvas
        gameConfig={makeConfig(makeScene())}
        onConfigChange={vi.fn()}
      />
    );
    openModal();
    const wInput = screen.getByTestId('input-entity-width') as HTMLInputElement;
    const hInput = screen.getByTestId('input-entity-height') as HTMLInputElement;
    fireEvent.change(wInput, { target: { value: '60' } });
    fireEvent.change(hInput, { target: { value: '60' } });
    expect(wInput.value).toBe('60');
    expect(hInput.value).toBe('60');
  });

  it('typing in the layer input updates state (line 511)', () => {
    render(
      <InteractiveGameCanvas
        gameConfig={makeConfig(makeScene())}
        onConfigChange={vi.fn()}
      />
    );
    openModal();
    const layerInput = screen.getByTestId('input-entity-layer') as HTMLInputElement;
    fireEvent.change(layerInput, { target: { value: '5' } });
    expect(layerInput.value).toBe('5');
  });
});

describe('InteractiveGameCanvas — handleSaveEntity (Add Entity button)', () => {
  it('clicking "Add Entity" calls onConfigChange with the new entity + closes the modal', () => {
    const onConfigChange = vi.fn();
    render(
      <InteractiveGameCanvas
        gameConfig={makeConfig(makeScene())}
        onConfigChange={onConfigChange}
      />
    );
    actDrop(
      {
        id: 'sprite-ball',
        type: 'entity',
        name: 'Ball',
        defaultProperties: {},
      },
      { x: 100, y: 100 }
    );
    const saveBtn = screen.getByTestId('button-save-entity');
    fireEvent.click(saveBtn);
    // onConfigChange fired with the new entity appended.
    expect(onConfigChange).toHaveBeenCalled();
    const updated = onConfigChange.mock.calls[0][0] as GameConfig;
    expect(updated.scenes[0].entities).toHaveLength(1);
    expect(updated.scenes[0].entities[0].name).toBe('Ball');
    // Toast was fired.
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Entity Added' })
    );
    // Modal closed — name input gone.
    expect(screen.queryByTestId('input-entity-name')).not.toBeInTheDocument();
  });

  it('clicking Cancel closes the modal without firing onConfigChange (line 522)', () => {
    const onConfigChange = vi.fn();
    render(
      <InteractiveGameCanvas
        gameConfig={makeConfig(makeScene())}
        onConfigChange={onConfigChange}
      />
    );
    actDrop(
      {
        id: 'sprite-ball',
        type: 'entity',
        name: 'Ball',
        defaultProperties: {},
      },
      { x: 100, y: 100 }
    );
    // Cancel button — first non-save button in the dialog footer.
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(onConfigChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('input-entity-name')).not.toBeInTheDocument();
  });
});
