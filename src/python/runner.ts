// Define PyodideInterface locally to avoid import issues
export interface PyodideInterface {
  runPython: (code: string) => any;
  globals: {
    get: (name: string) => any;
  };
}

export interface ExecutionContext {
  code: string;
  fileName: string;
  isEducational: boolean;
  files?: { [path: string]: string };
}

export interface ExecutionResult {
  output: string;
  hasError: boolean;
  error?: {
    title: string;
    message: string;
    details: string;
    traceback: string;
    suggestions: string[];
  };
}

export interface RunnerOptions {
  executeWithEnhancedErrors?: (code: string, context: ExecutionContext) => Promise<ExecutionResult>;
  isEnhancedReady?: boolean;
}

export class PythonRunner {
  private executeWithEnhancedErrors?: (
    code: string,
    context: ExecutionContext
  ) => Promise<ExecutionResult>;
  private isEnhancedReady: boolean;

  constructor(
    private pyodide: PyodideInterface,
    options?: RunnerOptions
  ) {
    this.executeWithEnhancedErrors = options?.executeWithEnhancedErrors;
    this.isEnhancedReady = options?.isEnhancedReady || false;
  }

  setInputValues(inputValues: string) {
    try {
      if (inputValues && inputValues.trim()) {
        this.pyodide.runPython(`set_input_values_from_js("${inputValues.replace(/"/g, '\\"')}")`);
      } else {
        this.pyodide.runPython(`set_input_values_from_js("")`);
      }
    } catch (error) {
      console.warn('Failed to set input values:', error);
    }
  }

  async runSnippet({
    code,
    input,
  }: {
    code: string;
    input?: string;
  }): Promise<{ output: string; error: string }> {
    try {
      // Set input if provided
      if (input) {
        this.setInputValues(input);
      }

      // Check if enhanced error reporting is available
      if (!this.isEnhancedReady || !this.executeWithEnhancedErrors) {
        console.warn('Enhanced error reporting not ready, falling back to basic execution');
        return this.executeCodeBasic(code);
      }

      // Use enhanced error capture
      const context: ExecutionContext = {
        code,
        fileName: 'snippet.py',
        isEducational: true,
      };

      const result = await this.executeWithEnhancedErrors(code, context);

      if (result.hasError && result.error) {
        const errorText = `${result.error.title}\n\n${result.error.message}\n\n${result.error.details}`;
        return { output: '', error: errorText };
      }

      return { output: result.output || 'Code executed successfully!', error: '' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { output: '', error: errorMessage };
    }
  }

  async runProject({
    files,
    main,
    input,
    context,
  }: {
    files: Record<string, string>;
    main: string;
    input?: string;
    context?: ExecutionContext;
  }): Promise<ExecutionResult> {
    try {
      // Write files to Pyodide filesystem
      this.writeFilesToFS(files);

      // Set input if provided
      if (input) {
        this.setInputValues(input);
      }

      // Execute main file
      const mainCode = files[main];
      if (!mainCode) {
        throw new Error(`Main file '${main}' not found in project files`);
      }

      const executionContext: ExecutionContext = context || {
        code: mainCode,
        fileName: main,
        isEducational: true,
        files,
      };

      if (this.isEnhancedReady && this.executeWithEnhancedErrors) {
        return await this.executeWithEnhancedErrors(mainCode, executionContext);
      } else {
        const result = await this.executeCodeBasic(mainCode);
        return {
          output: result.output,
          hasError: !!result.error,
          error: result.error
            ? {
                title: 'Execution Error',
                message: result.error,
                details: result.error,
                traceback: result.error,
                suggestions: [],
              }
            : undefined,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        output: '',
        hasError: true,
        error: {
          title: 'Project Execution Error',
          message: errorMessage,
          details: errorMessage,
          traceback: errorMessage,
          suggestions: [],
        },
      };
    }
  }

  writeFilesToFS(files: Record<string, string>) {
    try {
      for (const [path, content] of Object.entries(files)) {
        this.pyodide.runPython(`
          import os
          os.makedirs(os.path.dirname("${path}") or ".", exist_ok=True)
          with open("${path}", "w") as f:
              f.write("""${content.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}""")
        `);
      }
    } catch (error) {
      console.warn('Failed to write files to filesystem:', error);
    }
  }

  private async executeCodeBasic(code: string): Promise<{ output: string; error: string }> {
    try {
      // Clear previous output and reset streams
      this.pyodide.runPython(
        'import sys; sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__'
      );

      // Set up output capture
      this.pyodide.runPython(`
        import sys
        import io
        sys.stdout = io.StringIO()
        sys.stderr = io.StringIO()
      `);

      // Execute the code
      this.pyodide.runPython(code);

      // Get output
      const stdout = this.pyodide.runPython('sys.stdout.getvalue()');
      const stderr = this.pyodide.runPython('sys.stderr.getvalue()');

      // Restore streams
      this.restoreStreams();

      if (stderr) {
        return { output: '', error: stderr };
      }

      return { output: stdout || 'Code executed successfully!', error: '' };
    } catch (error) {
      this.restoreStreams();
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { output: '', error: errorMessage };
    }
  }

  restoreStreams() {
    try {
      this.pyodide.runPython(
        'import sys; sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__'
      );
    } catch (error) {
      console.warn('Failed to restore streams:', error);
    }
  }
}

export function createPythonRunner(
  pyodide: PyodideInterface,
  options?: RunnerOptions
): PythonRunner {
  return new PythonRunner(pyodide, options);
}
