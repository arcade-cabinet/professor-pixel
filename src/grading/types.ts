export interface TestSpec {
  expectedOutput: string;
  input?: string;
  mode?: 'rules' | 'output';
  astRules?: any[];
  runtimeRules?: any[];
}

export interface RuleBasedSpec {
  astRules?: any[];
  runtimeRules?: any[];
}

export interface GradeResult {
  passed: boolean;
  feedback: string;
  expectedOutput?: string;
  actualOutput?: string;
  errors?: string[];
  details?: {
    astResult?: { passed: boolean; errors: string[] };
    runtimeResult?: { passed: boolean; errors: string[] };
  };
}

export interface TestResult {
  testIndex: number;
  passed: boolean;
  expectedOutput: string;
  actualOutput: string;
  input?: string;
}

export interface GradingContext {
  code: string;
  step: any;
  input?: string;
  runner: any;
  pyodide: any;
}