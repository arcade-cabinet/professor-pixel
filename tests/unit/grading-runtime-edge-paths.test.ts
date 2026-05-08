// Cover the runtime.ts branches the existing grading-runtime.test.ts skips:
//   - line 89: `functionCalls[name] ?? 0` fallback when `name` isn't in
//     the map at all (sys.settrace tracer didn't report a count for
//     this function — distinct from explicit count = 0)
//   - line 65: outputMatches ternary middle branch (ok = true, no err)
//     — the existing test asserts the regex matches but the message
//     branch is the explicit "Output matches /pattern/" line, not the
//     "Output should match" fallback

import { describe, expect, it } from 'vitest';
import { validateRuntime } from '@lib/grading/runtime';

describe('validateRuntime — functionCalled `?? 0` fallback (line 89)', () => {
  it('returns count=0 when the name is missing from functionCalls map (no extras)', async () => {
    const r = await validateRuntime('out', { functionCalled: ['greet'] }, undefined, {
      // Empty functionCalls — `functionCalls['greet']` returns undefined,
      // the `?? 0` evaluates to 0, count > 0 is false → rule fails.
      functionCalls: {},
    });
    expect(r[0].passed).toBe(false);
    expect(r[0].message).toContain('Make sure greet()');
  });

  it('returns count=0 when extras itself is undefined', async () => {
    const r = await validateRuntime('out', { functionCalled: ['hello'] }, undefined);
    // No extras → `functionCalls` parameter defaults to {} so the
    // fallback fires for every requested function.
    expect(r[0].passed).toBe(false);
  });
});

describe('validateRuntime — outputMatches success-path message (line 65)', () => {
  it('emits the "Output matches /pattern/" message when regex matches', async () => {
    const r = await validateRuntime('age=42', { outputMatches: 'age=\\d+' }, undefined);
    expect(r[0].passed).toBe(true);
    // Pin the message wording so refactors that drop the helpful slash-
    // delimited pattern surface as a string-match failure.
    expect(r[0].message).toBe('Output matches /age=\\d+/');
  });

  it('emits the "Output should match" message when regex does not match', async () => {
    const r = await validateRuntime('foo', { outputMatches: 'bar' }, undefined);
    expect(r[0].passed).toBe(false);
    expect(r[0].message).toBe('Output should match /bar/');
  });
});
