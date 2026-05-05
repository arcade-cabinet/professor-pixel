import type { RuleResult, RuntimeRules } from './types';

/**
 * Runtime grading. Drives off the schema's LessonRuntimeRules shape:
 *   outputContains[], outputMatches, variableExists[], functionCalled[],
 *   acceptsUserInput, outputIncludesInput.
 *
 * variableExists / functionCalled require a Pyodide instance (the variables
 * live in the just-executed Python globals); the others are stdout-only.
 *
 * T5.3 caps (timeoutMs, maxStdout) live one level up in the engine —
 * runtime validation only sees output that's already been sized.
 */
export async function validateRuntime(
  output: string,
  rules: RuntimeRules | undefined,
  input: string | undefined,
  pyodide: PyodideInstance | null,
  inputCalls: number = 0,
  functionCalls: Record<string, number> = {}
): Promise<RuleResult[]> {
  if (!rules) return [];
  const results: RuleResult[] = [];

  for (const needle of rules.outputContains ?? []) {
    const ok = output.includes(needle);
    results.push({
      id: `runtime.outputContains:${needle}`,
      passed: ok,
      message: ok ? `Output contains "${needle}"` : `Output should contain "${needle}"`,
    });
  }

  if (rules.outputMatches) {
    let ok = false;
    let err: string | null = null;
    try {
      ok = new RegExp(rules.outputMatches).test(output);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
    results.push({
      id: `runtime.outputMatches`,
      passed: ok && err === null,
      message: err
        ? `Invalid pattern: ${err}`
        : ok
          ? `Output matches /${rules.outputMatches}/`
          : `Output should match /${rules.outputMatches}/`,
    });
  }

  for (const name of rules.variableExists ?? []) {
    // Use `!== undefined` so falsy Python values (0, '', False, None) still count
    // as defined. Boolean() would erroneously fail a student who set count = 0.
    const exists = pyodide ? pyodide.globals.get(name) !== undefined : false;
    results.push({
      id: `runtime.variableExists:${name}`,
      passed: exists,
      message: exists ? `Variable ${name} exists` : `Variable ${name} should be defined`,
    });
  }

  // functionCalled now uses real call counts from the worker's sys.settrace
  // tracer (engine collects every name from the step's tests and passes them
  // as `trackFunctions` to runSnippet). A function that's defined but never
  // called returns 0 here and fails the rule.
  for (const name of rules.functionCalled ?? []) {
    const count = functionCalls[name] ?? 0;
    const ok = count > 0;
    results.push({
      id: `runtime.functionCalled:${name}`,
      passed: ok,
      message: ok ? `${name}() called ${count}× ` : `Make sure ${name}() runs`,
    });
  }

  if (rules.acceptsUserInput) {
    // Real instrumentation: the worker monkey-patches builtins.input and counts
    // each call; engine threads `inputCalls` here. A test that provides input
    // but whose code never calls `input()` now fails this rule (previously it
    // passed because the legacy heuristic only checked "did the test pass input?").
    const ok = inputCalls > 0;
    results.push({
      id: 'runtime.acceptsUserInput',
      passed: ok,
      message: ok ? 'Code accepts user input' : 'Code should call input() to read user input',
    });
  }

  if (rules.outputIncludesInput) {
    const ok = typeof input === 'string' && input.length > 0 && output.includes(input);
    results.push({
      id: 'runtime.outputIncludesInput',
      passed: ok,
      message: ok ? 'Output includes the user input' : "Output should echo the user's input",
    });
  }

  return results;
}
