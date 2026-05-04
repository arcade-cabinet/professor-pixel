// PyGame *gameplay-system* specs — the A/B-variant pieces students assemble in
// the wizard (jump/shoot/health/...). Distinct from `types.ts`, which describes
// canvas-rendering primitives (sprites, platforms) used by the simulator.
//
// Naming: this file's `PygameSystemSpec` and the rendering primitive's
// `PyGameComponent` (in ./types.ts, capital G) name two different things on
// purpose. If you need a generic "component" word, qualify it: "system spec"
// or "render component". Don't merge them — they cross different module
// boundaries (wizard authoring vs runtime rendering).

export interface PygameSystemSpec {
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
