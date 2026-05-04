import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FlaskConical, 
  Gamepad2, 
  Code, 
  Play, 
  AlertCircle,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import WizardWithPreview from '@/components/wizard-with-preview';
import PygameLivePreview, { GameChoice } from '@/components/pygame-live-preview';
import { generateTestCode } from '@/components/pygame-code-generator';

declare global {
  interface Window {
    loadPyodide?: () => Promise<any>;
  }
}

export default function PygamePreviewTest() {
  const [pyodide, setPyodide] = useState<any>(null);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const [pyodideError, setPyodideError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('wizard');

  // Test choices for standalone preview
  const testChoices: GameChoice[] = [
    {
      type: 'character',
      id: 'robot',
      name: 'Robot Hero',
      properties: { speed: 5, jumpHeight: 12 }
    },
    {
      type: 'enemy',
      id: 'guard',
      name: 'Patrol Guard',
      behavior: 'patrol',
      properties: { speed: 3 }
    },
    {
      type: 'collectible',
      id: 'coin',
      name: 'Gold Coin',
      properties: { value: 10 }
    },
    {
      type: 'background',
      id: 'sky',
      name: 'Sky Kingdom'
    }
  ];

  // Load Pyodide
  useEffect(() => {
    loadPyodide();
  }, []);

  const loadPyodide = async () => {
    if (pyodide) return;
    
    setPyodideLoading(true);
    setPyodideError(null);
    
    try {
      // Add Pyodide script if not already loaded
      if (!document.getElementById('pyodide-script')) {
        const script = document.createElement('script');
        script.id = 'pyodide-script';
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
        script.async = true;
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      // Load Pyodide
      if (window.loadPyodide) {
        console.log('Loading Pyodide...');
        const pyodideInstance = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
        });
        
        // Setup pygame environment
        await setupPygameEnvironment(pyodideInstance);
        
        setPyodide(pyodideInstance);
        console.log('Pyodide loaded successfully!');
      } else {
        throw new Error('Pyodide loader not available');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load Pyodide';
      setPyodideError(errorMessage);
      console.error('Pyodide loading error:', error);
    } finally {
      setPyodideLoading(false);
    }
  };

  const setupPygameEnvironment = async (pyodideInstance: any) => {
    try {
      // Import pygame module from our simulation
      const pygameCode = `
import sys
import types

# Create pygame module
pygame = types.ModuleType('pygame')
pygame.locals = types.ModuleType('pygame.locals')

# Add to sys.modules
sys.modules['pygame'] = pygame
sys.modules['pygame.locals'] = pygame.locals

# Basic pygame initialization
pygame.init = lambda: print("Pygame initialized")
pygame.quit = lambda: print("Pygame quit")

# Add display module
pygame.display = types.ModuleType('pygame.display')
pygame.display.set_mode = lambda size: type('Surface', (), {'fill': lambda self, color: None, 'blit': lambda self, src, dest: None})()
pygame.display.flip = lambda: None
pygame.display.update = lambda: None
pygame.display.set_caption = lambda title: None

# Add event module
pygame.event = types.ModuleType('pygame.event')
pygame.event.get = lambda: []
pygame.event.poll = lambda: None

# Add key module
pygame.key = types.ModuleType('pygame.key')
pygame.key.get_pressed = lambda: [False] * 512

# Add time module
pygame.time = types.ModuleType('pygame.time')
class Clock:
    def tick(self, fps=60): return 16
    def get_fps(self): return 60
pygame.time.Clock = Clock

# Add font module
pygame.font = types.ModuleType('pygame.font')
class Font:
    def __init__(self, name, size): pass
    def render(self, text, antialias, color): 
        return type('Surface', (), {'get_width': lambda: 100, 'get_height': lambda: 30})()
pygame.font.Font = Font

# Add draw module
pygame.draw = types.ModuleType('pygame.draw')
pygame.draw.circle = lambda surface, color, pos, radius: None
pygame.draw.rect = lambda surface, color, rect: None
pygame.draw.line = lambda surface, color, start, end, width=1: None
pygame.draw.polygon = lambda surface, color, points: None
pygame.draw.ellipse = lambda surface, color, rect: None

# Add Rect class
class Rect:
    def __init__(self, x, y, width, height):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.left = x
        self.top = y
        self.right = x + width
        self.bottom = y + height
pygame.Rect = Rect

# Add constants
pygame.QUIT = 12
pygame.KEYDOWN = 2
pygame.KEYUP = 3
pygame.K_LEFT = 276
pygame.K_RIGHT = 275
pygame.K_UP = 273
pygame.K_DOWN = 274
pygame.K_SPACE = 32
pygame.K_x = 120
pygame.K_LSHIFT = 304

# Add to pygame.locals
for key in ['QUIT', 'KEYDOWN', 'KEYUP', 'K_LEFT', 'K_RIGHT', 'K_UP', 'K_DOWN', 'K_SPACE', 'K_x', 'K_LSHIFT']:
    setattr(pygame.locals, key, getattr(pygame, key))

print("Pygame environment setup complete")
`;
      
      await pyodideInstance.runPythonAsync(pygameCode);
      console.log('Pygame environment initialized in Pyodide');
    } catch (error) {
      console.error('Failed to setup pygame environment:', error);
      throw error;
    }
  };

  const generateSampleCode = () => {
    return generateTestCode();
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gamepad2 className="h-8 w-8 text-purple-600" />
                <div>
                  <CardTitle className="text-2xl">Pygame Live Preview Test</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Test the live Pyodide preview system with wizard integration
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pyodideLoading && (
                  <Badge variant="outline" className="animate-pulse">
                    <FlaskConical className="h-3 w-3 mr-1" />
                    Loading Pyodide...
                  </Badge>
                )}
                {pyodide && !pyodideLoading && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Pyodide Ready
                  </Badge>
                )}
                {pyodideError && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Status Alert */}
        {pyodideError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {pyodideError}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={loadPyodide}
                className="ml-4"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="wizard">
              <Sparkles className="h-4 w-4 mr-2" />
              Wizard Flow
            </TabsTrigger>
            <TabsTrigger value="standalone">
              <Play className="h-4 w-4 mr-2" />
              Standalone
            </TabsTrigger>
            <TabsTrigger value="code">
              <Code className="h-4 w-4 mr-2" />
              Code
            </TabsTrigger>
          </TabsList>

          {/* Wizard Integration Tab */}
          <TabsContent value="wizard" className="mt-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Game Creation Wizard with Live Preview</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Follow the wizard to create a game and see it come to life in real-time!
                  </p>
                </CardHeader>
                <CardContent>
                  {pyodide ? (
                    <WizardWithPreview pyodide={pyodide} />
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Waiting for Pyodide to load... This enables the live preview functionality.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Standalone Preview Tab */}
          <TabsContent value="standalone" className="mt-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Standalone Preview Component</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Test the preview component with predefined game choices
                  </p>
                </CardHeader>
                <CardContent>
                  {pyodide ? (
                    <PygameLivePreview
                      choices={testChoices}
                      currentStep="test"
                      pyodide={pyodide}
                      pixelComments={[
                        "This is a test preview!",
                        "Try the controls below!",
                        "Adjust the parameters!"
                      ]}
                      onInteraction={(action, details) => {
                        console.log('Test interaction:', action, details);
                      }}
                    />
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Pyodide is required for the preview. {pyodideLoading ? 'Loading...' : 'Please wait or refresh.'}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Generated Code Tab */}
          <TabsContent value="code" className="mt-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Generated Python/Pygame Code</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    View the Python code generated from the wizard choices
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                      <code>{generateSampleCode()}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        navigator.clipboard.writeText(generateSampleCode());
                      }}
                    >
                      Copy Code
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Feature Checklist */}
              <Card>
                <CardHeader>
                  <CardTitle>Implementation Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      'Canvas display with real-time updates',
                      'Pyodide integration for Python execution',
                      'Component rendering from wizard choices',
                      'Play/pause/reset controls',
                      'Parameter adjustment sliders',
                      'Interactive click handling',
                      'Live pixel comments',
                      'Error handling with fallbacks',
                      'Code generation from choices',
                      'Before/after comparisons'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}