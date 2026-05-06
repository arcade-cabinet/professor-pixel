// Pixel mascot image URLs.
//
// Why not `import pixelImage from '@assets/pixel/...'`: each PNG is
// 1-1.6MB. Vite's static-import path bundles these into the main JS
// chunk regardless of which route uses them, blowing the chunk to
// 1.12MB and burning Pyodide cold-start time on every cold load. That
// trade buys faster first-paint when offline (browser keeps everything
// in one cached file), but our service worker already caches Pyodide
// payload separately, so the bundling savings are imaginary.
//
// Moving the PNGs to `public/pixel/` serves them as plain static
// requests on demand. Each `<SafeImage src={pixelImages.happy} />`
// triggers a per-image fetch only when the component mounts, and the
// browser cache + service worker layer handle subsequent loads.
//
// All URLs go through `withBase` so they resolve under the GitHub
// Pages subpath as well as Capacitor and dev.

import { withBase } from '@lib/utils/base-url';

const PIXEL_BASE = '/pixel';

function pixelUrl(file: string): string {
  return withBase(`${PIXEL_BASE}/${file}`);
}

export const pixelImages = {
  angry: pixelUrl('Pixel_angry_frustrated_expression_daa5924a.png'),
  celebrating: pixelUrl('Pixel_celebrating_victory_expression_24b7a377.png'),
  coding: pixelUrl('Pixel_coding_programming_expression_56de8ca0.png'),
  confused: pixelUrl('Pixel_confused_puzzled_expression_843c04f4.png'),
  cool: pixelUrl('Pixel_cool_confident_expression_ba46337f.png'),
  curious: pixelUrl('Pixel_curious_investigating_expression_7e10e865.png'),
  dancing: pixelUrl('Pixel_dancing_musical_expression_c71def5e.png'),
  determined: pixelUrl('Pixel_determined_focused_expression_036b4449.png'),
  encouraging: pixelUrl('Pixel_encouraging_supportive_expression_cf958090.png'),
  gaming: pixelUrl('Pixel_gaming_focused_expression_6f3fdfab.png'),
  happy: pixelUrl('Pixel_happy_excited_expression_22a41625.png'),
  idea: pixelUrl('Pixel_idea_eureka_expression_64420aee.png'),
  laughing: pixelUrl('Pixel_laughing_joyful_expression_e1b57465.png'),
  mischievous: pixelUrl('Pixel_mischievous_playful_expression_fdd56be5.png'),
  ninja: pixelUrl('Pixel_ninja_stealth_expression_50deab14.png'),
  proud: pixelUrl('Pixel_proud_achievement_expression_a968da89.png'),
  sad: pixelUrl('Pixel_sad_disappointed_expression_f88b201a.png'),
  shy: pixelUrl('Pixel_shy_bashful_expression_3fb150c2.png'),
  sleepy: pixelUrl('Pixel_sleepy_tired_expression_20c2d99f.png'),
  superhero: pixelUrl('Pixel_superhero_flying_expression_d0432407.png'),
  surprised: pixelUrl('Pixel_surprised_wow_expression_e0d4a42f.png'),
  teaching: pixelUrl('Pixel_teaching_explaining_expression_27e09763.png'),
  thinking: pixelUrl('Pixel_thinking_pondering_expression_0ffffedb.png'),
  welcoming: pixelUrl('Pixel_welcoming_waving_expression_279ffdd2.png'),
  zen: pixelUrl('Pixel_zen_meditation_expression_1148cb14.png'),
} as const;

export type PixelExpression = keyof typeof pixelImages;
