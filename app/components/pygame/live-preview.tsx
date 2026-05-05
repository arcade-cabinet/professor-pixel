import { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Volume2,
  Gamepad2,
  Sparkles,
  FlaskConical,
  Split,
} from 'lucide-react';
import { cn } from '@lib/utils/cn';
import { getEducationalError, type EducationalError } from '@lib/errors/educational';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@lib/hooks/use-toast';
import {
  setCanvasContext,
  flushFrameBuffer,
  createPygameEnvironment,
  resetPygameState,
} from '@lib/pygame/runtime/simulator';
import { PythonRunner } from '@lib/python/runner';
import { generatePygameCode } from '@lib/wizard/code-generator';

export interface GameChoice {
  type: 'character' | 'enemy' | 'collectible' | 'background' | 'rule' | 'mechanic';
  id: string;
  name: string;
  properties?: Record<string, unknown>;
  sprite?: string;
  behavior?: string;
  code?: string;
}

interface PygameLivePreviewProps {
  choices: GameChoice[];
  currentStep?: string;
  showComparison?: boolean;
  alternativeChoice?: GameChoice;
  onInteraction?: (action: string, details?: unknown) => void;
  className?: string;
  pixelComments?: string[];
  pyodide?: PyodideInstance;
}

interface PreviewState {
  isPlaying: boolean;
  // Distinct from !isPlaying — "paused" means the rAF loop is halted but the
  // Pyodide globals + canvas state are intact. Resume just restarts rAF; it
  // does NOT re-execute the kid's code. Switching from paused→stopped (Reset)
  // tears everything down.
  isPaused: boolean;
  isLoading: boolean;
  // Hold the full mapped EducationalError so the overlay can show the
  // friendly headline AND the contextual explanation/details — not just a
  // single line. Storing only the string would throw away learningTips,
  // nextSteps, and the original error text the kid (or a helping adult)
  // needs to debug.
  error: EducationalError | null;
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
  pyodide,
}: PygameLivePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const comparisonCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pythonRunnerRef = useRef<PythonRunner | null>(null);
  const { toast } = useToast();

  const [state, setState] = useState<PreviewState>({
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    error: null,
    fps: 60,
    interactions: [],
    score: 0,
    lives: 3,
  });

  // The render loop reads state.isPlaying via closure; we need an additional
  // ref so we can flip "paused" without recreating the rAF callback. The rAF
  // body checks isPausedRef.current each frame; flipping it stops scheduling
  // without cancelling the in-flight frame.
  const isPausedRef = useRef(false);
  // Mount guard — the render() body always re-schedules itself, so an
  // in-flight tick that lands AFTER stopRenderLoop() cancels its frame would
  // otherwise schedule a new frame against a now-unmounted component and
  // call flushFrameBuffer on a torn-down canvas. isActiveRef.current=false
  // tells render() to bail without re-scheduling.
  const isActiveRef = useRef(false);

  const [gameParams, setGameParams] = useState({
    speed: 5,
    jumpHeight: 10,
    enemySpeed: 3,
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

  // Render loop for canvas animation. While paused the loop fully exits
  // (no zombie rAFs spinning each frame doing nothing) — togglePlayPause
  // re-invokes startRenderLoop on resume to reschedule. Cancel any pre-
  // existing frame before starting so re-entry can't stack overlapping
  // loops.
  const startRenderLoop = useCallback((_canvas: HTMLCanvasElement) => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isActiveRef.current = true;
    const render = () => {
      if (!isActiveRef.current) return;
      if (isPausedRef.current) {
        // Exit the loop entirely — resume will re-prime via startRenderLoop.
        animationFrameRef.current = null;
        return;
      }
      flushFrameBuffer();
      animationFrameRef.current = requestAnimationFrame(render);
    };
    animationFrameRef.current = requestAnimationFrame(render);
  }, []);

  // Generate and execute Python code when choices change
  const executePygameCode = useCallback(
    async (targetCanvas: HTMLCanvasElement, choicesToUse: GameChoice[]) => {
      if (!pyodide || !pythonRunnerRef.current || !targetCanvas) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

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
        isPausedRef.current = false;
        startRenderLoop(targetCanvas);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: true,
          isPaused: false,
        }));
      } catch (error) {
        // Don't pipe the raw exception text into the kid-facing overlay —
        // route through the educational mapper so "TypeError: …" becomes a
        // teaching message. The raw text is still logged to console for devs.
        const raw = error instanceof Error ? error.message : 'Failed to execute pygame code';
        console.error('[live-preview]', raw);
        isPausedRef.current = false;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: getEducationalError(raw),
          isPlaying: false,
          isPaused: false,
        }));

        // Show friendly error message
        toast({
          title: 'Oops! Something went wrong',
          description: "Don't worry, let's try adjusting your choices!",
          variant: 'default',
        });
      }
    },
    [pyodide, gameParams, toast, startRenderLoop]
  );

  // Stop render loop
  const stopRenderLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Handle play/pause. Three transitions:
  //   stopped → playing: execute pygame code (sets isPlaying=true, isPaused=false)
  //   playing → paused:  flip the rAF gate, keep Pyodide state intact
  //   paused  → playing: flip the gate back, do NOT re-execute
  // Reset (separate button) is the only path that tears down state.
  const togglePlayPause = useCallback(() => {
    if (state.isPlaying && !state.isPaused) {
      isPausedRef.current = true;
      setState((prev) => ({ ...prev, isPaused: true }));
      return;
    }
    if (state.isPlaying && state.isPaused) {
      isPausedRef.current = false;
      setState((prev) => ({ ...prev, isPaused: false }));
      // The previous render() exited when isPausedRef flipped to true;
      // resume re-primes a fresh rAF chain.
      if (canvasRef.current) startRenderLoop(canvasRef.current);
      return;
    }
    if (canvasRef.current) {
      executePygameCode(canvasRef.current, choices);
    }
  }, [state.isPlaying, state.isPaused, choices, executePygameCode, startRenderLoop]);

  // Handle reset
  const handleReset = useCallback(() => {
    stopRenderLoop();
    resetPygameState();
    isPausedRef.current = false;
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      score: 0,
      lives: 3,
      interactions: [],
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
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
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
          setState((prev) => ({
            ...prev,
            interactions: [...prev.interactions, interaction].slice(-5),
          }));

          // Notify parent
          onInteraction?.('click', { x, y });
        } catch (error) {
          console.error('Failed to handle click:', error);
        }
      }
    },
    [state.isPlaying, pyodide, onInteraction]
  );

  // Auto-play when choices change
  useEffect(() => {
    if (choices.length > 0 && canvasRef.current && pyodide) {
      executePygameCode(canvasRef.current, choices);
    }
  }, [choices, pyodide, executePygameCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // P key toggles pause when the canvas (or anything inside the preview card)
  // is focused. We attach to the canvas wrapper so typing P in the code editor
  // — which lives outside this component — never steals input. The editable-
  // target guard is belt-and-suspenders: even within the preview, a kid
  // focusing an input shouldn't trigger pause.
  //
  // Stable handler via ref: togglePlayPause changes identity whenever
  // isPlaying/isPaused/choices flip, which would otherwise tear down and
  // re-add the listener on every state update — a window where keydown
  // events can be dropped. Bind once; read the latest callback through
  // toggleRef each invocation.
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef(togglePlayPause);
  const isPlayingRef = useRef(state.isPlaying);
  useEffect(() => {
    toggleRef.current = togglePlayPause;
    isPlayingRef.current = state.isPlaying;
  }, [togglePlayPause, state.isPlaying]);
  useEffect(() => {
    const node = previewWrapperRef.current;
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'p' && e.key !== 'P') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (!isPlayingRef.current) return;
      e.preventDefault();
      toggleRef.current();
    };
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      stopRenderLoop();
      setCanvasContext(null);
      resetPygameState();
    };
  }, [stopRenderLoop]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={previewWrapperRef}
      tabIndex={0}
      className={cn(
        // Tabbable so the P-key shortcut works; keep a visible focus
        // indicator for keyboard users via :focus-visible (mouse focus
        // stays clean). Removing the focus outline entirely would have
        // been an a11y regression.
        'space-y-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400',
        className
      )}
      data-testid="live-preview-wrapper"
    >
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
            <Badge variant="secondary">{state.fps} FPS</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Canvas Container */}
          <div
            className={cn(
              'relative rounded-lg overflow-hidden bg-slate-900',
              showComparison ? 'grid grid-cols-2 gap-2' : ''
            )}
          >
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

              {/* Paused Overlay — sits above canvas while rAF gate is closed.
                  Pyodide state is intact; clicking Resume (or pressing P)
                  unfreezes from this exact frame. */}
              {state.isPaused && !state.isLoading && (
                <div
                  className="absolute inset-0 bg-black/40 flex items-center justify-center"
                  data-testid="paused-overlay"
                  role="status"
                  aria-live="polite"
                >
                  <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg px-4 py-2 text-center">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">⏸ Paused</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Press Resume (or P) to continue
                    </p>
                  </div>
                </div>
              )}

              {/* Loading Overlay */}
              {state.isLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <FlaskConical className="h-8 w-8 text-white animate-bounce" />
                    <span className="text-white text-sm">Brewing your game...</span>
                  </div>
                </div>
              )}

              {/* Error Overlay — mirrors runner.tsx's structured panel so the
                  kid gets the friendly headline + explanation + an
                  optional "Show details" disclosure for the raw exception. */}
              {state.error && (
                <div className="absolute inset-0 bg-red-900/20 flex items-center justify-center p-4">
                  <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg p-4 max-w-sm">
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">
                      {state.error.friendlyMessage}
                    </p>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      {state.error.explanation}
                    </p>
                    <details className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <summary className="cursor-pointer hover:opacity-100">Show details</summary>
                      <pre className="mt-1 whitespace-pre-wrap break-words">
                        {state.error.originalError}
                      </pre>
                    </details>
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
                <Badge className="absolute top-2 right-2" variant="outline">
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
                variant={state.isPlaying && !state.isPaused ? 'default' : 'outline'}
                onClick={togglePlayPause}
                disabled={!pyodide || state.isLoading}
                data-testid="button-play-pause-preview"
              >
                {state.isPlaying && !state.isPaused ? (
                  <>
                    <Pause className="h-4 w-4 mr-1" /> Pause
                  </>
                ) : state.isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-1" /> Resume
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" /> Play
                  </>
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
                <Button size="sm" variant="outline" data-testid="button-toggle-split">
                  <Split className="h-4 w-4 mr-1" />
                  Compare
                </Button>
              )}
            </div>

            {/* Game Stats */}
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline">Score: {state.score}</Badge>
              <Badge variant="outline">Lives: {state.lives}</Badge>
            </div>
          </div>

          {/* Parameter Controls */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Speed</label>
                <Slider
                  value={[gameParams.speed]}
                  onValueChange={([value]) => setGameParams((prev) => ({ ...prev, speed: value }))}
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
                  onValueChange={([value]) =>
                    setGameParams((prev) => ({ ...prev, jumpHeight: value }))
                  }
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
                  onValueChange={([value]) =>
                    setGameParams((prev) => ({ ...prev, enemySpeed: value }))
                  }
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
                    <p className="text-sm text-purple-700 dark:text-purple-300">{comment}</p>
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
