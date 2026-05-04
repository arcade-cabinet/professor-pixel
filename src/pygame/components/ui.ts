// PyGame UI Components (ScoreText, Button, Timer, HealthBar)
import { PyGameComponent, hexToRgb } from './pygame-component-types';

interface ScoreTextProperties {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily?: string;
  alignment?: 'left' | 'center' | 'right';
  isScore?: boolean;
}

interface ButtonProperties {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  onClick: string; // Python function name
  color: string;
  textColor: string;
  fontSize?: number;
}

interface TimerProperties {
  duration: number;
  x: number;
  y: number;
  onComplete: string; // Python function name
  countDown: boolean;
  fontSize: number;
  color: string;
  showMilliseconds?: boolean;
}

interface HealthBarProperties {
  x: number;
  y: number;
  current: number;
  max: number;
  width: number;
  height: number;
  color: string;
  backgroundColor: string;
  showText?: boolean;
}

export const scoreTextComponent: PyGameComponent = {
  type: 'scoreText',
  id: 'scoreText',
  name: 'Score Text',
  description: 'Score displays and game messages',
  wizardDescription: 'Text that shows on screen! Use this for displaying the score, "Game Over" messages, instructions, or any words you want the player to see.',
  properties: {} as Record<string, any>,
  defaultProperties: {
    text: 'Score: 0',
    x: 10,
    y: 10,
    fontSize: 24,
    color: '#FFFFFF',
    fontFamily: 'Arial',
    alignment: 'left',
    isScore: true
  },
  preview: (ctx: CanvasRenderingContext2D, props: ScoreTextProperties) => {
    ctx.fillStyle = props.color;
    ctx.font = `${props.fontSize}px ${props.fontFamily || 'Arial'}`;
    ctx.textAlign = (props.alignment || 'left') as CanvasTextAlign;
    ctx.fillText(props.text, props.x, props.y + props.fontSize);
  },
  generateCode: (props: ScoreTextProperties) => `
class ScoreText:
    def __init__(self):
        self.text = '${props.text}'
        self.x = ${props.x}
        self.y = ${props.y}
        self.font_size = ${props.fontSize}
        self.color = (${hexToRgb(props.color).join(', ')})
        self.font = pygame.font.Font(None, self.font_size)
        self.is_score = ${props.isScore ? 'True' : 'False'}
        self.score_value = 0
    
    def update_score(self, value):
        if self.is_score:
            self.score_value = value
            self.text = f'Score: {self.score_value}'
    
    def set_text(self, text):
        self.text = text
    
    def draw(self, screen):
        text_surface = self.font.render(self.text, True, self.color)
        screen.blit(text_surface, (self.x, self.y))`
};

export const buttonComponent: PyGameComponent = {
  type: 'button',
  id: 'button',
  name: 'Button',
  description: 'Interactive UI elements',
  wizardDescription: 'A clickable button! Players can click on it to start the game, pause, or trigger any action you want. You decide what happens when it\'s clicked!',
  properties: {} as Record<string, any>,
  defaultProperties: {
    x: 350,
    y: 200,
    width: 100,
    height: 40,
    text: 'Start',
    onClick: 'start_game',
    color: '#3B82F6',
    textColor: '#FFFFFF',
    fontSize: 18
  },
  preview: (ctx: CanvasRenderingContext2D, props: ButtonProperties) => {
    // Draw button background
    ctx.fillStyle = props.color;
    ctx.fillRect(props.x, props.y, props.width, props.height);
    
    // Draw button border
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.strokeRect(props.x, props.y, props.width, props.height);
    
    // Draw button text
    ctx.fillStyle = props.textColor;
    ctx.font = `${props.fontSize || 18}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(props.text, props.x + props.width/2, props.y + props.height/2);
  },
  generateCode: (props: ButtonProperties) => `
class Button:
    def __init__(self):
        self.x = ${props.x}
        self.y = ${props.y}
        self.width = ${props.width}
        self.height = ${props.height}
        self.text = '${props.text}'
        self.color = (${hexToRgb(props.color).join(', ')})
        self.text_color = (${hexToRgb(props.textColor).join(', ')})
        self.font_size = ${props.fontSize || 18}
        self.font = pygame.font.Font(None, self.font_size)
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
        self.is_hovered = False
        self.is_clicked = False
    
    def handle_event(self, event):
        if event.type == pygame.MOUSEMOTION:
            self.is_hovered = self.rect.collidepoint(event.pos)
        elif event.type == pygame.MOUSEBUTTONDOWN:
            if self.rect.collidepoint(event.pos):
                self.is_clicked = True
                ${props.onClick}()  # Call the onClick function
        elif event.type == pygame.MOUSEBUTTONUP:
            self.is_clicked = False
    
    def draw(self, screen):
        # Draw button with hover effect
        color = tuple(min(255, c + 30) for c in self.color) if self.is_hovered else self.color
        pygame.draw.rect(screen, color, self.rect)
        pygame.draw.rect(screen, (0, 0, 0), self.rect, 2)
        
        # Draw text
        text_surface = self.font.render(self.text, True, self.text_color)
        text_rect = text_surface.get_rect(center=self.rect.center)
        screen.blit(text_surface, text_rect)`
};

export const timerComponent: PyGameComponent = {
  type: 'timer',
  id: 'timer',
  name: 'Timer',
  description: 'Countdown or stopwatch functionality',
  wizardDescription: 'A timer that counts up or down! Use it for time limits, speedruns, or to trigger events after a certain time. You can make something happen when time runs out!',
  properties: {} as Record<string, any>,
  defaultProperties: {
    duration: 60000,
    x: 350,
    y: 10,
    onComplete: 'game_over',
    countDown: true,
    fontSize: 20,
    color: '#FFFFFF',
    showMilliseconds: false
  },
  preview: (ctx: CanvasRenderingContext2D, props: TimerProperties) => {
    const timeText = props.countDown ? '60:00' : '00:00';
    ctx.fillStyle = props.color;
    ctx.font = `${props.fontSize}px monospace`;
    ctx.fillText(`⏱ ${timeText}`, props.x, props.y + props.fontSize);
  },
  generateCode: (props: TimerProperties) => `
class Timer:
    def __init__(self):
        self.duration = ${props.duration}
        self.x = ${props.x}
        self.y = ${props.y}
        self.count_down = ${props.countDown ? 'True' : 'False'}
        self.font_size = ${props.fontSize}
        self.color = (${hexToRgb(props.color).join(', ')})
        self.show_milliseconds = ${props.showMilliseconds ? 'True' : 'False'}
        self.font = pygame.font.Font(None, self.font_size)
        self.elapsed = 0
        self.running = False
        self.completed = False
    
    def start(self):
        self.running = True
        self.elapsed = 0 if not self.count_down else self.duration
        self.completed = False
    
    def update(self, dt):
        if not self.running or self.completed:
            return
        
        if self.count_down:
            self.elapsed -= dt
            if self.elapsed <= 0:
                self.elapsed = 0
                self.completed = True
                self.running = False
                ${props.onComplete}()  # Call completion function
        else:
            self.elapsed += dt
            if self.elapsed >= self.duration:
                self.elapsed = self.duration
                self.completed = True
                self.running = False
                ${props.onComplete}()  # Call completion function
    
    def get_time_string(self):
        time_ms = int(self.elapsed)
        minutes = time_ms // 60000
        seconds = (time_ms % 60000) // 1000
        milliseconds = time_ms % 1000
        
        if self.show_milliseconds:
            return f'{minutes:02d}:{seconds:02d}.{milliseconds:03d}'
        else:
            return f'{minutes:02d}:{seconds:02d}'
    
    def draw(self, screen):
        time_text = self.get_time_string()
        text_surface = self.font.render(time_text, True, self.color)
        screen.blit(text_surface, (self.x, self.y))`
};

export const healthBarComponent: PyGameComponent = {
  type: 'healthBar',
  id: 'healthBar',
  name: 'Health Bar',
  description: 'Visual health indicator',
  wizardDescription: 'A bar that shows how much health or energy is left! It goes down when taking damage and can go up when healing. Perfect for showing player or enemy health!',
  properties: {} as Record<string, any>,
  defaultProperties: {
    x: 10,
    y: 40,
    current: 100,
    max: 100,
    width: 200,
    height: 20,
    color: '#22C55E',
    backgroundColor: '#374151',
    showText: true
  },
  preview: (ctx: CanvasRenderingContext2D, props: HealthBarProperties) => {
    // Draw background
    ctx.fillStyle = props.backgroundColor;
    ctx.fillRect(props.x, props.y, props.width, props.height);
    
    // Draw health fill
    const fillWidth = (props.current / props.max) * props.width;
    ctx.fillStyle = props.color;
    ctx.fillRect(props.x, props.y, fillWidth, props.height);
    
    // Draw border
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.strokeRect(props.x, props.y, props.width, props.height);
    
    // Draw text if enabled
    if (props.showText) {
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${props.current}/${props.max}`, props.x + props.width/2, props.y + props.height/2);
    }
  },
  generateCode: (props: HealthBarProperties) => `
class HealthBar:
    def __init__(self):
        self.x = ${props.x}
        self.y = ${props.y}
        self.current = ${props.current}
        self.max = ${props.max}
        self.width = ${props.width}
        self.height = ${props.height}
        self.color = (${hexToRgb(props.color).join(', ')})
        self.background_color = (${hexToRgb(props.backgroundColor).join(', ')})
        self.show_text = ${props.showText ? 'True' : 'False'}
        self.font = pygame.font.Font(None, 14) if self.show_text else None
    
    def set_health(self, value):
        self.current = max(0, min(self.max, value))
    
    def damage(self, amount):
        self.set_health(self.current - amount)
    
    def heal(self, amount):
        self.set_health(self.current + amount)
    
    def draw(self, screen):
        # Draw background
        pygame.draw.rect(screen, self.background_color, 
            (self.x, self.y, self.width, self.height))
        
        # Draw health fill
        fill_width = int((self.current / self.max) * self.width)
        if fill_width > 0:
            pygame.draw.rect(screen, self.color, 
                (self.x, self.y, fill_width, self.height))
        
        # Draw border
        pygame.draw.rect(screen, (0, 0, 0), 
            (self.x, self.y, self.width, self.height), 2)
        
        # Draw text if enabled
        if self.show_text and self.font:
            text = f'{self.current}/{self.max}'
            text_surface = self.font.render(text, True, (255, 255, 255))
            text_rect = text_surface.get_rect(
                center=(self.x + self.width//2, self.y + self.height//2))
            screen.blit(text_surface, text_rect)`
};