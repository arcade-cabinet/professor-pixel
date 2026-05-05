import { useRef, useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@lib/utils/cn';
import { PlacedComponent } from './wysiwyg';
import { getComponentById } from '@lib/pygame/components/registry';
import { setCanvasContext, flushFrameBuffer } from '@lib/pygame/runtime/simulator';

// Components are rendered as ~60px boxes (see preview() functions). Center
// them on the cursor by subtracting half-width on placement. All three
// placement paths — drag-drop, tap-to-place, drag-move — use the same offset.
const PLACE_HALF = 30;

interface PygameEditorCanvasProps {
  components: PlacedComponent[];
  selectedId: string | null;
  showGrid: boolean;
  isPlaying: boolean;
  onDrop: (componentId: string, x: number, y: number) => void;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  /** P4 — when set, a tap on empty canvas places this component at the
   *  click point. This is the touch fallback for environments where the
   *  HTML5 drag backend doesn't fire. */
  armedComponentId?: string | null;
  className?: string;
}

export default function PygameEditorCanvas({
  components,
  selectedId,
  showGrid,
  isPlaying,
  onDrop,
  onSelect,
  onMove,
  onDelete,
  armedComponentId,
  className,
}: PygameEditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedComponent, setDraggedComponent] = useState<string | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'pygame-component',
    drop: (item: { componentId: string }, monitor) => {
      const offset = monitor.getClientOffset();
      const canvas = canvasRef.current;
      if (offset && canvas) {
        // Match the click-place coordinate system: canvas is rendered at
        // CSS-pixel size but its drawing buffer is fixed at 800x600. Scale
        // CSS-pixel offsets up to internal canvas pixels so DnD drop and
        // tap-to-place agree on where the component lands. Then center the
        // component on the cursor by subtracting half the component bbox
        // (PLACE_HALF) — same offset tap-to-place uses on the click handler
        // so all three placement paths land in the same spot.
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (offset.x - rect.left) * scaleX - PLACE_HALF;
        const y = (offset.y - rect.top) * scaleY - PLACE_HALF;
        onDrop(item.componentId, x, y);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  // Set up canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Connect canvas to pygame simulation
    setCanvasContext(ctx);

    // Render loop
    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid if enabled
      if (showGrid) {
        ctx.strokeStyle = 'rgba(147, 51, 234, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= canvas.width; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += 20) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }

      // Draw placed components
      components.forEach((comp) => {
        const componentDef = getComponentById(comp.componentId);
        if (componentDef && componentDef.preview) {
          ctx.save();
          ctx.translate(comp.x, comp.y);

          // Highlight selected component
          if (comp.id === selectedId) {
            ctx.strokeStyle = 'rgba(219, 39, 119, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(-2, -2, 64, 64);
          }

          // Call component's preview function
          componentDef.preview(ctx, comp.properties);
          ctx.restore();
        }
      });

      // Flush any pygame commands
      flushFrameBuffer();

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setCanvasContext(null);
    };
  }, [components, selectedId, showGrid, isPlaying]);

  // When a palette item is armed, pull keyboard focus to the canvas so a
  // keyboard-only user can press Enter/Space to place at the canvas center.
  // Mouse/touch users are unaffected by the focus shift.
  useEffect(() => {
    if (armedComponentId && canvasRef.current) {
      canvasRef.current.focus();
    }
  }, [armedComponentId]);

  // Keyboard placement when armed: Enter or Space drops the armed component
  // at the canvas center (in internal coords). Without this the canvas was
  // operable only with a pointer device.
  const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!armedComponentId) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cx = canvas.width / 2 - PLACE_HALF;
      const cy = canvas.height / 2 - PLACE_HALF;
      onDrop(armedComponentId, cx, cy);
    }
  };

  // Handle component select/drag via Pointer Events for unified mouse +
  // touch + pen support. The prior implementation used onClick + window
  // mousemove/mouseup listeners, which silently broke touch-drag on
  // tablets — pygame editor users on iPads could place components but
  // not move them. Pointer Events fire for all input modalities and
  // setPointerCapture keeps the drag locked to the originating canvas
  // even when the finger leaves its bounds.
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.pointerType === 'touch') {
      e.preventDefault();
    }

    const rect = canvas.getBoundingClientRect();
    // Account for CSS scaling — the canvas is rendered at 800x600 internal
    // coords but drawn at width:100% (capped at 800px). Without this, taps on
    // a phone-portrait canvas land at the wrong spot when armed-place fires.
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // P4 tap-to-place — if a palette item is armed, the next canvas tap places
    // it at the click point (centered on the cursor) instead of selecting.
    if (armedComponentId) {
      onDrop(armedComponentId, x - PLACE_HALF, y - PLACE_HALF);
      return;
    }

    // Check if clicking on a component
    let clickedComponent: PlacedComponent | undefined;
    for (let i = components.length - 1; i >= 0; i--) {
      const comp = components[i];
      if (x >= comp.x && x <= comp.x + 60 && y >= comp.y && y <= comp.y + 60) {
        clickedComponent = comp;
        break;
      }
    }

    if (clickedComponent) {
      onSelect(clickedComponent.id);

      if (!draggedComponent) {
        setDraggedComponent(clickedComponent.id);
        const pointerId = e.pointerId;
        // setPointerCapture routes subsequent pointermove / pointerup events
        // to this canvas regardless of where the pointer travels — even off-
        // screen on touch — so the drag doesn't drop mid-stroke when a
        // finger crosses out of the canvas's bounding rect.
        try {
          canvas.setPointerCapture(pointerId);
        } catch {
          // Older browsers / non-DOM test envs — fall through; window-level
          // listeners below still cover the desktop path.
        }
        const handlePointerMove = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          const newX = (ev.clientX - rect.left) * scaleX;
          const newY = (ev.clientY - rect.top) * scaleY;
          onMove(clickedComponent.id, newX - PLACE_HALF, newY - PLACE_HALF);
        };
        const handlePointerUp = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          setDraggedComponent(null);
          try {
            canvas.releasePointerCapture(pointerId);
          } catch {
            // ignore
          }
          window.removeEventListener('pointermove', handlePointerMove);
          window.removeEventListener('pointerup', handlePointerUp);
          window.removeEventListener('pointercancel', handlePointerUp);
        };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
      }
    } else {
      onSelect(null);
    }
  };

  drop(containerRef);

  return (
    <Card
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-white/90 backdrop-blur-sm',
        isOver && 'ring-2 ring-purple-500 ring-offset-2',
        className
      )}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        data-testid={armedComponentId ? `place-canvas-${armedComponentId}` : 'place-canvas'}
        className={cn(
          'touch-none focus:outline-none focus:ring-2 focus:ring-purple-400',
          armedComponentId ? 'cursor-copy' : 'cursor-crosshair'
        )}
        onPointerDown={handleCanvasPointerDown}
        onKeyDown={handleCanvasKeyDown}
        style={{ width: '100%', height: '100%', maxWidth: '800px', maxHeight: '600px' }}
        aria-label={
          armedComponentId
            ? 'Tap, click, or press Enter to place the armed component on the canvas'
            : 'Game canvas — click a component to select it'
        }
      />

      {selectedId && (
        <div className="absolute top-2 right-2 flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(selectedId)}
            className="gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </Button>
        </div>
      )}

      {components.length === 0 && !armedComponentId && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-400 text-base sm:text-lg text-center px-4">
            Drag components here, or tap one to arm it and tap to place.
          </p>
        </div>
      )}
    </Card>
  );
}
