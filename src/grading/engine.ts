import { validateAst } from './ast';
import { validateRuntime } from './runtime';
import type { GradeResult, GradingContext, TestSpec } from './types';

export async function gradeCode(context: GradingContext, preExecutionResult?: { output: string; error: string }): Promise<GradeResult> {
  const { code, step, input, runner, pyodide } = context;

  console.log("🎯 Starting grading for step:", step?.id);

  try {
    let actualOutput: string;
    let executionError: string | null = null;

    // Use pre-execution result if provided to avoid double execution
    if (preExecutionResult) {
      if (preExecutionResult.error) {
        return {
          passed: false,
          feedback: `🐛 Your code has an error. Please fix it before checking.\n\nError: ${preExecutionResult.error}`,
          actualOutput: preExecutionResult.error,
          errors: [preExecutionResult.error]
        };
      }
      actualOutput = preExecutionResult.output;
    } else {
      // Execute code to get output (fallback if no pre-execution result)
      const executionResult = await runner.runSnippet({ 
        code, 
        input 
      });

      if (executionResult.error) {
        return {
          passed: false,
          feedback: `🐛 Your code has an error. Please fix it before checking.\n\nError: ${executionResult.error}`,
          actualOutput: executionResult.error,
          errors: [executionResult.error]
        };
      }

      actualOutput = executionResult.output;
    }

    // Check if step has tests
    if (!step.tests || step.tests.length === 0) {
      return {
        passed: true,
        feedback: "✅ Code executed successfully!",
        actualOutput
      };
    }

    // Grade each test
    const testResults = [];
    let allTestsPassed = true;

    for (let i = 0; i < step.tests.length; i++) {
      const test: TestSpec = step.tests[i];
      
      // Check if this test uses rule-based grading
      if (test.mode === 'rules' && (test.astRules || test.runtimeRules)) {
        const gradeResult = await gradeWithRules(code, test, actualOutput, pyodide, input);
        testResults.push({
          testIndex: i,
          passed: gradeResult.passed,
          expectedOutput: test.expectedOutput,
          actualOutput,
          input: test.input
        });
        
        if (!gradeResult.passed) {
          allTestsPassed = false;
        }
      } else {
        // Use traditional exact output matching
        const expectedNormalized = test.expectedOutput.trim().replace(/\s+/g, ' ');
        const actualNormalized = actualOutput.trim().replace(/\s+/g, ' ');
        const testPassed = actualNormalized === expectedNormalized;
        
        testResults.push({
          testIndex: i,
          passed: testPassed,
          expectedOutput: test.expectedOutput,
          actualOutput,
          input: test.input
        });
        
        if (!testPassed) {
          allTestsPassed = false;
        }
      }
    }

    // Generate feedback based on test results
    let feedback = "";
    if (allTestsPassed) {
      feedback = "✅ Perfect! Your code passes all tests.";
    } else {
      const failedTests = testResults.filter(t => !t.passed);
      if (failedTests.length === 1) {
        feedback = `❌ Test failed. Expected: "${failedTests[0].expectedOutput}" but got: "${failedTests[0].actualOutput}"`;
      } else {
        feedback = `❌ ${failedTests.length} out of ${testResults.length} tests failed. Check the expected output carefully.`;
      }
    }

    return {
      passed: allTestsPassed,
      feedback,
      expectedOutput: step.tests[0]?.expectedOutput || "",
      actualOutput
    };

  } catch (error) {
    console.error("🚨 Grading error:", error);
    return {
      passed: false,
      feedback: `Grading failed: ${error instanceof Error ? error.message : String(error)}`,
      actualOutput: "",
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

async function gradeWithRules(
  code: string, 
  test: TestSpec, 
  actualOutput: string, 
  pyodide: any, 
  input?: string
): Promise<{ passed: boolean; feedback: string }> {
  try {
    console.log("🔍 Grading with rules:", { astRules: test.astRules, runtimeRules: test.runtimeRules });

    // Validate AST if rules provided
    let astResult = { passed: true, errors: [] as string[] };
    if (test.astRules && test.astRules.length > 0) {
      astResult = await validateAst(code, test.astRules, pyodide);
    }

    // Validate runtime if rules provided
    let runtimeResult = { passed: true, errors: [] as string[] };
    if (test.runtimeRules && test.runtimeRules.length > 0) {
      runtimeResult = await validateRuntime(actualOutput, test.runtimeRules, input);
    }

    const overallPassed = astResult.passed && runtimeResult.passed;
    const allErrors = [...astResult.errors, ...runtimeResult.errors];

    let feedback = "";
    if (overallPassed) {
      feedback = "✅ Perfect! Your code meets all requirements.";
    } else {
      feedback = `❌ Your code needs some improvements:\n${allErrors.map(error => `• ${error}`).join('\n')}`;
    }

    console.log("🎯 Rule-based grading result:", { passed: overallPassed, feedback });
    return { passed: overallPassed, feedback };

  } catch (error) {
    console.error("🚨 Rule-based grading error:", error);
    return {
      passed: false,
      feedback: `Rule validation failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}