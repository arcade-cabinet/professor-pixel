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
  it.each([
    ['SyntaxError: invalid syntax (script.py, line 5)', /line 5/, 'Python Syntax'],
    ['IndentationError: expected an indented block on line 3', /line 3/, 'Python Indentation'],
    ["NameError: name 'foo' is not defined", /foo/, 'Variables'],
    ["TypeError: 'int' object is not callable", /int/, 'Functions'],
    ['pygame.error: display mode not set', /pygame\.init/i, 'Pygame Setup'],
    ["pygame.error: No such file or directory: 'sprite.png'", /sprite\.png/, 'File Paths'],
    [
      "AttributeError: 'pygame.Surface' object has no attribute 'setpixel'",
      /setpixel/,
      'Pygame Surfaces',
    ],
    ['Failed to fetch resource', /internet/i, 'Network Connectivity'],
    ['TimeoutError: Request timeout', /timing out/i, 'Network Performance'],
    ['ReferenceError: bar is not defined', /bar/, 'Platform Issues'],
    ['ChunkLoadError: Loading chunk 5 failed', /load/i, 'Website Loading'],
  ])('matches the %#-th pattern (%s)', (input, _msgPattern, conceptHint) => {
    const result = transformError(input);
    expect(result, `pattern should match: ${input}`).toBeTruthy();
    expect(result?.originalError).toBe(input);
    expect(result?.relatedConcepts ?? []).toContain(conceptHint);
  });

  it('returns null when nothing matches', () => {
    expect(transformError('totally novel error message with no pattern')).toBeNull();
  });

  it('attaches a non-empty learningTips + nextSteps array on every match', () => {
    const result = transformError("NameError: name 'x' is not defined");
    expect(result?.learningTips.length).toBeGreaterThan(0);
    expect(result?.nextSteps.length).toBeGreaterThan(0);
  });

  it('embeds the captured group(s) into friendlyMessage when present', () => {
    const r = transformError("NameError: name 'undefined_var' is not defined");
    expect(r?.friendlyMessage).toMatch(/undefined_var/);
  });
});

describe('getEducationalError — pattern miss falls back to generic', () => {
  it('returns the matched educational error when a pattern hits', () => {
    const r = getEducationalError("NameError: name 'x' is not defined");
    expect(r.relatedConcepts).toContain('Variables');
  });

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
    // Should include something from pygame help.
    expect(tips.some((t) => /pygame/i.test(t))).toBe(true);
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

  it('returns syntax help when lessonId includes "basic"', () => {
    const tips = getContextualHelp({ lessonId: 'basics-1' });
    expect(tips.length).toBeGreaterThan(0);
  });

  it('returns pygame help when projectType is "game"', () => {
    const tips = getContextualHelp({ projectType: 'game' });
    expect(tips.some((t) => /pygame/i.test(t))).toBe(true);
  });

  it('falls back to debugging tips when nothing matches', () => {
    const tips = getContextualHelp({});
    expect(tips.length).toBeGreaterThan(0);
    // The debugging tips contain "error messages" or "line numbers" as
    // anchors — pin one of the canonical lines.
    expect(tips.some((t) => /error messages|line numbers|print\(\)/i.test(t))).toBe(true);
  });
});

describe('module-level convenience exports', () => {
  it('expose the same transformer instance', () => {
    // Sanity: the convenience wrappers use the singleton transformer, so a
    // direct call and a wrapper call match for the same input.
    const direct = educationalErrorTransformer.transformError("NameError: name 'a' is not defined");
    const indirect = transformError("NameError: name 'a' is not defined");
    expect(direct?.relatedConcepts).toEqual(indirect?.relatedConcepts);
  });
});
