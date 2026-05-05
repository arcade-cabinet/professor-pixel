// PyGame Component Type Definitions
// All TypeScript interfaces and types for pygame components

// ============================================================================
// Component Type Definitions
// ============================================================================

export type ComponentType =
  | 'sprite'
  | 'platform'
  | 'ball'
  | 'paddle'
  | 'enemy'
  | 'collectible'
  | 'background'
  | 'scoreText'
  | 'button'
  | 'particleEffect'
  | 'timer'
  | 'healthBar';

/**
 * Runtime type the property inspector + code generator round-trip. Components
 * read/write strings, numbers, booleans, and option labels. Color is a hex
 * string; positions are numbers.
 */
export type ComponentPropertyValue = string | number | boolean;

/**
 * Schema describing a single editable property the wizard surfaces. The
 * inspector switches on `type` to render the correct control.
 */
export interface PropertyDefinition {
  name: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'color' | 'select';
  default?: ComponentPropertyValue;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  description?: string;
}

/** Bag the wizard threads through the inspector — every property is one of
 * the runtime types we know how to surface. */
export type ComponentPropertyBag = Record<string, ComponentPropertyValue>;

/**
 * The component registry stores definitions parameterized over their props
 * shape. Constraining to `object` rather than `ComponentPropertyBag` lets
 * the per-component property interfaces (`BallProperties`, etc.) participate
 * without each one having to declare an `[key: string]: ComponentPropertyValue`
 * index signature; the wizard inspector treats unknown property values as
 * `ComponentPropertyValue` at runtime.
 */
export interface PyGameComponent<P extends object = ComponentPropertyBag> {
  type: ComponentType;
  id: string;
  name: string;
  description: string;
  wizardDescription: string; // Friendly explanation for students
  properties: ComponentPropertyBag;
  preview: (ctx: CanvasRenderingContext2D, props: P) => void;
  generateCode: (props: P) => string;
  defaultProperties: P;
}

/**
 * Erased view of `PyGameComponent` used by registry / inspector code that
 * holds heterogeneous components in one array. Function-argument
 * contravariance prevents `PyGameComponent<X>` from assigning to
 * `PyGameComponent<ComponentPropertyBag>`, so `AnyPyGameComponent` widens
 * `preview` and `generateCode` to take `unknown` — the registry only ever
 * forwards a component's own defaultProperties back through these callbacks,
 * so the call sites cast through `unknown` at the boundary.
 */
export interface AnyPyGameComponent {
  type: ComponentType;
  id: string;
  name: string;
  description: string;
  wizardDescription: string;
  properties: ComponentPropertyBag;
  preview: (ctx: CanvasRenderingContext2D, props: unknown) => void;
  generateCode: (props: unknown) => string;
  defaultProperties: ComponentPropertyBag;
}

// ============================================================================
// Component Property Interfaces
// ============================================================================

export interface SpriteProperties {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  imagePath?: string;
  width: number;
  height: number;
  color?: string;
}

export interface PlatformProperties {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isMoving?: boolean;
  moveSpeed?: number;
  moveRange?: number;
}

export interface BallProperties {
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  color: string;
  gravity?: number;
  bounciness?: number;
}

export interface PaddleProperties {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
  playerControlled: boolean;
  controls?: 'arrows' | 'wasd' | 'mouse';
}

export interface EnemyProperties {
  x: number;
  y: number;
  patternType: 'patrol' | 'chase' | 'circle' | 'random';
  speed: number;
  width: number;
  height: number;
  color: string;
  health?: number;
}

export interface CollectibleProperties {
  x: number;
  y: number;
  type: 'coin' | 'powerup' | 'key' | 'health';
  value: number;
  size: number;
  color: string;
  respawns?: boolean;
}

export interface BackgroundProperties {
  imagePath?: string;
  color?: string;
  scrollSpeed: number;
  parallax?: boolean;
  tileMode?: boolean;
}

export interface ScoreTextProperties {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily?: string;
  alignment?: 'left' | 'center' | 'right';
  isScore?: boolean;
}

export interface ButtonProperties {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  onClick: string; // Python function name
  color: string;
  textColor: string;
  fontSize?: number;
}

export interface ParticleEffectProperties {
  x: number;
  y: number;
  type: 'explosion' | 'sparkle' | 'smoke' | 'confetti';
  duration: number;
  particleCount: number;
  color: string;
  spread?: number;
}

export interface TimerProperties {
  duration: number;
  x: number;
  y: number;
  onComplete: string; // Python function name
  countDown: boolean;
  fontSize: number;
  color: string;
  showMilliseconds?: boolean;
}

export interface HealthBarProperties {
  x: number;
  y: number;
  current: number;
  max: number;
  width: number;
  height: number;
  color: string;
  backgroundColor: string;
  showText?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  points: number
) {
  const step = Math.PI / points;
  ctx.beginPath();
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.5;
    const angle = i * step - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + size / 4);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
  ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + (size * 3) / 4, x, y + size);
  ctx.bezierCurveTo(x, y + (size * 3) / 4, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
  ctx.fill();
}

export function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.arc(x + size * 0.8, y, size * 0.8, 0, Math.PI * 2);
  ctx.arc(x + size * 0.4, y - size * 0.3, size * 0.6, 0, Math.PI * 2);
  ctx.fill();
}
