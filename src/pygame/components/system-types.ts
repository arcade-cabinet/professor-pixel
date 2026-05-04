// TypeScript interface for pygame components

export interface PygameComponent {
  id: string;
  name: string;
  category: 'movement' | 'combat' | 'ui' | 'world';
  
  // Asset slots that can be swapped
  assetSlots: {
    character?: string;
    projectile?: string;
    background?: string;
    sound?: string;
    effect?: string;
  };
  
  // A/B variations
  variants: {
    A: {
      name: string;
      description: string;
      pythonCode: string; // Pre-written pygame code
    };
    B: {
      name: string;
      description: string;
      pythonCode: string;
    };
  };
  
  // Parameters that can be tweaked
  parameters: {
    [key: string]: number | boolean | string;
  };
}

export interface ComponentSelection {
  componentId: string;
  variant: 'A' | 'B';
  assets: Record<string, string>;
  parameters: Record<string, number | boolean | string>;
}