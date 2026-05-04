// PyGame Effect Components (ParticleEffect, Background)
import { PyGameComponent, hexToRgb } from './pygame-component-types';

// Define ParticleEffectProperties locally to avoid import issues
interface ParticleEffectProperties {
  x: number;
  y: number;
  type: 'explosion' | 'sparkle' | 'smoke' | 'confetti';
  duration: number;
  particleCount: number;
  color: string;
  spread?: number;
}

// Define BackgroundProperties locally to avoid import issues
interface BackgroundProperties {
  imagePath?: string;
  color?: string;
  scrollSpeed: number;
  parallax?: boolean;
  tileMode?: boolean;
}

export const particleEffectComponent: PyGameComponent = {
  type: 'particleEffect',
  id: 'particleEffect',
  name: 'Particle Effect',
  description: 'Visual effects like explosions and sparkles',
  wizardDescription: 'Cool visual effects! Add explosions when enemies are defeated, sparkles when collecting items, smoke trails, or confetti for celebrations. Makes your game look amazing!',
  properties: {} as Record<string, any>,
  defaultProperties: {
    x: 200,
    y: 200,
    type: 'explosion',
    duration: 1000,
    particleCount: 20,
    color: '#FFA500',
    spread: 50
  },
  preview: (ctx: CanvasRenderingContext2D, props: ParticleEffectProperties) => {
    const type = props.type || 'explosion';
    ctx.fillStyle = props.color;
    
    if (type === 'explosion') {
      // Draw explosion burst
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const x = props.x + Math.cos(angle) * 20;
        const y = props.y + Math.sin(angle) * 20;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'sparkle') {
      // Draw sparkles
      ctx.strokeStyle = props.color;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const offsetX = (i % 2) * 20 - 10;
        const offsetY = Math.floor(i / 2) * 20 - 10;
        ctx.beginPath();
        ctx.moveTo(props.x + offsetX - 5, props.y + offsetY);
        ctx.lineTo(props.x + offsetX + 5, props.y + offsetY);
        ctx.moveTo(props.x + offsetX, props.y + offsetY - 5);
        ctx.lineTo(props.x + offsetX, props.y + offsetY + 5);
        ctx.stroke();
      }
    } else if (type === 'smoke') {
      // Draw smoke circles
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(props.x, props.y - i * 10, 8 - i, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (type === 'confetti') {
      // Draw confetti pieces
      const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[i];
        ctx.fillRect(
          props.x + (i - 2) * 15,
          props.y + Math.sin(i) * 10,
          8, 4
        );
      }
      ctx.fillStyle = props.color;
    }
  },
  generateCode: (props: ParticleEffectProperties) => `
class ParticleEffect:
    def __init__(self):
        self.x = ${props.x}
        self.y = ${props.y}
        self.type = '${props.type}'
        self.duration = ${props.duration}
        self.particle_count = ${props.particleCount}
        self.color = (${hexToRgb(props.color).join(', ')})
        self.spread = ${props.spread || 50}
        self.particles = []
        self.active = False
        self.timer = 0
    
    def start(self):
        self.active = True
        self.timer = 0
        self.particles = []
        
        for i in range(self.particle_count):
            import random
            angle = random.uniform(0, 2 * 3.14159)
            speed = random.uniform(1, 5)
            particle = {
                'x': self.x,
                'y': self.y,
                'vx': math.cos(angle) * speed,
                'vy': math.sin(angle) * speed,
                'life': 1.0,
                'size': random.randint(2, 6)
            }
            if self.type == 'sparkle':
                particle['vx'] *= 0.3
                particle['vy'] *= 0.3
            elif self.type == 'smoke':
                particle['vy'] = -abs(particle['vy'])
            self.particles.append(particle)
    
    def update(self, dt):
        if not self.active:
            return
        
        self.timer += dt
        if self.timer >= self.duration:
            self.active = False
            return
        
        for particle in self.particles:
            particle['x'] += particle['vx']
            particle['y'] += particle['vy']
            particle['life'] -= dt / self.duration
            if self.type == 'explosion':
                particle['vy'] += 0.2  # gravity
    
    def draw(self, screen):
        if not self.active:
            return
        
        for particle in self.particles:
            if particle['life'] > 0:
                alpha = int(255 * particle['life'])
                color = (*self.color[:3], alpha) if len(self.color) == 3 else self.color
                pygame.draw.circle(screen, color[:3], 
                    (int(particle['x']), int(particle['y'])), 
                    particle['size'])`
};

export const backgroundComponent: PyGameComponent = {
  type: 'background',
  id: 'background',
  name: 'Background',
  description: 'Scrolling or static backgrounds',
  wizardDescription: 'The scenery behind your game! It can be a still picture or scroll to create the feeling of movement. Great for making your game world feel bigger!',
  properties: {} as Record<string, any>,
  defaultProperties: {
    color: '#87CEEB',
    scrollSpeed: 0,
    parallax: false,
    tileMode: false
  },
  preview: (ctx: CanvasRenderingContext2D, props: BackgroundProperties) => {
    // Fill with color
    ctx.fillStyle = props.color || '#87CEEB';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw some clouds if sky blue
    if (props.color === '#87CEEB') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(100, 50, 30, 0, Math.PI * 2);
      ctx.arc(130, 50, 35, 0, Math.PI * 2);
      ctx.arc(160, 50, 30, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(300, 80, 25, 0, Math.PI * 2);
      ctx.arc(325, 80, 30, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw scroll arrows if scrolling
    if (props.scrollSpeed !== 0) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ctx.canvas.width - 30, ctx.canvas.height / 2 - 10);
      ctx.lineTo(ctx.canvas.width - 20, ctx.canvas.height / 2);
      ctx.lineTo(ctx.canvas.width - 30, ctx.canvas.height / 2 + 10);
      ctx.stroke();
    }
  },
  generateCode: (props: BackgroundProperties) => `
class Background:
    def __init__(self, screen_width, screen_height):
        self.color = (${hexToRgb(props.color || '#87CEEB').join(', ')})
        self.scroll_speed = ${props.scrollSpeed}
        self.parallax = ${props.parallax ? 'True' : 'False'}
        self.tile_mode = ${props.tileMode ? 'True' : 'False'}
        self.scroll_x = 0
        self.screen_width = screen_width
        self.screen_height = screen_height
        ${props.imagePath ? `self.image = pygame.image.load('${props.imagePath}')` : '# No image specified'}
    
    def update(self):
        if self.scroll_speed != 0:
            self.scroll_x += self.scroll_speed
            if self.tile_mode:
                self.scroll_x %= self.screen_width
    
    def draw(self, screen):
        screen.fill(self.color)
        ${props.imagePath ? `
        if hasattr(self, 'image'):
            if self.tile_mode:
                for x in range(0, self.screen_width * 2, self.image.get_width()):
                    screen.blit(self.image, (x - self.scroll_x, 0))
            else:
                screen.blit(self.image, (-self.scroll_x, 0))` : ''}`
};