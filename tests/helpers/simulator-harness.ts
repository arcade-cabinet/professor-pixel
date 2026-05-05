import { vi, type MockInstance } from 'vitest';

/**
 * Deterministic harness for `src/pygame/runtime/simulator.ts`. Two pieces:
 *
 * 1. **`createFakeCanvasContext()`** — a stub that recordsevery rendering call
 *    into a ledger instead of touching the DOM. The simulator's
 *    `flushFrameBuffer()` plays draw commands through whatever
 *    `CanvasRenderingContext2D` it was handed via `setCanvasContext`; this
 *    fake captures the resulting fillRect/arc/fill/etc. calls so tests can
 *    assert the right primitives were issued in the right order.
 *
 * 2. **`controlledTime()`** — installs a `vi.spyOn(performance, 'now')` that
 *    returns a programmable counter. The PygameClock implementation reads
 *    `performance.now()` each `tick()` to compute deltaTime; with a
 *    controlled clock, you can advance time by an exact number of ms and
 *    assert the resulting `getCurrentFPS()` reading.
 */

export interface CanvasCall {
  type: string;
  args: unknown[];
}

export interface FakeCanvasContext {
  ctx: CanvasRenderingContext2D;
  getLedger: () => readonly CanvasCall[];
  clearLedger: () => void;
}

export function createFakeCanvasContext(): FakeCanvasContext {
  const ledger: CanvasCall[] = [];
  const record = (type: string) =>
    function (...args: unknown[]) {
      ledger.push({ type, args });
    };

  // Property bag the simulator actually reads/writes. Track these as
  // setter assignments rather than discrete calls — that's how the renderer
  // touches them (`canvasContext.fillStyle = '#ff0000'`).
  const props: Record<string, unknown> = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
  };

  // Fake canvas the context dereferences for `canvasContext.canvas.width`.
  const fakeCanvas = { width: 800, height: 600 } as HTMLCanvasElement;

  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop) {
      if (prop === 'canvas') return fakeCanvas;
      if (prop in props) return props[prop as string];
      // Treat anything else as a method that records when called.
      const name = String(prop);
      if (target[name] === undefined) {
        target[name] = record(name);
      }
      return target[name];
    },
    set(_target, prop, value) {
      props[String(prop)] = value;
      ledger.push({ type: `set:${String(prop)}`, args: [value] });
      return true;
    },
  };

  const ctx = new Proxy({}, handler) as unknown as CanvasRenderingContext2D;

  return {
    ctx,
    getLedger: () => ledger,
    clearLedger: () => {
      ledger.length = 0;
    },
  };
}

export interface ControlledClock {
  now: () => number;
  /** Advance the clock by `ms` milliseconds. */
  advance: (ms: number) => void;
  install: () => void;
  uninstall: () => void;
}

export function controlledTime(startMs: number = 0): ControlledClock {
  let current = startMs;
  let spy: MockInstance | null = null;

  const clock: ControlledClock = {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
    install: () => {
      if (spy) return;
      spy = vi.spyOn(performance, 'now').mockImplementation(() => current);
    },
    uninstall: () => {
      spy?.mockRestore();
      spy = null;
    },
  };

  return clock;
}
