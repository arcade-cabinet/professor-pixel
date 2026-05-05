// CC0 Asset Library for Pixel's PyGame Palace
// Free assets from various sources that kids can use in their games

export interface GameAsset {
  id: string;
  name: string;
  type: 'font' | 'sound' | 'music' | 'sprite' | 'tileset' | '3d-model';
  source: string;
  license: string;
  url: string;
  localPath?: string;
  description: string;
  tags: string[];
}

// Curated collection of CC0 assets perfect for game development
export const assetLibrary: GameAsset[] = [
  // FONTS
  {
    id: 'font-m5x7',
    name: 'm5x7',
    type: 'font',
    source: 'managore.itch.io',
    license: 'CC0',
    url: 'https://managore.itch.io/m5x7',
    description: 'Small, neutral pixel font - perfect for retro games',
    tags: ['pixel', 'retro', 'small', 'readable'],
  },
  {
    id: 'font-monogram',
    name: 'monogram',
    type: 'font',
    source: 'datagoblin.itch.io',
    license: 'CC0',
    url: 'https://datagoblin.itch.io/monogram',
    description: 'Monospace pixel font - great for UI and HUD',
    tags: ['pixel', 'monospace', 'ui', 'clean'],
  },
  {
    id: 'font-pixeloid',
    name: 'Pixeloid',
    type: 'font',
    source: 'ggbot.itch.io',
    license: 'OFL',
    url: 'https://ggbot.itch.io/pixeloid-font',
    description: '3 styles with 1000+ glyphs - versatile pixel font',
    tags: ['pixel', 'versatile', 'multiple-styles'],
  },
  {
    id: 'font-press-start',
    name: 'Press Start 2P',
    type: 'font',
    source: 'Google Fonts',
    license: 'OFL',
    url: 'https://fonts.google.com/specimen/Press+Start+2P',
    description: 'Classic arcade game font',
    tags: ['arcade', 'retro', '8-bit', 'google-fonts'],
  },

  // SOUND EFFECTS
  {
    id: 'sound-jump',
    name: 'Jump Sound Pack',
    type: 'sound',
    source: 'Freesound',
    license: 'CC0',
    url: 'placeholder',
    description: 'Various jump sounds for platformers',
    tags: ['jump', 'platformer', 'action'],
  },
  {
    id: 'sound-coin',
    name: 'Coin Pickup',
    type: 'sound',
    source: 'Freesound',
    license: 'CC0',
    url: 'placeholder',
    description: 'Satisfying coin collection sound',
    tags: ['pickup', 'coin', 'collect', 'reward'],
  },
  {
    id: 'sound-explosion',
    name: 'Explosion Pack',
    type: 'sound',
    source: 'Freesound',
    license: 'CC0',
    url: 'placeholder',
    description: '8-bit style explosion sounds',
    tags: ['explosion', 'combat', 'impact', '8-bit'],
  },

  // MUSIC
  {
    id: 'music-adventure',
    name: 'Adventure Theme',
    type: 'music',
    source: 'Not Jam Music Pack',
    license: 'CC0',
    url: 'https://not-jam.itch.io/not-jam-music-pack',
    description: 'Epic adventure background music',
    tags: ['adventure', 'epic', 'background', 'loop'],
  },
  {
    id: 'music-dungeon',
    name: 'Dungeon Ambience',
    type: 'music',
    source: 'alkakrab',
    license: 'CC0',
    url: 'https://alkakrab.itch.io/',
    description: 'Mysterious dungeon background music',
    tags: ['dungeon', 'mysterious', 'ambient', 'loop'],
  },

  // SPRITES & TILESETS
  {
    id: 'tileset-dungeon',
    name: 'DungeonTileset II',
    type: 'tileset',
    source: '0x72.itch.io',
    license: 'CC0',
    url: 'https://0x72.itch.io/dungeontileset-ii',
    description: '16x16 cute fantasy dungeon tiles',
    tags: ['dungeon', 'fantasy', '16x16', 'tiles'],
  },
  {
    id: 'sprites-ninja',
    name: 'Ninja Adventure',
    type: 'sprite',
    source: 'pixel-boy.itch.io',
    license: 'CC0',
    url: 'https://pixel-boy.itch.io/ninja-adventure-asset-pack',
    description: '16x16 retro ninja characters and enemies',
    tags: ['ninja', 'character', 'enemy', '16x16', 'animated'],
  },
  {
    id: 'sprites-platformer',
    name: 'Kings and Pigs',
    type: 'sprite',
    source: 'pixelfrog-assets.itch.io',
    license: 'CC0',
    url: 'https://pixelfrog-assets.itch.io/kings-and-pigs',
    description: 'Animated king and pig characters for platformers',
    tags: ['platformer', 'character', 'animated', 'cute'],
  },
  {
    id: 'tileset-sproutlands',
    name: 'Sprout Lands',
    type: 'tileset',
    source: 'cupnooble.itch.io',
    license: 'Free -commercial',
    url: 'https://cupnooble.itch.io/sprout-lands-asset-pack',
    description: '8x8 cute pastel farming tiles',
    tags: ['farming', 'cute', 'pastel', '8x8', 'cozy'],
  },
  {
    id: 'icons-rpg',
    name: '16x16 RPG Icons',
    type: 'sprite',
    source: 'merchant-shade.itch.io',
    license: 'CC0',
    url: 'https://merchant-shade.itch.io/16x16-mixed-rpg-icons',
    description: 'Common RPG items and UI icons',
    tags: ['icons', 'items', 'ui', 'rpg', '16x16'],
  },

  // 3D MODELS
  {
    id: '3d-characters',
    name: 'KayKit Characters',
    type: '3d-model',
    source: 'KayKit',
    license: 'CC0',
    url: 'https://kaylousberg.itch.io/',
    description: 'Low-poly 3D character models',
    tags: ['3d', 'low-poly', 'character', 'gltf'],
  },
  {
    id: '3d-dungeon',
    name: 'KayKit Dungeon',
    type: '3d-model',
    source: 'KayKit',
    license: 'CC0',
    url: 'https://kaylousberg.itch.io/kaykit-dungeon',
    description: 'Modular dungeon pieces in 3D',
    tags: ['3d', 'dungeon', 'modular', 'environment'],
  },
];

// Asset categories for easy filtering
export const assetCategories = {
  fonts: assetLibrary.filter((a) => a.type === 'font'),
  sounds: assetLibrary.filter((a) => a.type === 'sound'),
  music: assetLibrary.filter((a) => a.type === 'music'),
  sprites: assetLibrary.filter((a) => a.type === 'sprite'),
  tilesets: assetLibrary.filter((a) => a.type === 'tileset'),
  models3d: assetLibrary.filter((a) => a.type === '3d-model'),
};

// Helper to generate Python code for loading assets
export function generateAssetLoaderCode(assetType: string): string {
  switch (assetType) {
    case 'font':
      return `# Load fonts
import pygame
pygame.font.init()

# Load pixel font (m5x7 - CC0 license)
try:
    pixel_font = pygame.font.Font('assets/fonts/m5x7.ttf', 16)
    ui_font = pygame.font.Font('assets/fonts/monogram.ttf', 20)
except:
    # Fallback to system font if custom font not found
    pixel_font = pygame.font.Font(None, 16)
    ui_font = pygame.font.Font(None, 20)
    print("Custom fonts not found, using system fonts")`;

    case 'sound':
      return `# Load sound effects
import pygame
pygame.mixer.init()

# Sound effects dictionary
sounds = {}
try:
    sounds['jump'] = pygame.mixer.Sound('assets/sounds/jump.wav')
    sounds['coin'] = pygame.mixer.Sound('assets/sounds/coin.wav')
    sounds['explosion'] = pygame.mixer.Sound('assets/sounds/explosion.wav')
    
    # Set volume for all sounds (0.0 to 1.0)
    for sound in sounds.values():
        sound.set_volume(0.5)
except Exception as e:
    print(f"Could not load sounds: {e}")
    # Create empty sound objects as fallback
    sounds = {key: pygame.mixer.Sound(buffer=b'') for key in ['jump', 'coin', 'explosion']}`;

    case 'sprite':
      return `# Load sprite sheets
import pygame

class SpriteSheet:
    def __init__(self, filename):
        try:
            self.sheet = pygame.image.load(filename).convert_alpha()
        except:
            # Create placeholder surface if file not found
            self.sheet = pygame.Surface((256, 256))
            self.sheet.fill((255, 0, 255))  # Magenta for missing texture
    
    def get_sprite(self, x, y, width, height):
        """Extract a sprite from the sheet"""
        sprite = pygame.Surface((width, height), pygame.SRCALPHA)
        sprite.blit(self.sheet, (0, 0), (x, y, width, height))
        return sprite
    
    def get_animation_frames(self, y, frame_width, frame_height, num_frames):
        """Get animation frames from a row"""
        frames = []
        for i in range(num_frames):
            frames.append(self.get_sprite(i * frame_width, y, frame_width, frame_height))
        return frames

# Load character sprites
try:
    character_sheet = SpriteSheet('assets/sprites/character.png')
    player_idle = character_sheet.get_animation_frames(0, 32, 32, 4)
    player_run = character_sheet.get_animation_frames(32, 32, 32, 6)
    player_jump = character_sheet.get_sprite(0, 64, 32, 32)
except Exception as e:
    print(f"Could not load sprites: {e}")
    # Create colored rectangles as fallback
    player_idle = [pygame.Surface((32, 32)) for _ in range(4)]
    player_run = [pygame.Surface((32, 32)) for _ in range(6)]
    player_jump = pygame.Surface((32, 32))`;

    case 'tileset':
      return `# Load tileset for level building
import pygame

class Tileset:
    def __init__(self, filename, tile_width, tile_height):
        self.tile_width = tile_width
        self.tile_height = tile_height
        try:
            self.image = pygame.image.load(filename).convert_alpha()
            self.rect = self.image.get_rect()
            self.tiles = []
            self.load_tiles()
        except:
            # Create placeholder tileset
            self.image = pygame.Surface((256, 256))
            self.tiles = []
            for i in range(16):
                tile = pygame.Surface((tile_width, tile_height))
                tile.fill((100 + i*10, 100, 100))  # Different shades
                self.tiles.append(tile)
    
    def load_tiles(self):
        """Split tileset into individual tiles"""
        for y in range(0, self.rect.height, self.tile_height):
            for x in range(0, self.rect.width, self.tile_width):
                tile = pygame.Surface((self.tile_width, self.tile_height), pygame.SRCALPHA)
                tile.blit(self.image, (0, 0), (x, y, self.tile_width, self.tile_height))
                self.tiles.append(tile)
    
    def get_tile(self, index):
        """Get a specific tile by index"""
        if 0 <= index < len(self.tiles):
            return self.tiles[index]
        return self.tiles[0] if self.tiles else pygame.Surface((self.tile_width, self.tile_height))

# Load dungeon tileset (16x16 tiles)
dungeon_tiles = Tileset('assets/tilesets/dungeon.png', 16, 16)

# Define tile types
TILE_FLOOR = 0
TILE_WALL = 1
TILE_DOOR = 2
TILE_CHEST = 3`;

    case '3d':
      return `# 3D Model Loading with PyGame and OpenGL
import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *
import json

class GLTFLoader:
    """Simple GLTF/GLB loader for pygame with OpenGL"""
    
    def __init__(self, filename):
        self.filename = filename
        self.vertices = []
        self.faces = []
        self.normals = []
        self.texcoords = []
        
        # For now, create a simple cube as placeholder
        # Real GLTF loading would require parsing the binary format
        self.load_placeholder_cube()
    
    def load_placeholder_cube(self):
        """Create a simple cube as placeholder for 3D models"""
        # Cube vertices
        self.vertices = [
            [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],  # Back face
            [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]       # Front face
        ]
        
        # Cube faces (quads)
        self.faces = [
            [0, 1, 2, 3],  # Back
            [4, 7, 6, 5],  # Front
            [0, 4, 5, 1],  # Bottom
            [2, 6, 7, 3],  # Top
            [0, 3, 7, 4],  # Left
            [1, 5, 6, 2]   # Right
        ]
        
        # Colors for each face
        self.colors = [
            (1, 0, 0),  # Red
            (0, 1, 0),  # Green
            (0, 0, 1),  # Blue
            (1, 1, 0),  # Yellow
            (1, 0, 1),  # Magenta
            (0, 1, 1)   # Cyan
        ]
    
    def draw(self):
        """Render the 3D model"""
        glBegin(GL_QUADS)
        for i, face in enumerate(self.faces):
            glColor3fv(self.colors[i])
            for vertex_index in face:
                glVertex3fv(self.vertices[vertex_index])
        glEnd()

# Initialize 3D rendering
def init_3d(width, height):
    """Initialize OpenGL for 3D rendering"""
    pygame.init()
    pygame.display.set_mode((width, height), DOUBLEBUF | OPENGL)
    
    # Set up perspective
    glMatrixMode(GL_PROJECTION)
    gluPerspective(45, width/height, 0.1, 50.0)
    glMatrixMode(GL_MODELVIEW)
    glTranslatef(0.0, 0.0, -5)
    
    # Enable depth testing
    glEnable(GL_DEPTH_TEST)
    
    # Enable smooth shading
    glShadeModel(GL_SMOOTH)

# Example usage:
# model = GLTFLoader('assets/models/character.gltf')
# In game loop: model.draw()`;

    default:
      return '# Asset loading code';
  }
}

// Function to create an asset showcase component
export function createAssetShowcase(assets: GameAsset[]): string {
  return `
# Asset Showcase - Display all loaded assets
def show_assets(screen, assets):
    """Display loaded assets for testing"""
    font = pygame.font.Font(None, 24)
    y_offset = 10
    
    # Show loaded fonts
    if 'fonts' in assets:
        for font_name, font_obj in assets['fonts'].items():
            text = font_obj.render(f"{font_name}: The quick brown fox", True, (255, 255, 255))
            screen.blit(text, (10, y_offset))
            y_offset += 30
    
    # Show loaded sprites
    if 'sprites' in assets:
        x_offset = 10
        for sprite_name, sprite_surface in assets['sprites'].items():
            screen.blit(sprite_surface, (x_offset, 200))
            label = font.render(sprite_name, True, (255, 255, 255))
            screen.blit(label, (x_offset, 240))
            x_offset += sprite_surface.get_width() + 20
    
    # Play sounds on key press
    if 'sounds' in assets:
        keys = pygame.key.get_pressed()
        if keys[pygame.K_1] and 'jump' in assets['sounds']:
            assets['sounds']['jump'].play()
        if keys[pygame.K_2] and 'coin' in assets['sounds']:
            assets['sounds']['coin'].play()
        
        # Show sound controls
        text = font.render("Press 1 for jump, 2 for coin sound", True, (255, 255, 0))
        screen.blit(text, (10, 400))
`;
}

// Generate a complete asset manager class
export function generateAssetManager(): string {
  return `# Complete Asset Manager for PyGame
import pygame
import os
import json

class AssetManager:
    """Centralized asset loading and management"""
    
    def __init__(self, base_path='assets'):
        self.base_path = base_path
        self.fonts = {}
        self.sounds = {}
        self.music = {}
        self.sprites = {}
        self.tilesets = {}
        self.animations = {}
        
        # Asset manifest (tracks what's available)
        self.manifest = self.load_manifest()
    
    def load_manifest(self):
        """Load asset manifest from JSON"""
        manifest_path = os.path.join(self.base_path, 'manifest.json')
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r') as f:
                return json.load(f)
        return {}
    
    def load_all(self):
        """Load all assets specified in manifest"""
        if 'fonts' in self.manifest:
            for font_id, font_data in self.manifest['fonts'].items():
                self.load_font(font_id, font_data['path'], font_data.get('size', 16))
        
        if 'sounds' in self.manifest:
            for sound_id, sound_data in self.manifest['sounds'].items():
                self.load_sound(sound_id, sound_data['path'])
        
        if 'sprites' in self.manifest:
            for sprite_id, sprite_data in self.manifest['sprites'].items():
                self.load_sprite(sprite_id, sprite_data['path'])
        
        if 'tilesets' in self.manifest:
            for tileset_id, tileset_data in self.manifest['tilesets'].items():
                self.load_tileset(tileset_id, tileset_data['path'], 
                                tileset_data['tile_width'], tileset_data['tile_height'])
    
    def load_font(self, font_id, path, size=16):
        """Load a font file"""
        try:
            full_path = os.path.join(self.base_path, path)
            self.fonts[font_id] = pygame.font.Font(full_path, size)
            print(f"Loaded font: {font_id}")
        except Exception as e:
            print(f"Failed to load font {font_id}: {e}")
            self.fonts[font_id] = pygame.font.Font(None, size)
    
    def load_sound(self, sound_id, path):
        """Load a sound effect"""
        try:
            full_path = os.path.join(self.base_path, path)
            self.sounds[sound_id] = pygame.mixer.Sound(full_path)
            self.sounds[sound_id].set_volume(0.5)
            print(f"Loaded sound: {sound_id}")
        except Exception as e:
            print(f"Failed to load sound {sound_id}: {e}")
    
    def load_sprite(self, sprite_id, path):
        """Load a sprite image"""
        try:
            full_path = os.path.join(self.base_path, path)
            self.sprites[sprite_id] = pygame.image.load(full_path).convert_alpha()
            print(f"Loaded sprite: {sprite_id}")
        except Exception as e:
            print(f"Failed to load sprite {sprite_id}: {e}")
            # Create placeholder sprite
            self.sprites[sprite_id] = pygame.Surface((32, 32))
            self.sprites[sprite_id].fill((255, 0, 255))
    
    def load_tileset(self, tileset_id, path, tile_width, tile_height):
        """Load a tileset image and split into tiles"""
        try:
            full_path = os.path.join(self.base_path, path)
            image = pygame.image.load(full_path).convert_alpha()
            
            tiles = []
            for y in range(0, image.get_height(), tile_height):
                for x in range(0, image.get_width(), tile_width):
                    tile = pygame.Surface((tile_width, tile_height), pygame.SRCALPHA)
                    tile.blit(image, (0, 0), (x, y, tile_width, tile_height))
                    tiles.append(tile)
            
            self.tilesets[tileset_id] = {
                'tiles': tiles,
                'tile_width': tile_width,
                'tile_height': tile_height
            }
            print(f"Loaded tileset: {tileset_id} ({len(tiles)} tiles)")
        except Exception as e:
            print(f"Failed to load tileset {tileset_id}: {e}")
    
    def get_font(self, font_id, fallback_size=16):
        """Get a loaded font or fallback"""
        if font_id in self.fonts:
            return self.fonts[font_id]
        return pygame.font.Font(None, fallback_size)
    
    def play_sound(self, sound_id):
        """Play a sound effect if loaded"""
        if sound_id in self.sounds:
            self.sounds[sound_id].play()
    
    def get_sprite(self, sprite_id):
        """Get a loaded sprite or placeholder"""
        if sprite_id in self.sprites:
            return self.sprites[sprite_id]
        # Return placeholder
        placeholder = pygame.Surface((32, 32))
        placeholder.fill((255, 0, 255))
        return placeholder
    
    def get_tile(self, tileset_id, tile_index):
        """Get a specific tile from a tileset"""
        if tileset_id in self.tilesets:
            tiles = self.tilesets[tileset_id]['tiles']
            if 0 <= tile_index < len(tiles):
                return tiles[tile_index]
        # Return placeholder tile
        placeholder = pygame.Surface((16, 16))
        placeholder.fill((100, 100, 100))
        return placeholder

# Example usage:
# assets = AssetManager()
# assets.load_all()
# font = assets.get_font('pixel_font')
# assets.play_sound('jump')
`;
}
