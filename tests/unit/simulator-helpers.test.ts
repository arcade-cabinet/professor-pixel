import { describe, expect, it, vi } from 'vitest';
import {
  handlePygameError,
  verifyPygameShimReady,
  getPygameStatus,
} from '@lib/pygame/runtime/simulator';

// PyodideInstance lives in the global ambient declaration
// (src/types/pyodide.d.ts); no import needed.

// Pure-function helpers in simulator.ts — testable without real Pyodide.

describe('handlePygameError — message routing', () => {
  it("classifies a 'display' error", () => {
    const out = handlePygameError(new Error('pygame display init failed'), 'init');
    expect(out).toContain('Display Error');
    expect(out).toContain('pygame display init failed');
  });

  it("classifies a 'mixer' error as audio", () => {
    const out = handlePygameError(new Error('pygame mixer init failed'), 'sounds');
    expect(out).toContain('Audio Error');
  });

  it("classifies a 'sound' error as audio (alternate keyword)", () => {
    const out = handlePygameError(new Error('pygame sound module missing'), 'sounds');
    expect(out).toContain('Audio Error');
  });

  it("classifies an 'image' error", () => {
    const out = handlePygameError(new Error('pygame image module not found'), 'load');
    expect(out).toContain('Image Error');
  });

  it("classifies a 'load' error as image (alternate keyword)", () => {
    const out = handlePygameError(new Error('pygame failed to load asset'), 'asset');
    expect(out).toContain('Image Error');
  });

  it("classifies an 'event' error as input", () => {
    const out = handlePygameError(new Error('pygame event queue overflow'), 'input');
    expect(out).toContain('Input Error');
  });

  it('falls back to generic pygame error for an unrecognized pygame keyword', () => {
    const out = handlePygameError(new Error('pygame mystery internal'), 'mystery-context');
    expect(out).toContain('Pygame Error');
    expect(out).toContain('mystery-context');
  });

  it('emits a non-pygame fallback for errors without "pygame" in the message', () => {
    const out = handlePygameError(new Error('TypeError: foo is undefined'), 'eval');
    expect(out).toContain('Error in eval');
    expect(out).not.toContain('Pygame Error');
  });

  it('is case-insensitive (uppercased keywords still match)', () => {
    const out = handlePygameError(new Error('Pygame DISPLAY failed'), 'init');
    expect(out).toContain('Display Error');
  });
});

describe('verifyPygameShimReady — verifier branches', () => {
  function fakePyodide(runPython: () => unknown): PyodideInstance {
    return { runPython, runPythonAsync: () => {} } as unknown as PyodideInstance;
  }

  it('returns false when pyodide is null', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(verifyPygameShimReady(null)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/not available/));
    warnSpy.mockRestore();
  });

  it('returns false when pyodide is undefined', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(verifyPygameShimReady(undefined)).toBe(false);
  });

  it('returns true when verifier reports pygame_available + basic_functionality', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const pyo = fakePyodide(() =>
      JSON.stringify({
        pygame_available: true,
        basic_functionality: true,
        rendering_bridge: true,
        errors: [],
      })
    );
    expect(verifyPygameShimReady(pyo)).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/successful/));
    logSpy.mockRestore();
  });

  it('returns false when pygame_available is false', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pyo = fakePyodide(() =>
      JSON.stringify({
        pygame_available: false,
        basic_functionality: false,
        rendering_bridge: false,
        errors: ['module missing'],
      })
    );
    expect(verifyPygameShimReady(pyo)).toBe(false);
    warnSpy.mockRestore();
  });

  it('returns false when verifier emits non-JSON', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pyo = fakePyodide(() => 'not even close to JSON');
    expect(verifyPygameShimReady(pyo)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/non-JSON/), expect.any(Object));
    warnSpy.mockRestore();
  });

  it('returns false when JSON shape fails schema validation', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // pygame_available is supposed to be boolean — this string slips
    // past JSON.parse but fails the zod schema.
    const pyo = fakePyodide(() =>
      JSON.stringify({
        pygame_available: 'yes',
        basic_functionality: true,
        rendering_bridge: true,
        errors: [],
      })
    );
    expect(verifyPygameShimReady(pyo)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/schema validation/),
      expect.any(Object)
    );
    warnSpy.mockRestore();
  });

  it('returns false when runPython throws (outer catch)', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const pyo = fakePyodide(() => {
      throw new Error('Pyodide not initialized');
    });
    expect(verifyPygameShimReady(pyo)).toBe(false);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('getPygameStatus — null/undefined pyodide', () => {
  it('returns isAvailable=false when pyodide is null', () => {
    const status = getPygameStatus(null);
    expect(status.isAvailable).toBe(false);
    expect(status.errors.length).toBeGreaterThan(0);
  });

  it('returns isAvailable=false when pyodide is undefined', () => {
    const status = getPygameStatus(undefined);
    expect(status.isAvailable).toBe(false);
  });
});
