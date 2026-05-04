// Export all grading functionality
export * from './types';
export * from './ast';
export * from './runtime';
export * from './engine';

// Legacy exports for backwards compatibility
export interface TestResult {
  testIndex: number;
  passed: boolean;
  expectedOutput: string;
  actualOutput: string;
  input?: string;
}

export interface GradingResult {
  passed: boolean;
  feedback: string;
  expectedOutput?: string;
  actualOutput?: string;
}

export function gradeTests(testResults: TestResult[]): GradingResult {
  const allTestsPassed = testResults.every(t => t.passed);
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
    expectedOutput: testResults[0]?.expectedOutput || "",
    actualOutput: testResults[0]?.actualOutput || ""
  };
}