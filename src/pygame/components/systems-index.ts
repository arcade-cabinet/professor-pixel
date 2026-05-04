// Pygame Component Library Index
// This exports all components organized by category

// Import all components
import { jumpComponent } from './movement/jump';
import { walkComponent } from './movement/walk';
import { shootingComponent } from './combat/shooting';
import { meleeComponent } from './combat/melee';
import { healthComponent } from './ui/health';
import { scoreComponent } from './ui/score';
import { gravityComponent } from './world/gravity';
import { collisionComponent } from './world/collision';

// Export component types
export type { PygameComponent, ComponentSelection } from './types';

// Export components organized by category
export const pygameComponents = {
  movement: [jumpComponent, walkComponent],
  combat: [shootingComponent, meleeComponent],
  ui: [healthComponent, scoreComponent],
  world: [gravityComponent, collisionComponent]
};

// Flat list of all components for easy iteration
export const allComponents = [
  jumpComponent,
  walkComponent,
  shootingComponent,
  meleeComponent,
  healthComponent,
  scoreComponent,
  gravityComponent,
  collisionComponent
];

// Helper to get a component by ID
export function getComponentById(id: string) {
  return allComponents.find(component => component.id === id);
}

// Helper to get components by category
export function getComponentsByCategory(category: 'movement' | 'combat' | 'ui' | 'world') {
  return pygameComponents[category] || [];
}

// Helper to get all categories
export function getCategories() {
  return Object.keys(pygameComponents) as Array<'movement' | 'combat' | 'ui' | 'world'>;
}