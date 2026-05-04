// PyGame Game Templates - Main entry point
// Re-exports all templates from modular files

// Import types
import { GameTemplate, TemplateComponent, GameSettings } from './pygame-template-types';

// Import individual templates
import { platformerTemplate } from './pygame-template-platformer';
import { pongTemplate } from './pygame-template-pong';
import { shooterTemplate } from './pygame-template-shooter';
import { breakoutTemplate } from './pygame-template-breakout';
import { collectingTemplate } from './pygame-template-collecting';

// Re-export types
export { GameTemplate, TemplateComponent, GameSettings };

// Combine all templates into a single array
export const gameTemplates: GameTemplate[] = [
  platformerTemplate,
  pongTemplate,
  shooterTemplate,
  breakoutTemplate,
  collectingTemplate
];

// ============================================================================
// Template Helper Functions
// ============================================================================

export function getTemplateById(id: string): GameTemplate | undefined {
  return gameTemplates.find(t => t.id === id);
}

export function getTemplatesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): GameTemplate[] {
  return gameTemplates.filter(t => t.difficulty === difficulty);
}

export function getAllTemplates(): GameTemplate[] {
  return gameTemplates;
}

// Export for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testPygameTemplates = () => {
    console.log('🎮 PyGame Templates Available:');
    gameTemplates.forEach(template => {
      console.log(`  - ${template.name} (${template.id}): ${template.description}`);
      console.log(`    Difficulty: ${template.difficulty}`);
    });
    return gameTemplates;
  };
}