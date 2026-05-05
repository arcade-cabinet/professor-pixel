// P4.30 — Monaco theme tokens hit WCAG AA (4.5:1 normal text) against
// the editor background. The values live in src/python/monaco-theme.ts;
// drift turns this red.

import { describe, expect, it } from 'vitest';
import { contrastRatio, meetsAaNormal } from '@lib/utils/contrast';
import {
  PP_DARK_BACKGROUND,
  PP_DARK_FOREGROUND,
  PP_DARK_LINE_NUMBER,
  PP_DARK_LINE_NUMBER_ACTIVE,
  PP_DARK_KEYWORD,
  PP_DARK_STRING,
  PP_DARK_COMMENT,
  PP_DARK_NUMBER,
  PP_DARK_FUNCTION,
  PP_DARK_TYPE,
  registerPpDarkTheme,
} from '@lib/python/monaco-theme';

describe('Monaco pp-dark theme contrast (P4.30)', () => {
  it('foreground text passes AA against the editor bg', () => {
    expect(meetsAaNormal(PP_DARK_FOREGROUND, PP_DARK_BACKGROUND)).toBe(true);
  });

  it('line numbers pass AA — vs-dark default #858585 used to fail', () => {
    expect(meetsAaNormal(PP_DARK_LINE_NUMBER, PP_DARK_BACKGROUND)).toBe(true);
    // Active line number must also pass; it's typically a brighter color.
    expect(meetsAaNormal(PP_DARK_LINE_NUMBER_ACTIVE, PP_DARK_BACKGROUND)).toBe(true);
  });

  it('every syntax token passes AA', () => {
    const tokens = {
      keyword: PP_DARK_KEYWORD,
      string: PP_DARK_STRING,
      comment: PP_DARK_COMMENT,
      number: PP_DARK_NUMBER,
      function: PP_DARK_FUNCTION,
      type: PP_DARK_TYPE,
    };
    for (const [name, color] of Object.entries(tokens)) {
      const ratio = contrastRatio(color, PP_DARK_BACKGROUND);
      // toFixed(2) makes the failure message human-readable when a
      // future maintainer changes a token color.
      expect(
        meetsAaNormal(color, PP_DARK_BACKGROUND),
        `${name} = ${color} → ${ratio.toFixed(2)}:1 (need ≥ 4.50:1)`
      ).toBe(true);
    }
  });

  it('clears AA with comfortable headroom on tokens that vs-dark cuts close', () => {
    // The vs-dark defaults squeak past AA but sit close to the
    // 4.5:1 floor where antialiasing erodes effective contrast on
    // small glyphs. The pp-dark replacements push to ≥ 6:1.
    expect(contrastRatio('#569cd6', PP_DARK_BACKGROUND)).toBeLessThan(6);
    expect(contrastRatio('#6a9955', PP_DARK_BACKGROUND)).toBeLessThan(6);
    expect(contrastRatio('#858585', PP_DARK_BACKGROUND)).toBeLessThan(5);
    expect(contrastRatio(PP_DARK_KEYWORD, PP_DARK_BACKGROUND)).toBeGreaterThanOrEqual(6);
    expect(contrastRatio(PP_DARK_COMMENT, PP_DARK_BACKGROUND)).toBeGreaterThanOrEqual(6);
    expect(contrastRatio(PP_DARK_LINE_NUMBER, PP_DARK_BACKGROUND)).toBeGreaterThanOrEqual(6);
  });
});

describe('registerPpDarkTheme (P4.30)', () => {
  it('returns the theme name and calls defineTheme exactly once', () => {
    const calls: Array<[string, unknown]> = [];
    const monaco = {
      editor: {
        defineTheme: (name: string, theme: unknown) => calls.push([name, theme]),
      },
    };
    const name = registerPpDarkTheme(monaco);
    expect(name).toBe('pp-dark');
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe('pp-dark');
  });

  it('forwards background + foreground in the colors map', () => {
    let captured: { colors?: Record<string, string> } | undefined;
    const monaco = {
      editor: {
        defineTheme: (_n: string, theme: unknown) => {
          captured = theme as { colors?: Record<string, string> };
        },
      },
    };
    registerPpDarkTheme(monaco);
    expect(captured?.colors?.['editor.background']).toBe(PP_DARK_BACKGROUND);
    expect(captured?.colors?.['editor.foreground']).toBe(PP_DARK_FOREGROUND);
  });
});
