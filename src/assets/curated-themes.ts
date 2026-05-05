// Curated asset combinations that work well together
// Each combination is guaranteed to create a visually cohesive game

export interface CuratedCharacter {
  id: string;
  name: string;
  displayName: string;
  standSprite: string;
  sprites: {
    stand: string;
    walk: string[];
    jump: string;
    fall: string;
    hit: string;
  };
  color: string;
}

export interface CuratedTileset {
  id: string;
  name: string;
  displayName: string;
  previewTile: string;
  tilePath: string;
  color: string;
}

export interface CuratedEnemy {
  id: string;
  name: string;
  displayName: string;
  sprites: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  movement: 'walking' | 'flying' | 'floating' | 'spikey';
}

export interface CuratedItem {
  id: string;
  name: string;
  sprite: string;
  type: 'gem' | 'crystal' | 'jewel' | 'key' | 'puzzle';
  color: string;
}

export interface CuratedTheme {
  id: string;
  name: string;
  characters: CuratedCharacter[];
  tilesets: CuratedTileset[];
  enemies: CuratedEnemy[];
  items: CuratedItem[];
  recommendedCombos: {
    character: string;
    tileset: string;
    enemies: string[];
    items: string[];
  }[];
}

// Colorful Adventure Theme - uses Abstract Platformer assets
export const colorfulAdventureTheme: CuratedTheme = {
  id: 'colorful',
  name: 'Colorful Adventure',
  characters: [
    {
      id: 'blue',
      name: 'Blue Hero',
      displayName: 'Cool and Collected',
      standSprite:
        '@assets/2D assets/Abstract Platformer/PNG/Players/Player Blue/playerBlue_stand.png',
      sprites: {
        stand: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Blue/playerBlue_stand.png',
        walk: [
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Blue/playerBlue_walk1.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Blue/playerBlue_walk2.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Blue/playerBlue_walk3.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Blue/playerBlue_walk4.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Blue/playerBlue_walk5.png',
        ],
        jump: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Blue/playerBlue_up1.png',
        fall: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Blue/playerBlue_fall.png',
        hit: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Blue/playerBlue_hit.png',
      },
      color: 'blue',
    },
    {
      id: 'red',
      name: 'Red Hero',
      displayName: 'Bold and Brave',
      standSprite:
        '@assets/2D assets/Abstract Platformer/PNG/Players/Player Red/playerRed_stand.png',
      sprites: {
        stand: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Red/playerRed_stand.png',
        walk: [
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Red/playerRed_walk1.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Red/playerRed_walk2.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Red/playerRed_walk3.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Red/playerRed_walk4.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Red/playerRed_walk5.png',
        ],
        jump: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Red/playerRed_up1.png',
        fall: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Red/playerRed_fall.png',
        hit: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Red/playerRed_hit.png',
      },
      color: 'red',
    },
  ],
  tilesets: [
    {
      id: 'blue',
      name: 'Blue World',
      displayName: 'Cool and Crisp',
      previewTile: '@assets/2D assets/Abstract Platformer/PNG/Tiles/Blue tiles/tileBlue_01.png',
      tilePath: '@assets/2D assets/Abstract Platformer/PNG/Tiles/Blue tiles/',
      color: 'blue',
    },
    {
      id: 'yellow',
      name: 'Yellow World',
      displayName: 'Bright and Sunny',
      previewTile: '@assets/2D assets/Abstract Platformer/PNG/Tiles/Yellow tiles/tileYellow_01.png',
      tilePath: '@assets/2D assets/Abstract Platformer/PNG/Tiles/Yellow tiles/',
      color: 'yellow',
    },
    {
      id: 'brown',
      name: 'Brown World',
      displayName: 'Earthy and Warm',
      previewTile: '@assets/2D assets/Abstract Platformer/PNG/Tiles/Brown tiles/tileBrown_01.png',
      tilePath: '@assets/2D assets/Abstract Platformer/PNG/Tiles/Brown tiles/',
      color: 'brown',
    },
  ],
  enemies: [
    {
      id: 'flying',
      name: 'Flying Enemy',
      displayName: 'Swooping from Above',
      sprites: [
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemyFlying_1.png',
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemyFlying_2.png',
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemyFlying_3.png',
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemyFlying_4.png',
      ],
      difficulty: 'medium',
      movement: 'flying',
    },
    {
      id: 'walking',
      name: 'Walking Enemy',
      displayName: 'Patrolling Platforms',
      sprites: [
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemyWalking_1.png',
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemyWalking_2.png',
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemyWalking_3.png',
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemyWalking_4.png',
      ],
      difficulty: 'easy',
      movement: 'walking',
    },
  ],
  items: [
    {
      id: 'blueGem',
      name: 'Blue Gem',
      sprite: '@assets/2D assets/Abstract Platformer/PNG/Items/blueGem.png',
      type: 'gem',
      color: 'blue',
    },
    {
      id: 'blueCrystal',
      name: 'Blue Crystal',
      sprite: '@assets/2D assets/Abstract Platformer/PNG/Items/blueCrystal.png',
      type: 'crystal',
      color: 'blue',
    },
    {
      id: 'yellowGem',
      name: 'Yellow Gem',
      sprite: '@assets/2D assets/Abstract Platformer/PNG/Items/yellowGem.png',
      type: 'gem',
      color: 'yellow',
    },
    {
      id: 'redGem',
      name: 'Red Gem',
      sprite: '@assets/2D assets/Abstract Platformer/PNG/Items/redGem.png',
      type: 'gem',
      color: 'red',
    },
  ],
  recommendedCombos: [
    {
      character: 'blue',
      tileset: 'blue',
      enemies: ['walking'],
      items: ['blueGem', 'blueCrystal'],
    },
    {
      character: 'blue',
      tileset: 'yellow',
      enemies: ['flying'],
      items: ['yellowGem'],
    },
    {
      character: 'red',
      tileset: 'brown',
      enemies: ['walking'],
      items: ['redGem'],
    },
  ],
};

// Green World Theme
export const greenWorldTheme: CuratedTheme = {
  id: 'green',
  name: 'Green World',
  characters: [
    {
      id: 'green',
      name: 'Green Hero',
      displayName: 'Nature Friend',
      standSprite:
        '@assets/2D assets/Abstract Platformer/PNG/Players/Player Green/playerGreen_stand.png',
      sprites: {
        stand:
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Green/playerGreen_stand.png',
        walk: [
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Green/playerGreen_walk1.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Green/playerGreen_walk2.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Green/playerGreen_walk3.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Green/playerGreen_walk4.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Green/playerGreen_walk5.png',
        ],
        jump: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Green/playerGreen_up1.png',
        fall: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Green/playerGreen_fall.png',
        hit: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Green/playerGreen_hit.png',
      },
      color: 'green',
    },
    {
      id: 'grey',
      name: 'Grey Hero',
      displayName: 'Sturdy Explorer',
      standSprite:
        '@assets/2D assets/Abstract Platformer/PNG/Players/Player Grey/playerGrey_stand.png',
      sprites: {
        stand: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Grey/playerGrey_stand.png',
        walk: [
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Grey/playerGrey_walk1.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Grey/playerGrey_walk2.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Grey/playerGrey_walk3.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Grey/playerGrey_walk4.png',
          '@assets/2D assets/Abstract Platformer/PNG/Players/Player Grey/playerGrey_walk5.png',
        ],
        jump: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Grey/playerGrey_up1.png',
        fall: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Grey/playerGrey_fall.png',
        hit: '@assets/2D assets/Abstract Platformer/PNG/Players/Player Grey/playerGrey_hit.png',
      },
      color: 'grey',
    },
  ],
  tilesets: [
    {
      id: 'green',
      name: 'Green World',
      displayName: 'Lush and Natural',
      previewTile: '@assets/2D assets/Abstract Platformer/PNG/Tiles/Green tiles/tileGreen_01.png',
      tilePath: '@assets/2D assets/Abstract Platformer/PNG/Tiles/Green tiles/',
      color: 'green',
    },
    {
      id: 'brown',
      name: 'Brown World',
      displayName: 'Earthy Adventure',
      previewTile: '@assets/2D assets/Abstract Platformer/PNG/Tiles/Brown tiles/tileBrown_01.png',
      tilePath: '@assets/2D assets/Abstract Platformer/PNG/Tiles/Brown tiles/',
      color: 'brown',
    },
  ],
  enemies: [
    {
      id: 'floating',
      name: 'Floating Enemy',
      displayName: 'Mysterious and Hovering',
      sprites: [
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemyFloating_1.png',
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemyFloating_2.png',
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemyFloating_3.png',
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemyFloating_4.png',
      ],
      difficulty: 'medium',
      movement: 'floating',
    },
    {
      id: 'spikey',
      name: 'Spikey Enemy',
      displayName: 'Dangerous but Predictable',
      sprites: [
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemySpikey_1.png',
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemySpikey_2.png',
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemySpikey_3.png',
        '@assets/2D assets/Abstract Platformer/PNG/Enemies/enemySpikey_4.png',
      ],
      difficulty: 'hard',
      movement: 'spikey',
    },
  ],
  items: [
    {
      id: 'greenJewel',
      name: 'Green Jewel',
      sprite: '@assets/2D assets/Abstract Platformer/PNG/Items/greenJewel.png',
      type: 'jewel',
      color: 'green',
    },
    {
      id: 'greenCrystal',
      name: 'Green Crystal',
      sprite: '@assets/2D assets/Abstract Platformer/PNG/Items/greenCrystal.png',
      type: 'crystal',
      color: 'green',
    },
    {
      id: 'puzzleGreen',
      name: 'Green Puzzle Piece',
      sprite: '@assets/2D assets/Abstract Platformer/PNG/Items/puzzleGreen.png',
      type: 'puzzle',
      color: 'green',
    },
    {
      id: 'keyGreen',
      name: 'Green Key',
      sprite: '@assets/2D assets/Abstract Platformer/PNG/Items/keyGreen.png',
      type: 'key',
      color: 'green',
    },
  ],
  recommendedCombos: [
    {
      character: 'green',
      tileset: 'green',
      enemies: ['floating'],
      items: ['greenJewel', 'greenCrystal'],
    },
    {
      character: 'grey',
      tileset: 'brown',
      enemies: ['spikey'],
      items: ['puzzleGreen', 'keyGreen'],
    },
  ],
};

// Main export with all themes
export const curatedPlatformerSets = {
  colorful: colorfulAdventureTheme,
  green: greenWorldTheme,
};

// Helper function to get matching items for a character/tileset combo
export function getMatchingItems(characterColor: string, tilesetColor: string): CuratedItem[] {
  const allItems = [...colorfulAdventureTheme.items, ...greenWorldTheme.items];

  // First priority: items that match the character color
  const characterMatches = allItems.filter((item) => item.color === characterColor);
  if (characterMatches.length > 0) return characterMatches;

  // Second priority: items that match the tileset color
  const tilesetMatches = allItems.filter((item) => item.color === tilesetColor);
  if (tilesetMatches.length > 0) return tilesetMatches;

  // Fallback: return some default items
  return allItems.slice(0, 2);
}

// Helper function to suggest enemy difficulty based on user progress
export function suggestEnemyDifficulty(isFirstGame: boolean): 'easy' | 'medium' | 'hard' {
  return isFirstGame ? 'easy' : 'medium';
}

// Helper function to validate a combination is harmonious
export function validateCombination(
  character: CuratedCharacter,
  tileset: CuratedTileset,
  enemies: CuratedEnemy[],
  items: CuratedItem[]
): { isValid: boolean; suggestions: string[] } {
  const suggestions: string[] = [];

  // Check color harmony
  const hasColorMatch =
    character.color === tileset.color ||
    items.some((item) => item.color === character.color || item.color === tileset.color);

  if (!hasColorMatch) {
    suggestions.push('Consider adding items that match your character or world color');
  }

  // Check difficulty balance
  const hardEnemies = enemies.filter((e) => e.difficulty === 'hard').length;
  if (hardEnemies > enemies.length / 2) {
    suggestions.push('This might be challenging! Consider mixing in some easier enemies');
  }

  return {
    isValid: suggestions.length === 0,
    suggestions,
  };
}

// Export curation principles for display in UI
export const curationPrinciples = [
  'All assets come from the same art style',
  'Colors are carefully matched for visual harmony',
  'Enemy difficulty is balanced for fun gameplay',
  'Every choice leads to a successful outcome',
  'No overwhelming options - just 2-3 perfect choices',
];
