import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { queryClient } from '@lib/net/query-client';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/header';
import CodeEditor from '@/components/editor/code-editor';
import FloatingFeedback from '@/components/floating-feedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Heart,
  Code2,
  Zap,
  BookOpen,
  Rocket,
} from 'lucide-react';
import type { Lesson, UserProgress } from '@lib/types/schema';
import { getWorkerRunner } from '@lib/python/worker-runner';
import { getPyodide } from '@lib/python/pyodide-singleton';
import { loadLessons } from '@lib/lessons';
import { getClientStorage } from '@lib/storage/mode';
import { gradeCode, type GradingContext } from '@lib/grading';
import { getEducationalError } from '@lib/errors/educational';
import { strings } from '@lib/i18n';

// Import Pixel images
import pixelHappy from '@assets/pixel/Pixel_happy_excited_expression_22a41625.png';
import pixelThinking from '@assets/pixel/Pixel_thinking_pondering_expression_0ffffedb.png';
import pixelCelebrating from '@assets/pixel/Pixel_celebrating_victory_expression_24b7a377.png';
import pixelEncouraging from '@assets/pixel/Pixel_encouraging_supportive_expression_cf958090.png';
import pixelTeaching from '@assets/pixel/Pixel_teaching_explaining_expression_27e09763.png';
import pixelCoding from '@assets/pixel/Pixel_coding_programming_expression_56de8ca0.png';

// Pixel's conversational dialogues live in the i18n catalog
// (strings.lesson.pixelDialogues). Local alias keeps the call sites tidy.
const pixelDialogues = strings.lesson.pixelDialogues;

// Get random dialogue from array
const getRandomDialogue = (dialogues: readonly string[], replacements?: Record<string, string>) => {
  let dialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      dialogue = dialogue.replace(`{${key}}`, value);
    });
  }
  return dialogue;
};

export default function LessonEnhanced() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [, setLocation] = useLocation();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [_showIntroModal, setShowIntroModal] = useState(false);
  const [pixelDialogue, setPixelDialogue] = useState('');
  const [pixelImage, setPixelImage] = useState(pixelTeaching);
  const [_showHint, setShowHint] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [gradingResult, setGradingResult] = useState<{
    passed: boolean;
    feedback: string;
    expectedOutput?: string;
    actualOutput?: string;
  } | null>(null);

  // Pyodide loads lazily via the page-singleton; runner.tsx + pygame-preview
  // share the same instance (T2.1).
  const {
    data: pyodide,
    isLoading: pyodideLoading,
    error: pyodideError,
  } = useQuery({
    queryKey: ['pyodide'],
    queryFn: () => getPyodide(),
    staleTime: Infinity,
  });

  // The worker runner is the only execution path for the lesson page —
  // student code runs off the main thread with a hard timeout so a runaway
  // `while True:` cannot wedge the UI. Reuses the page-level singleton so
  // the worker's Pyodide bootstraps once.
  const pythonRunner = useMemo(() => (pyodide ? getWorkerRunner() : null), [pyodide]);

  const {
    data: lesson,
    isLoading: lessonLoading,
    error: lessonError,
  } = useQuery<Lesson | undefined>({
    queryKey: ['lessons', lessonId],
    queryFn: async () => {
      const lessons = await loadLessons();
      return lessons.find((l) => l.id === lessonId);
    },
    enabled: !!lessonId,
  });

  const { data: progress } = useQuery<UserProgress | undefined>({
    queryKey: ['progress', lessonId],
    queryFn: async () => {
      if (!lessonId) return undefined;
      const userId = 'local-user'; // single-user offline app
      return getClientStorage().getUserProgressForLesson(userId, lessonId);
    },
    enabled: !!lessonId,
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { currentStep?: number; completed?: boolean; code?: string }) => {
      if (!lessonId) return;
      const userId = 'local-user';
      return getClientStorage().updateUserProgress(userId, lessonId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });

  const currentStep = lesson?.content.steps[currentStepIndex];
  const progressPercent = lesson ? (currentStepIndex / lesson.content.steps.length) * 100 : 0;

  useEffect(() => {
    if (progress && lesson) {
      setCurrentStepIndex(progress.currentStep);
      if (progress.code) {
        setCode(progress.code);
      } else if (lesson.content.steps[progress.currentStep]?.initialCode) {
        setCode(lesson.content.steps[progress.currentStep].initialCode);
      }
    } else if (lesson && lesson.content.steps[0]) {
      setCode(lesson.content.steps[0].initialCode);
      // Show intro modal for new lessons (no progress yet)
      setShowIntroModal(true);
    }
  }, [progress, lesson]);

  // Update Pixel's dialogue when step changes
  useEffect(() => {
    if (currentStep) {
      setPixelDialogue(getRandomDialogue(pixelDialogues.stepStart, { title: currentStep.title }));
      setPixelImage(pixelTeaching);
      setShowHint(false);
      setCurrentHintIndex(0);
    }
  }, [currentStep]);

  const executeCode = async (inputValues: string = '', runAutoGrading = false) => {
    if (!pythonRunner || !code.trim()) {
      setPixelDialogue(strings.lesson.inline.addCodeFirst);
      setPixelImage(pixelEncouraging);
      return;
    }

    setError('');
    setOutput('');
    setGradingResult(null);

    try {
      const result = await pythonRunner.runSnippet({
        code,
        input: inputValues,
      });

      if (result.error) {
        // result.error is raw stderr from the Pyodide worker — same kid-
        // facing surface as the outer catch below. Route through the
        // educational mapper so the editor doesn't render a verbatim
        // SyntaxError / NameError header.
        const friendly = getEducationalError(result.error);
        setError(`${friendly.friendlyMessage} ${friendly.explanation}`);
        setPixelDialogue(getRandomDialogue(pixelDialogues.stepError));
        setPixelImage(pixelThinking);

        if (runAutoGrading) {
          setGradingResult({
            passed: false,
            feedback: strings.lesson.inline.codeError,
            actualOutput: result.error,
          });
        }
        return;
      }

      // Success case - code executed without errors
      setOutput(result.output);

      // Run auto-grading if requested and step has tests
      if (runAutoGrading && currentStep && currentStep.tests && currentStep.tests.length > 0) {
        try {
          const gradingContext: GradingContext = {
            code,
            step: currentStep,
            input: inputValues,
            runner: pythonRunner,
            pyodide: pyodide ?? null,
          };

          const gradeResult = await gradeCode(gradingContext, result);
          setGradingResult({
            passed: gradeResult.passed,
            feedback: gradeResult.feedback,
            expectedOutput: gradeResult.expectedOutput,
            actualOutput: gradeResult.actualOutput,
          });

          if (gradeResult.passed) {
            setPixelDialogue(getRandomDialogue(pixelDialogues.stepComplete));
            setPixelImage(pixelCelebrating);
            updateProgressMutation.mutate({
              code,
              currentStep: Math.max(currentStepIndex + 1, progress?.currentStep || 0),
            });
          } else {
            setPixelDialogue(strings.lesson.inline.almostThere);
            setPixelImage(pixelEncouraging);
            updateProgressMutation.mutate({ code });
          }
        } catch (gradingError) {
          console.error('Grading error:', gradingError);
          // Raw exception messages ("TypeError: Cannot read properties of
          // undefined") confuse and scare kids. Route through the educational
          // mapper so we say "We couldn't check your code" with a real next-step
          // hint, not the JS error class name.
          const raw = gradingError instanceof Error ? gradingError.message : String(gradingError);
          const friendly = getEducationalError(raw);
          setGradingResult({
            passed: false,
            feedback: `${friendly.friendlyMessage} ${friendly.explanation}`,
            actualOutput: result.output,
          });
          updateProgressMutation.mutate({ code });
        }
      } else {
        setPixelDialogue(strings.lesson.inline.ranSuccess);
        setPixelImage(pixelHappy);
        updateProgressMutation.mutate({ code });
      }
    } catch (err) {
      // Route runtime errors (Pyodide crash inside runSnippet, network blip
      // fetching the lesson, etc.) through the educational mapper too — not
      // just the grader-catch above. Otherwise a "TypeError: Cannot read
      // properties of undefined" would still leak verbatim to the kid in
      // the editor's error <pre>.
      const raw = err instanceof Error ? err.message : strings.lesson.inline.runtimeFallback;
      console.error('[lesson] executeCode failed:', raw);
      const friendly = getEducationalError(raw);
      setError(`${friendly.friendlyMessage} ${friendly.explanation}`);
      setPixelDialogue(getRandomDialogue(pixelDialogues.stepError));
      setPixelImage(pixelThinking);
    }
  };

  const handleNextStep = () => {
    if (lesson && currentStepIndex < lesson.content.steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setCode(lesson.content.steps[nextIndex].initialCode || '');
      setOutput('');
      setError('');
      setGradingResult(null);
      updateProgressMutation.mutate({
        currentStep: nextIndex,
        code: lesson.content.steps[nextIndex].initialCode || '',
      });
    }
  };

  const handleCompleteLesson = () => {
    if (lesson) {
      updateProgressMutation.mutate({ completed: true });
      // The lesson completion modal will be shown by the existing logic
    }
  };

  const showNextHint = () => {
    if (currentStep && currentStep.hints && currentHintIndex < currentStep.hints.length) {
      const hint = currentStep.hints[currentHintIndex];
      setPixelDialogue(getRandomDialogue(pixelDialogues.hint) + hint);
      setPixelImage(pixelEncouraging);
      setCurrentHintIndex(currentHintIndex + 1);
      setShowHint(true);
    }
  };

  const [showCompletionOptions, setShowCompletionOptions] = useState(false);

  const getNextLessonId = (currentId: string): string | null => {
    const lessonOrder: Record<string, string | null> = {
      'python-basics': 'control-flow',
      'control-flow': 'loops-iteration',
      'loops-iteration': 'data-structures',
      'data-structures': 'functions',
      functions: 'object-oriented-programming',
      'object-oriented-programming': 'error-handling',
      'error-handling': 'file-operations',
      'file-operations': 'pygame-intro',
      'pygame-intro': 'first-game',
      'first-game': null, // Last lesson
    };
    return lessonOrder[currentId] || null;
  };

  const nextStep = () => {
    if (!lesson || currentStepIndex >= lesson.content.steps.length - 1) {
      // Lesson complete!
      setPixelDialogue(getRandomDialogue(pixelDialogues.lessonComplete));
      setPixelImage(pixelCelebrating);
      setShowCompletionOptions(true);
      updateProgressMutation.mutate({
        completed: true,
        currentStep: lesson?.content.steps.length || 0,
      });
      return;
    }

    const newStepIndex = currentStepIndex + 1;
    setCurrentStepIndex(newStepIndex);
    setCode(lesson.content.steps[newStepIndex].initialCode);
    setOutput('');
    setError('');
    setGradingResult(null);

    updateProgressMutation.mutate({
      currentStep: newStepIndex,
      code: lesson.content.steps[newStepIndex].initialCode,
    });
  };

  const previousStep = () => {
    if (currentStepIndex > 0) {
      const newStepIndex = currentStepIndex - 1;
      setCurrentStepIndex(newStepIndex);
      setCode(lesson?.content.steps[newStepIndex].initialCode || '');
      setOutput('');
      setError('');
      setGradingResult(null);
    }
  };

  if (pyodideError || lessonError) {
    const err = pyodideError ?? lessonError;
    const isPyodide = !!pyodideError;
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 flex items-center justify-center px-6">
        <Card className="max-w-md p-6 text-center space-y-4">
          <motion.img
            src={pixelThinking}
            alt={strings.lesson.pixelAlt.concerned}
            className="w-20 h-20 mx-auto"
          />
          <h2 className="text-lg font-semibold text-foreground">
            {isPyodide ? strings.lesson.error.pythonHeading : strings.lesson.error.lessonsHeading}
          </h2>
          <p className="text-sm text-muted-foreground">
            {err instanceof Error ? err.message : String(err)}
          </p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: isPyodide ? ['pyodide'] : ['lessons', lessonId],
              })
            }
            data-testid="button-retry-load"
          >
            {strings.lesson.error.tryAgain}
          </Button>
        </Card>
      </div>
    );
  }

  if (lessonLoading || pyodideLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 flex items-center justify-center">
        <div className="text-center">
          <motion.img
            src={pixelThinking}
            alt={strings.lesson.pixelAlt.thinking}
            className="w-20 h-20 mx-auto mb-4"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <p className="text-purple-600 dark:text-purple-400">
            {pyodideLoading ? strings.lesson.loading.pyodide : strings.lesson.loading.lesson}
          </p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    // Don't render <Header lesson={lesson!} ...> here — Header dereferences
    // lesson.order/title and the non-null assertion was hiding a guaranteed
    // undefined access from TypeScript. The friendly "Lesson not found" card
    // is enough; chrome-less is fine for a dead-end page.
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
        <div className="flex items-center justify-center h-screen">
          <Card className="p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
            <img
              src={pixelThinking}
              alt={strings.lesson.pixelAlt.confused}
              className="w-20 h-20 mx-auto mb-4"
            />
            <p className="text-center text-gray-600 dark:text-gray-400">
              {strings.lesson.notFound.message}
            </p>
            <Button
              onClick={() => setLocation('/lessons')}
              className="mt-4 w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {strings.lesson.notFound.backToLessons}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
      <Header
        lesson={lesson!}
        progress={progressPercent}
        onBack={() => setLocation('/playground')}
      />

      {/* Intro modal removed - functionality no longer available */}

      {/* Lesson Completion Modal */}
      <AnimatePresence>
        {showCompletionOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              {(() => {
                // P4.14 — split the modal into two paths so visual hierarchy
                // matches the kid's actual next step. With a next lesson:
                // "Continue" is the gradient primary, "Build Game" demotes
                // to outline (alt path), "View All" is a tertiary text link.
                // No next lesson: pivot to a celebration; the wizard
                // becomes primary, lesson index demotes to outline.
                const nextId = getNextLessonId(lessonId!);
                const hasNext = !!nextId;
                return (
                  <>
                    <div className="text-center mb-6">
                      <motion.img
                        src={pixelCelebrating}
                        alt={strings.lesson.pixelAlt.celebrating}
                        className="w-24 h-24 mx-auto mb-4"
                        animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <h2
                        data-testid="completion-heading"
                        className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                      >
                        {hasNext
                          ? strings.lesson.completion.heading
                          : strings.lesson.completion.finishedAllHeading}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {hasNext ? pixelDialogue : strings.lesson.completion.finishedAllBody}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {hasNext ? (
                        <>
                          <Button
                            data-testid="completion-primary"
                            onClick={() => {
                              if (nextId) setLocation(`/lesson/${nextId}`);
                              setShowCompletionOptions(false);
                            }}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                            size="lg"
                          >
                            <BookOpen className="w-5 h-5 mr-2" />
                            {strings.lesson.completion.continueNext}
                          </Button>
                          <Button
                            data-testid="completion-secondary"
                            onClick={() => {
                              setLocation('/wizard');
                              setShowCompletionOptions(false);
                            }}
                            variant="outline"
                            className="w-full"
                            size="lg"
                          >
                            <Rocket className="w-5 h-5 mr-2" />
                            {strings.lesson.completion.buildGame}
                          </Button>
                          <Button
                            data-testid="completion-tertiary"
                            onClick={() => {
                              setLocation('/lessons');
                              setShowCompletionOptions(false);
                            }}
                            variant="ghost"
                            className="w-full"
                          >
                            <Trophy className="w-4 h-4 mr-2" />
                            {strings.lesson.completion.viewAll}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            data-testid="completion-primary"
                            onClick={() => {
                              setLocation('/wizard');
                              setShowCompletionOptions(false);
                            }}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                            size="lg"
                          >
                            <Rocket className="w-5 h-5 mr-2" />
                            {strings.lesson.completion.buildGame}
                          </Button>
                          <Button
                            data-testid="completion-secondary"
                            onClick={() => {
                              setLocation('/lessons');
                              setShowCompletionOptions(false);
                            }}
                            variant="outline"
                            className="w-full"
                            size="lg"
                          >
                            <Trophy className="w-5 h-5 mr-2" />
                            {strings.lesson.completion.viewAll}
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar removed - navigation simplified */}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Pixel's Guidance Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-purple-200 dark:border-purple-800 p-4"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.img
                  src={pixelImage}
                  alt={strings.lesson.pixelAlt.avatar}
                  className="w-16 h-16"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    {strings.lesson.guidance.stepHeading(
                      currentStepIndex + 1,
                      currentStep?.title ?? ''
                    )}
                  </h3>
                  <motion.p
                    key={pixelDialogue}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-purple-600 dark:text-purple-400 italic"
                  >
                    {pixelDialogue}
                  </motion.p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-4">
                <div className="w-32">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {strings.lesson.guidance.progress(Math.round(progressPercent))}
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
                {currentStep?.hints && currentStep.hints.length > 0 && (
                  <Button
                    onClick={showNextHint}
                    size="sm"
                    variant="outline"
                    className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    {strings.lesson.guidance.needHint}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Main Learning Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Instructions & Code */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              {/* Step Description */}
              <Card className="mb-4 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-purple-500" />
                  {strings.lesson.guidance.whatToDo}
                </h4>
                <p className="text-gray-600 dark:text-gray-400">{currentStep?.description}</p>
              </Card>

              {/* Code Editor */}
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  code={code}
                  onChange={setCode}
                  onExecute={executeCode}
                  output={output}
                  error={error}
                  isExecuting={pyodideLoading}
                  gradingResult={gradingResult}
                  currentStep={currentStep}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => executeCode(undefined, false)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  disabled={!pythonRunner}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {strings.lesson.guidance.runCode}
                </Button>

                <Button
                  onClick={() => executeCode(undefined, true)}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  disabled={!pythonRunner || !currentStep?.tests}
                >
                  <Code2 className="w-4 h-4 mr-2" />
                  {strings.lesson.guidance.checkSolution}
                </Button>
              </div>
            </div>

            {/* Right: Output & Canvas */}
            <div className="w-1/2 flex flex-col p-4 overflow-hidden">
              {/* Game Canvas removed - output only shown in code editor */}
              <div className="flex-1 mb-4">
                <Card className="h-full p-4 bg-gray-900 text-green-400 font-mono overflow-auto">
                  <pre>{output || strings.lesson.guidance.placeholderOutput}</pre>
                  {error && <pre className="text-red-500 mt-2">{error}</pre>}
                </Card>
              </div>

              {/* Output/Error Display */}
              {(output || error) && (
                <Card
                  className={`p-4 ${error ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}
                >
                  <h4 className="font-semibold mb-2 flex items-center">
                    {error ? (
                      <>
                        <span className="text-red-600 dark:text-red-400">
                          {strings.lesson.guidance.errorOutputHeading}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-green-600 dark:text-green-400">
                          {strings.lesson.guidance.outputHeading}
                        </span>
                      </>
                    )}
                  </h4>
                  <pre className="whitespace-pre-wrap text-sm font-mono">{error || output}</pre>
                </Card>
              )}

              {/* Grading Feedback */}
              {gradingResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <FloatingFeedback
                    step={currentStep!}
                    onNextStep={handleNextStep}
                    onCompleteLesson={handleCompleteLesson}
                    onApplySolution={(solution: string) => setCode(solution)}
                    showNext={gradingResult?.passed || false}
                    isLastStep={currentStepIndex === lesson!.content.steps.length - 1}
                    gradingResult={gradingResult}
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur border-t border-purple-200 dark:border-purple-800 p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <Button
                onClick={previousStep}
                disabled={currentStepIndex === 0}
                variant="outline"
                className="bg-white/50 dark:bg-gray-800/50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {strings.lesson.guidance.previous}
              </Button>

              <div className="flex items-center gap-2">
                {lesson.content.steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentStepIndex
                        ? 'w-8 bg-purple-500'
                        : index < currentStepIndex
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              <Button
                onClick={nextStep}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {currentStepIndex === lesson.content.steps.length - 1 ? (
                  <>
                    {strings.lesson.guidance.completeLesson}
                    <Trophy className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    {strings.lesson.guidance.next}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
