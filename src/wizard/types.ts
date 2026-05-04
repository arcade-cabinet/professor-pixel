import { ComponentType } from 'react';

// Main component props
export interface UniversalWizardProps {
  className?: string;
  assetMode?: 'curated' | 'full';
  editorLocked?: boolean;
}

// Core wizard node structure
export interface WizardNode {
  id: string;
  text?: string;
  followUp?: string;
  conditionalText?: {
    gameType: Record<string, string>;
  };
  conditionalFollowUp?: {
    gameType: Record<string, string>;
  };
  speaker?: string;
  multiStep?: string[];
  options?: WizardOption[];
  action?: string; // Can be 'openWYSIWYGEditor', 'openEditor', 'openLessons', 'showAssets', 'minimizePixel'
  additionalAction?: string;
  params?: Record<string, any>;
  tags?: string[];
  conditional?: {
    condition: string;
    trueNext?: string;
    falseNext?: string;
  };
  showLivePreview?: LivePreviewConfig;
}

// Live preview configuration
export interface LivePreviewConfig {
  enabled: boolean;
  previewType: 'character' | 'enemy' | 'collectible' | 'mechanic' | 'rule' | 'comparison';
  choices?: GameChoice[];
  alternativeChoice?: GameChoice;
  pixelComments?: string[];
  autoPlay?: boolean;
}

export interface GameChoice {
  type: 'character' | 'enemy' | 'collectible' | 'background' | 'rule' | 'mechanic';
  id: string;
  name: string;
  properties?: Record<string, any>;
  sprite?: string;
  behavior?: string;
  code?: string;
}

// Wizard option
export interface WizardOption {
  text: string;
  next: string;
  setVariable?: Record<string, any>;
  updatePreview?: GameChoice;
  previewComment?: string;
  action?: string; // Option can also have an action
  actionParams?: Record<string, any>;
}

// Session Actions for tracking user progress
export interface SessionActions {
  choices: string[];
  createdAssets: string[];
  gameType: string | null;
  currentProject: string | null;
  completedSteps: string[];
  unlockedEditor: boolean;
  livePreviewChoices?: GameChoice[];
  previewHistory?: Array<{
    nodeId: string;
    choice: GameChoice;
    timestamp: Date;
  }>;
  titlePresetApplied?: boolean;
  gameplayConfigured?: boolean;
  endingConfigured?: boolean;
  gameAssembled?: boolean;
  selectedComponents?: Record<string, string>; // componentId -> variant (A or B)
  compiledScenes?: Record<string, boolean>; // scene -> compiled status
  selectedGameType?: string; // The specific game type (platformer, rpg, racing, dungeon, etc.)
  transitionToSpecializedFlow?: boolean; // Flag to track when we need to transition to specialized flow
  gameName?: string; // The name of the game being created
  selectedBundles?: Record<string, any>; // Bundle selections for components
}

// Session action for PixelMenu
export interface SessionAction {
  id: string;
  type: 'game_created' | 'lesson_completed' | 'asset_selected' | 'code_generated' | 'settings_changed';
  title: string;
  description?: string;
  timestamp: Date;
  icon: ComponentType<any>;
}

// Layout modes
export type LayoutMode = 'desktop' | 'phone-portrait' | 'phone-landscape';

// Embedded component types
export type EmbeddedComponentType = 'none' | 'code-editor' | 'professional-editor' | 'block-builder' | 'pygame-runner';

// Pixel state
export type PixelState = 'center-stage' | 'minimized';

// Device state
export interface DeviceState {
  isMobile: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
}

// Dialogue state
export interface DialogueState {
  currentNodeId: string;
  currentNode: WizardNode | null;
  dialogueStep: number;
  carouselIndex: number;
  showAllChoices: boolean;
}

// UI state
export interface UIState {
  pixelMenuOpen: boolean;
  embeddedComponent: EmbeddedComponentType;
  pixelState: PixelState;
  wysiwygEditorOpen?: boolean;
  assetBrowserOpen?: boolean;
  assetBrowserType?: 'sprite' | 'sound' | 'music' | 'background' | 'font' | 'all';
  selectedGameType?: string;
  showLivePreview?: boolean;
  livePreviewLoading?: boolean;
  minimizeMessage?: string;
  isMinimizing?: boolean;
  previewMode?: string;
  viewMode?: string;
  curatedMode?: boolean;
  componentChoiceOpen?: boolean;
  currentComponentId?: string;
  currentComponentCategory?: string;
  pyodideMode?: boolean;
}

// Edge swipe handler options
export interface EdgeSwipeOptions {
  onEdgeSwipe: (edge: string) => void;
  edgeThreshold?: number;
  enabled?: boolean;
}