// PyGame Collecting Game Template
import { GameTemplate } from './pygame-template-types';
import { drawStar } from './pygame-component-types';

export const collectingTemplate: GameTemplate = {
  id: 'collecting-game',
  name: 'Coin Collector',
  description: 'Collect items while avoiding obstacles in a timed challenge',
  wizardDescription: 'Race against time to collect all the coins while dodging dangerous obstacles! Features power-ups, lives system, and increasing difficulty. Learn about collision detection and game progression!',
  difficulty: 'beginner',
  settings: {
    screenWidth: 800,
    screenHeight: 600,
    backgroundColor: '#2D5016',
    fps: 60,
    title: 'Coin Collector'
  },
  components: [
    {
      type: 'sprite',
      id: 'player',
      properties: {
        x: 400,
        y: 300,
        width: 30,
        height: 30,
        velocityX: 0,
        velocityY: 0,
        color: '#4169E1'
      }
    },
    {
      type: 'collectible',
      id: 'coin',
      properties: {
        x: 200,
        y: 200,
        type: 'coin',
        value: 10,
        size: 20,
        color: '#FFD700',
        respawns: true
      }
    },
    {
      type: 'enemy',
      id: 'obstacle',
      properties: {
        x: 600,
        y: 400,
        patternType: 'random',
        speed: 2,
        width: 30,
        height: 30,
        color: '#8B0000'
      }
    },
    {
      type: 'scoreText',
      id: 'score',
      properties: {
        text: 'Score: 0',
        x: 10,
        y: 10,
        fontSize: 24,
        color: '#FFFFFF'
      }
    },
    {
      type: 'timer',
      id: 'timer',
      properties: {
        duration: 60000,
        x: 350,
        y: 10,
        onComplete: 'game_over',
        countDown: true,
        fontSize: 24,
        color: '#FFFFFF'
      }
    },
    {
      type: 'healthBar',
      id: 'lives',
      properties: {
        x: 10,
        y: 40,
        current: 3,
        max: 3,
        width: 150,
        height: 20,
        color: '#FF0000',
        backgroundColor: '#333333',
        showText: true
      }
    }
  ],
  preview: (ctx: CanvasRenderingContext2D) => {
    // Green background
    ctx.fillStyle = '#2D5016';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Player
    ctx.fillStyle = '#4169E1';
    ctx.beginPath();
    ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Coins
    ctx.fillStyle = '#FFD700';
    const coinPositions = [[150, 150], [450, 200], [300, 350], [550, 300]];
    coinPositions.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Obstacles
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(200, 250, 30, 30);
    ctx.fillRect(500, 150, 30, 30);
    
    // Power-up
    ctx.fillStyle = '#FF69B4';
    drawStar(ctx, 400, 100, 12, 5);
  },
  generateCode: () => `import pygame
import sys
import random
import math

# Initialize Pygame
pygame.init()

# Game settings
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60
PLAYER_SPEED = 5

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
BLUE = (65, 105, 225)
GOLD = (255, 215, 0)
DARK_RED = (139, 0, 0)
GREEN_BG = (45, 80, 22)
PINK = (255, 105, 180)

# Create the screen
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('Coin Collector')
clock = pygame.time.Clock()

class Player:
    def __init__(self):
        self.x = SCREEN_WIDTH // 2
        self.y = SCREEN_HEIGHT // 2
        self.radius = 15
        self.speed = PLAYER_SPEED
        self.rect = pygame.Rect(self.x - self.radius, self.y - self.radius, 
                               self.radius * 2, self.radius * 2)
        self.lives = 3
        self.invulnerable_time = 0
    
    def update(self, keys):
        # Movement
        dx = dy = 0
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            dx = -self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            dx = self.speed
        if keys[pygame.K_UP] or keys[pygame.K_w]:
            dy = -self.speed
        if keys[pygame.K_DOWN] or keys[pygame.K_s]:
            dy = self.speed
        
        # Normalize diagonal movement
        if dx != 0 and dy != 0:
            dx *= 0.707
            dy *= 0.707
        
        # Update position
        self.x += dx
        self.y += dy
        
        # Keep on screen
        self.x = max(self.radius, min(SCREEN_WIDTH - self.radius, self.x))
        self.y = max(self.radius, min(SCREEN_HEIGHT - self.radius, self.y))
        
        # Update rect
        self.rect.center = (self.x, self.y)
        
        # Update invulnerability
        if self.invulnerable_time > 0:
            self.invulnerable_time -= 1
    
    def take_damage(self):
        if self.invulnerable_time == 0:
            self.lives -= 1
            self.invulnerable_time = 120  # 2 seconds at 60 FPS
            return self.lives <= 0
        return False
    
    def draw(self, screen):
        # Flash when invulnerable
        if self.invulnerable_time % 10 < 5:
            pygame.draw.circle(screen, BLUE, (int(self.x), int(self.y)), self.radius)
            # Draw face
            pygame.draw.circle(screen, WHITE, (int(self.x - 5), int(self.y - 3)), 3)
            pygame.draw.circle(screen, WHITE, (int(self.x + 5), int(self.y - 3)), 3)

class Collectible:
    def __init__(self, type='coin'):
        self.type = type
        self.respawn()
    
    def respawn(self):
        self.x = random.randint(30, SCREEN_WIDTH - 30)
        self.y = random.randint(30, SCREEN_HEIGHT - 30)
        self.radius = 10 if self.type == 'coin' else 15
        self.value = 10 if self.type == 'coin' else 50
        self.collected = False
        self.rect = pygame.Rect(self.x - self.radius, self.y - self.radius,
                               self.radius * 2, self.radius * 2)
        self.animation_angle = random.uniform(0, math.pi * 2)
    
    def update(self):
        # Animate collectibles
        self.animation_angle += 0.05
        if self.collected:
            self.respawn()
    
    def collect(self, player):
        if self.rect.colliderect(player.rect):
            self.collected = True
            return self.value
        return 0
    
    def draw(self, screen):
        if self.type == 'coin':
            # Draw coin
            y_offset = math.sin(self.animation_angle) * 3
            pygame.draw.circle(screen, GOLD, 
                             (int(self.x), int(self.y + y_offset)), self.radius)
            pygame.draw.circle(screen, (255, 255, 200), 
                             (int(self.x - 3), int(self.y + y_offset - 3)), 4)
        else:
            # Draw power-up star
            angle_offset = self.animation_angle
            points = []
            for i in range(10):
                angle = angle_offset + (math.pi * 2 * i / 10)
                r = self.radius if i % 2 == 0 else self.radius * 0.5
                px = self.x + math.cos(angle) * r
                py = self.y + math.sin(angle) * r
                points.append((px, py))
            pygame.draw.polygon(screen, PINK, points)

class Obstacle:
    def __init__(self):
        self.respawn()
    
    def respawn(self):
        self.x = random.randint(50, SCREEN_WIDTH - 50)
        self.y = random.randint(50, SCREEN_HEIGHT - 50)
        self.radius = 20
        self.speed = random.uniform(1, 3)
        self.direction = random.uniform(0, math.pi * 2)
        self.rect = pygame.Rect(self.x - self.radius, self.y - self.radius,
                               self.radius * 2, self.radius * 2)
        self.color_pulse = 0
    
    def update(self):
        # Move in current direction
        self.x += math.cos(self.direction) * self.speed
        self.y += math.sin(self.direction) * self.speed
        
        # Bounce off walls
        if self.x - self.radius <= 0 or self.x + self.radius >= SCREEN_WIDTH:
            self.direction = math.pi - self.direction
        if self.y - self.radius <= 0 or self.y + self.radius >= SCREEN_HEIGHT:
            self.direction = -self.direction
        
        # Keep on screen
        self.x = max(self.radius, min(SCREEN_WIDTH - self.radius, self.x))
        self.y = max(self.radius, min(SCREEN_HEIGHT - self.radius, self.y))
        
        # Random direction change
        if random.random() < 0.02:
            self.direction += random.uniform(-math.pi/4, math.pi/4)
        
        # Update rect
        self.rect.center = (int(self.x), int(self.y))
        
        # Pulse animation
        self.color_pulse += 0.1
    
    def check_collision(self, player):
        return self.rect.colliderect(player.rect)
    
    def draw(self, screen):
        # Draw with pulsing effect
        pulse = abs(math.sin(self.color_pulse)) * 50
        color = (min(255, 139 + pulse), 0, 0)
        pygame.draw.circle(screen, color, (int(self.x), int(self.y)), self.radius)
        # Draw spikes
        for angle in range(0, 360, 45):
            rad = math.radians(angle)
            x1 = self.x + math.cos(rad) * (self.radius - 5)
            y1 = self.y + math.sin(rad) * (self.radius - 5)
            x2 = self.x + math.cos(rad) * (self.radius + 5)
            y2 = self.y + math.sin(rad) * (self.radius + 5)
            pygame.draw.line(screen, color, (x1, y1), (x2, y2), 3)

# Create game objects
player = Player()
coins = [Collectible('coin') for _ in range(5)]
powerups = [Collectible('powerup')]
obstacles = [Obstacle() for _ in range(3)]

# Game state
score = 0
time_left = 60000  # 60 seconds in milliseconds
game_over = False
game_won = False
font = pygame.font.Font(None, 36)
font_small = pygame.font.Font(None, 24)

# Main game loop
running = True
clock_tick = 0
while running:
    dt = clock.tick(FPS)
    clock_tick += dt
    
    # Handle events
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_r and (game_over or game_won):
                # Reset game
                player = Player()
                coins = [Collectible('coin') for _ in range(5)]
                powerups = [Collectible('powerup')]
                obstacles = [Obstacle() for _ in range(3)]
                score = 0
                time_left = 60000
                game_over = False
                game_won = False
    
    if not game_over and not game_won:
        # Handle input
        keys = pygame.key.get_pressed()
        player.update(keys)
        
        # Update timer
        time_left -= dt
        if time_left <= 0:
            game_over = True
        
        # Update collectibles
        for coin in coins:
            coin.update()
            score += coin.collect(player)
        
        for powerup in powerups:
            powerup.update()
            bonus = powerup.collect(player)
            if bonus > 0:
                score += bonus
                # Add extra time for powerup
                time_left = min(60000, time_left + 5000)
        
        # Update obstacles
        for obstacle in obstacles:
            obstacle.update()
            if obstacle.check_collision(player):
                if player.take_damage():
                    game_over = True
        
        # Check win condition
        if score >= 500:
            game_won = True
        
        # Increase difficulty over time
        if clock_tick > 10000 and len(obstacles) < 5:
            obstacles.append(Obstacle())
            clock_tick = 0
    
    # Draw
    screen.fill(GREEN_BG)
    
    # Draw game objects
    player.draw(screen)
    for coin in coins:
        coin.draw(screen)
    for powerup in powerups:
        powerup.draw(screen)
    for obstacle in obstacles:
        obstacle.draw(screen)
    
    # Draw HUD
    score_text = font.render(f'Score: {score}', True, WHITE)
    screen.blit(score_text, (10, 10))
    
    time_text = font.render(f'Time: {int(time_left/1000)}s', True, WHITE)
    screen.blit(time_text, (SCREEN_WIDTH//2 - 50, 10))
    
    lives_text = font.render(f'Lives: {player.lives}', True, WHITE)
    screen.blit(lives_text, (SCREEN_WIDTH - 120, 10))
    
    # Draw instructions
    if not game_over and not game_won:
        instructions = font_small.render('Arrow Keys/WASD: Move | Collect coins, avoid obstacles!', True, WHITE)
        screen.blit(instructions, (SCREEN_WIDTH//2 - 250, SCREEN_HEIGHT - 30))
    
    # Draw game state messages
    if game_over:
        game_over_text = font.render('GAME OVER', True, DARK_RED)
        final_score_text = font.render(f'Final Score: {score}', True, WHITE)
        restart_text = font_small.render('Press R to Play Again', True, WHITE)
        
        screen.blit(game_over_text, (SCREEN_WIDTH//2 - 100, SCREEN_HEIGHT//2 - 60))
        screen.blit(final_score_text, (SCREEN_WIDTH//2 - 100, SCREEN_HEIGHT//2))
        screen.blit(restart_text, (SCREEN_WIDTH//2 - 110, SCREEN_HEIGHT//2 + 40))
    elif game_won:
        win_text = font.render('YOU WIN!', True, GOLD)
        final_score_text = font.render(f'Final Score: {score}', True, WHITE)
        restart_text = font_small.render('Press R to Play Again', True, WHITE)
        
        screen.blit(win_text, (SCREEN_WIDTH//2 - 80, SCREEN_HEIGHT//2 - 60))
        screen.blit(final_score_text, (SCREEN_WIDTH//2 - 100, SCREEN_HEIGHT//2))
        screen.blit(restart_text, (SCREEN_WIDTH//2 - 110, SCREEN_HEIGHT//2 + 40))
    
    # Update display
    pygame.display.flip()

# Quit
pygame.quit()
sys.exit()`
};