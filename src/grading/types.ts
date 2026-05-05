import { z } from 'zod';
import type {
  LessonAstRules,
  LessonRuntimeRules,
  LessonStep,
  LessonTestSpec,
} from '@lib/types/schema';

export type TestSpec = LessonTestSpec;
export type AstRules = LessonAstRules;
export type RuntimeRules = LessonRuntimeRules;

/**
 * Per-rule grading verdict. Schema is the canonical contract — the
 * Python-side AST validator's json.dumps output is parsed against this
 * schema before flowing into the grading engine, so a malformed but
 * JSON-valid payload (wrong types, missing fields, extra arbitrary
 * data) gets caught at the boundary instead of crashing the renderer.
 */
export const RuleResultSchema = z.object({
  /** Stable identifier for the rule, e.g. "ast.has_function:greet" */
  id: z.string(),
  passed: z.boolean(),
  /** Friendly explanation surfaced to the student. */
  message: z.string(),
});
export type RuleResult = z.infer<typeof RuleResultSchema>;
export const RuleResultArraySchema = z.array(RuleResultSchema);

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
  /**
   * Variable names to snapshot from post-execution Python globals. Drives
   * `runtimeRules.variableExists` for worker-routed lessons — main-thread
   * Pyodide doesn't share globals with the worker.
   */
  inspectGlobals?: string[];
}

export interface CodeRunner {
  runSnippet: (args: { code: string } & CodeRunnerOptions) => Promise<{
    output: string;
    error: string | null;
    /** Number of times the snippet called `input()`. Worker-only — non-worker runners may report 0. */
    inputCalls: number;
    /** Per-function call counts for any names passed in `CodeRunnerOptions.trackFunctions`. */
    functionCalls: Record<string, number>;
    /**
     * Snapshot of post-execution globals for any names passed in
     * `CodeRunnerOptions.inspectGlobals`. Variables that were never defined
     * are omitted, so consumers can use `name in globals` for existence.
     */
    globals: Record<string, unknown>;
  }>;
}

export interface GradingContext {
  code: string;
  step: LessonStep;
  input?: string;
  runner: CodeRunner;
  pyodide: PyodideInstance | null;
}
