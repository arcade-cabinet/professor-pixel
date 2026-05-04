// Cross-domain runtime contracts for Pixel's PyGame Palace.
// Schema-first: each entity that crosses an external boundary (network JSON,
// localStorage, postMessage) is defined as a Zod schema; the TS type is
// `z.infer<typeof Schema>`. The schemas validate at the boundary, so bad data
// fails loudly instead of crashing inside a stale React render.
//
// In-memory-only types (editor state, mascot UI, component config) stay as
// plain TS interfaces below — they never come from untrusted input.

import { z } from 'zod';

const ConstructTypeSchema = z.enum([
  'variable_assignment',
  'function_call',
  'import',
  'if_statement',
  'loop',
  'string_literal',
  'f_string',
  'imports_module',
  'defines_class',
  'calls_method',
  'parameter_count',
  'nesting_depth',
]);

const RequiredConstructSchema = z
  .object({
    type: ConstructTypeSchema,
    name: z.string().optional(),
    /** For imports_module: optional sub-attribute, e.g. {module: 'pygame', from: 'event'} */
    from: z.string().optional(),
    /** For defines_class: required base class name (e.g. {baseClass: 'Sprite'}) */
    baseClass: z.string().optional(),
    /** For defines_class: minimum number of methods on the class */
    minMethods: z.number().int().nonnegative().optional(),
    /** For calls_method: receiver name (e.g. {on: 'screen', method: 'fill'}) */
    on: z.string().optional(),
    /** For calls_method: method name */
    method: z.string().optional(),
    /** For parameter_count: function name + min/max parameter count */
    function: z.string().optional(),
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().nonnegative().optional(),
    minCount: z.number().int().nonnegative().optional(),
    maxCount: z.number().int().nonnegative().optional(),
  })
  .strict();

const ForbiddenConstructSchema = z
  .object({
    type: ConstructTypeSchema,
    name: z.string().optional(),
  })
  .strict();

const AstRulesSchema = z
  .object({
    requiredFunctions: z.array(z.string()).optional(),
    requiredConstructs: z.array(RequiredConstructSchema).optional(),
    forbiddenConstructs: z.array(ForbiddenConstructSchema).optional(),
  })
  .strict();

const RuntimeRulesSchema = z
  .object({
    outputContains: z.array(z.string()).optional(),
    outputMatches: z.string().optional(),
    variableExists: z.array(z.string()).optional(),
    functionCalled: z.array(z.string()).optional(),
    acceptsUserInput: z.boolean().optional(),
    outputIncludesInput: z.boolean().optional(),
  })
  .strict();

const TestSpecSchema = z
  .object({
    input: z.string().optional(),
    expectedOutput: z.string(),
    description: z.string().optional(),
    mode: z.enum(['output', 'rules']).optional(),
    astRules: AstRulesSchema.optional(),
    runtimeRules: RuntimeRulesSchema.optional(),
  })
  .strict();

const StepValidationSchema = z
  .object({
    type: z.enum(['output', 'variable', 'function', 'exact']),
    expected: z.unknown().optional(),
  })
  .strict();

const StepSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    initialCode: z.string(),
    solution: z.string(),
    hints: z.array(z.string()),
    tests: z.array(TestSpecSchema).optional(),
    validation: StepValidationSchema.optional(),
  })
  .strict();

export const UserSchema = z
  .object({
    id: z.string().min(1),
    username: z.string().min(1),
  })
  .strict();

export const LessonSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    order: z.number().int().nonnegative(),
    intro: z.string().optional(),
    learningObjectives: z.array(z.string()).optional(),
    goalDescription: z.string().optional(),
    previewCode: z.string().optional(),
    content: z.object({
      introduction: z.string(),
      steps: z.array(StepSchema).min(1),
    }),
    prerequisites: z.array(z.string()).optional(),
    difficulty: z.string().optional(),
    estimatedTime: z.number().int().positive().optional(),
  })
  .strict();

export const UserProgressSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    lessonId: z.string().min(1),
    currentStep: z.number().int().nonnegative(),
    completed: z.boolean(),
    code: z.string().optional(),
  })
  .strict();

const ProjectFileSchema = z
  .object({
    path: z.string().min(1),
    content: z.string(),
  })
  .strict();

const ProjectAssetSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(['image', 'sound', 'other']),
    path: z.string().min(1),
    dataUrl: z.string(),
  })
  .strict();

export const ProjectSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    name: z.string().min(1),
    template: z.string().min(1),
    description: z.string().optional(),
    published: z.boolean(),
    createdAt: z.coerce.date(),
    publishedAt: z.coerce.date().optional(),
    thumbnailDataUrl: z.string().optional(),
    files: z.array(ProjectFileSchema),
    assets: z.array(ProjectAssetSchema),
  })
  .strict();

export type User = z.infer<typeof UserSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type LessonStep = z.infer<typeof StepSchema>;
export type LessonTestSpec = z.infer<typeof TestSpecSchema>;
export type LessonAstRules = z.infer<typeof AstRulesSchema>;
export type LessonRuntimeRules = z.infer<typeof RuntimeRulesSchema>;
export type UserProgress = z.infer<typeof UserProgressSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectAsset = z.infer<typeof ProjectAssetSchema>;
export type ProjectFile = z.infer<typeof ProjectFileSchema>;

export const InsertUserSchema = UserSchema.omit({ id: true });
export const InsertLessonSchema = LessonSchema.omit({ id: true });
export const InsertUserProgressSchema = UserProgressSchema.omit({ id: true });
export const InsertProjectSchema = ProjectSchema.omit({
  id: true,
  createdAt: true,
  publishedAt: true,
});

export type InsertUser = z.infer<typeof InsertUserSchema>;
export type InsertLesson = z.infer<typeof InsertLessonSchema>;
export type InsertUserProgress = z.infer<typeof InsertUserProgressSchema>;
export type InsertProject = z.infer<typeof InsertProjectSchema>;

// Visual Game Builder Types
export interface GameConfig {
  id: string;
  name: string;
  version: number;
  scenes: Scene[];
  componentChoices: ComponentChoice[];
  assets: AssetRef[];
  settings: GameSettings;
}

export interface Scene {
  id: string;
  name: string;
  entities: Entity[];
  backgroundColor?: string;
  backgroundImage?: string;
  width: number;
  height: number;
  gridSize?: number;
  isMainScene?: boolean;
  music?: string;
  transition?: SceneTransition;
  camera?: CameraSettings;
}

export interface Entity {
  id: string;
  type: 'player' | 'enemy' | 'collectible' | 'platform' | 'decoration' | 'trigger' | 'custom';
  name: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  rotation?: number;
  scale?: { x: number; y: number };
  sprite?: string;
  assetPath?: string;
  properties: Record<string, any>;
  behaviors?: EntityBehavior[];
  layer?: number;
  locked?: boolean;
  visible?: boolean;
  collisionShape?: CollisionShape;
  physics?: PhysicsProperties;
}

export interface EntityBehavior {
  id: string;
  type: 'move' | 'patrol' | 'follow' | 'rotate' | 'bounce' | 'jump' | 'shoot' | 'collect' | 'spawn' | 'destroy' | 'custom';
  parameters: Record<string, any>;
  trigger?: BehaviorTrigger;
  enabled?: boolean;
}

export interface BehaviorTrigger {
  type: 'always' | 'onClick' | 'onCollision' | 'onKeyPress' | 'onTimer' | 'onEvent';
  params?: Record<string, any>;
}

export interface CollisionShape {
  type: 'rect' | 'circle' | 'polygon' | 'auto';
  data?: any;
}

export interface PhysicsProperties {
  enabled: boolean;
  mass?: number;
  friction?: number;
  bounce?: number;
  gravity?: boolean;
  static?: boolean;
}

export interface SceneTransition {
  type: 'none' | 'fade' | 'slide' | 'zoom' | 'pixelate';
  duration?: number;
  easing?: string;
}

export interface CameraSettings {
  followEntity?: string;
  zoom?: number;
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface ComponentChoice {
  component: string;
  choice: 'A' | 'B';
  customParameters?: Record<string, any>;
}

export interface AssetRef {
  id: string;
  assetId: string;
  position?: { x: number; y: number };
  scale?: number;
  rotation?: number;
  layer?: number;
  properties?: Record<string, any>;
}

export interface GameSettings {
  fps?: number;
  showGrid?: boolean;
  gridSnap?: boolean;
  gridSize?: number;
  showRulers?: boolean;
  showGuides?: boolean;
  physicsEnabled?: boolean;
  debugMode?: boolean;
  autoSave?: boolean;
  theme?: 'light' | 'dark';
}

export interface EditorState {
  selectedEntities: string[];
  selectedTool: EditorTool;
  clipboard?: Entity[];
  history: HistoryEntry[];
  historyIndex: number;
  zoom: number;
  panOffset: { x: number; y: number };
  showLayers?: boolean;
  lockedLayers?: number[];
}

export type EditorTool = 'select' | 'move' | 'rotate' | 'scale' | 'duplicate' | 'delete' | 'pan' | 'zoom';

export interface HistoryEntry {
  type: 'add' | 'delete' | 'modify' | 'batch';
  entities: Entity[];
  previousState?: Entity[];
  timestamp: number;
}

export interface AssetMetadata {
  id: string;
  name: string;
  path: string;
  type: 'sprite' | 'model' | 'sound' | 'music' | 'font';
  category: string;
  tags: string[];
  thumbnail?: string;
  dimensions?: { width: number; height: number };
  format?: string;
  size?: number;
  favorite?: boolean;
}

// Mascot-Driven Experience Types
export interface UserProfile {
  id: string;
  name: string;
  firstVisitAt: Date;
  lastVisitAt: Date;
  skillLevel: 'beginner' | 'learning' | 'confident' | 'pro';
  interests: string[];
  preferredGenres: string[];
  currentProject?: string;
  completedLessons: string[];
  mascotName: string; // They can rename Pixel if they want
  onboardingComplete: boolean;
}

export interface WizardState {
  currentStep: string;
  answers: Record<string, any>;
  suggestedTemplates: string[];
  selectedTemplate?: string;
}

export interface ConversationMessage {
  id: string;
  role: 'pixel' | 'user' | 'system';
  content: string;
  timestamp: Date;
  quickReplies?: string[];
  actionType?: 'lesson' | 'create' | 'explore';
}

// Component System Types
export interface ComponentManifest {
  id: string;
  name: string;
  category: 'movement' | 'combat' | 'ui' | 'world';
  description: string;
  slots: SlotSpec[];
  params: ParamSpec[];
  variants: VariantSpec[];
}

export interface SlotSpec {
  id: string;
  type: 'sprite' | 'sound' | 'tileset';
  accepts: string[]; // asset tags
  default?: string;
}

export interface ParamSpec {
  id: string;
  type: 'number' | 'boolean' | 'select';
  default: any;
  min?: number;
  max?: number;
  options?: string[];
}

export interface VariantSpec {
  id: string;
  label: string;
  module: string; // filename without .py
  description: string;
}

export interface ComponentConfig {
  category: string;
  id: string;
  variant: string;
  assets: Record<string, string>;
  params: Record<string, any>;
}

export interface ComponentInstance {
  update: (dt: number, events: string[]) => void;
  draw: (surface: any, x: number, y: number) => void;
  [key: string]: any; // Allow additional methods
}