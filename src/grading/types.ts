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

export interface CodeRunner {
  runSnippet: (args: { code: string; input?: string }) => Promise<{
    output: string;
    error: string | null;
  }>;
}

export interface GradingContext {
  code: string;
  step: LessonStep;
  input?: string;
  runner: CodeRunner;
  pyodide: PyodideInstance | null;
}
