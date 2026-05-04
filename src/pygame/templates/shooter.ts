// PyGame Space Shooter Template
import { GameTemplate } from './pygame-template-types';
import { drawStar } from './pygame-component-types';

export const shooterTemplate: GameTemplate = {
  id: 'space-shooter',
  name: 'Space Shooter',
  description: 'Spaceship shooting game with enemies and score',
  wizardDescription: 'Blast through space fighting enemy ships! Control your spaceship, shoot lasers, and survive as long as you can. Great for learning about shooting mechanics and enemy patterns!',
  difficulty: 'intermediate',
  settings: {
    screenWidth: 800,
    screenHeight: 600,
    backgroundColor: '#0B1929',
    fps: 60,
    title: 'Space Shooter'
  },
  components: [
    {
      type: 'sprite',
      id: 'player',
      properties: {
        x: 400,
        y: 500,
        width: 50,
        height: 40,
        velocityX: 0,
        velocityY: 0,
        color: '#00FF00'
      }
    },
    {
      type: 'enemy',
      id: 'enemy_spawner',
      properties: {
        x: 400,
        y: 50,
        patternType: 'patrol',
        speed: 3,
        width: 40,
        height: 30,
        color: '#FF0000',
        health: 1
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
      type: 'healthBar',
      id: 'health',
      properties: {
        x: 10,
        y: 40,
        current: 100,
        max: 100,
        width: 200,
        height: 20,
        color: '#00FF00',
        backgroundColor: '#333333'
      }
    }
  ],
  preview: (ctx: CanvasRenderingContext2D) => {
    // Space background
    ctx.fillStyle = '#0B1929';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Stars
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * ctx.canvas.width;
      const y = Math.random() * ctx.canvas.height;
      const size = Math.random() * 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Player ship (green triangle)
    ctx.fillStyle = '#00FF00';
    ctx.beginPath();
    ctx.moveTo(ctx.canvas.width / 2, 350);
    ctx.lineTo(ctx.canvas.width / 2 - 20, 380);
    ctx.lineTo(ctx.canvas.width / 2 + 20, 380);
    ctx.closePath();
    ctx.fill();
    
    // Enemy ships (red triangles)
    ctx.fillStyle = '#FF0000';
    const enemies = [[200, 100], [400, 100], [600, 100], [300, 150], [500, 150]];
    enemies.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 15, y - 25);
      ctx.lineTo(x + 15, y - 25);
      ctx.closePath();
      ctx.fill();
    });
    
    // Lasers
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ctx.canvas.width / 2, 340);
    ctx.lineTo(ctx.canvas.width / 2, 320);
    ctx.stroke();
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
PLAYER_SPEED = 7

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREEN = (0, 255, 0)
RED = (255, 0, 0)
YELLOW = (255, 255, 0)
DARK_BLUE = (11, 25, 41)

# Create the screen
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('Space Shooter')
clock = pygame.time.Clock()

class Player:
    def __init__(self):
        self.x = SCREEN_WIDTH // 2
        self.y = SCREEN_HEIGHT - 100
        self.width = 50
        self.height = 40
        self.speed = PLAYER_SPEED
        self.rect = pygame.Rect(self.x - self.width//2, self.y - self.height//2, 
                               self.width, self.height)
        self.health = 100
        self.max_health = 100
        self.shoot_cooldown = 0
    
    def update(self, keys):
        # Movement
        if keys[pygame.K_LEFT] and self.rect.left > 0:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] and self.rect.right < SCREEN_WIDTH:
            self.x += self.speed
        if keys[pygame.K_UP] and self.rect.top > SCREEN_HEIGHT//2:
            self.y -= self.speed
        if keys[pygame.K_DOWN] and self.rect.bottom < SCREEN_HEIGHT:
            self.y += self.speed
        
        self.rect.center = (self.x, self.y)
        
        # Shooting
        if self.shoot_cooldown > 0:
            self.shoot_cooldown -= 1
    
    def shoot(self):
        if self.shoot_cooldown == 0:
            self.shoot_cooldown = 10
            return Bullet(self.x, self.y - self.height//2, -10)
        return None
    
    def take_damage(self, amount):
        self.health -= amount
        return self.health <= 0
    
    def draw(self, screen):
        # Draw ship as triangle
        points = [
            (self.x, self.y - self.height//2),
            (self.x - self.width//2, self.y + self.height//2),
            (self.x + self.width//2, self.y + self.height//2)
        ]
        pygame.draw.polygon(screen, GREEN, points)
        # Add details
        pygame.draw.circle(screen, WHITE, (int(self.x), int(self.y)), 5)

class Enemy:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.width = 40
        self.height = 30
        self.speed = random.uniform(1, 3)
        self.rect = pygame.Rect(self.x - self.width//2, self.y - self.height//2,
                               self.width, self.height)
        self.shoot_cooldown = random.randint(60, 120)
        self.move_pattern = random.choice(['straight', 'zigzag', 'circle'])
        self.move_timer = 0
    
    def update(self):
        self.move_timer += 0.05
        
        if self.move_pattern == 'straight':
            self.y += self.speed
        elif self.move_pattern == 'zigzag':
            self.x += math.sin(self.move_timer) * 3
            self.y += self.speed
        else:  # circle
            self.x += math.cos(self.move_timer) * 2
            self.y += self.speed
        
        # Keep on screen horizontally
        self.x = max(self.width//2, min(SCREEN_WIDTH - self.width//2, self.x))
        
        self.rect.center = (int(self.x), int(self.y))
        
        # Shooting
        if self.shoot_cooldown > 0:
            self.shoot_cooldown -= 1
    
    def shoot(self):
        if self.shoot_cooldown == 0:
            self.shoot_cooldown = random.randint(60, 120)
            return Bullet(self.x, self.y + self.height//2, 5)
        return None
    
    def draw(self, screen):
        # Draw enemy as inverted triangle
        points = [
            (self.x, self.y + self.height//2),
            (self.x - self.width//2, self.y - self.height//2),
            (self.x + self.width//2, self.y - self.height//2)
        ]
        pygame.draw.polygon(screen, RED, points)
        # Add details
        pygame.draw.circle(screen, YELLOW, (int(self.x), int(self.y)), 3)

class Bullet:
    def __init__(self, x, y, velocity_y):
        self.x = x
        self.y = y
        self.velocity_y = velocity_y
        self.radius = 3
        self.rect = pygame.Rect(self.x - self.radius, self.y - self.radius,
                               self.radius * 2, self.radius * 2)
    
    def update(self):
        self.y += self.velocity_y
        self.rect.center = (self.x, self.y)
        return self.y < 0 or self.y > SCREEN_HEIGHT
    
    def draw(self, screen):
        color = GREEN if self.velocity_y < 0 else RED
        pygame.draw.circle(screen, color, (int(self.x), int(self.y)), self.radius)
        # Add glow effect
        pygame.draw.circle(screen, WHITE, (int(self.x), int(self.y)), 1)

class Star:
    def __init__(self):
        self.x = random.randint(0, SCREEN_WIDTH)
        self.y = random.randint(0, SCREEN_HEIGHT)
        self.speed = random.uniform(0.5, 2)
        self.size = random.randint(1, 3)
    
    def update(self):
        self.y += self.speed
        if self.y > SCREEN_HEIGHT:
            self.y = 0
            self.x = random.randint(0, SCREEN_WIDTH)
    
    def draw(self, screen):
        pygame.draw.circle(screen, WHITE, (int(self.x), int(self.y)), self.size)

# Create game objects
player = Player()
enemies = []
player_bullets = []
enemy_bullets = []
stars = [Star() for _ in range(50)]

# Game state
score = 0
wave = 1
spawn_timer = 0
game_over = False
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
            if event.key == pygame.K_SPACE and not game_over:
                bullet = player.shoot()
                if bullet:
                    player_bullets.append(bullet)
            elif event.key == pygame.K_r and game_over:
                # Reset game
                player = Player()
                enemies = []
                player_bullets = []
                enemy_bullets = []
                score = 0
                wave = 1
                game_over = False
    
    if not game_over:
        # Handle continuous input
        keys = pygame.key.get_pressed()
        player.update(keys)
        
        # Spawn enemies
        spawn_timer -= 1
        if spawn_timer <= 0:
            if len(enemies) < 5 + wave:
                enemies.append(Enemy(random.randint(50, SCREEN_WIDTH - 50), -30))
                spawn_timer = max(30, 90 - wave * 5)
        
        # Update enemies
        for enemy in enemies[:]:
            enemy.update()
            if enemy.rect.top > SCREEN_HEIGHT:
                enemies.remove(enemy)
            else:
                bullet = enemy.shoot()
                if bullet:
                    enemy_bullets.append(bullet)
        
        # Update bullets
        for bullet in player_bullets[:]:
            if bullet.update():
                player_bullets.remove(bullet)
            else:
                for enemy in enemies[:]:
                    if bullet.rect.colliderect(enemy.rect):
                        player_bullets.remove(bullet)
                        enemies.remove(enemy)
                        score += 10
                        break
        
        for bullet in enemy_bullets[:]:
            if bullet.update():
                enemy_bullets.remove(bullet)
            elif bullet.rect.colliderect(player.rect):
                enemy_bullets.remove(bullet)
                if player.take_damage(10):
                    game_over = True
        
        # Check collisions with enemies
        for enemy in enemies[:]:
            if enemy.rect.colliderect(player.rect):
                enemies.remove(enemy)
                if player.take_damage(30):
                    game_over = True
        
        # Increase wave
        if score > 0 and score % 100 == 0:
            wave += 1
    
    # Update stars
    for star in stars:
        star.update()
    
    # Draw
    screen.fill(DARK_BLUE)
    
    # Draw stars
    for star in stars:
        star.draw(screen)
    
    if not game_over:
        # Draw game objects
        player.draw(screen)
        for enemy in enemies:
            enemy.draw(screen)
        for bullet in player_bullets:
            bullet.draw(screen)
        for bullet in enemy_bullets:
            bullet.draw(screen)
        
        # Draw HUD
        score_text = font.render(f'Score: {score}', True, WHITE)
        screen.blit(score_text, (10, 10))
        
        wave_text = font_small.render(f'Wave: {wave}', True, WHITE)
        screen.blit(wave_text, (10, 50))
        
        # Draw health bar
        bar_width = 200
        bar_height = 20
        bar_x = 10
        bar_y = 80
        pygame.draw.rect(screen, (50, 50, 50), (bar_x, bar_y, bar_width, bar_height))
        health_width = int((player.health / player.max_health) * bar_width)
        health_color = GREEN if player.health > 50 else YELLOW if player.health > 25 else RED
        pygame.draw.rect(screen, health_color, (bar_x, bar_y, health_width, bar_height))
        pygame.draw.rect(screen, WHITE, (bar_x, bar_y, bar_width, bar_height), 2)
        
        # Instructions
        instructions = font_small.render('Arrow Keys: Move | Space: Shoot', True, WHITE)
        screen.blit(instructions, (SCREEN_WIDTH//2 - 150, SCREEN_HEIGHT - 30))
    else:
        # Game over screen
        game_over_text = font.render('GAME OVER', True, RED)
        final_score_text = font.render(f'Final Score: {score}', True, WHITE)
        restart_text = font_small.render('Press R to Play Again', True, WHITE)
        
        screen.blit(game_over_text, (SCREEN_WIDTH//2 - 100, SCREEN_HEIGHT//2 - 60))
        screen.blit(final_score_text, (SCREEN_WIDTH//2 - 100, SCREEN_HEIGHT//2))
        screen.blit(restart_text, (SCREEN_WIDTH//2 - 110, SCREEN_HEIGHT//2 + 40))
    
    # Update display
    pygame.display.flip()
    clock.tick(FPS)

# Quit
pygame.quit()
sys.exit()`
};