import type { GameConfig, Entity, ComponentChoice } from '@shared/schema';

// Patch operations for incremental updates
export interface GamePatch {
  type: 'entity_add' | 'entity_remove' | 'entity_move' | 'entity_update' | 
        'component_change' | 'scene_update' | 'settings_update';
  data: any;
  timestamp: number;
  version: number;
}

// Game update bridge for real-time sync
export class GameUpdateBridge {
  private pyodide: any;
  private currentVersion: number = 0;
  private pendingPatches: GamePatch[] = [];
  private isInitialized: boolean = false;
  private updateInterval: NodeJS.Timer | null = null;
  private lastConfig: GameConfig | null = null;

  constructor(pyodide: any) {
    this.pyodide = pyodide;
  }

  // Initialize the bridge with Python runtime
  async initialize(gameConfig: GameConfig): Promise<boolean> {
    if (!this.pyodide) {
      console.warn('Pyodide not available for game bridge');
      return false;
    }

    try {
      // Create Python bridge module
      await this.pyodide.runPython(`
import json
import sys

class GameUpdateBridge:
    def __init__(self):
        self.version = 0
        self.entities = {}
        self.components = {}
        self.settings = {}
        self.scene = None
        
    def apply_patch(self, patch_json):
        """Apply a patch from JavaScript"""
        patch = json.loads(patch_json)
        patch_type = patch['type']
        data = patch['data']
        
        if patch_type == 'entity_add':
            self.entities[data['id']] = data
            print(f"Added entity: {data['id']}")
            
        elif patch_type == 'entity_remove':
            if data['id'] in self.entities:
                del self.entities[data['id']]
                print(f"Removed entity: {data['id']}")
                
        elif patch_type == 'entity_move':
            if data['id'] in self.entities:
                self.entities[data['id']]['position'] = data['position']
                print(f"Moved entity {data['id']} to {data['position']}")
                
        elif patch_type == 'entity_update':
            if data['id'] in self.entities:
                self.entities[data['id']].update(data['updates'])
                print(f"Updated entity: {data['id']}")
                
        elif patch_type == 'component_change':
            self.components[data['componentId']] = data['choice']
            print(f"Component {data['componentId']} set to {data['choice']}")
            
        elif patch_type == 'scene_update':
            self.scene = data
            print(f"Scene updated: {data.get('name', 'unnamed')}")
            
        elif patch_type == 'settings_update':
            self.settings.update(data)
            print(f"Settings updated")
            
        self.version = patch['version']
        return True
        
    def get_state(self):
        """Get current game state"""
        return {
            'version': self.version,
            'entities': self.entities,
            'components': self.components,
            'scene': self.scene,
            'settings': self.settings
        }
        
    def reset(self):
        """Reset the game state"""
        self.entities.clear()
        self.components.clear()
        self.settings.clear()
        self.scene = None
        self.version = 0
        print("Game state reset")

# Create global bridge instance
game_bridge = GameUpdateBridge()

# Helper functions for JavaScript
def apply_game_patch(patch_json):
    return game_bridge.apply_patch(patch_json)

def get_game_state():
    return json.dumps(game_bridge.get_state())

def reset_game_state():
    game_bridge.reset()
    return True

print("Game Update Bridge initialized in Python")
`);

      // Store the config
      this.lastConfig = gameConfig;
      this.isInitialized = true;
      
      // Apply initial config
      await this.syncFullConfig(gameConfig);
      
      console.log('Game Update Bridge initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Game Update Bridge:', error);
      return false;
    }
  }

  // Sync full configuration (for initial load or reset)
  async syncFullConfig(config: GameConfig): Promise<void> {
    if (!this.isInitialized || !this.pyodide) return;

    try {
      // Reset Python state
      await this.pyodide.globals.get('reset_game_state')();
      
      // Add all entities from main scene
      const mainScene = config.scenes.find(s => s.isMainScene) || config.scenes[0];
      if (mainScene) {
        // Update scene
        const scenePatch: GamePatch = {
          type: 'scene_update',
          data: {
            id: mainScene.id,
            name: mainScene.name,
            width: mainScene.width,
            height: mainScene.height,
            backgroundColor: mainScene.backgroundColor,
            gridSize: mainScene.gridSize
          },
          timestamp: Date.now(),
          version: ++this.currentVersion
        };
        await this.applyPatch(scenePatch);
        
        // Add all entities
        for (const entity of mainScene.entities) {
          const patch: GamePatch = {
            type: 'entity_add',
            data: entity,
            timestamp: Date.now(),
            version: ++this.currentVersion
          };
          await this.applyPatch(patch);
        }
      }
      
      // Apply component choices
      for (const choice of config.componentChoices) {
        const patch: GamePatch = {
          type: 'component_change',
          data: choice,
          timestamp: Date.now(),
          version: ++this.currentVersion
        };
        await this.applyPatch(patch);
      }
      
      // Apply settings
      if (config.settings) {
        const patch: GamePatch = {
          type: 'settings_update',
          data: config.settings,
          timestamp: Date.now(),
          version: ++this.currentVersion
        };
        await this.applyPatch(patch);
      }
      
      this.lastConfig = config;
    } catch (error) {
      console.error('Failed to sync full config:', error);
    }
  }

  // Apply a single patch
  async applyPatch(patch: GamePatch): Promise<boolean> {
    if (!this.isInitialized || !this.pyodide) return false;

    try {
      const patchJson = JSON.stringify(patch);
      const result = await this.pyodide.globals.get('apply_game_patch')(patchJson);
      return result;
    } catch (error) {
      console.error('Failed to apply patch:', error);
      return false;
    }
  }

  // Queue a patch for batch processing
  queuePatch(patch: GamePatch): void {
    this.pendingPatches.push(patch);
  }

  // Process all pending patches
  async processPendingPatches(): Promise<void> {
    if (this.pendingPatches.length === 0) return;

    const patches = [...this.pendingPatches];
    this.pendingPatches = [];

    for (const patch of patches) {
      await this.applyPatch(patch);
    }
  }

  // Start auto-sync with interval
  startAutoSync(intervalMs: number = 100): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval as NodeJS.Timeout);
    }

    this.updateInterval = setInterval(async () => {
      await this.processPendingPatches();
    }, intervalMs);
  }

  // Stop auto-sync
  stopAutoSync(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval as NodeJS.Timeout);
      this.updateInterval = null;
    }
  }

  // Get current game state from Python
  async getGameState(): Promise<any> {
    if (!this.isInitialized || !this.pyodide) return null;

    try {
      const stateJson = await this.pyodide.globals.get('get_game_state')();
      return JSON.parse(stateJson);
    } catch (error) {
      console.error('Failed to get game state:', error);
      return null;
    }
  }

  // Handle config changes with diff detection
  async handleConfigChange(newConfig: GameConfig, oldConfig?: GameConfig): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize(newConfig);
      return;
    }

    const old = oldConfig || this.lastConfig;
    if (!old) {
      await this.syncFullConfig(newConfig);
      return;
    }

    // Detect and apply changes incrementally
    const patches: GamePatch[] = [];

    // Check for scene changes
    const newScene = newConfig.scenes.find(s => s.isMainScene) || newConfig.scenes[0];
    const oldScene = old.scenes.find(s => s.isMainScene) || old.scenes[0];

    if (newScene && oldScene) {
      // Check for entity changes
      const newEntityMap = new Map(newScene.entities.map(e => [e.id, e]));
      const oldEntityMap = new Map(oldScene.entities.map(e => [e.id, e]));

      // Find added entities
      for (const [id, entity] of Array.from(newEntityMap)) {
        if (!oldEntityMap.has(id)) {
          patches.push({
            type: 'entity_add',
            data: entity,
            timestamp: Date.now(),
            version: ++this.currentVersion
          });
        } else {
          const oldEntity = oldEntityMap.get(id)!;
          // Check for position changes
          if (entity.position.x !== oldEntity.position.x || 
              entity.position.y !== oldEntity.position.y) {
            patches.push({
              type: 'entity_move',
              data: {
                id: entity.id,
                position: entity.position
              },
              timestamp: Date.now(),
              version: ++this.currentVersion
            });
          }
          // Check for other property changes
          if (JSON.stringify(entity.properties) !== JSON.stringify(oldEntity.properties) ||
              JSON.stringify(entity.size) !== JSON.stringify(oldEntity.size)) {
            patches.push({
              type: 'entity_update',
              data: {
                id: entity.id,
                updates: {
                  properties: entity.properties,
                  size: entity.size
                }
              },
              timestamp: Date.now(),
              version: ++this.currentVersion
            });
          }
        }
      }

      // Find removed entities
      for (const [id] of Array.from(oldEntityMap)) {
        if (!newEntityMap.has(id)) {
          patches.push({
            type: 'entity_remove',
            data: { id },
            timestamp: Date.now(),
            version: ++this.currentVersion
          });
        }
      }
    }

    // Check for component choice changes
    const newChoiceMap = new Map(newConfig.componentChoices.map(c => [c.component, c.choice]));
    const oldChoiceMap = new Map(old.componentChoices.map(c => [c.component, c.choice]));

    for (const [componentId, choice] of Array.from(newChoiceMap)) {
      if (oldChoiceMap.get(componentId) !== choice) {
        patches.push({
          type: 'component_change',
          data: { componentId, choice },
          timestamp: Date.now(),
          version: ++this.currentVersion
        });
      }
    }

    // Apply all patches
    for (const patch of patches) {
      await this.applyPatch(patch);
    }

    this.lastConfig = newConfig;
  }

  // Cleanup
  destroy(): void {
    this.stopAutoSync();
    this.pendingPatches = [];
    this.isInitialized = false;
    this.lastConfig = null;
  }
}

// Singleton instance
let bridgeInstance: GameUpdateBridge | null = null;

export function getGameUpdateBridge(pyodide?: any): GameUpdateBridge {
  if (!bridgeInstance && pyodide) {
    bridgeInstance = new GameUpdateBridge(pyodide);
  }
  return bridgeInstance!;
}

export function resetGameUpdateBridge(): void {
  if (bridgeInstance) {
    bridgeInstance.destroy();
    bridgeInstance = null;
  }
}