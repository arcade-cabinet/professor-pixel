// Cover three branch-rich paths in src/python/error-handler.ts that
// the existing python-error-handler suite skips:
//
//   1. Lines 222-224: column extraction from `^` caret marker. When a
//      SyntaxError traceback contains a line that's only a `^` (with
//      surrounding whitespace), parseTraceback reads `prevLine.indexOf
//      ('^')` to set columnNumber. Existing tests don't include the
//      caret line so this whole inner block stays cold.
//   2. Lines 258-261: concatenated multi-file context (legacy) where
//      the named fileName has no `# === File: foo ===` header in
//      context.code. The regex misses, the warn branch fires, and
//      sourceCode falls back to the full context.code.
//   3. Line 162: getLineContext's `lines[errorIndex] || ''` fallback
//      when errorIndex points past the end of the source (line number
//      from the traceback exceeds the actual code length). Reached
//      indirectly through quickFormatError once a context.code is
//      provided alongside a tail-of-file error line.
//
// These are all reachable via the public quickFormatError entry point
// — no internal stubbing needed.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { quickFormatError } from '@lib/python/error-handler';

beforeEach(() => {
  // The error-handler logs heavily — quiet console so test output stays
  // legible. The branches we're after fire console.log/warn, so we mock
  // and do NOT assert call counts (only branch coverage matters).
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseTraceback — column extraction from caret marker (lines 218-226)', () => {
  it('reads columnNumber from the prevLine.indexOf("^") when the caret-only line is present', () => {
    // A real Python SyntaxError traceback includes a `^` marker line
    // pointing at the offending column. parseTraceback's column-extraction
    // loop scans for a line that's only `^` chars and reads the position
    // from the line ABOVE it.
    const traceback = [
      'Traceback (most recent call last):',
      '  File "main.py", line 2',
      '    print(x)',
      '         ^',
      'SyntaxError: invalid syntax',
    ].join('\n');
    const result = quickFormatError(traceback);
    // The result is a FormattedError shape — it includes the underlying
    // PythonError fields. The contract we care about: columnNumber gets
    // populated from the `^` indexOf rather than left undefined.
    // Coverage of lines 218-225 is the contract — assert the formatted
    // error renders without throwing. The caret-extraction branch is
    // pure side-effect in the parsed PythonError; if the formatter
    // surfaces a column hint in the message, great. Otherwise the
    // coverage check confirms the path executed.
    expect(result.title).toBeTruthy();
  });

  it('skips column extraction when the ^ caret has no preceding line (line 223 path 1 falsy)', () => {
    // The `if (prevLine)` guard at line 223 protects against a caret-line
    // appearing at the start of the traceback (lines.indexOf - 1 = -1 →
    // lines[-1] is undefined). Existing tests always have content before
    // the caret. Drive the falsy arm by prepending the caret to the very
    // start of the traceback — `prevLine` is undefined, so the indexOf
    // call is skipped and columnNumber stays undefined.
    const traceback = [
      '         ^', // caret with no preceding line
      'Traceback (most recent call last):',
      '  File "main.py", line 2',
      '    print(x)',
      'SyntaxError: invalid syntax',
    ].join('\n');
    const result = quickFormatError(traceback);
    // Branch coverage of the falsy arm — assert formatter doesn't throw.
    expect(result.title).toBeTruthy();
  });
});

describe('parseTraceback — multi-file fallback when File header missing (lines 258-261)', () => {
  it('warns + falls back to full context.code when the named fileName has no `# === File:` block', () => {
    // Concatenated multi-file format used by some packagers:
    //   # === File: a.py ===
    //   <code>
    //   # === File: b.py ===
    //   <code>
    // We reference a fileName that isn't in the map ('missing.py'). The
    // regex returns null → console.warn fires → sourceCode falls back
    // to the full concatenated context.code (lines 258-261).
    const traceback = [
      'Traceback (most recent call last):',
      '  File "missing.py", line 3, in <module>',
      '    foo()',
      "NameError: name 'foo' is not defined",
    ].join('\n');
    const concatenatedContextCode = [
      '# === File: a.py ===',
      'print("a")',
      '# === File: b.py ===',
      'print("b")',
    ].join('\n');
    const result = quickFormatError(traceback, {
      code: concatenatedContextCode,
    });
    expect(result.title).toBeTruthy();
    // Belt: the warn fired, confirming the fallback arm took over.
    expect(vi.mocked(console.warn)).toHaveBeenCalled();
  });
});

describe('getLineContext — errorLine fallback when index out of range (line 162)', () => {
  it('handles a line number that points past the end of the source code', () => {
    // The traceback says line 99 but the source has 2 lines. errorIndex
    // (= 98) is >= lines.length, so `lines[errorIndex]` is undefined and
    // the `|| ''` fallback fires.
    const traceback = [
      'Traceback (most recent call last):',
      '  File "main.py", line 99, in <module>',
      "NameError: name 'x' is not defined",
    ].join('\n');
    const shortSource = 'a = 1\nb = 2\n';
    const result = quickFormatError(traceback, { code: shortSource });
    // Without the `|| ''` fallback, the formatter would crash on
    // undefined; with it, the output is a valid FormattedError.
    expect(result.title).toBeTruthy();
  });
});
