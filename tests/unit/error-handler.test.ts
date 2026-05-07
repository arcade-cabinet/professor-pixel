import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEnhancedErrorCapture,
  formatEducationalError,
  getEncouragingMessage,
  isBeginnerError,
  quickFormatError,
  type PythonError,
} from '@lib/python/error-handler';

beforeEach(() => {
  // The traceback parser uses console.log/warn/error for diagnostic noise.
  // Silence it so failing assertions stay readable.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('quickFormatError — traceback parsing', () => {
  it('parses a typical NameError traceback into a structured FormattedError', () => {
    const tb = `Traceback (most recent call last):
  File "main.py", line 3, in <module>
    print(undefined_var)
NameError: name 'undefined_var' is not defined`;
    const out = quickFormatError(tb);
    // Title is friendly + branded for educational mode (the default).
    expect(out.title).toMatch(/NameError/);
    expect(out.title).toMatch(/fix this together/);
    // Message embeds the file + line.
    expect(out.message).toMatch(/main\.py/);
    expect(out.message).toMatch(/line 3/);
    expect(out.message).toMatch(/undefined_var/);
    // Educational suggestions came from the ERROR_EXPLANATIONS table.
    expect(out.suggestions.length).toBeGreaterThan(0);
    expect(out.suggestions.some((s) => /spelled/i.test(s))).toBe(true);
    expect(out.severity).toBe('error');
    expect(out.educational).toBe(true);
  });

  it('falls back to UnknownError shape when text is not a traceback', () => {
    const out = quickFormatError('totally not a traceback');
    expect(out.title).toMatch(/UnknownError/);
    expect(out.educational).toBe(true);
    // Default fallback suggestions kick in when ERROR_EXPLANATIONS has no
    // entry — the educational floor is three encouraging tips.
    expect(out.suggestions.length).toBeGreaterThanOrEqual(3);
  });

  it('honors isEducational=false (drops emoji + falls back to plain title)', () => {
    const tb = `NameError: name 'x' is not defined`;
    const out = quickFormatError(tb, { code: '', isEducational: false });
    expect(out.educational).toBe(false);
    // Non-educational mode: title is just the type, no friendly suffix.
    expect(out.title).toBe('NameError');
  });

  it('uses the files map (priority 1) when fileName is in context.files', () => {
    const tb = `Traceback (most recent call last):
  File "game.py", line 2, in <module>
    print(missing)
NameError: name 'missing' is not defined`;
    const out = quickFormatError(tb, {
      code: 'unrelated source',
      files: {
        'game.py': 'import pygame\nprint(missing)\npygame.init()',
      },
    });
    // The "Code context" detail block should reflect game.py contents,
    // not the unrelated `code` field.
    expect(out.details).toMatch(/print\(missing\)/);
    expect(out.details).toMatch(/import pygame/);
  });

  it('extracts file content from concatenated multi-file context (priority 2)', () => {
    const concatenatedCode = `# === File: utils.py ===
def helper():
    pass

# === File: game.py ===
import pygame
print(missing)
pygame.init()`;
    const tb = `Traceback (most recent call last):
  File "game.py", line 2, in <module>
    print(missing)
NameError: name 'missing' is not defined`;
    const out = quickFormatError(tb, { code: concatenatedCode });
    // Should pull just game.py's body, not utils.py's.
    expect(out.details).toMatch(/print\(missing\)/);
    expect(out.details).not.toMatch(/def helper/);
  });

  it('falls through to context.code when files map and concatenated marker are absent', () => {
    const tb = `Traceback (most recent call last):
  File "main.py", line 2, in <module>
    print(x)
NameError: name 'x' is not defined`;
    const out = quickFormatError(tb, {
      code: 'pass\nprint(x)\npass\n',
    });
    expect(out.details).toMatch(/print\(x\)/);
  });
});

describe('formatEducationalError — direct shape', () => {
  it('produces "Line N:" prefix when lineNumber is present without fileName', () => {
    const err: PythonError = {
      type: 'TypeError',
      message: "'int' object is not callable",
      traceback: '',
      lineNumber: 7,
    };
    const out = formatEducationalError(err);
    expect(out.message).toMatch(/^Line 7:/);
  });

  it('produces no line prefix when neither fileName nor lineNumber is present', () => {
    const err: PythonError = {
      type: 'RuntimeError',
      message: 'something broke',
      traceback: '',
    };
    const out = formatEducationalError(err);
    expect(out.message).toBe('something broke');
  });

  it('omits the educational explanation block when isEducational=false', () => {
    const err: PythonError = {
      type: 'NameError',
      message: 'x',
      traceback: '',
      explanation: 'A NameError occurs when ...',
      educational: false,
    };
    const out = formatEducationalError(err);
    // Non-educational: no "What this means" emoji block, no traceback dump.
    expect(out.details).not.toMatch(/What this means/);
    expect(out.educational).toBe(false);
  });

  it('falls back to encouraging tips when no suggestions are present in educational mode', () => {
    const err: PythonError = {
      type: 'WeirdCustomError',
      message: 'boom',
      traceback: '',
    };
    const out = formatEducationalError(err);
    // Educational floor: the three "double-check / try smaller / ask for help" tips.
    expect(out.suggestions.length).toBeGreaterThanOrEqual(3);
    expect(out.suggestions.some((s) => /typos/i.test(s))).toBe(true);
    expect(out.suggestions.some((s) => /smaller/i.test(s))).toBe(true);
    expect(out.suggestions.some((s) => /Ask for help/i.test(s))).toBe(true);
  });

  it('keeps explicit suggestions and does not append the educational floor', () => {
    const err: PythonError = {
      type: 'NameError',
      message: 'x',
      traceback: '',
      suggestions: ['original-1', 'original-2'],
    };
    const out = formatEducationalError(err);
    expect(out.suggestions).toEqual(['original-1', 'original-2']);
  });

  it('renders the code-context block when contextLines + lineNumber are present', () => {
    const err: PythonError = {
      type: 'NameError',
      message: 'x',
      traceback: '',
      lineNumber: 5,
      errorLine: 'print(x)',
      contextLines: ['a = 1', 'b = 2', 'print(x)', 'c = 3', 'd = 4'],
    };
    const out = formatEducationalError(err);
    expect(out.details).toMatch(/Code context/);
    // Marker for the offending line should land in the rendered block.
    expect(out.details).toMatch(/⚠️|→/);
  });

  it('appends a Full Python Traceback section when traceback is non-empty in educational mode', () => {
    const err: PythonError = {
      type: 'NameError',
      message: 'x',
      traceback: 'Traceback (most recent call last):\nNameError: x',
    };
    const out = formatEducationalError(err);
    expect(out.details).toMatch(/Full Python Traceback/);
  });
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
  ])('classifies %s as a beginner error', (type) => {
    expect(isBeginnerError(type)).toBe(true);
  });

  it('does NOT classify advanced/system errors as beginner', () => {
    expect(isBeginnerError('RecursionError')).toBe(false);
    expect(isBeginnerError('SystemExit')).toBe(false);
    expect(isBeginnerError('ZeroDivisionError')).toBe(false);
    expect(isBeginnerError('')).toBe(false);
  });
});

describe('getEncouragingMessage', () => {
  it.each([
    ['SyntaxError', /Syntax errors/],
    ['NameError', /Variable naming/],
    ['TypeError', /Type errors/],
    ['AttributeError', /object methods/],
    ['IndexError', /List indexing/],
    ['KeyError', /Dictionary key/],
    ['IndentationError', /indentation rules/i],
  ])('returns a tailored message for %s', (type, pattern) => {
    expect(getEncouragingMessage(type)).toMatch(pattern);
  });

  it('falls back to the default message for unknown types', () => {
    expect(getEncouragingMessage('SomethingUnknown')).toMatch(/learning opportunity/);
    expect(getEncouragingMessage('')).toMatch(/learning opportunity/);
  });
});

describe('createEnhancedErrorCapture — pre-pyodide guards', () => {
  // Without a Pyodide instance attached to the global, setupErrorCapture
  // must short-circuit to false rather than throw — the rest of the
  // factory builds on top of that contract. We test the JS-level guards;
  // the actual Python install + traceback round-trip is exercised by
  // integration tests under tests/integration/.

  beforeEach(() => {
    // Clear any leaked pyodide singletons from prior tests in the same run.
    // jsdom carries `window` between tests, so explicit cleanup is needed.
    // biome-ignore lint/suspicious/noExplicitAny: test-time global poke
    delete (globalThis as any).pyodideInstance;
    // biome-ignore lint/suspicious/noExplicitAny: test-time global poke
    if (typeof window !== 'undefined') delete (window as any).pyodideInstance;
  });

  it('setupErrorCapture returns false when no pyodide is on the global', () => {
    const cap = createEnhancedErrorCapture();
    expect(cap.setupErrorCapture()).toBe(false);
  });

  it('isReadyForCapture returns false before setup', () => {
    const cap = createEnhancedErrorCapture();
    expect(cap.isReadyForCapture()).toBe(false);
  });

  it('isReadyForCapture stays false after a failed setup attempt', () => {
    const cap = createEnhancedErrorCapture();
    cap.setupErrorCapture(); // returns false (no pyodide)
    expect(cap.isReadyForCapture()).toBe(false);
  });

  it('executeWithErrorCapture returns hasError=true with a friendly message when not set up', async () => {
    const cap = createEnhancedErrorCapture();
    const result = await cap.executeWithErrorCapture('print("hi")');
    expect(result.hasError).toBe(true);
    expect(result.error).not.toBeNull();
    // The factory's pre-setup guard surfaces a real FormattedError, not
    // a thrown exception — the UI consumes this shape directly.
    expect(result.error?.severity).toBe('error');
  });

  it('returns independent state per factory instance (setup on one does not leak)', () => {
    const a = createEnhancedErrorCapture();
    const b = createEnhancedErrorCapture();
    a.setupErrorCapture();
    // b has its own closed-over isSetup flag; calling setupErrorCapture
    // on `a` must not flip `b`'s readiness.
    expect(b.isReadyForCapture()).toBe(false);
  });
});
