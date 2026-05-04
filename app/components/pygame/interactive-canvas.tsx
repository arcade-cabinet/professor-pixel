import { useRef, useState, useEffect, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Play, Pause, Grid3x3, Move, Trash2, Settings,
  MousePointer, Maximize2, RotateCw, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
// Pyodide removed - new pygame component system coming
import { useToast } from '@/hooks/use-toast';
import type { Entity, Scene, GameConfig } from '@shared/schema';
import type { DraggableAsset } from './draggable-asset-library';

interface InteractiveGameCanvasProps {
  gameConfig: GameConfig;
  onConfigChange: (config: GameConfig) => void;
  className?: string;
  currentScene?: string;
}

export default function InteractiveGameCanvas({
  gameConfig,
  onConfigChange,
  className,
  currentScene = 'main'
}: InteractiveGameCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  // Pyodide temporarily disabled
  const pyodide = null;
  const pyodideLoading = false;
  const { toast } = useToast();

  const [isPlaying, setIsPlaying] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSnap, setGridSnap] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [draggedPosition, setDraggedPosition] = useState<{ x: number; y: number } | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [pendingAsset, setPendingAsset] = useState<DraggableAsset | null>(null);
  const [entityConfig, setEntityConfig] = useState<Partial<Entity>>({});
  
  const scene = gameConfig.scenes.find(s => s.id === currentScene) || gameConfig.scenes[0];
  const gridSize = scene?.gridSize || 20;

  // Setup drop zone for assets
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'asset',
    drop: (item: DraggableAsset, monitor) => {
      const offset = monitor.getClientOffset();
      if (offset && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        let x = offset.x - rect.left;
        let y = offset.y - rect.top;
        
        // Apply grid snapping if enabled
        if (gridSnap) {
          x = Math.round(x / gridSize) * gridSize;
          y = Math.round(y / gridSize) * gridSize;
        }
        
        // Open configuration modal for the dropped asset
        setPendingAsset(item);
        setEntityConfig({
          id: `${item.id}-${Date.now()}`,
          type: item.type === 'entity' ? 
            (item.id as Entity['type']) : 'decoration',
          name: item.name,
          position: { x, y },
          properties: item.defaultProperties || {},
          size: { width: 40, height: 40 }
        });
        setShowConfigModal(true);
      }
    },
    canDrop: () => !isPlaying,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [gridSnap, gridSize, isPlaying]);

  // Handle entity configuration
  const handleSaveEntity = () => {
    if (!scene || !entityConfig.id) return;

    const newEntity: Entity = {
      id: entityConfig.id,
      type: entityConfig.type || 'decoration',
      name: entityConfig.name || 'Unnamed',
      position: entityConfig.position || { x: 0, y: 0 },
      size: entityConfig.size || { width: 40, height: 40 },
      properties: entityConfig.properties || {},
      layer: entityConfig.layer || 0,
    };

    // Add entity to scene
    const updatedScene: Scene = {
      ...scene,
      entities: [...scene.entities, newEntity]
    };

    const updatedConfig: GameConfig = {
      ...gameConfig,
      scenes: gameConfig.scenes.map(s => 
        s.id === currentScene ? updatedScene : s
      )
    };

    onConfigChange(updatedConfig);
    setShowConfigModal(false);
    setPendingAsset(null);
    setEntityConfig({});
    
    toast({
      title: "Entity Added",
      description: `${newEntity.name} added to the scene`,
    });
  };

  // Handle entity deletion
  const handleDeleteEntity = (entityId: string) => {
    if (!scene) return;

    const updatedScene: Scene = {
      ...scene,
      entities: scene.entities.filter(e => e.id !== entityId)
    };

    const updatedConfig: GameConfig = {
      ...gameConfig,
      scenes: gameConfig.scenes.map(s => 
        s.id === currentScene ? updatedScene : s
      )
    };

    onConfigChange(updatedConfig);
    setSelectedEntity(null);
    
    toast({
      title: "Entity Deleted",
      description: "Entity removed from the scene",
    });
  };

  // Handle entity movement
  const handleMoveEntity = (entityId: string, newPosition: { x: number; y: number }) => {
    if (!scene) return;

    const updatedScene: Scene = {
      ...scene,
      entities: scene.entities.map(e => 
        e.id === entityId ? { ...e, position: newPosition } : e
      )
    };

    const updatedConfig: GameConfig = {
      ...gameConfig,
      scenes: gameConfig.scenes.map(s => 
        s.id === currentScene ? updatedScene : s
      )
    };

    onConfigChange(updatedConfig);
  };

  // Connect the drop ref
  useEffect(() => {
    if (canvasRef.current) {
      drop(canvasRef);
    }
  }, [drop]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
      if (e.key === 'Delete' && selectedEntity) {
        handleDeleteEntity(selectedEntity);
      }
      if (e.key === 'g' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowGrid(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedEntity]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-background">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isPlaying ? "default" : "outline"}
            onClick={() => setIsPlaying(!isPlaying)}
            data-testid="button-play-pause"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Play
              </>
            )}
          </Button>

          <div className="flex items-center gap-2 px-2 border-l">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowGrid(!showGrid)}
              className={cn(showGrid && "bg-muted")}
              data-testid="button-toggle-grid"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="grid-snap" className="text-xs">Snap</Label>
              <Switch
                id="grid-snap"
                checked={gridSnap}
                onCheckedChange={setGridSnap}
                disabled={!showGrid}
                data-testid="switch-grid-snap"
              />
            </div>
          </div>

          {selectedEntity && (
            <div className="flex items-center gap-2 px-2 border-l">
              <Badge variant="secondary">{selectedEntity}</Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteEntity(selectedEntity)}
                data-testid="button-delete-entity"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {isPlaying ? "Playing" : "Editing"}
          </Badge>
          <Badge variant="outline">
            {scene?.entities.length || 0} entities
          </Badge>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-muted/20">
        <div
          ref={canvasRef}
          className={cn(
            "absolute inset-4 bg-background rounded-lg shadow-inner transition-all",
            isOver && canDrop && "ring-2 ring-primary ring-offset-2",
            isPlaying && "cursor-crosshair"
          )}
          style={{
            backgroundImage: showGrid && !isPlaying ? 
              `linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)` : 
              undefined,
            backgroundSize: showGrid && !isPlaying ? `${gridSize}px ${gridSize}px` : undefined,
          }}
          data-testid="game-canvas-drop-zone"
        >
          {/* Render entities */}
          {scene?.entities.map(entity => (
            <div
              key={entity.id}
              className={cn(
                "absolute border rounded transition-all",
                selectedEntity === entity.id ? 
                  "border-primary ring-2 ring-primary/20" : 
                  "border-muted-foreground/30 hover:border-muted-foreground",
                !isPlaying && "cursor-move"
              )}
              style={{
                left: entity.position.x,
                top: entity.position.y,
                width: entity.size?.width || 40,
                height: entity.size?.height || 40,
                zIndex: entity.layer || 0
              }}
              onClick={() => !isPlaying && setSelectedEntity(entity.id)}
              onMouseDown={(e) => {
                if (!isPlaying && e.button === 0) {
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startPos = { ...entity.position };
                  
                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    let newX = startPos.x + (moveEvent.clientX - startX);
                    let newY = startPos.y + (moveEvent.clientY - startY);
                    
                    if (gridSnap) {
                      newX = Math.round(newX / gridSize) * gridSize;
                      newY = Math.round(newY / gridSize) * gridSize;
                    }
                    
                    handleMoveEntity(entity.id, { x: newX, y: newY });
                  };
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };
                  
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }
              }}
              data-testid={`entity-${entity.id}`}
            >
              <div className="flex items-center justify-center h-full bg-primary/10">
                <span className="text-xs font-medium text-center px-1">
                  {entity.name}
                </span>
              </div>
            </div>
          ))}

          {/* Drop indicator */}
          {isOver && canDrop && (
            <div className="absolute inset-0 bg-primary/5 pointer-events-none flex items-center justify-center">
              <div className="bg-background/90 rounded-lg p-4 shadow-lg">
                <p className="text-sm font-medium">Drop asset here</p>
              </div>
            </div>
          )}

          {/* Play mode overlay */}
          {isPlaying && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/90 rounded-lg px-3 py-1 shadow-lg">
              <p className="text-sm font-medium text-primary">Game Running</p>
            </div>
          )}
        </div>
      </div>

      {/* Entity Configuration Modal */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {pendingAsset?.name || 'Entity'}</DialogTitle>
            <DialogDescription>
              Set properties for this entity. You can adjust these later.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="entity-name">Name</Label>
              <Input
                id="entity-name"
                value={entityConfig.name || ''}
                onChange={(e) => setEntityConfig({
                  ...entityConfig,
                  name: e.target.value
                })}
                placeholder="Enter entity name"
                data-testid="input-entity-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entity-x">X Position</Label>
                <Input
                  id="entity-x"
                  type="number"
                  value={entityConfig.position?.x || 0}
                  onChange={(e) => setEntityConfig({
                    ...entityConfig,
                    position: { 
                      ...entityConfig.position!,
                      x: parseInt(e.target.value) || 0
                    }
                  })}
                  data-testid="input-entity-x"
                />
              </div>
              <div>
                <Label htmlFor="entity-y">Y Position</Label>
                <Input
                  id="entity-y"
                  type="number"
                  value={entityConfig.position?.y || 0}
                  onChange={(e) => setEntityConfig({
                    ...entityConfig,
                    position: {
                      ...entityConfig.position!,
                      y: parseInt(e.target.value) || 0
                    }
                  })}
                  data-testid="input-entity-y"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entity-width">Width</Label>
                <Input
                  id="entity-width"
                  type="number"
                  value={entityConfig.size?.width || 40}
                  onChange={(e) => setEntityConfig({
                    ...entityConfig,
                    size: {
                      ...entityConfig.size!,
                      width: parseInt(e.target.value) || 40
                    }
                  })}
                  data-testid="input-entity-width"
                />
              </div>
              <div>
                <Label htmlFor="entity-height">Height</Label>
                <Input
                  id="entity-height"
                  type="number"
                  value={entityConfig.size?.height || 40}
                  onChange={(e) => setEntityConfig({
                    ...entityConfig,
                    size: {
                      ...entityConfig.size!,
                      height: parseInt(e.target.value) || 40
                    }
                  })}
                  data-testid="input-entity-height"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="entity-layer">Layer (Z-Index)</Label>
              <Input
                id="entity-layer"
                type="number"
                value={entityConfig.layer || 0}
                onChange={(e) => setEntityConfig({
                  ...entityConfig,
                  layer: parseInt(e.target.value) || 0
                })}
                data-testid="input-entity-layer"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEntity} data-testid="button-save-entity">
              Add Entity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}