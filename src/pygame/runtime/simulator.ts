interface GameObject {
  type: string;
  x: number;
  y: number;
  color: string;
  size: number;
}

interface SimulationResult {
  fps: number;
  objects: GameObject[];
}

// Frame buffer for accumulating pygame draw commands
interface DrawCommand {
  type: 'circle' | 'rect' | 'line' | 'fill' | 'blit' | 'clear' | 'text';
  args: any[];
}

// Global rendering state
let canvasContext: CanvasRenderingContext2D | null = null;
let frameBuffer: DrawCommand[] = [];
let isRenderingActive = false;
let currentFPS = 60;
let lastFrameTime = 0;

// Enhanced Surface class with real rendering capabilities
class RenderingSurface {
  public width: number;
  public height: number;
  public size: [number, number];
  public isMainSurface: boolean;
  private imageData: ImageData | null = null;

  constructor(width = 100, height = 100, isMainSurface = false) {
    this.width = width;
    this.height = height;
    this.size = [width, height];
    this.isMainSurface = isMainSurface;
    
    // Create image data for surface
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        const offscreen = new OffscreenCanvas(width, height);
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          this.imageData = ctx.createImageData(width, height);
        }
      } catch (e) {
        console.warn('OffscreenCanvas not available, using fallback');
      }
    }
  }

  get_width() { return this.width; }
  get_height() { return this.height; }
  get_size() { return this.size; }
  get_rect() {
    return new PygameRect(0, 0, this.width, this.height);
  }
  convert() { return this; }
  convert_alpha() { return this; }
  
  // Implement fill method for surface clearing
  fill(color: [number, number, number] | [number, number, number, number]) {
    if (this.isMainSurface && canvasContext) {
      const rgbColor = Array.isArray(color) && color.length >= 3 ? 
        `rgb(${color[0]}, ${color[1]}, ${color[2]})` : 'rgb(0, 0, 0)';
      frameBuffer.push({ type: 'fill', args: [rgbColor] });
    }
    return null;
  }
  
  // Implement blit method for drawing surfaces onto other surfaces
  blit(source: RenderingSurface, dest: [number, number] | PygameRect) {
    if (this.isMainSurface && canvasContext) {
      const x = Array.isArray(dest) ? dest[0] : dest.x;
      const y = Array.isArray(dest) ? dest[1] : dest.y;
      frameBuffer.push({ 
        type: 'blit', 
        args: [source.width, source.height, x, y] 
      });
    }
    return null;
  }
}

// Enhanced Rect class with collision detection
class PygameRect {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public left: number;
  public top: number;
  public right: number;
  public bottom: number;
  public centerx: number;
  public centery: number;
  public center: [number, number];

  constructor(x = 0, y = 0, width = 100, height = 100) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.left = x;
    this.top = y;
    this.right = x + width;
    this.bottom = y + height;
    this.centerx = x + width / 2;
    this.centery = y + height / 2;
    this.center = [this.centerx, this.centery];
  }

  // Collision detection methods
  colliderect(other: PygameRect): boolean {
    return !(this.right <= other.left || 
             this.left >= other.right || 
             this.bottom <= other.top || 
             this.top >= other.bottom);
  }

  contains(point: [number, number] | PygameRect): boolean {
    if (Array.isArray(point)) {
      const [px, py] = point;
      return px >= this.left && px < this.right && py >= this.top && py < this.bottom;
    } else {
      return point.left >= this.left && point.right <= this.right &&
             point.top >= this.top && point.bottom <= this.bottom;
    }
  }

  move(x: number, y: number): PygameRect {
    return new PygameRect(this.x + x, this.y + y, this.width, this.height);
  }

  inflate(x: number, y: number): PygameRect {
    return new PygameRect(
      this.x - x/2, this.y - y/2, 
      this.width + x, this.height + y
    );
  }
}

// Enhanced Sound class
class PygameSound {
  private volume: number = 1.0;
  private filename: string;

  constructor(filename: string) {
    this.filename = filename;
  }

  play() { 
    console.log(`🔊 Playing sound: ${this.filename} (volume: ${this.volume})`);
  }
  stop() { 
    console.log(`🔇 Stopping sound: ${this.filename}`);
  }
  set_volume(vol: number) { 
    this.volume = Math.max(0, Math.min(1, vol));
  }
  get_volume() { return this.volume; }
}

// Clock class for frame timing
class PygameClock {
  private lastTick: number = 0;
  private targetFPS: number = 60;

  tick(fps: number = 60): number {
    this.targetFPS = fps;
    const now = performance.now();
    const deltaTime = now - this.lastTick;
    this.lastTick = now;
    
    // Update global FPS tracking
    currentFPS = Math.round(1000 / Math.max(deltaTime, 1));
    
    // Return milliseconds since last tick
    return deltaTime;
  }

  get_fps(): number {
    return currentFPS;
  }

  get_time(): number {
    return performance.now() - this.lastTick;
  }
}

// Font class for text rendering
class PygameFont {
  private size: number;
  private fontFamily: string;

  constructor(fontname: string | null = null, size: number = 36) {
    this.size = size;
    this.fontFamily = fontname || 'Arial, sans-serif';
  }

  render(text: string, antialias: boolean = true, color: [number, number, number] = [255, 255, 255]): RenderingSurface {
    // Calculate approximate text dimensions
    const avgCharWidth = this.size * 0.6; // Rough approximation
    const textWidth = Math.ceil(text.length * avgCharWidth);
    const textHeight = Math.ceil(this.size * 1.2);
    
    const surface = new RenderingSurface(textWidth, textHeight);
    
    // If rendering to main surface, add to frame buffer
    if (canvasContext) {
      const rgbColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      // Store text rendering command in frame buffer for later execution
      frameBuffer.push({ 
        type: 'text' as any, 
        args: [text, 0, 0, rgbColor, `${this.size}px ${this.fontFamily}`] 
      });
    }
    
    return surface;
  }

  size_text(text: string): [number, number] {
    const avgCharWidth = this.size * 0.6;
    return [Math.ceil(text.length * avgCharWidth), Math.ceil(this.size * 1.2)];
  }
}

// Core rendering bridge functions
export function setCanvasContext(ctx: CanvasRenderingContext2D | null) {
  canvasContext = ctx;
  if (ctx) {
    isRenderingActive = true;
    console.log('Pygame rendering bridge: Canvas context connected');
  } else {
    isRenderingActive = false;
    console.log('Pygame rendering bridge: Canvas context disconnected');
  }
}

// Reset pygame state
export function resetPygameState() {
  frameBuffer = [];
  isRenderingActive = false;
  currentFPS = 60;
  lastFrameTime = 0;
}

// Create complete pygame environment for Pyodide
export function createPygameEnvironment() {
  const pygame = {
    init: () => console.log('🎮 Pygame initialized'),
    quit: () => {
      console.log('🎮 Pygame quit');
      resetPygameState();
    },
    display: {
      set_mode: (size: [number, number]) => {
        console.log(`🖼️ Display mode set: ${size[0]}x${size[1]}`);
        return new RenderingSurface(size[0], size[1], true);
      },
      flip: () => {
        flushFrameBuffer();
        frameBuffer = [];
      },
      update: () => {
        flushFrameBuffer();
        frameBuffer = [];
      },
      set_caption: (title: string) => console.log(`🏷️ Window caption: ${title}`)
    },
    draw: {
      circle: (surface: RenderingSurface, color: [number, number, number], center: [number, number], radius: number) => {
        if (surface.isMainSurface && canvasContext) {
          const rgbColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
          frameBuffer.push({ type: 'circle', args: [rgbColor, center[0], center[1], radius] });
        }
        return null;
      },
      rect: (surface: RenderingSurface, color: [number, number, number], rect: [number, number, number, number] | PygameRect) => {
        if (surface.isMainSurface && canvasContext) {
          const rgbColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
          if (Array.isArray(rect)) {
            frameBuffer.push({ type: 'rect', args: [rgbColor, rect[0], rect[1], rect[2], rect[3]] });
          } else {
            frameBuffer.push({ type: 'rect', args: [rgbColor, rect.x, rect.y, rect.width, rect.height] });
          }
        }
        return null;
      },
      line: (surface: RenderingSurface, color: [number, number, number], start: [number, number], end: [number, number], width: number = 1) => {
        if (surface.isMainSurface && canvasContext) {
          const rgbColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
          frameBuffer.push({ type: 'line', args: [rgbColor, start[0], start[1], end[0], end[1], width] });
        }
        return null;
      },
      polygon: (surface: RenderingSurface, color: [number, number, number], points: [number, number][]) => {
        if (surface.isMainSurface && canvasContext) {
          const rgbColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
          frameBuffer.push({ type: 'polygon' as any, args: [rgbColor, points] });
        }
        return null;
      },
      ellipse: (surface: RenderingSurface, color: [number, number, number], rect: [number, number, number, number]) => {
        if (surface.isMainSurface && canvasContext) {
          const rgbColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
          frameBuffer.push({ type: 'ellipse' as any, args: [rgbColor, rect[0], rect[1], rect[2], rect[3]] });
        }
        return null;
      }
    },
    font: {
      Font: PygameFont,
      SysFont: (name: string | null, size: number) => new PygameFont(name, size)
    },
    time: {
      Clock: PygameClock,
      get_ticks: () => performance.now()
    },
    mixer: {
      init: () => console.log('🔊 Mixer initialized'),
      quit: () => console.log('🔇 Mixer quit'),
      Sound: PygameSound,
      music: {
        load: (file: string) => console.log(`🎵 Loading music: ${file}`),
        play: (loops: number = -1) => console.log('🎵 Playing music'),
        stop: () => console.log('🎵 Music stopped'),
        set_volume: (vol: number) => console.log(`🎵 Music volume: ${vol}`)
      }
    },
    event: {
      get: () => [],
      poll: () => null,
      Event: (type: number, dict: any = {}) => ({ type, ...dict })
    },
    key: {
      get_pressed: () => new Array(512).fill(false),
      name: (key: number) => `Key${key}`
    },
    mouse: {
      get_pos: () => [0, 0],
      get_pressed: () => [false, false, false],
      set_cursor: (size: [number, number], hotspot: [number, number], xormasks: any, andmasks: any) => null
    },
    Surface: RenderingSurface,
    Rect: PygameRect,
    Color: (r: number, g: number = 0, b: number = 0, a: number = 255) => [r, g, b, a],
    image: {
      load: (filename: string) => {
        console.log(`📷 Loading image: ${filename}`);
        return new RenderingSurface(100, 100);
      },
      save: (surface: RenderingSurface, filename: string) => {
        console.log(`💾 Saving image: ${filename}`);
      }
    },
    transform: {
      scale: (surface: RenderingSurface, size: [number, number]) => {
        return new RenderingSurface(size[0], size[1]);
      },
      rotate: (surface: RenderingSurface, angle: number) => surface,
      flip: (surface: RenderingSurface, xbool: boolean, ybool: boolean) => surface
    },
    sprite: {
      Sprite: class {
        image: RenderingSurface | null = null;
        rect: PygameRect | null = null;
        update() {}
        kill() {}
      },
      Group: class {
        sprites: any[] = [];
        add(sprite: any) { this.sprites.push(sprite); }
        remove(sprite: any) { 
          const idx = this.sprites.indexOf(sprite);
          if (idx > -1) this.sprites.splice(idx, 1);
        }
        empty() { this.sprites = []; }
        update() { this.sprites.forEach(s => s.update()); }
        draw(surface: RenderingSurface) {
          this.sprites.forEach(s => {
            if (s.image && s.rect) {
              surface.blit(s.image, [s.rect.x, s.rect.y]);
            }
          });
        }
      }
    },
    locals: {
      QUIT: 12,
      KEYDOWN: 2,
      KEYUP: 3,
      MOUSEBUTTONDOWN: 5,
      MOUSEBUTTONUP: 6,
      MOUSEMOTION: 4,
      K_LEFT: 276,
      K_RIGHT: 275,
      K_UP: 273,
      K_DOWN: 274,
      K_SPACE: 32,
      K_RETURN: 13,
      K_ESCAPE: 27,
      K_a: 97,
      K_d: 100,
      K_w: 119,
      K_s: 115,
      K_x: 120,
      K_LSHIFT: 304,
      K_RSHIFT: 303
    },
    math: Math,
    random: {
      randint: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
      random: () => Math.random(),
      choice: (arr: any[]) => arr[Math.floor(Math.random() * arr.length)],
      shuffle: (arr: any[]) => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }
    }
  };
  
  // Add pygame.locals shortcuts
  Object.assign(pygame, pygame.locals);
  
  return pygame;
}

export function flushFrameBuffer() {
  if (!canvasContext || frameBuffer.length === 0) {
    return;
  }

  try {
    // Process all draw commands in the frame buffer
    for (const command of frameBuffer) {
      switch (command.type) {
        case 'clear':
          canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
          break;
          
        case 'fill':
          const [fillColor] = command.args;
          canvasContext.fillStyle = fillColor;
          canvasContext.fillRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
          break;
          
        case 'circle':
          const [circleColor, centerX, centerY, radius] = command.args;
          canvasContext.fillStyle = circleColor;
          canvasContext.beginPath();
          canvasContext.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          canvasContext.fill();
          break;
          
        case 'rect':
          const [rectColor, rectX, rectY, rectWidth, rectHeight] = command.args;
          canvasContext.fillStyle = rectColor;
          canvasContext.fillRect(rectX, rectY, rectWidth, rectHeight);
          break;
          
        case 'line':
          const [lineColor, startX, startY, endX, endY, lineWidth] = command.args;
          canvasContext.strokeStyle = lineColor;
          canvasContext.lineWidth = lineWidth || 1;
          canvasContext.beginPath();
          canvasContext.moveTo(startX, startY);
          canvasContext.lineTo(endX, endY);
          canvasContext.stroke();
          break;
          
        case 'polygon' as any:
          const [polyColor, points] = command.args;
          if (points && points.length > 0) {
            canvasContext.fillStyle = polyColor;
            canvasContext.beginPath();
            canvasContext.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
              canvasContext.lineTo(points[i][0], points[i][1]);
            }
            canvasContext.closePath();
            canvasContext.fill();
          }
          break;
          
        case 'ellipse' as any:
          const [ellipseColor, ellipseX, ellipseY, ellipseWidth, ellipseHeight] = command.args;
          canvasContext.fillStyle = ellipseColor;
          canvasContext.beginPath();
          canvasContext.ellipse(
            ellipseX + ellipseWidth / 2,
            ellipseY + ellipseHeight / 2,
            ellipseWidth / 2,
            ellipseHeight / 2,
            0, 0, 2 * Math.PI
          );
          canvasContext.fill();
          break;
          
        case 'text':
          const [text, textX, textY, textColor, font] = command.args;
          canvasContext.fillStyle = textColor;
          canvasContext.font = font;
          canvasContext.fillText(text, textX, textY);
          break;
          
        case 'blit':
          // For now, just draw a placeholder rectangle for blits
          const [blitWidth, blitHeight, blitX, blitY] = command.args;
          canvasContext.fillStyle = 'rgba(100, 100, 100, 0.5)';
          canvasContext.fillRect(blitX, blitY, blitWidth, blitHeight);
          break;
      }
    }
  } catch (error) {
    console.error('Pygame rendering error:', error);
  } finally {
    // Clear the frame buffer after rendering
    frameBuffer = [];
  }
}

// Utility function to convert pygame color to CSS color
function parseColor(color: any): string {
  if (Array.isArray(color)) {
    if (color.length >= 3) {
      const r = Math.max(0, Math.min(255, Math.floor(color[0])));
      const g = Math.max(0, Math.min(255, Math.floor(color[1])));
      const b = Math.max(0, Math.min(255, Math.floor(color[2])));
      const a = color.length >= 4 ? Math.max(0, Math.min(1, color[3] / 255)) : 1;
      return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
    }
  }
  return typeof color === 'string' ? color : '#000000';
}

// Enhanced pygame shim object with real rendering
export const pygameShim = {
  // Core pygame functions
  init() { return true; },
  quit() { 
    isRenderingActive = false;
    canvasContext = null;
    frameBuffer = [];
  },
  
  // Time module with Clock
  time: {
    Clock() {
      return new PygameClock();
    },
    get_ticks() {
      return performance.now();
    },
    wait(milliseconds: number) {
      // Non-blocking simulation of wait
      console.log(`⏱️ Pygame wait: ${milliseconds}ms (simulated)`);
    }
  },
  
  // Font module
  font: {
    init() { return true; },
    Font(fontname: string | null = null, size: number = 36) {
      return new PygameFont(fontname, size);
    },
    get_default_font() {
      return 'Arial';
    }
  },
  
  // Display module with real surface creation
  display: {
    set_mode(size: [number, number] = [800, 600]) {
      const surface = new RenderingSurface(size[0], size[1], true);
      if (isRenderingActive) {
        frameBuffer.push({ type: 'clear', args: [] });
      }
      return surface;
    },
    set_caption(title: string) {
      console.log(`📺 Display caption: ${title}`);
    },
    flip() {
      if (isRenderingActive) {
        flushFrameBuffer();
      }
    },
    update() {
      if (isRenderingActive) {
        flushFrameBuffer();
      }
    },
    get_surface() {
      return new RenderingSurface(800, 600, true);
    }
  },

  // Image module
  image: {
    load(filename: string) {
      console.log(`🖼️ Loading image: ${filename} (placeholder surface created)`);
      return new RenderingSurface(64, 64);
    }
  },

  // Enhanced mixer module
  mixer: {
    init() { return true; },
    quit() { console.log('🔇 Audio mixer stopped'); },
    Sound(file: string) {
      return new PygameSound(file);
    },
    music: {
      load(filename: string) {
        console.log(`🎵 Loading music: ${filename}`);
      },
      play(loops: number = 0) {
        console.log(`🎵 Playing music (loops: ${loops})`);
      },
      stop() {
        console.log('🔇 Music stopped');
      },
      set_volume(volume: number) {
        console.log(`🔊 Music volume: ${volume}`);
      }
    }
  },

  // Enhanced draw module with real rendering
  draw: {
    circle(surface: RenderingSurface, color: any, pos: [number, number], radius: number) {
      if (surface.isMainSurface && isRenderingActive) {
        const cssColor = parseColor(color);
        frameBuffer.push({ 
          type: 'circle', 
          args: [cssColor, pos[0], pos[1], radius] 
        });
      }
    },
    rect(surface: RenderingSurface, color: any, rect: any) {
      if (surface.isMainSurface && isRenderingActive) {
        const cssColor = parseColor(color);
        let x, y, width, height;
        
        if (Array.isArray(rect) && rect.length >= 4) {
          [x, y, width, height] = rect;
        } else if (rect && typeof rect === 'object') {
          x = rect.x || rect.left || 0;
          y = rect.y || rect.top || 0;
          width = rect.width || rect.w || 50;
          height = rect.height || rect.h || 50;
        } else {
          x = y = 0; width = height = 50;
        }
        
        frameBuffer.push({ 
          type: 'rect', 
          args: [cssColor, x, y, width, height] 
        });
      }
    },
    line(surface: RenderingSurface, color: any, start: [number, number], end: [number, number], width: number = 1) {
      if (surface.isMainSurface && isRenderingActive) {
        const cssColor = parseColor(color);
        frameBuffer.push({ 
          type: 'line', 
          args: [cssColor, start[0], start[1], end[0], end[1], width] 
        });
      }
    },
    polygon(surface: RenderingSurface, color: any, points: [number, number][]) {
      // Approximate polygon with lines for now
      if (surface.isMainSurface && isRenderingActive && points.length > 1) {
        const cssColor = parseColor(color);
        for (let i = 0; i < points.length; i++) {
          const start = points[i];
          const end = points[(i + 1) % points.length];
          frameBuffer.push({ 
            type: 'line', 
            args: [cssColor, start[0], start[1], end[0], end[1], 1] 
          });
        }
      }
    }
  },

  // Event module with basic event simulation
  event: {
    get() { 
      // Return empty events list - real event handling would need browser integration
      return []; 
    },
    pump() { /* Process events - no-op for simulation */ },
    Event(type: number, dict: any = {}) {
      return { type, ...dict };
    }
  },

  // Key module
  key: {
    get_pressed() { 
      // Return array of 512 False values to simulate no keys pressed
      // This prevents IndexError when accessing key indices like pygame.K_LEFT (276)
      return new Array(512).fill(false);
    },
    get_focused() {
      return true; // Assume window has focus
    }
  },

  // Transform module
  transform: {
    scale(surface: RenderingSurface, size: [number, number]) {
      return new RenderingSurface(size[0], size[1]);
    },
    rotate(surface: RenderingSurface, angle: number) {
      // Return same surface for now - rotation is complex
      console.log(`🔄 Rotating surface by ${angle} degrees (placeholder)`);
      return surface;
    },
    flip(surface: RenderingSurface, xbool: boolean = false, ybool: boolean = false) {
      // Return same surface for now
      console.log(`🔄 Flipping surface (x:${xbool}, y:${ybool}) (placeholder)`);
      return surface;
    }
  },

  // Common color constants and utilities
  Color: {
    RED: [255, 0, 0],
    GREEN: [0, 255, 0],
    BLUE: [0, 0, 255],
    WHITE: [255, 255, 255],
    BLACK: [0, 0, 0],
    YELLOW: [255, 255, 0],
    CYAN: [0, 255, 255],
    MAGENTA: [255, 0, 255]
  },
  
  // Rect constructor
  Rect(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
    return new PygameRect(x, y, width, height);
  }
};

// Function to register pygame shim in Pyodide
// Pygame shim verification functions
export function verifyPygameShimReady(pyodide: any): boolean {
  if (!pyodide) {
    console.warn('Pyodide instance not available for pygame verification');
    return false;
  }

  try {
    // Single comprehensive verification script
    const verificationResult = pyodide.runPython(`
import sys
import json

verification = {
    'pygame_available': False,
    'basic_functionality': False,
    'rendering_bridge': False,
    'errors': []
}

try:
    # Check if pygame module exists
    if 'pygame' not in sys.modules:
        verification['errors'].append('pygame module not in sys.modules')
    else:
        verification['pygame_available'] = True
        
        # Test basic pygame functionality
        import pygame
        pygame.init()
        screen = pygame.display.set_mode((100, 100))
        verification['basic_functionality'] = True
        
        # Test rendering bridge components
        if hasattr(pygame.draw, 'circle') and hasattr(pygame.display, 'flip'):
            verification['rendering_bridge'] = True
        else:
            verification['errors'].append('pygame draw or display methods missing')
            
except Exception as e:
    verification['errors'].append(f'Verification failed: {str(e)}')

json.dumps(verification)
`);
    
    const result = JSON.parse(verificationResult);
    
    if (result.pygame_available && result.basic_functionality) {
      console.log('✅ Pygame shim verification successful');
      return true;
    } else {
      console.warn(`⚠️ Pygame shim verification failed: ${result.errors.join(', ')}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error during pygame shim verification:', error);
    return false;
  }
}

export function getPygameStatus(pyodide: any): { 
  isAvailable: boolean; 
  modules: string[]; 
  errors: string[];
  capabilities: string[];
  renderingBridge: boolean;
} {
  const defaultStatus = {
    isAvailable: false,
    modules: [] as string[],
    errors: [] as string[],
    capabilities: [] as string[],
    renderingBridge: false
  };

  if (!pyodide) {
    defaultStatus.errors.push('Pyodide instance not available');
    return defaultStatus;
  }

  try {
    // Single comprehensive status check script
    const statusResult = pyodide.runPython(`
import sys
import json

status = {
    'isAvailable': False,
    'modules': [],
    'errors': [],
    'capabilities': [],
    'renderingBridge': False
}

try:
    # Check main pygame module
    if 'pygame' not in sys.modules:
        status['errors'].append('Main pygame module not available')
    else:
        status['modules'].append('pygame')
        import pygame
        
        # Check pygame submodules
        submodules = ['display', 'draw', 'event', 'image', 'mixer', 'key', 'transform', 'time', 'font']
        
        for module in submodules:
            if hasattr(pygame, module):
                status['modules'].append(f'pygame.{module}')
            else:
                status['errors'].append(f'pygame.{module} not available')
        
        # Test specific capabilities
        capabilities = []
        
        # Test basic initialization
        try:
            pygame.init()
            capabilities.append('initialization')
        except Exception as e:
            status['errors'].append(f'Init failed: {e}')
        
        # Test display creation
        try:
            screen = pygame.display.set_mode((100, 100))
            capabilities.append('display_creation')
        except Exception as e:
            status['errors'].append(f'Display creation failed: {e}')
        
        # Test drawing methods
        try:
            if hasattr(pygame.draw, 'circle') and hasattr(pygame.draw, 'rect'):
                capabilities.append('drawing_methods')
                status['renderingBridge'] = True
        except Exception as e:
            status['errors'].append(f'Drawing methods check failed: {e}')
        
        # Test time/clock functionality
        try:
            if hasattr(pygame.time, 'Clock'):
                clock = pygame.time.Clock()
                capabilities.append('timing_system')
        except Exception as e:
            status['errors'].append(f'Timing system check failed: {e}')
        
        # Test font system
        try:
            if hasattr(pygame.font, 'Font'):
                capabilities.append('font_rendering')
        except Exception as e:
            status['errors'].append(f'Font system check failed: {e}')
        
        status['capabilities'] = capabilities
        status['isAvailable'] = len(status['errors']) == 0 or len(capabilities) >= 3  # Allow partial functionality
        
except Exception as e:
    status['errors'].append(f'Comprehensive check failed: {str(e)}')

json.dumps(status)
`);
    
    return JSON.parse(statusResult);
  } catch (error) {
    defaultStatus.errors.push(`Error during comprehensive pygame status check: ${error}`);
    return defaultStatus;
  }
}

export function registerPygameShim(pyodide: any) {
  try {
    console.log('Registering enhanced pygame shim with real rendering...');
    
    // Set up JavaScript bridge functions for real rendering
    const drawCircleJS = (color: string, x: number, y: number, radius: number) => {
      if (canvasContext) {
        frameBuffer.push({ type: 'circle', args: [color, x, y, radius] });
      }
    };
    
    const drawRectJS = (color: string, x: number, y: number, width: number, height: number) => {
      if (canvasContext) {
        frameBuffer.push({ type: 'rect', args: [color, x, y, width, height] });
      }
    };
    
    const drawLineJS = (color: string, startX: number, startY: number, endX: number, endY: number, width: number) => {
      if (canvasContext) {
        frameBuffer.push({ type: 'line', args: [color, startX, startY, endX, endY, width] });
      }
    };
    
    const fillSurfaceJS = (color: string) => {
      if (canvasContext) {
        frameBuffer.push({ type: 'fill', args: [color] });
      }
    };
    
    const clearSurfaceJS = () => {
      if (canvasContext) {
        frameBuffer.push({ type: 'clear', args: [] });
      }
    };
    
    const flushFrameJS = () => {
      flushFrameBuffer();
    };
    
    // Expose JavaScript functions to Python through pyodide
    pyodide.globals.set('js_draw_circle', drawCircleJS);
    pyodide.globals.set('js_draw_rect', drawRectJS);
    pyodide.globals.set('js_draw_line', drawLineJS);
    pyodide.globals.set('js_fill_surface', fillSurfaceJS);
    pyodide.globals.set('js_clear_surface', clearSurfaceJS);
    pyodide.globals.set('js_flush_frame', flushFrameJS);
    
    // Create enhanced pygame module with real rendering capabilities
    pyodide.runPython(`
import sys

# Enhanced Surface class with real rendering capabilities
class RenderingSurface:
    def __init__(self, width=800, height=600, is_main=False):
        self.width = width
        self.height = height
        self.size = (width, height)
        self.is_main_surface = is_main
    
    def get_width(self):
        return self.width
    
    def get_height(self):
        return self.height
    
    def get_size(self):
        return self.size
    
    def get_rect(self):
        return PygameRect(0, 0, self.width, self.height)
    
    def convert(self):
        return self
    
    def convert_alpha(self):
        return self
    
    def fill(self, color):
        if self.is_main_surface:
            # Convert color to CSS and call JavaScript bridge
            if hasattr(color, '__len__') and len(color) >= 3:
                r = max(0, min(255, int(color[0])))
                g = max(0, min(255, int(color[1])))
                b = max(0, min(255, int(color[2])))
                css_color = f'rgb({r}, {g}, {b})'
            else:
                css_color = '#000000'
            js_fill_surface(css_color)
        return None
    
    def blit(self, source, dest):
        if self.is_main_surface:
            # For now, just log blit operations
            if hasattr(dest, '__len__') and len(dest) >= 2:
                x, y = dest[0], dest[1]
            else:
                x, y = 0, 0
            print(f"🖼️ Blit operation: {source.width}x{source.height} at ({x}, {y})")
        return None

# Enhanced Rect class with collision detection
class PygameRect:
    def __init__(self, x=0, y=0, width=100, height=100):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.left = x
        self.top = y
        self.right = x + width
        self.bottom = y + height
        self.centerx = x + width // 2
        self.centery = y + height // 2
        self.center = [self.centerx, self.centery]
    
    def colliderect(self, other):
        return not (self.right <= other.left or 
                   self.left >= other.right or 
                   self.bottom <= other.top or 
                   self.top >= other.bottom)
    
    def contains(self, point_or_rect):
        if hasattr(point_or_rect, '__len__') and len(point_or_rect) == 2:
            px, py = point_or_rect
            return px >= self.left and px < self.right and py >= self.top and py < self.bottom
        else:
            return (point_or_rect.left >= self.left and point_or_rect.right <= self.right and
                   point_or_rect.top >= self.top and point_or_rect.bottom <= self.bottom)
    
    def move(self, x, y):
        return PygameRect(self.x + x, self.y + y, self.width, self.height)
    
    def inflate(self, x, y):
        return PygameRect(self.x - x//2, self.y - y//2, self.width + x, self.height + y)

# Clock class for frame timing
class PygameClock:
    def __init__(self):
        self.last_tick = 0
        self.target_fps = 60
    
    def tick(self, fps=60):
        self.target_fps = fps
        # Return a simulated delta time
        return 16.67  # Roughly 60 FPS
    
    def get_fps(self):
        return self.target_fps
    
    def get_time(self):
        return 16.67  # Simulated frame time

# Font class for text rendering
class PygameFont:
    def __init__(self, fontname=None, size=36):
        self.size = size
        self.fontname = fontname or 'Arial'
    
    def render(self, text, antialias=True, color=(255, 255, 255)):
        # Calculate approximate text dimensions
        text_width = int(len(text) * self.size * 0.6)
        text_height = int(self.size * 1.2)
        return RenderingSurface(text_width, text_height)
    
    def size_text(self, text):
        text_width = int(len(text) * self.size * 0.6)
        text_height = int(self.size * 1.2)
        return (text_width, text_height)

# Sound class
class PygameSound:
    def __init__(self, file=None):
        self.volume = 1.0
        self.filename = file or 'unknown'
    
    def play(self):
        print(f"🔊 Playing sound: {self.filename}")
    
    def stop(self):
        print(f"🔇 Stopping sound: {self.filename}")
    
    def set_volume(self, vol):
        self.volume = max(0, min(1, vol))
    
    def get_volume(self):
        return self.volume

# Enhanced pygame module structure
class EnhancedPygame:
    def __init__(self):
        self.QUIT = 12
        self.KEYDOWN = 2
        self.KEYUP = 3
        self.MOUSEBUTTONDOWN = 5
        self.MOUSEBUTTONUP = 6
        self.K_ESCAPE = 27
        self.K_SPACE = 32
        self.K_LEFT = 276
        self.K_RIGHT = 275
        self.K_UP = 273
        self.K_DOWN = 274
        self.K_a = 97
        self.K_d = 100
        self.K_s = 115
        self.K_w = 119
    
    def init(self):
        return True
    
    def quit(self):
        pass

# Display module with real rendering calls
class PygameDisplay:
    def __init__(self):
        self.main_surface = None
    
    def set_mode(self, size=(800, 600)):
        self.main_surface = RenderingSurface(size[0], size[1], is_main=True)
        # Clear the canvas when setting mode
        js_clear_surface()
        return self.main_surface
    
    def set_caption(self, title):
        print(f"📺 Display caption: {title}")
    
    def flip(self):
        # Trigger frame buffer flush to actually render to canvas
        js_flush_frame()
    
    def update(self):
        # Trigger frame buffer flush to actually render to canvas
        js_flush_frame()
    
    def get_surface(self):
        return self.main_surface or RenderingSurface(800, 600, is_main=True)

# Enhanced draw module with real JavaScript bridge calls
class PygameDraw:
    def circle(self, surface, color, pos, radius):
        if hasattr(surface, 'is_main_surface') and surface.is_main_surface:
            # Convert color to CSS format
            css_color = self._color_to_css(color)
            # Call JavaScript bridge function
            js_draw_circle(css_color, pos[0], pos[1], radius)
    
    def rect(self, surface, color, rect):
        if hasattr(surface, 'is_main_surface') and surface.is_main_surface:
            # Parse rect parameter
            if hasattr(rect, '__len__') and len(rect) >= 4:
                x, y, width, height = rect[0], rect[1], rect[2], rect[3]
            elif hasattr(rect, 'x'):
                x, y, width, height = rect.x, rect.y, rect.width, rect.height
            else:
                x, y, width, height = 0, 0, 50, 50
            
            css_color = self._color_to_css(color)
            js_draw_rect(css_color, x, y, width, height)
    
    def line(self, surface, color, start, end, width=1):
        if hasattr(surface, 'is_main_surface') and surface.is_main_surface:
            css_color = self._color_to_css(color)
            js_draw_line(css_color, start[0], start[1], end[0], end[1], width)
    
    def polygon(self, surface, color, points):
        if hasattr(surface, 'is_main_surface') and surface.is_main_surface and len(points) > 1:
            css_color = self._color_to_css(color)
            # Draw polygon as connected lines
            for i in range(len(points)):
                start = points[i]
                end = points[(i + 1) % len(points)]
                js_draw_line(css_color, start[0], start[1], end[0], end[1], 1)
    
    def _color_to_css(self, color):
        """Convert pygame color to CSS color string"""
        if hasattr(color, '__len__') and len(color) >= 3:
            r = max(0, min(255, int(color[0])))
            g = max(0, min(255, int(color[1])))
            b = max(0, min(255, int(color[2])))
            if len(color) >= 4:
                a = max(0, min(1, color[3] / 255))
                return f'rgba({r}, {g}, {b}, {a})'
            return f'rgb({r}, {g}, {b})'
        return '#000000'

# Time module
class PygameTime:
    def Clock(self):
        return PygameClock()
    
    def get_ticks(self):
        # Return a simulated tick count
        return 60000  # Simulated
    
    def wait(self, milliseconds):
        print(f"⏱️ Pygame wait: {milliseconds}ms (simulated)")

# Font module
class PygameFont:
    def init(self):
        return True
    
    def Font(self, fontname=None, size=36):
        # Create a PygameFont instance - this is a separate class defined above
        # that accepts fontname and size parameters
        class FontInstance:
            def __init__(self, fontname=None, size=36):
                self.size = size
                self.fontname = fontname or 'Arial'
            
            def render(self, text, antialias=True, color=(255, 255, 255)):
                # Calculate approximate text dimensions
                text_width = int(len(text) * self.size * 0.6)
                text_height = int(self.size * 1.2)
                # Return a placeholder surface with appropriate dimensions
                return RenderingSurface(text_width, text_height)
        
        return FontInstance(fontname, size)
    
    def get_default_font(self):
        return 'Arial'

# Event, key, image, mixer, transform modules (simplified)
class PygameEvent:
    def get(self):
        return []
    
    def pump(self):
        pass
    
    def Event(self, type, dict=None):
        return {'type': type, **(dict or {})}

class PygameKey:
    def get_pressed(self):
        # Return array of 512 False values to prevent IndexError
        return [False] * 512
    
    def get_focused(self):
        return True

class PygameImage:
    def load(self, filename):
        print(f"🖼️ Loading image: {filename} (placeholder surface created)")
        return RenderingSurface(64, 64)

class PygameMixer:
    def __init__(self):
        self.music = PygameMusicModule()
    
    def init(self):
        return True
    
    def quit(self):
        print("🔇 Audio mixer stopped")
    
    def Sound(self, file):
        return PygameSound(file)

class PygameMusicModule:
    def load(self, filename):
        print(f"🎵 Loading music: {filename}")
    
    def play(self, loops=0):
        print(f"🎵 Playing music (loops: {loops})")
    
    def stop(self):
        print("🔇 Music stopped")
    
    def set_volume(self, volume):
        print(f"🔊 Music volume: {volume}")

class PygameTransform:
    def scale(self, surface, size):
        return RenderingSurface(size[0], size[1])
    
    def rotate(self, surface, angle):
        print(f"🔄 Rotating surface by {angle} degrees (placeholder)")
        return surface
    
    def flip(self, surface, xbool=False, ybool=False):
        print(f"🔄 Flipping surface (x:{xbool}, y:{ybool}) (placeholder)")
        return surface

# Create the enhanced pygame module
pygame = EnhancedPygame()
pygame.display = PygameDisplay()
pygame.draw = PygameDraw()
pygame.time = PygameTime()
pygame.font = PygameFont()
pygame.event = PygameEvent()
pygame.key = PygameKey()
pygame.image = PygameImage()
pygame.mixer = PygameMixer()
pygame.transform = PygameTransform()

# Add Rect constructor
pygame.Rect = PygameRect

# Add color constants
pygame.Color = {
    'RED': (255, 0, 0),
    'GREEN': (0, 255, 0),
    'BLUE': (0, 0, 255),
    'WHITE': (255, 255, 255),
    'BLACK': (0, 0, 0),
    'YELLOW': (255, 255, 0),
    'CYAN': (0, 255, 255),
    'MAGENTA': (255, 0, 255)
}

# Add to sys.modules
sys.modules['pygame'] = pygame

print("✅ Enhanced pygame shim with rendering bridge ready")
`);
    
    // Verify the enhanced shim was properly registered
    const verification = verifyPygameShimReady(pyodide);
    
    if (verification) {
      console.log("✅ Enhanced pygame shim registered and verified successfully");
      return true;
    } else {
      console.warn("⚠️ Enhanced pygame shim registered but verification failed");
      return false;
    }
  } catch (error) {
    console.error("❌ Failed to register enhanced pygame shim:", error);
    return false;
  }
}

export function simulatePygame(code: string): SimulationResult {
  const result: SimulationResult = {
    fps: 60,
    objects: []
  };

  // Safety guard: Validate input
  if (!code || typeof code !== 'string') {
    console.warn('simulatePygame: Invalid code input provided');
    return result;
  }

  // Simple simulation based on code analysis with enhanced safety
  try {
    console.log('simulatePygame: Analyzing code for pygame drawing commands');
    
    // Extract basic pygame drawing commands from code
    const lines = code.split('\n');
    let drawingCommandsFound = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for circle drawing with enhanced safety
      if (trimmed.includes('pygame.draw.circle') || trimmed.includes('draw.circle')) {
        drawingCommandsFound++;
        try {
          const match = trimmed.match(/circle\([^,]+,\s*([^,]+),\s*\(([^,]+),\s*([^)]+)\),\s*([^)]+)/);
          if (match) {
            const x = Math.max(0, Math.min(800, parseFloat(match[2]) || 400));
            const y = Math.max(0, Math.min(600, parseFloat(match[3]) || 300));
            const radius = Math.max(1, Math.min(100, parseFloat(match[4]) || 25));
            
            result.objects.push({
              type: 'circle',
              x: x,
              y: y,
              color: getColorFromCode(line, '#0066FF'),
              size: radius
            });
          } else {
            // Default circle if we can't parse exactly
            result.objects.push({
              type: 'circle',
              x: 400,
              y: 300,
              color: '#0066FF',
              size: 25
            });
          }
        } catch (circleError) {
          console.warn('simulatePygame: Error parsing circle command:', circleError);
          // Add default circle to maintain visual feedback
          result.objects.push({
            type: 'circle',
            x: 400,
            y: 300,
            color: '#0066FF',
            size: 25
          });
        }
      }
      
      // Look for rectangle drawing with enhanced safety
      if (trimmed.includes('pygame.draw.rect') || trimmed.includes('draw.rect')) {
        drawingCommandsFound++;
        try {
          // Try to parse rect coordinates if possible
          const rectMatch = trimmed.match(/rect\([^,]+,\s*([^,]+),\s*\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
          if (rectMatch) {
            const x = Math.max(0, Math.min(800, parseFloat(rectMatch[2]) || 300));
            const y = Math.max(0, Math.min(600, parseFloat(rectMatch[3]) || 200));
            const width = Math.max(1, Math.min(200, parseFloat(rectMatch[4]) || 50));
            
            result.objects.push({
              type: 'rect',
              x: x,
              y: y,
              color: getColorFromCode(line, '#FF0000'),
              size: width
            });
          } else {
            // Default rect
            result.objects.push({
              type: 'rect',
              x: 300,
              y: 200,
              color: '#FF0000',
              size: 50
            });
          }
        } catch (rectError) {
          console.warn('simulatePygame: Error parsing rect command:', rectError);
          // Add default rect to maintain visual feedback
          result.objects.push({
            type: 'rect',
            x: 300,
            y: 200,
            color: '#FF0000',
            size: 50
          });
        }
      }
    }
    
    // If movement variables are present, simulate animation
    if (code.includes('speed') || code.includes('velocity')) {
      result.objects = result.objects.map(obj => ({
        ...obj,
        x: obj.x + (Math.sin(Date.now() / 1000) * 50),
        y: obj.y + (Math.cos(Date.now() / 1000) * 30)
      }));
    }

    console.log(`simulatePygame: Found ${drawingCommandsFound} drawing commands, generated ${result.objects.length} objects`);
    
    // If no drawing commands found but pygame is imported, add a placeholder
    if (drawingCommandsFound === 0 && (code.includes('import pygame') || code.includes('pygame'))) {
      console.log('simulatePygame: Pygame project detected but no drawing commands found, adding placeholder');
      result.objects.push({
        type: 'circle',
        x: 400,
        y: 300,
        color: '#888888',
        size: 30
      });
    }
    
  } catch (error) {
    console.error('Error simulating pygame code:', error);
    // Add error indicator object
    result.objects.push({
      type: 'circle',
      x: 400,
      y: 300,
      color: '#FF0000',
      size: 20
    });
  }

  return result;
}

function getColorFromCode(line: string, defaultColor: string): string {
  // Simple color detection
  if (line.includes('BLUE') || line.includes('(0, 100, 255)')) return '#0066FF';
  if (line.includes('RED') || line.includes('(255, 0, 0)')) return '#FF0000';
  if (line.includes('GREEN') || line.includes('(0, 255, 0)')) return '#00FF00';
  if (line.includes('WHITE') || line.includes('(255, 255, 255)')) return '#FFFFFF';
  if (line.includes('BLACK') || line.includes('(0, 0, 0)')) return '#000000';
  if (line.includes('YELLOW') || line.includes('(255, 255, 0)')) return '#FFFF00';
  
  return defaultColor;
}

// Enhanced pygame error handler for better user experience
export function handlePygameError(error: Error, context: string): string {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('pygame')) {
    if (errorMessage.includes('display')) {
      return `🎮 Display Error: ${error.message}\n\n💡 This pygame project tried to create a display window. In the browser, graphics are simulated for preview purposes.`;
    }
    if (errorMessage.includes('mixer') || errorMessage.includes('sound')) {
      return `🔊 Audio Error: ${error.message}\n\n💡 Sound effects are simulated in browser preview. The game logic should still work correctly.`;
    }
    if (errorMessage.includes('image') || errorMessage.includes('load')) {
      return `🖼️ Image Error: ${error.message}\n\n💡 Image loading is simulated in browser preview. Check that image files are included in your project assets.`;
    }
    if (errorMessage.includes('event')) {
      return `⌨️ Input Error: ${error.message}\n\n💡 Keyboard and mouse events are simulated in browser preview. The game logic should still execute.`;
    }
    
    // Generic pygame error
    return `🎮 Pygame Error in ${context}: ${error.message}\n\n💡 This is a pygame-specific issue. The game may work differently when run locally with full pygame support.`;
  }
  
  // Non-pygame error
  return `⚠️ Error in ${context}: ${error.message}`;
}

// Enhanced diagnostics for pygame shim debugging
export function createPygameDiagnostics(pyodide: any): {
  fullReport: () => string;
  quickCheck: () => boolean;
  moduleStatus: () => { [key: string]: boolean };
} {
  return {
    fullReport: () => {
      if (!pyodide) return 'Pyodide not available';
      
      try {
        const report = pyodide.runPython(`
import sys
import json

report = {
    'pygame_available': 'pygame' in sys.modules,
    'pygame_modules': {},
    'python_version': sys.version,
    'sys_modules_count': len(sys.modules)
}

if 'pygame' in sys.modules:
    pygame = sys.modules['pygame']
    modules_to_check = ['display', 'draw', 'event', 'image', 'mixer', 'key', 'transform']
    
    for module in modules_to_check:
        report['pygame_modules'][module] = hasattr(pygame, module)
    
    # Test basic functionality
    try:
        screen = pygame.display.set_mode((100, 100))
        report['display_test'] = 'SUCCESS'
    except Exception as e:
        report['display_test'] = f'FAILED: {str(e)}'
    
    try:
        pygame.init()
        report['init_test'] = 'SUCCESS'
    except Exception as e:
        report['init_test'] = f'FAILED: {str(e)}'
else:
    report['pygame_modules'] = 'N/A - pygame not imported'

json.dumps(report, indent=2)
`);
        return report;
      } catch (error) {
        return `Diagnostics error: ${error}`;
      }
    },
    
    quickCheck: () => {
      if (!pyodide) return false;
      try {
        return pyodide.runPython(`
try:
    import pygame
    pygame.init()
    screen = pygame.display.set_mode((100, 100))
    True
except:
    False
`);
      } catch {
        return false;
      }
    },
    
    moduleStatus: () => {
      if (!pyodide) return {};
      try {
        const status = pyodide.runPython(`
import sys
import json

status = {}
if 'pygame' in sys.modules:
    pygame = sys.modules['pygame']
    modules = ['display', 'draw', 'event', 'image', 'mixer', 'key', 'transform']
    for module in modules:
        status[module] = hasattr(pygame, module)
else:
    status['pygame'] = False

json.dumps(status)
`);
        return JSON.parse(status);
      } catch {
        return { error: 'Failed to check module status' };
      }
    }
  };
}
