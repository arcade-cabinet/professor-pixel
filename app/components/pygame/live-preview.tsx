import { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Play, Pause, RotateCcw, Zap, Volume2, 
  Gamepad2, Sparkles, FlaskConical, Split
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { 
  setCanvasContext, 
  flushFrameBuffer, 
  createPygameEnvironment,
  resetPygameState
} from '@/lib/pygame-simulation';
import { PythonRunner } from '@/lib/python/runner';
import { generatePygameCode } from './pygame-code-generator';

export interface GameChoice {
  type: 'character' | 'enemy' | 'collectible' | 'background' | 'rule' | 'mechanic';
  id: string;
  name: string;
  properties?: Record<string, any>;
  sprite?: string;
  behavior?: string;
  code?: string;
}

interface PygameLivePreviewProps {
  choices: GameChoice[];
  currentStep?: string;
  showComparison?: boolean;
  alternativeChoice?: GameChoice;
  onInteraction?: (action: string, details?: any) => void;
  className?: string;
  pixelComments?: string[];
  pyodide?: any;
}

interface PreviewState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  fps: number;
  interactions: string[];
  score: number;
  lives: number;
}

export default function PygameLivePreview({
  choices,
  currentStep = 'idle',
  showComparison = false,
  alternativeChoice,
  onInteraction,
  className,
  pixelComments = [],
  pyodide
}: PygameLivePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const comparisonCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pythonRunnerRef = useRef<PythonRunner | null>(null);
  const { toast } = useToast();

  const [state, setState] = useState<PreviewState>({
    isPlaying: false,
    isLoading: false,
    error: null,
    fps: 60,
    interactions: [],
    score: 0,
    lives: 3
  });

  const [gameParams, setGameParams] = useState({
    speed: 5,
    jumpHeight: 10,
    enemySpeed: 3
  });

  // Initialize Python runner when Pyodide is ready
  useEffect(() => {
    if (pyodide && !pythonRunnerRef.current) {
      pythonRunnerRef.current = new PythonRunner(pyodide);
      // Setup pygame environment
      try {
        const pygameEnv = createPygameEnvironment();
        pyodide.globals.set('pygame', pygameEnv);
        console.log('Pygame environment initialized');
      } catch (error) {
        console.error('Failed to setup pygame environment:', error);
      }
    }
  }, [pyodide]);

  // Generate and execute Python code when choices change
  const executePygameCode = useCallback(async (targetCanvas: HTMLCanvasElement, choicesToUse: GameChoice[]) => {
    if (!pyodide || !pythonRunnerRef.current || !targetCanvas) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get canvas context and set it for pygame bridge
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      setCanvasContext(ctx);

      // Generate pygame code from choices
      const code = generatePygameCode(choicesToUse, gameParams);
      
      // Execute the code
      const result = await pythonRunnerRef.current.runSnippet({ code });
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Start render loop
      startRenderLoop(targetCanvas);
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        isPlaying: true 
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute pygame code';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage,
        isPlaying: false
      }));
      
      // Show friendly error message
      toast({
        title: "Oops! Something went wrong",
        description: "Don't worry, let's try adjusting your choices!",
        variant: "default"
      });
    }
  }, [pyodide, gameParams, toast]);

  // Render loop for canvas animation
  const startRenderLoop = useCallback((canvas: HTMLCanvasElement) => {
    const render = () => {
      // Flush pygame frame buffer to canvas
      flushFrameBuffer();
      
      // Continue animation if playing
      if (state.isPlaying) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };
    
    // Start the loop
    animationFrameRef.current = requestAnimationFrame(render);
  }, [state.isPlaying]);

  // Stop render loop
  const stopRenderLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Handle play/pause
  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      stopRenderLoop();
      setState(prev => ({ ...prev, isPlaying: false }));
    } else {
      if (canvasRef.current) {
        executePygameCode(canvasRef.current, choices);
      }
    }
  }, [state.isPlaying, choices, executePygameCode, stopRenderLoop]);

  // Handle reset
  const handleReset = useCallback(() => {
    stopRenderLoop();
    resetPygameState();
    setState(prev => ({ 
      ...prev, 
      isPlaying: false,
      score: 0,
      lives: 3,
      interactions: []
    }));
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, [stopRenderLoop]);

  // Handle canvas interactions
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state.isPlaying) return;

    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Send interaction to pygame
    if (pyodide) {
      try {
        pyodide.runPython(`
          if 'handle_click' in globals():
              handle_click(${x}, ${y})
        `);
        
        // Track interaction
        const interaction = `Click at (${Math.round(x)}, ${Math.round(y)})`;
        setState(prev => ({
          ...prev,
          interactions: [...prev.interactions, interaction].slice(-5)
        }));

        // Notify parent
        onInteraction?.('click', { x, y });
      } catch (error) {
        console.error('Failed to handle click:', error);
      }
    }
  }, [state.isPlaying, pyodide, onInteraction]);

  // Auto-play when choices change
  useEffect(() => {
    if (choices.length > 0 && canvasRef.current && pyodide) {
      executePygameCode(canvasRef.current, choices);
    }
  }, [choices, pyodide]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRenderLoop();
      setCanvasContext(null);
      resetPygameState();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Preview Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Gamepad2 className="h-5 w-5" />
                Live Preview
              </CardTitle>
              {state.isPlaying && (
                <Badge variant="outline" className="animate-pulse">
                  <Zap className="h-3 w-3 mr-1" />
                  Running
                </Badge>
              )}
            </div>
            
            {/* FPS Counter */}
            <Badge variant="secondary">
              {state.fps} FPS
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Canvas Container */}
          <div className={cn(
            "relative rounded-lg overflow-hidden bg-slate-900",
            showComparison ? "grid grid-cols-2 gap-2" : ""
          )}>
            {/* Main Canvas */}
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={showComparison ? 320 : 640}
                height={360}
                className="w-full h-auto cursor-pointer"
                onClick={handleCanvasClick}
                data-testid="canvas-main-preview"
              />
              
              {/* Loading Overlay */}
              {state.isLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <FlaskConical className="h-8 w-8 text-white animate-bounce" />
                    <span className="text-white text-sm">Brewing your game...</span>
                  </div>
                </div>
              )}
              
              {/* Error Overlay */}
              {state.error && (
                <div className="absolute inset-0 bg-red-900/20 flex items-center justify-center p-4">
                  <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg p-4 max-w-sm">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {state.error}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Comparison Canvas */}
            {showComparison && alternativeChoice && (
              <div className="relative border-l-2 border-gray-600">
                <canvas
                  ref={comparisonCanvasRef}
                  width={320}
                  height={360}
                  className="w-full h-auto cursor-pointer"
                  data-testid="canvas-comparison-preview"
                />
                <Badge 
                  className="absolute top-2 right-2" 
                  variant="outline"
                >
                  Alternative
                </Badge>
              </div>
            )}
          </div>

          {/* Control Panel */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={state.isPlaying ? "default" : "outline"}
                onClick={togglePlayPause}
                disabled={!pyodide || state.isLoading}
                data-testid="button-play-pause-preview"
              >
                {state.isPlaying ? (
                  <><Pause className="h-4 w-4 mr-1" /> Pause</>
                ) : (
                  <><Play className="h-4 w-4 mr-1" /> Play</>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={state.isLoading}
                data-testid="button-reset-preview"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>

              {showComparison && (
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="button-toggle-split"
                >
                  <Split className="h-4 w-4 mr-1" />
                  Compare
                </Button>
              )}
            </div>

            {/* Game Stats */}
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline">
                Score: {state.score}
              </Badge>
              <Badge variant="outline">
                Lives: {state.lives}
              </Badge>
            </div>
          </div>

          {/* Parameter Controls */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Speed</label>
                <Slider
                  value={[gameParams.speed]}
                  onValueChange={([value]) => setGameParams(prev => ({ ...prev, speed: value }))}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                  data-testid="slider-speed"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium">Jump Height</label>
                <Slider
                  value={[gameParams.jumpHeight]}
                  onValueChange={([value]) => setGameParams(prev => ({ ...prev, jumpHeight: value }))}
                  max={20}
                  min={5}
                  step={1}
                  className="w-full"
                  data-testid="slider-jump"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium">Enemy Speed</label>
                <Slider
                  value={[gameParams.enemySpeed]}
                  onValueChange={([value]) => setGameParams(prev => ({ ...prev, enemySpeed: value }))}
                  max={8}
                  min={1}
                  step={1}
                  className="w-full"
                  data-testid="slider-enemy-speed"
                />
              </div>
            </div>
          </div>

          {/* Pixel Comments */}
          {pixelComments.length > 0 && (
            <AnimatePresence mode="wait">
              {pixelComments.map((comment, index) => (
                <motion.div
                  key={`${comment}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5" />
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      {comment}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Recent Interactions */}
          {state.interactions.length > 0 && (
            <div className="border-t pt-3">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Recent Actions
              </h4>
              <div className="flex flex-wrap gap-1">
                {state.interactions.map((interaction, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {interaction}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}