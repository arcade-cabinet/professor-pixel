// P4.25 — Below-the-fold Pixel mascot images use loading="lazy".
//
// Rather than mount each component with its full prop scaffolding
// (lesson.tsx pulls Pyodide, presence.tsx wires multi-mode UI), this
// is a source-level contract: read the file, assert that every
// motion.img / img near a known mascot src token has a `loading="lazy"`
// attribute on the same element. Drift in the source — someone
// removing lazy or adding a new <img src={pixelImage}> without it —
// turns this red.
//
// Above-the-fold mascots are explicitly allow-listed:
//   - lesson.tsx loading/error fallback states (rendered before main content)
//   - lesson.tsx in-page guidance bar mascot (always visible header)
//   - wizard/avatar-display.tsx (the primary wizard avatar — LCP element)
//   - pixel/presence.tsx corner-mode default mascot (persistent UI)

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('lazy-loading mascot images (P4.25)', () => {
  it('lesson.tsx completion-modal mascot is lazy', () => {
    const src = read('app/pages/lesson.tsx');
    // The completion modal renders pixelCelebrating; it must include
    // loading="lazy" within the same JSX element.
    const match = src.match(/<motion\.img[^>]*pixelCelebrating[^>]*\/>/s);
    expect(match, 'completion-modal motion.img not found').not.toBeNull();
    expect(match![0]).toMatch(/loading="lazy"/);
  });

  it('pixel/menu.tsx modal-open avatar is lazy', () => {
    const src = read('app/components/pixel/menu.tsx');
    const match = src.match(/<motion\.img[^>]*pixelImage[^>]*\/>/s);
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/loading="lazy"/);
  });

  it('pixel/minimized.tsx avatar is lazy', () => {
    const src = read('app/components/pixel/minimized.tsx');
    const match = src.match(/<motion\.img[^>]*pixelImage[^>]*\/>/s);
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/loading="lazy"/);
  });

  it('pixel/minimize-animation.tsx idle and animating phases are lazy', () => {
    const src = read('app/components/pixel/minimize-animation.tsx');
    // Two img/motion.img referencing pixelImage — both must be lazy.
    const matches = src.match(/<(?:motion\.)?img[^>]*pixelImage[^>]*\/>/gs);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
    for (const m of matches!) {
      expect(m).toMatch(/loading="lazy"/);
    }
  });

  it('pixel/presence.tsx EXPANDED-mode avatar is lazy (corner-mode default stays eager)', () => {
    const src = read('app/components/pixel/presence.tsx');
    // The expanded-mode <img> sits inside `w-20 h-20 rounded-full overflow-hidden border-2 border-purple-500/30`.
    // Match the surrounding token + a loading="lazy" on the same JSX block.
    const expandedMatch = src.match(/border-purple-500\/30[\s\S]{0,200}<img[\s\S]*?\/>/);
    expect(expandedMatch, 'expanded-mode <img> not found near sentinel class').not.toBeNull();
    expect(expandedMatch![0]).toMatch(/loading="lazy"/);
  });

  it('does NOT lazy-load above-the-fold mascots', () => {
    // wizard avatar — primary LCP element, must NOT be lazy
    const wiz = read('app/components/wizard/avatar-display.tsx');
    const wizImg = wiz.match(/<img[^>]*pixelImage[^>]*\/>/s);
    expect(wizImg).not.toBeNull();
    expect(wizImg![0]).not.toMatch(/loading="lazy"/);

    // lesson.tsx in-page guidance bar mascot — pixelImage in the
    // ALWAYS-rendered header (not the celebration modal pixelCelebrating).
    const lesson = read('app/pages/lesson.tsx');
    const guidanceImg = lesson.match(/<motion\.img[^>]*src=\{pixelImage\}[^>]*\/>/s);
    expect(guidanceImg).not.toBeNull();
    expect(guidanceImg![0]).not.toMatch(/loading="lazy"/);
  });
});
