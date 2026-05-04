import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Gamepad2,
  BookOpen,
  ChevronRight,
  Sparkles,
  Code2,
  Rocket,
  History,
  X
} from "lucide-react";
import { sessionHistory } from "@/lib/session-history";
import { useIsMobile } from "@/hooks/use-media-query";

// Import Pixel images
import pixelHappy from '@assets/pixel/Pixel_happy_excited_expression_22a41625.png';
import pixelThinking from '@assets/pixel/Pixel_thinking_pondering_expression_0ffffedb.png';
import pixelCelebrating from '@assets/pixel/Pixel_celebrating_victory_expression_24b7a377.png';
import pixelEncouraging from '@assets/pixel/Pixel_encouraging_supportive_expression_cf958090.png';
import pixelTeaching from '@assets/pixel/Pixel_teaching_explaining_expression_27e09763.png';
import pixelGaming from '@assets/pixel/Pixel_gaming_focused_expression_6f3fdfab.png';
import pixelWelcoming from '@assets/pixel/Pixel_welcoming_waving_expression_279ffdd2.png';
import pixelCoding from '@assets/pixel/Pixel_coding_programming_expression_56de8ca0.png';

type PresenceState = 'center-stage' | 'waiting-corner' | 'expanded-corner';

interface Choice {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  action: () => void;
}

interface PixelPresenceProps {
  onNavigate: (path: string) => void;
  currentPath?: string;
}

export default function PixelPresence({ onNavigate, currentPath = "/" }: PixelPresenceProps) {
  const [state, setState] = useState<PresenceState>('waiting-corner');
  const [currentChoices, setCurrentChoices] = useState<Choice[]>([]);
  const [pixelImage, setPixelImage] = useState(pixelWelcoming);
  const [dialogue, setDialogue] = useState("Need help?");
  const [showContent, setShowContent] = useState(false);
  const [mobileDialogueOpen, setMobileDialogueOpen] = useState(false);
  const isMobile = useIsMobile();

  // Initial choices for center stage
  const initialChoices: Choice[] = [
    {
      id: 'make-game',
      label: 'Make a game!',
      icon: Gamepad2,
      action: () => {
        sessionHistory.trackChoice('make-game', 'Make a game!', '/project-builder');
        setState('waiting-corner');
        setShowContent(true);
        setPixelImage(pixelGaming);
        setDialogue("Great choice! Let's build something awesome!");
        setTimeout(() => onNavigate('/project-builder'), 500);
      }
    },
    {
      id: 'learn-python',
      label: 'Learn Python first',
      icon: BookOpen,
      action: () => {
        sessionHistory.trackChoice('learn-python', 'Learn Python first', '/lesson/python-basics');
        setState('waiting-corner');
        setShowContent(true);
        setPixelImage(pixelTeaching);
        setDialogue("Perfect! Let's start with the basics!");
        setTimeout(() => onNavigate('/lesson/python-basics'), 500);
      }
    }
  ];

  // Lesson completion choices
  const lessonChoices: Choice[] = [
    {
      id: 'next-lesson',
      label: 'Next lesson!',
      icon: ChevronRight,
      action: () => {
        sessionHistory.trackChoice('next-lesson', 'Next lesson!');
        setState('waiting-corner');
        setPixelImage(pixelTeaching);
        setDialogue("On to the next challenge!");
        // Navigate to next lesson logic here
      }
    },
    {
      id: 'make-game-now',
      label: "I'm ready to make games!",
      icon: Gamepad2,
      action: () => {
        sessionHistory.trackChoice('make-game-now', "I'm ready to make games!", '/project-builder');
        setState('waiting-corner');
        setPixelImage(pixelGaming);
        setDialogue("Let's build your game!");
        setTimeout(() => onNavigate('/project-builder'), 500);
      }
    }
  ];

  // Initialize based on current path
  useEffect(() => {
    // Don't show on home page - home has its own center stage Pixel
    if (currentPath === '/') {
      setState('waiting-corner');
      setShowContent(false);
      return;
    }
    
    // Show corner presence on all other pages
    setState('waiting-corner');
    setShowContent(true);
    
    if (currentPath?.includes('/lesson')) {
      setPixelImage(pixelTeaching);
    } else if (currentPath?.includes('/wizard')) {
      setPixelImage(pixelGaming);
    } else if (currentPath === '/project-builder' || currentPath === '/projects') {
      setPixelImage(pixelCoding);
    } else if (currentPath === '/gallery' || currentPath?.includes('/gallery')) {
      setPixelImage(pixelHappy);
    } else {
      setPixelImage(pixelWelcoming);
    }
  }, [currentPath]);

  // Track navigation changes
  useEffect(() => {
    if (currentPath && currentPath !== '/') {
      sessionHistory.trackNavigation('', currentPath);
    }
  }, [currentPath]);

  // Expand Pixel for interactions
  const expandPixel = (choices: Choice[], newDialogue: string, image = pixelThinking) => {
    if (isMobile) {
      // On mobile, open dialogue modal instead
      setMobileDialogueOpen(true);
      setCurrentChoices(choices);
      setDialogue(newDialogue);
      setPixelImage(image);
    } else {
      // Desktop: expand from corner
      setState('expanded-corner');
      setCurrentChoices(choices);
      setDialogue(newDialogue);
      setPixelImage(image);
    }
  };

  // Collapse Pixel back to corner
  const collapsePixel = () => {
    if (isMobile) {
      setMobileDialogueOpen(false);
    } else {
      setState('waiting-corner');
    }
    setCurrentChoices([]);
  };

  // Menu choices when expanded (with review option)
  const expandedMenuChoices: Choice[] = [
    {
      id: 'continue',
      label: 'Continue forward',
      icon: ChevronRight,
      action: () => {
        collapsePixel();
      }
    },
    {
      id: 'go-home',
      label: 'Go home',
      icon: History,
      action: () => {
        onNavigate('/');
        collapsePixel();
      }
    }
  ];


  // Position and size variants for animations
  const variants = {
    'center-stage': {
      top: '50%',
      left: '50%',
      x: '-50%',
      y: '-50%',
      width: 'auto',
      height: 'auto',
      scale: 1,
      position: 'fixed' as const,
      zIndex: 1000
    },
    'waiting-corner': {
      top: '80px',
      left: '20px',
      x: 0,
      y: 0,
      width: '48px',
      height: '48px',
      scale: 1,
      position: 'fixed' as const,
      zIndex: 999
    },
    'expanded-corner': {
      top: '80px',
      left: '20px',
      x: 0,
      y: 0,
      width: 'auto',
      height: 'auto',
      scale: 1,
      position: 'fixed' as const,
      zIndex: 1000
    }
  };

  // Don't show on home page
  if (currentPath === '/') {
    return null;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          variants={variants}
          initial={state}
          animate={state}
          exit={{ opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 100, 
            damping: 20,
            duration: 0.6 
          }}
          className="pointer-events-auto"
          style={{ position: 'fixed' }}
        >
          {state === 'center-stage' ? (
            // Not used anymore - home page handles center stage
            null
          ) : state === 'waiting-corner' ? (
            // Small corner mode - just the avatar
            <motion.button
              className="relative group cursor-pointer"
              onClick={() => {
                if (currentPath?.includes('/lesson')) {
                  expandPixel(lessonChoices, "How did that go?", pixelThinking);
                } else {
                  expandPixel(expandedMenuChoices, "What would you like to do?", pixelThinking);
                }
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              data-testid="pixel-expand"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-purple-500/50 shadow-lg">
                <img 
                  src={pixelImage} 
                  alt="Pixel" 
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'crisp-edges' }}
                  data-testid="pixel-avatar"
                />
              </div>
              {/* Breathing animation overlay */}
              <motion.div
                className="absolute inset-0 rounded-full bg-purple-500/20"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              {/* Tooltip on hover - desktop only */}
              {!isMobile && (
                <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Click me for help!
                </div>
              )}
            </motion.button>
          ) : !isMobile ? (
            // Desktop: Expanded corner mode - medium size with choices
            <Card className="w-80 p-4 shadow-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-2 border-purple-500/20">
              <div className="flex flex-col space-y-4">
                {/* Header with Pixel */}
                <div className="flex items-center space-x-3">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-500/30">
                    <img 
                      src={pixelImage} 
                      alt="Pixel" 
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'crisp-edges' }}
                      data-testid="pixel-avatar"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{dialogue}</p>
                  </div>
                  <button
                    onClick={collapsePixel}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="collapse-pixel"
                  >
                    ×
                  </button>
                </div>

                {/* Choices */}
                <div className="space-y-2">
                  {currentChoices.map((choice, index) => (
                    <Button
                      key={choice.id}
                      onClick={() => {
                        choice.action();
                        collapsePixel();
                      }}
                      size="sm"
                      variant={index === 0 ? "default" : "outline"}
                      className="w-full justify-start"
                      data-testid={index === 0 ? "pixel-choice-a" : "pixel-choice-b"}
                    >
                      {choice.icon && <choice.icon className="w-4 h-4 mr-2" />}
                      <span>{choice.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* Mobile Dialogue Modal */}
      {isMobile && mobileDialogueOpen && currentChoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed inset-x-0 bottom-0 z-50 p-4 pb-safe"
        >
          <Card className="relative w-full p-6 bg-white/98 dark:bg-gray-900/98 backdrop-blur-xl shadow-2xl border-2 border-purple-500/20 rounded-t-2xl">
            {/* Close button for mobile modal */}
            <button
              onClick={() => setMobileDialogueOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              data-testid="mobile-dialogue-close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Mobile Dialogue Header */}
            <div className="mb-4">
              <p className="text-lg font-semibold">{dialogue}</p>
            </div>

            {/* Mobile Choices */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {currentChoices.map((choice, index) => (
                <Button
                  key={choice.id}
                  onClick={() => {
                    choice.action();
                    collapsePixel();
                  }}
                  size="lg"
                  variant={index === 0 ? "default" : "outline"}
                  className="w-full justify-start py-4 text-left"
                  data-testid={`mobile-choice-${index}`}
                >
                  {choice.icon && <choice.icon className="h-5 w-5 mr-3 flex-shrink-0" />}
                  <span className="font-medium">{choice.label}</span>
                </Button>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

    </>
  );
}