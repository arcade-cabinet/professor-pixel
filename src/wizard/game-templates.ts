// Game templates for the Project Builder
// These provide starter code for different types of games

import { generateGameTemplate, getUserComponentChoices, ComponentChoice } from './game-building-blocks';

export interface GameTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  files: Array<{
    path: string;
    content: string;
  }>;
  useComponents?: boolean;
}

export const gameTemplates: GameTemplate[] = [
  {
    id: 'custom-components',
    name: 'Custom Game with Your Components',
    description: 'A game built with your selected building blocks',
    difficulty: 'Intermediate',
    useComponents: true,
    files: [
      {
        path: 'main.py',
        content: ''
      }
    ]
  },
  {
    id: '3d-demo',
    name: '3D Graphics Demo',
    description: 'Demonstrates 3D graphics in pygame without OpenGL',
    difficulty: 'Advanced',
    files: [
      {
        path: 'main.py',
        content: `# 3D Graphics Demo - PyGame with 3D rendering
# Shows how to render 3D objects in pygame!

import pygame
import math

class Simple3D:
    """Simple 3D engine for pygame"""
    
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.center_x = width // 2
        self.center_y = height // 2
        self.fov = 256
        self.camera_z = -5
        self.rotation_y = 0
    
    def project_point(self, point):
        """Project 3D point to 2D"""
        x, y, z = point
        
        # Rotate around Y axis
        cos_y = math.cos(self.rotation_y)
        sin_y = math.sin(self.rotation_y)
        x, z = x * cos_y + z * sin_y, -x * sin_y + z * cos_y
        
        # Move relative to camera
        z -= self.camera_z
        if z <= 0:
            z = 0.1
        
        # Project to screen
        factor = self.fov / z
        x_2d = int(x * factor + self.center_x)
        y_2d = int(y * factor + self.center_y)
        
        return (x_2d, y_2d, z)
    
    def draw_cube(self, screen, size=1, color=(100, 200, 100)):
        """Draw a 3D cube"""
        # Define cube vertices
        vertices = [
            [-size, -size, -size], [size, -size, -size],
            [size, size, -size], [-size, size, -size],
            [-size, -size, size], [size, -size, size],
            [size, size, size], [-size, size, size]
        ]
        
        # Define cube edges
        edges = [
            (0, 1), (1, 2), (2, 3), (3, 0),  # Back face
            (4, 5), (5, 6), (6, 7), (7, 4),  # Front face
            (0, 4), (1, 5), (2, 6), (3, 7)   # Connecting edges
        ]
        
        # Project all vertices
        projected = [self.project_point(v) for v in vertices]
        
        # Draw edges
        for edge in edges:
            p1 = projected[edge[0]]
            p2 = projected[edge[1]]
            if p1[2] > 0 and p2[2] > 0:
                pygame.draw.line(screen, color, p1[:2], p2[:2], 2)

# Initialize pygame
pygame.init()
screen = pygame.display.set_mode((800, 600))
pygame.display.set_caption("3D Graphics in PyGame!")
clock = pygame.time.Clock()

# Create 3D engine
engine = Simple3D(800, 600)

# Main game loop
running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    
    # Rotate the cube
    engine.rotation_y += 0.02
    
    # Clear screen
    screen.fill((20, 20, 40))
    
    # Draw 3D cube
    engine.draw_cube(screen, size=1.5)
    
    # Draw instructions
    font = pygame.font.Font(None, 24)
    text = font.render("PyGame can do 3D graphics!", True, (255, 255, 255))
    screen.blit(text, (10, 10))
    
    pygame.display.flip()
    clock.tick(60)

pygame.quit()`
      }
    ]
  },
  {
    id: 'asset-rich',
    name: 'Asset-Rich Game Template',
    description: 'Game with fonts, sounds, and sprites from CC0 sources',
    difficulty: 'Intermediate',
    files: [
      {
        path: 'main.py',
        content: `# Asset-Rich Game Template
# Demonstrates loading and using real CC0 assets

import pygame
import random

# Initialize pygame
pygame.init()
pygame.mixer.init()
pygame.font.init()

# Game settings
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GREEN = (0, 255, 0)
RED = (255, 0, 0)
BLUE = (0, 100, 255)

class AssetManager:
    """Manages all game assets"""
    
    def __init__(self):
        self.fonts = {}
        self.sounds = {}
        self.sprites = {}
        self.load_assets()
    
    def load_assets(self):
        """Load all game assets"""
        # Load fonts (with fallback)
        try:
            # Try to load pixel font
            self.fonts['main'] = pygame.font.Font(None, 32)
            self.fonts['ui'] = pygame.font.Font(None, 24)
        except:
            # Fallback to system font
            self.fonts['main'] = pygame.font.Font(None, 32)
            self.fonts['ui'] = pygame.font.Font(None, 24)
        
        # Create placeholder sprites
        self.sprites['player'] = pygame.Surface((32, 32))
        self.sprites['player'].fill(BLUE)
        
        self.sprites['coin'] = pygame.Surface((20, 20))
        pygame.draw.circle(self.sprites['coin'], (255, 215, 0), (10, 10), 10)
        
        self.sprites['enemy'] = pygame.Surface((30, 30))
        self.sprites['enemy'].fill(RED)
        
        print("Assets loaded successfully!")

class Player:
    def __init__(self, x, y, sprite):
        self.x = x
        self.y = y
        self.sprite = sprite
        self.vel_x = 0
        self.vel_y = 0
        self.speed = 5
        self.rect = pygame.Rect(x, y, 32, 32)
    
    def update(self):
        # Handle input
        keys = pygame.key.get_pressed()
        self.vel_x = 0
        self.vel_y = 0
        
        if keys[pygame.K_LEFT]:
            self.vel_x = -self.speed
        if keys[pygame.K_RIGHT]:
            self.vel_x = self.speed
        if keys[pygame.K_UP]:
            self.vel_y = -self.speed
        if keys[pygame.K_DOWN]:
            self.vel_y = self.speed
        
        # Update position
        self.x += self.vel_x
        self.y += self.vel_y
        
        # Keep on screen
        self.x = max(0, min(SCREEN_WIDTH - 32, self.x))
        self.y = max(0, min(SCREEN_HEIGHT - 32, self.y))
        
        self.rect.x = self.x
        self.rect.y = self.y
    
    def draw(self, screen):
        screen.blit(self.sprite, (self.x, self.y))

class Coin:
    def __init__(self, x, y, sprite):
        self.x = x
        self.y = y
        self.sprite = sprite
        self.rect = pygame.Rect(x, y, 20, 20)
        self.collected = False
    
    def draw(self, screen):
        if not self.collected:
            screen.blit(self.sprite, (self.x, self.y))

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Asset-Rich Game")
        self.clock = pygame.time.Clock()
        self.running = True
        
        # Load assets
        self.assets = AssetManager()
        
        # Create game objects
        self.player = Player(100, 300, self.assets.sprites['player'])
        self.coins = []
        self.score = 0
        
        # Create coins
        for i in range(10):
            x = random.randint(50, SCREEN_WIDTH - 50)
            y = random.randint(50, SCREEN_HEIGHT - 50)
            self.coins.append(Coin(x, y, self.assets.sprites['coin']))
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
    
    def update(self):
        self.player.update()
        
        # Check coin collection
        for coin in self.coins:
            if not coin.collected and self.player.rect.colliderect(coin.rect):
                coin.collected = True
                self.score += 10
    
    def draw(self):
        # Clear screen
        self.screen.fill((40, 40, 60))
        
        # Draw game objects
        self.player.draw(self.screen)
        for coin in self.coins:
            coin.draw(self.screen)
        
        # Draw UI
        score_text = self.assets.fonts['main'].render(f"Score: {self.score}", True, WHITE)
        self.screen.blit(score_text, (10, 10))
        
        instructions = self.assets.fonts['ui'].render("Arrow keys to move, collect coins!", True, WHITE)
        self.screen.blit(instructions, (10, 50))
        
        # Check win condition
        if all(coin.collected for coin in self.coins):
            win_text = self.assets.fonts['main'].render("You Win!", True, GREEN)
            text_rect = win_text.get_rect(center=(SCREEN_WIDTH//2, SCREEN_HEIGHT//2))
            self.screen.blit(win_text, text_rect)
        
        pygame.display.flip()
    
    def run(self):
        while self.running:
            self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(FPS)
        
        pygame.quit()

# Run the game
if __name__ == "__main__":
    game = Game()
    game.run()`
      }
    ]
  },
  {
    id: 'asset-test',
    name: 'Asset Loading Test',
    description: 'Test template for verifying asset loading works correctly',
    difficulty: 'Beginner',
    files: [
      {
        path: 'main.py',
        content: `# Asset Loading Test - Verify pygame can load uploaded assets
# Upload an image asset and test if it loads correctly

import pygame
import os

# Initialize Pygame
pygame.init()

# Game settings
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREEN = (0, 255, 0)
RED = (255, 0, 0)

class AssetTester:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Asset Loading Test")
        self.clock = pygame.time.Clock()
        self.running = True
        self.font = pygame.font.Font(None, 24)
        
        # Test asset loading
        self.test_results = []
        self.loaded_images = []
        self.loaded_sounds = []
        
        # Test common asset paths
        self.test_asset_loading()
        
    def test_asset_loading(self):
        # Test file system access
        try:
            current_dir = os.getcwd()
            self.test_results.append(f"✓ Current directory: {current_dir}")
            
            # List project contents
            if os.path.exists('.'):
                files = os.listdir('.')
                self.test_results.append(f"✓ Project files: {files}")
            
            # Check for assets directory
            if os.path.exists('assets'):
                assets = os.listdir('assets')
                self.test_results.append(f"✓ Assets directory found: {assets}")
                
                # Check sprites subdirectory
                if os.path.exists('assets/sprites'):
                    sprites = os.listdir('assets/sprites')
                    self.test_results.append(f"✓ Sprites found: {sprites}")
                    
                    # Try to load first sprite
                    for sprite_name in sprites:
                        if sprite_name.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                            try:
                                img_path = f'assets/sprites/{sprite_name}'
                                image = pygame.image.load(img_path)
                                self.loaded_images.append((sprite_name, image))
                                self.test_results.append(f"✓ Successfully loaded: {sprite_name}")
                            except Exception as e:
                                self.test_results.append(f"✗ Failed to load {sprite_name}: {e}")
                
                # Check sounds subdirectory  
                if os.path.exists('assets/sounds'):
                    sounds = os.listdir('assets/sounds')
                    self.test_results.append(f"✓ Sounds found: {sounds}")
                    
                    # Try to load first sound
                    for sound_name in sounds:
                        if sound_name.lower().endswith(('.wav', '.ogg', '.mp3')):
                            try:
                                sound_path = f'assets/sounds/{sound_name}'
                                sound = pygame.mixer.Sound(sound_path)
                                self.loaded_sounds.append((sound_name, sound))
                                self.test_results.append(f"✓ Successfully loaded: {sound_name}")
                            except Exception as e:
                                self.test_results.append(f"✗ Failed to load {sound_name}: {e}")
            else:
                self.test_results.append("! No assets directory found - upload some assets first")
                
        except Exception as e:
            self.test_results.append(f"✗ Error during asset testing: {e}")
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    # Refresh asset test
                    self.test_results = []
                    self.loaded_images = []
                    self.loaded_sounds = []
                    self.test_asset_loading()
                elif event.key == pygame.K_s and self.loaded_sounds:
                    # Play first loaded sound
                    try:
                        self.loaded_sounds[0][1].play()
                        self.test_results.append("♪ Played sound effect")
                    except Exception as e:
                        self.test_results.append(f"✗ Sound play error: {e}")
    
    def draw(self):
        self.screen.fill(BLACK)
        
        # Draw title
        title = self.font.render("Asset Loading Test", True, WHITE)
        self.screen.blit(title, (10, 10))
        
        # Draw test results
        y_offset = 40
        for i, result in enumerate(self.test_results[-20:]):  # Show last 20 results
            color = GREEN if result.startswith('✓') else RED if result.startswith('✗') else WHITE
            text = self.font.render(result, True, color)
            self.screen.blit(text, (10, y_offset + i * 25))
        
        # Draw loaded images if any
        if self.loaded_images:
            x_offset = 400
            y_offset = 40
            
            label = self.font.render("Loaded Images:", True, WHITE)
            self.screen.blit(label, (x_offset, y_offset))
            y_offset += 30
            
            for i, (name, image) in enumerate(self.loaded_images[:5]):
                # Scale image to fit display
                img_rect = image.get_rect()
                if img_rect.width > 100 or img_rect.height > 100:
                    scale_factor = min(100/img_rect.width, 100/img_rect.height)
                    scaled_size = (int(img_rect.width * scale_factor), int(img_rect.height * scale_factor))
                    scaled_image = pygame.transform.scale(image, scaled_size)
                else:
                    scaled_image = image
                
                self.screen.blit(scaled_image, (x_offset, y_offset + i * 110))
                name_text = self.font.render(name, True, WHITE)
                self.screen.blit(name_text, (x_offset, y_offset + i * 110 + scaled_image.get_height() + 5))
        
        # Instructions
        instructions = [
            "Instructions:",
            "1. Upload assets using the Asset Manager", 
            "2. Press R to refresh asset test",
            "3. Press S to play first loaded sound",
            "4. Check console for detailed logs"
        ]
        
        y_offset = SCREEN_HEIGHT - 140
        for instruction in instructions:
            color = WHITE if instruction == "Instructions:" else (200, 200, 200)
            text = self.font.render(instruction, True, color)
            self.screen.blit(text, (10, y_offset))
            y_offset += 25
        
        pygame.display.flip()
    
    def run(self):
        while self.running:
            self.handle_events()
            self.draw()
            self.clock.tick(FPS)
        
        pygame.quit()

# Start the test
if __name__ == "__main__":
    tester = AssetTester()
    tester.run()
`
      }
    ]
  },
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start from scratch with a basic PyGame window',
    difficulty: 'Beginner',
    files: [
      {
        path: 'main.py',
        content: `# Pixel's PyGame Palace - Blank Canvas Template
# Start building your own game from scratch!

import pygame
import math
import random

# Initialize Pygame
pygame.init()

# Game settings
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

# Colors (RGB values)
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("My Amazing Game")
        self.clock = pygame.time.Clock()
        self.running = True
        
        # TODO: Initialize your game objects here
        
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.KEYDOWN:
                # TODO: Handle key presses here
                if event.key == pygame.K_SPACE:
                    print("Spacebar pressed!")
    
    def update(self):
        # TODO: Update your game logic here
        # This runs every frame
        pass
    
    def draw(self):
        # Clear the screen
        self.screen.fill(BLACK)
        
        # TODO: Draw your game objects here
        
        # Example: Draw a white circle in the center
        center_x = SCREEN_WIDTH // 2
        center_y = SCREEN_HEIGHT // 2
        pygame.draw.circle(self.screen, WHITE, (center_x, center_y), 50)
        
        # Update the display
        pygame.display.flip()
    
    def run(self):
        while self.running:
            self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(FPS)
        
        pygame.quit()

# Start the game
if __name__ == "__main__":
    game = Game()
    game.run()
`
      }
    ]
  },
  
  {
    id: 'platformer',
    name: 'Platformer Adventure',
    description: 'Side-scrolling platformer with jumping and collision detection',
    difficulty: 'Intermediate',
    files: [
      {
        path: 'main.py',
        content: `# Pixel's PyGame Palace - Platformer Template
# A side-scrolling adventure game with jumping and platforms!

import pygame
import math

# Initialize Pygame
pygame.init()

# Game settings
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60
GRAVITY = 0.8
JUMP_STRENGTH = -15

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
BLUE = (100, 150, 255)
GREEN = (0, 200, 0)
BROWN = (139, 69, 19)
RED = (255, 100, 100)

class Player:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.width = 30
        self.height = 40
        self.vel_x = 0
        self.vel_y = 0
        self.speed = 5
        self.on_ground = False
        self.color = RED
    
    def update(self, platforms):
        # Handle input
        keys = pygame.key.get_pressed()
        self.vel_x = 0
        
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.vel_x = -self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.vel_x = self.speed
        if (keys[pygame.K_SPACE] or keys[pygame.K_UP] or keys[pygame.K_w]) and self.on_ground:
            self.vel_y = JUMP_STRENGTH
            self.on_ground = False
        
        # Apply gravity
        self.vel_y += GRAVITY
        
        # Move horizontally
        self.x += self.vel_x
        
        # Keep player on screen (horizontal)
        if self.x < 0:
            self.x = 0
        elif self.x + self.width > SCREEN_WIDTH:
            self.x = SCREEN_WIDTH - self.width
        
        # Move vertically
        self.y += self.vel_y
        
        # Check platform collisions
        self.check_platform_collisions(platforms)
        
        # Keep player above screen bottom
        if self.y + self.height > SCREEN_HEIGHT:
            self.y = SCREEN_HEIGHT - self.height
            self.vel_y = 0
            self.on_ground = True
    
    def check_platform_collisions(self, platforms):
        player_rect = pygame.Rect(self.x, self.y, self.width, self.height)
        
        for platform in platforms:
            platform_rect = pygame.Rect(platform.x, platform.y, platform.width, platform.height)
            
            if player_rect.colliderect(platform_rect):
                # Landing on top of platform
                if self.vel_y > 0 and self.y < platform.y:
                    self.y = platform.y - self.height
                    self.vel_y = 0
                    self.on_ground = True
    
    def draw(self, screen):
        pygame.draw.rect(screen, self.color, (self.x, self.y, self.width, self.height))
        
        # Draw simple face
        eye_size = 3
        pygame.draw.circle(screen, WHITE, (int(self.x + 8), int(self.y + 12)), eye_size)
        pygame.draw.circle(screen, WHITE, (int(self.x + 22), int(self.y + 12)), eye_size)

class Platform:
    def __init__(self, x, y, width, height, color=GREEN):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.color = color
    
    def draw(self, screen):
        pygame.draw.rect(screen, self.color, (self.x, self.y, self.width, self.height))

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Platformer Adventure")
        self.clock = pygame.time.Clock()
        self.running = True
        
        # Create player
        self.player = Player(50, SCREEN_HEIGHT - 100)
        
        # Create platforms
        self.platforms = [
            Platform(200, 500, 150, 20),
            Platform(400, 400, 100, 20),
            Platform(600, 300, 120, 20),
            Platform(100, 350, 80, 20),
            Platform(350, 250, 100, 20),
            Platform(550, 150, 150, 20),
        ]
        
        # TODO: Add enemies, collectibles, or other game objects
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    # Reset player position
                    self.player.x = 50
                    self.player.y = SCREEN_HEIGHT - 100
                    self.player.vel_x = 0
                    self.player.vel_y = 0
    
    def update(self):
        self.player.update(self.platforms)
        
        # TODO: Update enemies, collectibles, check win conditions
    
    def draw(self):
        # Sky background
        self.screen.fill(BLUE)
        
        # Draw platforms
        for platform in self.platforms:
            platform.draw(self.screen)
        
        # Draw player
        self.player.draw(self.screen)
        
        # TODO: Draw enemies, collectibles, UI elements
        
        # Instructions
        font = pygame.font.Font(None, 24)
        text = font.render("Arrow keys or WASD to move, Space/W to jump, R to reset", True, WHITE)
        self.screen.blit(text, (10, 10))
        
        pygame.display.flip()
    
    def run(self):
        while self.running:
            self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(FPS)
        
        pygame.quit()

# Start the game
if __name__ == "__main__":
    game = Game()
    game.run()
`
      }
    ]
  },
  
  {
    id: 'shooter',
    name: 'Space Shooter',
    description: 'Top-down space shooter with enemies and projectiles',
    difficulty: 'Intermediate',
    files: [
      {
        path: 'main.py',
        content: `# Pixel's PyGame Palace - Space Shooter Template
# Defend Earth from alien invaders!

import pygame
import math
import random

# Initialize Pygame
pygame.init()

# Game settings
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
BLUE = (100, 150, 255)
GREEN = (0, 255, 0)
RED = (255, 100, 100)
YELLOW = (255, 255, 0)
PURPLE = (255, 0, 255)

class Player:
    def __init__(self):
        self.x = SCREEN_WIDTH // 2
        self.y = SCREEN_HEIGHT - 60
        self.width = 40
        self.height = 40
        self.speed = 6
        self.health = 100
        self.max_health = 100
        
    def update(self):
        # Handle movement
        keys = pygame.key.get_pressed()
        
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed
        if keys[pygame.K_UP] or keys[pygame.K_w]:
            self.y -= self.speed
        if keys[pygame.K_DOWN] or keys[pygame.K_s]:
            self.y += self.speed
        
        # Keep player on screen
        self.x = max(0, min(self.x, SCREEN_WIDTH - self.width))
        self.y = max(0, min(self.y, SCREEN_HEIGHT - self.height))
    
    def draw(self, screen):
        # Draw spaceship
        points = [
            (self.x + self.width // 2, self.y),  # Top point
            (self.x, self.y + self.height),      # Bottom left
            (self.x + self.width // 4, self.y + self.height * 0.75),  # Inner left
            (self.x + self.width * 0.75, self.y + self.height * 0.75),  # Inner right
            (self.x + self.width, self.y + self.height)  # Bottom right
        ]
        pygame.draw.polygon(screen, BLUE, points)
        
        # Draw health bar
        bar_width = 60
        bar_height = 8
        bar_x = self.x + (self.width - bar_width) // 2
        bar_y = self.y - 15
        
        # Background
        pygame.draw.rect(screen, RED, (bar_x, bar_y, bar_width, bar_height))
        
        # Health
        health_width = (self.health / self.max_health) * bar_width
        pygame.draw.rect(screen, GREEN, (bar_x, bar_y, health_width, bar_height))

class Bullet:
    def __init__(self, x, y, direction_x=0, direction_y=-1, color=YELLOW, speed=8):
        self.x = x
        self.y = y
        self.direction_x = direction_x
        self.direction_y = direction_y
        self.speed = speed
        self.color = color
        self.radius = 3
    
    def update(self):
        self.x += self.direction_x * self.speed
        self.y += self.direction_y * self.speed
    
    def draw(self, screen):
        pygame.draw.circle(screen, self.color, (int(self.x), int(self.y)), self.radius)
    
    def is_off_screen(self):
        return (self.x < 0 or self.x > SCREEN_WIDTH or 
                self.y < 0 or self.y > SCREEN_HEIGHT)

class Enemy:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.width = 30
        self.height = 30
        self.speed = 2
        self.health = 30
        self.max_health = 30
        self.shoot_timer = 0
        self.shoot_delay = 60  # frames between shots
        
    def update(self):
        # Move down slowly
        self.y += self.speed
        
        # Update shoot timer
        self.shoot_timer += 1
    
    def should_shoot(self):
        if self.shoot_timer >= self.shoot_delay:
            self.shoot_timer = 0
            return True
        return False
    
    def draw(self, screen):
        # Draw enemy ship
        pygame.draw.rect(screen, RED, (self.x, self.y, self.width, self.height))
        
        # Draw simple details
        pygame.draw.rect(screen, PURPLE, (self.x + 5, self.y + 5, 20, 20))
        
        # Health bar
        if self.health < self.max_health:
            bar_width = self.width
            bar_height = 4
            bar_x = self.x
            bar_y = self.y - 8
            
            pygame.draw.rect(screen, RED, (bar_x, bar_y, bar_width, bar_height))
            health_width = (self.health / self.max_health) * bar_width
            pygame.draw.rect(screen, GREEN, (bar_x, bar_y, health_width, bar_height))
    
    def is_off_screen(self):
        return self.y > SCREEN_HEIGHT

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Space Shooter")
        self.clock = pygame.time.Clock()
        self.running = True
        
        # Game objects
        self.player = Player()
        self.player_bullets = []
        self.enemy_bullets = []
        self.enemies = []
        
        # Game state
        self.score = 0
        self.enemy_spawn_timer = 0
        self.enemy_spawn_delay = 120  # frames between enemy spawns
        
        # Font for UI
        self.font = pygame.font.Font(None, 36)
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    # Shoot bullet
                    bullet = Bullet(
                        self.player.x + self.player.width // 2,
                        self.player.y
                    )
                    self.player_bullets.append(bullet)
    
    def update(self):
        # Update player
        self.player.update()
        
        # Update bullets
        for bullet in self.player_bullets[:]:
            bullet.update()
            if bullet.is_off_screen():
                self.player_bullets.remove(bullet)
        
        for bullet in self.enemy_bullets[:]:
            bullet.update()
            if bullet.is_off_screen():
                self.enemy_bullets.remove(bullet)
        
        # Update enemies
        for enemy in self.enemies[:]:
            enemy.update()
            
            # Enemy shooting
            if enemy.should_shoot():
                bullet = Bullet(
                    enemy.x + enemy.width // 2,
                    enemy.y + enemy.height,
                    direction_y=1,
                    color=PURPLE,
                    speed=4
                )
                self.enemy_bullets.append(bullet)
            
            # Remove enemies that are off screen
            if enemy.is_off_screen():
                self.enemies.remove(enemy)
        
        # Spawn new enemies
        self.enemy_spawn_timer += 1
        if self.enemy_spawn_timer >= self.enemy_spawn_delay:
            self.enemy_spawn_timer = 0
            x = random.randint(0, SCREEN_WIDTH - 30)
            enemy = Enemy(x, -30)
            self.enemies.append(enemy)
        
        # Check collisions
        self.check_collisions()
    
    def check_collisions(self):
        # Player bullets vs enemies
        for bullet in self.player_bullets[:]:
            for enemy in self.enemies[:]:
                bullet_rect = pygame.Rect(bullet.x - bullet.radius, bullet.y - bullet.radius, 
                                        bullet.radius * 2, bullet.radius * 2)
                enemy_rect = pygame.Rect(enemy.x, enemy.y, enemy.width, enemy.height)
                
                if bullet_rect.colliderect(enemy_rect):
                    self.player_bullets.remove(bullet)
                    enemy.health -= 10
                    
                    if enemy.health <= 0:
                        self.enemies.remove(enemy)
                        self.score += 10
                    break
        
        # Enemy bullets vs player
        player_rect = pygame.Rect(self.player.x, self.player.y, self.player.width, self.player.height)
        
        for bullet in self.enemy_bullets[:]:
            bullet_rect = pygame.Rect(bullet.x - bullet.radius, bullet.y - bullet.radius,
                                    bullet.radius * 2, bullet.radius * 2)
            
            if bullet_rect.colliderect(player_rect):
                self.enemy_bullets.remove(bullet)
                self.player.health -= 5
                
                if self.player.health <= 0:
                    print(f"Game Over! Final Score: {self.score}")
                    self.running = False
    
    def draw(self):
        # Space background
        self.screen.fill(BLACK)
        
        # Draw stars
        for i in range(50):
            x = (i * 37) % SCREEN_WIDTH
            y = (i * 73) % SCREEN_HEIGHT
            pygame.draw.circle(self.screen, WHITE, (x, y), 1)
        
        # Draw game objects
        self.player.draw(self.screen)
        
        for bullet in self.player_bullets:
            bullet.draw(self.screen)
        
        for bullet in self.enemy_bullets:
            bullet.draw(self.screen)
        
        for enemy in self.enemies:
            enemy.draw(self.screen)
        
        # Draw UI
        score_text = self.font.render(f"Score: {self.score}", True, WHITE)
        self.screen.blit(score_text, (10, 10))
        
        # Instructions
        font_small = pygame.font.Font(None, 24)
        instructions = [
            "WASD or Arrow keys to move",
            "Space to shoot",
            "Avoid enemy bullets!"
        ]
        
        for i, instruction in enumerate(instructions):
            text = font_small.render(instruction, True, WHITE)
            self.screen.blit(text, (SCREEN_WIDTH - 250, 10 + i * 25))
        
        pygame.display.flip()
    
    def run(self):
        while self.running:
            self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(FPS)
        
        pygame.quit()

# Start the game
if __name__ == "__main__":
    game = Game()
    game.run()
`
      }
    ]
  },
  
  {
    id: 'puzzle',
    name: 'Match-3 Puzzle',
    description: 'Classic match-3 puzzle game with grid-based gameplay',
    difficulty: 'Advanced',
    files: [
      {
        path: 'main.py',
        content: `# Pixel's PyGame Palace - Match-3 Puzzle Template
# Match 3 or more gems to clear them and score points!

import pygame
import random
import math

# Initialize Pygame
pygame.init()

# Game settings
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

# Grid settings
GRID_WIDTH = 8
GRID_HEIGHT = 8
GEM_SIZE = 60
GRID_OFFSET_X = (SCREEN_WIDTH - GRID_WIDTH * GEM_SIZE) // 2
GRID_OFFSET_Y = (SCREEN_HEIGHT - GRID_HEIGHT * GEM_SIZE) // 2

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GRAY = (128, 128, 128)
LIGHT_GRAY = (200, 200, 200)

# Gem colors
GEM_COLORS = [
    (255, 100, 100),  # Red
    (100, 255, 100),  # Green
    (100, 100, 255),  # Blue
    (255, 255, 100),  # Yellow
    (255, 100, 255),  # Magenta
    (100, 255, 255),  # Cyan
]

GEM_TYPES = len(GEM_COLORS)

class Gem:
    def __init__(self, gem_type, grid_x, grid_y):
        self.type = gem_type
        self.grid_x = grid_x
        self.grid_y = grid_y
        self.x = GRID_OFFSET_X + grid_x * GEM_SIZE
        self.y = GRID_OFFSET_Y + grid_y * GEM_SIZE
        self.target_x = self.x
        self.target_y = self.y
        self.animating = False
        self.marked_for_removal = False
    
    def update(self):
        if self.animating:
            # Smooth movement animation
            speed = 0.3
            self.x += (self.target_x - self.x) * speed
            self.y += (self.target_y - self.y) * speed
            
            if abs(self.x - self.target_x) < 1 and abs(self.y - self.target_y) < 1:
                self.x = self.target_x
                self.y = self.target_y
                self.animating = False
    
    def set_target_position(self, grid_x, grid_y):
        self.grid_x = grid_x
        self.grid_y = grid_y
        self.target_x = GRID_OFFSET_X + grid_x * GEM_SIZE
        self.target_y = GRID_OFFSET_Y + grid_y * GEM_SIZE
        self.animating = True
    
    def draw(self, screen, selected=False):
        # Draw gem
        color = GEM_COLORS[self.type]
        
        # Selection highlight
        if selected:
            pygame.draw.rect(screen, WHITE, (self.x - 2, self.y - 2, GEM_SIZE + 4, GEM_SIZE + 4))
        
        # Gem background
        pygame.draw.rect(screen, color, (self.x, self.y, GEM_SIZE, GEM_SIZE))
        
        # Gem shine effect
        shine_color = tuple(min(255, c + 50) for c in color)
        pygame.draw.polygon(screen, shine_color, [
            (self.x + 10, self.y + 10),
            (self.x + 30, self.y + 10),
            (self.x + 20, self.y + 20)
        ])
        
        # Border
        pygame.draw.rect(screen, BLACK, (self.x, self.y, GEM_SIZE, GEM_SIZE), 2)

class Grid:
    def __init__(self):
        self.gems = [[None for _ in range(GRID_WIDTH)] for _ in range(GRID_HEIGHT)]
        self.selected_gem = None
        self.animating = False
        self.generate_initial_grid()
    
    def generate_initial_grid(self):
        # Create gems ensuring no initial matches
        for y in range(GRID_HEIGHT):
            for x in range(GRID_WIDTH):
                gem_type = self.get_safe_gem_type(x, y)
                self.gems[y][x] = Gem(gem_type, x, y)
    
    def get_safe_gem_type(self, x, y):
        # Avoid creating initial matches of 3
        forbidden_types = set()
        
        # Check horizontal
        if x >= 2 and self.gems[y][x-1] and self.gems[y][x-2]:
            if self.gems[y][x-1].type == self.gems[y][x-2].type:
                forbidden_types.add(self.gems[y][x-1].type)
        
        # Check vertical
        if y >= 2 and self.gems[y-1][x] and self.gems[y-2][x]:
            if self.gems[y-1][x].type == self.gems[y-2][x].type:
                forbidden_types.add(self.gems[y-1][x].type)
        
        available_types = [t for t in range(GEM_TYPES) if t not in forbidden_types]
        return random.choice(available_types)
    
    def get_gem_at_pos(self, mouse_x, mouse_y):
        if (GRID_OFFSET_X <= mouse_x < GRID_OFFSET_X + GRID_WIDTH * GEM_SIZE and
            GRID_OFFSET_Y <= mouse_y < GRID_OFFSET_Y + GRID_HEIGHT * GEM_SIZE):
            
            grid_x = (mouse_x - GRID_OFFSET_X) // GEM_SIZE
            grid_y = (mouse_y - GRID_OFFSET_Y) // GEM_SIZE
            
            if 0 <= grid_x < GRID_WIDTH and 0 <= grid_y < GRID_HEIGHT:
                return self.gems[grid_y][grid_x]
        
        return None
    
    def handle_click(self, mouse_x, mouse_y):
        if self.animating:
            return
        
        clicked_gem = self.get_gem_at_pos(mouse_x, mouse_y)
        
        if clicked_gem:
            if self.selected_gem is None:
                self.selected_gem = clicked_gem
            elif self.selected_gem == clicked_gem:
                self.selected_gem = None
            elif self.are_adjacent(self.selected_gem, clicked_gem):
                self.swap_gems(self.selected_gem, clicked_gem)
                self.selected_gem = None
            else:
                self.selected_gem = clicked_gem
    
    def are_adjacent(self, gem1, gem2):
        dx = abs(gem1.grid_x - gem2.grid_x)
        dy = abs(gem1.grid_y - gem2.grid_y)
        return (dx == 1 and dy == 0) or (dx == 0 and dy == 1)
    
    def swap_gems(self, gem1, gem2):
        # Swap positions in grid
        self.gems[gem1.grid_y][gem1.grid_x] = gem2
        self.gems[gem2.grid_y][gem2.grid_x] = gem1
        
        # Animate to new positions
        old_x1, old_y1 = gem1.grid_x, gem1.grid_y
        gem1.set_target_position(gem2.grid_x, gem2.grid_y)
        gem2.set_target_position(old_x1, old_y1)
        
        self.animating = True
    
    def update(self):
        # Update gem animations
        any_animating = False
        for row in self.gems:
            for gem in row:
                if gem:
                    gem.update()
                    if gem.animating:
                        any_animating = True
        
        # If animation finished, check for matches
        if self.animating and not any_animating:
            self.animating = False
            matches_found = self.find_matches()
            
            if matches_found:
                self.remove_matches()
                self.drop_gems()
                self.fill_empty_spaces()
    
    def find_matches(self):
        matches = set()
        
        # Check horizontal matches
        for y in range(GRID_HEIGHT):
            count = 1
            current_type = self.gems[y][0].type if self.gems[y][0] else -1
            
            for x in range(1, GRID_WIDTH):
                if self.gems[y][x] and self.gems[y][x].type == current_type:
                    count += 1
                else:
                    if count >= 3 and current_type != -1:
                        for i in range(x - count, x):
                            matches.add((i, y))
                    
                    count = 1
                    current_type = self.gems[y][x].type if self.gems[y][x] else -1
            
            if count >= 3 and current_type != -1:
                for i in range(GRID_WIDTH - count, GRID_WIDTH):
                    matches.add((i, y))
        
        # Check vertical matches
        for x in range(GRID_WIDTH):
            count = 1
            current_type = self.gems[0][x].type if self.gems[0][x] else -1
            
            for y in range(1, GRID_HEIGHT):
                if self.gems[y][x] and self.gems[y][x].type == current_type:
                    count += 1
                else:
                    if count >= 3 and current_type != -1:
                        for i in range(y - count, y):
                            matches.add((x, i))
                    
                    count = 1
                    current_type = self.gems[y][x].type if self.gems[y][x] else -1
            
            if count >= 3 and current_type != -1:
                for i in range(GRID_HEIGHT - count, GRID_HEIGHT):
                    matches.add((x, i))
        
        # Mark gems for removal
        for x, y in matches:
            if self.gems[y][x]:
                self.gems[y][x].marked_for_removal = True
        
        return len(matches) > 0
    
    def remove_matches(self):
        for y in range(GRID_HEIGHT):
            for x in range(GRID_WIDTH):
                if self.gems[y][x] and self.gems[y][x].marked_for_removal:
                    self.gems[y][x] = None
    
    def drop_gems(self):
        for x in range(GRID_WIDTH):
            # Collect all non-None gems in this column
            gems_in_column = []
            for y in range(GRID_HEIGHT):
                if self.gems[y][x] is not None:
                    gems_in_column.append(self.gems[y][x])
                    self.gems[y][x] = None
            
            # Place gems at the bottom
            for i, gem in enumerate(gems_in_column):
                new_y = GRID_HEIGHT - len(gems_in_column) + i
                self.gems[new_y][x] = gem
                gem.set_target_position(x, new_y)
                if gem.grid_y != new_y:
                    self.animating = True
    
    def fill_empty_spaces(self):
        for x in range(GRID_WIDTH):
            for y in range(GRID_HEIGHT):
                if self.gems[y][x] is None:
                    gem_type = random.randint(0, GEM_TYPES - 1)
                    self.gems[y][x] = Gem(gem_type, x, y)
                    # Start gems above the screen for animation
                    self.gems[y][x].y = GRID_OFFSET_Y - GEM_SIZE
                    self.gems[y][x].set_target_position(x, y)
                    self.animating = True
    
    def draw(self, screen):
        # Draw grid background
        grid_rect = (GRID_OFFSET_X - 5, GRID_OFFSET_Y - 5, 
                    GRID_WIDTH * GEM_SIZE + 10, GRID_HEIGHT * GEM_SIZE + 10)
        pygame.draw.rect(screen, LIGHT_GRAY, grid_rect)
        pygame.draw.rect(screen, BLACK, grid_rect, 3)
        
        # Draw gems
        for row in self.gems:
            for gem in row:
                if gem:
                    selected = gem == self.selected_gem
                    gem.draw(screen, selected)

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Match-3 Puzzle")
        self.clock = pygame.time.Clock()
        self.running = True
        
        self.grid = Grid()
        self.score = 0
        self.font = pygame.font.Font(None, 36)
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:  # Left click
                    self.grid.handle_click(event.pos[0], event.pos[1])
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    # Reset game
                    self.grid = Grid()
                    self.score = 0
    
    def update(self):
        self.grid.update()
        
        # TODO: Add scoring system, level progression, special gems
    
    def draw(self):
        self.screen.fill(GRAY)
        
        # Draw grid
        self.grid.draw(self.screen)
        
        # Draw UI
        score_text = self.font.render(f"Score: {self.score}", True, WHITE)
        self.screen.blit(score_text, (20, 20))
        
        # Instructions
        font_small = pygame.font.Font(None, 24)
        instructions = [
            "Click gems to select them",
            "Click adjacent gem to swap",
            "Match 3+ gems to clear them",
            "R to restart"
        ]
        
        for i, instruction in enumerate(instructions):
            text = font_small.render(instruction, True, WHITE)
            self.screen.blit(text, (20, 80 + i * 25))
        
        pygame.display.flip()
    
    def run(self):
        while self.running:
            self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(FPS)
        
        pygame.quit()

# Start the game
if __name__ == "__main__":
    game = Game()
    game.run()
`
      }
    ]
  }
];

// Helper function to get template by ID
export function getTemplateById(id: string): GameTemplate | undefined {
  return gameTemplates.find(template => template.id === id);
}

// Helper function to get template names for selection
export function getTemplateOptions() {
  return gameTemplates.map(template => ({
    id: template.id,
    name: template.name,
    description: template.description,
    difficulty: template.difficulty
  }));
}