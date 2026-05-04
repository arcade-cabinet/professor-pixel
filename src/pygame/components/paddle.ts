// PyGame Paddle Component
import { PyGameComponent, hexToRgb } from './pygame-component-types';

interface PaddleProperties {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
  playerControlled: boolean;
  controls?: 'arrows' | 'wasd' | 'mouse';
}

export const paddleComponent: PyGameComponent = {
  type: 'paddle',
  id: 'paddle',
  name: 'Paddle',
  description: 'Player-controlled paddle for pong games',
  wizardDescription: 'A paddle that you can control to hit balls! Use this for games like Pong or to catch falling objects. You can move it with keyboard keys or the mouse.',
  properties: {} as Record<string, any>,
  defaultProperties: {
    x: 50,
    y: 200,
    width: 15,
    height: 80,
    speed: 5,
    color: '#8B5CF6',
    playerControlled: true,
    controls: 'arrows'
  },
  preview: (ctx: CanvasRenderingContext2D, props: PaddleProperties) => {
    ctx.fillStyle = props.color;
    ctx.fillRect(props.x, props.y, props.width, props.height);
    // Add grip lines
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    for (let i = props.y + 10; i < props.y + props.height - 10; i += 10) {
      ctx.beginPath();
      ctx.moveTo(props.x + 3, i);
      ctx.lineTo(props.x + props.width - 3, i);
      ctx.stroke();
    }
  },
  generateCode: (props: PaddleProperties) => `
class Paddle:
    def __init__(self):
        self.x = ${props.x}
        self.y = ${props.y}
        self.width = ${props.width}
        self.height = ${props.height}
        self.speed = ${props.speed}
        self.color = (${hexToRgb(props.color).join(', ')})
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
        self.player_controlled = ${props.playerControlled ? 'True' : 'False'}
        self.controls = '${props.controls || 'arrows'}'
    
    def update(self, keys, screen_height):
        if self.player_controlled:
            if self.controls == 'arrows':
                if keys[pygame.K_UP] and self.y > 0:
                    self.y -= self.speed
                if keys[pygame.K_DOWN] and self.y < screen_height - self.height:
                    self.y += self.speed
            elif self.controls == 'wasd':
                if keys[pygame.K_w] and self.y > 0:
                    self.y -= self.speed
                if keys[pygame.K_s] and self.y < screen_height - self.height:
                    self.y += self.speed
        
        self.rect.y = self.y
    
    def draw(self, screen):
        pygame.draw.rect(screen, self.color, self.rect)`
};