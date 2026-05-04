import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Trophy,
  Gamepad2,
  Code,
  Palette,
  Music,
  Settings
} from 'lucide-react';
import { SessionActions } from './wizard-types';
import { useEffect, useState } from 'react';

interface GameProgressSidebarProps {
  sessionActions: SessionActions;
  gameName?: string;
  className?: string;
}

interface StageInfo {
  id: string;
  label: string;
  icon: React.ReactNode;
  isComplete: boolean;
  description?: string;
  previewImage?: string;
  components?: Record<string, string>;
}

interface ComponentSelection {
  category: string;
  name: string;
  variant?: string;
  timestamp?: Date;
}

export default function GameProgressSidebar({ 
  sessionActions, 
  gameName,
  className = '' 
}: GameProgressSidebarProps) {
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const [buildMessage, setBuildMessage] = useState<string | null>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [componentList, setComponentList] = useState<ComponentSelection[]>([]);
  const [previousComponents, setPreviousComponents] = useState<Record<string, string>>({});

  // Calculate progress based on completed stages
  useEffect(() => {
    let progress = 0;
    const stages = 4; // Title, Gameplay, Ending, Final Assembly
    
    if (sessionActions.titlePresetApplied) progress += 25;
    if (sessionActions.gameplayConfigured) progress += 25;
    if (sessionActions.endingConfigured) progress += 25;
    if (sessionActions.gameAssembled) progress += 25;
    
    // Also consider selected components
    const componentCount = Object.keys(sessionActions.selectedComponents || {}).length;
    if (componentCount > 0 && progress < 100) {
      // Add up to 10% bonus for having components selected
      const componentBonus = Math.min(componentCount * 2, 10);
      progress = Math.min(progress + componentBonus, 95); // Cap at 95% if not fully assembled
    }
    
    setProgressPercentage(progress);
  }, [sessionActions]);

  // Track component additions and show animations
  useEffect(() => {
    const currentComponents = sessionActions.selectedComponents || {};
    const newComponents: ComponentSelection[] = [];
    
    // Check for new components
    Object.entries(currentComponents).forEach(([componentId, variant]) => {
      if (!previousComponents[componentId] || previousComponents[componentId] !== variant) {
        // New component added or changed
        const category = componentId.split('_')[0]; // Extract category from ID
        const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
        
        setRecentlyAdded(componentId);
        setBuildMessage(`Building your ${formattedCategory}...`);
        
        // Clear the message after 2 seconds
        setTimeout(() => {
          setBuildMessage(null);
          setRecentlyAdded(null);
        }, 2000);
      }
    });
    
    // Update component list
    const componentArray = Object.entries(currentComponents).map(([id, variant]) => {
      const parts = id.split('_');
      const category = parts[0];
      const name = parts.slice(1).join(' ');
      
      return {
        category: category.charAt(0).toUpperCase() + category.slice(1),
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
        variant: variant,
        timestamp: new Date()
      };
    });
    
    setComponentList(componentArray);
    setPreviousComponents(currentComponents);
  }, [sessionActions.selectedComponents]);

  // Define stages with their completion status
  const stages: StageInfo[] = [
    {
      id: 'title',
      label: 'Title Screen',
      icon: <Palette className="w-4 h-4" />,
      isComplete: !!sessionActions.titlePresetApplied,
      description: sessionActions.titlePresetApplied ? 'Title screen configured' : 'Design your game\'s first impression',
      components: sessionActions.titlePresetApplied ? { title: 'configured' } : {}
    },
    {
      id: 'gameplay',
      label: 'Gameplay',
      icon: <Gamepad2 className="w-4 h-4" />,
      isComplete: !!sessionActions.gameplayConfigured,
      description: sessionActions.gameplayConfigured ? 'Core mechanics set' : 'Define your game mechanics',
      components: sessionActions.gameplayConfigured ? { gameplay: 'configured' } : {}
    },
    {
      id: 'ending',
      label: 'Ending',
      icon: <Trophy className="w-4 h-4" />,
      isComplete: !!sessionActions.endingConfigured,
      description: sessionActions.endingConfigured ? 'Victory conditions ready' : 'Create your victory screen',
      components: sessionActions.endingConfigured ? { ending: 'configured' } : {}
    },
    {
      id: 'assembly',
      label: 'Final Build',
      icon: <Code className="w-4 h-4" />,
      isComplete: !!sessionActions.gameAssembled,
      description: sessionActions.gameAssembled ? 'Game fully assembled!' : 'Compile everything together',
      components: sessionActions.gameAssembled ? { full: 'assembled' } : {}
    }
  ];

  // Get motivational message based on progress
  const getProgressMessage = () => {
    if (progressPercentage === 0) return "Let's start building!";
    if (progressPercentage < 25) return "Great start!";
    if (progressPercentage < 50) return "Making good progress!";
    if (progressPercentage < 75) return "Almost there!";
    if (progressPercentage < 100) return "Just a bit more!";
    return "Your game is ready! 🎮";
  };

  const gameTypeIcons: Record<string, React.ReactNode> = {
    platformer: '🏃‍♂️',
    rpg: '⚔️',
    racing: '🏎️',
    puzzle: '🧩',
    dungeon: '🏰',
    space: '🚀'
  };

  const gameIcon = sessionActions.gameType ? gameTypeIcons[sessionActions.gameType] || '🎮' : '🎮';

  return (
    <motion.div 
      className={`w-80 h-full bg-gradient-to-b from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4 overflow-y-auto ${className}`}
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur">
        {/* Game Title Header */}
        <div className="mb-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">{gameIcon}</span>
            <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {gameName || 'Your Game'}
            </h2>
          </div>
          {sessionActions.gameType && (
            <Badge variant="secondary" className="capitalize">
              {sessionActions.gameType} Game
            </Badge>
          )}
        </div>

        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {progressPercentage}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2 mb-2" />
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            {getProgressMessage()}
          </p>
        </div>

        {/* Build Message Animation */}
        <AnimatePresence>
          {buildMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </motion.div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {buildMessage}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage Progress */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-200">
            Development Stages
          </h3>
          <div className="space-y-3">
            {stages.map((stage, index) => (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative ${recentlyAdded === stage.id ? 'animate-pulse' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Stage Icon/Status */}
                  <div className="mt-0.5">
                    {stage.isComplete ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </motion.div>
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>

                  {/* Stage Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {stage.icon}
                      <span className={`text-sm font-medium ${
                        stage.isComplete 
                          ? 'text-gray-800 dark:text-gray-100' 
                          : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {stage.label}
                      </span>
                      {stage.isComplete && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          ✓ Done
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stage.description}
                    </p>
                  </div>
                </div>

                {/* Connection line to next stage */}
                {index < stages.length - 1 && (
                  <div className="ml-2.5 mt-1 mb-1">
                    <div className={`w-0.5 h-4 ${
                      stage.isComplete 
                        ? 'bg-green-300 dark:bg-green-700' 
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Selected Components */}
        {componentList.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
              Selected Components
            </h3>
            <div className="space-y-2">
              {componentList.map((component, index) => (
                <motion.div
                  key={`${component.category}-${component.name}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs"
                >
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {component.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400">
                      {component.variant === 'A' ? 'Option A' : 'Option B'}
                    </span>
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Motivational Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Sparkles className="w-3 h-3" />
            <span>Keep going! You're creating something amazing!</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}