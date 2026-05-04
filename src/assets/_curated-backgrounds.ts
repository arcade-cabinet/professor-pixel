// Background Asset Definitions
// CC0 backgrounds and environments for games

import { BackgroundAsset } from './asset-types';

// Background assets
export const backgrounds: BackgroundAsset[] = [
  // Forest backgrounds
  {
    id: 'bg-forest',
    name: 'Forest',
    description: 'Lush green forest background with trees',
    type: 'background',
    category: 'forest',
    path: '/assets/backgrounds/forest.png',
    thumbnail: '/assets/backgrounds/forest.png',
    tags: ['forest', 'nature', 'green', 'trees', 'outdoor'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Perfect for nature levels, RPGs, or peaceful scenes',
    size: { width: 1920, height: 1080 },
    tiling: true,
    parallax: true,
    scrollSpeed: { x: 0.5, y: 0 }
  },
  {
    id: 'bg-forest-detailed',
    name: 'Forest Detailed',
    description: 'Detailed forest scene with depth layers',
    type: 'background',
    category: 'forest',
    path: '/assets/backgrounds/forest_detailed.png',
    thumbnail: '/assets/backgrounds/forest_detailed.png',
    tags: ['forest', 'detailed', 'nature', 'layers'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Great for side-scrolling adventures',
    size: { width: 1920, height: 1080 },
    tiling: true,
    parallax: true,
    scrollSpeed: { x: 0.3, y: 0 }
  },
  
  // City backgrounds
  {
    id: 'bg-city',
    name: 'City Skyline',
    description: 'Modern city skyline with buildings',
    type: 'background',
    category: 'city',
    path: '/assets/backgrounds/city.png',
    thumbnail: '/assets/backgrounds/city.png',
    tags: ['city', 'urban', 'buildings', 'skyline', 'modern'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Urban settings, superhero games, or modern adventures',
    size: { width: 1920, height: 1080 },
    tiling: true,
    parallax: true,
    scrollSpeed: { x: 0.4, y: 0 }
  },
  
  // Desert backgrounds
  {
    id: 'bg-desert',
    name: 'Desert Dunes',
    description: 'Sandy desert with rolling dunes',
    type: 'background',
    category: 'desert',
    path: '/assets/backgrounds/desert.png',
    thumbnail: '/assets/backgrounds/desert.png',
    tags: ['desert', 'sand', 'dunes', 'hot', 'dry'],
    license: 'CC0 - Kenney.nl',
    suggestedUse: 'Desert adventures, western themes, or challenging environments',
    size: { width: 1920, height: 1080 },
    tiling: true,
    parallax: true,
    scrollSpeed: { x: 0.2, y: 0 }
  },
  
  // Space backgrounds
  {
    id: 'bg-space-stars',
    name: 'Starfield',
    description: 'Deep space with twinkling stars',
    type: 'background',
    category: 'space',
    path: '/assets/backgrounds/space_stars.png',
    thumbnail: '/assets/backgrounds/space_stars.png',
    tags: ['space', 'stars', 'cosmos', 'sci-fi', 'dark'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Space shooters, sci-fi adventures, or cosmic settings',
    size: { width: 1920, height: 1080 },
    tiling: true,
    parallax: false,
    scrollSpeed: { x: 0.1, y: 0.1 }
  },
  {
    id: 'bg-space-nebula',
    name: 'Nebula',
    description: 'Colorful space nebula background',
    type: 'background',
    category: 'space',
    path: '/assets/backgrounds/space_nebula.png',
    thumbnail: '/assets/backgrounds/space_nebula.png',
    tags: ['space', 'nebula', 'colorful', 'sci-fi', 'cosmic'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Epic space battles or exploration games',
    size: { width: 1920, height: 1080 },
    tiling: false,
    parallax: true,
    scrollSpeed: { x: 0.15, y: 0.05 }
  },
  
  // Underwater backgrounds
  {
    id: 'bg-underwater',
    name: 'Underwater',
    description: 'Deep blue underwater scene',
    type: 'background',
    category: 'underwater',
    path: '/assets/backgrounds/underwater.png',
    thumbnail: '/assets/backgrounds/underwater.png',
    tags: ['underwater', 'ocean', 'sea', 'blue', 'aquatic'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Underwater adventures, submarine games, or ocean exploration',
    size: { width: 1920, height: 1080 },
    tiling: true,
    parallax: true,
    scrollSpeed: { x: 0.3, y: 0.1 }
  },
  
  // Dungeon backgrounds
  {
    id: 'bg-dungeon-stone',
    name: 'Stone Dungeon',
    description: 'Dark stone dungeon walls',
    type: 'background',
    category: 'dungeon',
    path: '/assets/backgrounds/dungeon_stone.png',
    thumbnail: '/assets/backgrounds/dungeon_stone.png',
    tags: ['dungeon', 'stone', 'dark', 'cave', 'underground'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Dungeon crawlers, RPGs, or underground adventures',
    size: { width: 1920, height: 1080 },
    tiling: true,
    parallax: false
  },
  {
    id: 'bg-dungeon-brick',
    name: 'Brick Dungeon',
    description: 'Old brick dungeon interior',
    type: 'background',
    category: 'dungeon',
    path: '/assets/backgrounds/dungeon_brick.png',
    thumbnail: '/assets/backgrounds/dungeon_brick.png',
    tags: ['dungeon', 'brick', 'castle', 'medieval', 'underground'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Castle dungeons or medieval settings',
    size: { width: 1920, height: 1080 },
    tiling: true,
    parallax: false
  },
  
  // Abstract backgrounds
  {
    id: 'bg-abstract-gradient',
    name: 'Gradient',
    description: 'Smooth color gradient background',
    type: 'background',
    category: 'abstract',
    path: '/assets/backgrounds/abstract_gradient.png',
    thumbnail: '/assets/backgrounds/abstract_gradient.png',
    tags: ['abstract', 'gradient', 'colorful', 'simple', 'modern'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Puzzle games, minimalist designs, or menu backgrounds',
    size: { width: 1920, height: 1080 },
    tiling: false,
    parallax: false
  },
  {
    id: 'bg-abstract-pattern',
    name: 'Geometric Pattern',
    description: 'Repeating geometric pattern',
    type: 'background',
    category: 'abstract',
    path: '/assets/backgrounds/abstract_pattern.png',
    thumbnail: '/assets/backgrounds/abstract_pattern.png',
    tags: ['abstract', 'pattern', 'geometric', 'repeating'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Puzzle games or stylized environments',
    size: { width: 512, height: 512 },
    tiling: true,
    parallax: false
  },
  
  // Solid color backgrounds (placeholders)
  {
    id: 'bg-solid-blue',
    name: 'Solid Blue',
    description: 'Simple solid blue background',
    type: 'background',
    category: 'solid',
    path: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    tags: ['solid', 'blue', 'simple', 'placeholder'],
    license: 'Public Domain',
    suggestedUse: 'Simple background or testing',
    size: { width: 1, height: 1 },
    tiling: true,
    parallax: false
  },
  {
    id: 'bg-solid-green',
    name: 'Solid Green',
    description: 'Simple solid green background',
    type: 'background',
    category: 'solid',
    path: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M8wHwADfgGBTqJJPAAAAABJRU5ErkJggg==',
    thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M8wHwADfgGBTqJJPAAAAABJRU5ErkJggg==',
    tags: ['solid', 'green', 'simple', 'placeholder'],
    license: 'Public Domain',
    suggestedUse: 'Simple background or testing',
    size: { width: 1, height: 1 },
    tiling: true,
    parallax: false
  },
  {
    id: 'bg-solid-black',
    name: 'Solid Black',
    description: 'Simple solid black background',
    type: 'background',
    category: 'solid',
    path: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    tags: ['solid', 'black', 'dark', 'simple', 'placeholder'],
    license: 'Public Domain',
    suggestedUse: 'Dark scenes or space backgrounds',
    size: { width: 1, height: 1 },
    tiling: true,
    parallax: false
  },
  {
    id: 'bg-solid-sky',
    name: 'Sky Blue',
    description: 'Light blue sky color background',
    type: 'background',
    category: 'solid',
    path: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    tags: ['solid', 'sky', 'blue', 'light', 'simple'],
    license: 'Public Domain',
    suggestedUse: 'Daytime sky or cheerful backgrounds',
    size: { width: 1, height: 1 },
    tiling: true,
    parallax: false
  }
];

// Export all backgrounds
export const allBackgrounds = backgrounds;

// Helper functions
export function getBackgroundById(id: string): BackgroundAsset | undefined {
  return backgrounds.find(bg => bg.id === id);
}

export function getBackgroundsByCategory(category: string): BackgroundAsset[] {
  return backgrounds.filter(bg => bg.category === category);
}

export function getBackgroundsByTags(tags: string[]): BackgroundAsset[] {
  return backgrounds.filter(bg => 
    tags.some(tag => bg.tags.includes(tag))
  );
}

export function getTilingBackgrounds(): BackgroundAsset[] {
  return backgrounds.filter(bg => bg.tiling === true);
}

export function getParallaxBackgrounds(): BackgroundAsset[] {
  return backgrounds.filter(bg => bg.parallax === true);
}