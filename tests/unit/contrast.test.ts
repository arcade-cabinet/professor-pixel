import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb, luminance, meetsAaNormal } from '@lib/utils/contrast';

describe('hexToRgb', () => {
  it('parses a 6-char hex with leading #', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('#00ff00')).toEqual([0, 255, 0]);
    expect(hexToRgb('#0000ff')).toEqual([0, 0, 255]);
  });

  it('parses a 6-char hex without leading #', () => {
    expect(hexToRgb('abcdef')).toEqual([171, 205, 239]);
  });

  it('expands a 3-char hex (#rgb → #rrggbb)', () => {
    // #abc → #aabbcc
    expect(hexToRgb('#abc')).toEqual([170, 187, 204]);
    // #f0a → #ff00aa
    expect(hexToRgb('#f0a')).toEqual([255, 0, 170]);
  });

  it('throws on a bad-length input', () => {
    // 4 chars, 5 chars, 7 chars all hit the !== 6 guard.
    expect(() => hexToRgb('#abcd')).toThrow(/bad input/);
    expect(() => hexToRgb('#abcde')).toThrow(/bad input/);
    expect(() => hexToRgb('#abcdefg')).toThrow(/bad input/);
    expect(() => hexToRgb('')).toThrow(/bad input/);
  });
});

describe('luminance / contrastRatio / meetsAaNormal', () => {
  it('luminance(#000000) = 0 and luminance(#ffffff) = 1', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('contrastRatio(black, white) = 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('contrastRatio is symmetric', () => {
    const a = contrastRatio('#123456', '#abcdef');
    const b = contrastRatio('#abcdef', '#123456');
    expect(a).toBeCloseTo(b, 10);
  });

  it('meetsAaNormal: black-on-white passes, mid-gray-on-white fails', () => {
    expect(meetsAaNormal('#000000', '#ffffff')).toBe(true);
    // #888 on white is ~3.5:1 — below the 4.5:1 AA bar.
    expect(meetsAaNormal('#888888', '#ffffff')).toBe(false);
  });
});
