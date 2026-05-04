import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { 
  X, 
  Gamepad2, 
  BookOpen, 
  Download, 
  TrendingUp, 
  Home,
  Clock,
  Trophy,
  Code2,
  Settings,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

// Import Pixel images
import pixelExcited from '@assets/pixel/Pixel_celebrating_victory_expression_24b7a377.png';
import pixelHappy from '@assets/pixel/Pixel_happy_excited_expression_22a41625.png';
import pixelThinking from '@assets/pixel/Pixel_thinking_pondering_expression_0ffffedb.png';

interface SessionAction {
  id: string;
  type: 'game_created' | 'lesson_completed' | 'asset_selected' | 'code_generated' | 'settings_changed';
  title: string;
  description?: string;
  timestamp: Date;
  icon: React.ComponentType<any>;
}

interface PixelMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onChangeGame?: () => void;
  onSwitchLesson?: () => void;
  onExportGame?: () => void;
  onViewProgress?: () => void;
  onReturnCurrent?: () => void;
  sessionActions?: SessionAction[];
}

export default function PixelMenu({
  isOpen,
  onClose,
  onChangeGame,
  onSwitchLesson,
  onExportGame,
  onViewProgress,
  onReturnCurrent,
  sessionActions = []
}: PixelMenuProps) {
  const [pixelImage, setPixelImage] = useState(pixelExcited);
  const [selectedTab, setSelectedTab] = useState<'actions' | 'history'>('actions');

  // Mock session history if not provided
  const defaultActions: SessionAction[] = sessionActions.length > 0 ? sessionActions : [
    {
      id: '1',
      type: 'game_created',
      title: 'Created RPG Adventure',
      description: 'Started building a fantasy RPG game',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      icon: Gamepad2
    },
    {
      id: '2',
      type: 'lesson_completed',
      title: 'Completed Python Basics',
      description: 'Learned variables and functions',
      timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
      icon: BookOpen
    },
    {
      id: '3',
      type: 'asset_selected',
      title: 'Selected Character Sprites',
      description: 'Added knight and wizard sprites',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
      icon: Trophy
    }
  ];

  const actions = sessionActions.length > 0 ? sessionActions : defaultActions;

  // Swipe handlers to close menu
  const swipeHandlers = useSwipeable({
    onSwipedDown: () => {
      onClose();
    },
    onSwipedRight: () => {
      onClose();
    },
    trackMouse: false,
    delta: 50
  });

  // Animate Pixel on mount
  useEffect(() => {
    if (isOpen) {
      const images = [pixelExcited, pixelHappy, pixelThinking];
      let index = 0;
      const interval = setInterval(() => {
        index = (index + 1) % images.length;
        setPixelImage(images[index]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const formatTime = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-blue-950"
            onClick={(e) => e.stopPropagation()}
            {...swipeHandlers}
          >
            <div className="h-full flex flex-col">
              {/* Header with Pixel */}
              <div className="flex-none p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <motion.h2 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="text-2xl font-bold text-gray-800 dark:text-gray-100"
                  >
                    Pixel's Command Center
                  </motion.h2>
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    data-testid="close-pixel-menu"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Pixel Avatar */}
                <motion.div 
                  className="flex items-center space-x-4"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.img
                    src={pixelImage}
                    alt="Pixel"
                    className="w-20 h-20 rounded-full shadow-lg"
                    style={{ imageRendering: 'crisp-edges' }}
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Welcome back!</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      What would you like to do?
                    </p>
                  </div>
                </motion.div>

                {/* Tab Selector */}
                <div className="flex space-x-2 mt-4">
                  <Button
                    onClick={() => setSelectedTab('actions')}
                    variant={selectedTab === 'actions' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                  >
                    Quick Actions
                  </Button>
                  <Button
                    onClick={() => setSelectedTab('history')}
                    variant={selectedTab === 'history' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                  >
                    Session History
                  </Button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden px-6 pb-6">
                {selectedTab === 'actions' ? (
                  /* Quick Actions */
                  <motion.div 
                    className="grid grid-cols-2 gap-3 h-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card
                      className="p-4 flex flex-col items-center justify-center hover:bg-purple-100 dark:hover:bg-purple-900/30 cursor-pointer transition-colors"
                      onClick={onChangeGame}
                      data-testid="change-game-button"
                    >
                      <Gamepad2 className="h-8 w-8 mb-2 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium text-center">Change Game</span>
                    </Card>

                    <Card
                      className="p-4 flex flex-col items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
                      onClick={onSwitchLesson}
                      data-testid="switch-lesson-button"
                    >
                      <BookOpen className="h-8 w-8 mb-2 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-center">Switch Lesson</span>
                    </Card>

                    <Card
                      className="p-4 flex flex-col items-center justify-center hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer transition-colors"
                      onClick={onExportGame}
                      data-testid="export-game-button"
                    >
                      <Download className="h-8 w-8 mb-2 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-center">Export Game</span>
                    </Card>

                    <Card
                      className="p-4 flex flex-col items-center justify-center hover:bg-orange-100 dark:hover:bg-orange-900/30 cursor-pointer transition-colors"
                      onClick={onViewProgress}
                      data-testid="view-progress-button"
                    >
                      <TrendingUp className="h-8 w-8 mb-2 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-medium text-center">View Progress</span>
                    </Card>

                    <Card
                      className="p-4 flex flex-col items-center justify-center hover:bg-pink-100 dark:hover:bg-pink-900/30 cursor-pointer transition-colors col-span-2"
                      onClick={onReturnCurrent}
                      data-testid="return-current-button"
                    >
                      <Home className="h-8 w-8 mb-2 text-pink-600 dark:text-pink-400" />
                      <span className="text-sm font-medium">Return to Current Activity</span>
                    </Card>
                  </motion.div>
                ) : (
                  /* Session History */
                  <ScrollArea className="h-full">
                    <motion.div 
                      className="space-y-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {actions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                          <motion.div
                            key={action.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <div className="flex items-start space-x-3">
                                <div className="flex-none">
                                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                    <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                    {action.title}
                                  </h3>
                                  {action.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {action.description}
                                    </p>
                                  )}
                                  <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-500">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatTime(action.timestamp)}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        );
                      })}
                      
                      {actions.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No actions yet this session</p>
                          <p className="text-sm mt-2">Start creating to see your history!</p>
                        </div>
                      )}
                    </motion.div>
                  </ScrollArea>
                )}
              </div>

              {/* Swipe Hint */}
              <motion.div 
                className="flex-none p-4 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Swipe down or tap outside to close
                </p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}