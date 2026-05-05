import type {
  LessonAstRules,
  LessonRuntimeRules,
  LessonStep,
  LessonTestSpec,
} from '@lib/types/schema';

export type TestSpec = LessonTestSpec;
export type AstRules = LessonAstRules;
export type RuntimeRules = LessonRuntimeRules;

export interface RuleResult {
  /** Stable identifier for the rule, e.g. "ast.has_function:greet" */
  id: string;
  passed: boolean;
  /** Friendly explanation surfaced to the student. */
  message: string;
}

export interface GradeBreakdown {
  ast: RuleResult[];
  runtime: RuleResult[];
}

export interface GradeResult {
  passed: boolean;
  /** 0..1 — fraction of rules that passed across all tests in the step. */
  score: number;
  feedback: string;
  expectedOutput?: string;
  actualOutput?: string;
  errors?: string[];
  partial?: GradeBreakdown;
}

export interface TestResult {
  testIndex: number;
  passed: boolean;
  expectedOutput: string;
  actualOutput: string;
  input?: string;
}

export interface CodeRunnerOptions {
  input?: string;
  /** Per-test hard cap; the runner terminates the worker on overshoot. */
  timeoutMs?: number;
  /** Per-test stdout cap; excess is truncated. */
  maxStdout?: number;
  /** Function names to count via worker-side sys.settrace. */
  trackFunctions?: string[];
}

export interface CodeRunner {
  runSnippet: (args: { code: string } & CodeRunnerOptions) => Promise<{
    output: string;
    error: string | null;
    /** Number of times the snippet called `input()`. Worker-only — non-worker runners may report 0. */
    inputCalls: number;
    /** Per-function call counts for any names passed in `CodeRunnerOptions.trackFunctions`. */
    functionCalls: Record<string, number>;
  }>;
}

export interface GradingContext {
  code: string;
  step: LessonStep;
  input?: string;
  runner: CodeRunner;
  pyodide: PyodideInstance | null;
}
