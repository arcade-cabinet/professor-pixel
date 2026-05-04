// PyGame Platform Component
import { PyGameComponent, hexToRgb } from './pygame-component-types';

interface PlatformProperties {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isMoving?: boolean;
  moveSpeed?: number;
  moveRange?: number;
}

export const platformComponent: PyGameComponent = {
  type: 'platform',
  id: 'platform',
  name: 'Platform',
  description: 'A solid surface for platformer games',
  wizardDescription: 'This is a solid ground or platform that characters can stand on! Perfect for jumping games where you need floors, walls, or floating platforms.',
  properties: {} as Record<string, any>,
  defaultProperties: {
    x: 50,
    y: 300,
    width: 200,
    height: 20,
    color: '#10B981',
    isMoving: false,
    moveSpeed: 2,
    moveRange: 100
  },
  preview: (ctx: CanvasRenderingContext2D, props: PlatformProperties) => {
    ctx.fillStyle = props.color;
    ctx.fillRect(props.x, props.y, props.width, props.height);
    // Add some texture lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    for (let i = 0; i < props.width; i += 20) {
      ctx.moveTo(props.x + i, props.y);
      ctx.lineTo(props.x + i, props.y + props.height);
    }
    ctx.stroke();
  },
  generateCode: (props: PlatformProperties) => `
class Platform:
    def __init__(self):
        self.x = ${props.x}
        self.y = ${props.y}
        self.width = ${props.width}
        self.height = ${props.height}
        self.color = (${hexToRgb(props.color).join(', ')})
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
        self.is_moving = ${props.isMoving ? 'True' : 'False'}
        self.move_speed = ${props.moveSpeed || 2}
        self.move_range = ${props.moveRange || 100}
        self.move_direction = 1
        self.initial_x = self.x
    
    def update(self):
        if self.is_moving:
            self.x += self.move_speed * self.move_direction
            if abs(self.x - self.initial_x) >= self.move_range:
                self.move_direction *= -1
            self.rect.x = self.x
    
    def draw(self, screen):
        pygame.draw.rect(screen, self.color, self.rect)`
};