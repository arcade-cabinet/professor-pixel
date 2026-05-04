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
): Promise<RuleResult[]> {
  if (!rules) return [];
  const results: RuleResult[] = [];

  for (const needle of rules.outputContains ?? []) {
    const ok = output.includes(needle);
    results.push({
      id: `runtime.outputContains:${needle}`,
      passed: ok,
      message: ok
        ? `Output contains "${needle}"`
        : `Output should contain "${needle}"`,
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
    const exists = pyodide ? Boolean(pyodide.globals.get(name)) : false;
    results.push({
      id: `runtime.variableExists:${name}`,
      passed: exists,
      message: exists
        ? `Variable ${name} exists`
        : `Variable ${name} should be defined`,
    });
  }

  // functionCalled is a runtime check that requires instrumentation. Without
  // a tracer, we approximate by looking for the function name in stdout (the
  // common authoring pattern is to print results from the called function).
  // The AST rule calls_method gives the structural check.
  for (const name of rules.functionCalled ?? []) {
    const ok = output.includes(name) || (pyodide ? Boolean(pyodide.globals.get(name)) : false);
    results.push({
      id: `runtime.functionCalled:${name}`,
      passed: ok,
      message: ok
        ? `${name}() appears called`
        : `Make sure ${name}() runs`,
    });
  }

  if (rules.acceptsUserInput) {
    const ok = typeof input === 'string' && input.length > 0;
    results.push({
      id: 'runtime.acceptsUserInput',
      passed: ok,
      message: ok ? 'Code accepts user input' : 'Code should accept input()',
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
