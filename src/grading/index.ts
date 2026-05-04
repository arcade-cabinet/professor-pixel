export * from './types';
export * from './ast';
export * from './runtime';
export * from './engine';

import type { TestResult } from './types';

export interface GradingResult {
  passed: boolean;
  feedback: string;
  expectedOutput?: string;
  actualOutput?: string;
}

/** Legacy aggregator for callers that pre-compute TestResult[] without the engine. */
export function gradeTests(testResults: TestResult[]): GradingResult {
  const allPassed = testResults.every((t) => t.passed);
  if (allPassed) {
    return {
      passed: true,
      feedback: 'Perfect — your code passes every test.',
      expectedOutput: testResults[0]?.expectedOutput ?? '',
      actualOutput: testResults[0]?.actualOutput ?? '',
    };
  }
  const failed = testResults.filter((t) => !t.passed);
  const feedback =
    failed.length === 1
      ? `Test failed. Expected: "${failed[0].expectedOutput}" but got: "${failed[0].actualOutput}"`
      : `${failed.length} of ${testResults.length} tests failed.`;
  return {
    passed: false,
    feedback,
    expectedOutput: testResults[0]?.expectedOutput ?? '',
    actualOutput: testResults[0]?.actualOutput ?? '',
  };
}
