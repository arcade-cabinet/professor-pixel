// PyGame Pong Template
import { GameTemplate } from './pygame-template-types';

export const pongTemplate: GameTemplate = {
  id: 'pong',
  name: 'Pong',
  description: 'Classic two-paddle game with bouncing ball and score tracking',
  wizardDescription: 'The classic Pong game! Two paddles hit a ball back and forth. First to 5 points wins! A great way to learn about ball physics and AI opponents.',
  difficulty: 'beginner',
  settings: {
    screenWidth: 800,
    screenHeight: 600,
    backgroundColor: '#000000',
    fps: 60,
    title: 'Pong Game'
  },
  components: [
    {
      type: 'paddle',
      id: 'player1',
      properties: {
        x: 50,
        y: 250,
        width: 15,
        height: 100,
        speed: 7,
        color: '#FFFFFF',
        playerControlled: true,
        controls: 'wasd'
      }
    },
    {
      type: 'paddle',
      id: 'player2',
      properties: {
        x: 735,
        y: 250,
        width: 15,
        height: 100,
        speed: 7,
        color: '#FFFFFF',
        playerControlled: true,
        controls: 'arrows'
      }
    },
    {
      type: 'ball',
      id: 'ball',
      properties: {
        x: 400,
        y: 300,
        radius: 10,
        velocityX: 5,
        velocityY: 3,
        color: '#FFFFFF',
        gravity: 0,
        bounciness: 1.05
      }
    },
    {
      type: 'scoreText',
      id: 'score1',
      properties: {
        text: '0',
        x: 350,
        y: 50,
        fontSize: 48,
        color: '#FFFFFF'
      }
    },
    {
      type: 'scoreText',
      id: 'score2',
      properties: {
        text: '0',
        x: 430,
        y: 50,
        fontSize: 48,
        color: '#FFFFFF'
      }
    }
  ],
  preview: (ctx: CanvasRenderingContext2D) => {
    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Center line
    ctx.strokeStyle = '#FFFFFF';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(ctx.canvas.width / 2, 0);
    ctx.lineTo(ctx.canvas.width / 2, ctx.canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Paddles
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(40, 200, 12, 80);
    ctx.fillRect(ctx.canvas.width - 52, 200, 12, 80);
    
    // Ball
    ctx.beginPath();
    ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Scores
    ctx.font = '36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0', ctx.canvas.width / 2 - 50, 50);
    ctx.fillText('0', ctx.canvas.width / 2 + 50, 50);
  },
  generateCode: () => `import pygame
import sys
import random

# Initialize Pygame
pygame.init()

# Game settings
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60
PADDLE_SPEED = 7
BALL_SPEED = 5
WINNING_SCORE = 5

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)

# Create the screen
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('Pong Game')
clock = pygame.time.Clock()

class Paddle:
    def __init__(self, x, y, controls='arrows'):
        self.x = x
        self.y = y
        self.width = 15
        self.height = 100
        self.speed = PADDLE_SPEED
        self.rect = pygame.Rect(x, y, self.width, self.height)
        self.controls = controls
        self.score = 0
    
    def update(self, keys):
        if self.controls == 'wasd':
            if keys[pygame.K_w] and self.rect.top > 0:
                self.rect.y -= self.speed
            if keys[pygame.K_s] and self.rect.bottom < SCREEN_HEIGHT:
                self.rect.y += self.speed
        elif self.controls == 'arrows':
            if keys[pygame.K_UP] and self.rect.top > 0:
                self.rect.y -= self.speed
            if keys[pygame.K_DOWN] and self.rect.bottom < SCREEN_HEIGHT:
                self.rect.y += self.speed
    
    def ai_update(self, ball):
        # Simple AI that follows the ball
        if ball.rect.centery < self.rect.centery - 20:
            self.rect.y -= self.speed
        elif ball.rect.centery > self.rect.centery + 20:
            self.rect.y += self.speed
        
        # Keep paddle on screen
        self.rect.top = max(0, self.rect.top)
        self.rect.bottom = min(SCREEN_HEIGHT, self.rect.bottom)
    
    def draw(self, screen):
        pygame.draw.rect(screen, WHITE, self.rect)

class Ball:
    def __init__(self):
        self.reset()
    
    def reset(self):
        self.x = SCREEN_WIDTH // 2
        self.y = SCREEN_HEIGHT // 2
        self.radius = 10
        self.velocity_x = BALL_SPEED * random.choice([-1, 1])
        self.velocity_y = BALL_SPEED * random.choice([-1, 1])
        self.rect = pygame.Rect(self.x - self.radius, self.y - self.radius, 
                               self.radius * 2, self.radius * 2)
    
    def update(self, paddle1, paddle2):
        # Move ball
        self.x += self.velocity_x
        self.y += self.velocity_y
        self.rect.center = (self.x, self.y)
        
        # Bounce off top and bottom walls
        if self.rect.top <= 0 or self.rect.bottom >= SCREEN_HEIGHT:
            self.velocity_y *= -1
        
        # Check paddle collisions
        if self.rect.colliderect(paddle1.rect) and self.velocity_x < 0:
            self.velocity_x *= -1.05  # Speed up slightly on hit
            self.velocity_y += random.uniform(-2, 2)  # Add some randomness
        elif self.rect.colliderect(paddle2.rect) and self.velocity_x > 0:
            self.velocity_x *= -1.05
            self.velocity_y += random.uniform(-2, 2)
        
        # Limit ball speed
        self.velocity_x = max(-15, min(15, self.velocity_x))
        self.velocity_y = max(-15, min(15, self.velocity_y))
        
        # Score points
        if self.rect.left <= 0:
            paddle2.score += 1
            self.reset()
            return 'score2'
        elif self.rect.right >= SCREEN_WIDTH:
            paddle1.score += 1
            self.reset()
            return 'score1'
        
        return None
    
    def draw(self, screen):
        pygame.draw.circle(screen, WHITE, (int(self.x), int(self.y)), self.radius)

# Create game objects
paddle1 = Paddle(50, SCREEN_HEIGHT//2 - 50, 'wasd')
paddle2 = Paddle(SCREEN_WIDTH - 65, SCREEN_HEIGHT//2 - 50, 'arrows')
ball = Ball()

# Fonts
font_large = pygame.font.Font(None, 72)
font_small = pygame.font.Font(None, 36)

# Game state
running = True
game_over = False
winner = None

# Main game loop
while running:
    # Handle events
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_r and game_over:
                # Reset game
                paddle1.score = 0
                paddle2.score = 0
                ball.reset()
                game_over = False
                winner = None
    
    # Update
    if not game_over:
        keys = pygame.key.get_pressed()
        paddle1.update(keys)
        paddle2.update(keys)
        # paddle2.ai_update(ball)  # Uncomment for AI opponent
        
        scored = ball.update(paddle1, paddle2)
        
        # Check for winner
        if paddle1.score >= WINNING_SCORE:
            game_over = True
            winner = "Player 1"
        elif paddle2.score >= WINNING_SCORE:
            game_over = True
            winner = "Player 2"
    
    # Draw
    screen.fill(BLACK)
    
    # Draw center line
    for y in range(0, SCREEN_HEIGHT, 20):
        pygame.draw.rect(screen, WHITE, (SCREEN_WIDTH//2 - 2, y, 4, 10))
    
    # Draw game objects
    paddle1.draw(screen)
    paddle2.draw(screen)
    ball.draw(screen)
    
    # Draw scores
    score1_text = font_large.render(str(paddle1.score), True, WHITE)
    score2_text = font_large.render(str(paddle2.score), True, WHITE)
    screen.blit(score1_text, (SCREEN_WIDTH//2 - 80, 50))
    screen.blit(score2_text, (SCREEN_WIDTH//2 + 40, 50))
    
    # Draw instructions or winner
    if game_over:
        winner_text = font_large.render(f"{winner} Wins!", True, WHITE)
        restart_text = font_small.render("Press R to Play Again", True, WHITE)
        screen.blit(winner_text, (SCREEN_WIDTH//2 - 150, SCREEN_HEIGHT//2 - 50))
        screen.blit(restart_text, (SCREEN_WIDTH//2 - 130, SCREEN_HEIGHT//2 + 20))
    else:
        instructions = font_small.render("Player 1: W/S | Player 2: ↑/↓", True, WHITE)
        screen.blit(instructions, (SCREEN_WIDTH//2 - 180, SCREEN_HEIGHT - 40))
    
    # Update display
    pygame.display.flip()
    clock.tick(FPS)

# Quit
pygame.quit()
sys.exit()`
};