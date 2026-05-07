import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  educationalErrorTransformer,
  getContextualHelp,
  getDebuggingTips,
  getEducationalError,
  getPygameHelp,
  getSyntaxHelp,
  transformError,
} from '@lib/errors/educational';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('transformError — pattern coverage', () => {
  // Each row pins THREE behavioral facts for a given input:
  //   1. relatedConcepts contains a specific concept tag
  //   2. friendlyMessage matches a specific user-facing pattern
  //   3. learningTips + nextSteps are populated
  // The msgPattern column is asserted (it's NOT decorative) so a regression
  // in friendlyMessage wording fails this table loudly.
  it.each([
    ['SyntaxError: invalid syntax (script.py, line 5)', /syntax error on line 5/, 'Python Syntax'],
    [
      'IndentationError: expected an indented block on line 3',
      /indented code after line 3/,
      'Python Indentation',
    ],
    ["NameError: name 'foo' is not defined", /'foo'/, 'Variables'],
    ["TypeError: 'int' object is not callable", /'int'/, 'Functions'],
    ['pygame.error: display mode not set', /game window/i, 'Pygame Setup'],
    ["pygame.error: No such file or directory: 'sprite.png'", /'sprite\.png'/, 'File Paths'],
    [
      "AttributeError: 'pygame.Surface' object has no attribute 'setpixel'",
      /'setpixel'/,
      'Pygame Surfaces',
    ],
    ['Failed to fetch resource', /internet|server/i, 'Network Connectivity'],
    ['TimeoutError: Request timeout', /timed out/i, 'Network Performance'],
    ['ReferenceError: bar is not defined', /'bar'/, 'Platform Issues'],
    ['ChunkLoadError: Loading chunk 5 failed', /loading|update/i, 'Website Loading'],
  ])('matches the %#-th pattern (%s)', (input, msgPattern, conceptHint) => {
    const result = transformError(input);
    expect(result, `pattern should match: ${input}`).toBeTruthy();
    expect(result?.originalError).toBe(input);
    expect(result?.relatedConcepts ?? []).toContain(conceptHint);
    expect(result?.friendlyMessage).toMatch(msgPattern);
    expect(result?.learningTips.length ?? 0).toBeGreaterThan(0);
    expect(result?.nextSteps.length ?? 0).toBeGreaterThan(0);
  });

  it('returns null when nothing matches', () => {
    expect(transformError('totally novel error message with no pattern')).toBeNull();
  });
});

describe('getEducationalError — pattern miss falls back to generic', () => {
  it('returns the generic educational shape when nothing matches', () => {
    const r = getEducationalError('Some unprecedented error string');
    expect(r.originalError).toBe('Some unprecedented error string');
    expect(r.friendlyMessage).toMatch(/figure this out together/i);
    expect(r.learningTips.length).toBeGreaterThan(0);
    expect(r.nextSteps.length).toBeGreaterThan(0);
    expect(r.relatedConcepts).toContain('Debugging');
  });
});

describe('getSyntaxHelp / getPygameHelp / getDebuggingTips', () => {
  it('getSyntaxHelp returns ≥3 tips, all non-empty strings', () => {
    const tips = getSyntaxHelp();
    expect(tips.length).toBeGreaterThanOrEqual(3);
    expect(tips.every((t) => typeof t === 'string' && t.length > 0)).toBe(true);
  });

  it('getPygameHelp mentions pygame.init', () => {
    const tips = getPygameHelp();
    expect(tips.some((t) => /pygame\.init/.test(t))).toBe(true);
  });

  it('getDebuggingTips returns ≥3 tips', () => {
    expect(getDebuggingTips().length).toBeGreaterThanOrEqual(3);
  });
});

describe('getContextualHelp', () => {
  it('returns pygame tips when codeContent mentions pygame', () => {
    const tips = getContextualHelp({ codeContent: 'import pygame\npygame.init()' });
    // Pin the actual content: a tip from getPygameHelp() must be present.
    const pygameTips = getPygameHelp();
    expect(tips.some((t) => pygameTips.includes(t))).toBe(true);
  });

  it('returns indent + colon tips when code has if/for', () => {
    const tips = getContextualHelp({ codeContent: 'if x > 0: print(x)' });
    expect(tips.some((t) => /indent/i.test(t))).toBe(true);
    expect(tips.some((t) => /colon/i.test(t))).toBe(true);
  });

  it('returns def-related tips when code has def', () => {
    const tips = getContextualHelp({ codeContent: 'def hello(): pass' });
    expect(tips.some((t) => /Function definitions/.test(t))).toBe(true);
  });

  it('returns the first two syntax tips when lessonId includes "basic"', () => {
    const tips = getContextualHelp({ lessonId: 'basics-1' });
    // Pin actual content from getSyntaxHelp() — the lessonId branch must
    // produce real syntax tips, NOT silently fall through to the
    // debugging-tips fallback.
    const syntaxTips = getSyntaxHelp();
    expect(tips.some((t) => syntaxTips.includes(t))).toBe(true);
  });

  it('returns pygame help when projectType is "game"', () => {
    const tips = getContextualHelp({ projectType: 'game' });
    const pygameTips = getPygameHelp();
    expect(tips.some((t) => pygameTips.includes(t))).toBe(true);
  });

  it('combines tips when multiple branches fire (codeContent has pygame + def)', () => {
    const tips = getContextualHelp({
      codeContent: 'import pygame\ndef setup(): pygame.init()',
    });
    // Both the pygame branch AND the def branch should contribute. The
    // accumulator is additive — combining contexts must NOT short-circuit
    // after the first match.
    const pygameTips = getPygameHelp();
    expect(tips.some((t) => pygameTips.includes(t))).toBe(true);
    expect(tips.some((t) => /Function definitions/.test(t))).toBe(true);
  });

  it('falls back to debugging tips when nothing matches', () => {
    const tips = getContextualHelp({});
    expect(tips.length).toBeGreaterThan(0);
    expect(tips.some((t) => /error messages|line numbers|print\(\)/i.test(t))).toBe(true);
  });
});

describe('module-level convenience wrappers', () => {
  // Honest description: the wrappers route through the same singleton
  // transformer, so wrapper output equals direct output for any input.
  // This is value-parity, not referential identity (calls produce fresh
  // objects), but it's the right invariant — if the wrapper ever started
  // routing through a separate transformer instance with diverging state,
  // this test would fail.
  it('return equivalent output to direct singleton calls', () => {
    const input = "NameError: name 'a' is not defined";
    const direct = educationalErrorTransformer.transformError(input);
    const indirect = transformError(input);
    expect(direct?.relatedConcepts).toEqual(indirect?.relatedConcepts);
    expect(direct?.friendlyMessage).toEqual(indirect?.friendlyMessage);
    expect(direct?.learningTips).toEqual(indirect?.learningTips);
    // getEducationalError parity for the fallback path: a non-matching
    // input goes through the same generic shape regardless of caller.
    const fallback = getEducationalError('truly novel error');
    expect(fallback.relatedConcepts).toContain('Debugging');
  });
});
