// Cover the useDrop spec callbacks in
// app/components/pygame/interactive-canvas.tsx (lines 109-110):
//   - canDrop: () => !isPlaying
//   - collect: (monitor) => ({ isOver, canDrop })
//
// The existing interactive-canvas-smoke suite mocks useDrop with a static
// `[{ isOver, canDrop }, ref]` and never invokes the spec, so these
// callbacks remain uncovered. Here we capture the spec on mount via a
// custom mock and invoke each callback manually with a fake monitor.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

interface CapturedSpec {
  accept: string;
  drop: (item: unknown, monitor: unknown) => void;
  canDrop: () => boolean;
  collect: (monitor: { isOver: () => boolean; canDrop: () => boolean }) => {
    isOver: boolean;
    canDrop: boolean;
  };
}

const captured: { spec: CapturedSpec | null } = { spec: null };

vi.mock('react-dnd', () => ({
  useDrop: (specFn: () => unknown) => {
    captured.spec = specFn() as CapturedSpec;
    return [{ isOver: false, canDrop: true }, () => {}, () => {}];
  },
}));

vi.mock('@lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import InteractiveGameCanvas from '@/components/pygame/interactive-canvas';
import type { GameConfig, Scene, Entity } from '@lib/types/schema';

function makeScene(): Scene {
  return {
    id: 'main',
    name: 'Main Scene',
    entities: [
      {
        id: 'e1',
        type: 'player',
        name: 'Hero',
        position: { x: 100, y: 100 },
        size: { width: 40, height: 40 },
        properties: {},
      } as Entity,
    ],
    width: 800,
    height: 600,
    gridSize: 20,
  };
}

function makeConfig(): GameConfig {
  return {
    id: 'g1',
    name: 'Test Game',
    version: 1,
    scenes: [makeScene()],
    componentChoices: [],
    assets: [],
    settings: {} as GameConfig['settings'],
  };
}

beforeEach(() => {
  captured.spec = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InteractiveGameCanvas — useDrop spec callbacks (lines 109-110)', () => {
  it('canDrop returns true when isPlaying is false (default state)', () => {
    render(<InteractiveGameCanvas gameConfig={makeConfig()} onConfigChange={vi.fn()} />);
    expect(captured.spec).not.toBeNull();
    // Default mount: isPlaying=false → canDrop returns !false === true.
    expect(captured.spec!.canDrop()).toBe(true);
  });

  it('collect maps monitor.isOver / monitor.canDrop to plain booleans', () => {
    render(<InteractiveGameCanvas gameConfig={makeConfig()} onConfigChange={vi.fn()} />);
    expect(captured.spec).not.toBeNull();

    expect(
      captured.spec!.collect({
        isOver: () => true,
        canDrop: () => true,
      })
    ).toEqual({ isOver: true, canDrop: true });

    expect(
      captured.spec!.collect({
        isOver: () => false,
        canDrop: () => false,
      })
    ).toEqual({ isOver: false, canDrop: false });
  });
});
