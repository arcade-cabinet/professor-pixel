// PyGame Template Type Definitions
import type { ComponentType } from './pygame-component-types';

// ============================================================================
// Template Type Definitions
// ============================================================================

export interface GameTemplate {
  id: string;
  name: string;
  description: string;
  wizardDescription: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  components: TemplateComponent[];
  settings: GameSettings;
  generateCode: () => string;
  preview: (ctx: CanvasRenderingContext2D) => void;
}

export interface TemplateComponent {
  type: ComponentType;
  id: string;
  properties: Record<string, any>;
}

export interface GameSettings {
  screenWidth: number;
  screenHeight: number;
  backgroundColor: string;
  fps: number;
  title: string;
}