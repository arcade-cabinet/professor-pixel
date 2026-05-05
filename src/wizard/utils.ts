import { WizardNode, DeviceState, LayoutMode, SessionActions } from './types';
import type { LucideIcon } from 'lucide-react';
import { BREAKPOINTS, GAME_TYPE_ICONS } from './constants';

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
export const getGameTypeIcon = (optionText: string): LucideIcon | null => {
  const gameType = extractGameType(optionText);
  if (gameType && GAME_TYPE_ICONS[gameType]) {
    return GAME_TYPE_ICONS[gameType];
  }
  // Return default icon if no game type found
  return null;
};

// "Continue"-pattern matcher: a single option whose text reads as a generic
// pacing affordance (Continue / Next / OK / Got it / Let's go / etc.) should
// render as the ContinueButton, not a 1-item options list. The pattern is
// case-insensitive and whitespace-trimmed; it matches the playtest analysis
// finding that single-option "continue" pickers add cognitive load without
// offering a real choice.
const CONTINUE_PATTERN =
  /^\s*(continue|next|ok(?:ay)?|got it|let'?s go|sounds good|sure)\s*[!.?]*\s*$/i;

// Returns the navigation target of a side-effect-free single-option node, or
// null. "Side-effect-free" means the option has no `action`, `setVariable`,
// or `updatePreview` — only a `next`. Used by `advance()` (any text) and as
// the inner check for `isSingleContinueOption` (continue-pattern text only).
// Single source of truth for the side-effect-free triple-check.
export const getSingleNavigableTarget = (currentNode: WizardNode | null): string | null => {
  if (!currentNode?.options) return null;
  if (currentNode.options.length !== 1) return null;
  const only = currentNode.options[0];
  if (only.action || only.setVariable || only.updatePreview) return null;
  return only.next ?? null;
};

const isSingleContinueOption = (currentNode: WizardNode | null): boolean => {
  if (getSingleNavigableTarget(currentNode) === null) return false;
  // Safe non-null: predicate above guaranteed options.length === 1.
  const only = currentNode!.options![0];
  return CONTINUE_PATTERN.test(only.text);
};

// Check if should show options
export const shouldShowOptions = (
  currentNode: WizardNode | null,
  dialogueStep: number
): boolean => {
  if (!currentNode) return false;

  if (currentNode.multiStep) {
    if (dialogueStep < currentNode.multiStep.length - 1) return false;
    if (isSingleContinueOption(currentNode)) return false;
    return !!currentNode.options;
  }

  if (isSingleContinueOption(currentNode)) return false;
  return !!currentNode.options;
};

// Check if should show continue button
export const shouldShowContinue = (
  currentNode: WizardNode | null,
  dialogueStep: number
): boolean => {
  if (!currentNode) return false;

  if (currentNode.multiStep) {
    if (dialogueStep < currentNode.multiStep.length - 1) return true;
    return isSingleContinueOption(currentNode);
  }

  return isSingleContinueOption(currentNode);
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
      const followUpText =
        conditionalFollowUps[sessionActions.gameType] || conditionalFollowUps.default || '';
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
    choices: [...sessionActions.choices, optionText],
  };

  // Only update gameType from option text if:
  // 1. We don't already have a gameType set (prevents overriding existing flow)
  // 2. The option text is for initial game type selection (not component variants)
  // Check if this is a game type selection by looking for specific patterns
  const isGameTypeSelection =
    !sessionActions.gameType &&
    (optionText.match(/^(Platformer|RPG|Dungeon|Racing|Puzzle|Adventure)\s*-/i) ||
      optionText.match(/^(Jumpy|Epic|Creepy|Speed|Brain|Point-and-Click)/i));

  if (!isGameTypeSelection) {
    // Don't modify gameType if this isn't an initial game selection
    return updatedActions;
  }

  // Handle special game type actions based on option text
  const lowerText = optionText.toLowerCase();

  if (
    lowerText.includes('platformer') ||
    lowerText.includes('jumpy') ||
    lowerText.includes('bouncy')
  ) {
    updatedActions.gameType = 'platformer';
  } else if (
    lowerText.includes('rpg') ||
    lowerText.includes('sword') ||
    lowerText.includes('sorcery') ||
    lowerText.includes('epic')
  ) {
    updatedActions.gameType = 'rpg';
  } else if (lowerText.includes('dungeon') || lowerText.includes('creepy')) {
    updatedActions.gameType = 'dungeon';
  } else if (
    lowerText.includes('racing') ||
    lowerText.includes('speed') ||
    lowerText.includes('turbo')
  ) {
    updatedActions.gameType = 'racing';
  } else if (
    lowerText.includes('puzzle') ||
    lowerText.includes('brain') ||
    lowerText.includes('tricky')
  ) {
    updatedActions.gameType = 'puzzle';
  } else if (
    lowerText.includes('adventure') ||
    lowerText.includes('explore') ||
    lowerText.includes('point-and-click')
  ) {
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
export const getButtonVariant = (isMobile: boolean, optionCount: number): 'outline' | 'default' => {
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
