// Cover the type-default fallback in particleEffectComponent.preview
// (line 42) of src/pygame/components/effects.ts: when `props.type` is
// undefined or empty, the `||` fallback resolves to 'explosion'. The
// existing effects-branches.test.ts always supplies a concrete type,
// so the OR right-hand side stays uncov.

import { describe, expect, it } from 'vitest';
import { particleEffectComponent } from '@lib/pygame/components/effects';

function makeStubCtx(): CanvasRenderingContext2D {
  // Minimal CanvasRenderingContext2D shim — we don't assert pixel
  // output, only that preview() runs the explosion-default branch
  // without throwing.
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fillRect: () => {},
  } as unknown as CanvasRenderingContext2D;
}

describe('particleEffect — type default fallback (line 42)', () => {
  it('treats undefined type as the explosion default and renders without throwing', () => {
    const ctx = makeStubCtx();
    expect(() =>
      particleEffectComponent.preview(ctx, {
        ...particleEffectComponent.defaultProperties,
        type: undefined as unknown as 'explosion',
      })
    ).not.toThrow();
  });

  it('treats empty-string type as the explosion default', () => {
    const ctx = makeStubCtx();
    expect(() =>
      particleEffectComponent.preview(ctx, {
        ...particleEffectComponent.defaultProperties,
        type: '' as unknown as 'explosion',
      })
    ).not.toThrow();
  });
});
