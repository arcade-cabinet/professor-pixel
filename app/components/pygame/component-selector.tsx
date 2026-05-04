import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PygameComponent } from '@/lib/pygame-components/types';
import { allComponents } from '@/lib/pygame-components';

interface ComponentSelectorProps {
  componentId?: string;
  category?: string;
  onSelect: (componentId: string, variant: 'A' | 'B') => void;
  onClose?: () => void;
  className?: string;
}

export default function PygameComponentSelector({
  componentId,
  category,
  onSelect,
  onClose,
  className
}: ComponentSelectorProps) {
  const [selectedVariant, setSelectedVariant] = useState<'A' | 'B' | null>(null);
  
  // Find the component by ID or get first from category
  const component = componentId 
    ? allComponents.find((c: PygameComponent) => c.id === componentId)
    : allComponents.find((c: PygameComponent) => c.category === category);
    
  if (!component) {
    return (
      <div className={cn("p-8 text-center", className)}>
        <p className="text-gray-500">Component not found</p>
      </div>
    );
  }
  
  const handleVariantSelect = (variant: 'A' | 'B') => {
    setSelectedVariant(variant);
    onSelect(component.id, variant);
  };
  
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",
      className
    )}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl mx-4"
      >
        <Card className="bg-white/95">
          <CardHeader>
            <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {component.name}
            </CardTitle>
            <CardDescription>
              Choose how this component should behave in your game
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Variant A */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleVariantSelect('A')}
                className={cn(
                  "cursor-pointer rounded-lg border-2 p-6 transition-colors",
                  selectedVariant === 'A' 
                    ? "border-purple-500 bg-purple-50" 
                    : "border-gray-200 hover:border-purple-200"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold">
                    Option A: {component.variants.A.name}
                  </h3>
                  <Badge variant="outline" className="bg-purple-100">A</Badge>
                </div>
                <p className="text-gray-600 mb-4">
                  {component.variants.A.description}
                </p>
                <div className="space-y-2">
                  {/* Show key features */}
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Key Features:</span>
                    <ul className="mt-1 list-disc list-inside">
                      {component.variants.A.name.includes('Floaty') && <li>Variable jump height</li>}
                      {component.variants.A.name.includes('Real-time') && <li>Fast-paced action</li>}
                      {component.variants.A.name.includes('Confetti') && <li>Colorful celebration</li>}
                    </ul>
                  </div>
                </div>
              </motion.div>
              
              {/* Variant B */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleVariantSelect('B')}
                className={cn(
                  "cursor-pointer rounded-lg border-2 p-6 transition-colors",
                  selectedVariant === 'B' 
                    ? "border-pink-500 bg-pink-50" 
                    : "border-gray-200 hover:border-pink-200"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold">
                    Option B: {component.variants.B.name}
                  </h3>
                  <Badge variant="outline" className="bg-pink-100">B</Badge>
                </div>
                <p className="text-gray-600 mb-4">
                  {component.variants.B.description}
                </p>
                <div className="space-y-2">
                  {/* Show key features */}
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Key Features:</span>
                    <ul className="mt-1 list-disc list-inside">
                      {component.variants.B.name.includes('Realistic') && <li>Predictable physics</li>}
                      {component.variants.B.name.includes('Turn-based') && <li>Strategic planning</li>}
                      {component.variants.B.name.includes('Fireworks') && <li>Grand finale</li>}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-end gap-3 mt-6">
              {onClose && (
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              )}
              <Button 
                disabled={!selectedVariant}
                onClick={() => selectedVariant && onSelect(component.id, selectedVariant)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              >
                Confirm Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}