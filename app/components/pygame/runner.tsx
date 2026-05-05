// PyGame Runner Component - Executes compiled Python games using Pyodide
import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RefreshCw, Download, Maximize, Minimize, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { compilePythonGame } from '@lib/pygame/runtime/compiler';
import { getPyodide, recoverPyodide } from '@lib/python/pyodide-singleton';
import type { GameAsset } from '@lib/assets/types';
import { getEducationalError, type EducationalError } from '@lib/errors/educational';
import { loadWizardState } from '@lib/storage/persistence';

interface PygameRunnerProps {
  selectedComponents?: Record<string, string>;
  selectedAssets?: GameAsset[];
  previewMode?: string;
  className?: string;
  onError?: (error: string) => void;
  onClose?: () => void;
}

// Pyodide globals are declared in src/types/pyodide.d.ts.

export default function PygameRunner({
  selectedComponents = {},
  selectedAssets = [],
  previewMode = 'full',
  className = '',
  onError,
  onClose,
}: PygameRunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pyodideRef = useRef<PyodideInstance | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // We hold both the friendly mapped message (shown to the kid) and the raw
  // exception text (tucked behind a "Show details" disclosure). Keeping them
  // paired lets us never have to choose between teaching tone and debuggability.
  const [error, setError] = useState<EducationalError | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // P9.3 — track how many times recovery has been attempted in this mount
  // so we can flip to a "still failing" message after the first retry. The
  // friendly first-attempt copy is reassuring; if recovery itself blew up
  // (e.g., CDN down) the kid needs a different message + an offline-aware
  // retry rather than the same "Try again" loop.
  const recoveryAttemptsRef = useRef(0);
  const [recoveryFailed, setRecoveryFailed] = useState(false);

  // Initialize Pyodide. setupCanvasBridge is intentionally NOT in deps:
  // it's a stable closure that doesn't reference reactive state (only refs +
  // a static Python string), and including it forces a forward reference in
  // the file. Stable function — safe to omit.
  // biome-ignore lint/correctness/useExhaustiveDependencies: stable closure (refs + static code), see comment above
  const initPyodide = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      pyodideRef.current = await getPyodide();
      await setupCanvasBridge();
      setIsLoading(false);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const friendly = getEducationalError(raw);
      setError(friendly);
      setIsLoading(false);
      if (onError) onError(raw);
    }
  }, [onError]);

  // Setup bridge between Pyodide and canvas
  const setupCanvasBridge = async () => {
    if (!pyodideRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const _ctx = canvas.getContext('2d');

    // Inject canvas functions into Python environment
    pyodideRef.current.runPython(`
import sys
import js
from pyodide.ffi import to_js

class BrowserCanvas:
    def __init__(self):
        self.canvas = js.document.getElementById('pygame-canvas')
        self.ctx = self.canvas.getContext('2d')
        self.width = 800
        self.height = 600
        
    def clear(self, color=(0, 0, 0)):
        self.ctx.fillStyle = f'rgb({color[0]}, {color[1]}, {color[2]})'
        self.ctx.fillRect(0, 0, self.width, self.height)
        
    def draw_circle(self, color, pos, radius):
        self.ctx.fillStyle = f'rgb({color[0]}, {color[1]}, {color[2]})'
        self.ctx.beginPath()
        self.ctx.arc(pos[0], pos[1], radius, 0, 2 * 3.14159)
        self.ctx.fill()
        
    def draw_rect(self, color, rect):
        self.ctx.fillStyle = f'rgb({color[0]}, {color[1]}, {color[2]})'
        self.ctx.fillRect(rect[0], rect[1], rect[2], rect[3])
        
    def draw_line(self, color, start, end, width=1):
        self.ctx.strokeStyle = f'rgb({color[0]}, {color[1]}, {color[2]})'
        self.ctx.lineWidth = width
        self.ctx.beginPath()
        self.ctx.moveTo(start[0], start[1])
        self.ctx.lineTo(end[0], end[1])
        self.ctx.stroke()
        
    def draw_text(self, text, pos, color=(255, 255, 255), size=16):
        self.ctx.fillStyle = f'rgb({color[0]}, {color[1]}, {color[2]})'
        self.ctx.font = f'{size}px monospace'
        self.ctx.fillText(text, pos[0], pos[1])
    
    def fill(self, color):
        self.clear(color)
    
    def blit(self, surface, pos_or_rect):
        # Simplified blit - just draw a placeholder rectangle
        if hasattr(pos_or_rect, '__iter__'):
            x, y = pos_or_rect[0], pos_or_rect[1]
        else:
            x, y = pos_or_rect.x, pos_or_rect.y
        self.ctx.fillStyle = 'rgba(128, 128, 128, 0.5)'
        self.ctx.fillRect(x, y, 32, 32)

# Global canvas instance
browser_canvas = BrowserCanvas()

# Surface mock for pygame
class Surface:
    def __init__(self, size=(32, 32)):
        self.width = size[0] if hasattr(size, '__iter__') else 32
        self.height = size[1] if hasattr(size, '__iter__') else 32
    
    def fill(self, color):
        pass  # No-op for mock
    
    def get_rect(self, **kwargs):
        # Bind outer Surface dims into locals so the inner Rect can close
        # over them. Reading self.width inside Rect.__init__ would raise
        # AttributeError because Rect.__init__ has its own self.
        w = self.width
        h = self.height
        class Rect:
            def __init__(self):
                self.x = 0
                self.y = 0
                self.width = w
                self.height = h
                self.center = kwargs.get('center', (w // 2, h // 2))
        return Rect()
    
    def blit(self, source, dest):
        pass  # No-op for mock

# Mock pygame module
class MockPygame:
    class display:
        @staticmethod
        def set_mode(size):
            return browser_canvas
            
        @staticmethod
        def flip():
            pass
            
        @staticmethod
        def set_caption(title):
            pass
    
    class draw:
        @staticmethod
        def circle(surface, color, pos, radius):
            browser_canvas.draw_circle(color, pos, radius)
            
        @staticmethod
        def rect(surface, color, rect):
            browser_canvas.draw_rect(color, rect)
            
        @staticmethod
        def line(surface, color, start, end, width=1):
            browser_canvas.draw_line(color, start, end, width)
    
    class font:
        @staticmethod
        def Font(name, size):
            class TextRenderer:
                def render(self, text, antialias, color):
                    return Surface((len(text) * 8, 16))  # Return a Surface
            return TextRenderer()
    
    class image:
        @staticmethod
        def load(path):
            # Return a mock surface for any image
            return Surface((32, 32))
    
    class transform:
        @staticmethod
        def scale(surface, size):
            # Return a new surface with the target size
            return Surface(size)
    
    class mixer:
        class Sound:
            def __init__(self, path=None):
                self.path = path
            def play(self, loops=0):
                pass  # No-op for mock
            def stop(self):
                pass
        
        class music:
            @staticmethod
            def load(path):
                pass  # No-op
            @staticmethod
            def play(loops=-1):
                pass  # No-op
            @staticmethod
            def stop():
                pass  # No-op
        
        @staticmethod
        def init():
            pass  # No-op
        
        @staticmethod
        def Sound(path):
            return MockPygame.mixer.Sound(path)
    
    class event:
        @staticmethod
        def get():
            return []
    
    class key:
        @staticmethod
        def get_pressed():
            # Return a dict-like object that returns False for any key
            class Keys:
                def __getitem__(self, key):
                    # Return False for all keys by default
                    return False
            return Keys()
    
    class time:
        class Clock:
            def tick(self, fps):
                return 16
    
    @staticmethod
    def init():
        pass
    
    @staticmethod
    def quit():
        pass
    
    # Export Surface class
    Surface = Surface
    
    # Key constants
    QUIT = 12
    K_SPACE = 32
    K_LEFT = 276
    K_RIGHT = 275
    K_UP = 273
    K_DOWN = 274
    K_a = 97
    K_d = 100
    K_w = 119
    K_s = 115
    K_r = 114
    K_x = 120

# Replace pygame with mock
pygame = MockPygame()
sys.modules['pygame'] = pygame

# Expose Surface at module level
pygame.Surface = Surface

# Setup keyboard state tracking
class KeyState:
    def __init__(self):
        self.keys = {}
        # Initialize common keys to False
        for key in [32, 273, 274, 275, 276, 97, 100, 114, 115, 119, 120]:
            self.keys[key] = False
    
    def __getitem__(self, key):
        return self.keys.get(key, False)
    
    def set_key(self, key, state):
        self.keys[key] = state

# Global key state instance
global_key_state = KeyState()

# Update MockPygame.key.get_pressed to use global state
MockPygame.key.get_pressed = lambda: global_key_state
    `);
  };

  // Run the compiled game
  const runGame = useCallback(async () => {
    if (!pyodideRef.current) {
      await initPyodide();
    }

    if (!pyodideRef.current) {
      setError(getEducationalError('Pyodide not initialized'));
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      // Compile the game
      const pythonCode = compilePythonGame(selectedComponents, selectedAssets);

      // Prepare the game code for browser execution
      // We don't modify the code directly - let the mock pygame handle it
      const browserCode = pythonCode.replace(/if __name__ == "__main__":/g, 'if True:'); // Always run in browser

      // Run the game with our pygame mock
      await pyodideRef.current.runPythonAsync(browserCode);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(getEducationalError(raw));
      if (onError) onError(raw);
    } finally {
      setIsRunning(false);
    }
  }, [selectedComponents, selectedAssets, onError, initPyodide]);

  // Stop the game
  const stopGame = useCallback(() => {
    setIsRunning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    stopGame();
    setError(null);
    runGame();
  }, [stopGame, runGame]);

  // Download game as Python file
  const downloadGame = useCallback(() => {
    const pythonCode = compilePythonGame(selectedComponents, selectedAssets);
    const blob = new Blob([pythonCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_pygame_${Date.now()}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedComponents, selectedAssets]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Initialize on mount
  useEffect(() => {
    initPyodide();
    return () => {
      stopGame();
    };
  }, [initPyodide, stopGame]);

  return (
    <Card className={`${className} ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}`}>
      <div className="flex flex-col h-full">
        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              onClick={isRunning ? stopGame : runGame}
              disabled={isLoading}
              variant={isRunning ? 'destructive' : 'default'}
              size="sm"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Game
                </>
              )}
            </Button>

            <Button
              onClick={resetGame}
              disabled={isLoading || !isRunning}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={downloadGame} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button onClick={toggleFullscreen} variant="outline" size="sm">
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>

            {onClose && (
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Game Canvas */}
        <div className="flex-1 flex items-center justify-center bg-black p-4">
          {isLoading ? (
            <div className="text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading Pyodide...</p>
            </div>
          ) : recoveryFailed ? (
            // P9.3 — recovery itself failed. Almost always a network /
            // CDN-down situation; the previous error overlay's "Try again"
            // copy promised the runtime would reset. It didn't, so use a
            // distinct headline and surface offline-awareness.
            <div
              className="text-center max-w-md text-white"
              data-testid="runner-recovery-failed-panel"
            >
              <p className="font-bold mb-2 text-2xl">📡 Still couldn&apos;t reach Python</p>
              <p className="text-sm mb-4 opacity-80 break-words">
                {navigator.onLine === false
                  ? 'Looks like your internet is off. Reconnect and tap below to try again.'
                  : 'The Python runtime is on a CDN; it might be slow or unreachable right now. Try again in a moment, or come back later — your project is saved.'}
              </p>
              <Button
                onClick={async () => {
                  setRecoveryFailed(false);
                  recoveryAttemptsRef.current = 0;
                  pyodideRef.current = null;
                  setError(null);
                  try {
                    await initPyodide();
                  } catch {
                    setRecoveryFailed(true);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                data-testid="runner-recovery-failed-retry"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try once more
              </Button>
            </div>
          ) : error ? (
            <div className="text-center max-w-md text-white" data-testid="runner-error-panel">
              <p className="font-bold mb-2 text-2xl">😟 {error.friendlyMessage}</p>
              <p className="text-sm mb-4 opacity-80 break-words">{error.explanation}</p>
              <p className="text-sm mb-4">
                Don&apos;t worry — this kind of thing happens. Click below to reset the Python
                runtime and try again. Your wizard progress is safe.
              </p>
              <details className="text-left text-xs opacity-70 mb-4">
                <summary className="cursor-pointer hover:opacity-100">Show details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">{error.originalError}</pre>
              </details>
              <Button
                onClick={async () => {
                  recoverPyodide();
                  // recoverPyodide() drops the singleton + window.pyodide,
                  // but pyodideRef still points at the now-stale instance.
                  // Clear the local ref so initPyodide() runs a real fresh
                  // bootstrap rather than skipping the work because the ref
                  // looks populated.
                  pyodideRef.current = null;
                  setError(null);
                  recoveryAttemptsRef.current += 1;
                  // P9.1 — wizard state is in localStorage and survives the
                  // Python runtime drop, so the parent's selectedComponents
                  // props rerender us with the same project data after
                  // recovery. We touch loadWizardState() defensively to
                  // confirm the kid's project is still there; if the slot
                  // is empty (private mode, storage cleared), there's
                  // nothing to preserve and we fall through anyway.
                  void loadWizardState();
                  try {
                    await initPyodide();
                  } catch {
                    // setError already fired inside initPyodide's catch.
                    // After the first failed retry, switch to the recovery-
                    // failed branch so the kid gets a distinct message
                    // instead of the same "Try again" loop.
                    if (recoveryAttemptsRef.current >= 1) {
                      setRecoveryFailed(true);
                    }
                  } finally {
                    setIsLoading(false);
                  }
                }}
                data-testid="runner-recover-button"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            </div>
          ) : (
            <canvas
              id="pygame-canvas"
              ref={canvasRef}
              width={800}
              height={600}
              className="border border-gray-700 max-w-full h-auto"
              style={{ imageRendering: 'pixelated' }}
            />
          )}
        </div>

        {/* Status */}
        {previewMode && (
          <div className="p-2 bg-gray-100 dark:bg-gray-900 text-center text-sm">
            Preview Mode: {previewMode}
          </div>
        )}
      </div>
    </Card>
  );
}
