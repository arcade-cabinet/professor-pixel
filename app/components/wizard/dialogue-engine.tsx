import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  WizardNode, 
  DialogueState, 
  SessionActions 
} from './wizard-types';
import { 
  getCurrentText, 
  shouldShowOptions, 
  shouldShowContinue,
  updateSessionActionsForOption,
  loadWizardFlow
} from './wizard-utils';
import { 
  WIZARD_FLOW_PATH, 
  INITIAL_NODE_ID,
  STYLES,
  ANIMATIONS
} from './wizard-constants';
import {
  saveWizardStateDebounced,
  loadWizardState,
  PersistedWizardState
} from '@/lib/persistence';

interface UseWizardDialogueProps {
  initialNodeId?: string;
  wizardFlowPath?: string;
  flowType?: 'default' | 'game-dev';
}

// Custom hook for managing wizard dialogue state
export function useWizardDialogue({ 
  initialNodeId = INITIAL_NODE_ID,
  wizardFlowPath = WIZARD_FLOW_PATH,
  flowType = 'default' 
}: UseWizardDialogueProps = {}) {
  const [wizardData, setWizardData] = useState<Record<string, WizardNode> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load persisted state on mount
  const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(false);
  const persistedStateRef = useRef<PersistedWizardState | null>(null);
  
  // Initialize state from localStorage if available
  const getInitialDialogueState = (): DialogueState => {
    const persistedState = loadWizardState();
    console.log('🔧 Initializing dialogue state from localStorage:', {
      hasPersistedState: !!persistedState,
      currentNodeId: persistedState?.currentNodeId,
      activeFlowPath: persistedState?.activeFlowPath
    });
    
    if (persistedState && persistedState.currentNodeId) {
      persistedStateRef.current = persistedState;
      return {
        currentNodeId: persistedState.currentNodeId,
        currentNode: null,
        dialogueStep: 0,
        carouselIndex: 0,
        showAllChoices: false,
      };
    }
    return {
      currentNodeId: initialNodeId,
      currentNode: null,
      dialogueStep: 0,
      carouselIndex: 0,
      showAllChoices: false,
    };
  };
  
  const getInitialSessionActions = (): SessionActions => {
    const persistedState = persistedStateRef.current || loadWizardState();
    if (persistedState && persistedState.sessionActions) {
      return persistedState.sessionActions;
    }
    return {
      choices: [],
      createdAssets: [],
      gameType: null,
      currentProject: null,
      completedSteps: [],
      unlockedEditor: false
    };
  };
  
  const [dialogueState, setDialogueState] = useState<DialogueState>(getInitialDialogueState);
  const [sessionActions, setSessionActions] = useState<SessionActions>(getInitialSessionActions);
  
  // Track the currently loaded flow path, loading state, and failed attempts
  const [loadedFlowPath, setLoadedFlowPath] = useState<string | null>(() => {
    const persistedState = persistedStateRef.current || loadWizardState();
    return persistedState?.activeFlowPath || null;
  });
  const [isFlowLoading, setIsFlowLoading] = useState(false);
  const [failedFlowPaths, setFailedFlowPaths] = useState<Set<string>>(new Set());
  
  // Persist state changes
  useEffect(() => {
    if (!hasLoadedPersistedState) {
      // Don't persist on initial load
      setHasLoadedPersistedState(true);
      return;
    }
    
    // Save state to localStorage (debounced)
    saveWizardStateDebounced({
      version: '1.0.0',
      activeFlowPath: loadedFlowPath,
      currentNodeId: dialogueState.currentNodeId,
      gameType: sessionActions.gameType,
      selectedGameType: sessionActions.selectedGameType,
      sessionActions: sessionActions,
      updatedAt: new Date().toISOString()
    });
  }, [dialogueState.currentNodeId, sessionActions, loadedFlowPath, hasLoadedPersistedState]);

  // Load wizard flow data
  useEffect(() => {
    // Determine which flow to load based on game type
    let flowPath = wizardFlowPath;
    
    // If we have a selected game type, load that specific flow
    // Check both gameType and selectedGameType for compatibility
    const gameType = sessionActions.selectedGameType || sessionActions.gameType;
    
    // Check if we should load a specialized flow
    // This happens when:
    // 1. We have a gameType set AND
    // 2. Either we're explicitly transitioning OR the current flow doesn't match the gameType
    // 3. AND we haven't already failed to load this flow
    const specializedFlowPath = gameType ? `/${gameType}-flow.json` : null;
    const shouldLoadSpecializedFlow = gameType && 
      !failedFlowPaths.has(specializedFlowPath || '') && (
        sessionActions.transitionToSpecializedFlow || 
        (loadedFlowPath !== specializedFlowPath)
      );
    
    if (shouldLoadSpecializedFlow) {
      // Load specialized flow when we have gameType
      const specializedFlowPath = `/${gameType}-flow.json`;
      flowPath = specializedFlowPath;
      console.log('Loading specialized flow for gameType:', gameType, 'Path:', specializedFlowPath);
    } else if (flowType === 'game-dev' && !gameType) {
      // Fallback to generic game flow if no specific type selected
      flowPath = '/game-wizard-flow.json';
      console.log('Loading generic game flow');
    }
    
    // Check if flow is already loaded AND we have the actual data
    // On page refresh, loadedFlowPath might be restored but wizardData is null
    if (loadedFlowPath === flowPath && wizardData) {
      console.log('Flow already loaded with data:', flowPath);
      
      // Even if flow is loaded, check if we need to restore persisted state
      // This handles scenarios where state needs to be synchronized
      const persistedState = loadWizardState();
      if (persistedState && persistedState.currentNodeId && 
          wizardData[persistedState.currentNodeId]) {
        // Always sync with persisted state if the node exists
        if (persistedState.currentNodeId !== dialogueState.currentNodeId) {
          console.log('📍 Restoring persisted node in already-loaded flow:', persistedState.currentNodeId);
          setDialogueState(prev => ({
            ...prev,
            currentNodeId: persistedState.currentNodeId,
            currentNode: wizardData[persistedState.currentNodeId],
            dialogueStep: 0,
            carouselIndex: 0,
            showAllChoices: false
          }));
        }
      }
      
      // Clear transition flag if it's set but we already have the right flow
      if (sessionActions.transitionToSpecializedFlow) {
        setSessionActions(prev => ({ ...prev, transitionToSpecializedFlow: false }));
      }
      return;
    }
    
    // Prevent concurrent flow loads
    if (isFlowLoading) {
      console.log('Flow is already loading, skipping duplicate load request');
      return;
    }
    
    console.log('Loading flow from:', flowPath, 'Previously loaded:', loadedFlowPath);
    setIsFlowLoading(true);
    
    loadWizardFlow(flowPath)
      .then(nodes => {
        console.log('Successfully loaded flow:', flowPath, 'Nodes count:', Object.keys(nodes).length);
        setWizardData(nodes);
        setLoadedFlowPath(flowPath);
        
        // Determine the start node, prioritizing saved state
        let startNodeId: string;
        const persistedState = loadWizardState();
        
        // Log the restoration sequence for debugging
        console.log('=== Flow Loading Restoration Sequence ===');
        console.log('Loading flow:', flowPath);
        console.log('Persisted state:', {
          activeFlowPath: persistedState?.activeFlowPath,
          currentNodeId: persistedState?.currentNodeId,
          gameType: persistedState?.gameType,
          selectedGameType: persistedState?.selectedGameType
        });
        console.log('Available nodes in loaded flow:', Object.keys(nodes));
        
        // Priority 1: If this is an explicit transition to a specialized flow, ALWAYS start from beginning
        // This ensures we don't try to restore incompatible nodes when switching flows
        if (sessionActions.transitionToSpecializedFlow && gameType && flowPath.includes(gameType)) {
          startNodeId = 'start';
          console.log('🔄 Starting new specialized flow from beginning (explicit transition)');
        }
        // Priority 2: Check if we're loading the same flow as persisted
        else {
          const isRestoringPersistedFlow = persistedState?.activeFlowPath === flowPath;
          
          // Only restore persisted node if:
          // 1. We're loading the same flow as what was persisted AND
          // 2. The persisted node actually exists in the loaded flow
          if (isRestoringPersistedFlow && persistedState && persistedState.currentNodeId && nodes[persistedState.currentNodeId]) {
            // We're loading the same flow that was saved, restore the exact position
            startNodeId = persistedState.currentNodeId;
            console.log('✅ Resuming from persisted node in same flow:', startNodeId);
          } 
          // Priority 3: If we're loading a different flow than what was persisted, start fresh
          else if (!isRestoringPersistedFlow && gameType && flowPath.includes(gameType)) {
            startNodeId = 'start';
            console.log('🆕 Starting specialized flow from beginning (different flow)');
          }
          // Priority 4: If we have persisted state but the node doesn't exist in this flow, use start
          else if (persistedState && persistedState.currentNodeId && !nodes[persistedState.currentNodeId]) {
            startNodeId = 'start';
            console.log('⚠️ Persisted node not found in flow, starting from beginning');
          }
          // Priority 5: Fall back to initial node ID or start
          else {
            // Use 'start' if available, otherwise fall back to initialNodeId
            startNodeId = nodes['start'] ? 'start' : initialNodeId;
            console.log('📍 Using node:', startNodeId);
          }
        }
        console.log('=== End Restoration Sequence ===');
        
        if (nodes[startNodeId]) {
          setDialogueState(prev => ({
            ...prev,
            currentNodeId: startNodeId,
            currentNode: nodes[startNodeId],
            dialogueStep: 0,
            carouselIndex: 0,
            showAllChoices: false
          }));
          console.log('✨ Dialogue state successfully updated with node:', startNodeId, 'Text preview:', nodes[startNodeId]?.text?.substring(0, 50) + '...');
        } else {
          console.error('Start node not found in loaded flow:', startNodeId, 'Available nodes:', Object.keys(nodes));
        }
        
        // Clear the transition flag after successful load
        // Use a timeout to ensure state updates happen after the current render cycle
        setTimeout(() => {
          setSessionActions(prev => ({ ...prev, transitionToSpecializedFlow: false }));
        }, 0);
        
        setIsLoading(false);
        setIsFlowLoading(false);
      })
      .catch(error => {
        console.error(`Failed to load wizard flow from ${flowPath}:`, error);
        
        // Mark this flow path as failed to prevent retry loops
        setFailedFlowPaths(prev => new Set(prev).add(flowPath));
        
        // Clear the transition flag since we failed to load the specialized flow
        if (sessionActions.transitionToSpecializedFlow) {
          setTimeout(() => {
            setSessionActions(prev => ({ ...prev, transitionToSpecializedFlow: false }));
          }, 0);
        }
        
        // Try fallback to default flow only if we're not already on it
        if (flowPath !== wizardFlowPath && !failedFlowPaths.has(wizardFlowPath)) {
          console.log('Attempting fallback to default flow:', wizardFlowPath);
          loadWizardFlow(wizardFlowPath)
            .then(nodes => {
              setWizardData(nodes);
              setLoadedFlowPath(wizardFlowPath);
              if (nodes[initialNodeId]) {
                setDialogueState(prev => ({
                  ...prev,
                  currentNodeId: initialNodeId,
                  currentNode: nodes[initialNodeId],
                  dialogueStep: 0,
                  carouselIndex: 0,
                  showAllChoices: false
                }));
              }
              setIsLoading(false);
              setIsFlowLoading(false);
            })
            .catch(fallbackError => {
              console.error('Failed to load fallback flow:', fallbackError);
              setFailedFlowPaths(prev => new Set(prev).add(wizardFlowPath));
              setIsLoading(false);
              setIsFlowLoading(false);
            });
        } else {
          setIsLoading(false);
          setIsFlowLoading(false);
          
          // If we can't load any flow, stay with the current flow if available
          if (!wizardData && loadedFlowPath) {
            console.log('No flow data available, staying with current flow');
          }
        }
      });
  }, [wizardFlowPath, initialNodeId, flowType, sessionActions.selectedGameType, sessionActions.gameType, sessionActions.transitionToSpecializedFlow]);

  // Update current node when ID changes
  useEffect(() => {
    if (wizardData && dialogueState.currentNodeId) {
      const node = wizardData[dialogueState.currentNodeId];
      if (node) {
        setDialogueState(prev => ({
          ...prev,
          currentNode: node,
          dialogueStep: 0,
          carouselIndex: 0,
          showAllChoices: false,
        }));
      }
    }
  }, [dialogueState.currentNodeId, wizardData]);

  // Navigation functions
  const navigateToNode = useCallback((nodeId: string) => {
    setDialogueState(prev => ({
      ...prev,
      currentNodeId: nodeId
    }));
  }, []);

  const handleOptionSelect = useCallback((option: any) => {
    console.log('Option selected:', option.text, 'Action:', option.action);
    
    // Update session actions
    if (option.text) {
      setSessionActions(prev => updateSessionActionsForOption(prev, option.text));
    }
    
    // Handle setVariable if present
    if (option.setVariable) {
      setSessionActions(prev => ({ 
        ...prev, 
        ...option.setVariable,
        // Ensure selectedGameType is also set for flow loading
        selectedGameType: option.setVariable.gameType || prev.selectedGameType
      }));
      console.log('Set variable:', option.setVariable);
    }
    
    // Handle transitionToSpecializedFlow action
    if (option.action === 'transitionToSpecializedFlow') {
      console.log('Setting transitionToSpecializedFlow flag for gameType:', option.setVariable?.gameType || sessionActions.gameType);
      setSessionActions(prev => ({ 
        ...prev, 
        transitionToSpecializedFlow: true
      }));
      
      // Don't navigate immediately - let the flow loading handle it
      // This prevents race conditions between navigation and flow loading
      if (!option.next) {
        console.log('No next node specified, will load specialized flow start node');
        // Return early to prevent navigation
        return option;
      }
    }
    
    // Navigate to next node (unless we're transitioning to specialized flow without a next)
    if (option.next) {
      console.log('Navigating to next node:', option.next);
      navigateToNode(option.next);
    } else if (option.action === 'transitionToSpecializedFlow') {
      // For transitionToSpecializedFlow without a next, trigger a state change
      // This ensures the useEffect will run to load the new flow
      console.log('Triggering flow transition without explicit navigation');
    }
    
    // Return the option for additional handling in the parent component
    return option;
  }, [navigateToNode]);

  const advance = useCallback(() => {
    const { currentNode, dialogueStep } = dialogueState;
    if (!currentNode) return;
    
    if (currentNode.multiStep && dialogueStep < currentNode.multiStep.length - 1) {
      setDialogueState(prev => ({
        ...prev,
        dialogueStep: prev.dialogueStep + 1
      }));
    }
  }, [dialogueState]);

  return {
    wizardData,
    dialogueState,
    sessionActions,
    isLoading,
    navigateToNode,
    handleOptionSelect,
    advance,
    setSessionActions,
  };
}

interface DialogueTextProps {
  text: string;
  nodeId: string;
  dialogueStep: number;
  className?: string;
}

// Dialogue text component with animation
export function DialogueText({ 
  text, 
  nodeId, 
  dialogueStep,
  className = '' 
}: DialogueTextProps) {
  if (!text) return null;

  return (
    <motion.div
      key={`${nodeId}-${dialogueStep}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center ${className}`}
    >
      <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
        {text}
      </p>
    </motion.div>
  );
}

interface DialogueBoxProps {
  text: string;
  className?: string;
  variant?: 'default' | 'mobile';
}

// Dialogue box component for mobile layouts
export function DialogueBox({ 
  text, 
  className = '',
  variant = 'default'
}: DialogueBoxProps) {
  const baseStyles = STYLES.DIALOGUE_BG;
  const paddingStyles = variant === 'mobile' ? 'p-4' : 'p-3';
  const textSize = variant === 'mobile' ? 'text-base' : 'text-sm';

  return (
    <motion.div 
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: ANIMATIONS.FADE_IN.delay }}
    >
      <div className={`w-full ${baseStyles} ${paddingStyles}`}>
        <p className={`text-center ${textSize} text-gray-700 dark:text-gray-300 leading-relaxed`}>
          {text}
        </p>
      </div>
    </motion.div>
  );
}

// Helper functions for dialogue state
export function getDialogueHelpers(dialogueState: DialogueState, sessionActions?: SessionActions) {
  const { currentNode, dialogueStep } = dialogueState;
  
  return {
    getCurrentText: () => getCurrentText(currentNode, dialogueStep, sessionActions),
    shouldShowOptions: () => shouldShowOptions(currentNode, dialogueStep),
    shouldShowContinue: () => shouldShowContinue(currentNode, dialogueStep),
  };
}