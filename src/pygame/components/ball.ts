// PyGame Ball Component
import { PyGameComponent, hexToRgb } from './pygame-component-types';

// Define BallProperties locally to avoid import issues
interface BallProperties {
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  color: string;
  gravity?: number;
  bounciness?: number;
}

export const ballComponent: PyGameComponent = {
  type: 'ball',
  id: 'ball',
  name: 'Ball',
  description: 'A bouncing physics object for pong/breakout games',
  wizardDescription: 'A bouncy ball that can roll and bounce around! Perfect for games like Pong, Breakout, or any game where you need something that bounces off walls.',
  properties: {} as Record<string, any>,
  defaultProperties: {
    x: 200,
    y: 100,
    radius: 15,
    velocityX: 3,
    velocityY: 3,
    color: '#EF4444',
    gravity: 0.2,
    bounciness: 0.8
  },
  preview: (ctx: CanvasRenderingContext2D, props: BallProperties) => {
    ctx.fillStyle = props.color;
    ctx.beginPath();
    ctx.arc(props.x, props.y, props.radius, 0, Math.PI * 2);
    ctx.fill();
    // Add shine effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(props.x - props.radius * 0.3, props.y - props.radius * 0.3, props.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  },
  generateCode: (props: BallProperties) => `
class Ball:
    def __init__(self):
        self.x = ${props.x}
        self.y = ${props.y}
        self.radius = ${props.radius}
        self.velocity_x = ${props.velocityX}
        self.velocity_y = ${props.velocityY}
        self.color = (${hexToRgb(props.color).join(', ')})
        self.gravity = ${props.gravity || 0}
        self.bounciness = ${props.bounciness || 0.8}
    
    def update(self, screen_width, screen_height):
        self.x += self.velocity_x
        self.y += self.velocity_y
        self.velocity_y += self.gravity
        
        # Bounce off walls
        if self.x - self.radius <= 0 or self.x + self.radius >= screen_width:
            self.velocity_x *= -self.bounciness
            self.x = max(self.radius, min(screen_width - self.radius, self.x))
        
        if self.y - self.radius <= 0 or self.y + self.radius >= screen_height:
            self.velocity_y *= -self.bounciness
            self.y = max(self.radius, min(screen_height - self.radius, self.y))
    
    def draw(self, screen):
        pygame.draw.circle(screen, self.color, (int(self.x), int(self.y)), self.radius)`
};