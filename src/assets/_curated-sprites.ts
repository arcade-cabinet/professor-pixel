// Sprite Asset Definitions
// CC0 sprites from Kenney.nl game assets

import { SpriteAsset } from './asset-types';

// Character sprites
export const characterSprites: SpriteAsset[] = [
  {
    id: 'robot-blue',
    name: 'Blue Robot',
    description: 'Friendly blue robot character with smooth animations',
    type: 'sprite',
    category: 'characters',
    path: '/assets/sprites/characters/robot_blue.png',
    thumbnail: '/assets/sprites/characters/robot_blue.png',
    tags: ['robot', 'blue', 'player', 'hero', 'sci-fi'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Great for sci-fi themed platformers or space adventures',
    size: { width: 128, height: 256 }
  },
  {
    id: 'robot-red',
    name: 'Red Robot',
    description: 'Energetic red robot with action-ready stance',
    type: 'sprite',
    category: 'characters',
    path: '/assets/sprites/characters/robot_red.png',
    thumbnail: '/assets/sprites/characters/robot_red.png',
    tags: ['robot', 'red', 'player', 'hero', 'sci-fi'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Perfect for action games or as a powerful character',
    size: { width: 128, height: 256 }
  },
  {
    id: 'robot-green',
    name: 'Green Robot',
    description: 'Nature-friendly green robot explorer',
    type: 'sprite',
    category: 'characters',
    path: '/assets/sprites/characters/robot_green.png',
    thumbnail: '/assets/sprites/characters/robot_green.png',
    tags: ['robot', 'green', 'player', 'hero', 'sci-fi'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Ideal for environmental or exploration games',
    size: { width: 128, height: 256 }
  },
  {
    id: 'robot-grey',
    name: 'Grey Robot',
    description: 'Stealthy grey robot with tactical abilities',
    type: 'sprite',
    category: 'characters',
    path: '/assets/sprites/characters/robot_grey.png',
    thumbnail: '/assets/sprites/characters/robot_grey.png',
    tags: ['robot', 'grey', 'player', 'hero', 'sci-fi', 'stealth'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Great for stealth missions or puzzle games',
    size: { width: 128, height: 256 }
  }
];

// Enemy sprites
export const enemySprites: SpriteAsset[] = [
  {
    id: 'ghost-floating',
    name: 'Floating Ghost',
    description: 'Spooky floating ghost enemy',
    type: 'sprite',
    category: 'enemies',
    path: '/assets/sprites/enemies/ghost_1.png',
    thumbnail: '/assets/sprites/enemies/ghost_1.png',
    tags: ['ghost', 'enemy', 'floating', 'spooky', 'undead'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Perfect for haunted levels or spooky sections',
    size: { width: 128, height: 128 }
  },
  {
    id: 'alien-flying',
    name: 'Flying Alien',
    description: 'Mysterious alien creature that hovers',
    type: 'sprite',
    category: 'enemies',
    path: '/assets/sprites/enemies/alien_1.png',
    thumbnail: '/assets/sprites/enemies/alien_1.png',
    tags: ['alien', 'enemy', 'flying', 'space', 'ufo'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Great for space levels or alien invasions',
    size: { width: 128, height: 128 }
  },
  {
    id: 'spikey-hazard',
    name: 'Spikey',
    description: 'Dangerous spiked enemy - avoid at all costs!',
    type: 'sprite',
    category: 'enemies',
    path: '/assets/sprites/enemies/spikey_1.png',
    thumbnail: '/assets/sprites/enemies/spikey_1.png',
    tags: ['spike', 'enemy', 'hazard', 'dangerous'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Use as a stationary hazard or moving obstacle',
    size: { width: 128, height: 128 }
  },
  {
    id: 'walker-enemy',
    name: 'Walker',
    description: 'Ground-based walking enemy',
    type: 'sprite',
    category: 'enemies',
    path: '/assets/sprites/enemies/walker_1.png',
    thumbnail: '/assets/sprites/enemies/walker_1.png',
    tags: ['walker', 'enemy', 'ground', 'patrol'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Perfect for patrolling platforms or ground areas',
    size: { width: 128, height: 128 }
  }
];

// Item sprites
export const itemSprites: SpriteAsset[] = [
  {
    id: 'gem-blue',
    name: 'Blue Gem',
    description: 'Valuable blue gem collectible',
    type: 'sprite',
    category: 'items',
    path: '/assets/sprites/items/gem_blue.png',
    thumbnail: '/assets/sprites/items/gem_blue.png',
    tags: ['gem', 'blue', 'collectible', 'treasure', 'points'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Use as a high-value collectible worth 10 points',
    size: { width: 64, height: 64 }
  },
  {
    id: 'gem-green',
    name: 'Green Gem',
    description: 'Rare green gem collectible',
    type: 'sprite',
    category: 'items',
    path: '/assets/sprites/items/gem_green.png',
    thumbnail: '/assets/sprites/items/gem_green.png',
    tags: ['gem', 'green', 'collectible', 'treasure', 'points'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Special collectible for bonus levels',
    size: { width: 64, height: 64 }
  },
  {
    id: 'gem-red',
    name: 'Red Gem',
    description: 'Fiery red gem collectible',
    type: 'sprite',
    category: 'items',
    path: '/assets/sprites/items/gem_red.png',
    thumbnail: '/assets/sprites/items/gem_red.png',
    tags: ['gem', 'red', 'collectible', 'treasure', 'points'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Rare gem worth 25 points',
    size: { width: 64, height: 64 }
  },
  {
    id: 'gem-yellow',
    name: 'Yellow Gem',
    description: 'Shining yellow gem collectible',
    type: 'sprite',
    category: 'items',
    path: '/assets/sprites/items/gem_yellow.png',
    thumbnail: '/assets/sprites/items/gem_yellow.png',
    tags: ['gem', 'yellow', 'collectible', 'treasure', 'points'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Common collectible worth 5 points',
    size: { width: 64, height: 64 }
  },
  {
    id: 'crystal-blue',
    name: 'Blue Crystal',
    description: 'Magical blue crystal with power',
    type: 'sprite',
    category: 'items',
    path: '/assets/sprites/items/crystal_blue.png',
    thumbnail: '/assets/sprites/items/crystal_blue.png',
    tags: ['crystal', 'blue', 'powerup', 'magic', 'special'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Use as a power-up or special ability item',
    size: { width: 64, height: 64 }
  },
  {
    id: 'crystal-green',
    name: 'Green Crystal',
    description: 'Life-giving green crystal',
    type: 'sprite',
    category: 'items',
    path: '/assets/sprites/items/crystal_green.png',
    thumbnail: '/assets/sprites/items/crystal_green.png',
    tags: ['crystal', 'green', 'powerup', 'health', 'special'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Perfect for health restoration power-ups',
    size: { width: 64, height: 64 }
  },
  {
    id: 'key-green',
    name: 'Green Key',
    description: 'Key to unlock green doors',
    type: 'sprite',
    category: 'items',
    path: '/assets/sprites/items/key_green.png',
    thumbnail: '/assets/sprites/items/key_green.png',
    tags: ['key', 'green', 'unlock', 'door', 'puzzle'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Use in puzzle platformers to unlock areas',
    size: { width: 64, height: 64 }
  },
  {
    id: 'key-red',
    name: 'Red Key',
    description: 'Key to unlock red doors',
    type: 'sprite',
    category: 'items',
    path: '/assets/sprites/items/key_red.png',
    thumbnail: '/assets/sprites/items/key_red.png',
    tags: ['key', 'red', 'unlock', 'door', 'puzzle'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Use for locked doors and secret areas',
    size: { width: 64, height: 64 }
  }
];

// Placeholder/fallback sprites
export const placeholderSprites: SpriteAsset[] = [
  {
    id: 'placeholder-square',
    name: 'Square Placeholder',
    description: 'Simple colored square for testing',
    type: 'sprite',
    category: 'misc',
    path: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    tags: ['placeholder', 'test', 'debug'],
    license: 'Public Domain',
    suggestedUse: 'Use when specific sprite is not yet available',
    size: { width: 64, height: 64 }
  },
  {
    id: 'placeholder-circle',
    name: 'Circle Placeholder',
    description: 'Simple colored circle for testing',
    type: 'sprite',
    category: 'misc',
    path: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzAiIGZpbGw9IiM0MDQwZmYiLz48L3N2Zz4=',
    thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzAiIGZpbGw9IiM0MDQwZmYiLz48L3N2Zz4=',
    tags: ['placeholder', 'test', 'debug', 'circle'],
    license: 'Public Domain',
    suggestedUse: 'Use for ball or circular objects',
    size: { width: 64, height: 64 }
  }
];

// Export all sprites
export const allSprites: SpriteAsset[] = [
  ...characterSprites,
  ...enemySprites,
  ...itemSprites,
  ...placeholderSprites
];

// Helper functions
export function getSpriteById(id: string): SpriteAsset | undefined {
  return allSprites.find(sprite => sprite.id === id);
}

export function getSpritesByCategory(category: string): SpriteAsset[] {
  return allSprites.filter(sprite => sprite.category === category);
}

export function getSpritesByTags(tags: string[]): SpriteAsset[] {
  return allSprites.filter(sprite => 
    tags.some(tag => sprite.tags.includes(tag))
  );
}