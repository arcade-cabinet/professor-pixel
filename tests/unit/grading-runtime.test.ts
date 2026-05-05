import { describe, expect, it } from 'vitest';
import { validateRuntime } from '@lib/grading/runtime';

describe('validateRuntime', () => {
  it('returns empty when no rules', async () => {
    expect(await validateRuntime('hi', undefined, undefined, null)).toEqual([]);
  });

  it('checks outputContains', async () => {
    const r = await validateRuntime('Hello world', { outputContains: ['world'] }, undefined, null);
    expect(r).toHaveLength(1);
    expect(r[0].passed).toBe(true);
  });

  it('fails outputContains when missing', async () => {
    const r = await validateRuntime('hi', { outputContains: ['xyz'] }, undefined, null);
    expect(r[0].passed).toBe(false);
    expect(r[0].message).toContain('"xyz"');
  });

  it('checks outputMatches with regex', async () => {
    const r = await validateRuntime('age=42', { outputMatches: 'age=\\d+' }, undefined, null);
    expect(r[0].passed).toBe(true);
  });

  it('reports invalid regex without crashing', async () => {
    const r = await validateRuntime('any', { outputMatches: '[unclosed' }, undefined, null);
    expect(r[0].passed).toBe(false);
    expect(r[0].message).toContain('Invalid');
  });

  it('checks functionCalled against real call counts (sys.settrace), not stdout heuristic', async () => {
    // Function that was called: passes regardless of whether output mentions the name.
    const ok = await validateRuntime(
      'unrelated output',
      { functionCalled: ['greet'] },
      undefined,
      null,
      0,
      { greet: 1 }
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
      null,
      0,
      { greet: 0 }
    );
    expect(bad[0].passed).toBe(false);
  });

  it('checks acceptsUserInput against real input() call count, not test-input shape', async () => {
    // Code that called input() at least once: passes.
    const ok = await validateRuntime('out', { acceptsUserInput: true }, 'hello', null, 1);
    expect(ok[0].passed).toBe(true);
    // Code that never called input() — even though the test provided input — fails.
    // (This is the new contract: previously passing input was enough; now you must use it.)
    const bad = await validateRuntime('out', { acceptsUserInput: true }, 'hello', null, 0);
    expect(bad[0].passed).toBe(false);
    // Default for inputCalls (omitted) is 0 → fails.
    const badDefault = await validateRuntime('out', { acceptsUserInput: true }, undefined, null);
    expect(badDefault[0].passed).toBe(false);
  });

  it('checks outputIncludesInput', async () => {
    const ok = await validateRuntime('Hello Pixel', { outputIncludesInput: true }, 'Pixel', null);
    expect(ok[0].passed).toBe(true);
    const bad = await validateRuntime('Hello there', { outputIncludesInput: true }, 'Pixel', null);
    expect(bad[0].passed).toBe(false);
  });
});
