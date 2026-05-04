// Comprehensive Asset Catalog System
// Manages 2000+ assets across 2D sprites, 3D models, UI elements, and audio files

import { GameAsset } from './asset-library';

export interface AssetMetadata {
  id: string;
  name: string;
  path: string;
  type: '2d-sprite' | '3d-model' | 'ui-element' | 'audio';
  category: string;
  tags: string[];
  size?: number;
  dimensions?: { width: number; height: number };
  format: string;
  license: string;
  checksum?: string;
  lastModified?: Date;
  preloaded?: boolean;
  loadTime?: number;
  memoryUsage?: number;
}

export interface AssetLoadResult {
  success: boolean;
  asset?: AssetMetadata;
  error?: string;
  loadTime: number;
}

export interface AssetSearchOptions {
  type?: string;
  category?: string;
  tags?: string[];
  searchTerm?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'size' | 'type' | 'lastModified';
  sortOrder?: 'asc' | 'desc';
}

export class AssetCatalog {
  private assets: Map<string, AssetMetadata> = new Map();
  private preloadedAssets: Map<string, any> = new Map();
  private assetsByType: Map<string, Set<string>> = new Map();
  private assetsByCategory: Map<string, Set<string>> = new Map();
  private loadingQueue: string[] = [];
  private memoryUsage: number = 0;
  private maxMemoryUsage: number = 500 * 1024 * 1024; // 500MB default
  private hotSwapEnabled: boolean = true;
  private assetCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 60000; // 1 minute

  constructor(maxMemory?: number) {
    if (maxMemory) {
      this.maxMemoryUsage = maxMemory;
    }
    this.initializeCategories();
  }

  private initializeCategories() {
    // Initialize type categories
    this.assetsByType.set('2d-sprite', new Set());
    this.assetsByType.set('3d-model', new Set());
    this.assetsByType.set('ui-element', new Set());
    this.assetsByType.set('audio', new Set());
    
    // Initialize content categories
    const categories = [
      'platformer', 'rpg', 'racing', 'puzzle', 'space',
      'nature', 'buildings', 'vehicles', 'characters',
      'enemies', 'items', 'tiles', 'ui', 'music', 'sfx'
    ];
    
    categories.forEach(cat => {
      this.assetsByCategory.set(cat, new Set());
    });
  }

  // Load asset metadata from manifest or directory scan
  async loadManifest(manifestPath: string): Promise<void> {
    try {
      const response = await fetch(manifestPath);
      const manifest = await response.json();
      
      for (const asset of manifest.assets) {
        this.registerAsset(asset);
      }
    } catch (error) {
      throw new Error(`Failed to load manifest: ${error}`);
    }
  }

  // Register a single asset
  registerAsset(asset: AssetMetadata): void {
    // Validate required fields
    if (!asset.id || !asset.path || !asset.type) {
      throw new Error('Asset missing required fields: id, path, or type');
    }

    // Validate license compliance
    if (!this.validateLicense(asset.license)) {
      throw new Error(`Invalid license: ${asset.license}. Only CC0, MIT, or Public Domain allowed`);
    }

    // Add to main catalog
    this.assets.set(asset.id, asset);
    
    // Index by type
    const typeSet = this.assetsByType.get(asset.type);
    if (typeSet) {
      typeSet.add(asset.id);
    }
    
    // Index by category
    const catSet = this.assetsByCategory.get(asset.category);
    if (catSet) {
      catSet.add(asset.id);
    }
  }

  // Load an asset
  async loadAsset(assetId: string): Promise<AssetLoadResult> {
    const startTime = performance.now();
    
    try {
      const metadata = this.assets.get(assetId);
      if (!metadata) {
        return {
          success: false,
          error: `Asset not found: ${assetId}`,
          loadTime: performance.now() - startTime
        };
      }

      // Check cache first
      if (this.assetCache.has(assetId)) {
        const cached = this.assetCache.get(assetId)!;
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return {
            success: true,
            asset: metadata,
            loadTime: performance.now() - startTime
          };
        }
      }

      // Check memory constraints
      if (!this.checkMemoryAvailable(metadata.size || 0)) {
        this.evictLRUAssets(metadata.size || 0);
      }

      // Simulate asset loading (in real implementation, this would load actual files)
      const assetData = await this.simulateAssetLoad(metadata);
      
      // Update metadata
      metadata.preloaded = true;
      metadata.loadTime = performance.now() - startTime;
      metadata.memoryUsage = this.estimateMemoryUsage(metadata);
      
      // Cache the asset
      this.preloadedAssets.set(assetId, assetData);
      this.assetCache.set(assetId, {
        data: assetData,
        timestamp: Date.now()
      });
      
      this.memoryUsage += metadata.memoryUsage;
      
      return {
        success: true,
        asset: metadata,
        loadTime: metadata.loadTime
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load asset: ${error}`,
        loadTime: performance.now() - startTime
      };
    }
  }

  // Preload multiple assets
  async preloadAssets(assetIds: string[]): Promise<Map<string, AssetLoadResult>> {
    const results = new Map<string, AssetLoadResult>();
    
    // Load in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < assetIds.length; i += batchSize) {
      const batch = assetIds.slice(i, i + batchSize);
      const batchPromises = batch.map(id => 
        this.loadAsset(id).then(result => ({ id, result }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ id, result }) => {
        results.set(id, result);
      });
    }
    
    return results;
  }

  // Search and filter assets
  searchAssets(options: AssetSearchOptions): AssetMetadata[] {
    let results = Array.from(this.assets.values());
    
    // Filter by type
    if (options.type) {
      results = results.filter(a => a.type === options.type);
    }
    
    // Filter by category
    if (options.category) {
      results = results.filter(a => a.category === options.category);
    }
    
    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = results.filter(a => 
        options.tags!.some(tag => a.tags.includes(tag))
      );
    }
    
    // Search by term
    if (options.searchTerm) {
      const term = options.searchTerm.toLowerCase();
      results = results.filter(a => 
        a.name.toLowerCase().includes(term) ||
        a.tags.some(tag => tag.toLowerCase().includes(term)) ||
        a.category.toLowerCase().includes(term)
      );
    }
    
    // Sort results
    if (options.sortBy) {
      results.sort((a, b) => {
        let compareValue = 0;
        switch (options.sortBy) {
          case 'name':
            compareValue = a.name.localeCompare(b.name);
            break;
          case 'size':
            compareValue = (a.size || 0) - (b.size || 0);
            break;
          case 'type':
            compareValue = a.type.localeCompare(b.type);
            break;
          case 'lastModified':
            compareValue = (a.lastModified?.getTime() || 0) - (b.lastModified?.getTime() || 0);
            break;
        }
        return options.sortOrder === 'desc' ? -compareValue : compareValue;
      });
    }
    
    // Apply pagination
    if (options.offset !== undefined || options.limit !== undefined) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : results.length;
      results = results.slice(start, end);
    }
    
    return results;
  }

  // Resolve asset path
  resolvePath(assetId: string): string | null {
    const asset = this.assets.get(assetId);
    if (!asset) return null;
    
    // Handle different path formats
    if (asset.path.startsWith('http://') || asset.path.startsWith('https://')) {
      return asset.path;
    }
    
    if (asset.path.startsWith('/')) {
      return asset.path;
    }
    
    // Construct relative path based on asset type
    const basePath = this.getBasePath(asset.type);
    return `${basePath}/${asset.path}`;
  }

  private getBasePath(type: string): string {
    switch (type) {
      case '2d-sprite': return 'assets/2d';
      case '3d-model': return 'assets/3d/models';
      case 'ui-element': return 'assets/ui';
      case 'audio': return 'assets/audio';
      default: return 'assets';
    }
  }

  // Hot-swap an asset
  async hotSwapAsset(assetId: string, newPath: string): Promise<boolean> {
    if (!this.hotSwapEnabled) {
      return false;
    }
    
    const asset = this.assets.get(assetId);
    if (!asset) {
      return false;
    }
    
    // Store old path for rollback
    const oldPath = asset.path;
    
    try {
      // Update path
      asset.path = newPath;
      
      // Reload if already loaded
      if (asset.preloaded) {
        this.preloadedAssets.delete(assetId);
        await this.loadAsset(assetId);
      }
      
      // Clear cache
      this.assetCache.delete(assetId);
      
      return true;
    } catch (error) {
      // Rollback on failure
      asset.path = oldPath;
      return false;
    }
  }

  // Validate license compliance
  private validateLicense(license: string): boolean {
    const allowedLicenses = ['CC0', 'MIT', 'Public Domain', 'CC-BY', 'OFL'];
    return allowedLicenses.includes(license);
  }

  // Check if an asset exists
  hasAsset(assetId: string): boolean {
    return this.assets.has(assetId);
  }

  // Get asset metadata
  getAsset(assetId: string): AssetMetadata | undefined {
    return this.assets.get(assetId);
  }

  // Get assets by type
  getAssetsByType(type: string): AssetMetadata[] {
    const assetIds = this.assetsByType.get(type);
    if (!assetIds) return [];
    
    return Array.from(assetIds)
      .map(id => this.assets.get(id))
      .filter(Boolean) as AssetMetadata[];
  }

  // Get assets by category
  getAssetsByCategory(category: string): AssetMetadata[] {
    const assetIds = this.assetsByCategory.get(category);
    if (!assetIds) return [];
    
    return Array.from(assetIds)
      .map(id => this.assets.get(id))
      .filter(Boolean) as AssetMetadata[];
  }

  // Memory management
  private checkMemoryAvailable(requiredSize: number): boolean {
    return this.memoryUsage + requiredSize <= this.maxMemoryUsage;
  }

  private evictLRUAssets(requiredSpace: number): void {
    const sortedAssets = Array.from(this.preloadedAssets.keys())
      .map(id => this.assets.get(id))
      .filter(Boolean)
      .sort((a, b) => (a!.loadTime || 0) - (b!.loadTime || 0));
    
    let freedSpace = 0;
    for (const asset of sortedAssets) {
      if (freedSpace >= requiredSpace) break;
      
      this.unloadAsset(asset!.id);
      freedSpace += asset!.memoryUsage || 0;
    }
  }

  unloadAsset(assetId: string): void {
    const asset = this.assets.get(assetId);
    if (asset && asset.preloaded) {
      this.preloadedAssets.delete(assetId);
      this.assetCache.delete(assetId);
      this.memoryUsage -= asset.memoryUsage || 0;
      asset.preloaded = false;
    }
  }

  private estimateMemoryUsage(asset: AssetMetadata): number {
    // Estimate based on asset type and dimensions
    switch (asset.type) {
      case '2d-sprite':
        const dim = asset.dimensions || { width: 32, height: 32 };
        return dim.width * dim.height * 4; // RGBA
      case '3d-model':
        return asset.size || 100000; // Use file size if available
      case 'ui-element':
        const uiDim = asset.dimensions || { width: 64, height: 64 };
        return uiDim.width * uiDim.height * 4;
      case 'audio':
        return asset.size || 50000; // Use file size
      default:
        return 10000; // Default 10KB
    }
  }

  private async simulateAssetLoad(metadata: AssetMetadata): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    // Return mock data based on type
    switch (metadata.type) {
      case '2d-sprite':
        return { type: 'sprite', width: 32, height: 32, pixels: [] };
      case '3d-model':
        return { type: 'model', vertices: [], faces: [] };
      case 'ui-element':
        return { type: 'ui', element: 'button', style: {} };
      case 'audio':
        return { type: 'audio', duration: 1000, format: 'wav' };
      default:
        return { type: 'unknown' };
    }
  }

  // Get catalog statistics
  getStatistics() {
    return {
      totalAssets: this.assets.size,
      assetsByType: Object.fromEntries(
        Array.from(this.assetsByType.entries()).map(([type, ids]) => [type, ids.size])
      ),
      assetsByCategory: Object.fromEntries(
        Array.from(this.assetsByCategory.entries()).map(([cat, ids]) => [cat, ids.size])
      ),
      preloadedAssets: this.preloadedAssets.size,
      memoryUsage: this.memoryUsage,
      maxMemoryUsage: this.maxMemoryUsage,
      cacheSize: this.assetCache.size
    };
  }

  // Clear all assets
  clearCatalog(): void {
    this.assets.clear();
    this.preloadedAssets.clear();
    this.assetsByType.forEach(set => set.clear());
    this.assetsByCategory.forEach(set => set.clear());
    this.assetCache.clear();
    this.memoryUsage = 0;
  }

  // Export catalog to JSON
  exportCatalog(): string {
    const catalog = {
      assets: Array.from(this.assets.values()),
      statistics: this.getStatistics(),
      timestamp: new Date().toISOString()
    };
    return JSON.stringify(catalog, null, 2);
  }

  // Import catalog from JSON
  importCatalog(jsonData: string): void {
    try {
      const catalog = JSON.parse(jsonData);
      this.clearCatalog();
      
      if (catalog.assets) {
        catalog.assets.forEach((asset: AssetMetadata) => {
          this.registerAsset(asset);
        });
      }
    } catch (error) {
      throw new Error(`Failed to import catalog: ${error}`);
    }
  }
}