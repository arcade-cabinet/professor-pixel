import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatEducationalError,
  quickFormatError,
  isBeginnerError,
  getEncouragingMessage,
  type PythonError,
} from '@lib/python/error-handler';

beforeEach(() => {
  // The handler logs to console.log/warn/error in some branches; mute
  // them to keep test output clean.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('isBeginnerError', () => {
  it.each([
    'SyntaxError',
    'NameError',
    'IndentationError',
    'TypeError',
    'AttributeError',
    'IndexError',
    'KeyError',
  ])('returns true for beginner-friendly type %s', (type) => {
    expect(isBeginnerError(type)).toBe(true);
  });

  it.each([
    'RuntimeError',
    'MemoryError',
    'OSError',
    'CustomError',
    '',
  ])('returns false for non-beginner type %s', (type) => {
    expect(isBeginnerError(type)).toBe(false);
  });
});

describe('getEncouragingMessage', () => {
  it.each([
    ['SyntaxError', /syntax/i],
    ['NameError', /variable/i],
    ['TypeError', /type/i],
    ['AttributeError', /method/i],
    ['IndexError', /list/i],
    ['KeyError', /dictionary/i],
    ['IndentationError', /indentation/i],
  ])('returns a tailored message for %s', (type, pattern) => {
    expect(getEncouragingMessage(type)).toMatch(pattern);
  });

  it('falls back to the default encouraging message for unknown types', () => {
    // Pin the default fallback — protects against a refactor that
    // would silently drop unknowns into an empty string and break the
    // user-visible UI.
    const msg = getEncouragingMessage('SomeWeirdNewError');
    expect(msg).toBeTruthy();
    expect(msg).toMatch(/learning opportunity/i);
  });
});

describe('quickFormatError — happy path', () => {
  it('parses a standard Python traceback into a FormattedError', () => {
    const traceback = [
      'Traceback (most recent call last):',
      '  File "game.py", line 5, in <module>',
      '    print(undefined_var)',
      "NameError: name 'undefined_var' is not defined",
    ].join('\n');

    const result = quickFormatError(traceback);

    expect(result.severity).toBe('error');
    expect(result.title).toMatch(/NameError/);
    expect(result.message).toMatch(/undefined_var/);
    expect(result.traceback).toContain('NameError');
  });

  it('attaches educational suggestions for known error types', () => {
    const traceback = [
      'Traceback (most recent call last):',
      '  File "game.py", line 1, in <module>',
      "TypeError: unsupported operand type(s) for +: 'int' and 'str'",
    ].join('\n');

    const result = quickFormatError(traceback);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('falls back to UnknownError for malformed input', () => {
    // Last line doesn't match the "Type: message" pattern, so the
    // parser returns UnknownError. Pin this so a future regex change
    // doesn't accidentally crash on garbage input — the user-facing
    // path must always produce a FormattedError.
    const result = quickFormatError('this is not a python traceback at all');
    expect(result.title).toBeTruthy();
    expect(result.severity).toBe('error');
  });

  it('handles empty input gracefully', () => {
    // Empty string → parseTraceback returns null → quickFormatError
    // builds an UnknownError. Pin: never crash on user-empty input.
    const result = quickFormatError('');
    expect(result).toBeDefined();
    expect(result.severity).toBe('error');
  });
});

describe('quickFormatError — file/line extraction', () => {
  it('extracts fileName and lineNumber from the deepest stack frame', () => {
    const traceback = [
      'Traceback (most recent call last):',
      '  File "main.py", line 10, in <module>',
      '    helper()',
      '  File "helpers.py", line 25, in helper',
      '    return data["key"]',
      "KeyError: 'key'",
    ].join('\n');

    const result = quickFormatError(traceback);
    // Message should mention the deepest frame's file (helpers.py) +
    // line (25), since the parser walks lines.length-1 → 0 and takes
    // the first match (which is the deepest frame for this format).
    expect(result.message).toMatch(/helpers\.py/);
    expect(result.message).toMatch(/25/);
  });

  it('formats line-only message when filename is absent', () => {
    // Edge: the regex requires a file pattern. If only a bare line
    // number appears, the parser still emits a useful message via the
    // formatter's "Line X" branch.
    const traceback = [
      '  File "<stdin>", line 3',
      '    1 / 0',
      'ZeroDivisionError: division by zero',
    ].join('\n');
    const result = quickFormatError(traceback);
    expect(result.message).toMatch(/division by zero/);
  });
});

describe('quickFormatError — context lines from source code', () => {
  it('includes context lines when ErrorContext.code is provided and lineNumber matches', () => {
    const code = [
      'line 1: setup',
      'line 2: more setup',
      'BAD LINE 3',
      'line 4: aftermath',
      'line 5: end',
    ].join('\n');
    const traceback = [
      'Traceback (most recent call last):',
      '  File "user.py", line 3, in <module>',
      '    BAD LINE 3',
      'NameError: something',
    ].join('\n');

    const result = quickFormatError(traceback, { code, fileName: 'user.py' });
    // Code context block is included in details when context resolves.
    expect(result.details).toMatch(/Code context|BAD LINE 3/);
  });

  it('routes to files map when multi-file context is provided', () => {
    const traceback = [
      'Traceback (most recent call last):',
      '  File "helpers.py", line 2, in helper',
      '    raise NameError("test")',
      'NameError: foo not defined',
    ].join('\n');

    const result = quickFormatError(traceback, {
      code: '',
      files: {
        'helpers.py': 'def helper():\n    raise NameError("test")\n',
        'main.py': 'from helpers import helper\nhelper()\n',
      },
    });
    expect(result.message).toMatch(/helpers\.py/);
  });
});

describe('formatEducationalError — title/message/details/severity', () => {
  it('emits an educational title by default', () => {
    const err: PythonError = {
      type: 'SyntaxError',
      message: 'invalid syntax',
      traceback: 'SyntaxError: invalid syntax',
    };
    const formatted = formatEducationalError(err);
    expect(formatted.title).toMatch(/SyntaxError/);
    expect(formatted.title).toMatch(/🐛|together/i);
    expect(formatted.educational).toBe(true);
  });

  it('emits a plain title when educational=false', () => {
    const err: PythonError = {
      type: 'CustomError',
      message: 'something happened',
      traceback: 'CustomError: something happened',
      educational: false,
    };
    const formatted = formatEducationalError(err);
    expect(formatted.title).toBe('CustomError');
    expect(formatted.educational).toBe(false);
  });

  it('prepends file + line context to the message when both are present', () => {
    const err: PythonError = {
      type: 'NameError',
      message: 'name is not defined',
      traceback: 'NameError: name is not defined',
      fileName: 'main.py',
      lineNumber: 42,
    };
    const formatted = formatEducationalError(err);
    expect(formatted.message).toMatch(/main\.py/);
    expect(formatted.message).toMatch(/42/);
  });

  it('uses just the line number when fileName is absent', () => {
    const err: PythonError = {
      type: 'ZeroDivisionError',
      message: 'division by zero',
      traceback: 'ZeroDivisionError: division by zero',
      lineNumber: 7,
    };
    const formatted = formatEducationalError(err);
    expect(formatted.message).toMatch(/Line 7/);
  });

  it('includes explanation block in details when present and educational', () => {
    const err: PythonError = {
      type: 'NameError',
      message: 'foo',
      traceback: '',
      explanation: 'Variables must be defined before use.',
    };
    const formatted = formatEducationalError(err);
    expect(formatted.details).toMatch(/What this means/);
    expect(formatted.details).toMatch(/Variables must be defined/);
  });

  it('omits explanation block when educational=false', () => {
    const err: PythonError = {
      type: 'NameError',
      message: 'foo',
      traceback: '',
      explanation: 'Variables must be defined before use.',
      educational: false,
    };
    const formatted = formatEducationalError(err);
    expect(formatted.details).not.toMatch(/What this means/);
  });

  it('emits default suggestions when none provided AND educational=true', () => {
    const err: PythonError = {
      type: 'WeirdError',
      message: 'huh',
      traceback: '',
    };
    const formatted = formatEducationalError(err);
    expect(formatted.suggestions.length).toBeGreaterThan(0);
    expect(formatted.suggestions.some((s) => /typos|syntax/i.test(s))).toBe(true);
  });

  it('honors provided suggestions verbatim when present', () => {
    const err: PythonError = {
      type: 'NameError',
      message: 'foo',
      traceback: '',
      suggestions: ['Custom suggestion 1', 'Custom suggestion 2'],
    };
    const formatted = formatEducationalError(err);
    expect(formatted.suggestions).toEqual(['Custom suggestion 1', 'Custom suggestion 2']);
  });

  it('emits empty-suggestions array when not educational AND no suggestions', () => {
    const err: PythonError = {
      type: 'CustomError',
      message: 'no help',
      traceback: '',
      educational: false,
    };
    const formatted = formatEducationalError(err);
    expect(formatted.suggestions).toEqual([]);
  });

  it('always sets severity=error', () => {
    // Pin: the formatter currently classifies everything as 'error'.
    // If a future refactor wants warning/info, this test will flag
    // the change for explicit review.
    const err: PythonError = { type: 'SomeError', message: '', traceback: '' };
    expect(formatEducationalError(err).severity).toBe('error');
  });

  it('includes full traceback block when educational and traceback non-empty', () => {
    const err: PythonError = {
      type: 'SyntaxError',
      message: 'invalid',
      traceback: 'Traceback ...\n  File "x.py"\nSyntaxError: invalid',
    };
    const formatted = formatEducationalError(err);
    expect(formatted.details).toMatch(/Full Python Traceback/);
  });

  it('omits full traceback block when traceback is empty/whitespace', () => {
    const err: PythonError = {
      type: 'SyntaxError',
      message: 'invalid',
      traceback: '   ',
    };
    const formatted = formatEducationalError(err);
    expect(formatted.details).not.toMatch(/Full Python Traceback/);
  });

  it('includes the problem line block when errorLine is set', () => {
    const err: PythonError = {
      type: 'NameError',
      message: 'foo',
      traceback: '',
      errorLine: '    print(undefined_var)',
    };
    const formatted = formatEducationalError(err);
    expect(formatted.details).toMatch(/Problem line/);
    expect(formatted.details).toMatch(/undefined_var/);
  });
});
