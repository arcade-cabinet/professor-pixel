import { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Play, Pause, RotateCw, Code, Eye, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import PygameEditorCanvas from './pygame-editor-canvas';
import PygameEditorPalette from './pygame-editor-palette';
import PygameEditorProperties from './pygame-editor-properties';
import PygameEditorCodePanel from './pygame-editor-code-panel';

export interface PlacedComponent {
  id: string;
  componentId: string;
  x: number;
  y: number;
  properties: Record<string, any>;
}

interface PygameWysiwygEditorProps {
  className?: string;
  onClose?: () => void;
  initialComponents?: PlacedComponent[];
}

export default function PygameWysiwygEditor({
  className,
  onClose,
  initialComponents = []
}: PygameWysiwygEditorProps) {
  const [placedComponents, setPlacedComponents] = useState<PlacedComponent[]>(initialComponents);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');

  const selectedComponent = placedComponents.find(c => c.id === selectedComponentId);

  const handleDrop = useCallback((componentId: string, x: number, y: number) => {
    const newComponent: PlacedComponent = {
      id: `${componentId}-${Date.now()}`,
      componentId,
      x: snapToGrid ? Math.round(x / 20) * 20 : x,
      y: snapToGrid ? Math.round(y / 20) * 20 : y,
      properties: {}
    };
    setPlacedComponents(prev => [...prev, newComponent]);
    setSelectedComponentId(newComponent.id);
  }, [snapToGrid]);

  const handleComponentMove = useCallback((id: string, x: number, y: number) => {
    setPlacedComponents(prev => prev.map(comp => 
      comp.id === id 
        ? { ...comp, x: snapToGrid ? Math.round(x / 20) * 20 : x, y: snapToGrid ? Math.round(y / 20) * 20 : y }
        : comp
    ));
  }, [snapToGrid]);

  const handleComponentDelete = useCallback((id: string) => {
    setPlacedComponents(prev => prev.filter(comp => comp.id !== id));
    if (selectedComponentId === id) {
      setSelectedComponentId(null);
    }
  }, [selectedComponentId]);

  const handlePropertyChange = useCallback((id: string, property: string, value: any) => {
    setPlacedComponents(prev => prev.map(comp =>
      comp.id === id
        ? { ...comp, properties: { ...comp.properties, [property]: value } }
        : comp
    ));
  }, []);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => {
    setIsPlaying(false);
    setPlacedComponents(initialComponents);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={cn(
        "flex flex-col h-screen bg-gradient-to-br from-purple-50 to-pink-50",
        className
      )}>
        {/* Header Toolbar */}
        <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b border-purple-200/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              PyGame Visual Editor
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant={isPlaying ? "outline" : "default"}
                size="sm"
                onClick={handlePlay}
                disabled={isPlaying}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Play
              </Button>
              <Button
                variant={isPlaying ? "default" : "outline"}
                size="sm"
                onClick={handlePause}
                disabled={!isPlaying}
                className="gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCw className="w-4 h-4" />
                Reset
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-grid"
                checked={showGrid}
                onCheckedChange={setShowGrid}
              />
              <Label htmlFor="show-grid" className="text-sm flex items-center gap-1">
                <Grid3x3 className="w-4 h-4" />
                Grid
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="snap-to-grid"
                checked={snapToGrid}
                onCheckedChange={setSnapToGrid}
              />
              <Label htmlFor="snap-to-grid" className="text-sm">
                Snap
              </Label>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close Editor
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Component Palette */}
          <PygameEditorPalette className="w-64 border-r border-purple-200/50" />

          {/* Center - Canvas or Code View */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'visual' | 'code')} className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-4 self-start">
                <TabsTrigger value="visual" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Visual
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2">
                  <Code className="w-4 h-4" />
                  Python Code
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="visual" className="flex-1 p-4">
                <PygameEditorCanvas
                  components={placedComponents}
                  selectedId={selectedComponentId}
                  showGrid={showGrid}
                  isPlaying={isPlaying}
                  onDrop={handleDrop}
                  onSelect={setSelectedComponentId}
                  onMove={handleComponentMove}
                  onDelete={handleComponentDelete}
                />
              </TabsContent>
              
              <TabsContent value="code" className="flex-1 p-4">
                <PygameEditorCodePanel
                  components={placedComponents}
                  className="h-full"
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Properties Panel */}
          {selectedComponent && (
            <PygameEditorProperties
              component={selectedComponent}
              onPropertyChange={handlePropertyChange}
              className="w-80 border-l border-purple-200/50"
            />
          )}
        </div>
      </div>
    </DndProvider>
  );
}