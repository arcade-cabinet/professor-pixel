import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useWizardDialogue, DialogueText, getDialogueHelpers } from './wizard-dialogue-engine';
import PygameLivePreview, { GameChoice } from './pygame-live-preview';
import type { WizardOption, GameChoice as GameChoiceType } from './wizard-types';

interface WizardWithPreviewProps {
  pyodide?: any;
  className?: string;
}

export default function WizardWithPreview({ pyodide, className }: WizardWithPreviewProps) {
  const { toast } = useToast();
  const {
    dialogueState,
    sessionActions,
    isLoading,
    handleOptionSelect,
    advance,
    setSessionActions
  } = useWizardDialogue({
    flowType: 'game-dev',
    initialNodeId: 'start'
  });

  const [livePreviewChoices, setLivePreviewChoices] = useState<GameChoice[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [alternativeChoice, setAlternativeChoice] = useState<GameChoice | undefined>();
  const [pixelComments, setPixelComments] = useState<string[]>([]);

  const helpers = getDialogueHelpers(dialogueState, sessionActions);
  const { currentNode } = dialogueState;

  // Handle option selection with live preview updates
  const handleOptionWithPreview = useCallback((option: WizardOption) => {
    // Update preview if this option affects it
    if (option.updatePreview) {
      const newChoice = option.updatePreview;
      
      // Add to live preview choices
      setLivePreviewChoices(prev => {
        // Replace existing choice of same type or add new one
        const filtered = prev.filter(c => c.type !== newChoice.type);
        return [...filtered, newChoice];
      });

      // Add Pixel's comment
      if (option.previewComment) {
        setPixelComments([option.previewComment]);
        // Clear comment after 5 seconds
        setTimeout(() => setPixelComments([]), 5000);
      }

      // Update session actions
      setSessionActions(prev => ({
        ...prev,
        livePreviewChoices: [...(prev.livePreviewChoices || []), newChoice],
        previewHistory: [
          ...(prev.previewHistory || []),
          {
            nodeId: dialogueState.currentNodeId,
            choice: newChoice,
            timestamp: new Date()
          }
        ]
      }));

      // Show celebratory toast for major choices
      if (newChoice.type === 'character') {
        toast({
          title: "Awesome choice!",
          description: `Your ${newChoice.name} is ready to play!`,
          className: "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
        });
      }
    }

    // Handle normal option selection
    handleOptionSelect(option);
  }, [dialogueState.currentNodeId, handleOptionSelect, setSessionActions, toast]);

  // Generate pixel comments based on current preview
  useEffect(() => {
    if (currentNode?.showLivePreview?.pixelComments) {
      setPixelComments(currentNode.showLivePreview.pixelComments);
    }
  }, [currentNode]);

  // Handle live preview interactions
  const handlePreviewInteraction = useCallback((action: string, details?: any) => {
    console.log('Preview interaction:', action, details);
    
    // Generate dynamic comments based on interactions
    const interactionComments: Record<string, string[]> = {
      'click': [
        "Nice click! Try clicking on different objects!",
        "You found an interactive spot!",
        "Keep exploring - there's more to discover!"
      ],
      'jump': [
        "Wheee! That's a great jump!",
        "Look at them go!",
        "Perfect timing on that jump!"
      ],
      'collect': [
        "Score! You collected an item!",
        "Great job! Keep collecting!",
        "You're getting the hang of this!"
      ]
    };

    if (interactionComments[action]) {
      const randomComment = interactionComments[action][
        Math.floor(Math.random() * interactionComments[action].length)
      ];
      setPixelComments([randomComment]);
      setTimeout(() => setPixelComments([]), 3000);
    }
  }, []);

  // Check if current node should show live preview
  const shouldShowPreview = currentNode?.showLivePreview?.enabled || livePreviewChoices.length > 0;

  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800", className)}>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wizard Dialogue Section */}
          <div className="space-y-4">
            {/* Pixel Character Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Pixel Avatar */}
                  <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <span className="text-3xl">🤖</span>
                  </div>
                  <div className="flex-1 space-y-3">
                    {/* Dialogue Text */}
                    {helpers.getCurrentText() && (
                      <DialogueText
                        text={helpers.getCurrentText()}
                        nodeId={dialogueState.currentNodeId}
                        dialogueStep={dialogueState.dialogueStep}
                        className="text-base"
                      />
                    )}
                    
                    {/* Continue Button */}
                    {helpers.shouldShowContinue() && (
                      <Button
                        onClick={advance}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        data-testid="button-continue"
                      >
                        Continue
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Options */}
            {helpers.shouldShowOptions() && currentNode?.options && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                      Choose your path:
                    </p>
                    <AnimatePresence mode="wait">
                      {currentNode.options.map((option, index) => (
                        <motion.div
                          key={`${dialogueState.currentNodeId}-option-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Button
                            onClick={() => handleOptionWithPreview(option)}
                            variant="outline"
                            className="w-full justify-start text-left hover:bg-purple-50 dark:hover:bg-purple-900/20"
                            data-testid={`button-option-${index}`}
                          >
                            <span className="mr-2 text-purple-500">▸</span>
                            {option.text}
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Tracker */}
            {sessionActions.livePreviewChoices && sessionActions.livePreviewChoices.length > 0 && (
              <Card className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium">Your Game Choices</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sessionActions.livePreviewChoices.map((choice, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="bg-white/80 dark:bg-gray-800/80"
                      >
                        {choice.type}: {choice.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Live Preview Section */}
          {shouldShowPreview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="sticky top-4"
            >
              <PygameLivePreview
                choices={livePreviewChoices}
                currentStep={dialogueState.currentNodeId}
                showComparison={showComparison}
                alternativeChoice={alternativeChoice}
                onInteraction={handlePreviewInteraction}
                pixelComments={pixelComments}
                pyodide={pyodide}
                className="h-full"
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}