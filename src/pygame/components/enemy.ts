// PyGame Enemy Component
import { PyGameComponent, hexToRgb } from './pygame-component-types';

interface EnemyProperties {
  x: number;
  y: number;
  patternType: 'patrol' | 'chase' | 'circle' | 'random';
  speed: number;
  width: number;
  height: number;
  color: string;
  health?: number;
}

export const enemyComponent: PyGameComponent = {
  type: 'enemy',
  id: 'enemy',
  name: 'Enemy',
  description: 'Basic AI-controlled opponent',
  wizardDescription: 'An enemy that moves on its own! It can patrol back and forth, chase the player, move in circles, or wander randomly. Great for adding challenges to your game!',
  properties: {} as Record<string, any>,
  defaultProperties: {
    x: 400,
    y: 200,
    patternType: 'patrol',
    speed: 2,
    width: 40,
    height: 40,
    color: '#DC2626',
    health: 3
  },
  preview: (ctx: CanvasRenderingContext2D, props: EnemyProperties) => {
    ctx.fillStyle = props.color;
    ctx.fillRect(props.x, props.y, props.width, props.height);
    // Draw angry face
    ctx.fillStyle = 'white';
    ctx.fillRect(props.x + 8, props.y + 10, 6, 6);
    ctx.fillRect(props.x + props.width - 14, props.y + 10, 6, 6);
    ctx.fillStyle = 'black';
    ctx.fillRect(props.x + 10, props.y + 8, 6, 2);
    ctx.fillRect(props.x + props.width - 16, props.y + 8, 6, 2);
    // Frown
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(props.x + props.width/2, props.y + props.height, 10, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  },
  generateCode: (props: EnemyProperties) => `
class Enemy:
    def __init__(self):
        self.x = ${props.x}
        self.y = ${props.y}
        self.pattern_type = '${props.patternType}'
        self.speed = ${props.speed}
        self.width = ${props.width}
        self.height = ${props.height}
        self.color = (${hexToRgb(props.color).join(', ')})
        self.health = ${props.health || 3}
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
        self.direction = 1
        self.initial_x = self.x
        self.initial_y = self.y
        self.angle = 0
    
    def update(self, player_x=None, player_y=None):
        if self.pattern_type == 'patrol':
            self.x += self.speed * self.direction
            if abs(self.x - self.initial_x) > 100:
                self.direction *= -1
        elif self.pattern_type == 'chase' and player_x is not None:
            if self.x < player_x:
                self.x += self.speed
            elif self.x > player_x:
                self.x -= self.speed
            if self.y < player_y:
                self.y += self.speed
            elif self.y > player_y:
                self.y -= self.speed
        elif self.pattern_type == 'circle':
            self.angle += 0.05
            self.x = self.initial_x + math.cos(self.angle) * 50
            self.y = self.initial_y + math.sin(self.angle) * 50
        elif self.pattern_type == 'random':
            import random
            self.x += random.randint(-self.speed, self.speed)
            self.y += random.randint(-self.speed, self.speed)
        
        self.rect.x = self.x
        self.rect.y = self.y
    
    def draw(self, screen):
        pygame.draw.rect(screen, self.color, self.rect)`
};