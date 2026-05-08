import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@lib/utils/cn';
import type { PlacedComponent } from '@lib/pygame/components/types';
import { getComponentById } from '@lib/pygame/components/registry';
import type { ComponentPropertyValue } from '@lib/pygame/components/types';

interface PygameEditorPropertiesProps {
  component: PlacedComponent;
  onPropertyChange: (id: string, property: string, value: ComponentPropertyValue) => void;
  className?: string;
}

export default function PygameEditorProperties({
  component,
  onPropertyChange,
  className,
}: PygameEditorPropertiesProps) {
  const componentDef = getComponentById(component.componentId);
  if (!componentDef) return null;

  return (
    <Card className={cn('bg-gradient-to-b from-purple-50/50 to-pink-50/50', className)}>
      <div className="p-4 border-b border-purple-200/50">
        <h3 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Properties
        </h3>
        <p className="text-xs text-gray-600 mt-1">{componentDef.name}</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="x-pos" className="text-sm">
            X Position
          </Label>
          <Input
            id="x-pos"
            type="number"
            value={component.x}
            onChange={(e) => onPropertyChange(component.id, 'x', Number(e.target.value))}
            className="h-8"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="y-pos" className="text-sm">
            Y Position
          </Label>
          <Input
            id="y-pos"
            type="number"
            value={component.y}
            onChange={(e) => onPropertyChange(component.id, 'y', Number(e.target.value))}
            className="h-8"
          />
        </div>
      </div>
    </Card>
  );
}
