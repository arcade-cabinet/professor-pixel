import { describe, expect, it } from 'vitest';
import { strings } from '@lib/i18n/strings';

// strings.ts is the user-facing copy catalog — a deeply-nested object of
// strings, arrays of strings, and interpolation functions. Coverage was
// at 17% because most callers hit one or two domains at a time.
//
// These tests do a deep traversal that touches every leaf:
//   * Plain strings: assert non-empty.
//   * Arrays of strings: assert each entry non-empty.
//   * Functions: invoke with synthetic arguments matching the signature
//     and assert the result is a non-empty string.
//
// This pins the catalog's surface (no leaf accidentally collapses to "")
// and as a side effect drives the function-execution coverage from ~13%
// to nearly 100%.

type Leaf = string | ((...args: unknown[]) => string);

describe('strings — top-level domains exist', () => {
  it.each([
    'chrome',
    'home',
    'lessons',
    'lesson',
    'profile',
    'wizard',
    'play',
    'help',
  ])('has the %s domain', (key) => {
    expect(strings).toHaveProperty(key);
    expect(typeof strings[key as keyof typeof strings]).toBe('object');
  });
});

describe('strings — every leaf string is non-empty', () => {
  function walk(node: unknown, path: string[], visit: (leaf: Leaf, path: string[]) => void): void {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'function') {
      visit(node as Leaf, path);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, [...path, String(i)], visit));
      return;
    }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        walk(v, [...path, k], visit);
      }
    }
  }

  // Probe values for interpolation functions. We don't know the parameter
  // names, but every function in this catalog takes one or two
  // string|number args and returns a string. We invoke with both a
  // string and a number in case the function does any arithmetic — the
  // result must still be a non-empty string.
  function tryInvoke(fn: (...args: unknown[]) => string): string {
    const candidates: unknown[][] = [
      [],
      ['probe'],
      [42],
      ['probe', 'state'],
      ['title', 'state'],
      [10, 'context'],
      [3, 5],
    ];
    let lastErr: unknown;
    for (const args of candidates) {
      try {
        const out = fn(...args);
        if (typeof out === 'string' && out.length > 0) return out;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error('no candidate args produced a string');
  }

  it('every leaf string is non-empty and every leaf function returns a non-empty string when invoked', () => {
    const failures: string[] = [];
    walk(strings, [], (leaf, path) => {
      const where = path.join('.');
      try {
        if (typeof leaf === 'string') {
          if (leaf.length === 0) failures.push(`empty string at ${where}`);
        } else {
          // function
          const out = tryInvoke(leaf);
          if (out.length === 0) failures.push(`function returned empty at ${where}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        failures.push(`function threw at ${where}: ${msg}`);
      }
    });
    expect(failures).toEqual([]);
  });
});

describe('strings — known interpolation functions produce expected substrings', () => {
  // Spot-check the functions whose arguments we know: pin that the
  // interpolation actually substitutes the values, not just that the
  // function returns a non-empty string.
  it('lessons.overall.keepGoing(pct) embeds the pct value', () => {
    const out = strings.lessons.overall.keepGoing(42);
    expect(out).toContain('42');
  });

  it('lessons.status.inProgress(pct) embeds the pct value', () => {
    const out = strings.lessons.status.inProgress(75);
    expect(out).toContain('75');
  });

  it('lessons.rowAriaLabel(title, state) embeds both', () => {
    const out = strings.lessons.rowAriaLabel('Loops', 'In progress');
    expect(out).toContain('Loops');
    expect(out).toContain('In progress');
  });
});
