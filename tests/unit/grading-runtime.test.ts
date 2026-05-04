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

  it('checks acceptsUserInput', async () => {
    const ok = await validateRuntime('out', { acceptsUserInput: true }, 'hello', null);
    expect(ok[0].passed).toBe(true);
    const bad = await validateRuntime('out', { acceptsUserInput: true }, undefined, null);
    expect(bad[0].passed).toBe(false);
  });

  it('checks outputIncludesInput', async () => {
    const ok = await validateRuntime('Hello Pixel', { outputIncludesInput: true }, 'Pixel', null);
    expect(ok[0].passed).toBe(true);
    const bad = await validateRuntime('Hello there', { outputIncludesInput: true }, 'Pixel', null);
    expect(bad[0].passed).toBe(false);
  });
});
