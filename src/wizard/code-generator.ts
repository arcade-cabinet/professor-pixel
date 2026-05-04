import { GameChoice } from './pygame-live-preview';

interface CodeTemplate {
  imports: string[];
  setup: string[];
  gameLoop: string[];
  eventHandlers: string[];
  classes: string[];
}

interface GameParams {
  speed?: number;
  jumpHeight?: number;
  enemySpeed?: number;
}

// Generate complete pygame code from wizard choices
export function generatePygameCode(choices: GameChoice[], params: GameParams = {}): string {
  const template: CodeTemplate = {
    imports: [
      'import pygame',
      'import random',
      'import math',
      'from pygame.locals import *'
    ],
    setup: [
      '# Initialize Pygame',
      'pygame.init()',
      'screen = pygame.display.set_mode((640, 360))',
      'clock = pygame.time.Clock()',
      'running = True',
      '',
      '# Game variables',
      'score = 0',
      'lives = 3',
      `speed = ${params.speed || 5}`,
      `jump_height = ${params.jumpHeight || 10}`,
      `enemy_speed = ${params.enemySpeed || 3}`,
      'gravity = 0.5',
      'ground_y = 300',
      ''
    ],
    gameLoop: [],
    eventHandlers: [],
    classes: []
  };

  // Process each choice and add appropriate code
  choices.forEach(choice => {
    switch (choice.type) {
      case 'character':
        addCharacterCode(template, choice, params);
        break;
      case 'enemy':
        addEnemyCode(template, choice, params);
        break;
      case 'collectible':
        addCollectibleCode(template, choice, params);
        break;
      case 'background':
        addBackgroundCode(template, choice);
        break;
      case 'rule':
        addGameRuleCode(template, choice);
        break;
      case 'mechanic':
        addMechanicCode(template, choice, params);
        break;
    }
  });

  // Build the complete code
  return buildCompleteCode(template);
}

function addCharacterCode(template: CodeTemplate, choice: GameChoice, params: GameParams) {
  const characterType = choice.id;
  
  // Add character class
  template.classes.push(`
class Player:
    def __init__(self):
        self.x = 100
        self.y = ${300 - 40}
        self.width = 40
        self.height = 40
        self.vel_x = 0
        self.vel_y = 0
        self.jumping = False
        self.color = ${getColorForCharacter(characterType)}
        self.type = "${characterType}"
        
    def update(self):
        # Apply gravity
        if self.y < ground_y - self.height:
            self.vel_y += gravity
        else:
            self.vel_y = 0
            self.jumping = False
            self.y = ground_y - self.height
            
        # Update position
        self.x += self.vel_x
        self.y += self.vel_y
        
        # Keep on screen
        self.x = max(0, min(self.x, 640 - self.width))
        
    def jump(self):
        if not self.jumping:
            self.vel_y = -jump_height
            self.jumping = True
            
    def move_left(self):
        self.vel_x = -speed
        
    def move_right(self):
        self.vel_x = speed
        
    def stop(self):
        self.vel_x = 0
        
    def draw(self, screen):
        # Draw character based on type
        if self.type == "robot":
            # Draw robot shape
            pygame.draw.rect(screen, self.color, (self.x, self.y, self.width, self.height))
            pygame.draw.rect(screen, (100, 100, 100), (self.x + 10, self.y + 5, 20, 10))
            pygame.draw.circle(screen, (255, 0, 0), (int(self.x + 10), int(self.y + 10)), 3)
            pygame.draw.circle(screen, (255, 0, 0), (int(self.x + 30), int(self.y + 10)), 3)
        elif self.type == "ninja":
            # Draw ninja shape
            pygame.draw.rect(screen, self.color, (self.x, self.y, self.width, self.height))
            pygame.draw.rect(screen, (0, 0, 0), (self.x + 5, self.y + 8, 30, 3))
        elif self.type == "wizard":
            # Draw wizard shape with hat
            pygame.draw.rect(screen, self.color, (self.x + 5, self.y + 15, 30, 25))
            pygame.draw.polygon(screen, (75, 0, 130), [
                (self.x + 20, self.y),
                (self.x + 10, self.y + 15),
                (self.x + 30, self.y + 15)
            ])
        else:
            # Default character
            pygame.draw.rect(screen, self.color, (self.x, self.y, self.width, self.height))
            pygame.draw.circle(screen, (255, 255, 255), (int(self.x + 15), int(self.y + 15)), 3)
            pygame.draw.circle(screen, (255, 255, 255), (int(self.x + 25), int(self.y + 15)), 3)
`);

  // Add player initialization
  template.setup.push('player = Player()');
  
  // Add player update in game loop
  template.gameLoop.push('    player.update()');
  template.gameLoop.push('    player.draw(screen)');
  
  // Add controls
  template.eventHandlers.push(`
    keys = pygame.key.get_pressed()
    if keys[K_LEFT]:
        player.move_left()
    elif keys[K_RIGHT]:
        player.move_right()
    else:
        player.stop()
    if keys[K_SPACE]:
        player.jump()
`);
}

function addEnemyCode(template: CodeTemplate, choice: GameChoice, params: GameParams) {
  const enemyBehavior = choice.behavior || 'patrol';
  
  template.classes.push(`
class Enemy:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.width = 35
        self.height = 35
        self.vel_x = enemy_speed
        self.color = (255, 100, 100)
        self.behavior = "${enemyBehavior}"
        self.patrol_distance = 100
        self.start_x = x
        
    def update(self, player_x, player_y):
        if self.behavior == "patrol":
            # Move back and forth
            self.x += self.vel_x
            if abs(self.x - self.start_x) > self.patrol_distance:
                self.vel_x *= -1
        elif self.behavior == "chase":
            # Chase the player
            if player_x > self.x:
                self.x += enemy_speed * 0.7
            elif player_x < self.x:
                self.x -= enemy_speed * 0.7
        elif self.behavior == "jumper":
            # Jump occasionally
            if random.randint(0, 100) < 2:
                self.y -= 20
            if self.y < ground_y - self.height:
                self.y += gravity * 2
            else:
                self.y = ground_y - self.height
                
    def draw(self, screen):
        # Draw enemy with angry face
        pygame.draw.rect(screen, self.color, (self.x, self.y, self.width, self.height))
        pygame.draw.circle(screen, (255, 255, 255), (int(self.x + 10), int(self.y + 10)), 4)
        pygame.draw.circle(screen, (255, 255, 255), (int(self.x + 25), int(self.y + 10)), 4)
        pygame.draw.circle(screen, (0, 0, 0), (int(self.x + 10), int(self.y + 10)), 2)
        pygame.draw.circle(screen, (0, 0, 0), (int(self.x + 25), int(self.y + 10)), 2)
        pygame.draw.line(screen, (0, 0, 0), (self.x + 10, self.y + 20), (self.x + 25, self.y + 25), 2)
        
    def check_collision(self, player):
        return (self.x < player.x + player.width and
                self.x + self.width > player.x and
                self.y < player.y + player.height and
                self.y + self.height > player.y)
`);

  template.setup.push(`enemies = [Enemy(300, ground_y - 35), Enemy(450, ground_y - 35)]`);
  
  template.gameLoop.push(`
    # Update enemies
    for enemy in enemies:
        enemy.update(player.x, player.y)
        enemy.draw(screen)
        if enemy.check_collision(player):
            lives -= 1
            enemies.remove(enemy)
            if lives <= 0:
                running = False
`);
}

function addCollectibleCode(template: CodeTemplate, choice: GameChoice, params: GameParams) {
  const collectibleType = choice.id;
  
  template.classes.push(`
class Collectible:
    def __init__(self, x, y, item_type="coin"):
        self.x = x
        self.y = y
        self.width = 25
        self.height = 25
        self.type = item_type
        self.collected = False
        self.bounce = 0
        self.bounce_speed = 0.1
        
    def update(self):
        # Floating animation
        self.bounce += self.bounce_speed
        self.y += math.sin(self.bounce) * 0.5
        
    def draw(self, screen):
        if not self.collected:
            if self.type == "coin":
                pygame.draw.circle(screen, (255, 215, 0), (int(self.x + 12), int(self.y + 12)), 12)
                pygame.draw.circle(screen, (255, 255, 100), (int(self.x + 12), int(self.y + 12)), 8)
            elif self.type == "gem":
                points = [
                    (self.x + 12, self.y),
                    (self.x, self.y + 12),
                    (self.x + 12, self.y + 24),
                    (self.x + 24, self.y + 12)
                ]
                pygame.draw.polygon(screen, (100, 200, 255), points)
                pygame.draw.polygon(screen, (150, 220, 255), points, 2)
            elif self.type == "star":
                # Draw star shape
                cx, cy = self.x + 12, self.y + 12
                points = []
                for i in range(10):
                    angle = i * math.pi / 5
                    if i % 2 == 0:
                        r = 12
                    else:
                        r = 6
                    x = cx + r * math.cos(angle - math.pi / 2)
                    y = cy + r * math.sin(angle - math.pi / 2)
                    points.append((x, y))
                pygame.draw.polygon(screen, (255, 255, 0), points)
                
    def check_collision(self, player):
        if self.collected:
            return False
        return (self.x < player.x + player.width and
                self.x + self.width > player.x and
                self.y < player.y + player.height and
                self.y + self.height > player.y)
`);

  template.setup.push(`
collectibles = []
for i in range(5):
    x = 150 + i * 100
    y = ground_y - 60 - random.randint(0, 100)
    collectibles.append(Collectible(x, y, "${collectibleType}"))
`);

  template.gameLoop.push(`
    # Update collectibles
    for item in collectibles:
        item.update()
        item.draw(screen)
        if item.check_collision(player):
            item.collected = True
            score += 10 if item.type == "coin" else 25 if item.type == "gem" else 50
`);
}

function addBackgroundCode(template: CodeTemplate, choice: GameChoice) {
  const bgType = choice.id || 'sky';
  
  template.setup.push(`
# Background settings
bg_color = ${getBackgroundColor(bgType)}
clouds = [(random.randint(0, 640), random.randint(20, 100)) for _ in range(5)]
`);

  template.gameLoop.push(`
    # Draw background
    screen.fill(bg_color)
    
    # Draw clouds or stars based on background type
    if "${bgType}" == "sky":
        for cloud_x, cloud_y in clouds:
            pygame.draw.ellipse(screen, (255, 255, 255), (cloud_x, cloud_y, 60, 30))
            pygame.draw.ellipse(screen, (255, 255, 255), (cloud_x + 20, cloud_y - 10, 50, 30))
    elif "${bgType}" == "space":
        for _ in range(50):
            x, y = random.randint(0, 640), random.randint(0, 200)
            pygame.draw.circle(screen, (255, 255, 255), (x, y), 1)
    elif "${bgType}" == "cave":
        # Draw stalactites
        for i in range(0, 640, 80):
            pygame.draw.polygon(screen, (100, 100, 100), [
                (i, 0), (i + 20, 0), (i + 10, 40)
            ])
    
    # Draw ground
    pygame.draw.rect(screen, (100, 200, 100), (0, ground_y, 640, 60))
`);
}

function addGameRuleCode(template: CodeTemplate, choice: GameChoice) {
  const rule = choice.id;
  
  switch(rule) {
    case 'time_limit':
      template.setup.push('time_limit = 60');
      template.setup.push('start_time = pygame.time.get_ticks()');
      template.gameLoop.push(`
    # Check time limit
    elapsed_time = (pygame.time.get_ticks() - start_time) / 1000
    if elapsed_time > time_limit:
        running = False
`);
      break;
      
    case 'score_target':
      template.setup.push('target_score = 100');
      template.gameLoop.push(`
    # Check win condition
    if score >= target_score:
        print("You Win!")
        running = False
`);
      break;
      
    case 'survival':
      template.gameLoop.push(`
    # Survival mode - spawn more enemies over time
    if random.randint(0, 200) < 1:
        enemies.append(Enemy(640, ground_y - 35))
`);
      break;
  }
}

function addMechanicCode(template: CodeTemplate, choice: GameChoice, params: GameParams) {
  const mechanic = choice.id;
  
  switch(mechanic) {
    case 'double_jump':
      template.setup.push('double_jump_available = True');
      template.classes[0] = template.classes[0].replace(
        'def jump(self):',
        `def jump(self):
        global double_jump_available
        if not self.jumping:
            self.vel_y = -jump_height
            self.jumping = True
            double_jump_available = True
        elif double_jump_available:
            self.vel_y = -jump_height * 0.8
            double_jump_available = False`
      );
      break;
      
    case 'dash':
      template.eventHandlers.push(`
    if keys[K_LSHIFT]:
        if keys[K_LEFT]:
            player.x -= speed * 3
        elif keys[K_RIGHT]:
            player.x += speed * 3
`);
      break;
      
    case 'shoot':
      template.classes.push(`
class Projectile:
    def __init__(self, x, y, direction):
        self.x = x
        self.y = y
        self.vel_x = direction * 10
        self.width = 10
        self.height = 5
        
    def update(self):
        self.x += self.vel_x
        
    def draw(self, screen):
        pygame.draw.ellipse(screen, (255, 200, 0), (self.x, self.y, self.width, self.height))
`);
      template.setup.push('projectiles = []');
      template.eventHandlers.push(`
    if keys[K_x]:
        direction = 1 if player.vel_x >= 0 else -1
        projectiles.append(Projectile(player.x + player.width//2, player.y + player.height//2, direction))
`);
      template.gameLoop.push(`
    # Update projectiles
    for proj in projectiles[:]:
        proj.update()
        proj.draw(screen)
        if proj.x < 0 or proj.x > 640:
            projectiles.remove(proj)
        else:
            for enemy in enemies[:]:
                if (proj.x < enemy.x + enemy.width and
                    proj.x + proj.width > enemy.x and
                    proj.y < enemy.y + enemy.height and
                    proj.y + proj.height > enemy.y):
                    enemies.remove(enemy)
                    projectiles.remove(proj)
                    score += 5
                    break
`);
      break;
  }
}

function buildCompleteCode(template: CodeTemplate): string {
  const code = [
    ...template.imports,
    '',
    ...template.classes,
    '',
    ...template.setup,
    '',
    '# Game loop',
    'while running:',
    '    # Handle events',
    '    for event in pygame.event.get():',
    '        if event.type == QUIT:',
    '            running = False',
    '',
    ...template.eventHandlers,
    '',
    ...template.gameLoop,
    '',
    '    # Draw UI',
    '    font = pygame.font.Font(None, 36)',
    '    score_text = font.render(f"Score: {score}", True, (255, 255, 255))',
    '    lives_text = font.render(f"Lives: {lives}", True, (255, 255, 255))',
    '    screen.blit(score_text, (10, 10))',
    '    screen.blit(lives_text, (10, 50))',
    '',
    '    # Update display',
    '    pygame.display.flip()',
    '    clock.tick(60)',
    '',
    '# Handle click for interaction',
    'def handle_click(x, y):',
    '    global score',
    '    # Add click interaction logic here',
    '    score += 1',
    '',
    'pygame.quit()'
  ];
  
  return code.join('\n');
}

// Helper functions
function getColorForCharacter(type: string): string {
  const colors: Record<string, string> = {
    'robot': '(150, 150, 200)',
    'ninja': '(50, 50, 50)',
    'wizard': '(100, 50, 200)',
    'warrior': '(200, 100, 50)',
    'alien': '(50, 200, 100)'
  };
  return colors[type] || '(100, 100, 255)';
}

function getBackgroundColor(type: string): string {
  const colors: Record<string, string> = {
    'sky': '(135, 206, 235)',
    'space': '(10, 10, 30)',
    'cave': '(50, 50, 60)',
    'desert': '(255, 220, 180)',
    'forest': '(34, 139, 34)'
  };
  return colors[type] || '(135, 206, 235)';
}

// Generate simple test code for initial preview
export function generateTestCode(): string {
  return `
import pygame
import random
import math
from pygame.locals import *

pygame.init()
screen = pygame.display.set_mode((640, 360))
clock = pygame.time.Clock()

# Simple bouncing ball demo
x, y = 320, 180
vel_x, vel_y = random.randint(-5, 5), random.randint(-5, 5)
color = (random.randint(100, 255), random.randint(100, 255), random.randint(100, 255))

for frame in range(180):  # Run for 3 seconds at 60 FPS
    screen.fill((50, 50, 80))
    
    # Update position
    x += vel_x
    y += vel_y
    
    # Bounce off walls
    if x <= 20 or x >= 620:
        vel_x = -vel_x
        color = (random.randint(100, 255), random.randint(100, 255), random.randint(100, 255))
    if y <= 20 or y >= 340:
        vel_y = -vel_y
        color = (random.randint(100, 255), random.randint(100, 255), random.randint(100, 255))
    
    # Draw ball
    pygame.draw.circle(screen, color, (int(x), int(y)), 20)
    
    # Draw trail effect
    for i in range(5):
        trail_x = x - vel_x * (i + 1) * 3
        trail_y = y - vel_y * (i + 1) * 3
        alpha = 255 - i * 50
        trail_color = tuple(c * (alpha / 255) for c in color)
        pygame.draw.circle(screen, trail_color, (int(trail_x), int(trail_y)), 20 - i * 3)
    
    pygame.display.flip()
    clock.tick(60)

pygame.quit()
`;
}