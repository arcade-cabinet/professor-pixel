import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Palette, Move, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlacedComponent } from './pygame-wysiwyg-editor';
import { getComponentById } from '@/lib/pygame-components';

interface PygameEditorPropertiesProps {
  component: PlacedComponent;
  onPropertyChange: (id: string, property: string, value: any) => void;
  className?: string;
}

export default function PygameEditorProperties({
  component,
  onPropertyChange,
  className
}: PygameEditorPropertiesProps) {
  const componentDef = getComponentById(component.componentId);
  if (!componentDef) return null;

  const renderPropertyControl = (prop: any) => {
    const value = component.properties[prop.name] ?? prop.default;
    
    switch (prop.type) {
      case 'number':
        if (prop.min !== undefined && prop.max !== undefined) {
          return (
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor={prop.name} className="text-sm">{prop.label}</Label>
                <span className="text-xs text-gray-500">{value}</span>
              </div>
              <Slider
                id={prop.name}
                min={prop.min}
                max={prop.max}
                step={prop.step || 1}
                value={[value]}
                onValueChange={(v) => onPropertyChange(component.id, prop.name, v[0])}
                className="w-full"
              />
            </div>
          );
        }
        return (
          <div className="space-y-2">
            <Label htmlFor={prop.name} className="text-sm">{prop.label}</Label>
            <Input
              id={prop.name}
              type="number"
              value={value}
              onChange={(e) => onPropertyChange(component.id, prop.name, Number(e.target.value))}
              className="h-8"
            />
          </div>
        );

      case 'string':
        if (prop.options) {
          return (
            <div className="space-y-2">
              <Label htmlFor={prop.name} className="text-sm">{prop.label}</Label>
              <Select 
                value={value} 
                onValueChange={(v) => onPropertyChange(component.id, prop.name, v)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {prop.options.map((option: string) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }
        return (
          <div className="space-y-2">
            <Label htmlFor={prop.name} className="text-sm">{prop.label}</Label>
            <Input
              id={prop.name}
              value={value}
              onChange={(e) => onPropertyChange(component.id, prop.name, e.target.value)}
              className="h-8"
            />
          </div>
        );

      case 'color':
        return (
          <div className="space-y-2">
            <Label htmlFor={prop.name} className="text-sm">{prop.label}</Label>
            <div className="flex gap-2">
              <Input
                id={prop.name}
                type="color"
                value={value}
                onChange={(e) => onPropertyChange(component.id, prop.name, e.target.value)}
                className="h-8 w-20 cursor-pointer"
              />
              <Input
                value={value}
                onChange={(e) => onPropertyChange(component.id, prop.name, e.target.value)}
                className="h-8 flex-1"
                placeholder="#000000"
              />
            </div>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <Label htmlFor={prop.name} className="text-sm">{prop.label}</Label>
            <Switch
              id={prop.name}
              checked={value}
              onCheckedChange={(v) => onPropertyChange(component.id, prop.name, v)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn(
      "bg-gradient-to-b from-purple-50/50 to-pink-50/50",
      className
    )}>
      <div className="p-4 border-b border-purple-200/50">
        <h3 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Properties
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          {componentDef.name}
        </p>
      </div>

      <Tabs defaultValue="properties" className="flex-1">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="properties" className="gap-1 text-xs">
            <Settings className="w-3 h-3" />
            Properties
          </TabsTrigger>
          <TabsTrigger value="position" className="gap-1 text-xs">
            <Move className="w-3 h-3" />
            Position
          </TabsTrigger>
          <TabsTrigger value="style" className="gap-1 text-xs">
            <Palette className="w-3 h-3" />
            Style
          </TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="p-4 space-y-4">
          {/* Note: Properties array not available in current component structure */}
          {/* {componentDef.properties?.filter((p: any) => !['x', 'y', 'color'].includes(p.name)).map((prop: any) => (
            <div key={prop.name}>
              {renderPropertyControl(prop)}
            </div>
          ))} */}
        </TabsContent>

        <TabsContent value="position" className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="x-pos" className="text-sm">X Position</Label>
            <Input
              id="x-pos"
              type="number"
              value={component.x}
              onChange={(e) => onPropertyChange(component.id, 'x', Number(e.target.value))}
              className="h-8"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="y-pos" className="text-sm">Y Position</Label>
            <Input
              id="y-pos"
              type="number"
              value={component.y}
              onChange={(e) => onPropertyChange(component.id, 'y', Number(e.target.value))}
              className="h-8"
            />
          </div>
        </TabsContent>

        <TabsContent value="style" className="p-4 space-y-4">
          {/* Note: Properties array not available in current component structure */}
          {/* {componentDef.properties?.filter((p: any) => p.type === 'color' || p.name.includes('color')).map((prop: any) => (
            <div key={prop.name}>
              {renderPropertyControl(prop)}
            </div>
          ))} */}
        </TabsContent>
      </Tabs>
    </Card>
  );
}