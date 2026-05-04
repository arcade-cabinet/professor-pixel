import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, ArrowRight, Trophy, X, Copy, Code, CheckCircle, Sparkles, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface FloatingFeedbackProps {
  step: {
    id: string;
    title: string;
    hints: string[];
    solution: string;
  };
  onNextStep: () => void;
  onCompleteLesson: () => void;
  onApplySolution: (solution: string) => void;
  showNext: boolean;
  isLastStep: boolean;
  gradingResult?: {
    passed: boolean;
    feedback: string;
    expectedOutput?: string;
    actualOutput?: string;
  } | null;
}

export default function FloatingFeedback({ step, onNextStep, onCompleteLesson, onApplySolution, showNext, isLastStep, gradingResult }: FloatingFeedbackProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showSolution, setShowSolution] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (showNext) {
      // Celebrate when step is completed
      const timer = setTimeout(() => {
        const celebration = document.createElement('div');
        celebration.className = 'fixed inset-0 pointer-events-none z-50';
        celebration.innerHTML = `
          <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div class="text-6xl animate-ping">🎉</div>
          </div>
        `;
        document.body.appendChild(celebration);
        setTimeout(() => celebration.remove(), 1000);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showNext]);

  const handleCopySolution = async () => {
    try {
      await navigator.clipboard.writeText(step.solution);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
      toast({
        title: "Solution copied!",
        description: "The solution has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try selecting and copying the text manually.",
        variant: "destructive",
      });
    }
  };

  const handleApplySolution = () => {
    onApplySolution(step.solution);
    toast({
      title: "Solution applied!",
      description: "The solution has been added to the code editor.",
    });
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-8 right-8 z-40"
      >
        <Card className="w-96 shadow-2xl border-2 border-border bg-card/95 backdrop-blur-sm hover:shadow-3xl transition-shadow duration-300" data-testid="floating-feedback">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg pointer-events-none"></div>
          
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between mb-4">
              <motion.div 
                className="flex items-start gap-3"
                initial={{ x: -20 }}
                animate={{ x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <motion.div
                  animate={showNext ? { rotate: [0, 360], scale: [1, 1.2, 1] } : { rotate: [0, -10, 10, -10, 0] }}
                  transition={showNext ? { duration: 0.5 } : { duration: 2, repeat: Infinity, delay: 1 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-secondary to-primary rounded-full blur opacity-50"></div>
                  <div className="relative bg-white dark:bg-gray-800 rounded-full p-2">
                    {showNext ? (
                      <Trophy className="text-secondary h-6 w-6" />
                    ) : (
                      <Lightbulb className="text-secondary h-6 w-6" />
                    )}
                  </div>
                </motion.div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {showNext ? "Excellent Work! 🎉" : "Step Guidance"}
                  </h4>
                </div>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVisible(false)}
                  className="h-8 w-8 p-0 hover:bg-muted rounded-full transition-all"
                  data-testid="button-dismiss-feedback"
                >
                  <X className="h-5 w-5" />
                </Button>
              </motion.div>
            </div>

            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {showNext ? (
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Step Completed!</span>
                  </div>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {isLastStep 
                      ? "Amazing job! You've mastered all the concepts in this lesson. Ready to complete it?" 
                      : "Great progress! You're ready to tackle the next challenge."}
                  </p>
                </motion.div>
              ) : (
                <>
                  {step.hints.length > 0 && (
                    <div className="space-y-3">
                      {step.hints.map((hint, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex gap-2"
                        >
                          <Sparkles className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                          <p className="text-base text-muted-foreground leading-relaxed">{hint}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-3 pt-3">
                {showNext && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, delay: 0.3 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={isLastStep ? onCompleteLesson : onNextStep}
                      className="bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg transition-all duration-300 group"
                      data-testid={isLastStep ? "button-complete-lesson" : "button-next-step"}
                    >
                      {isLastStep ? (
                        <>
                          <Trophy className="h-5 w-5 mr-2" />
                          <span className="text-base font-semibold">Complete Lesson</span>
                          <Zap className="h-4 w-4 ml-1 group-hover:animate-pulse" />
                        </>
                      ) : (
                        <>
                          <span className="text-base font-semibold">Next Step</span>
                          <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    onClick={() => setShowSolution(!showSolution)}
                    className="min-h-[44px] px-5 text-base font-medium border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all"
                    data-testid="button-show-solution"
                  >
                    <Code className="h-4 w-4 mr-2" />
                    {showSolution ? "Hide Solution" : "Show Solution"}
                  </Button>
                </motion.div>
              </div>

              <AnimatePresence>
                {showSolution && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg blur-xl"></div>
                      <div className="relative p-4 bg-gray-900 text-gray-100 font-mono text-base rounded-lg overflow-x-auto border border-gray-700 shadow-lg" data-testid="solution-display">
                        <pre className="whitespace-pre-wrap leading-relaxed">{step.solution}</pre>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCopySolution}
                          className="flex items-center gap-2 bg-gradient-to-r from-secondary/10 to-primary/10 hover:from-secondary/20 hover:to-primary/20 transition-all"
                          data-testid="button-copy-solution"
                        >
                          {justCopied ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-success" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span>Copy Solution</span>
                            </>
                          )}
                        </Button>
                      </motion.div>
                      
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleApplySolution}
                          className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 transition-all"
                          data-testid="button-apply-solution"
                        >
                          <Code className="h-4 w-4" />
                          Apply to Editor
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}