import { afterEach, describe, expect, it } from 'vitest';
import { controlledTime, createFakeCanvasContext } from '../helpers/simulator-harness';

// The simulator-harness lives in tests/helpers/ but it's a real module
// with branches the existing simulator tests didn't reach: the proxy's
// property-getter for tracked props (fillStyle/strokeStyle/etc) and the
// double-install guard on controlledTime(). Pin both so a future
// harness regression doesn't silently corrupt the simulator suite.

describe('createFakeCanvasContext — proxy getter for tracked props (line 68 truthy arm)', () => {
  it('returns the live property value when reading a tracked prop', () => {
    // Existing simulator tests only WRITE to fillStyle/strokeStyle —
    // they never READ them, so the `if (prop in props) return ...`
    // truthy arm of the proxy getter sat cold. A renderer that reads
    // its own previously-set fillStyle (e.g. to push/pop a state) must
    // see the value the test just wrote, not undefined.
    const { ctx } = createFakeCanvasContext();
    // Default values from the props bag.
    expect((ctx as unknown as { fillStyle: string }).fillStyle).toBe('#000000');
    expect((ctx as unknown as { strokeStyle: string }).strokeStyle).toBe('#000000');
    expect((ctx as unknown as { lineWidth: number }).lineWidth).toBe(1);
    expect((ctx as unknown as { globalAlpha: number }).globalAlpha).toBe(1);

    // After a write, reads reflect the new value.
    (ctx as unknown as { fillStyle: string }).fillStyle = '#ff0000';
    expect((ctx as unknown as { fillStyle: string }).fillStyle).toBe('#ff0000');
  });

  it('records property writes in the ledger so callers can assert order', () => {
    const harness = createFakeCanvasContext();
    (harness.ctx as unknown as { fillStyle: string }).fillStyle = '#abc123';
    (harness.ctx as unknown as { strokeStyle: string }).strokeStyle = '#fedcba';
    const ledger = harness.getLedger();
    expect(ledger).toEqual([
      { type: 'set:fillStyle', args: ['#abc123'] },
      { type: 'set:strokeStyle', args: ['#fedcba'] },
    ]);
  });

  it('records method calls (e.g. fillRect) in the ledger', () => {
    const harness = createFakeCanvasContext();
    (
      harness.ctx as unknown as { fillRect: (x: number, y: number, w: number, h: number) => void }
    ).fillRect(1, 2, 3, 4);
    expect(harness.getLedger()).toEqual([{ type: 'fillRect', args: [1, 2, 3, 4] }]);
  });

  it('clearLedger() empties the recorded calls', () => {
    const harness = createFakeCanvasContext();
    (harness.ctx as unknown as { fillStyle: string }).fillStyle = '#000';
    expect(harness.getLedger()).toHaveLength(1);
    harness.clearLedger();
    expect(harness.getLedger()).toHaveLength(0);
  });
});

describe('controlledTime — install/uninstall + double-install guard (line 112 truthy arm)', () => {
  let activeClocks: ReturnType<typeof controlledTime>[] = [];

  afterEach(() => {
    for (const c of activeClocks) c.uninstall();
    activeClocks = [];
  });

  it('install() makes performance.now() return the controlled value, advance() ticks it', () => {
    const clock = controlledTime(1000);
    activeClocks.push(clock);
    clock.install();
    expect(performance.now()).toBe(1000);
    clock.advance(50);
    expect(performance.now()).toBe(1050);
    clock.advance(2);
    expect(performance.now()).toBe(1052);
  });

  it('install() called twice is a no-op (line 112 truthy guard fires)', () => {
    // Without this guard the second install() would create a second
    // spyOn-on-spyOn, leaking the original mock so uninstall couldn't
    // restore. Pin the guard: a second install on an already-installed
    // clock should silently early-return; the same mock stays active.
    const clock = controlledTime(500);
    activeClocks.push(clock);
    clock.install();
    expect(performance.now()).toBe(500);
    // Second install — must NOT replace the existing spy.
    clock.install();
    clock.advance(7);
    // If install() had replaced the spy with a fresh one (current=500
    // re-bound on the new spy), the advance wouldn't be visible.
    // Because the truthy arm short-circuits, the original spy survived
    // and reads the SAME `current` variable through the closure.
    expect(performance.now()).toBe(507);
  });

  it('uninstall() restores the real performance.now()', () => {
    const realBefore = typeof performance.now();
    const clock = controlledTime(0);
    clock.install();
    clock.uninstall();
    // After uninstall, calling performance.now() returns a real number
    // (not the controlled 0). We can't assert the exact value but it
    // should be far above 0 in any real test runner.
    const afterRestore = performance.now();
    expect(typeof afterRestore).toBe(realBefore);
    expect(afterRestore).toBeGreaterThan(0);
  });

  it('uninstall() is idempotent (calling without install)', () => {
    const clock = controlledTime();
    expect(() => clock.uninstall()).not.toThrow();
    expect(() => clock.uninstall()).not.toThrow();
  });
});
