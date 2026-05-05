import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { WizardNode, DialogueState, SessionActions, WizardOption } from '@lib/wizard/types';
import {
  getCurrentText,
  shouldShowOptions,
  shouldShowContinue,
  updateSessionActionsForOption,
  loadWizardFlow,
  getSingleNavigableTarget,
} from '@lib/wizard/utils';
import { WIZARD_FLOW_PATH, INITIAL_NODE_ID, STYLES, ANIMATIONS } from '@lib/wizard/constants';
import {
  saveWizardStateDebounced,
  loadWizardState,
  PersistedWizardState,
} from '@lib/storage/persistence';
import { speak, cancelSpeech, subscribeAudioEnabled } from '@lib/audio';

interface UseWizardDialogueProps {
  initialNodeId?: string;
  wizardFlowPath?: string;
  flowType?: 'default' | 'game-dev';
}

// Custom hook for managing wizard dialogue state
export function useWizardDialogue({
  initialNodeId = INITIAL_NODE_ID,
  wizardFlowPath = WIZARD_FLOW_PATH,
  flowType = 'default',
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
      activeFlowPath: persistedState?.activeFlowPath,
    });

    if (persistedState && persistedState.currentNodeId) {
      persistedStateRef.current = persistedState;
      return {
        currentNodeId: persistedState.currentNodeId,
        currentNode: null,
        // Restore mid-multiStep position if persisted; defaults to 0 for
        // plain nodes or when no prior step was saved.
        dialogueStep: persistedState.dialogueStep ?? 0,
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
      unlockedEditor: false,
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

  // Persist state changes. `dialogueStep` is in the dependency array so a
  // kid parked mid-multiStep (slide 2 of a 4-slide tutorial node) who hits
  // refresh lands back on slide 2, not slide 0. Without this, refresh
  // would silently rewind their progress through the in-node sequence.
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
      dialogueStep: dialogueState.dialogueStep,
      gameType: sessionActions.gameType,
      selectedGameType: sessionActions.selectedGameType,
      sessionActions: sessionActions,
      updatedAt: new Date().toISOString(),
    });
  }, [
    dialogueState.currentNodeId,
    dialogueState.dialogueStep,
    sessionActions,
    loadedFlowPath,
    hasLoadedPersistedState,
  ]);

  // P3.2 — Pixel speaks the current node text when it changes (audio off by
  // default, gated on `pp.audioEnabled`). Cancels any in-flight speech first
  // so back-to-back transitions don't queue. Cleanup cancels on unmount.
  // Compute the derived text outside the effect so the effect depends on the
  // resolved string rather than on the sessionActions object identity —
  // sessionActions reshapes on every state update, so depending on it would
  // re-fire speech on every keystroke, not just when the visible text changes.
  const currentText = getCurrentText(
    dialogueState.currentNode,
    dialogueState.dialogueStep,
    sessionActions
  );
  // Reactive audio-enabled — subscribe so the speech effect fires when the
  // kid toggles voice on while parked on a node, not only on the *next*
  // node transition. subscribeAudioEnabled fires on same-tab toggles
  // (custom event) and cross-tab toggles (storage event).
  const [audioEnabled, setAudioEnabledState] = useState(false);
  useEffect(() => subscribeAudioEnabled(setAudioEnabledState), []);

  useEffect(() => {
    if (!audioEnabled) return;
    if (currentText) speak(currentText);
    return () => {
      cancelSpeech();
    };
  }, [currentText, audioEnabled]);

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
    const shouldLoadSpecializedFlow =
      gameType &&
      !failedFlowPaths.has(specializedFlowPath || '') &&
      (sessionActions.transitionToSpecializedFlow || loadedFlowPath !== specializedFlowPath);

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
      const persistedNodeId = persistedState?.currentNodeId;
      if (persistedNodeId && wizardData[persistedNodeId]) {
        // Always sync with persisted state if the node exists
        if (persistedNodeId !== dialogueState.currentNodeId) {
          console.log('📍 Restoring persisted node in already-loaded flow:', persistedNodeId);
          setDialogueState((prev) => ({
            ...prev,
            currentNodeId: persistedNodeId,
            currentNode: wizardData[persistedNodeId],
            dialogueStep: 0,
            carouselIndex: 0,
            showAllChoices: false,
          }));
        }
      }

      // Clear transition flag if it's set but we already have the right flow
      if (sessionActions.transitionToSpecializedFlow) {
        setSessionActions((prev) => ({ ...prev, transitionToSpecializedFlow: false }));
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
      .then((nodes) => {
        console.log(
          'Successfully loaded flow:',
          flowPath,
          'Nodes count:',
          Object.keys(nodes).length
        );
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
          selectedGameType: persistedState?.selectedGameType,
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
          if (
            isRestoringPersistedFlow &&
            persistedState &&
            persistedState.currentNodeId &&
            nodes[persistedState.currentNodeId]
          ) {
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
          else if (
            persistedState &&
            persistedState.currentNodeId &&
            !nodes[persistedState.currentNodeId]
          ) {
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
          setDialogueState((prev) => ({
            ...prev,
            currentNodeId: startNodeId,
            currentNode: nodes[startNodeId],
            dialogueStep: 0,
            carouselIndex: 0,
            showAllChoices: false,
          }));
          console.log(
            '✨ Dialogue state successfully updated with node:',
            startNodeId,
            'Text preview:',
            nodes[startNodeId]?.text?.substring(0, 50) + '...'
          );
        } else {
          console.error(
            'Start node not found in loaded flow:',
            startNodeId,
            'Available nodes:',
            Object.keys(nodes)
          );
        }

        // Clear the transition flag after successful load
        // Use a timeout to ensure state updates happen after the current render cycle
        setTimeout(() => {
          setSessionActions((prev) => ({ ...prev, transitionToSpecializedFlow: false }));
        }, 0);

        setIsLoading(false);
        setIsFlowLoading(false);
      })
      .catch((error) => {
        console.error(`Failed to load wizard flow from ${flowPath}:`, error);

        // Mark this flow path as failed to prevent retry loops
        setFailedFlowPaths((prev) => new Set(prev).add(flowPath));

        // Clear the transition flag since we failed to load the specialized flow
        if (sessionActions.transitionToSpecializedFlow) {
          setTimeout(() => {
            setSessionActions((prev) => ({ ...prev, transitionToSpecializedFlow: false }));
          }, 0);
        }

        // Try fallback to default flow only if we're not already on it
        if (flowPath !== wizardFlowPath && !failedFlowPaths.has(wizardFlowPath)) {
          console.log('Attempting fallback to default flow:', wizardFlowPath);
          loadWizardFlow(wizardFlowPath)
            .then((nodes) => {
              setWizardData(nodes);
              setLoadedFlowPath(wizardFlowPath);
              if (nodes[initialNodeId]) {
                setDialogueState((prev) => ({
                  ...prev,
                  currentNodeId: initialNodeId,
                  currentNode: nodes[initialNodeId],
                  dialogueStep: 0,
                  carouselIndex: 0,
                  showAllChoices: false,
                }));
              }
              setIsLoading(false);
              setIsFlowLoading(false);
            })
            .catch((fallbackError) => {
              console.error('Failed to load fallback flow:', fallbackError);
              setFailedFlowPaths((prev) => new Set(prev).add(wizardFlowPath));
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
  }, [
    wizardFlowPath,
    initialNodeId,
    flowType,
    sessionActions.selectedGameType,
    sessionActions.gameType,
    sessionActions.transitionToSpecializedFlow,
    loadedFlowPath,
    wizardData,
    isFlowLoading,
    // The Set itself, not Set.prototype.has — the prototype method is a
    // stable reference and would never re-fire this effect when a flow is
    // marked failed. setFailedFlowPaths always allocates a new Set, so
    // depending on the instance correctly invalidates the effect.
    failedFlowPaths,
    dialogueState.currentNodeId,
  ]);

  // First-load restore guard: when wizardData arrives and the kid's
  // currentNodeId came from persisted state, we preserve the persisted
  // dialogueStep instead of slamming it to 0. After the very first
  // resolution, subsequent currentNodeId changes are real navigations
  // (handleOptionSelect, navigateToNode, goBack) and SHOULD reset the
  // step counter — re-entering a multiStep node mid-session always
  // starts the kid at slide 0 of the in-node sequence. This ref is the
  // one-shot toggle that keeps the restore-vs-reset behaviors distinct.
  const isFirstNodeResolutionRef = useRef(true);

  // Update current node when ID changes
  useEffect(() => {
    if (wizardData && dialogueState.currentNodeId) {
      const node = wizardData[dialogueState.currentNodeId];
      if (node) {
        const isFirst = isFirstNodeResolutionRef.current;
        const persistedStep = persistedStateRef.current?.dialogueStep;
        // Only restore the persisted step if the resolved node IS multiStep
        // AND the index is within range. A non-multiStep node always renders
        // at step 0 — accepting a non-zero stale value would let
        // getCurrentText be called with dialogueStep=2 on a plain node and
        // render an empty bubble. Flow JSON edits between sessions can also
        // shrink a multiStep array, in which case the stale index is also
        // invalid and falls through to 0.
        // Disk-resident value — must be a non-negative integer within
        // the current multiStep array. A non-integer (e.g. 1.5) or
        // negative would slip past `< length` and either index off the
        // end of the array (undefined) or pull a step the kid never
        // saw. Flow JSON edits between sessions can also shrink the
        // array, in which case the stale index falls through to 0.
        const stepInRange =
          typeof persistedStep === 'number' &&
          Number.isInteger(persistedStep) &&
          persistedStep >= 0 &&
          node.multiStep != null &&
          persistedStep < node.multiStep.length;
        const restoreStep = isFirst && stepInRange ? persistedStep : 0;
        if (isFirst) isFirstNodeResolutionRef.current = false;
        setDialogueState((prev) => ({
          ...prev,
          currentNode: node,
          dialogueStep: restoreStep,
          carouselIndex: 0,
          showAllChoices: false,
        }));
      }
    }
  }, [dialogueState.currentNodeId, wizardData]);

  // Per-session back-stack of prior nodeIds. In-memory only — persisted
  // state already restores `currentNodeId` on refresh, so reviving the
  // back-stack across reloads would let the kid press Back into a node
  // their session never actually visited (the prior browsing trail).
  // Cleared whenever the wizard reaches a structurally-terminal completion
  // so a fresh run starts with no Back affordance.
  const historyRef = useRef<string[]>([]);
  const [historyDepth, setHistoryDepth] = useState(0);

  // historyRef stores raw node IDs. When the kid switches to a
  // different flow (loadedFlowPath changes) those IDs no longer exist
  // in the new wizardData — pressing Back would route to a missing
  // node and crash the renderer. Reset on flow change.
  useEffect(() => {
    historyRef.current = [];
    setHistoryDepth(0);
  }, [loadedFlowPath]);

  // Navigation functions
  //
  // The back-stack push happens BEFORE the setState call rather than
  // inside the updater. React 19 strict mode invokes state updaters
  // twice in dev to surface impure logic — a `historyRef.current.push`
  // inside the updater would double-push and the kid sees Back land on
  // the same node twice. Reading `dialogueState.currentNodeId` from the
  // closure is fine because navigateToNode runs from event handlers
  // where the latest render is current.
  const navigateToNode = useCallback(
    (nodeId: string, options?: { skipHistory?: boolean }) => {
      const prevId = dialogueState.currentNodeId;
      // Self-navigation (re-entering the same node) is a no-op for the
      // back-stack — pushing the same id would let Back re-stick the kid
      // on the page they're already on.
      if (!options?.skipHistory && prevId && prevId !== nodeId) {
        historyRef.current.push(prevId);
        setHistoryDepth(historyRef.current.length);
      }
      setDialogueState((prev) => ({ ...prev, currentNodeId: nodeId }));
    },
    [dialogueState.currentNodeId]
  );

  const goBack = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const previousNodeId = historyRef.current.pop()!;
    setHistoryDepth(historyRef.current.length);
    // Use the skipHistory flag so going Back doesn't itself add an entry —
    // otherwise Back-then-Back would cycle between two nodes forever.
    setDialogueState((prev) => ({ ...prev, currentNodeId: previousNodeId }));
  }, []);

  const handleOptionSelect = useCallback(
    (option: WizardOption) => {
      console.log('Option selected:', option.text, 'Action:', option.action);

      // Update session actions
      if (option.text) {
        setSessionActions((prev) => updateSessionActionsForOption(prev, option.text));
      }

      // Handle setVariable if present. setVariable is Record<string, unknown>;
      // narrow specific known keys (gameType is the only structured one) and
      // spread the rest as-is — SessionActions is a permissive shape and the
      // unknown values flow into compatibly-typed slots through the spread.
      if (option.setVariable) {
        const setVariable = option.setVariable;
        const gameTypeFromVariable =
          typeof setVariable.gameType === 'string' ? setVariable.gameType : undefined;
        setSessionActions((prev) => ({
          ...prev,
          ...(setVariable as Partial<SessionActions>),
          selectedGameType: gameTypeFromVariable || prev.selectedGameType,
        }));
        console.log('Set variable:', setVariable);
      }

      // Handle transitionToSpecializedFlow action
      if (option.action === 'transitionToSpecializedFlow') {
        const gameTypeFromVariable =
          typeof option.setVariable?.gameType === 'string'
            ? option.setVariable.gameType
            : undefined;
        console.log(
          'Setting transitionToSpecializedFlow flag for gameType:',
          gameTypeFromVariable || sessionActions.gameType
        );
        setSessionActions((prev) => ({
          ...prev,
          transitionToSpecializedFlow: true,
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
    },
    [navigateToNode, sessionActions.gameType]
  );

  const advance = useCallback(() => {
    const { currentNode, dialogueStep } = dialogueState;
    if (!currentNode) return;

    // Mid-multiStep: bump the dialogue step; the ContinueButton is already showing.
    if (currentNode.multiStep && dialogueStep < currentNode.multiStep.length - 1) {
      setDialogueState((prev) => ({
        ...prev,
        dialogueStep: prev.dialogueStep + 1,
      }));
      return;
    }

    // End-of-multiStep OR plain node — when the only forward affordance is a
    // side-effect-free single option, Advance navigates to that option's
    // `next`. Covers two callsites: ContinueButton (single-continue-text
    // collapse, F4.2) and the asset-browser-close handler (F4.3 — advance
    // after asset pick on nodes whose option text is "Pick a character" etc.,
    // which is non-continue-text but still pure navigation).
    //
    // Uses `getSingleNavigableTarget` from utils.ts as the single source of
    // truth for the side-effect-free triple-check (no action / setVariable /
    // updatePreview), preventing predicate drift with `isSingleContinueOption`.
    const target = getSingleNavigableTarget(currentNode);
    if (target) navigateToNode(target);
  }, [dialogueState, navigateToNode]);

  // P1.1 — wizard-completion derived state.
  //
  // Two signals mark the wizard complete:
  // (a) `currentNode.action === 'compileFullGame'` — the explicit author
  //     contract every -flow.json file uses.
  // (b) Structurally terminal AND `sessionActions.gameAssembled` is true —
  //     a node with no forward navigation, but only AFTER a previous step
  //     has actually built something the runner can launch. Without the
  //     `gameAssembled` gate, any "you canceled" / "come back later" leaf
  //     would surface the CTA against an empty project.
  //
  // For multiStep nodes, we only consider the FINAL step terminal — earlier
  // dialogue steps still have content to show. `dialogueStep` is checked
  // against `multiStep.length - 1`.
  //
  // `!isLoading` guards a narrow hydration window: persisted state can
  // restore `currentNodeId` (and therefore `currentNode`) before a fresh
  // flow fetch completes, leaving us with a non-null currentNode but an
  // in-flight load. Without this guard we'd flash the CTA in that window.
  const currentNode = dialogueState.currentNode;
  const onLastMultiStep =
    !currentNode?.multiStep?.length ||
    dialogueState.dialogueStep >= currentNode.multiStep.length - 1;
  const structurallyTerminal =
    !!currentNode &&
    !currentNode.options?.length &&
    onLastMultiStep &&
    !!sessionActions.gameAssembled;
  const isWizardComplete = !!(
    currentNode &&
    !isLoading &&
    (currentNode.action === 'compileFullGame' || structurallyTerminal)
  );

  return {
    wizardData,
    dialogueState,
    sessionActions,
    isLoading,
    isWizardComplete,
    navigateToNode,
    handleOptionSelect,
    advance,
    setSessionActions,
    goBack,
    canGoBack: historyDepth > 0,
  };
}

interface DialogueTextProps {
  text: string;
  nodeId: string;
  dialogueStep: number;
  className?: string;
}

// Dialogue text component with animation
export function DialogueText({ text, nodeId, dialogueStep, className = '' }: DialogueTextProps) {
  if (!text) return null;

  return (
    <motion.div
      key={`${nodeId}-${dialogueStep}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center ${className}`}
    >
      <p
        // P5 a11y — assertive live region so screen readers announce each new
        // dialogue node as the wizard advances. Pixel speaking IS the primary
        // content surface; falling silent on screen readers would gate the
        // whole product. role="status" + aria-live="polite" balances
        // announcement against interrupting the user mid-input.
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed"
      >
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
export function DialogueBox({ text, className = '', variant = 'default' }: DialogueBoxProps) {
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
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`text-center ${textSize} text-gray-700 dark:text-gray-300 leading-relaxed`}
        >
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
