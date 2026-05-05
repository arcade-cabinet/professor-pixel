// PyGame Component Library - Main entry point
// Re-exports all components from modular files

// Import types
import type { PyGameComponent, AnyPyGameComponent, ComponentType } from './types';

import { hexToRgb, drawStar, drawHeart, drawCloud } from './types';

// Import individual components
import { spriteComponent } from './sprite';
import { platformComponent } from './platform';
import { ballComponent } from './ball';
import { paddleComponent } from './paddle';
import { enemyComponent } from './enemy';
import { collectibleComponent } from './collectible';
import { scoreTextComponent, buttonComponent, timerComponent, healthBarComponent } from './ui';
import { particleEffectComponent, backgroundComponent } from './effects';

// Re-export types
export type { PyGameComponent, ComponentType };

export { hexToRgb, drawStar, drawHeart, drawCloud };

// Combine all components into a single array. Function-argument variance
// is invariant in strict mode, so each typed `PyGameComponent<X>` is cast
// through `AnyPyGameComponent` here at the registry boundary. Each
// component's preview/generateCode receives a value of its own
// defaultProperties shape at call time, so the cast is sound.
export const pygameComponents: AnyPyGameComponent[] = [
  spriteComponent,
  platformComponent,
  ballComponent,
  paddleComponent,
  enemyComponent,
  collectibleComponent,
  backgroundComponent,
  scoreTextComponent,
  buttonComponent,
  particleEffectComponent,
  timerComponent,
  healthBarComponent,
] as unknown as AnyPyGameComponent[];

// Export as allComponents for backward compatibility
export const allComponents = pygameComponents;

// ============================================================================
// Component Registry and Helper Functions
// ============================================================================

export function getComponentById(id: string): AnyPyGameComponent | undefined {
  return pygameComponents.find((c) => c.id === id);
}

export function getComponentByType(type: ComponentType): AnyPyGameComponent | undefined {
  return pygameComponents.find((c) => c.type === type);
}

export function getAllComponents(): AnyPyGameComponent[] {
  return pygameComponents;
}

// Export for testing in browser console
if (typeof window !== 'undefined') {
  (window as Window & { testPygameComponents?: () => AnyPyGameComponent[] }).testPygameComponents =
    () => {
      console.log('🎮 PyGame Components Available:');
      pygameComponents.forEach((comp) => {
        console.log(`  - ${comp.name} (${comp.type}): ${comp.description}`);
      });
      return pygameComponents;
    };
}
