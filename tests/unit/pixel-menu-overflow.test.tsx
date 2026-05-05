// P4.27 — PixelMenu content area scrolls instead of clipping when
// the viewport is too short for all action buttons.
//
// Context: the menu renders a 2-column grid of 7 action buttons.
// On a narrow / short mobile viewport (iPhone SE, 568px tall) the
// grid would clip with the previous `overflow-hidden`. After this
// pillar's accumulated additions (Help, audio toggle, etc.) the
// fix is to flip the inner content wrapper to overflow-y-auto and
// drop the inner h-full so rows take natural height.
//
// We exercise this at the source level — the JSX is stable and the
// classes are the contract — rather than mounting the full menu
// (which pulls swipeable + framer-motion + assets + shadcn).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MENU_SOURCE = readFileSync(
  join(__dirname, '..', '..', 'app/components/pixel/menu.tsx'),
  'utf8'
);

describe('PixelMenu content overflow (P4.27)', () => {
  it('content wrapper uses overflow-y-auto, not overflow-hidden', () => {
    // The inner content wrapper is the div whose comment block
    // contains "Content Area" — it directly precedes the actions grid.
    const wrapperMatch = MENU_SOURCE.match(/Content Area[\s\S]*?<div className="([^"]*)"/);
    expect(wrapperMatch).not.toBeNull();
    const className = wrapperMatch![1];
    expect(className).toContain('overflow-y-auto');
    expect(className).not.toContain('overflow-hidden');
  });

  it('actions grid does not pin to h-full (lets rows take natural height)', () => {
    // The motion.div inside the actions branch — first one after the
    // "Quick Actions" inline JSX comment.
    const gridMatch = MENU_SOURCE.match(
      /Quick Actions[\s\S]*?<motion\.div[\s\S]*?className="([^"]*)"/
    );
    expect(gridMatch).not.toBeNull();
    const className = gridMatch![1];
    expect(className).not.toContain('h-full');
    // auto-rows-min keeps rows tight in the scrollable container so
    // a kid scrolls past content rather than past blank space.
    expect(className).toContain('auto-rows-min');
  });
});
