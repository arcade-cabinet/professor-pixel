// PyGame Component Library - Main entry point
// Re-exports all components from modular files

// Import types
import type { 
  PyGameComponent,
  ComponentType
} from './pygame-component-types';

import {
  hexToRgb,
  drawStar,
  drawHeart,
  drawCloud
} from './pygame-component-types';

// Import individual components
import { spriteComponent } from './pygame-component-sprite';
import { platformComponent } from './pygame-component-platform';
import { ballComponent } from './pygame-component-ball';
import { paddleComponent } from './pygame-component-paddle';
import { enemyComponent } from './pygame-component-enemy';
import { collectibleComponent } from './pygame-component-collectible';
import { 
  scoreTextComponent, 
  buttonComponent, 
  timerComponent, 
  healthBarComponent 
} from './pygame-component-ui';
import { 
  particleEffectComponent, 
  backgroundComponent 
} from './pygame-component-effects';

// Re-export types
export type {
  PyGameComponent,
  ComponentType
};

export {
  hexToRgb,
  drawStar,
  drawHeart,
  drawCloud
};

// Combine all components into a single array
export const pygameComponents: PyGameComponent[] = [
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
  healthBarComponent
];

// Export as allComponents for backward compatibility
export const allComponents = pygameComponents;

// ============================================================================
// Component Registry and Helper Functions
// ============================================================================

export function getComponentById(id: string): PyGameComponent | undefined {
  return pygameComponents.find(c => c.id === id);
}

export function getComponentByType(type: ComponentType): PyGameComponent | undefined {
  return pygameComponents.find(c => c.type === type);
}

export function getAllComponents(): PyGameComponent[] {
  return pygameComponents;
}

// Export for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testPygameComponents = () => {
    console.log('🎮 PyGame Components Available:');
    pygameComponents.forEach(comp => {
      console.log(`  - ${comp.name} (${comp.type}): ${comp.description}`);
    });
    return pygameComponents;
  };
}