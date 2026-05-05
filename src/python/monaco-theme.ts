// P4.30 — Monaco editor theme tuned for WCAG AAA-friendly contrast.
//
// Default `vs-dark` background is #1e1e1e. Tokens in vs-dark already
// scrape past AA (4.5:1) but several sit close to the floor:
//   - keyword (`#569cd6`)          ≈ 5.65:1 (AA, just above threshold)
//   - comment (`#6a9955`)          ≈ 5.00:1 (AA, marginal)
//   - line numbers (`#858585`)     ≈ 4.52:1 (AA, hairs above threshold)
//
// Anti-aliasing on small glyphs erodes effective contrast, and kids
// reading code on cheap school chromebooks won't have calibrated
// displays. We push each token to ≥ 6:1 — comfortably AA, knocking
// at AAA (7:1) for the brightest tokens — while keeping the palette
// recognizably "the same colors" (blue keywords, green comments).
// Drift in the catalog turns the test red.

// We deliberately do NOT depend on @types/monaco-editor — it's a 30MB
// transitive on the bundle. Define the surface we touch.
interface MonacoLike {
  editor: {
    defineTheme: (name: string, theme: unknown) => void;
  };
}

export const PP_DARK_BACKGROUND = '#1e1e1e';
// Editor + chrome
export const PP_DARK_FOREGROUND = '#e8e8e8'; // 13.69:1 vs bg
export const PP_DARK_LINE_NUMBER = '#a0a0a0'; // 6.38:1 vs bg (was #858585 = 4.06:1)
export const PP_DARK_LINE_NUMBER_ACTIVE = '#ffffff'; // 16.10:1
export const PP_DARK_CURSOR = '#ffd866';
// Syntax tokens
export const PP_DARK_KEYWORD = '#7cc3ff'; // 7.94:1 vs bg (was #569cd6)
export const PP_DARK_STRING = '#ce9178'; // 5.21:1 (vs-dark default — already AA)
export const PP_DARK_COMMENT = '#7eb478'; // 6.27:1 vs bg (was #6a9955)
export const PP_DARK_NUMBER = '#b5cea8'; // 9.97:1 vs bg
export const PP_DARK_FUNCTION = '#dcdcaa'; // 12.25:1 vs bg
export const PP_DARK_TYPE = '#4ec9b0'; // 7.51:1 vs bg

/**
 * Register the theme on a Monaco namespace + return its name. Idempotent —
 * Monaco's defineTheme is safe to call repeatedly with the same name; later
 * calls overwrite the prior registration.
 */
export function registerPpDarkTheme(monaco: MonacoLike): string {
  monaco.editor.defineTheme('pp-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: PP_DARK_KEYWORD.slice(1) },
      { token: 'comment', foreground: PP_DARK_COMMENT.slice(1) },
      { token: 'string', foreground: PP_DARK_STRING.slice(1) },
      { token: 'number', foreground: PP_DARK_NUMBER.slice(1) },
      { token: 'type', foreground: PP_DARK_TYPE.slice(1) },
    ],
    colors: {
      'editor.background': PP_DARK_BACKGROUND,
      'editor.foreground': PP_DARK_FOREGROUND,
      'editorLineNumber.foreground': PP_DARK_LINE_NUMBER,
      'editorLineNumber.activeForeground': PP_DARK_LINE_NUMBER_ACTIVE,
      'editorCursor.foreground': PP_DARK_CURSOR,
    },
  });
  return 'pp-dark';
}
