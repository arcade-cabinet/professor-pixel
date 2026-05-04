import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Menu, Gamepad2, Sparkles } from 'lucide-react';
import { useEdgeSwipe } from '@/hooks/use-edge-swipe';
import PixelMenu from './pixel-menu';
import GameProgressSidebar from './game-progress-sidebar';
import { PortraitAvatar, LandscapeAvatar, CenteredAvatar } from './wizard-avatar-display';
import { DialogueBox, DialogueText } from './wizard-dialogue-engine';
import WizardOptionHandler, { ContinueButton } from './wizard-option-handler';
import { 
  WizardNode, 
  WizardOption, 
  DeviceState,
  UIState,
  SessionActions
} from './wizard-types';
import { 
  STYLES, 
  EDGE_SWIPE_CONFIG,
  ANIMATIONS,
  ICON_SIZES
} from './wizard-constants';
import { 
  getCurrentText,
  shouldShowOptions, 
  shouldShowContinue
} from './wizard-utils';

interface LayoutProps {
  currentNode: WizardNode | null;
  dialogueStep: number;
  sessionActions?: SessionActions;
  onAdvance: () => void;
  onOptionSelect: (option: WizardOption) => void;
  onOpenMenu: () => void;
  edgeSwipeHandlers?: any;
}

// Phone Portrait Layout
export function PhonePortraitLayout({
  currentNode,
  dialogueStep,
  sessionActions,
  onAdvance,
  onOptionSelect,
  edgeSwipeHandlers
}: LayoutProps) {
  if (!currentNode) return null;
  
  const displayText = getCurrentText(currentNode, dialogueStep, sessionActions);
  const showOptions = shouldShowOptions(currentNode, dialogueStep);
  const showContinue = shouldShowContinue(currentNode, dialogueStep);

  return (
    <div {...edgeSwipeHandlers} className={`h-screen flex flex-col ${STYLES.GRADIENT_BG}`}>
      <PortraitAvatar />
      
      <DialogueBox 
        text={displayText} 
        className="flex-shrink-0 px-4 pb-4"
        variant="mobile"
      />

      <motion.div 
        className="flex-1 min-h-0 overflow-y-auto px-4 pb-safe-or-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: ANIMATIONS.FADE_IN.delay }}
      >
        <div className="space-y-3">
          {showOptions && currentNode.options && (
            <WizardOptionHandler
              options={currentNode.options}
              onOptionSelect={onOptionSelect}
              variant="phone-portrait"
            />
          )}
          
          {showContinue && (
            <ContinueButton
              onClick={onAdvance}
              variant="phone-portrait"
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Phone Landscape Layout
export function PhoneLandscapeLayout({
  currentNode,
  dialogueStep,
  sessionActions,
  onAdvance,
  onOptionSelect,
  edgeSwipeHandlers
}: LayoutProps) {
  if (!currentNode) return null;
  
  const displayText = getCurrentText(currentNode, dialogueStep, sessionActions);
  const showOptions = shouldShowOptions(currentNode, dialogueStep);
  const showContinue = shouldShowContinue(currentNode, dialogueStep);

  return (
    <div {...edgeSwipeHandlers} className={`h-screen grid grid-cols-[20%,80%] ${STYLES.GRADIENT_BG}`}>
      <LandscapeAvatar />
      
      <div className="flex flex-col p-3 overflow-hidden">
        <motion.div 
          className="flex-shrink-0 mb-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: ANIMATIONS.FADE_IN.delay }}
        >
          <DialogueBox 
            text={displayText}
            variant="default"
          />
        </motion.div>

        <motion.div 
          className="flex-1 min-h-0 overflow-y-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: ANIMATIONS.FADE_IN.delay }}
        >
          {showOptions && currentNode.options && (
            <WizardOptionHandler
              options={currentNode.options}
              onOptionSelect={onOptionSelect}
              variant="phone-landscape"
            />
          )}

          {showContinue && (
            <ContinueButton
              onClick={onAdvance}
              variant="phone-landscape"
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

interface DesktopLayoutProps extends LayoutProps {
  deviceState: DeviceState;
  uiState: UIState;
  onPixelMenuAction: (action: string) => void;
  renderDialogue: () => JSX.Element | null;
  showProgressSidebar?: boolean;
  gameName?: string;
}

// Desktop Layout
export function DesktopLayout({
  uiState,
  deviceState,
  onOpenMenu,
  onPixelMenuAction,
  renderDialogue,
  sessionActions,
  showProgressSidebar,
  gameName
}: DesktopLayoutProps) {
  const showSidebar = showProgressSidebar && sessionActions?.gameType;
  
  return (
    <div className={`min-h-screen ${STYLES.GRADIENT_BG} relative`}>
      <div className={`${showSidebar ? 'pr-80' : ''} transition-all duration-300`}>
        <DesktopHeader />
        
        <PixelMenu
          isOpen={uiState.pixelMenuOpen}
          onClose={() => onPixelMenuAction('returnCurrent')}
          onChangeGame={() => onPixelMenuAction('changeGame')}
          onSwitchLesson={() => onPixelMenuAction('switchLesson')}
          onExportGame={() => onPixelMenuAction('exportGame')}
          onViewProgress={() => onPixelMenuAction('viewProgress')}
          onReturnCurrent={() => onPixelMenuAction('returnCurrent')}
          sessionActions={[]}
        />

        <TabletMenuButton onOpenMenu={onOpenMenu} />

        <AnimatePresence mode="wait">
          {uiState.pixelState === 'center-stage' && uiState.embeddedComponent === 'none' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 flex items-center justify-center z-30 pointer-events-none px-4 pt-20 lg:pt-4"
              style={{ paddingRight: showSidebar ? '20rem' : undefined }}
            >
              <Card className={`relative max-w-2xl w-full p-6 sm:p-8 ${STYLES.CARD_BG} shadow-2xl border-2 border-purple-500/20 pointer-events-auto`}>
                <CenteredAvatar className="mb-6" />
                {renderDialogue()}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Game Progress Sidebar */}
      {showSidebar && sessionActions && (
        <div className="fixed top-0 right-0 h-full z-20">
          <GameProgressSidebar 
            sessionActions={sessionActions}
            gameName={gameName}
          />
        </div>
      )}
    </div>
  );
}

// Desktop Header Component
function DesktopHeader() {
  return (
    <header className={`hidden lg:block ${STYLES.HEADER_BG} border-b border-border sticky top-0 z-40 shadow-sm`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <motion.div 
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-lg opacity-75 animate-pulse"></div>
              <div className="relative bg-white dark:bg-gray-900 rounded-xl p-2">
                <Gamepad2 className="text-purple-600 h-8 w-8" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Pixel's PyGame Palace
              </h1>
              <p className="text-xs text-muted-foreground">Your Game Building Adventure</p>
            </div>
          </motion.div>
          
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{ rotate: ANIMATIONS.SPARKLE_ROTATE.rotate as any }}
              transition={{ 
                duration: ANIMATIONS.SPARKLE_ROTATE.duration, 
                repeat: Infinity, 
                ease: "linear" 
              }}
            >
              <Sparkles className={`${ICON_SIZES.MEDIUM} text-purple-600`} />
            </motion.div>
          </div>
        </div>
      </div>
    </header>
  );
}

// Tablet Menu Button Component
function TabletMenuButton({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <Button
      onClick={onOpenMenu}
      className="lg:hidden min-[768px]:block hidden fixed top-4 right-4 z-50 rounded-full bg-white/90 dark:bg-gray-900/90 shadow-lg hover:shadow-xl transition-shadow"
      variant="outline"
      size="icon"
      data-testid="open-pixel-menu-button"
      aria-label="Open Pixel Menu"
    >
      <Menu className={ICON_SIZES.MEDIUM} />
    </Button>
  );
}

// Edge Swipe Hook Wrapper
export function useLayoutEdgeSwipe(onOpenMenu: () => void) {
  return useEdgeSwipe({
    onEdgeSwipe: (edge) => {
      console.log('Edge swipe detected on:', edge);
      onOpenMenu();
    },
    edgeThreshold: EDGE_SWIPE_CONFIG.threshold,
    enabled: EDGE_SWIPE_CONFIG.enabled
  });
}