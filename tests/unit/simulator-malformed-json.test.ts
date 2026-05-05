// Omnibus task-003 — verifyPygameShimReady and getPygameStatus both
// JSON.parse the output of a python-side json.dumps. The outer
// try/catch in each function would catch a parse error today, but
// emits a generic "Error during ..." message that doesn't help a dev
// triage template-emit-error vs glue-error. The inline guards added
// alongside log a parse-specific warning AND lock the safe-default
// fallback if a future refactor moves the outer try.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { verifyPygameShimReady, getPygameStatus } from '@lib/pygame/runtime/simulator';

interface FakePyodide {
  runPython: (src: string) => unknown;
  globals?: { set?: (k: string, v: unknown) => void };
}

function makeFakePyodide(returnValue: unknown): FakePyodide {
  return {
    runPython: () => returnValue,
    globals: { set: () => {} },
  };
}

describe('simulator JSON.parse guards (omnibus task-003)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('verifyPygameShimReady', () => {
    it('returns false and logs parse-specific warning on non-JSON output', () => {
      const pyodide = makeFakePyodide('hello stray print\n{"pygame_available": true}');
      const result = verifyPygameShimReady(pyodide as never);
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
      const message = warnSpy.mock.calls[0][0];
      expect(message).toMatch(/non-JSON/);
    });

    it('returns true on a well-formed positive verification (regression guard)', () => {
      const pyodide = makeFakePyodide(
        JSON.stringify({
          pygame_available: true,
          basic_functionality: true,
          rendering_bridge: true,
          errors: [],
        })
      );
      expect(verifyPygameShimReady(pyodide as never)).toBe(true);
    });

    it('returns false (no errors[] crash) when verification reports failure with no errors array', () => {
      // Defensive: even a well-formed but errors-less response should
      // not crash on the join.
      const pyodide = makeFakePyodide(
        JSON.stringify({ pygame_available: false, basic_functionality: false })
      );
      expect(verifyPygameShimReady(pyodide as never)).toBe(false);
    });

    it('returns false on JSON-valid but shape-invalid output (schema guard)', () => {
      // pygame_available as a string would be truthy and report
      // ready off a non-boolean — schema fails closed instead.
      const pyodide = makeFakePyodide(
        JSON.stringify({ pygame_available: 'yes', basic_functionality: 'yes' })
      );
      expect(verifyPygameShimReady(pyodide as never)).toBe(false);
    });
  });

  describe('getPygameStatus', () => {
    it('returns the default safe status with malformed-JSON marker on non-JSON output', () => {
      const pyodide = makeFakePyodide('not json at all');
      const result = getPygameStatus(pyodide as never);
      expect(result.isAvailable).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/malformed JSON/)])
      );
      expect(warnSpy).toHaveBeenCalled();
    });

    it('returns parsed status when JSON is well-formed (regression guard)', () => {
      const pyodide = makeFakePyodide(
        JSON.stringify({
          isAvailable: true,
          modules: ['pygame'],
          errors: [],
          capabilities: ['draw', 'display', 'event'],
          renderingBridge: true,
        })
      );
      const result = getPygameStatus(pyodide as never);
      expect(result.isAvailable).toBe(true);
      expect(result.modules).toContain('pygame');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('returns default safe status on JSON-valid but shape-wrong payload (schema guard)', () => {
      // errors as null rather than [] would crash any caller that
      // expected to .join it. Schema fails closed.
      const pyodide = makeFakePyodide(
        JSON.stringify({ isAvailable: true, modules: [], errors: null, capabilities: [] })
      );
      const result = getPygameStatus(pyodide as never);
      expect(result.isAvailable).toBe(false);
      expect(result.errors.some((e) => /mis-shaped/.test(e))).toBe(true);
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
