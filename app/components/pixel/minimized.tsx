import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  Trophy, 
  Sparkles, 
  MessageCircle,
  Target,
  Star
} from 'lucide-react';
import pixelImage from '@assets/pixel/Pixel_happy_excited_expression_22a41625.png';
import { SessionActions } from './wizard-types';

interface PixelMinimizedProps {
  onRestore: () => void;
  sessionActions: SessionActions;
  isMobile: boolean;
  currentLesson?: string;
  currentGame?: string;
}

const encouragementMessages = [
  "You're doing great! 🌟",
  "Keep it up, champion! 💪",
  "Amazing progress! 🎉",
  "You've got this! 🚀",
  "Brilliant work! ✨",
  "I believe in you! 💜",
  "So proud of you! 🌈",
  "You're a natural! 🎮"
];

const tips = [
  "Try experimenting with different speeds!",
  "Remember to test your game often!",
  "Small changes can make a big difference!",
  "Don't forget to save your progress!",
  "Try adding sound effects for more fun!",
  "Colors can change the whole mood!",
  "Every game developer started like you!",
  "Mistakes are just learning opportunities!"
];

export default function PixelMinimized({
  onRestore,
  sessionActions,
  isMobile,
  currentLesson,
  currentGame
}: PixelMinimizedProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentTip, setCurrentTip] = useState(tips[0]);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [encouragementMessage, setEncouragementMessage] = useState(encouragementMessages[0]);
  const [idleAnimation, setIdleAnimation] = useState<'blink' | 'wave' | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Position based on device
  const position = isMobile 
    ? "top-2 right-2" 
    : "top-4 left-4";

  // Size based on device
  const size = isMobile
    ? "w-12 h-12"
    : "w-14 h-14";

  // Show random encouragement periodically
  useEffect(() => {
    const showRandomEncouragement = () => {
      const randomMessage = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
      setEncouragementMessage(randomMessage);
      setShowEncouragement(true);
      
      setTimeout(() => {
        setShowEncouragement(false);
      }, 4000);
    };

    // Show first encouragement after 30 seconds
    const firstTimer = setTimeout(showRandomEncouragement, 30000);
    
    // Then show every 2 minutes
    const interval = setInterval(showRandomEncouragement, 120000);

    return () => {
      clearTimeout(firstTimer);
      clearInterval(interval);
    };
  }, []);

  // Random idle animations
  useEffect(() => {
    const runIdleAnimation = () => {
      const animations: Array<'blink' | 'wave'> = ['blink', 'wave'];
      const randomAnim = animations[Math.floor(Math.random() * animations.length)];
      setIdleAnimation(randomAnim);
      
      setTimeout(() => {
        setIdleAnimation(null);
      }, 1000);
    };

    // Run idle animation every 10-20 seconds
    const scheduleNext = () => {
      const delay = 10000 + Math.random() * 10000;
      timeoutRef.current = setTimeout(() => {
        runIdleAnimation();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Change tip on hover
  useEffect(() => {
    if (isHovered) {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      setCurrentTip(randomTip);
      
      // Show tooltip after a short delay
      const timer = setTimeout(() => {
        if (isHovered) setShowTooltip(true);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setShowTooltip(false);
    }
  }, [isHovered]);

  // Calculate progress
  const completedLessons = sessionActions.completedSteps.filter(step => step.includes('lesson')).length;
  const hasAchievements = sessionActions.completedSteps.length > 3;

  // Handle click with swipe down on mobile
  const handleInteraction = () => {
    if (!isMobile) {
      onRestore();
    }
  };

  // Swipe handler for mobile
  const handleTouchStart = useRef<{ y: number } | null>(null);
  
  const handleTouchStartEvent = (e: React.TouchEvent) => {
    handleTouchStart.current = { y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (handleTouchStart.current && isMobile) {
      const deltaY = e.changedTouches[0].clientY - handleTouchStart.current.y;
      if (deltaY > 50) { // Swipe down threshold
        onRestore();
      }
    }
    handleTouchStart.current = null;
  };

  return (
    <>
      {/* Main minimized avatar */}
      <motion.div
        className={`fixed ${position} z-40`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStartEvent}
        onTouchEnd={handleTouchEnd}
      >
        <motion.button
          className="relative group"
          onClick={handleInteraction}
          whileHover={!isMobile ? { scale: 1.15 } : undefined}
          whileTap={{ scale: 0.95 }}
          animate={idleAnimation === 'wave' ? {
            rotate: [0, -10, 10, -10, 0]
          } : undefined}
          transition={idleAnimation === 'wave' ? {
            duration: 0.5,
            ease: "easeInOut"
          } : undefined}
        >
          {/* Avatar container */}
          <div className={`relative ${size} rounded-full overflow-hidden shadow-lg ring-2 ring-purple-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900`}>
            <motion.img
              src={pixelImage}
              alt="Pixel Assistant"
              className="w-full h-full object-cover"
              style={{ imageRendering: 'crisp-edges' }}
              animate={idleAnimation === 'blink' ? {
                scaleY: [1, 0.1, 1]
              } : {
                scale: [1, 1.05, 1]
              }}
              transition={idleAnimation === 'blink' ? {
                duration: 0.2,
                times: [0, 0.5, 1]
              } : {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Pulse animation overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-purple-400/20 to-transparent"
              animate={{
                opacity: [0, 0.5, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>

          {/* Progress indicator */}
          {completedLessons > 0 && (
            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg">
              {completedLessons}
            </div>
          )}

          {/* Achievement badge */}
          {hasAchievements && (
            <motion.div
              className="absolute -top-1 -right-1"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.5 }}
            >
              <Trophy className="w-4 h-4 text-yellow-500" />
            </motion.div>
          )}

          {/* Mobile swipe indicator */}
          {isMobile && isHovered && (
            <motion.div
              className="absolute -bottom-6 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ChevronDown className="w-4 h-4 text-purple-600 animate-bounce" />
            </motion.div>
          )}
        </motion.button>

        {/* Tooltip for desktop */}
        <AnimatePresence>
          {showTooltip && !isMobile && (
            <motion.div
              className="absolute top-full left-0 mt-2 w-64 pointer-events-none"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-3 border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                      Pixel's Tip:
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {currentTip}
                    </p>
                  </div>
                </div>
                
                {/* Current activity */}
                {(currentLesson || currentGame) && (
                  <div className="mt-2 pt-2 border-t border-purple-100 dark:border-purple-900">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                      <Target className="w-3 h-3" />
                      <span>
                        {currentLesson ? `Learning: ${currentLesson}` : `Building: ${currentGame}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Restore hint */}
                <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
                  Click me to return! 🚀
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Encouragement speech bubble */}
      <AnimatePresence>
        {showEncouragement && (
          <motion.div
            className={`fixed z-30 ${isMobile ? 'top-16 right-2' : 'top-20 left-4'}`}
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <div className="relative">
              {/* Speech bubble tail */}
              <div className={`absolute ${isMobile ? '-top-2 right-6' : '-top-2 left-6'} w-0 h-0 
                border-l-[8px] border-l-transparent
                border-r-[8px] border-r-transparent
                border-b-[8px] border-b-white dark:border-b-gray-900`} />
              
              {/* Speech bubble content */}
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-3 max-w-[200px] border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {encouragementMessage}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional progress widget */}
      {completedLessons >= 3 && (
        <motion.div
          className={`fixed ${isMobile ? 'top-16 left-2' : 'top-4 left-20'} z-30`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-purple-100 dark:border-purple-900">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Level {Math.floor(completedLessons / 3)}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}