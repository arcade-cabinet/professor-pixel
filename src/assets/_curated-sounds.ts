// Sound Asset Definitions
// CC0 sound effects and music for games

import { SoundAsset } from './asset-types';

// Sound effect assets
export const soundEffects: SoundAsset[] = [
  // Jump sounds
  {
    id: 'jump-basic',
    name: 'Basic Jump',
    description: 'Simple jump sound effect',
    type: 'sound',
    category: 'jump',
    path: '/assets/sounds/effects/jump_basic.wav',
    tags: ['jump', 'hop', 'player', 'movement'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Use when player jumps or hops',
    duration: 0.3,
    volume: 0.7
  },
  {
    id: 'jump-double',
    name: 'Double Jump',
    description: 'Sound for double jump ability',
    type: 'sound',
    category: 'jump',
    path: '/assets/sounds/effects/jump_double.wav',
    tags: ['jump', 'double', 'ability', 'movement'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Perfect for double jump mechanics',
    duration: 0.4,
    volume: 0.8
  },
  
  // Collect sounds
  {
    id: 'collect-coin',
    name: 'Coin Pickup',
    description: 'Classic coin collection sound',
    type: 'sound',
    category: 'collect',
    path: '/assets/sounds/effects/collect_coin.wav',
    tags: ['collect', 'coin', 'pickup', 'points'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Play when collecting coins or points',
    duration: 0.5,
    volume: 0.6
  },
  {
    id: 'collect-gem',
    name: 'Gem Pickup',
    description: 'Sparkly gem collection sound',
    type: 'sound',
    category: 'collect',
    path: '/assets/sounds/effects/collect_gem.wav',
    tags: ['collect', 'gem', 'crystal', 'treasure'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Use for valuable item collection',
    duration: 0.7,
    volume: 0.7
  },
  {
    id: 'collect-powerup',
    name: 'Power-up',
    description: 'Energizing power-up sound',
    type: 'sound',
    category: 'powerup',
    path: '/assets/sounds/effects/powerup.wav',
    tags: ['powerup', 'upgrade', 'ability', 'special'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Play when gaining special abilities',
    duration: 1.0,
    volume: 0.8
  },
  
  // Hit/damage sounds
  {
    id: 'hit-damage',
    name: 'Take Damage',
    description: 'Player takes damage sound',
    type: 'sound',
    category: 'hit',
    path: '/assets/sounds/effects/hit_damage.wav',
    tags: ['hit', 'damage', 'hurt', 'player'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'When player gets hit by enemy',
    duration: 0.4,
    volume: 0.7
  },
  {
    id: 'hit-enemy',
    name: 'Enemy Hit',
    description: 'Enemy takes damage sound',
    type: 'sound',
    category: 'hit',
    path: '/assets/sounds/effects/hit_enemy.wav',
    tags: ['hit', 'enemy', 'damage', 'combat'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'When enemy is damaged',
    duration: 0.3,
    volume: 0.6
  },
  {
    id: 'explosion-small',
    name: 'Small Explosion',
    description: 'Small explosion or pop sound',
    type: 'sound',
    category: 'hit',
    path: '/assets/sounds/effects/explosion_small.wav',
    tags: ['explosion', 'pop', 'destroy', 'effect'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'For enemy defeats or small explosions',
    duration: 0.6,
    volume: 0.7
  },
  
  // UI sounds
  {
    id: 'ui-click',
    name: 'Button Click',
    description: 'UI button click sound',
    type: 'sound',
    category: 'ui',
    path: '/assets/sounds/effects/ui_click.wav',
    tags: ['ui', 'click', 'button', 'menu'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Menu button interactions',
    duration: 0.1,
    volume: 0.5
  },
  {
    id: 'ui-success',
    name: 'Success',
    description: 'Success or level complete sound',
    type: 'sound',
    category: 'ui',
    path: '/assets/sounds/effects/ui_success.wav',
    tags: ['success', 'win', 'complete', 'achievement'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Level completion or achievements',
    duration: 1.5,
    volume: 0.8
  },
  {
    id: 'ui-fail',
    name: 'Fail',
    description: 'Failure or game over sound',
    type: 'sound',
    category: 'ui',
    path: '/assets/sounds/effects/ui_fail.wav',
    tags: ['fail', 'lose', 'gameover', 'death'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Game over or failure states',
    duration: 1.2,
    volume: 0.7
  },
  
  // Shoot sounds
  {
    id: 'shoot-laser',
    name: 'Laser Shot',
    description: 'Sci-fi laser shooting sound',
    type: 'sound',
    category: 'shoot',
    path: '/assets/sounds/effects/shoot_laser.wav',
    tags: ['shoot', 'laser', 'weapon', 'sci-fi'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Laser weapon firing',
    duration: 0.3,
    volume: 0.6
  },
  {
    id: 'shoot-projectile',
    name: 'Projectile',
    description: 'Generic projectile launch sound',
    type: 'sound',
    category: 'shoot',
    path: '/assets/sounds/effects/shoot_projectile.wav',
    tags: ['shoot', 'projectile', 'launch', 'weapon'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Throwing or shooting projectiles',
    duration: 0.4,
    volume: 0.6
  }
];

// Background music tracks
export const musicTracks: SoundAsset[] = [
  {
    id: 'music-adventure',
    name: 'Adventure Theme',
    description: 'Upbeat adventure background music',
    type: 'music',
    category: 'music',
    path: '/assets/sounds/music/adventure_theme.mp3',
    tags: ['music', 'adventure', 'upbeat', 'exploration'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Main gameplay background music',
    duration: 120,
    loop: true,
    volume: 0.4
  },
  {
    id: 'music-menu',
    name: 'Menu Theme',
    description: 'Calm menu background music',
    type: 'music',
    category: 'music',
    path: '/assets/sounds/music/menu_theme.mp3',
    tags: ['music', 'menu', 'calm', 'ambient'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Main menu and pause screens',
    duration: 90,
    loop: true,
    volume: 0.3
  },
  {
    id: 'music-boss',
    name: 'Boss Battle',
    description: 'Intense boss battle music',
    type: 'music',
    category: 'music',
    path: '/assets/sounds/music/boss_battle.mp3',
    tags: ['music', 'boss', 'battle', 'intense'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Boss fights and intense moments',
    duration: 150,
    loop: true,
    volume: 0.5
  },
  {
    id: 'music-peaceful',
    name: 'Peaceful',
    description: 'Relaxing ambient music',
    type: 'music',
    category: 'music',
    path: '/assets/sounds/music/peaceful.mp3',
    tags: ['music', 'peaceful', 'calm', 'ambient'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Safe zones or peaceful levels',
    duration: 180,
    loop: true,
    volume: 0.3
  },
  {
    id: 'music-victory',
    name: 'Victory Fanfare',
    description: 'Short victory celebration music',
    type: 'music',
    category: 'music',
    path: '/assets/sounds/music/victory_fanfare.mp3',
    tags: ['music', 'victory', 'win', 'celebration'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Level completion or victory screens',
    duration: 10,
    loop: false,
    volume: 0.6
  }
];

// Ambient sounds
export const ambientSounds: SoundAsset[] = [
  {
    id: 'ambient-forest',
    name: 'Forest Ambience',
    description: 'Nature and forest background sounds',
    type: 'sound',
    category: 'ambient',
    path: '/assets/sounds/effects/ambient_forest.wav',
    tags: ['ambient', 'forest', 'nature', 'background'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Forest or nature levels',
    duration: 30,
    loop: true,
    volume: 0.2
  },
  {
    id: 'ambient-space',
    name: 'Space Ambience',
    description: 'Sci-fi space background sounds',
    type: 'sound',
    category: 'ambient',
    path: '/assets/sounds/effects/ambient_space.wav',
    tags: ['ambient', 'space', 'sci-fi', 'background'],
    license: 'CC0 - Public Domain',
    suggestedUse: 'Space or sci-fi levels',
    duration: 30,
    loop: true,
    volume: 0.2
  }
];

// Export all sounds
export const allSounds: SoundAsset[] = [
  ...soundEffects,
  ...musicTracks,
  ...ambientSounds
];

// Helper functions
export function getSoundById(id: string): SoundAsset | undefined {
  return allSounds.find(sound => sound.id === id);
}

export function getSoundsByCategory(category: string): SoundAsset[] {
  return allSounds.filter(sound => sound.category === category);
}

export function getMusicTracks(): SoundAsset[] {
  return musicTracks;
}

export function getSoundEffects(): SoundAsset[] {
  return soundEffects;
}