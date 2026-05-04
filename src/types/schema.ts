// Simple TypeScript types for Pixel's PyGame Palace - no database dependencies!

export interface User {
  id: string;
  username: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  order: number;
  intro?: string;
  learningObjectives?: string[];
  goalDescription?: string;
  previewCode?: string;
  content: {
    introduction: string;
    steps: Array<{
      id: string;
      title: string;
      description: string;
      initialCode: string;
      solution: string;
      hints: string[];
      tests?: Array<{
        input?: string;
        expectedOutput: string;
        description?: string;
        mode?: 'output' | 'rules';
        astRules?: {
          requiredFunctions?: string[];
          requiredConstructs?: Array<{
            type: 'variable_assignment' | 'function_call' | 'import' | 'if_statement' | 'loop' | 'string_literal' | 'f_string';
            name?: string;
            minCount?: number;
            maxCount?: number;
          }>;
          forbiddenConstructs?: Array<{
            type: 'variable_assignment' | 'function_call' | 'import' | 'if_statement' | 'loop' | 'string_literal' | 'f_string';
            name?: string;
          }>;
        };
        runtimeRules?: {
          outputContains?: string[];
          outputMatches?: string;
          variableExists?: string[];
          functionCalled?: string[];
          acceptsUserInput?: boolean;
          outputIncludesInput?: boolean;
        };
      }>;
      validation?: {
        type: 'output' | 'variable' | 'function' | 'exact';
        expected?: any;
      };
    }>;
  };
  prerequisites?: string[];
  difficulty?: string;
  estimatedTime?: number;
}

export interface UserProgress {
  id: string;
  userId: string;
  lessonId: string;
  currentStep: number;
  completed: boolean;
  code?: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  template: string;
  description?: string;
  published: boolean;
  createdAt: Date;
  publishedAt?: Date;
  thumbnailDataUrl?: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  assets: Array<{
    id: string;
    name: string;
    type: 'image' | 'sound' | 'other';
    path: string;
    dataUrl: string;
  }>;
}

export type ProjectAsset = Project['assets'][0];
export type ProjectFile = Project['files'][0];

// For backward compatibility, keeping these type aliases
export type InsertUser = Omit<User, 'id'>;
export type InsertLesson = Omit<Lesson, 'id'>;
export type InsertUserProgress = Omit<UserProgress, 'id'>;
export type InsertProject = Omit<Project, 'id' | 'createdAt' | 'publishedAt'>;

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