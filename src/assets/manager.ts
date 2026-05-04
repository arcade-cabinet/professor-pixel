// Asset Manager System
// Main system for loading, managing, and searching game assets

import { 
  GameAsset, 
  AssetFilter, 
  AssetSelection, 
  AssetLoadStatus,
  SpriteAsset,
  SoundAsset,
  BackgroundAsset 
} from './asset-types';
import { allSprites } from './asset-sprites';
import { allSounds } from './asset-sounds';
import { allBackgrounds } from './asset-backgrounds';

// Import real Kenney assets
import { kenneySprites } from './kenney-sprites';
import { kenneyBackgrounds } from './kenney-backgrounds';
import { kenneySounds, kenneyMusic } from './kenney-sounds';

// Asset Manager Class
export class AssetManager {
  private assets: Map<string, GameAsset>;
  private loadedImages: Map<string, HTMLImageElement>;
  private loadedSounds: Map<string, HTMLAudioElement>;
  private loadStatus: AssetLoadStatus;
  private selection: AssetSelection;

  constructor() {
    this.assets = new Map();
    this.loadedImages = new Map();
    this.loadedSounds = new Map();
    this.loadStatus = {
      total: 0,
      loaded: 0,
      failed: [],
      isLoading: false
    };
    this.selection = {
      player: undefined,
      enemies: [],
      items: [],
      background: undefined,
      sounds: [],
      music: undefined
    };

    // Initialize with all available assets
    this.initializeAssets();
  }

  // Initialize asset registry
  private initializeAssets() {
    // Add placeholder sprites (for fallback)
    allSprites.forEach(sprite => {
      this.assets.set(sprite.id, sprite);
    });

    // Add placeholder sounds (for fallback)
    allSounds.forEach(sound => {
      this.assets.set(sound.id, sound);
    });

    // Add placeholder backgrounds (for fallback)
    allBackgrounds.forEach(bg => {
      this.assets.set(bg.id, bg);
    });

    // Add REAL Kenney sprites
    kenneySprites.forEach(sprite => {
      this.assets.set(sprite.id, sprite as any);
    });

    // Add REAL Kenney backgrounds
    kenneyBackgrounds.forEach(bg => {
      this.assets.set(bg.id, bg as any);
    });

    // Add REAL Kenney sounds
    kenneySounds.forEach(sound => {
      this.assets.set(sound.id, sound as any);
    });

    // Add REAL Kenney music
    kenneyMusic.forEach(music => {
      this.assets.set(music.id, music as any);
    });

    this.loadStatus.total = this.assets.size;
  }

  // Get all assets
  getAllAssets(): GameAsset[] {
    return Array.from(this.assets.values());
  }

  // Get asset by ID
  getAssetById(id: string): GameAsset | undefined {
    return this.assets.get(id);
  }

  // Filter assets
  filterAssets(filter: AssetFilter): GameAsset[] {
    let results = Array.from(this.assets.values());

    // Filter by type
    if (filter.type) {
      results = results.filter(asset => asset.type === filter.type);
    }

    // Filter by category
    if (filter.category) {
      results = results.filter(asset => {
        if ('category' in asset) {
          return asset.category === filter.category;
        }
        return false;
      });
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(asset => 
        filter.tags!.some(tag => asset.tags.includes(tag))
      );
    }

    // Search by name or description
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      results = results.filter(asset =>
        asset.name.toLowerCase().includes(searchLower) ||
        asset.description.toLowerCase().includes(searchLower) ||
        asset.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return results;
  }

  // Get sprites
  getSprites(): SpriteAsset[] {
    return this.filterAssets({ type: 'sprite' }) as SpriteAsset[];
  }

  // Get sounds
  getSounds(): SoundAsset[] {
    return this.filterAssets({ type: 'sound' }) as SoundAsset[];
  }

  // Get music
  getMusic(): SoundAsset[] {
    return this.filterAssets({ type: 'music' }) as SoundAsset[];
  }

  // Get backgrounds
  getBackgrounds(): BackgroundAsset[] {
    return this.filterAssets({ type: 'background' }) as BackgroundAsset[];
  }

  // Preload image asset
  async preloadImage(assetId: string): Promise<HTMLImageElement> {
    const asset = this.assets.get(assetId);
    if (!asset || (asset.type !== 'sprite' && asset.type !== 'background')) {
      throw new Error(`Asset ${assetId} not found or not an image`);
    }

    // Check if already loaded
    if (this.loadedImages.has(assetId)) {
      return this.loadedImages.get(assetId)!;
    }

    // Skip data URLs
    if (asset.path.startsWith('data:')) {
      const img = new Image();
      img.src = asset.path;
      this.loadedImages.set(assetId, img);
      this.loadStatus.loaded++;
      return img;
    }

    // Load image
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImages.set(assetId, img);
        this.loadStatus.loaded++;
        resolve(img);
      };
      img.onerror = () => {
        this.loadStatus.failed.push(assetId);
        reject(new Error(`Failed to load image: ${asset.path}`));
      };
      img.src = asset.path;
    });
  }

  // Preload sound asset
  async preloadSound(assetId: string): Promise<HTMLAudioElement> {
    const asset = this.assets.get(assetId);
    if (!asset || (asset.type !== 'sound' && asset.type !== 'music')) {
      throw new Error(`Asset ${assetId} not found or not a sound`);
    }

    // Check if already loaded
    if (this.loadedSounds.has(assetId)) {
      return this.loadedSounds.get(assetId)!;
    }

    // Load sound
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.oncanplaythrough = () => {
        this.loadedSounds.set(assetId, audio);
        this.loadStatus.loaded++;
        resolve(audio);
      };
      audio.onerror = () => {
        this.loadStatus.failed.push(assetId);
        reject(new Error(`Failed to load sound: ${asset.path}`));
      };
      audio.src = asset.path;
      audio.load();
    });
  }

  // Preload multiple assets
  async preloadAssets(assetIds: string[]): Promise<void> {
    this.loadStatus.isLoading = true;
    
    const promises = assetIds.map(async (id) => {
      const asset = this.assets.get(id);
      if (!asset) return;

      try {
        if (asset.type === 'sprite' || asset.type === 'background') {
          await this.preloadImage(id);
        } else if (asset.type === 'sound' || asset.type === 'music') {
          await this.preloadSound(id);
        }
      } catch (error) {
        console.error(`Failed to load asset ${id}:`, error);
      }
    });

    await Promise.all(promises);
    this.loadStatus.isLoading = false;
  }

  // Get load status
  getLoadStatus(): AssetLoadStatus {
    return { ...this.loadStatus };
  }

  // Selection management
  selectPlayerSprite(spriteId: string) {
    const sprite = this.assets.get(spriteId);
    if (sprite && sprite.type === 'sprite') {
      this.selection.player = sprite as SpriteAsset;
    }
  }

  addEnemySprite(spriteId: string) {
    const sprite = this.assets.get(spriteId);
    if (sprite && sprite.type === 'sprite') {
      this.selection.enemies = this.selection.enemies || [];
      this.selection.enemies.push(sprite as SpriteAsset);
    }
  }

  addItemSprite(spriteId: string) {
    const sprite = this.assets.get(spriteId);
    if (sprite && sprite.type === 'sprite') {
      this.selection.items = this.selection.items || [];
      this.selection.items.push(sprite as SpriteAsset);
    }
  }

  selectBackground(backgroundId: string) {
    const bg = this.assets.get(backgroundId);
    if (bg && bg.type === 'background') {
      this.selection.background = bg as BackgroundAsset;
    }
  }

  selectMusic(soundId: string) {
    const sound = this.assets.get(soundId);
    if (sound && (sound.type === 'music' || sound.type === 'sound')) {
      this.selection.music = sound as SoundAsset;
    }
  }

  addSound(soundId: string) {
    const sound = this.assets.get(soundId);
    if (sound && (sound.type === 'sound' || sound.type === 'music')) {
      this.selection.sounds = this.selection.sounds || [];
      this.selection.sounds.push(sound as SoundAsset);
    }
  }

  getSelection(): AssetSelection {
    return { ...this.selection };
  }

  clearSelection() {
    this.selection = {
      player: undefined,
      enemies: [],
      items: [],
      background: undefined,
      sounds: [],
      music: undefined
    };
  }

  // Get suggested assets for game type
  getSuggestedAssets(gameType: string): AssetSelection {
    const suggestions: AssetSelection = {
      player: undefined,
      enemies: [],
      items: [],
      background: undefined,
      sounds: [],
      music: undefined
    };

    switch (gameType) {
      case 'platformer':
        suggestions.player = this.assets.get('robot-blue') as SpriteAsset;
        suggestions.enemies = [
          this.assets.get('ghost-floating') as SpriteAsset,
          this.assets.get('spikey-hazard') as SpriteAsset
        ];
        suggestions.items = [
          this.assets.get('gem-blue') as SpriteAsset,
          this.assets.get('key-green') as SpriteAsset
        ];
        suggestions.background = this.assets.get('bg-forest') as BackgroundAsset;
        suggestions.music = this.assets.get('music-adventure') as SoundAsset;
        break;

      case 'space':
        suggestions.player = this.assets.get('robot-grey') as SpriteAsset;
        suggestions.enemies = [
          this.assets.get('alien-flying') as SpriteAsset
        ];
        suggestions.items = [
          this.assets.get('crystal-blue') as SpriteAsset
        ];
        suggestions.background = this.assets.get('bg-space-stars') as BackgroundAsset;
        suggestions.music = this.assets.get('music-boss') as SoundAsset;
        break;

      case 'dungeon':
        suggestions.player = this.assets.get('robot-red') as SpriteAsset;
        suggestions.enemies = [
          this.assets.get('ghost-floating') as SpriteAsset,
          this.assets.get('walker-enemy') as SpriteAsset
        ];
        suggestions.items = [
          this.assets.get('key-red') as SpriteAsset,
          this.assets.get('gem-red') as SpriteAsset
        ];
        suggestions.background = this.assets.get('bg-dungeon-stone') as BackgroundAsset;
        break;

      default:
        suggestions.player = this.assets.get('robot-blue') as SpriteAsset;
        suggestions.background = this.assets.get('bg-solid-sky') as BackgroundAsset;
    }

    return suggestions;
  }
}

// Singleton instance
let assetManagerInstance: AssetManager | null = null;

export function getAssetManager(): AssetManager {
  if (!assetManagerInstance) {
    assetManagerInstance = new AssetManager();
  }
  return assetManagerInstance;
}

// Export convenience functions
export const assetManager = getAssetManager();