import { 
  WizardNode, 
  DeviceState, 
  LayoutMode,
  SessionActions
} from './wizard-types';
import { BREAKPOINTS, GAME_TYPE_ICONS } from './wizard-constants';

// Device detection utilities
export const detectDevice = (): DeviceState => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isMobile = width < BREAKPOINTS.MOBILE_MAX_WIDTH;
  const isLandscape = width > height;

  return {
    isMobile,
    isLandscape,
    screenWidth: width,
    screenHeight: height,
  };
};

// Determine layout mode based on device state
export const getLayoutMode = (deviceState: DeviceState): LayoutMode => {
  // Only phones get special mobile layouts, tablets use desktop
  if (!deviceState.isMobile) return 'desktop';
  if (deviceState.isLandscape) return 'phone-landscape';
  return 'phone-portrait';
};

// Extract game type from option text
export const extractGameType = (optionText: string): string | null => {
  const gameTypeMatch = optionText.match(/^(\w+)\s*-/);
  return gameTypeMatch ? gameTypeMatch[1].toLowerCase() : null;
};

// Get icon for game type
export const getGameTypeIcon = (optionText: string): any => {
  const gameType = extractGameType(optionText);
  if (gameType && GAME_TYPE_ICONS[gameType]) {
    return GAME_TYPE_ICONS[gameType];
  }
  // Return default icon if no game type found
  return null;
};

// Check if should show options
export const shouldShowOptions = (
  currentNode: WizardNode | null, 
  dialogueStep: number
): boolean => {
  if (!currentNode) return false;
  
  if (currentNode.multiStep) {
    return dialogueStep >= currentNode.multiStep.length - 1 && !!currentNode.options;
  }
  
  return !!currentNode.options;
};

// Check if should show continue button
export const shouldShowContinue = (
  currentNode: WizardNode | null,
  dialogueStep: number
): boolean => {
  if (!currentNode) return false;
  
  if (currentNode.multiStep) {
    return dialogueStep < currentNode.multiStep.length - 1;
  }
  
  return false;
};

// Get current dialogue text
export const getCurrentText = (
  currentNode: WizardNode | null,
  dialogueStep: number,
  sessionActions?: SessionActions
): string => {
  if (!currentNode) return '';
  
  if (currentNode.multiStep) {
    return currentNode.multiStep[dialogueStep];
  }
  
  let text = '';
  
  // Handle conditional text based on game type
  if (currentNode.conditionalText && sessionActions?.gameType) {
    const conditionalTexts = currentNode.conditionalText.gameType;
    if (conditionalTexts) {
      text = conditionalTexts[sessionActions.gameType] || conditionalTexts.default || '';
    }
  }
  
  // Fall back to regular text if no conditional text
  if (!text) {
    text = currentNode.text || '';
  }
  
  // Add followUp text if present
  if (currentNode.followUp) {
    text = text ? `${text}\n\n${currentNode.followUp}` : currentNode.followUp;
  }
  
  // Add conditional followUp based on game type
  if (currentNode.conditionalFollowUp && sessionActions?.gameType) {
    const conditionalFollowUps = currentNode.conditionalFollowUp.gameType;
    if (conditionalFollowUps) {
      const followUpText = conditionalFollowUps[sessionActions.gameType] || conditionalFollowUps.default || '';
      if (followUpText) {
        text = text ? `${text}\n\n${followUpText}` : followUpText;
      }
    }
  }
  
  return text;
};

// Update session actions based on option selection
export const updateSessionActionsForOption = (
  sessionActions: SessionActions,
  optionText: string
): SessionActions => {
  const updatedActions = {
    ...sessionActions,
    choices: [...sessionActions.choices, optionText]
  };

  // Only update gameType from option text if:
  // 1. We don't already have a gameType set (prevents overriding existing flow)
  // 2. The option text is for initial game type selection (not component variants)
  // Check if this is a game type selection by looking for specific patterns
  const isGameTypeSelection = !sessionActions.gameType && 
    (optionText.match(/^(Platformer|RPG|Dungeon|Racing|Puzzle|Adventure)\s*-/i) ||
     optionText.match(/^(Jumpy|Epic|Creepy|Speed|Brain|Point-and-Click)/i));
  
  if (!isGameTypeSelection) {
    // Don't modify gameType if this isn't an initial game selection
    return updatedActions;
  }
  
  // Handle special game type actions based on option text
  const lowerText = optionText.toLowerCase();
  
  if (lowerText.includes('platformer') || lowerText.includes('jumpy') || lowerText.includes('bouncy')) {
    updatedActions.gameType = 'platformer';
  } else if (lowerText.includes('rpg') || lowerText.includes('sword') || lowerText.includes('sorcery') || lowerText.includes('epic')) {
    updatedActions.gameType = 'rpg';
  } else if (lowerText.includes('dungeon') || lowerText.includes('creepy')) {
    updatedActions.gameType = 'dungeon';
  } else if (lowerText.includes('racing') || lowerText.includes('speed') || lowerText.includes('turbo')) {
    updatedActions.gameType = 'racing';
  } else if (lowerText.includes('puzzle') || lowerText.includes('brain') || lowerText.includes('tricky')) {
    updatedActions.gameType = 'puzzle';
  } else if (lowerText.includes('adventure') || lowerText.includes('explore') || lowerText.includes('point-and-click')) {
    updatedActions.gameType = 'adventure';
  }

  return updatedActions;
};

// Load wizard flow data
export const loadWizardFlow = async (path: string): Promise<Record<string, WizardNode>> => {
  try {
    const response = await fetch(path);
    const data = await response.json();
    // Support both nested and flat structure
    return data.nodes || data;
  } catch (error) {
    console.error('Failed to load wizard flow:', error);
    throw error;
  }
};

// Determine if option grid should be used
export const shouldUseOptionGrid = (optionCount: number, isMobile: boolean): boolean => {
  return !isMobile && optionCount > 4;
};

// Get button variant based on context
export const getButtonVariant = (
  isMobile: boolean,
  optionCount: number
): 'outline' | 'default' => {
  if (isMobile) return 'outline';
  if (optionCount > 4) return 'outline';
  return 'default';
};

// Get button size based on device
export const getButtonSize = (isMobile: boolean): 'lg' | 'default' => {
  return isMobile ? 'lg' : 'default';
};

// Format test id
export const formatTestId = (prefix: string, index: number): string => {
  return `${prefix}-${index}`;
};