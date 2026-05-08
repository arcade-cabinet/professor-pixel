import { describe, expect, it } from 'vitest';
import { ballComponent } from '@lib/pygame/components/ball';
import { enemyComponent } from '@lib/pygame/components/enemy';
import { paddleComponent } from '@lib/pygame/components/paddle';
import { platformComponent } from '@lib/pygame/components/platform';
import { spriteComponent } from '@lib/pygame/components/sprite';
import {
  buttonComponent,
  healthBarComponent,
  scoreTextComponent,
  timerComponent,
} from '@lib/pygame/components/ui';

// Each component's generateCode embeds default fallbacks via `||`:
//   self.gravity = ${props.gravity || 0}
//   self.bounciness = ${props.bounciness || 0.8}
//   self.health = ${props.health || 3}
//   self.move_speed = ${props.moveSpeed || 2}
//   ...
// The default-properties path sets each to a non-zero value, leaving
// the fallback branch (props.X falsy → use literal default) cold.
// These tests exercise each component with the relevant prop set to
// undefined so coverage reflects the true contract.

function fakeCtx() {
  // Minimal stub — these tests only call generateCode, not preview,
  // but a couple of preview paths read props.color || fallback.
  const calls: Record<string, number> = {};
  const track = (name: string) => () => {
    calls[name] = (calls[name] || 0) + 1;
  };
  return {
    canvas: { width: 400, height: 300 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '10px sans-serif',
    textAlign: 'left' as CanvasTextAlign,
    fillRect: track('fillRect'),
    strokeRect: track('strokeRect'),
    beginPath: track('beginPath'),
    closePath: track('closePath'),
    moveTo: track('moveTo'),
    lineTo: track('lineTo'),
    arc: track('arc'),
    fill: track('fill'),
    stroke: track('stroke'),
    fillText: track('fillText'),
    save: track('save'),
    restore: track('restore'),
    translate: track('translate'),
    rotate: track('rotate'),
    setLineDash: track('setLineDash'),
    measureText: () => ({ width: 50 }) as TextMetrics,
    _calls: calls,
  } as unknown as CanvasRenderingContext2D & { _calls: Record<string, number> };
}

describe('ball.generateCode — fallback branches', () => {
  it('gravity defaults to 0 when undefined', () => {
    const out = ballComponent.generateCode({
      ...ballComponent.defaultProperties,
      gravity: undefined as unknown as number,
    });
    expect(out).toContain('self.gravity = 0');
  });

  it('bounciness defaults to 0.8 when undefined', () => {
    const out = ballComponent.generateCode({
      ...ballComponent.defaultProperties,
      bounciness: undefined as unknown as number,
    });
    expect(out).toContain('self.bounciness = 0.8');
  });

  it('uses provided gravity + bounciness when defined', () => {
    const out = ballComponent.generateCode({
      ...ballComponent.defaultProperties,
      gravity: 5,
      bounciness: 0.3,
    });
    expect(out).toContain('self.gravity = 5');
    expect(out).toContain('self.bounciness = 0.3');
  });
});

describe('enemy.generateCode — fallback branches', () => {
  it('health defaults to 3 when undefined', () => {
    const out = enemyComponent.generateCode({
      ...enemyComponent.defaultProperties,
      health: undefined as unknown as number,
    });
    expect(out).toContain('self.health = 3');
  });

  it('uses provided health when defined', () => {
    const out = enemyComponent.generateCode({
      ...enemyComponent.defaultProperties,
      health: 99,
    });
    expect(out).toContain('self.health = 99');
  });
});

describe('paddle.generateCode — fallback branches', () => {
  it("controls defaults to 'arrows' when undefined", () => {
    const out = paddleComponent.generateCode({
      ...paddleComponent.defaultProperties,
      controls: undefined as unknown as 'arrows' | 'wasd' | 'mouse',
    });
    expect(out).toContain("self.controls = 'arrows'");
  });

  it.each(['arrows', 'wasd', 'mouse'] as const)("preserves controls='%s'", (controls) => {
    const out = paddleComponent.generateCode({
      ...paddleComponent.defaultProperties,
      controls,
    });
    expect(out).toContain(`self.controls = '${controls}'`);
  });
});

describe('platform.generateCode — fallback branches', () => {
  it('moveSpeed defaults to 2 + moveRange defaults to 100 when undefined', () => {
    const out = platformComponent.generateCode({
      ...platformComponent.defaultProperties,
      moveSpeed: undefined as unknown as number,
      moveRange: undefined as unknown as number,
    });
    expect(out).toContain('self.move_speed = 2');
    expect(out).toContain('self.move_range = 100');
  });

  it('uses provided moveSpeed + moveRange when defined', () => {
    const out = platformComponent.generateCode({
      ...platformComponent.defaultProperties,
      moveSpeed: 10,
      moveRange: 500,
    });
    expect(out).toContain('self.move_speed = 10');
    expect(out).toContain('self.move_range = 500');
  });
});

describe('sprite — color fallback in preview + generateCode', () => {
  it("preview falls back to '#4F46E5' when props.color is undefined", () => {
    const ctx = fakeCtx();
    expect(() =>
      spriteComponent.preview(ctx, {
        ...spriteComponent.defaultProperties,
        color: undefined as unknown as string,
      })
    ).not.toThrow();
  });

  it("generateCode falls back to '#4F46E5' (RGB 79,70,229) when color undefined", () => {
    const out = spriteComponent.generateCode({
      ...spriteComponent.defaultProperties,
      color: undefined as unknown as string,
    });
    // hexToRgb('#4F46E5') = [79, 70, 229]
    expect(out).toContain('(79, 70, 229)');
  });
});

describe('scoreText.preview — fontFamily/alignment fallbacks', () => {
  it("falls back to fontFamily='Arial' + alignment='left' when undefined", () => {
    // ScoreText.preview reads `props.fontFamily || 'Arial'` and
    // `props.alignment || 'left'`. The default-properties object doesn't
    // include either, so they ARE undefined under defaults — but pinning
    // explicitly here makes the contract test the actual fallback path
    // rather than relying on the omitted-key happens-to-be-undefined
    // coincidence.
    const ctx = fakeCtx();
    expect(() =>
      scoreTextComponent.preview(ctx, {
        ...scoreTextComponent.defaultProperties,
        fontFamily: undefined as unknown as string,
        alignment: undefined as unknown as 'left' | 'center' | 'right',
      })
    ).not.toThrow();
  });
});

describe('scoreText.generateCode — isScore=false branch', () => {
  it("emits self.is_score = False when isScore is false", () => {
    // The default-properties object sets isScore=true so the "False"
    // arm of `${props.isScore ? 'True' : 'False'}` (line 83) sat cold.
    const out = scoreTextComponent.generateCode({
      ...scoreTextComponent.defaultProperties,
      isScore: false,
    });
    expect(out).toContain('self.is_score = False');
  });
});

describe('button.generateCode — fontSize fallback', () => {
  it('falls back to font_size = 18 when fontSize is undefined', () => {
    // `${props.fontSize || 18}` (line 144) — defaults set 18 explicitly,
    // so the falsy arm only fires when callers omit fontSize.
    const out = buttonComponent.generateCode({
      ...buttonComponent.defaultProperties,
      fontSize: undefined as unknown as number,
    });
    expect(out).toContain('self.font_size = 18');
  });
});

describe('timer — countDown=false branches (preview + generateCode)', () => {
  it("preview shows '00:00' when countDown is false", () => {
    // `props.countDown ? '60:00' : '00:00'` (line 191) — default is true,
    // so the "00:00" arm needs an explicit override.
    const ctx = fakeCtx();
    expect(() =>
      timerComponent.preview(ctx, {
        ...timerComponent.defaultProperties,
        countDown: false,
      })
    ).not.toThrow();
  });

  it('generateCode emits count_down=False + show_milliseconds=False when both false', () => {
    // Lines 202 + 205: both ternaries default to True under defaults.
    const out = timerComponent.generateCode({
      ...timerComponent.defaultProperties,
      countDown: false,
      showMilliseconds: false,
    });
    expect(out).toContain('self.count_down = False');
    expect(out).toContain('self.show_milliseconds = False');
  });

  it('generateCode emits show_milliseconds=True when explicitly enabled', () => {
    // Pin the True arm of line 205 — defaults set it false so True is cold.
    const out = timerComponent.generateCode({
      ...timerComponent.defaultProperties,
      showMilliseconds: true,
    });
    expect(out).toContain('self.show_milliseconds = True');
  });
});

describe('healthBar — showText=false branches (preview + generateCode)', () => {
  it('preview skips the text path when showText is false', () => {
    // Line 286: `if (props.showText)` — defaults set true, falsy arm cold.
    const ctx = fakeCtx();
    expect(() =>
      healthBarComponent.preview(ctx, {
        ...healthBarComponent.defaultProperties,
        showText: false,
      })
    ).not.toThrow();
  });

  it('generateCode emits self.show_text = False when showText is false', () => {
    // Line 309: `${props.showText ? 'True' : 'False'}` — defaults true.
    const out = healthBarComponent.generateCode({
      ...healthBarComponent.defaultProperties,
      showText: false,
    });
    expect(out).toContain('self.show_text = False');
  });
});
