// P4.30 — WCAG contrast helper for the Monaco theme audit.
//
// WCAG 2.1 1.4.3 (Contrast Minimum, AA): 4.5:1 for normal text,
// 3:1 for large text (≥18px or ≥14px bold). Monaco renders at 18px
// per code-editor.tsx, but Python code is mostly ASCII glyphs at
// regular weight — we hold to the stricter 4.5:1 ratio across the
// board. UI chrome (line numbers, gutter) still needs 4.5:1
// because they're 18px non-bold.

/** Parse `#rrggbb` or `#rgb` into [r,g,b] in 0..255. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.startsWith('#') ? hex.slice(1) : hex;
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6) {
    throw new Error(`hexToRgb: bad input ${hex}`);
  }
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

/** sRGB → linear-light for the relative-luminance formula. */
function channelToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

/**
 * WCAG contrast ratio between two colors. Returns a number in
 * [1, 21]. AA passes at ≥ 4.5 for normal text.
 */
export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = luminance(fgHex);
  const l2 = luminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Convenience: does the pair meet WCAG AA for normal text (4.5:1)? */
export function meetsAaNormal(fgHex: string, bgHex: string): boolean {
  return contrastRatio(fgHex, bgHex) >= 4.5;
}
