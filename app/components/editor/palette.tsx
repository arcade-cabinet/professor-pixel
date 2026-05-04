import { useDrag } from 'react-dnd';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Gamepad2, Package, Circle, Square, Ghost, 
  Star, Image, Type, 
  Sparkles, Timer, Heart, RectangleHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllComponents, PyGameComponent } from '@/lib/pygame-components';

interface PygameEditorPaletteProps {
  className?: string;
}

// Helper function to determine category based on component type
function getCategoryForComponent(component: PyGameComponent): string {
  const typeCategories: Record<string, string> = {
    sprite: 'Game Objects',
    platform: 'World',
    ball: 'Game Objects',
    paddle: 'Game Objects',
    enemy: 'Entities',
    collectible: 'Items',
    background: 'World',
    scoreText: 'UI',
    button: 'UI',
    particleEffect: 'Effects',
    timer: 'UI',
    healthBar: 'UI'
  };
  return typeCategories[component.type] || 'Other';
}

const componentIcons: Record<string, React.ReactNode> = {
  sprite: <Gamepad2 className="w-5 h-5" />,
  platform: <Square className="w-5 h-5" />,
  ball: <Circle className="w-5 h-5" />,
  paddle: <Package className="w-5 h-5" />,
  enemy: <Ghost className="w-5 h-5" />,
  collectible: <Star className="w-5 h-5" />,
  background: <Image className="w-5 h-5" />,
  scoreText: <Type className="w-5 h-5" />,
  button: <RectangleHorizontal className="w-5 h-5" />,
  particleEffect: <Sparkles className="w-5 h-5" />,
  timer: <Timer className="w-5 h-5" />,
  healthBar: <Heart className="w-5 h-5" />
};

function DraggableComponent({ component }: { component: PyGameComponent }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'pygame-component',
    item: { componentId: component.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  return (
    <div
      ref={drag}
      className={cn(
        "p-3 rounded-lg border-2 border-purple-200 bg-white hover:bg-purple-50",
        "cursor-move transition-all hover:shadow-md hover:border-purple-400",
        "flex items-start gap-3 group",
        isDragging && "opacity-50"
      )}
    >
      <div className="mt-1 text-purple-600 group-hover:scale-110 transition-transform">
        {componentIcons[component.type] || <Package className="w-5 h-5" />}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-sm text-gray-800">{component.name}</h4>
        <p className="text-xs text-gray-500 mt-1">{component.description}</p>
        <Badge variant="secondary" className="mt-2 text-xs">
          {getCategoryForComponent(component)}
        </Badge>
      </div>
    </div>
  );
}

export default function PygameEditorPalette({ className }: PygameEditorPaletteProps) {
  const components = getAllComponents();
  
  // Group components by category
  const groupedComponents = components.reduce((acc, comp) => {
    const category = getCategoryForComponent(comp);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(comp);
    return acc;
  }, {} as Record<string, PyGameComponent[]>);

  return (
    <Card className={cn(
      "bg-gradient-to-b from-purple-50/50 to-pink-50/50",
      className
    )}>
      <div className="p-4 border-b border-purple-200/50">
        <h3 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Component Palette
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Drag components to the canvas
        </p>
      </div>
      
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-4 space-y-4">
          {Object.entries(groupedComponents).map(([category, comps]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                {category}
              </h4>
              <div className="space-y-2">
                {comps.map((component) => (
                  <DraggableComponent key={component.id} component={component} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}