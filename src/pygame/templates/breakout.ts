// PyGame Breakout Template
import { GameTemplate } from './pygame-template-types';

export const breakoutTemplate: GameTemplate = {
  id: 'breakout',
  name: 'Breakout',
  description: 'Classic brick-breaking game with paddle and ball',
  wizardDescription: 'Break all the bricks with a bouncing ball! Move your paddle to keep the ball in play. A classic game that teaches collision detection and game physics.',
  difficulty: 'intermediate',
  settings: {
    screenWidth: 800,
    screenHeight: 600,
    backgroundColor: '#1a1a1a',
    fps: 60,
    title: 'Breakout Game'
  },
  components: [
    {
      type: 'paddle',
      id: 'paddle',
      properties: {
        x: 350,
        y: 550,
        width: 100,
        height: 15,
        speed: 10,
        color: '#00FF00',
        playerControlled: true,
        controls: 'arrows'
      }
    },
    {
      type: 'ball',
      id: 'ball',
      properties: {
        x: 400,
        y: 400,
        radius: 8,
        velocityX: 4,
        velocityY: -4,
        color: '#FFFFFF',
        gravity: 0,
        bounciness: 1
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
    }
  ],
  preview: (ctx: CanvasRenderingContext2D) => {
    // Dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Bricks
    const brickColors = ['#FF0000', '#FFA500', '#FFFF00', '#00FF00', '#0000FF'];
    for (let row = 0; row < 5; row++) {
      ctx.fillStyle = brickColors[row];
      for (let col = 0; col < 8; col++) {
        const x = col * 70 + 60;
        const y = row * 25 + 60;
        ctx.fillRect(x, y, 65, 20);
      }
    }
    
    // Paddle
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(ctx.canvas.width / 2 - 40, 380, 80, 12);
    
    // Ball
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ctx.canvas.width / 2, 350, 6, 0, Math.PI * 2);
    ctx.fill();
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

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)
ORANGE = (255, 165, 0)
YELLOW = (255, 255, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)
DARK_GRAY = (26, 26, 26)

# Brick settings
BRICK_ROWS = 5
BRICK_COLS = 10
BRICK_WIDTH = 70
BRICK_HEIGHT = 20
BRICK_COLORS = [RED, ORANGE, YELLOW, GREEN, BLUE]

# Create the screen
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('Breakout Game')
clock = pygame.time.Clock()

class Paddle:
    def __init__(self):
        self.width = 100
        self.height = 15
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - 50
        self.speed = 10
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
    
    def update(self, keys):
        if keys[pygame.K_LEFT] and self.rect.left > 0:
            self.rect.x -= self.speed
        if keys[pygame.K_RIGHT] and self.rect.right < SCREEN_WIDTH:
            self.rect.x += self.speed
    
    def draw(self, screen):
        pygame.draw.rect(screen, GREEN, self.rect)
        # Add highlight
        pygame.draw.rect(screen, WHITE, (self.rect.x, self.rect.y, self.rect.width, 3))

class Ball:
    def __init__(self):
        self.radius = 8
        self.reset()
    
    def reset(self):
        self.x = SCREEN_WIDTH // 2
        self.y = SCREEN_HEIGHT // 2
        self.velocity_x = random.choice([-4, 4])
        self.velocity_y = -4
        self.speed_increase = 1.05
        self.max_speed = 12
    
    def update(self, paddle):
        # Move ball
        self.x += self.velocity_x
        self.y += self.velocity_y
        
        # Bounce off walls
        if self.x - self.radius <= 0 or self.x + self.radius >= SCREEN_WIDTH:
            self.velocity_x *= -1
        if self.y - self.radius <= 0:
            self.velocity_y *= -1
        
        # Check paddle collision
        ball_rect = pygame.Rect(self.x - self.radius, self.y - self.radius, 
                               self.radius * 2, self.radius * 2)
        if ball_rect.colliderect(paddle.rect) and self.velocity_y > 0:
            self.velocity_y *= -1
            
            # Add spin based on where ball hits paddle
            hit_pos = (self.x - paddle.rect.centerx) / (paddle.width / 2)
            self.velocity_x = 8 * hit_pos
            
            # Limit speed
            self.velocity_x = max(-self.max_speed, min(self.max_speed, self.velocity_x))
            self.velocity_y = max(-self.max_speed, min(self.max_speed, self.velocity_y))
        
        # Check if ball is lost
        return self.y - self.radius > SCREEN_HEIGHT
    
    def check_brick_collision(self, brick):
        ball_rect = pygame.Rect(self.x - self.radius, self.y - self.radius, 
                               self.radius * 2, self.radius * 2)
        if ball_rect.colliderect(brick.rect):
            # Determine which side was hit
            ball_center_x = self.x
            ball_center_y = self.y
            brick_center_x = brick.rect.centerx
            brick_center_y = brick.rect.centery
            
            dx = abs(ball_center_x - brick_center_x)
            dy = abs(ball_center_y - brick_center_y)
            
            if dx / brick.rect.width > dy / brick.rect.height:
                self.velocity_x *= -1
            else:
                self.velocity_y *= -1
            
            return True
        return False
    
    def draw(self, screen):
        pygame.draw.circle(screen, WHITE, (int(self.x), int(self.y)), self.radius)
        # Add shine effect
        pygame.draw.circle(screen, (200, 200, 200), 
                         (int(self.x - 3), int(self.y - 3)), 3)

class Brick:
    def __init__(self, x, y, row):
        self.rect = pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT)
        self.color = BRICK_COLORS[row % len(BRICK_COLORS)]
        self.points = (len(BRICK_COLORS) - row) * 10
    
    def draw(self, screen):
        pygame.draw.rect(screen, self.color, self.rect)
        # Add highlight
        pygame.draw.rect(screen, (255, 255, 255, 50), 
                        (self.rect.x, self.rect.y, self.rect.width, 4))

# Create game objects
paddle = Paddle()
ball = Ball()
bricks = []

# Create bricks
for row in range(BRICK_ROWS):
    for col in range(BRICK_COLS):
        x = col * (BRICK_WIDTH + 5) + 35
        y = row * (BRICK_HEIGHT + 5) + 60
        bricks.append(Brick(x, y, row))

# Game state
score = 0
lives = 3
game_over = False
game_won = False
font = pygame.font.Font(None, 36)
font_small = pygame.font.Font(None, 24)

# Main game loop
running = True
while running:
    # Handle events
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_r and (game_over or game_won):
                # Reset game
                paddle = Paddle()
                ball = Ball()
                bricks = []
                for row in range(BRICK_ROWS):
                    for col in range(BRICK_COLS):
                        x = col * (BRICK_WIDTH + 5) + 35
                        y = row * (BRICK_HEIGHT + 5) + 60
                        bricks.append(Brick(x, y, row))
                score = 0
                lives = 3
                game_over = False
                game_won = False
    
    if not game_over and not game_won:
        # Handle input
        keys = pygame.key.get_pressed()
        paddle.update(keys)
        
        # Update ball
        if ball.update(paddle):
            lives -= 1
            if lives <= 0:
                game_over = True
            else:
                ball.reset()
        
        # Check brick collisions
        for brick in bricks[:]:
            if ball.check_brick_collision(brick):
                bricks.remove(brick)
                score += brick.points
                # Speed up slightly with each hit
                ball.velocity_x *= ball.speed_increase
                ball.velocity_y *= ball.speed_increase
                # Limit speed
                ball.velocity_x = max(-ball.max_speed, min(ball.max_speed, ball.velocity_x))
                ball.velocity_y = max(-ball.max_speed, min(ball.max_speed, ball.velocity_y))
        
        # Check win condition
        if not bricks:
            game_won = True
    
    # Draw
    screen.fill(DARK_GRAY)
    
    # Draw game objects
    paddle.draw(screen)
    ball.draw(screen)
    for brick in bricks:
        brick.draw(screen)
    
    # Draw HUD
    score_text = font.render(f'Score: {score}', True, WHITE)
    screen.blit(score_text, (10, 10))
    
    lives_text = font.render(f'Lives: {lives}', True, WHITE)
    screen.blit(lives_text, (SCREEN_WIDTH - 120, 10))
    
    # Draw game state messages
    if game_over:
        game_over_text = font.render('GAME OVER', True, RED)
        final_score_text = font.render(f'Final Score: {score}', True, WHITE)
        restart_text = font_small.render('Press R to Play Again', True, WHITE)
        
        screen.blit(game_over_text, (SCREEN_WIDTH//2 - 100, SCREEN_HEIGHT//2 - 60))
        screen.blit(final_score_text, (SCREEN_WIDTH//2 - 100, SCREEN_HEIGHT//2))
        screen.blit(restart_text, (SCREEN_WIDTH//2 - 110, SCREEN_HEIGHT//2 + 40))
    elif game_won:
        win_text = font.render('YOU WIN!', True, GREEN)
        final_score_text = font.render(f'Final Score: {score}', True, WHITE)
        restart_text = font_small.render('Press R to Play Again', True, WHITE)
        
        screen.blit(win_text, (SCREEN_WIDTH//2 - 80, SCREEN_HEIGHT//2 - 60))
        screen.blit(final_score_text, (SCREEN_WIDTH//2 - 100, SCREEN_HEIGHT//2))
        screen.blit(restart_text, (SCREEN_WIDTH//2 - 110, SCREEN_HEIGHT//2 + 40))
    
    # Update display
    pygame.display.flip()
    clock.tick(FPS)

# Quit
pygame.quit()
sys.exit()`
};