// PyGame Simple Platformer Template
import { GameTemplate } from './pygame-template-types';

export const platformerTemplate: GameTemplate = {
  id: 'simple-platformer',
  name: 'Simple Platformer',
  description: 'A basic platform game with jumping, gravity, and a goal',
  wizardDescription: 'Create a fun jumping game where you hop across platforms to reach the goal! Perfect for beginners who want to learn about gravity and collision detection.',
  difficulty: 'beginner',
  settings: {
    screenWidth: 800,
    screenHeight: 600,
    backgroundColor: '#87CEEB',
    fps: 60,
    title: 'My Platform Adventure'
  },
  components: [
    {
      type: 'sprite',
      id: 'player',
      properties: {
        x: 50,
        y: 400,
        velocityX: 0,
        velocityY: 0,
        width: 40,
        height: 40,
        color: '#4F46E5'
      }
    },
    {
      type: 'platform',
      id: 'ground',
      properties: {
        x: 0,
        y: 500,
        width: 800,
        height: 100,
        color: '#10B981'
      }
    },
    {
      type: 'platform',
      id: 'platform1',
      properties: {
        x: 200,
        y: 400,
        width: 100,
        height: 20,
        color: '#10B981'
      }
    },
    {
      type: 'platform',
      id: 'platform2',
      properties: {
        x: 400,
        y: 320,
        width: 100,
        height: 20,
        color: '#10B981'
      }
    },
    {
      type: 'platform',
      id: 'platform3',
      properties: {
        x: 600,
        y: 240,
        width: 100,
        height: 20,
        color: '#10B981'
      }
    },
    {
      type: 'collectible',
      id: 'goal',
      properties: {
        x: 640,
        y: 200,
        type: 'key',
        value: 100,
        size: 30,
        color: '#FBBF24'
      }
    },
    {
      type: 'scoreText',
      id: 'instructions',
      properties: {
        text: 'Use Arrow Keys to Move and Space to Jump!',
        x: 200,
        y: 50,
        fontSize: 20,
        color: '#000000'
      }
    }
  ],
  preview: (ctx: CanvasRenderingContext2D) => {
    // Draw simplified platformer preview
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Ground
    ctx.fillStyle = '#10B981';
    ctx.fillRect(0, 400, ctx.canvas.width, 200);
    
    // Platforms
    ctx.fillRect(150, 350, 80, 15);
    ctx.fillRect(300, 300, 80, 15);
    ctx.fillRect(450, 250, 80, 15);
    
    // Player
    ctx.fillStyle = '#4F46E5';
    ctx.fillRect(50, 365, 30, 30);
    
    // Goal
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(490, 230, 15, 0, Math.PI * 2);
    ctx.fill();
  },
  generateCode: () => `import pygame
import sys

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
BLUE = (79, 70, 229)
GREEN = (16, 185, 129)
YELLOW = (251, 191, 36)
SKY_BLUE = (135, 206, 235)

# Create the screen
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('My Platform Adventure')
clock = pygame.time.Clock()

class Player:
    def __init__(self):
        self.x = 50
        self.y = 400
        self.width = 40
        self.height = 40
        self.velocity_x = 0
        self.velocity_y = 0
        self.on_ground = False
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
    
    def update(self, platforms):
        # Apply gravity
        if not self.on_ground:
            self.velocity_y += GRAVITY
        
        # Move horizontally
        self.x += self.velocity_x
        self.rect.x = self.x
        
        # Check horizontal collisions
        for platform in platforms:
            if self.rect.colliderect(platform.rect):
                if self.velocity_x > 0:
                    self.rect.right = platform.rect.left
                    self.x = self.rect.x
                elif self.velocity_x < 0:
                    self.rect.left = platform.rect.right
                    self.x = self.rect.x
        
        # Move vertically
        self.y += self.velocity_y
        self.rect.y = self.y
        
        # Check vertical collisions
        self.on_ground = False
        for platform in platforms:
            if self.rect.colliderect(platform.rect):
                if self.velocity_y > 0:
                    self.rect.bottom = platform.rect.top
                    self.y = self.rect.y
                    self.velocity_y = 0
                    self.on_ground = True
                elif self.velocity_y < 0:
                    self.rect.top = platform.rect.bottom
                    self.y = self.rect.y
                    self.velocity_y = 0
    
    def jump(self):
        if self.on_ground:
            self.velocity_y = JUMP_STRENGTH
    
    def draw(self, screen):
        pygame.draw.rect(screen, BLUE, self.rect)

class Platform:
    def __init__(self, x, y, width, height):
        self.rect = pygame.Rect(x, y, width, height)
    
    def draw(self, screen):
        pygame.draw.rect(screen, GREEN, self.rect)

class Goal:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.size = 30
        self.rect = pygame.Rect(x - self.size//2, y - self.size//2, self.size, self.size)
        self.collected = False
    
    def check_collision(self, player):
        if not self.collected and self.rect.colliderect(player.rect):
            self.collected = True
            return True
        return False
    
    def draw(self, screen):
        if not self.collected:
            pygame.draw.circle(screen, YELLOW, (self.x, self.y), self.size//2)

# Create game objects
player = Player()
platforms = [
    Platform(0, 500, 800, 100),  # Ground
    Platform(200, 400, 100, 20),  # Platform 1
    Platform(400, 320, 100, 20),  # Platform 2
    Platform(600, 240, 100, 20)   # Platform 3
]
goal = Goal(640, 200)

# Game state
running = True
game_won = False
font = pygame.font.Font(None, 36)

# Main game loop
while running:
    # Handle events
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE:
                player.jump()
    
    # Handle continuous input
    keys = pygame.key.get_pressed()
    player.velocity_x = 0
    if keys[pygame.K_LEFT]:
        player.velocity_x = -5
    if keys[pygame.K_RIGHT]:
        player.velocity_x = 5
    
    # Update
    if not game_won:
        player.update(platforms)
        if goal.check_collision(player):
            game_won = True
    
    # Draw
    screen.fill(SKY_BLUE)
    
    # Draw platforms
    for platform in platforms:
        platform.draw(screen)
    
    # Draw goal
    goal.draw(screen)
    
    # Draw player
    player.draw(screen)
    
    # Draw instructions
    if not game_won:
        text = font.render('Use Arrow Keys to Move and Space to Jump!', True, BLACK)
        screen.blit(text, (100, 50))
    else:
        text = font.render('You Win! Great Job!', True, WHITE)
        screen.blit(text, (250, 250))
    
    # Update display
    pygame.display.flip()
    clock.tick(FPS)

# Quit
pygame.quit()
sys.exit()`
};