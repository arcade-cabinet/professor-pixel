import { validateAst } from './ast';
import { validateRuntime } from './runtime';
import { PythonTimeoutError } from '@lib/python/worker-runner';
import type { GradeResult, GradingContext, RuleResult, TestSpec } from './types';

/**
 * Grade a step against its tests. Returns a single GradeResult with
 * - passed: true iff every rule across every test passed
 * - score: passed_rules / total_rules across all tests (0..1)
 * - partial: per-pillar (ast, runtime) RuleResult[] for rendering per-rule UI
 *
 * If the code crashed at execution, every rule short-circuits to a single
 * "syntax/runtime error" failure with the traceback in feedback.
 */
export async function gradeCode(
  context: GradingContext,
  preExecutionResult?: { output: string; error: string | null },
): Promise<GradeResult> {
  const { code, step, input, runner, pyodide } = context;

  let actualOutput: string;
  let executionError: string | null = null;

  if (preExecutionResult) {
    actualOutput = preExecutionResult.output;
    executionError = preExecutionResult.error;
  } else {
    // Step caps: take the *minimum* timeout across all rule-mode tests so a
    // single fast test doesn't get a generous cap meant for a slower one.
    const stepCaps = collectStepCaps(step.tests ?? []);
    try {
      const result = await runner.runSnippet({ code, input, ...stepCaps });
      actualOutput = result.output;
      executionError = result.error;
    } catch (err) {
      if (err instanceof PythonTimeoutError) {
        return {
          passed: false,
          score: 0,
          feedback: `Your code took too long (more than ${err.timeoutMs}ms). Look for an infinite loop or a slow algorithm.`,
          actualOutput: '',
          errors: [err.message],
          partial: { ast: [], runtime: [] },
        };
      }
      throw err;
    }
  }

  const tests = step.tests ?? [];
  const allAstOnly =
    tests.length > 0 &&
    tests.every((t) => t.mode === 'rules' && t.astRules && !t.runtimeRules);

  if (executionError && !allAstOnly) {
    // Only short-circuit when at least one test depends on runtime state.
    // AST-only steps (pygame lessons that import a package pyodide doesn't
    // ship) should still grade against the source — execution failure is
    // expected and irrelevant.
    return {
      passed: false,
      score: 0,
      feedback: `Your code has an error. Fix it before checking.\n\n${executionError}`,
      actualOutput: executionError,
      errors: [executionError],
      partial: { ast: [], runtime: [] },
    };
  }
  if (tests.length === 0) {
    return {
      passed: true,
      score: 1,
      feedback: 'Code executed successfully.',
      actualOutput,
      partial: { ast: [], runtime: [] },
    };
  }

  const astAll: RuleResult[] = [];
  const runtimeAll: RuleResult[] = [];
  let exactPasses = 0;
  let exactTotal = 0;

  for (const test of tests) {
    if (test.mode === 'rules' && (test.astRules || test.runtimeRules)) {
      const astResults = await validateAst(code, test.astRules, pyodide);
      const runtimeResults = await validateRuntime(
        actualOutput,
        test.runtimeRules,
        input,
        pyodide,
      );
      astAll.push(...astResults);
      runtimeAll.push(...runtimeResults);
    } else {
      // Legacy "match the expected output literally" path. Counts as a single
      // rule for scoring purposes.
      exactTotal += 1;
      if (matchesExpectedOutput(actualOutput, test)) exactPasses += 1;
    }
  }

  const allRules = [...astAll, ...runtimeAll];
  const totalRules = allRules.length + exactTotal;
  const passedRules = allRules.filter((r) => r.passed).length + exactPasses;
  const passed = totalRules > 0 && passedRules === totalRules;
  const score = totalRules === 0 ? 1 : passedRules / totalRules;

  return {
    passed,
    score,
    feedback: buildFeedback(passed, score, allRules, exactPasses, exactTotal, tests),
    expectedOutput: tests[0]?.expectedOutput ?? '',
    actualOutput,
    partial: { ast: astAll, runtime: runtimeAll },
  };
}

function matchesExpectedOutput(actual: string, test: TestSpec): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, ' ');
  return norm(actual) === norm(test.expectedOutput);
}

function collectStepCaps(
  tests: TestSpec[],
): { timeoutMs?: number; maxStdout?: number } {
  let timeoutMs: number | undefined;
  let maxStdout: number | undefined;
  for (const t of tests) {
    if (t.timeoutMs !== undefined) {
      timeoutMs = timeoutMs === undefined ? t.timeoutMs : Math.min(timeoutMs, t.timeoutMs);
    }
    if (t.maxStdout !== undefined) {
      maxStdout = maxStdout === undefined ? t.maxStdout : Math.min(maxStdout, t.maxStdout);
    }
  }
  return { timeoutMs, maxStdout };
}

function buildFeedback(
  passed: boolean,
  score: number,
  rules: RuleResult[],
  exactPasses: number,
  exactTotal: number,
  tests: TestSpec[],
): string {
  if (passed) return 'Perfect — your code passes every check.';

  const failed = rules.filter((r) => !r.passed);
  const exactFailed = exactTotal - exactPasses;
  const lines: string[] = [];
  const pct = Math.round(score * 100);
  lines.push(`You're ${pct}% there. Address the items below:`);
  for (const rule of failed.slice(0, 5)) {
    lines.push(`• ${rule.message}`);
  }
  if (exactFailed > 0) {
    const first = tests.find((t) => t.mode !== 'rules');
    if (first) lines.push(`• Output didn't match expected: "${first.expectedOutput}"`);
  }
  return lines.join('\n');
}

export type { GradeResult, GradingContext, RuleResult, TestSpec } from './types';
