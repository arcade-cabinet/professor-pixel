import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Play, RotateCcw, Keyboard, CheckCircle2, Target } from 'lucide-react';
import { cn } from '@lib/utils/cn';

// Monaco Editor types — a minimal surface of the editor instance API we
// actually consume. Full Monaco types would require @types/monaco-editor as a
// runtime peer; we only need create() + getValue() + onDidChangeModelContent()
// + dispose().
interface MonacoEditorInstance {
  getValue(): string;
  setValue(value: string): void;
  onDidChangeModelContent(handler: () => void): { dispose: () => void };
  dispose(): void;
  focus(): void;
  getAction(id: string): { run: () => void } | null;
  addCommand(keybinding: number, handler: () => void): void;
}

interface MonacoNamespace {
  editor: {
    create(container: HTMLElement, options: Record<string, unknown>): MonacoEditorInstance;
  };
  KeyMod: { CtrlCmd: number; Shift: number; Alt: number };
  KeyCode: { Enter: number; KeyR: number; [key: string]: number };
}

interface AmdRequire {
  (deps: string[], cb: () => void): void;
  config(opts: { paths: Record<string, string> }): void;
}

declare global {
  interface Window {
    monaco: MonacoNamespace;
    require: AmdRequire;
  }
}

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onExecute: (inputValues?: string, runAutoGrading?: boolean) => void;
  output: string;
  error: string;
  isExecuting: boolean;
  gradingResult?: {
    passed: boolean;
    feedback: string;
    expectedOutput?: string;
    actualOutput?: string;
  } | null;
  currentStep?: {
    id: string;
    title: string;
    description: string;
    /**
     * P4.21 — Reset Code button restores this string to the editor.
     * When present, the Reset button appears with a confirm prompt;
     * when absent (e.g. wizard-side editor), the button is hidden so
     * we don't offer a useless "reset to empty" action.
     */
    initialCode?: string;
    tests?: Array<{
      input?: string;
      expectedOutput: string;
      description?: string;
    }>;
  };
}

export default function CodeEditor({
  code,
  onChange,
  onExecute,
  output,
  error,
  isExecuting,
  gradingResult,
  currentStep,
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<MonacoEditorInstance | null>(null);
  const scriptLoadedRef = useRef<boolean>(false);
  // Phone-keyboard reflow: when iOS / Android opens the soft keyboard,
  // window.innerHeight stays constant but window.visualViewport.height
  // shrinks by the keyboard's pixel height. Without compensation, the
  // bottom of Monaco (where the kid is typing) hides *behind* the
  // keyboard.
  //
  // We shrink the wrapper's max-height by the keyboard inset rather than
  // padding-bottom on a mid-tree flex wrapper — the prior padding-bottom
  // approach pushed the wrapper *taller*, growing the page rather than
  // lifting Monaco above the keyboard. max-height shrinks the wrapper's
  // own height and the flex-1 Monaco container shrinks with it,
  // compressing the editor into the visible viewport. We also call
  // scrollIntoView on the editor on first inset so the kid's caret
  // lands in view rather than below it.
  //
  // Layout-height reference is documentElement.clientHeight (stable)
  // rather than window.innerHeight (changes with iOS Safari URL-bar
  // collapse, producing a wrong inset during URL-bar transitions).
  // Both inset (keyboard pixel height) and layoutHeight (the stable
  // clientHeight reference) are snapshotted into state from the effect.
  // Reading clientHeight inside render would couple layout-read to a
  // non-hook position and rely on jsdom's defineProperty support during
  // tests; sourcing it from the effect keeps all DOM reads inside the
  // browser-guarded code path.
  const [viewportState, setViewportState] = useState<{ inset: number; layoutHeight: number }>({
    inset: 0,
    layoutHeight: 0,
  });
  const keyboardInset = viewportState.inset;

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : undefined;
    if (!vv) return;
    const update = () => {
      // offsetTop accounts for split-keyboard / accessory-bar cases on iOS
      // where the visible viewport is offset from the layout viewport top.
      const layoutHeight = document.documentElement.clientHeight;
      const inset = Math.max(0, layoutHeight - vv.height - vv.offsetTop);
      // Functional setState with equality check suppresses redundant
      // re-renders during normal page-scroll bursts on iOS, where vv.scroll
      // fires every frame while the keyboard is up.
      setViewportState((prev) =>
        prev.inset === inset && prev.layoutHeight === layoutHeight ? prev : { inset, layoutHeight }
      );
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  // Bring the editor into view ONCE, when the keyboard first opens
  // (transition from 0 → non-zero). Without the transition guard, every
  // change in the inset value (which shifts mid-session as iOS scrolls
  // the focused viewport) would re-fire scrollIntoView and fight the
  // user's mid-scroll gesture. Tracking the previous value via a ref
  // distinguishes "keyboard just opened" from "keyboard still open,
  // viewport reflowed."
  const prevInsetRef = useRef(0);
  useEffect(() => {
    const justOpened = prevInsetRef.current === 0 && keyboardInset > 0;
    prevInsetRef.current = keyboardInset;
    if (!justOpened) return;
    const t = window.setTimeout(() => {
      editorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 50);
    return () => window.clearTimeout(t);
  }, [keyboardInset]);
  const [inputValues, setInputValues] = useState('');

  useEffect(() => {
    // Prevent multiple script loads
    if (scriptLoadedRef.current || window.monaco) {
      return;
    }

    // Load Monaco Editor
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js';
    script.onload = () => {
      scriptLoadedRef.current = true;
      try {
        window.require.config({
          paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' },
        });
        window.require(['vs/editor/editor.main'], () => {
          if (!editorRef.current || monacoEditorRef.current) {
            return;
          }
          try {
            monacoEditorRef.current = window.monaco.editor.create(editorRef.current, {
              value: code || '',
              language: 'python',
              theme: 'vs-dark',
              fontSize: 18,
              lineHeight: 26,
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              fontWeight: '400',
              letterSpacing: 0.5,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              lineNumbers: 'on',
              glyphMargin: false,
              folding: false,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
              renderLineHighlight: 'line',
              selectOnLineNumbers: true,
              cursorBlinking: 'solid',
              contextmenu: false,
              wordWrap: 'off',
              quickSuggestions: false,
              parameterHints: { enabled: false },
              suggestOnTriggerCharacters: false,
              acceptSuggestionOnEnter: 'off',
              tabCompletion: 'off',
              snippetSuggestions: 'none',
              padding: { top: 16, bottom: 16 },
            });
          } catch (err) {
            console.error('Error creating Monaco editor:', err);
            return;
          }

          // Listen to changes with error handling
          monacoEditorRef.current.onDidChangeModelContent(() => {
            try {
              const value = monacoEditorRef.current?.getValue() || '';
              if (typeof onChange === 'function') {
                onChange(value);
              }
            } catch (err) {
              console.error('Error in Monaco editor onChange:', err);
            }
          });

          // Handle keyboard shortcuts with error handling
          try {
            monacoEditorRef.current.addCommand(
              window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter,
              () => {
                if (typeof onExecute === 'function') {
                  onExecute(inputValues);
                }
              }
            );
          } catch (err) {
            console.error('Error adding keyboard shortcut:', err);
          }
        });
      } catch (err) {
        console.error('Error loading Monaco:', err);
      }
    };

    script.onerror = () => {
      console.error('Failed to load Monaco Editor script');
    };

    document.head.appendChild(script);

    return () => {
      if (monacoEditorRef.current) {
        try {
          monacoEditorRef.current.dispose();
          monacoEditorRef.current = null;
        } catch (err) {
          console.error('Error disposing Monaco editor:', err);
        }
      }
    };
  }, [onExecute, onChange, inputValues, code]); // Empty dependency array is intentional - we only want to load Monaco once

  useEffect(() => {
    try {
      if (monacoEditorRef.current && monacoEditorRef.current.getValue() !== code) {
        monacoEditorRef.current.setValue(code || '');
      }
    } catch (err) {
      console.error('Error updating Monaco editor value:', err);
    }
  }, [code]);

  // P4.21 — Reset to the step's starter code with a confirm prompt.
  // The previous behaviour cleared the editor to empty, which was both
  // useless (the kid's actual goal is "go back to where I started this
  // step") and silently destructive (no undo). Now: confirm modal,
  // then restore from currentStep.initialCode. Hidden entirely when
  // there's no initialCode to restore (wizard editor, future contexts).
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const canReset = typeof currentStep?.initialCode === 'string';
  const resetCode = () => {
    if (!canReset) return;
    setShowResetConfirm(true);
  };
  const confirmReset = () => {
    try {
      if (typeof onChange === 'function' && currentStep?.initialCode != null) {
        onChange(currentStep.initialCode);
      }
    } catch (err) {
      console.error('Error resetting code:', err);
    } finally {
      setShowResetConfirm(false);
    }
  };

  return (
    <div
      className="w-full md:w-1/2 flex flex-col"
      // While the soft keyboard is up, cap the wrapper's effective height
      // to the visible viewport so the flex-1 Monaco container shrinks
      // and stays within the kid's view. Without the cap, the wrapper
      // keeps its original height and the editor extends behind the
      // keyboard.
      //
      // Use document.documentElement.clientHeight (px) - keyboardInset (px)
      // rather than calc(100dvh - Xpx). The inset is computed against
      // clientHeight (line ~108), so mixing dvh — which tracks
      // window.innerHeight after the iOS URL-bar settles — would put the
      // cap baseline and the inset reference in different coordinate
      // systems. During a URL-bar transition that mismatch produces a
      // wrong effective height. Same-units math avoids the issue.
      style={
        viewportState.inset > 0
          ? {
              maxHeight: `${viewportState.layoutHeight - viewportState.inset}px`,
              overflow: 'hidden',
            }
          : undefined
      }
      data-testid="code-editor-wrapper"
    >
      <div className="code-editor-header">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <h3 className="text-xl sm:text-2xl font-bold">Code Editor</h3>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button
              onClick={() => onExecute(inputValues, false)}
              disabled={isExecuting}
              variant="secondary"
              className="min-h-[44px] sm:min-h-[48px] px-3 sm:px-5 text-sm sm:text-base font-medium bg-secondary text-secondary-foreground hover:bg-secondary/90 flex items-center gap-2"
              data-testid="button-run-code"
            >
              <Play className="h-5 w-5" />
              <span className="font-semibold">{isExecuting ? 'Running...' : 'Run Code'}</span>
            </Button>
            <Button
              onClick={() => onExecute(inputValues, true)}
              disabled={isExecuting}
              className="btn-primary flex items-center gap-2 min-h-[44px] sm:min-h-[48px] px-3 sm:px-5 text-sm sm:text-base"
              data-testid="button-run-check"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-base font-semibold">
                {isExecuting ? 'Checking...' : 'Run & Check'}
              </span>
            </Button>
            {canReset && (
              <Button
                onClick={resetCode}
                variant="secondary"
                className="min-h-[44px] sm:min-h-[48px] px-3 sm:px-5 text-sm sm:text-base font-medium bg-amber-500 text-gray-900 hover:bg-amber-400"
                data-testid="button-reset-code"
                aria-label="Reset code to starter"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Step Instructions */}
        {currentStep && (
          <div className="mb-6 p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/30 shadow-lg">
            <h4 className="text-xl font-bold text-primary mb-3">{currentStep.title}</h4>
            <p className="text-foreground/80 text-lg leading-relaxed">{currentStep.description}</p>
          </div>
        )}

        {/* Enhanced Expected Output */}
        {currentStep && currentStep.tests && currentStep.tests.length > 0 && (
          <div className="mb-6 p-6 bg-gradient-to-br from-success/15 to-success/5 rounded-xl border-2 border-success/40 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-6 w-6 text-success" />
              <h4 className="text-xl font-bold text-success">Expected Output:</h4>
            </div>
            <pre className="text-success/90 text-lg font-mono bg-success/10 p-4 rounded-lg border border-success/20">
              {currentStep.tests[0].expectedOutput}
            </pre>
            {currentStep.tests[0].input && (
              <p className="text-success/80 text-base mt-3 font-medium">
                📝 Input provided:{' '}
                <span className="font-mono bg-success/10 px-2 py-1 rounded">
                  {currentStep.tests[0].input}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Enhanced Input Values Control */}
        <div className="bg-gradient-to-r from-secondary/10 to-secondary/5 p-4 rounded-xl border border-secondary/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-secondary" />
              <Label
                htmlFor="input-values"
                className="text-lg font-semibold text-secondary whitespace-nowrap"
              >
                Input Values:
              </Label>
            </div>
            <Input
              id="input-values"
              value={inputValues}
              onChange={(e) => setInputValues(e.target.value)}
              placeholder="John, 25, Python (comma-separated for multiple input() calls)"
              className="flex-1 text-lg border-2 border-secondary/40 focus:border-secondary"
              data-testid="input-values"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div ref={editorRef} className="flex-1 min-h-0" data-testid="code-editor" />

        {/* Enhanced Console/Output Area */}
        <div className="bg-card border-t-2 border-border">
          <div className="console-header">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-bold">Console Output</h4>
            </div>
          </div>
          <div className="console-output h-52 overflow-auto">
            {gradingResult ? (
              <div
                className={cn('p-4', gradingResult.passed ? 'console-success' : 'console-error')}
                data-testid="grading-result"
              >
                <div className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <span className="text-2xl">{gradingResult.passed ? '✅' : '❌'}</span>
                  <span>{gradingResult.passed ? 'Test Passed!' : 'Test Failed'}</span>
                </div>
                <div className="whitespace-pre-wrap text-base leading-relaxed mb-3">
                  {gradingResult.feedback}
                </div>
                {gradingResult.expectedOutput && gradingResult.actualOutput && (
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Expected:</div>
                      <div className="text-green-300 bg-green-900/30 p-2 rounded font-mono text-sm">
                        {gradingResult.expectedOutput}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Your Output:</div>
                      <div
                        className={cn(
                          'p-2 rounded font-mono text-sm',
                          gradingResult.passed
                            ? 'text-green-300 bg-green-900/30'
                            : 'text-red-300 bg-red-900/30'
                        )}
                      >
                        {gradingResult.actualOutput}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : error ? (
              <div className="console-error" data-testid="console-error">
                <div className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <span className="text-2xl">✗</span> Error:
                </div>
                <div className="whitespace-pre-wrap text-base leading-relaxed">{error}</div>
              </div>
            ) : output ? (
              <div className="console-success" data-testid="console-output">
                <div className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <span className="text-2xl">✓</span> Success:
                </div>
                <div className="text-gray-300 whitespace-pre-wrap text-base leading-relaxed">
                  {output}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-base" data-testid="console-ready">
                <div className="text-lg font-medium mb-1">Ready to run code</div>
                <div className="text-sm opacity-80">Press Ctrl+Enter or click Run Code</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* P4.21 — Reset confirmation. Inline alertdialog rather than
          window.confirm so the styling matches the rest of the app
          and so it doesn't hang Mobile Safari. */}
      {showResetConfirm && (
        <div
          role="alertdialog"
          aria-labelledby="reset-confirm-title"
          aria-describedby="reset-confirm-body"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-testid="reset-confirm-dialog"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3
              id="reset-confirm-title"
              className="text-lg font-bold text-gray-900 dark:text-gray-100"
            >
              Reset your code?
            </h3>
            <p id="reset-confirm-body" className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              This puts the starter code back. Anything you've written in this step will be erased.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(false)}
                data-testid="reset-cancel"
              >
                Keep my code
              </Button>
              <Button variant="destructive" onClick={confirmReset} data-testid="reset-confirm">
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
