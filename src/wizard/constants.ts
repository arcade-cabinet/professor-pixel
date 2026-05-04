import { 
  Sword, TreePine, Car, Castle, Brain, Trophy, Zap
} from 'lucide-react';

// Game type icons mapping
export const GAME_TYPE_ICONS: Record<string, any> = {
  rpg: Sword,
  platformer: TreePine,
  racing: Car,
  dungeon: Castle,
  puzzle: Brain,
  adventure: Trophy,
  space: Zap
};

// Layout breakpoints
export const BREAKPOINTS = {
  MOBILE_MAX_WIDTH: 768,
  TABLET_MIN_WIDTH: 768,
  TABLET_MAX_WIDTH: 1024,
  DESKTOP_MIN_WIDTH: 1024,
} as const;

// Animation durations
export const ANIMATIONS = {
  AVATAR_BOUNCE: {
    duration: 3,
    scale: [1, 1.05, 1],
    rotate: [0, 5, -5, 0],
  },
  AVATAR_PULSE: {
    duration: 2,
    scale: [1, 1.2, 1],
  },
  SPARKLE_ROTATE: {
    duration: 20,
    rotate: [0, 360],
  },
  FADE_IN: {
    duration: 0.5,
    delay: 0.3,
  },
  OPTION_STAGGER: {
    delay: 0.05,
  },
  DIALOGUE_TRANSITION: {
    duration: 0.3,
    delay: 0.1,
  },
  MINIMIZE_ANIMATION: {
    messageDuration: 2000,
    animationDuration: 1200,
    totalDuration: 3500,
    springConfig: {
      damping: 15,
      stiffness: 100,
    },
  },
  IDLE_ANIMATIONS: {
    blinkDuration: 200,
    waveDuration: 500,
    minDelay: 10000,
    maxDelay: 20000,
  },
  ENCOURAGEMENT: {
    showDuration: 4000,
    firstShowDelay: 30000,
    interval: 120000,
  },
} as const;

// Edge swipe configuration
export const EDGE_SWIPE_CONFIG = {
  threshold: 30,
  enabled: true,
} as const;

// Default wizard data path
export const WIZARD_FLOW_PATH = '/wizard-flow.json';

// Initial states
export const INITIAL_NODE_ID = 'start';

// Pixel avatar sizes
export const AVATAR_SIZES = {
  DESKTOP: {
    width: 'w-32',
    height: 'h-32',
  },
  PHONE_PORTRAIT: {
    width: 'w-32',
    height: 'h-32',
  },
  PHONE_LANDSCAPE: {
    width: 'w-20',
    height: 'h-20',
    widthSm: 'sm:w-24',
    heightSm: 'sm:h-24',
  },
  MINIMIZED_DESKTOP: {
    width: 'w-14',
    height: 'h-14',
  },
  MINIMIZED_MOBILE: {
    width: 'w-12',
    height: 'h-12',
  },
} as const;

// Style configurations
export const STYLES = {
  GRADIENT_BG: 'bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-blue-950',
  CARD_BG: 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl',
  DIALOGUE_BG: 'bg-white/90 dark:bg-gray-900/90 rounded-xl shadow-lg backdrop-blur-sm',
  BUTTON_GRADIENT: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
  HEADER_BG: 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg',
  PIXEL_STATUS_INDICATOR: 'bg-green-400 rounded-full border-4 border-white shadow-lg',
  MINIMIZED_RING: 'ring-2 ring-purple-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900',
  SPEECH_BUBBLE: 'bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-purple-200 dark:border-purple-800',
} as const;

// Button styles based on context
export const BUTTON_STYLES = {
  MOBILE_OPTION: 'w-full justify-start text-left py-4 px-4',
  DESKTOP_GRID: 'p-4 h-auto flex flex-col items-center justify-center text-center',
  DESKTOP_DEFAULT: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6',
  PHONE_PORTRAIT: 'w-full justify-start text-left py-5 px-5 bg-white/95 dark:bg-gray-900/95 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all transform active:scale-95',
  PHONE_LANDSCAPE: 'w-full justify-start text-left py-3 px-4 bg-white/95 dark:bg-gray-900/95 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all transform active:scale-95',
  CONTINUE_MOBILE: 'w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold',
  CONTINUE_DESKTOP: 'py-3 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold',
} as const;

// Icon sizes
export const ICON_SIZES = {
  SMALL: 'h-4 w-4',
  MEDIUM: 'h-5 w-5',
  LARGE: 'h-8 w-8',
  EXTRA_LARGE: 'h-12 w-12',
} as const;