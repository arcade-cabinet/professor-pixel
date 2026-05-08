// Cover the boolean → 'True'/'False' ternary branches in two pygame
// components whose default props leave the opposite arm cold:
//   - paddle.ts:56  — playerControlled defaults to true, so the False
//                     arm stays uncovered until we pass false.
//   - platform.ts:54 — isMoving defaults to false, so the True arm
//                      stays uncovered until we pass true.

import { describe, expect, it } from 'vitest';
import { paddleComponent } from '@lib/pygame/components/paddle';
import { platformComponent } from '@lib/pygame/components/platform';

describe('paddle.generateCode — playerControlled false branch (line 56)', () => {
  it('emits self.player_controlled = False when playerControlled is false', () => {
    const out = paddleComponent.generateCode({
      ...paddleComponent.defaultProperties,
      playerControlled: false,
    });
    expect(out).toContain('self.player_controlled = False');
    expect(out).not.toContain('self.player_controlled = True');
  });

  it('still emits True when playerControlled is true (regression pin)', () => {
    const out = paddleComponent.generateCode({
      ...paddleComponent.defaultProperties,
      playerControlled: true,
    });
    expect(out).toContain('self.player_controlled = True');
    expect(out).not.toContain('self.player_controlled = False');
  });
});

describe('platform.generateCode — isMoving true branch (line 54)', () => {
  it('emits self.is_moving = True when isMoving is true', () => {
    const out = platformComponent.generateCode({
      ...platformComponent.defaultProperties,
      isMoving: true,
    });
    expect(out).toContain('self.is_moving = True');
    expect(out).not.toContain('self.is_moving = False');
  });

  it('still emits False when isMoving is false (regression pin)', () => {
    const out = platformComponent.generateCode({
      ...platformComponent.defaultProperties,
      isMoving: false,
    });
    expect(out).toContain('self.is_moving = False');
    expect(out).not.toContain('self.is_moving = True');
  });
});
