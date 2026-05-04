// PyGame Collectible Component
import { PyGameComponent, hexToRgb, drawStar, drawHeart } from './pygame-component-types';

interface CollectibleProperties {
  x: number;
  y: number;
  type: 'coin' | 'powerup' | 'key' | 'health';
  value: number;
  size: number;
  color: string;
  respawns?: boolean;
}

export const collectibleComponent: PyGameComponent = {
  type: 'collectible',
  id: 'collectible',
  name: 'Collectible',
  description: 'Items that can be picked up',
  wizardDescription: 'Shiny items to collect! These could be coins for points, power-ups to make you stronger, keys to unlock doors, or health packs to heal. Touch them to pick them up!',
  properties: {} as Record<string, any>,
  defaultProperties: {
    x: 300,
    y: 250,
    type: 'coin',
    value: 10,
    size: 20,
    color: '#FBBF24',
    respawns: false
  },
  preview: (ctx: CanvasRenderingContext2D, props: CollectibleProperties) => {
    const type = props.type || 'coin';
    ctx.fillStyle = props.color;
    
    if (type === 'coin') {
      // Draw coin circle
      ctx.beginPath();
      ctx.arc(props.x + props.size/2, props.y + props.size/2, props.size/2, 0, Math.PI * 2);
      ctx.fill();
      // Add $ symbol
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.font = `${props.size * 0.7}px Arial`;
      ctx.fillText('$', props.x + props.size * 0.3, props.y + props.size * 0.7);
    } else if (type === 'powerup') {
      // Draw star shape
      drawStar(ctx, props.x + props.size/2, props.y + props.size/2, props.size/2, 5);
    } else if (type === 'key') {
      // Draw key shape
      ctx.fillRect(props.x, props.y + props.size * 0.3, props.size * 0.7, props.size * 0.4);
      ctx.beginPath();
      ctx.arc(props.x + props.size * 0.8, props.y + props.size/2, props.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'health') {
      // Draw heart shape
      drawHeart(ctx, props.x + props.size/2, props.y + props.size/2, props.size * 0.4);
    }
  },
  generateCode: (props: CollectibleProperties) => `
class Collectible:
    def __init__(self):
        self.x = ${props.x}
        self.y = ${props.y}
        self.type = '${props.type}'
        self.value = ${props.value}
        self.size = ${props.size}
        self.color = (${hexToRgb(props.color).join(', ')})
        self.respawns = ${props.respawns ? 'True' : 'False'}
        self.collected = False
        self.rect = pygame.Rect(self.x, self.y, self.size, self.size)
    
    def collect(self):
        if not self.collected:
            self.collected = True
            return self.value
        return 0
    
    def respawn(self):
        if self.respawns:
            self.collected = False
    
    def draw(self, screen):
        if not self.collected:
            if self.type == 'coin':
                pygame.draw.circle(screen, self.color, 
                    (self.x + self.size//2, self.y + self.size//2), self.size//2)
            else:
                pygame.draw.rect(screen, self.color, self.rect)`
};