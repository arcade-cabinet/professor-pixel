// PyGame Sprite Component
import { PyGameComponent, hexToRgb } from './pygame-component-types';

interface SpriteProperties {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  imagePath?: string;
  width: number;
  height: number;
  color?: string;
}

export const spriteComponent: PyGameComponent = {
  type: 'sprite',
  id: 'sprite',
  name: 'Sprite',
  description: 'A movable character or object with position and velocity',
  wizardDescription: 'This is like a character in your game that can move around! It could be a player, an animal, or any object that needs to move. You can make it jump, run, or fly!',
  properties: {} as Record<string, any>,
  defaultProperties: {
    x: 100,
    y: 100,
    velocityX: 0,
    velocityY: 0,
    width: 40,
    height: 40,
    color: '#4F46E5'
  },
  preview: (ctx: CanvasRenderingContext2D, props: SpriteProperties) => {
    ctx.fillStyle = props.color || '#4F46E5';
    ctx.fillRect(props.x, props.y, props.width, props.height);
    // Draw simple face
    ctx.fillStyle = 'white';
    ctx.fillRect(props.x + 8, props.y + 10, 6, 6);
    ctx.fillRect(props.x + props.width - 14, props.y + 10, 6, 6);
    ctx.fillRect(props.x + 10, props.y + props.height - 15, props.width - 20, 4);
  },
  generateCode: (props: SpriteProperties) => `
class Sprite:
    def __init__(self):
        self.x = ${props.x}
        self.y = ${props.y}
        self.velocity_x = ${props.velocityX}
        self.velocity_y = ${props.velocityY}
        self.width = ${props.width}
        self.height = ${props.height}
        self.color = (${hexToRgb(props.color || '#4F46E5').join(', ')})
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
    
    def update(self):
        self.x += self.velocity_x
        self.y += self.velocity_y
        self.rect.x = self.x
        self.rect.y = self.y
    
    def draw(self, screen):
        pygame.draw.rect(screen, self.color, self.rect)`
};