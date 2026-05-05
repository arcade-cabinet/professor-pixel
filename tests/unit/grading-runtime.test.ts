import { describe, expect, it } from 'vitest';
import { validateRuntime } from '@lib/grading/runtime';

describe('validateRuntime', () => {
  it('returns empty when no rules', async () => {
    expect(await validateRuntime('hi', undefined, undefined)).toEqual([]);
  });

  it('checks outputContains', async () => {
    const r = await validateRuntime('Hello world', { outputContains: ['world'] }, undefined);
    expect(r).toHaveLength(1);
    expect(r[0].passed).toBe(true);
  });

  it('fails outputContains when missing', async () => {
    const r = await validateRuntime('hi', { outputContains: ['xyz'] }, undefined);
    expect(r[0].passed).toBe(false);
    expect(r[0].message).toContain('"xyz"');
  });

  it('checks outputMatches with regex', async () => {
    const r = await validateRuntime('age=42', { outputMatches: 'age=\\d+' }, undefined);
    expect(r[0].passed).toBe(true);
  });

  it('reports invalid regex without crashing', async () => {
    const r = await validateRuntime('any', { outputMatches: '[unclosed' }, undefined);
    expect(r[0].passed).toBe(false);
    expect(r[0].message).toContain('Invalid');
  });

  it('checks functionCalled against real call counts (sys.settrace), not stdout heuristic', async () => {
    // Function that was called: passes regardless of whether output mentions the name.
    const ok = await validateRuntime(
      'unrelated output',
      { functionCalled: ['greet'] },
      undefined,
      { functionCalls: { greet: 1 } }
    );
    expect(ok[0].passed).toBe(true);
    expect(ok[0].message).toContain('1×');

    // Function that's defined but never called (count = 0): fails.
    // Previously the stdout heuristic would have passed this if 'greet' appeared
    // in output. Now we fail it because the tracer says count is 0.
    const bad = await validateRuntime(
      'greet was here', // legacy heuristic would pass on this substring match
      { functionCalled: ['greet'] },
      undefined,
      { functionCalls: { greet: 0 } }
    );
    expect(bad[0].passed).toBe(false);
  });

  it('checks acceptsUserInput against real input() call count, not test-input shape', async () => {
    // Code that called input() at least once: passes.
    const ok = await validateRuntime('out', { acceptsUserInput: true }, 'hello', { inputCalls: 1 });
    expect(ok[0].passed).toBe(true);
    // Code that never called input() — even though the test provided input — fails.
    // (This is the new contract: previously passing input was enough; now you must use it.)
    const bad = await validateRuntime('out', { acceptsUserInput: true }, 'hello', { inputCalls: 0 });
    expect(bad[0].passed).toBe(false);
    // Default for inputCalls (omitted) is 0 → fails.
    const badDefault = await validateRuntime('out', { acceptsUserInput: true }, undefined);
    expect(badDefault[0].passed).toBe(false);
  });

  it('checks outputIncludesInput', async () => {
    const ok = await validateRuntime('Hello Pixel', { outputIncludesInput: true }, 'Pixel');
    expect(ok[0].passed).toBe(true);
    const bad = await validateRuntime('Hello there', { outputIncludesInput: true }, 'Pixel');
    expect(bad[0].passed).toBe(false);
  });

  describe('variableExists', () => {
    it('reads from the worker-collected globals snapshot, not main-thread Pyodide', async () => {
      // Existing names pass; absent names fail. The `globals` snapshot omits
      // names that were never defined (the worker contract), so `name in globals`
      // is the existence check.
      const r = await validateRuntime(
        '',
        { variableExists: ['x', 'y', 'z'] },
        undefined,
        { globals: { x: 0, y: '' } } // z absent → fails; x and y present (even though falsy) → pass
      );
      expect(r).toHaveLength(3);
      const byId = Object.fromEntries(r.map((rr) => [rr.id, rr]));
      expect(byId['runtime.variableExists:x'].passed).toBe(true);
      expect(byId['runtime.variableExists:y'].passed).toBe(true);
      expect(byId['runtime.variableExists:z'].passed).toBe(false);
    });

    it('treats falsy Python values (0, "", False) as defined — not as missing', async () => {
      // Regression guard: a previous Boolean(value) check would have failed
      // a student who set count = 0. The "in" operator distinguishes existence
      // from value because the worker omits absent names from the snapshot.
      const r = await validateRuntime(
        '',
        { variableExists: ['count', 'name', 'flag'] },
        undefined,
        { globals: { count: 0, name: '', flag: false } }
      );
      expect(r.every((rr) => rr.passed)).toBe(true);
    });

    it('fails everything when no globals snapshot was collected', async () => {
      // Empty `globals` (default) means no inspectGlobals were threaded — every
      // variableExists rule reports missing.
      const r = await validateRuntime('', { variableExists: ['x'] }, undefined);
      expect(r[0].passed).toBe(false);
      expect(r[0].message).toContain('should be defined');
    });
  });
});
