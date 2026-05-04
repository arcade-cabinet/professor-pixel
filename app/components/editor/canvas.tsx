import { useRef, useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlacedComponent } from './pygame-wysiwyg-editor';
import { getComponentById } from '@/lib/pygame-components';
import { setCanvasContext, flushFrameBuffer } from '@/lib/pygame-simulation';

interface PygameEditorCanvasProps {
  components: PlacedComponent[];
  selectedId: string | null;
  showGrid: boolean;
  isPlaying: boolean;
  onDrop: (componentId: string, x: number, y: number) => void;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
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
  className
}: PygameEditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedComponent, setDraggedComponent] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'pygame-component',
    drop: (item: { componentId: string }, monitor) => {
      const offset = monitor.getClientOffset();
      const container = containerRef.current;
      if (offset && container) {
        const rect = container.getBoundingClientRect();
        const x = offset.x - rect.left;
        const y = offset.y - rect.top;
        onDrop(item.componentId, x, y);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver()
    })
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
      components.forEach(comp => {
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

  // Handle component click/drag
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
      
      // Set up drag handling
      if (!draggedComponent) {
        setDraggedComponent(clickedComponent.id);
        const handleMouseMove = (e: MouseEvent) => {
          const newX = e.clientX - rect.left;
          const newY = e.clientY - rect.top;
          onMove(clickedComponent.id, newX - 30, newY - 30);
        };
        const handleMouseUp = () => {
          setDraggedComponent(null);
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
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
        "relative overflow-hidden bg-white/90 backdrop-blur-sm",
        isOver && "ring-2 ring-purple-500 ring-offset-2",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="cursor-crosshair"
        onClick={handleCanvasClick}
        style={{ width: '100%', height: '100%', maxWidth: '800px', maxHeight: '600px' }}
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
      
      {components.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-400 text-lg">
            Drag components here to start building!
          </p>
        </div>
      )}
    </Card>
  );
}