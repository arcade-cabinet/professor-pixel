export async function validateRuntime(
  output: string, 
  runtimeRules: any[] | undefined, 
  input?: string
): Promise<{ passed: boolean; errors: string[] }> {
  if (!runtimeRules || runtimeRules.length === 0) {
    console.log("🔍 Runtime validation skipped: no runtimeRules");
    return { passed: true, errors: [] };
  }

  console.log("🔍 Starting runtime validation with:", { 
    output: output.substring(0, 100) + (output.length > 100 ? "..." : ""),
    runtimeRules,
    input
  });

  const errors: string[] = [];

  try {
    for (const rule of runtimeRules) {
      const ruleName = rule.rule;
      const params = rule.params || {};

      switch (ruleName) {
        case 'contains_text':
          const expectedText = params.text;
          if (!output.includes(expectedText)) {
            errors.push(`Output should contain: "${expectedText}"`);
          }
          break;

        case 'matches_pattern':
          const pattern = new RegExp(params.pattern);
          if (!pattern.test(output)) {
            errors.push(`Output should match pattern: ${params.pattern}`);
          }
          break;

        case 'has_length':
          const expectedLength = params.length;
          const actualLength = output.trim().split('\n').length;
          if (actualLength !== expectedLength) {
            errors.push(`Output should have ${expectedLength} lines, but has ${actualLength}`);
          }
          break;

        case 'is_numeric':
          const numericValue = parseFloat(output.trim());
          if (isNaN(numericValue)) {
            errors.push("Output should be a valid number");
          }
          break;

        case 'equals_value':
          const expectedValue = params.value;
          const normalizedOutput = output.trim().replace(/\s+/g, ' ');
          const normalizedExpected = String(expectedValue).trim().replace(/\s+/g, ' ');
          if (normalizedOutput !== normalizedExpected) {
            errors.push(`Expected: "${expectedValue}", but got: "${output.trim()}"`);
          }
          break;

        case 'range_check':
          const value = parseFloat(output.trim());
          const min = params.min;
          const max = params.max;
          if (isNaN(value) || value < min || value > max) {
            errors.push(`Output should be a number between ${min} and ${max}`);
          }
          break;

        default:
          console.warn(`Unknown runtime rule: ${ruleName}`);
      }
    }

    const passed = errors.length === 0;
    console.log("🔍 Runtime validation completed:", { passed, errors });
    return { passed, errors };

  } catch (error) {
    console.error("🚨 Runtime validation error:", error);
    return { 
      passed: false, 
      errors: [`Runtime validation failed: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}