// PyGame Game Compiler
// Compiles selected components and assets into a playable Python game

import { PygameComponent } from '@/lib/pygame-components/types';
import { pygameComponents } from '@/lib/pygame-components';
import { GameAsset } from '@/lib/asset-library/asset-types';

export function compilePythonGame(
  selectedComponents: Record<string, string>, // componentId -> variant
  selectedAssets: GameAsset[]
): string {
  
  const imports = `
import pygame
import sys
import random
import math

# Initialize Pygame
pygame.init()

# Constants
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60
GRAVITY = 0.5
`;

  const assetLoader = generateAssetLoader(selectedAssets);
  const titleScreen = generateTitleScreen(selectedAssets);
  const gameplayCode = generateGameplay(selectedComponents, selectedAssets);
  const endingScreen = generateEndingScreen(selectedComponents, selectedAssets);
  
  const mainLoop = `
class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("My PyGame Creation")
        self.clock = pygame.time.Clock()
        self.running = True
        self.state = "title"  # title, gameplay, ending
        self.score = 0
        ${assetLoader}
        
    def run(self):
        while self.running:
            dt = self.clock.tick(FPS) / 1000.0
            
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running = False
                    
            if self.state == "title":
                self.show_title_screen()
            elif self.state == "gameplay":
                self.run_gameplay(dt)
            elif self.state == "ending":
                self.show_ending_screen()
                
            pygame.display.flip()
            
        pygame.quit()
        sys.exit()
        
    ${titleScreen}
    ${gameplayCode}
    ${endingScreen}

if __name__ == "__main__":
    game = Game()
    game.run()
`;

  return imports + mainLoop;
}

function generateAssetLoader(assets: GameAsset[]): string {
  let loader = `
        # Load assets
        self.assets = {}`;
  
  assets.forEach(asset => {
    if (asset.type === 'sprite') {
      loader += `
        try:
            self.assets['${asset.id}'] = pygame.image.load('${asset.path || asset.id}')
        except:
            # Create placeholder if asset not found
            surf = pygame.Surface((32, 32))
            surf.fill((255, 0, 255))
            self.assets['${asset.id}'] = surf`;
    } else if (asset.type === 'background') {
      loader += `
        try:
            self.assets['${asset.id}'] = pygame.image.load('${asset.path || asset.id}')
            # Scale background to fit screen
            self.assets['${asset.id}'] = pygame.transform.scale(self.assets['${asset.id}'], (SCREEN_WIDTH, SCREEN_HEIGHT))
        except:
            # Create placeholder background
            surf = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
            surf.fill((100, 100, 200))
            self.assets['${asset.id}'] = surf`;
    } else if (asset.type === 'sound') {
      loader += `
        try:
            self.assets['${asset.id}'] = pygame.mixer.Sound('${asset.path || asset.id}')
        except:
            self.assets['${asset.id}'] = None`;
    } else if (asset.type === 'music') {
      loader += `
        try:
            # Music is handled differently - just store path for later loading
            self.assets['${asset.id}_music_path'] = '${asset.path || asset.id}'
        except:
            self.assets['${asset.id}_music_path'] = None`;
    }
  });
  
  return loader;
}

function generateTitleScreen(assets: GameAsset[]): string {
  const bgAsset = assets.find(a => a.type === 'background');
  const musicAsset = assets.find(a => a.type === 'music');
  
  return `
    def show_title_screen(self):
        keys = pygame.key.get_pressed()
        
        # Clear screen
        ${bgAsset ? 
          `if '${bgAsset.id}' in self.assets:
            self.screen.blit(self.assets['${bgAsset.id}'], (0, 0))
        else:
            self.screen.fill((50, 50, 150))` :
          `self.screen.fill((50, 50, 150))`
        }
        
        # Draw title
        font = pygame.font.Font(None, 74)
        title_text = font.render("MY AWESOME GAME", True, (255, 255, 255))
        title_rect = title_text.get_rect(center=(SCREEN_WIDTH//2, SCREEN_HEIGHT//3))
        self.screen.blit(title_text, title_rect)
        
        # Draw start prompt
        font_small = pygame.font.Font(None, 36)
        start_text = font_small.render("Press SPACE to Start", True, (200, 200, 200))
        start_rect = start_text.get_rect(center=(SCREEN_WIDTH//2, SCREEN_HEIGHT//2))
        self.screen.blit(start_text, start_rect)
        
        # Start game on space
        if keys[pygame.K_SPACE]:
            self.state = "gameplay"
            ${musicAsset ? 
              `# Load and play background music
            if '${musicAsset.id}_music_path' in self.assets and self.assets['${musicAsset.id}_music_path']:
                pygame.mixer.music.load(self.assets['${musicAsset.id}_music_path'])
                pygame.mixer.music.play(-1)` : ''
            }
`;
}

function generateGameplay(components: Record<string, string>, assets: GameAsset[]): string {
  let gameplayCode = `
    def run_gameplay(self, dt):
        keys = pygame.key.get_pressed()
        
        # Clear screen
        self.screen.fill((135, 206, 235))  # Sky blue
        
        # Player position (simple example)
        if not hasattr(self, 'player_x'):
            self.player_x = SCREEN_WIDTH // 2
            self.player_y = SCREEN_HEIGHT - 100
            self.player_vx = 0
            self.player_vy = 0
        
`;

  // Add selected component behaviors
  Object.entries(components).forEach(([componentId, variant]) => {
    const component = pygameComponents.find(c => c.id === componentId);
    if (component) {
      // Add simplified version of component behavior
      if (componentId === 'jump' && variant === 'A') {
        gameplayCode += `
        # Floaty Jump (Component: ${componentId} - Variant ${variant})
        if keys[pygame.K_SPACE] and self.player_y >= SCREEN_HEIGHT - 100:
            self.player_vy = -15
        
        # Apply gravity with float effect
        if self.player_y < SCREEN_HEIGHT - 100:
            self.player_vy += GRAVITY * 0.7  # Floaty
        else:
            self.player_y = SCREEN_HEIGHT - 100
            self.player_vy = 0
`;
      } else if (componentId === 'jump' && variant === 'B') {
        gameplayCode += `
        # Realistic Jump (Component: ${componentId} - Variant ${variant}) 
        if keys[pygame.K_SPACE] and self.player_y >= SCREEN_HEIGHT - 100:
            self.player_vy = -12
        
        # Apply normal gravity
        if self.player_y < SCREEN_HEIGHT - 100:
            self.player_vy += GRAVITY
        else:
            self.player_y = SCREEN_HEIGHT - 100
            self.player_vy = 0
`;
      }
      
      if (componentId === 'shooting') {
        gameplayCode += `
        # Shooting mechanics
        if keys[pygame.K_x]:
            # Fire projectile
            pass  # Simplified for demo
`;
      }
    }
  });
  
  // Add movement and rendering
  gameplayCode += `
        # Basic movement
        if keys[pygame.K_LEFT]:
            self.player_x -= 5
        if keys[pygame.K_RIGHT]:
            self.player_x += 5
            
        # Update position
        self.player_y += self.player_vy
        
        # Keep player on screen
        self.player_x = max(0, min(SCREEN_WIDTH - 32, self.player_x))
        
        # Draw player
        pygame.draw.rect(self.screen, (255, 0, 0), 
                        (self.player_x, self.player_y, 32, 32))
        
        # Simple win condition
        self.score += 1
        if self.score > 300:  # Win after 5 seconds
            self.state = "ending"
`;
  
  return gameplayCode;
}

function generateEndingScreen(components: Record<string, string>, assets: GameAsset[]): string {
  const scoreVariant = components['score'] || 'A';
  
  return `
    def show_ending_screen(self):
        keys = pygame.key.get_pressed()
        
        # Clear screen
        self.screen.fill((0, 50, 0))  # Dark green
        
        # Victory text
        font_big = pygame.font.Font(None, 72)
        victory_text = font_big.render("VICTORY!", True, (255, 215, 0))
        victory_rect = victory_text.get_rect(center=(SCREEN_WIDTH//2, SCREEN_HEIGHT//3))
        self.screen.blit(victory_text, victory_rect)
        
        # Score display
        font = pygame.font.Font(None, 48)
        ${scoreVariant === 'A' ? 
          `# Animated score counter
        if not hasattr(self, 'display_score'):
            self.display_score = 0
        if self.display_score < self.score:
            self.display_score += 5
        score_text = font.render(f"Score: {self.display_score}", True, (255, 255, 255))` :
          `# Instant score display
        score_text = font.render(f"Score: {self.score}", True, (255, 255, 255))`
        }
        score_rect = score_text.get_rect(center=(SCREEN_WIDTH//2, SCREEN_HEIGHT//2))
        self.screen.blit(score_text, score_rect)
        
        # Restart prompt
        font_small = pygame.font.Font(None, 36)
        restart_text = font_small.render("Press R to Restart", True, (200, 200, 200))
        restart_rect = restart_text.get_rect(center=(SCREEN_WIDTH//2, SCREEN_HEIGHT*2//3))
        self.screen.blit(restart_text, restart_rect)
        
        # Restart game
        if keys[pygame.K_r]:
            self.state = "title"
            self.score = 0
            if hasattr(self, 'display_score'):
                del self.display_score
`;
}

export function downloadPythonFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/x-python' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}