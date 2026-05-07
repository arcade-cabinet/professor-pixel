import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPygameDiagnostics,
  flushFrameBuffer,
  getCurrentFPS,
  getFrameBuffer,
  pygameShim,
  resetPygameState,
  setCanvasContext,
} from '@lib/pygame/runtime/simulator';

// Cover the rendering bridge in simulator.ts:
//   setCanvasContext / resetPygameState / getCurrentFPS / getFrameBuffer
//   flushFrameBuffer (each draw-command branch in its switch)
//   createPygameDiagnostics (null-pyodide and runPython-throws paths)
//
// Frame buffer is module-private. We populate it through the public
// pygameShim by calling display.set_mode() to get a "main" surface,
// then routing draw calls through it. setCanvasContext(ctx) flips
// isRenderingActive on so subsequent shim calls actually push.

function fakeCtx(): CanvasRenderingContext2D {
  const canvas = { width: 800, height: 600 } as HTMLCanvasElement;
  return {
    canvas,
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    closePath: vi.fn(),
    ellipse: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
  } as unknown as CanvasRenderingContext2D;
}

beforeEach(() => {
  resetPygameState();
  setCanvasContext(null);
});

afterEach(() => {
  resetPygameState();
  setCanvasContext(null);
  vi.restoreAllMocks();
});

describe('setCanvasContext + resetPygameState', () => {
  it('logs on connect and disconnect', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = fakeCtx();
    setCanvasContext(ctx);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Canvas context connected/));
    setCanvasContext(null);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Canvas context disconnected/));
  });

  it('resetPygameState empties the frame buffer + restores 60 FPS default', () => {
    const ctx = fakeCtx();
    setCanvasContext(ctx);
    // Push a clear via display.set_mode while rendering is active.
    pygameShim.display.set_mode([800, 600]);
    expect(getFrameBuffer().length).toBeGreaterThan(0);
    resetPygameState();
    expect(getFrameBuffer().length).toBe(0);
    expect(getCurrentFPS()).toBe(60);
  });
});

describe('getFrameBuffer + getCurrentFPS', () => {
  it('returns a snapshot of the frame buffer', () => {
    expect(Array.isArray(getFrameBuffer())).toBe(true);
  });

  it('default FPS is 60', () => {
    expect(getCurrentFPS()).toBe(60);
  });
});

describe('flushFrameBuffer — short-circuits', () => {
  it('returns early when canvas context is null (even with buffered commands)', () => {
    // No ctx connected → no-op even with commands pending.
    expect(() => flushFrameBuffer()).not.toThrow();
  });

  it('returns early when buffer is empty', () => {
    const ctx = fakeCtx();
    setCanvasContext(ctx);
    flushFrameBuffer();
    expect(ctx.clearRect).not.toHaveBeenCalled();
  });
});

describe('flushFrameBuffer — draw command branches', () => {
  it('handles fill commands (Surface.fill via shim)', () => {
    const ctx = fakeCtx();
    setCanvasContext(ctx);
    const screen = pygameShim.display.set_mode([800, 600]);
    // set_mode pushes a 'clear' on the main surface; surface.fill pushes a 'fill'.
    screen.fill([255, 0, 0]);
    flushFrameBuffer();
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(getFrameBuffer().length).toBe(0); // drained in finally
  });

  it('handles circle draw commands', () => {
    const ctx = fakeCtx();
    setCanvasContext(ctx);
    const screen = pygameShim.display.set_mode([800, 600]);
    pygameShim.draw.circle(screen, [255, 255, 0], [50, 50], 10);
    flushFrameBuffer();
    expect(ctx.arc).toHaveBeenCalledWith(50, 50, 10, 0, 2 * Math.PI);
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('handles rect draw commands', () => {
    const ctx = fakeCtx();
    setCanvasContext(ctx);
    const screen = pygameShim.display.set_mode([800, 600]);
    pygameShim.draw.rect(screen, [0, 0, 255], [10, 20, 30, 40]);
    flushFrameBuffer();
    // Two fillRect calls: one from 'clear' fallback? No — clear uses clearRect.
    // 'rect' branch hits fillRect with the supplied bbox.
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 30, 40);
  });

  it('handles line draw commands', () => {
    const ctx = fakeCtx();
    setCanvasContext(ctx);
    const screen = pygameShim.display.set_mode([800, 600]);
    pygameShim.draw.line(screen, [0, 255, 0], [0, 0], [100, 100], 2);
    flushFrameBuffer();
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 100);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('handles polygon draw commands (decomposes to line segments)', () => {
    const ctx = fakeCtx();
    setCanvasContext(ctx);
    const screen = pygameShim.display.set_mode([800, 600]);
    pygameShim.draw.polygon(screen, [255, 0, 255], [
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    flushFrameBuffer();
    // polygon shim emits N 'line' commands (one per edge), so stroke fires.
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('catches exceptions during draw + still drains the buffer', () => {
    // Force fillRect to throw on the clear-from-set_mode path.
    const ctx = fakeCtx();
    (ctx.clearRect as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('canvas wedged');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setCanvasContext(ctx);
    pygameShim.display.set_mode([800, 600]); // queues a 'clear'
    expect(() => flushFrameBuffer()).not.toThrow();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringMatching(/rendering error/),
      expect.any(Error)
    );
    // Buffer must be drained even though the draw threw.
    expect(getFrameBuffer().length).toBe(0);
  });
});

describe('createPygameDiagnostics — null pyodide', () => {
  it('fullReport returns the not-available message', () => {
    const diag = createPygameDiagnostics(null);
    expect(diag.fullReport()).toMatch(/not available/i);
  });

  it('quickCheck returns false', () => {
    const diag = createPygameDiagnostics(null);
    expect(diag.quickCheck()).toBe(false);
  });

  it('moduleStatus returns an empty object', () => {
    const diag = createPygameDiagnostics(null);
    expect(diag.moduleStatus()).toEqual({});
  });
});

describe('createPygameDiagnostics — runPython throws', () => {
  function pyodideThatThrows() {
    return {
      runPython: () => {
        throw new Error('pyodide gone');
      },
      runPythonAsync: () => {},
    } as unknown as PyodideInstance;
  }

  it('fullReport returns the diagnostics-error string', () => {
    const diag = createPygameDiagnostics(pyodideThatThrows());
    expect(diag.fullReport()).toMatch(/Diagnostics error/);
  });

  it('quickCheck returns false when runPython throws', () => {
    const diag = createPygameDiagnostics(pyodideThatThrows());
    expect(diag.quickCheck()).toBe(false);
  });

  it('moduleStatus returns the failure marker', () => {
    const diag = createPygameDiagnostics(pyodideThatThrows());
    expect(diag.moduleStatus()).toEqual({ error: 'Failed to check module status' });
  });
});
