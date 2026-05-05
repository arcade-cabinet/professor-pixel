import { useEffect, useState, useCallback, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PixelMenu from '@/components/pixel/menu';
import { UniversalWizardProps, DeviceState, UIState, WizardOption } from '@lib/wizard/types';
import { detectDevice, getLayoutMode } from '@lib/wizard/utils';
import { useWizardDialogue, DialogueText, getDialogueHelpers } from './dialogue-engine';
import WizardOptionHandler, { ContinueButton } from './option-handler';
import {
  PhonePortraitLayout,
  PhoneLandscapeLayout,
  DesktopLayout,
  useLayoutEdgeSwipe,
} from './layout-manager';
import WizardCodeRunner from './code-runner';
import PygameRunner from '@/components/pygame/runner';
import PygameWysiwygEditor from '@/components/editor/wysiwyg';
import AssetBrowserWizard from './asset-browser';
import PixelMinimizeAnimation from '@/components/pixel/minimize-animation';
import PixelMinimized from '@/components/pixel/minimized';
import PygameComponentSelector from '@/components/pygame/component-selector';
import { GameAsset, AssetType } from '@lib/assets/types';
import { assetManager } from '@lib/assets/manager';
import { ICON_SIZES, STYLES } from '@lib/wizard/constants';
import { exportProjectAsZip, shareOrDownload } from '@lib/pygame/runtime/exporter';
import {
  saveSessionState,
  loadSessionState,
  saveUserPreferences,
  loadUserPreferences,
  clearWizardState,
  clearAllData,
  PersistedSessionState,
} from '@lib/storage/persistence';

interface ExtendedWizardProps extends UniversalWizardProps {
  flowType?: 'default' | 'game-dev';
}

export default function UniversalWizard({
  className = '',
  assetMode = 'curated',
  editorLocked = true,
  flowType = 'default',
}: ExtendedWizardProps) {
  // Core dialogue state management using custom hook
  const {
    wizardData,
    dialogueState,
    sessionActions,
    isLoading,
    isWizardComplete,
    navigateToNode,
    handleOptionSelect,
    advance,
    setSessionActions,
  } = useWizardDialogue({ flowType });

  // Device state management
  const [deviceState, setDeviceState] = useState<DeviceState>(detectDevice());

  // Track if we've loaded persisted state
  const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(false);
  const persistenceInitializedRef = useRef(false);

  // Load UI state from sessionStorage
  const getInitialUIState = (): UIState => {
    const persistedSession = loadSessionState();
    if (persistedSession && persistedSession.uiState) {
      return persistedSession.uiState as UIState;
    }
    return {
      pixelMenuOpen: false,
      embeddedComponent: 'none',
      pixelState: 'center-stage',
      wysiwygEditorOpen: false,
      assetBrowserOpen: false,
      assetBrowserType: 'all',
      selectedGameType: undefined,
      isMinimizing: false,
      minimizeMessage: undefined,
      previewMode: undefined,
      viewMode: undefined,
    };
  };

  // UI state management
  const [uiState, setUiState] = useState<UIState>(getInitialUIState);

  // Selected assets state
  const [selectedAssets, setSelectedAssets] = useState<GameAsset[]>([]);

  // Game naming dialog state
  const [gameNameDialogOpen, setGameNameDialogOpen] = useState(false);
  const [tempGameName, setTempGameName] = useState('');

  // User preferences state
  const [userPreferences, setUserPreferences] = useState(() => loadUserPreferences());

  // P1.4 — one-time celebration when the CTA first appears. We don't persist
  // across sessions; a fresh page load with an already-assembled game still
  // greets the kid (it's a positive reinforcement, not a one-shot achievement).
  //
  // StrictMode-safe: we reset the fired-ref in cleanup so the second
  // dev-mode invoke can re-schedule, AND we explicitly clear the visible
  // sparkle in cleanup so an interrupted timer never leaves it stuck on.
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationFiredRef = useRef(false);
  useEffect(() => {
    if (!isWizardComplete) return;
    if (celebrationFiredRef.current) return;
    celebrationFiredRef.current = true;
    setShowCelebration(true);
    const t = window.setTimeout(() => setShowCelebration(false), 2400);
    return () => {
      window.clearTimeout(t);
      setShowCelebration(false);
      celebrationFiredRef.current = false;
    };
  }, [isWizardComplete]);

  // Load and apply theme preference on mount
  useEffect(() => {
    if (userPreferences.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (userPreferences.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (darkModePreference) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [userPreferences.theme]);

  // Persist UI state changes to sessionStorage
  useEffect(() => {
    if (!persistenceInitializedRef.current) {
      persistenceInitializedRef.current = true;
      setHasLoadedPersistedState(true);
      return;
    }

    // Save UI state to sessionStorage whenever it changes
    saveSessionState({
      version: '1.0.0',
      uiState: uiState,
      updatedAt: new Date().toISOString(),
    });
  }, [uiState]);

  // Save user preferences when they change
  useEffect(() => {
    if (hasLoadedPersistedState) {
      saveUserPreferences(userPreferences);
    }
  }, [userPreferences, hasLoadedPersistedState]);

  // Responsive detection
  useEffect(() => {
    const checkDevice = () => {
      const newDeviceState = detectDevice();
      console.log('Device detection:', newDeviceState);
      setDeviceState(newDeviceState);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  // Get dialogue helper functions
  const dialogueHelpers = getDialogueHelpers(dialogueState, sessionActions);

  // Handle action for current node
  useEffect(() => {
    const { currentNode } = dialogueState;
    if (!currentNode) return;

    // Check if the current node has an action
    if (currentNode.action === 'openWYSIWYGEditor') {
      // Minimize when opening editor
      const message = "You've got this! I'm here if you need me!";
      setUiState((prev) => ({
        ...prev,
        wysiwygEditorOpen: true,
        isMinimizing: true,
        minimizeMessage: message,
      }));
      setSessionActions((prev) => ({ ...prev, unlockedEditor: true }));
    } else if (currentNode.action === 'openEditor') {
      setUiState((prev) => ({ ...prev, embeddedComponent: 'code-editor' }));
    } else if (currentNode.action === 'openLessons') {
      setUiState((prev) => ({ ...prev, embeddedComponent: 'code-editor' }));
    } else if (currentNode.action === 'transitionToSpecializedFlow') {
      // The transition happens automatically through the dialogue engine
      // when gameType is set, so we don't need to do anything extra here
      // The dialogue engine will detect the gameType and load the appropriate flow
      console.log('Transitioning to specialized flow for:', sessionActions.gameType);
    } else if (currentNode.action === 'showAssets' || currentNode.action === 'showAssetBrowser') {
      // Open asset browser with specific type if provided. params is
      // Record<string, unknown>; narrow at the consumer.
      const assetType = (currentNode.params?.type as UIState['assetBrowserType']) || 'all';
      const gameType =
        (currentNode.params?.gameType as string | undefined) ||
        (dialogueState.currentNode?.params?.gameType as string | undefined);
      setUiState((prev) => ({
        ...prev,
        assetBrowserOpen: true,
        assetBrowserType: assetType,
        selectedGameType: gameType,
      }));
    } else if (currentNode.action === 'minimizePixel') {
      // Get the minimize message from node params or use default.
      const message =
        (currentNode.params?.message as string | undefined) || "I'll be right here if you need me!";
      setUiState((prev) => ({
        ...prev,
        isMinimizing: true,
        minimizeMessage: message,
      }));
    } else if (currentNode.action === 'showTitlePreset' || currentNode.action === 'previewScene') {
      // Preview the title screen
      setUiState((prev) => ({
        ...prev,
        embeddedComponent: 'pygame-runner',
        previewMode: 'title',
      }));
    } else if (
      currentNode.action === 'loadGameplayPreset' ||
      currentNode.action === 'launchPlaytest'
    ) {
      // Preview gameplay
      setUiState((prev) => ({
        ...prev,
        embeddedComponent: 'pygame-runner',
        previewMode: 'gameplay',
      }));
    } else if (
      currentNode.action === 'showEndingPreset' ||
      currentNode.action === 'previewEnding'
    ) {
      // Preview ending
      setUiState((prev) => ({
        ...prev,
        embeddedComponent: 'pygame-runner',
        previewMode: 'ending',
      }));
    } else if (
      currentNode.action === 'assembleFullGame' ||
      currentNode.action === 'previewFullGame'
    ) {
      // Assemble and preview full game
      setSessionActions((prev) => ({ ...prev, gameAssembled: true }));
      setUiState((prev) => ({
        ...prev,
        embeddedComponent: 'pygame-runner',
        previewMode: 'full',
      }));
      // REMOVED: showComponentChoice action handler
      // The A/B choices should display inline as regular dialogue options
      // } else if (currentNode.action === 'showComponentChoice') {
      //   // Show A/B component variants for selection
      //   const componentId = currentNode.params?.componentId;
      //   const category = currentNode.params?.category;
      //   setUiState(prev => ({
      //     ...prev,
      //     componentChoiceOpen: true,
      //     currentComponentId: componentId,
      //     currentComponentCategory: category
      //   }));
    } else if (currentNode.action === 'compileScene') {
      // Compile a specific scene with selected components.
      // params is Record<string, unknown>; narrow at the consumer.
      const scene = (currentNode.params?.scene as string | undefined) || 'title';
      setSessionActions((prev) => ({
        ...prev,
        compiledScenes: {
          ...prev.compiledScenes,
          [scene]: true,
        },
      }));
    } else if (currentNode.action === 'compileFullGame') {
      setSessionActions((prev) => ({
        ...prev,
        gameAssembled: true,
        compiledScenes: {
          ...prev.compiledScenes,
          full: true,
        },
      }));
    } else if (currentNode.action === 'launchPyodidePreview') {
      // Launch Pyodide preview with compiled components
      const scene = (currentNode.params?.scene as string | undefined) || 'full';
      setUiState((prev) => ({
        ...prev,
        embeddedComponent: 'pygame-runner',
        previewMode: scene,
        pyodideMode: true,
      }));
    }
  }, [dialogueState.currentNode, setSessionActions, dialogueState, sessionActions.gameType]);

  // Wrap handleOptionSelect to handle actions
  const handleOptionSelectWithAction = useCallback(
    async (option: WizardOption) => {
      console.log('handleOptionSelectWithAction called with option:', option);
      // For selectComponentVariant, handle the action first before dialogue navigation
      // This ensures the selection is saved properly without triggering flow changes
      if (option.action === 'selectComponentVariant') {
        // Store selected component variant. actionParams is
        // Record<string, unknown>; narrow at the consumer.
        const componentId = option.actionParams?.componentId as string | undefined;
        const variant = option.actionParams?.variant as string | undefined;
        const bundle = option.actionParams?.bundle as string | undefined;
        if (!componentId || !variant) return;

        console.log(
          `Selecting component variant - ID: ${componentId}, Variant: ${variant}, Bundle:`,
          bundle
        );

        setSessionActions((prev) => ({
          ...prev,
          selectedComponents: {
            ...prev.selectedComponents,
            [componentId]: variant,
          },
          // Store bundle selections if provided
          ...(bundle && {
            selectedBundles: {
              ...prev.selectedBundles,
              [componentId]: bundle,
            },
          }),
        }));
      }

      // ALWAYS call the original handler to ensure dialogue flow works properly
      // This ensures that setVariable actions (like setting gameType) are processed
      // and flow transitions happen correctly
      handleOptionSelect(option);

      // Then handle UI-specific actions (skip selectComponentVariant as we handled it above)
      if (option.action === 'transitionToSpecializedFlow') {
        // The transition is handled by the dialogue engine through handleOptionSelect above
        // Just log for debugging
        console.log(
          'Transitioning to specialized flow for game type:',
          option.setVariable?.gameType || sessionActions.gameType
        );
      } else if (option.action === 'selectComponentVariant') {
        // Already handled above, skip to avoid duplicate processing
        return;
      } else if (option.action === 'openWYSIWYGEditor') {
        // Open the pro editor with all selected components and assets
        const message = "You've got this! I'm here if you need me!";
        setUiState((prev) => ({
          ...prev,
          wysiwygEditorOpen: true,
          isMinimizing: true,
          minimizeMessage: message,
        }));
        setSessionActions((prev) => ({ ...prev, unlockedEditor: true }));
      } else if (option.action === 'openEditor') {
        setUiState((prev) => ({ ...prev, embeddedComponent: 'code-editor' }));
      } else if (option.action === 'openLessons') {
        setUiState((prev) => ({ ...prev, embeddedComponent: 'code-editor' }));
      } else if (option.action === 'showAssets' || option.action === 'showAssetBrowser') {
        // Open asset browser with specific type if provided. actionParams is
        // Record<string, unknown>; narrow at the consumer.
        const assetType = (option.actionParams?.type as UIState['assetBrowserType']) || 'all';
        const gameType =
          (option.actionParams?.gameType as string | undefined) || sessionActions.gameType;
        const curated = option.actionParams?.curated !== false;
        setUiState((prev) => ({
          ...prev,
          assetBrowserOpen: true,
          assetBrowserType: assetType,
          selectedGameType: gameType ?? undefined,
          curatedMode: curated,
        }));
      } else if (option.action === 'minimizePixel') {
        // Handle minimize from option. actionParams is Record<string, unknown>.
        const message =
          (option.actionParams?.message as string | undefined) ||
          'Have fun creating! Click me if you need help!';
        setUiState((prev) => ({
          ...prev,
          isMinimizing: true,
          minimizeMessage: message,
        }));
      } else if (option.action === 'buildGame') {
        // When entering game builder
        const message = 'Have fun creating! Click me if you need help!';
        setUiState((prev) => ({
          ...prev,
          isMinimizing: true,
          minimizeMessage: message,
        }));
      } else if (option.action === 'showTitlePreset' || option.action === 'cycleTitlePreset') {
        // Show title screen preview for selected game type
        const _gameType = sessionActions.gameType || 'platformer';
        setUiState((prev) => ({
          ...prev,
          embeddedComponent: 'pygame-runner',
          previewMode: 'title',
        }));
      } else if (option.action === 'applyTitlePreset') {
        // Save the title preset choice
        setSessionActions((prev) => ({ ...prev, titlePresetApplied: true }));
      } else if (option.action === 'loadGameplayPreset') {
        // Load gameplay mechanics for the game type
        setUiState((prev) => ({
          ...prev,
          embeddedComponent: 'pygame-runner',
          previewMode: 'gameplay',
        }));
      } else if (option.action === 'launchPlaytest' || option.action === 'extendPlaytest') {
        // Launch gameplay testing mode
        setUiState((prev) => ({
          ...prev,
          embeddedComponent: 'pygame-runner',
          previewMode: 'playtest',
        }));
      } else if (option.action === 'saveGameplay') {
        // Save gameplay configuration
        setSessionActions((prev) => ({ ...prev, gameplayConfigured: true }));
      } else if (option.action === 'showEndingPreset' || option.action === 'cycleEndingPreset') {
        // Show ending screen preview
        setUiState((prev) => ({
          ...prev,
          embeddedComponent: 'pygame-runner',
          previewMode: 'ending',
        }));
      } else if (option.action === 'applyEndingPreset') {
        // Save ending configuration
        setSessionActions((prev) => ({ ...prev, endingConfigured: true }));
      } else if (option.action === 'assembleFullGame') {
        // Compile all components into complete game
        setSessionActions((prev) => ({ ...prev, gameAssembled: true }));
      } else if (option.action === 'launchFullGame') {
        // Launch the complete game
        setUiState((prev) => ({
          ...prev,
          embeddedComponent: 'pygame-runner',
          previewMode: 'full',
        }));
      } else if (option.action === 'promptGameName') {
        // Open dialog for user to enter custom game name
        setGameNameDialogOpen(true);
        setTempGameName('');
        // Note: We don't call handleOptionSelect here yet - wait for dialog completion
        return;
      } else if (option.action === 'generateGameName') {
        // Generate a cool name based on game type
        const gameType = option.actionParams?.gameType || sessionActions.gameType || 'game';
        const generatedNames = {
          platformer: [
            'Jump Quest',
            'Platform Adventures',
            'Sky Runner',
            'Leap Legend',
            'Bounce Battle',
          ],
          rpg: [
            'Epic Quest',
            'Heroes of Destiny',
            'Realm Warriors',
            'Crystal Chronicles',
            'Legend Rising',
          ],
          dungeon: [
            'Dungeon Depths',
            'Shadow Crawler',
            'Cave Quest',
            'Dark Descent',
            'Treasure Hunter',
          ],
          racing: ['Speed Racer', 'Turbo Rush', 'Velocity King', 'Race Champions', 'Fast Track'],
          puzzle: ['Mind Bender', 'Puzzle Master', 'Brain Storm', 'Logic Quest', 'Think Tank'],
          space: ['Galactic Wars', 'Star Fighter', 'Cosmic Battle', 'Space Ranger', 'Nova Blast'],
        };
        const names = generatedNames[gameType as keyof typeof generatedNames] || ['Amazing Game'];
        const randomName = names[Math.floor(Math.random() * names.length)];

        // Save the generated name
        setSessionActions((prev) => ({
          ...prev,
          gameName: randomName,
        }));

        // Store in localStorage
        const persistedState = loadSessionState();
        saveSessionState({
          ...persistedState,
          gameName: randomName,
          updatedAt: new Date().toISOString(),
        });

        // Continue with the flow
        handleOptionSelect(option);
      } else if (option.action === 'viewGeneratedCode') {
        // Show the generated Python code
        setUiState((prev) => ({
          ...prev,
          embeddedComponent: 'code-editor',
          viewMode: 'generated',
        }));
        // REMOVED: showComponentChoice action handler from options
        // The A/B choices should display inline as regular dialogue options
        // } else if (option.action === 'showComponentChoice') {
        //   // Show A/B component variants for user to choose
        //   const componentId = option.actionParams?.componentId;
        //   const category = option.actionParams?.category;
        //   setUiState(prev => ({
        //     ...prev,
        //     componentChoiceOpen: true,
        //     currentComponentId: componentId,
        //     currentComponentCategory: category
        //   }});
        // Removed duplicate selectComponentVariant handling - it's now handled before handleOptionSelect
      } else if (
        option.action === 'compileGameplayScene' ||
        option.action === 'compileEndScene' ||
        option.action === 'compileFullGame'
      ) {
        const sceneType = option.action.includes('Gameplay')
          ? 'gameplay'
          : option.action.includes('End')
            ? 'ending'
            : 'full';
        setSessionActions((prev) => ({
          ...prev,
          compiledScenes: {
            ...prev.compiledScenes,
            [sceneType]: true,
          },
          // P1 reviewer fix: full-game compile must flip gameAssembled so the
          // structurally-terminal CTA path can fire when the next node has no
          // options. Scene-level compiles don't yet count as assembled.
          ...(sceneType === 'full' ? { gameAssembled: true } : {}),
        }));
      } else if (option.action === 'launchPyodidePreview') {
        // Launch Pyodide preview with compiled scene. actionParams is
        // Record<string, unknown>; narrow at the consumer.
        const scene = (option.actionParams?.scene as string | undefined) || 'full';
        setUiState((prev) => ({
          ...prev,
          embeddedComponent: 'pygame-runner',
          previewMode: scene,
          pyodideMode: true,
        }));
      } else if (option.action === 'launchPyodideGame') {
        // Launch the complete compiled game
        setUiState((prev) => ({
          ...prev,
          embeddedComponent: 'pygame-runner',
          previewMode: 'full',
          pyodideMode: true,
        }));
      } else if (option.action === 'exportPyodideGame') {
        // P6 BLOCKER — export full ZIP bundle (Python + assets + index.html
        // Pyodide bootstrap + README) so the kid can share or run offline.
        try {
          const exported = await exportProjectAsZip({
            selectedComponents: sessionActions.selectedComponents || {},
            selectedAssets,
            title: sessionActions.gameName || 'My Pygame Game',
          });
          await shareOrDownload(exported);
          const toast =
            (window as Window & { toast?: (msg: unknown) => void }).toast || console.log;
          toast('Game exported successfully!');
        } catch (error) {
          console.error('Error during export:', error);

          // Show an error message to the user
          const toast =
            (window as Window & { toast?: (msg: unknown) => void }).toast || console.log;
          toast('Failed to export game. Please try again.');
        }
      } else if (option.action === 'tweakDifficulty') {
        // Adjust game difficulty settings
        console.log('Adjusting difficulty');
      } else if (
        option.action === 'previewScene' ||
        option.action === 'previewGameplay' ||
        option.action === 'previewEnding' ||
        option.action === 'previewFullGame'
      ) {
        // Handle various preview actions
        const previewType = option.action.replace('preview', '').toLowerCase();
        setUiState((prev) => ({
          ...prev,
          embeddedComponent: 'pygame-runner',
          previewMode: previewType,
        }));
      }

      // Check for lesson completion
      if (option.text && (option.text.includes('complete') || option.text.includes('finished'))) {
        const message = "Great job! I'll watch from here while you practice!";
        setUiState((prev) => ({
          ...prev,
          isMinimizing: true,
          minimizeMessage: message,
        }));
      }

      // Note: handleOptionSelect(option) is called at the beginning of this function
      // to ensure dialogue flow transitions work properly before UI actions
    },
    [handleOptionSelect, setSessionActions, sessionActions, selectedAssets]
  );

  // P1.2 — Launch the user's game when the wizard reaches its terminal node
  // (`compileFullGame` action OR an options-less / multiStep-less node). This
  // is the "▶ Play your game" CTA the audit flagged as missing.
  const handlePlayGame = useCallback(() => {
    setUiState((prev) => ({
      ...prev,
      embeddedComponent: 'pygame-runner',
      pyodideMode: true,
      previewMode: 'full',
    }));
  }, []);

  // Render dialogue content for desktop/tablet
  const renderDialogue = useCallback(() => {
    const { currentNode } = dialogueState;
    if (!currentNode) return null;

    const displayText = dialogueHelpers.getCurrentText();
    const showOptions = dialogueHelpers.shouldShowOptions();
    const showContinue = dialogueHelpers.shouldShowContinue();

    return (
      <div className="space-y-4">
        {displayText && (
          <DialogueText
            text={displayText}
            nodeId={dialogueState.currentNodeId}
            dialogueStep={dialogueState.dialogueStep}
          />
        )}

        {showOptions && currentNode.options && currentNode.options.length > 0 && (
          <WizardOptionHandler
            options={currentNode.options}
            onOptionSelect={handleOptionSelectWithAction}
            isMobile={deviceState.isMobile}
          />
        )}

        {showContinue && <ContinueButton onClick={advance} isMobile={deviceState.isMobile} />}

        {/* P1.2 wizard-completion CTA — terminal node reached, kid can play */}
        {isWizardComplete && (
          <div className="relative">
            {showCelebration && (
              <div
                aria-hidden="true"
                data-testid="celebration-sparkle"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div className="animate-ping text-4xl">🎉</div>
                <div className="absolute -left-2 -top-2 animate-bounce text-2xl">✨</div>
                <div
                  className="absolute -right-2 -top-2 animate-bounce text-2xl"
                  style={{ animationDelay: '0.15s' }}
                >
                  ✨
                </div>
                <div
                  className="absolute -bottom-2 left-1/3 animate-bounce text-2xl"
                  style={{ animationDelay: '0.3s' }}
                >
                  🌟
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handlePlayGame}
              data-testid="play-game-cta"
              aria-label="Play your game"
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
            >
              ▶ Play your game!
            </button>
          </div>
        )}
      </div>
    );
  }, [
    dialogueState,
    dialogueHelpers,
    handleOptionSelectWithAction,
    advance,
    deviceState.isMobile,
    isWizardComplete,
    handlePlayGame,
    showCelebration,
  ]);

  // Reset progress handler
  const handleResetProgress = useCallback(() => {
    if (
      window.confirm(
        'Are you sure you want to reset your progress? This will clear all saved wizard data.'
      )
    ) {
      clearWizardState();
      window.location.reload();
    }
  }, []);

  // Clear all data handler
  const handleClearAllData = useCallback(() => {
    if (
      window.confirm(
        'Are you sure you want to clear ALL data including preferences? This action cannot be undone.'
      )
    ) {
      clearAllData();
      window.location.reload();
    }
  }, []);

  // Toggle theme handler
  const handleToggleTheme = useCallback(() => {
    const newTheme =
      userPreferences.theme === 'dark'
        ? 'light'
        : userPreferences.theme === 'light'
          ? 'system'
          : 'dark';
    setUserPreferences((prev) => ({ ...prev, theme: newTheme }));
  }, [userPreferences.theme]);

  // Pixel Menu action handlers
  const handlePixelMenuAction = useCallback(
    (action: string) => {
      setUiState((prev) => ({ ...prev, pixelMenuOpen: false }));

      switch (action) {
        case 'changeGame':
          navigateToNode('gamePath');
          break;
        case 'switchLesson':
          navigateToNode('learnPath');
          break;
        case 'exportGame':
          // P6 BLOCKER — full ZIP bundle export. Async; we kick off without
          // awaiting (this is a switch case in a sync callback) and surface
          // failure via the toast inside the catch.
          exportProjectAsZip({
            selectedComponents: sessionActions.selectedComponents || {},
            selectedAssets,
            title: sessionActions.gameName || 'My Pygame Game',
          })
            .then(async (exported) => {
              await shareOrDownload(exported);
              const toast =
                (window as Window & { toast?: (msg: unknown) => void }).toast || console.log;
              toast('Game exported successfully!');
            })
            .catch((error) => {
              console.error('Export from PixelMenu failed:', error);
              const toast =
                (window as Window & { toast?: (msg: unknown) => void }).toast || console.log;
              toast('Failed to export game. Please try again.');
            });
          break;
        case 'viewProgress':
          // P8 will add the dedicated progress UI; until then, View Progress
          // routes to the lesson list, which IS the progress surface kids
          // already understand. This is the same path home.tsx routes to
          // for returning lesson-mode players.
          window.location.assign('/lesson/lesson-1');
          break;
        case 'resetProgress':
          handleResetProgress();
          break;
        case 'clearAllData':
          handleClearAllData();
          break;
        case 'toggleTheme':
          handleToggleTheme();
          break;
        case 'returnCurrent':
          // Just close the menu
          break;
      }
    },
    [
      navigateToNode,
      handleResetProgress,
      handleClearAllData,
      handleToggleTheme,
      sessionActions,
      selectedAssets,
    ]
  );

  // Edge swipe handlers for mobile
  const edgeSwipeHandlers = useLayoutEdgeSwipe(() => {
    setUiState((prev) => ({ ...prev, pixelMenuOpen: true }));
  });

  // Handle embedded component changes
  const handleEmbeddedComponentChange = useCallback((component: UIState['embeddedComponent']) => {
    setUiState((prev) => ({ ...prev, embeddedComponent: component }));
  }, []);

  // Handle minimize animation complete
  const handleMinimizeComplete = useCallback(() => {
    setUiState((prev) => ({
      ...prev,
      pixelState: 'minimized',
      isMinimizing: false,
    }));
  }, []);

  // Handle restore from minimized state
  const handleRestorePixel = useCallback(() => {
    setUiState((prev) => ({
      ...prev,
      pixelState: 'center-stage',
      minimizeMessage: undefined,
      wysiwygEditorOpen: false,
      assetBrowserOpen: false,
      embeddedComponent: 'none',
    }));
  }, []);

  // Handle asset selection from browser
  const handleAssetSelection = useCallback(
    (assets: GameAsset | GameAsset[]) => {
      const assetsArray = Array.isArray(assets) ? assets : [assets];
      setSelectedAssets(assetsArray);

      // Store selected assets in session for later use
      assetsArray.forEach((asset) => {
        if (asset.type === 'sprite') {
          const spriteAsset = asset as GameAsset & { category?: string };
          if (spriteAsset.category === 'characters') {
            assetManager.selectPlayerSprite(asset.id);
          } else if (spriteAsset.category === 'enemies') {
            assetManager.addEnemySprite(asset.id);
          } else if (spriteAsset.category === 'items') {
            assetManager.addItemSprite(asset.id);
          }
        } else if (asset.type === 'background') {
          assetManager.selectBackground(asset.id);
        } else if (asset.type === 'music') {
          assetManager.selectMusic(asset.id);
        } else if (asset.type === 'sound') {
          assetManager.addSound(asset.id);
        }
      });

      // Close browser and continue dialogue
      setUiState((prev) => ({ ...prev, assetBrowserOpen: false }));
      advance();
    },
    [advance]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen ${STYLES.GRADIENT_BG} flex items-center justify-center`}>
        <div className="text-center">
          <Sparkles
            className={`${ICON_SIZES.EXTRA_LARGE} text-purple-600 animate-spin mx-auto mb-4`}
          />
          <p className="text-lg text-gray-700 dark:text-gray-300">Loading adventure...</p>
        </div>
      </div>
    );
  }

  // Determine layout mode
  const layoutMode = getLayoutMode(deviceState);
  console.log('Using layout mode:', layoutMode);

  // Common props for layouts
  const layoutProps = {
    currentNode: dialogueState.currentNode,
    dialogueStep: dialogueState.dialogueStep,
    sessionActions: sessionActions,
    onAdvance: advance,
    onOptionSelect: handleOptionSelectWithAction,
    onOpenMenu: () => setUiState((prev) => ({ ...prev, pixelMenuOpen: true })),
  };

  // Show minimize animation if minimizing
  if (uiState.isMinimizing) {
    return (
      <PixelMinimizeAnimation
        message={uiState.minimizeMessage}
        onAnimationComplete={handleMinimizeComplete}
        isMobile={deviceState.isMobile}
      />
    );
  }

  // Show minimized Pixel if in minimized state
  if (uiState.pixelState === 'minimized') {
    return (
      <>
        <PixelMinimized
          onRestore={handleRestorePixel}
          sessionActions={sessionActions}
          isMobile={deviceState.isMobile}
          currentLesson={sessionActions.currentProject || undefined}
          currentGame={sessionActions.gameType || undefined}
        />
        {uiState.wysiwygEditorOpen && (
          <PygameWysiwygEditor
            onClose={() => setUiState((prev) => ({ ...prev, wysiwygEditorOpen: false }))}
          />
        )}
        {uiState.assetBrowserOpen && (
          <AssetBrowserWizard
            assetType={
              uiState.assetBrowserType === 'all'
                ? undefined
                : (uiState.assetBrowserType as AssetType)
            }
            gameType={uiState.selectedGameType}
            onSelect={handleAssetSelection}
            onClose={() => setUiState((prev) => ({ ...prev, assetBrowserOpen: false }))}
            showPixelSuggestions={true}
          />
        )}
      </>
    );
  }

  // Show WYSIWYG editor if it's open (when not minimized)
  if (uiState.wysiwygEditorOpen && uiState.pixelState === 'center-stage') {
    return (
      <PygameWysiwygEditor
        onClose={() => setUiState((prev) => ({ ...prev, wysiwygEditorOpen: false }))}
      />
    );
  }

  // REMOVED: Component selector modal - A/B choices now display inline
  // if (uiState.componentChoiceOpen) {
  //   return (
  //     <>
  //       <PygameComponentSelector
  //         componentId={uiState.currentComponentId}
  //         category={uiState.currentComponentCategory}
  //         onSelect={(componentId, variant) => {
  //           // Store the selection
  //           setSessionActions(prev => ({
  //             ...prev,
  //             selectedComponents: {
  //               ...prev.selectedComponents,
  //               [componentId]: variant
  //             }
  //           }));
  //           // Close selector and advance dialogue
  //           setUiState(prev => ({ ...prev, componentChoiceOpen: false }));
  //           advance();
  //         }}
  //         onClose={() => setUiState(prev => ({ ...prev, componentChoiceOpen: false }))}
  //       />
  //       {/* Keep wizard dialogue in background */}
  //       {renderDialogue()}
  //     </>
  //   );
  // }

  // Show asset browser if it's open
  if (uiState.assetBrowserOpen) {
    return (
      <AssetBrowserWizard
        assetType={
          uiState.assetBrowserType === 'all' ? undefined : (uiState.assetBrowserType as AssetType)
        }
        gameType={uiState.selectedGameType}
        onSelect={handleAssetSelection}
        onClose={() => setUiState((prev) => ({ ...prev, assetBrowserOpen: false }))}
        showPixelSuggestions={true}
      />
    );
  }

  // Render phone portrait layout
  if (layoutMode === 'phone-portrait') {
    return (
      <>
        <PixelMenu
          isOpen={uiState.pixelMenuOpen}
          onClose={() => setUiState((prev) => ({ ...prev, pixelMenuOpen: false }))}
          onChangeGame={() => handlePixelMenuAction('changeGame')}
          onSwitchLesson={() => handlePixelMenuAction('switchLesson')}
          onExportGame={() => handlePixelMenuAction('exportGame')}
          onViewProgress={() => handlePixelMenuAction('viewProgress')}
          onReturnCurrent={() => handlePixelMenuAction('returnCurrent')}
          sessionActions={[]}
        />
        <PhonePortraitLayout {...layoutProps} edgeSwipeHandlers={edgeSwipeHandlers.handlers} />
        {uiState.embeddedComponent === 'code-editor' && (
          <WizardCodeRunner
            type={uiState.embeddedComponent}
            onClose={() => handleEmbeddedComponentChange('none')}
          />
        )}
        {uiState.embeddedComponent === 'pygame-runner' && (
          <PygameRunner
            selectedComponents={sessionActions.selectedComponents}
            selectedAssets={selectedAssets}
            previewMode={uiState.previewMode}
            onClose={() => handleEmbeddedComponentChange('none')}
          />
        )}
      </>
    );
  }

  // Render phone landscape layout
  if (layoutMode === 'phone-landscape') {
    return (
      <>
        <PixelMenu
          isOpen={uiState.pixelMenuOpen}
          onClose={() => setUiState((prev) => ({ ...prev, pixelMenuOpen: false }))}
          onChangeGame={() => handlePixelMenuAction('changeGame')}
          onSwitchLesson={() => handlePixelMenuAction('switchLesson')}
          onExportGame={() => handlePixelMenuAction('exportGame')}
          onViewProgress={() => handlePixelMenuAction('viewProgress')}
          onReturnCurrent={() => handlePixelMenuAction('returnCurrent')}
          sessionActions={[]}
        />
        <PhoneLandscapeLayout {...layoutProps} edgeSwipeHandlers={edgeSwipeHandlers.handlers} />
        {uiState.embeddedComponent === 'code-editor' && (
          <WizardCodeRunner
            type={uiState.embeddedComponent}
            onClose={() => handleEmbeddedComponentChange('none')}
          />
        )}
        {uiState.embeddedComponent === 'pygame-runner' && (
          <PygameRunner
            selectedComponents={sessionActions.selectedComponents}
            selectedAssets={selectedAssets}
            previewMode={uiState.previewMode}
            onClose={() => handleEmbeddedComponentChange('none')}
          />
        )}
      </>
    );
  }

  // Desktop and tablet layout
  return (
    <>
      <DesktopLayout
        {...layoutProps}
        deviceState={deviceState}
        uiState={uiState}
        onPixelMenuAction={handlePixelMenuAction}
        renderDialogue={renderDialogue}
        showProgressSidebar={flowType === 'game-dev' || !!sessionActions.gameType}
        gameName={sessionActions.gameName}
      />
      {uiState.embeddedComponent === 'code-editor' && (
        <WizardCodeRunner
          type={uiState.embeddedComponent}
          onClose={() => handleEmbeddedComponentChange('none')}
        />
      )}
      {uiState.embeddedComponent === 'pygame-runner' && (
        <PygameRunner
          selectedComponents={sessionActions.selectedComponents}
          selectedAssets={selectedAssets}
          previewMode={uiState.previewMode}
          onClose={() => handleEmbeddedComponentChange('none')}
        />
      )}

      {/* Game Name Dialog */}
      <Dialog open={gameNameDialogOpen} onOpenChange={setGameNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name Your Game</DialogTitle>
            <DialogDescription>
              Give your game a unique name that captures its essence!
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              id="game-name"
              value={tempGameName}
              onChange={(e) => setTempGameName(e.target.value)}
              placeholder="Enter your game name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tempGameName.trim()) {
                  // Save the game name
                  setSessionActions((prev) => ({
                    ...prev,
                    gameName: tempGameName.trim(),
                  }));

                  // Store in localStorage
                  const persistedState = loadSessionState();
                  saveSessionState({
                    ...persistedState,
                    gameName: tempGameName.trim(),
                    updatedAt: new Date().toISOString(),
                  });

                  // Close dialog and continue flow
                  setGameNameDialogOpen(false);

                  // Continue with the flow by finding and selecting the option
                  const currentNode = dialogueState.currentNode;
                  if (currentNode?.options) {
                    const promptOption = currentNode.options.find(
                      (opt: WizardOption) => opt.action === 'promptGameName'
                    );
                    if (promptOption) {
                      handleOptionSelect(promptOption);
                    }
                  }
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (tempGameName.trim()) {
                  // Save the game name
                  setSessionActions((prev) => ({
                    ...prev,
                    gameName: tempGameName.trim(),
                  }));

                  // Store in localStorage
                  const persistedState = loadSessionState();
                  saveSessionState({
                    ...persistedState,
                    gameName: tempGameName.trim(),
                    updatedAt: new Date().toISOString(),
                  });

                  // Close dialog and continue flow
                  setGameNameDialogOpen(false);

                  // Continue with the flow by finding and selecting the option
                  const currentNode = dialogueState.currentNode;
                  if (currentNode?.options) {
                    const promptOption = currentNode.options.find(
                      (opt: WizardOption) => opt.action === 'promptGameName'
                    );
                    if (promptOption) {
                      handleOptionSelect(promptOption);
                    }
                  }
                }
              }}
              disabled={!tempGameName.trim()}
            >
              Create Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
