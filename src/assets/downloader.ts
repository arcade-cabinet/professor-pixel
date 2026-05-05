// Asset Downloader - Helper to fetch CC0 assets from their sources
// This helps kids download real assets to use in their games

export interface AssetDownload {
  name: string;
  sourceUrl: string;
  localPath: string;
  license: string;
  type: string;
}

// Direct download links for popular CC0 assets
export const directAssetLinks = {
  fonts: [
    {
      name: 'm5x7',
      sourceUrl: 'https://managore.itch.io/m5x7',
      directLink: null, // Would need actual CDN link
      localPath: 'assets/fonts/m5x7.ttf',
      license: 'CC0',
    },
    {
      name: 'Press Start 2P',
      sourceUrl: 'https://fonts.googleapis.com/css2?family=Press+Start+2P',
      directLink: 'https://fonts.gstatic.com/s/pressstart2p/v14/e3t4euO8T-267oIAQAu6jDQyK0nR.ttf',
      localPath: 'assets/fonts/press-start-2p.ttf',
      license: 'OFL',
    },
  ],
  sprites: [
    {
      name: 'Kenney Platformer Pack',
      sourceUrl: 'https://kenney.nl/assets/platformer-pack-redux',
      directLink: null,
      localPath: 'assets/sprites/kenney-platformer/',
      license: 'CC0',
    },
  ],
  sounds: [
    {
      name: 'Freesound Jump',
      sourceUrl: 'https://freesound.org',
      directLink: null,
      localPath: 'assets/sounds/jump.wav',
      license: 'CC0',
    },
  ],
};

// Python script to help download assets
export const assetDownloadScript = `# Asset Downloader for Pixel's PyGame Palace
# Downloads CC0 assets for use in your games

import os
import requests
import zipfile
import json
from pathlib import Path

class AssetDownloader:
    """Downloads CC0 assets from various sources"""
    
    def __init__(self, assets_dir='assets'):
        self.assets_dir = Path(assets_dir)
        self.assets_dir.mkdir(exist_ok=True)
        
        # Create subdirectories
        for subdir in ['fonts', 'sounds', 'music', 'sprites', 'tilesets', 'models']:
            (self.assets_dir / subdir).mkdir(exist_ok=True)
    
    def download_file(self, url, destination):
        """Download a file from URL to destination"""
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            with open(destination, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print(f"✓ Downloaded: {destination.name}")
            return True
        except Exception as e:
            print(f"✗ Failed to download {url}: {e}")
            return False
    
    def download_google_font(self, font_name, font_url):
        """Download a font from Google Fonts"""
        # Google Fonts provides direct TTF links
        destination = self.assets_dir / 'fonts' / f"{font_name.lower().replace(' ', '-')}.ttf"
        
        if destination.exists():
            print(f"Font {font_name} already exists")
            return
        
        if self.download_file(font_url, destination):
            self.create_font_demo(font_name, destination)
    
    def create_font_demo(self, font_name, font_path):
        """Create a demo showing the font"""
        demo_code = f'''# Font Demo: {font_name}
import pygame

pygame.init()
screen = pygame.display.set_mode((400, 200))
clock = pygame.time.Clock()

# Load the downloaded font
font = pygame.font.Font('{font_path}', 32)
text = font.render("{font_name}", True, (255, 255, 255))

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    
    screen.fill((50, 50, 50))
    screen.blit(text, (50, 80))
    pygame.display.flip()
    clock.tick(60)

pygame.quit()
'''
        demo_path = font_path.parent / f"demo_{font_name.lower().replace(' ', '_')}.py"
        with open(demo_path, 'w') as f:
            f.write(demo_code)
        print(f"Created font demo: {demo_path}")
    
    def download_kenney_pack(self, pack_name='platformer-pack-redux'):
        """Download a Kenney asset pack (CC0)"""
        # Note: Actual download would require parsing Kenney's site
        # or using their direct download links
        
        sprites_dir = self.assets_dir / 'sprites' / pack_name
        sprites_dir.mkdir(exist_ok=True)
        
        # Create placeholder info
        info = {
            'name': pack_name,
            'source': 'https://kenney.nl',
            'license': 'CC0',
            'description': 'Download from Kenney.nl for free CC0 game assets'
        }
        
        with open(sprites_dir / 'info.json', 'w') as f:
            json.dump(info, f, indent=2)
        
        print(f"Visit https://kenney.nl/assets/{pack_name} to download CC0 sprites")
    
    def create_asset_manifest(self):
        """Create a manifest of all downloaded assets"""
        manifest = {
            'fonts': [],
            'sounds': [],
            'sprites': [],
            'music': [],
            'models': []
        }
        
        # Scan directories for assets
        for category in manifest.keys():
            category_dir = self.assets_dir / category
            if category_dir.exists():
                for file in category_dir.iterdir():
                    if file.is_file() and not file.name.endswith('.json'):
                        manifest[category].append({
                            'path': str(file.relative_to(self.assets_dir)),
                            'name': file.stem,
                            'size': file.stat().st_size
                        })
        
        # Save manifest
        with open(self.assets_dir / 'manifest.json', 'w') as f:
            json.dump(manifest, f, indent=2)
        
        print(f"Created asset manifest with {sum(len(v) for v in manifest.values())} assets")
        return manifest

# Example usage
if __name__ == "__main__":
    downloader = AssetDownloader()
    
    # Download some Google Fonts (these have direct links)
    google_fonts = [
        ('Press Start 2P', 'https://fonts.gstatic.com/s/pressstart2p/v14/e3t4euO8T-267oIAQAu6jDQyK0nR.ttf'),
        ('VT323', 'https://fonts.gstatic.com/s/vt323/v17/pxiKyp0ihIEF2isRFJXGdg.ttf'),
        ('Silkscreen', 'https://fonts.gstatic.com/s/silkscreen/v4/m8JXjfVPf62XiF7kO-i9ULRvamODxdI.ttf')
    ]
    
    for font_name, font_url in google_fonts:
        downloader.download_google_font(font_name, font_url)
    
    # Provide info for manual downloads
    print("\\n" + "="*50)
    print("MANUAL DOWNLOADS NEEDED:")
    print("="*50)
    print("\\n1. Kenney Assets (CC0):")
    print("   - Visit: https://kenney.nl/assets")
    print("   - Recommended: Platformer Pack Redux, Pixel Platformer, UI Pack")
    print("   - Extract to: assets/sprites/")
    
    print("\\n2. OpenGameArt (Various Licenses):")
    print("   - Visit: https://opengameart.org")
    print("   - Filter by CC0 license")
    print("   - Download sprites, tilesets, sounds")
    
    print("\\n3. Freesound (CC0 Sounds):")
    print("   - Visit: https://freesound.org")
    print("   - Search and filter by CC0")
    print("   - Download to: assets/sounds/")
    
    # Create manifest
    downloader.create_asset_manifest()
    
    print("\\n✓ Asset setup complete!")
    print("Check the assets/ directory for your downloaded files")
`;

// Instructions for using assets in games
export const assetUsageGuide = `
# Using Assets in Your PyGame Projects

## 1. Loading Fonts
\`\`\`python
# Load a custom font
custom_font = pygame.font.Font('assets/fonts/press-start-2p.ttf', 24)

# Use the font
text = custom_font.render("Game Over!", True, (255, 255, 255))
screen.blit(text, (100, 100))
\`\`\`

## 2. Loading Sprites
\`\`\`python
# Load a sprite image
player_sprite = pygame.image.load('assets/sprites/player.png').convert_alpha()

# Scale if needed
player_sprite = pygame.transform.scale(player_sprite, (64, 64))

# Use in game
screen.blit(player_sprite, (player_x, player_y))
\`\`\`

## 3. Loading Sounds
\`\`\`python
# Initialize mixer
pygame.mixer.init()

# Load sounds
jump_sound = pygame.mixer.Sound('assets/sounds/jump.wav')
coin_sound = pygame.mixer.Sound('assets/sounds/coin.wav')

# Play sound
jump_sound.play()
\`\`\`

## 4. Loading Tilesets
\`\`\`python
# Load tileset image
tileset = pygame.image.load('assets/tilesets/dungeon.png').convert_alpha()

# Extract individual tiles
def get_tile(tileset, x, y, width=16, height=16):
    tile = pygame.Surface((width, height), pygame.SRCALPHA)
    tile.blit(tileset, (0, 0), (x, y, width, height))
    return tile

# Get specific tiles
wall_tile = get_tile(tileset, 0, 0)
floor_tile = get_tile(tileset, 16, 0)
\`\`\`

## 5. Asset Organization
Keep your assets organized:
- assets/fonts/ - Font files
- assets/sounds/ - Sound effects
- assets/music/ - Background music
- assets/sprites/ - Character and object sprites
- assets/tilesets/ - Level building tiles
- assets/models/ - 3D models

## Remember: All assets should be CC0 or properly licensed!
`;
