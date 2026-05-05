/**
 * Enhanced Python Error Handling for Pixel's PyGame Palace
 * Provides comprehensive error capture, formatting, and educational context
 */

export interface PythonError {
  type: string;
  message: string;
  traceback: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  contextLines?: string[];
  errorLine?: string;
  explanation?: string;
  suggestions?: string[];
  educational?: boolean;
}

export interface ErrorContext {
  code: string;
  fileName?: string;
  isEducational?: boolean;
  files?: { [path: string]: string }; // Map of file paths to content for multi-file projects
}

export interface FormattedError {
  title: string;
  message: string;
  details: string;
  traceback?: string;
  suggestions: string[];
  severity: 'error' | 'warning' | 'info';
  educational: boolean;
}

/**
 * Educational explanations for common Python errors
 */
const ERROR_EXPLANATIONS: Record<string, { explanation: string; suggestions: string[] }> = {
  SyntaxError: {
    explanation:
      "A syntax error means Python cannot understand your code because it doesn't follow Python's grammar rules.",
    suggestions: [
      'Check for missing colons (:) after if, for, while, or function definitions',
      'Make sure parentheses (), brackets [], and quotes are properly closed',
      'Check indentation - Python uses spaces to group code together',
      'Look for typos in keywords like "if", "for", "while", "def"',
    ],
  },
  NameError: {
    explanation:
      "A NameError occurs when you try to use a variable or function that hasn't been defined yet.",
    suggestions: [
      'Check if you spelled the variable name correctly',
      'Make sure you defined the variable before using it',
      'Check if the variable is defined in the right scope (inside/outside functions)',
      'Remember that Python is case-sensitive: "Name" and "name" are different',
    ],
  },
  TypeError: {
    explanation:
      "A TypeError happens when you try to use a value in a way that doesn't match its type.",
    suggestions: [
      "Check if you're using the right data type (string, number, list, etc.)",
      'Make sure function arguments match what the function expects',
      'Convert between types when needed (str(), int(), float())',
      "Check if you're calling a function on the right type of object",
    ],
  },
  AttributeError: {
    explanation:
      "An AttributeError occurs when you try to access a method or property that doesn't exist for that object type.",
    suggestions: [
      'Check if you spelled the method or attribute name correctly',
      "Make sure the object has the method you're trying to use",
      'Check the documentation for the correct method names',
      'Verify the object is the type you think it is',
    ],
  },
  IndexError: {
    explanation:
      "An IndexError happens when you try to access an item in a list using an index that doesn't exist.",
    suggestions: [
      'Remember that list indices start at 0, not 1',
      'Check that your index is less than len(your_list)',
      'Use len() to find out how many items are in your list',
      'Be careful with negative indices (they count from the end)',
    ],
  },
  KeyError: {
    explanation: "A KeyError occurs when you try to access a dictionary key that doesn't exist.",
    suggestions: [
      'Check if the key exists in your dictionary first',
      'Use dict.get(key, default_value) for safer access',
      "Print your dictionary keys with dict.keys() to see what's available",
      'Check for typos in your key names',
    ],
  },
  ZeroDivisionError: {
    explanation:
      'A ZeroDivisionError happens when you try to divide a number by zero, which is undefined in mathematics.',
    suggestions: [
      'Check if the denominator could be zero before dividing',
      'Use an if statement to handle the zero case specially',
      'Consider what should happen when the divisor is zero in your program',
      'Add error handling with try/except if appropriate',
    ],
  },
  ValueError: {
    explanation:
      'A ValueError occurs when a function receives an argument of the right type but with an inappropriate value.',
    suggestions: [
      'Check that numeric values are in the expected range',
      'Verify string formats match what functions expect',
      "Make sure you're converting strings to numbers correctly",
      'Check function documentation for valid input values',
    ],
  },
  IndentationError: {
    explanation:
      "An IndentationError means your code indentation doesn't follow Python's rules. Python uses indentation to group code blocks.",
    suggestions: [
      'Use consistent indentation (either 4 spaces or tabs, not mixed)',
      'Make sure code inside functions, if statements, and loops is indented',
      'Check that all lines at the same level have the same indentation',
      'Look for missing or extra indentation after colons (:)',
    ],
  },
  FileNotFoundError: {
    explanation:
      "A FileNotFoundError occurs when Python can't find a file you're trying to open or use.",
    suggestions: [
      'Check that the file name is spelled correctly',
      'Make sure the file exists in the expected location',
      'Check the file path - use forward slashes (/) or raw strings',
      'Verify file permissions allow your program to access it',
    ],
  },
};

/**
 * Extract line context around an error for better understanding
 */
function getLineContext(
  code: string,
  lineNumber: number,
  contextSize: number = 3
): {
  beforeLines: string[];
  errorLine: string;
  afterLines: string[];
  startLineNum: number;
} {
  const lines = code.split('\n');
  const errorIndex = lineNumber - 1; // Convert to 0-based index

  const startIndex = Math.max(0, errorIndex - contextSize);
  const endIndex = Math.min(lines.length - 1, errorIndex + contextSize);

  const beforeLines = lines.slice(startIndex, errorIndex);
  const errorLine = lines[errorIndex] || '';
  const afterLines = lines.slice(errorIndex + 1, endIndex + 1);

  return {
    beforeLines,
    errorLine,
    afterLines,
    startLineNum: startIndex + 1,
  };
}

/**
 * Parse Python traceback to extract structured error information with multi-file support
 */
function parseTraceback(traceback: string, context?: ErrorContext): PythonError | null {
  if (!traceback || typeof traceback !== 'string') {
    return null;
  }

  try {
    const lines = traceback.trim().split('\n');

    // Find the last line which usually contains the error type and message
    const errorLine = lines[lines.length - 1];

    // Extract error type and message
    const errorMatch = errorLine.match(/^(\w+):\s*(.*)$/);
    if (!errorMatch) {
      return {
        type: 'UnknownError',
        message: traceback,
        traceback: traceback,
      };
    }

    const [, errorType, errorMessage] = errorMatch;

    // Try to find file and line information from traceback
    let fileName: string | undefined;
    let lineNumber: number | undefined;
    let columnNumber: number | undefined;

    // Look for file and line info in traceback (find the LAST occurrence for deepest stack frame)
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      // Pattern for "  File "filename", line X"
      const fileMatch = line.match(/^\s*File\s+"([^"]+)",\s*line\s+(\d+)/);
      if (fileMatch && !fileName) {
        // Take the first match we find going backwards (deepest frame)
        fileName = fileMatch[1];
        lineNumber = parseInt(fileMatch[2]);
        break;
      }
    }

    // Handle column position for syntax errors
    for (const line of lines) {
      const columnMatch = line.match(/^\s*\^\s*$/);
      if (columnMatch && lineNumber) {
        // The ^ symbol indicates column position
        const prevLine = lines[lines.indexOf(line) - 1];
        if (prevLine) {
          columnNumber = prevLine.indexOf('^');
        }
      }
    }

    // Get educational information
    const educationalInfo = ERROR_EXPLANATIONS[errorType];

    // Smart context extraction for multi-file projects
    let contextLines: string[] | undefined;
    let errorLineText: string | undefined;
    let sourceCode = context?.code;

    if (lineNumber && fileName) {
      // Priority 1: Use files map if available (most accurate for multi-file projects)
      if (context?.files && fileName in context.files) {
        sourceCode = context.files[fileName];
        console.log(`Using direct file content for ${fileName} from files map`);
      }
      // Priority 2: For concatenated multi-file context (legacy support)
      else if (
        context?.code &&
        context.code.includes('# === File:') &&
        fileName !== '<user_code>'
      ) {
        const fileMatch = context.code.match(
          new RegExp(
            `# === File: ${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ===\\s*\\n([\\s\\S]*?)(?=\\n# === File:|$)`
          )
        );
        if (fileMatch) {
          sourceCode = fileMatch[1].trim();
          console.log(`Extracted file content for ${fileName} from concatenated context`);
        } else {
          console.warn(
            `Could not extract specific file content for ${fileName}, using full context`
          );
          sourceCode = context?.code;
        }
      }
      // Priority 3: Single file or fallback to provided code
      else if (context?.code) {
        sourceCode = context.code;
      }

      if (sourceCode) {
        const lineContext = getLineContext(sourceCode, lineNumber);
        contextLines = [
          ...lineContext.beforeLines,
          lineContext.errorLine,
          ...lineContext.afterLines,
        ];
        errorLineText = lineContext.errorLine;
      }
    }

    return {
      type: errorType,
      message: errorMessage,
      traceback: traceback,
      fileName: fileName,
      lineNumber: lineNumber,
      columnNumber: columnNumber,
      contextLines: contextLines,
      errorLine: errorLineText,
      explanation: educationalInfo?.explanation,
      suggestions: educationalInfo?.suggestions,
      educational: context?.isEducational !== false,
    };
  } catch (parseError) {
    console.error('Error parsing traceback:', parseError);
    return {
      type: 'ParseError',
      message: 'Could not parse error details',
      traceback: traceback,
    };
  }
}

/**
 * Format error for educational display with comprehensive information
 */
export function formatEducationalError(error: PythonError): FormattedError {
  const isEducational = error.educational !== false;

  // Create a clear, friendly title
  const title = isEducational ? `${error.type}: Let's fix this together! 🐛` : `${error.type}`;

  // Build the main message
  let message = error.message;
  if (error.fileName && error.lineNumber) {
    message = `In ${error.fileName}, line ${error.lineNumber}: ${message}`;
  } else if (error.lineNumber) {
    message = `Line ${error.lineNumber}: ${message}`;
  }

  // Build detailed information
  const detailParts: string[] = [];

  if (error.explanation && isEducational) {
    detailParts.push(`📚 What this means:\n${error.explanation}`);
  }

  if (error.errorLine) {
    detailParts.push(`🔍 Problem line:\n${error.errorLine.trim()}`);
  }

  if (error.contextLines && error.contextLines.length > 0 && error.lineNumber) {
    const context = getLineContext(
      error.contextLines.join('\n'),
      Math.floor(error.contextLines.length / 2) + 1,
      2
    );

    const contextDisplay = [
      ...context.beforeLines.map(
        (line, i) => `${error.lineNumber! - context.beforeLines.length + i}: ${line}`
      ),
      `${error.lineNumber}→ ${context.errorLine} ⚠️`,
      ...context.afterLines.map((line, i) => `${error.lineNumber! + i + 1}: ${line}`),
    ].join('\n');

    detailParts.push(`📍 Code context:\n${contextDisplay}`);
  }

  // Include full traceback for educational purposes - students learn from seeing complete error information
  if (isEducational && error.traceback && error.traceback.trim()) {
    detailParts.push(`🔍 Full Python Traceback (for learning):\n${error.traceback.trim()}`);
  }

  const details = detailParts.join('\n\n');

  // Get suggestions
  const suggestions = error.suggestions || [];
  if (isEducational && suggestions.length === 0) {
    suggestions.push('Double-check your code for typos and syntax');
    suggestions.push('Try running smaller parts of your code to isolate the problem');
    suggestions.push("Ask for help if you're still stuck!");
  }

  return {
    title,
    message,
    details,
    traceback: error.traceback,
    suggestions,
    severity: 'error',
    educational: isEducational,
  };
}

/**
 * Create error capture factory for Pyodide that returns enhanced error information
 * This is the core engine that the entire enhanced error reporting system depends on
 */
export function createEnhancedErrorCapture(): {
  setupErrorCapture(): boolean;
  isReadyForCapture(): boolean;
  executeWithErrorCapture(
    code: string,
    context?: ErrorContext
  ): Promise<{
    output: string;
    error: FormattedError | null;
    hasError: boolean;
  }>;
} {
  let pyodideInstance: any = null;
  let isSetup = false;

  return {
    /**
     * Set up enhanced error capture in Pyodide environment
     * This must be called with a valid pyodide instance before executing code
     * @returns true if setup was successful, false otherwise
     */
    setupErrorCapture(): boolean {
      // Get pyodide instance from global window if available
      pyodideInstance = (globalThis as any).pyodideInstance || (window as any).pyodideInstance;

      if (!pyodideInstance) {
        console.warn('Pyodide instance not found during setupErrorCapture');
        isSetup = false;
        return false;
      }

      try {
        // Install enhanced traceback capture in Python
        pyodideInstance.runPython(`
import sys
import traceback
import io

class EnhancedErrorCapture:
    def __init__(self):
        self.last_traceback = ""
        self.last_error_type = ""
        self.last_error_message = ""
        self.original_excepthook = sys.excepthook
        self.is_active = False
        
    def capture_exception(self, exc_type, exc_value, exc_traceback):
        """Enhanced exception handler that captures detailed error information"""
        # Capture the full traceback
        self.last_traceback = ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback))
        self.last_error_type = exc_type.__name__ if exc_type else "UnknownError"
        self.last_error_message = str(exc_value) if exc_value else "Unknown error"
        
        # Also call the original exception handler
        self.original_excepthook(exc_type, exc_value, exc_traceback)
    
    def get_last_error(self):
        """Get the last captured error information"""
        return {
            'traceback': self.last_traceback,
            'type': self.last_error_type,
            'message': self.last_error_message
        }
    
    def clear_error(self):
        """Clear the last error information"""
        self.last_traceback = ""
        self.last_error_type = ""
        self.last_error_message = ""
    
    def is_capture_active(self):
        """Check if enhanced error capture is active"""
        return self.is_active

# Install the enhanced error capture
__error_capture__ = EnhancedErrorCapture()
sys.excepthook = __error_capture__.capture_exception
__error_capture__.is_active = True

# Make it available to JavaScript
def get_enhanced_error_info():
    return __error_capture__.get_last_error()

def clear_enhanced_error():
    __error_capture__.clear_error()

def check_enhanced_capture_status():
    """Verify that enhanced error capture is properly installed"""
    return __error_capture__.is_capture_active()
`);

        // CRITICAL: Comprehensive verification that the setup actually worked
        console.log('🔧 Starting enhanced error capture verification...');

        // Step 1: Check if enhanced capture is active
        const isActive = pyodideInstance.runPython('check_enhanced_capture_status()');
        console.log(`📋 Enhanced capture active status: ${isActive}`);

        // Step 2: Verify sys.excepthook is properly installed
        const excepthookInstalled = pyodideInstance.runPython(`
import sys
import inspect

# Check if our custom excepthook is installed
current_hook = sys.excepthook
hook_name = getattr(current_hook, '__name__', 'unknown')
hook_qualname = getattr(current_hook, '__qualname__', 'unknown')

# Check if it's our enhanced capture method
is_enhanced_hook = hasattr(current_hook, '__self__') and hasattr(current_hook.__self__, 'last_traceback')

print(f"🔍 Current excepthook: {hook_name} ({hook_qualname})")
print(f"🔍 Is enhanced hook: {is_enhanced_hook}")

is_enhanced_hook
`);
        console.log(`🔗 Enhanced excepthook installed: ${excepthookInstalled}`);

        // Step 3: Test the error capture system with a controlled error
        const testCapture = pyodideInstance.runPython(`
# Test error capture by generating a controlled error
test_passed = False
try:
    # Clear any previous error
    __error_capture__.clear_error()
    
    # Generate a test error and capture it
    try:
        raise ValueError("Test error for verification")
    except ValueError as e:
        __error_capture__.capture_exception(type(e), e, e.__traceback__)
    
    # Check if the error was captured
    error_info = __error_capture__.get_last_error()
    if error_info['traceback'] and 'Test error for verification' in error_info['traceback']:
        test_passed = True
        print("✅ Error capture test: PASSED")
    else:
        print("❌ Error capture test: FAILED - No traceback captured")
        
    # Clear the test error
    __error_capture__.clear_error()
    
except Exception as test_err:
    print(f"❌ Error capture test: FAILED - {test_err}")

test_passed
`);
        console.log(`🧪 Error capture test result: ${testCapture}`);

        // Final verification: All checks must pass
        isSetup = Boolean(isActive && excepthookInstalled && testCapture);

        if (isSetup) {
          console.log('✅ Enhanced error capture system initialized and verified successfully');
          console.log('🎯 All verification checks passed:');
          console.log(`   - Enhanced capture active: ${isActive}`);
          console.log(`   - Custom excepthook installed: ${excepthookInstalled}`);
          console.log(`   - Error capture functionality tested: ${testCapture}`);
        } else {
          console.error('❌ Enhanced error capture setup verification failed');
          console.error('🔍 Verification results:');
          console.error(`   - Enhanced capture active: ${isActive}`);
          console.error(`   - Custom excepthook installed: ${excepthookInstalled}`);
          console.error(`   - Error capture functionality tested: ${testCapture}`);
        }

        return isSetup;
      } catch (setupError) {
        console.error('Failed to setup enhanced error capture:', setupError);
        isSetup = false;
        return false;
      }
    },

    /**
     * Check if enhanced error capture is ready and properly configured
     * @returns true if system is ready to capture enhanced errors
     */
    isReadyForCapture(): boolean {
      if (!isSetup || !pyodideInstance) {
        return false;
      }

      try {
        // Perform comprehensive health check (same as setup verification)
        const isActive = pyodideInstance.runPython('check_enhanced_capture_status()');

        // Quick excepthook verification
        const excepthookOk = pyodideInstance.runPython(`
import sys
hasattr(sys.excepthook, '__self__') and hasattr(sys.excepthook.__self__, 'last_traceback')
`);

        const systemReady = Boolean(isActive && excepthookOk);

        if (!systemReady) {
          console.warn('Enhanced error capture health check failed:', {
            isActive,
            excepthookOk,
          });
        }

        return systemReady;
      } catch (error) {
        console.warn('Failed to verify enhanced error capture status:', error);
        return false;
      }
    },

    /**
     * Execute Python code with enhanced error capture
     */
    async executeWithErrorCapture(
      code: string,
      context?: ErrorContext
    ): Promise<{
      output: string;
      error: FormattedError | null;
      hasError: boolean;
    }> {
      // Ensure pyodide instance is available
      if (!pyodideInstance) {
        pyodideInstance = (globalThis as any).pyodideInstance || (window as any).pyodideInstance;
      }

      if (!pyodideInstance) {
        return {
          output: '',
          error: {
            title: 'Python Runtime Error',
            message: 'Python environment not ready',
            details:
              'The Python runtime (Pyodide) is not initialized yet. Please wait a moment and try again.',
            suggestions: [
              'Wait for the page to fully load',
              'Refresh the page if the problem persists',
            ],
            severity: 'error',
            educational: true,
          },
          hasError: true,
        };
      }

      // Setup error capture if not already done
      if (!isSetup) {
        this.setupErrorCapture();
      }

      try {
        // Clear previous error
        pyodideInstance.runPython('clear_enhanced_error()');

        // Set up IO capture
        pyodideInstance.runPython(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);

        let stdout = '';
        let stderr = '';
        let executionError = null;

        try {
          // Enhanced Python execution with comprehensive error handling
          pyodideInstance.runPython(`
try:
    # Compile the code first to catch SyntaxErrors
    compiled_code = compile("""${code.replace(/"/g, '\\"').replace(/\n/g, '\\n')}""", '<user_code>', 'exec')
    # Execute the compiled code
    exec(compiled_code)
except SyntaxError as e:
    # Handle compile-time syntax errors
    import traceback
    __error_capture__.capture_exception(type(e), e, e.__traceback__)
except Exception as e:
    # Handle runtime errors  
    import traceback
    __error_capture__.capture_exception(type(e), e, e.__traceback__)
`);
        } catch (jsError) {
          // JavaScript-level execution error - get Python error info if available
          executionError = jsError;
        }

        // Always get output and error info
        stdout = pyodideInstance.runPython('sys.stdout.getvalue()');
        stderr = pyodideInstance.runPython('sys.stderr.getvalue()');
        const errorInfo = pyodideInstance.runPython('get_enhanced_error_info()').toJs();

        // Check if we have any error information
        if (
          (errorInfo.traceback && errorInfo.traceback.trim()) ||
          (stderr && stderr.trim()) ||
          executionError
        ) {
          let pythonError: PythonError;

          if (errorInfo.traceback && errorInfo.traceback.trim()) {
            // Use enhanced error capture info (most reliable)
            pythonError = parseTraceback(errorInfo.traceback, context) || {
              type: errorInfo.type || 'UnknownError',
              message: errorInfo.message || 'Unknown error',
              traceback: errorInfo.traceback,
              educational: context?.isEducational !== false,
            };
          } else if (stderr && stderr.trim()) {
            // Fallback to stderr parsing
            pythonError = parseTraceback(stderr, context) || {
              type: 'RuntimeError',
              message: stderr,
              traceback: stderr,
              educational: context?.isEducational !== false,
            };
          } else if (executionError) {
            // JavaScript-level error
            const errorMessage =
              executionError instanceof Error ? executionError.message : String(executionError);
            pythonError = parseTraceback(errorMessage, context) || {
              type: 'SyntaxError',
              message: errorMessage,
              traceback: errorMessage,
              educational: context?.isEducational !== false,
            };
          } else {
            // Fallback error
            pythonError = {
              type: 'UnknownError',
              message: 'An unknown error occurred',
              traceback: 'Unknown error',
              educational: context?.isEducational !== false,
            };
          }

          const formattedError = formatEducationalError(pythonError);

          return {
            output: stdout || '',
            error: formattedError,
            hasError: true,
          };
        }

        return {
          output: stdout || 'Code executed successfully!',
          error: null,
          hasError: false,
        };
      } catch (jsError) {
        // Critical error in error handling itself
        console.error('Critical error in enhanced error capture:', jsError);
        const errorMessage = jsError instanceof Error ? jsError.message : String(jsError);

        const pythonError: PythonError = {
          type: 'CriticalError',
          message: 'Error in enhanced error handling: ' + errorMessage,
          traceback: errorMessage,
          educational: context?.isEducational !== false,
        };

        const formattedError = formatEducationalError(pythonError);

        return {
          output: '',
          error: formattedError,
          hasError: true,
        };
      }
    },
  };
}

/**
 * Legacy function for backward compatibility - will be deprecated
 */
export function createEnhancedErrorCaptureWithPyodide(pyodide: any, context?: ErrorContext) {
  return {
    /**
     * Set up enhanced error capture in Pyodide environment
     */
    setupErrorCapture(): void {
      if (!pyodide) return;

      // Install enhanced traceback capture in Python
      pyodide.runPython(`
import sys
import traceback
import io

class EnhancedErrorCapture:
    def __init__(self):
        self.last_traceback = ""
        self.last_error_type = ""
        self.last_error_message = ""
        self.original_excepthook = sys.excepthook
        
    def capture_exception(self, exc_type, exc_value, exc_traceback):
        """Enhanced exception handler that captures detailed error information"""
        # Capture the full traceback
        self.last_traceback = ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback))
        self.last_error_type = exc_type.__name__ if exc_type else "UnknownError"
        self.last_error_message = str(exc_value) if exc_value else "Unknown error"
        
        # Also call the original exception handler
        self.original_excepthook(exc_type, exc_value, exc_traceback)
    
    def get_last_error(self):
        """Get the last captured error information"""
        return {
            'traceback': self.last_traceback,
            'type': self.last_error_type,
            'message': self.last_error_message
        }
    
    def clear_error(self):
        """Clear the last error information"""
        self.last_traceback = ""
        self.last_error_type = ""
        self.last_error_message = ""

# Install the enhanced error capture
__error_capture__ = EnhancedErrorCapture()
sys.excepthook = __error_capture__.capture_exception

# Make it available to JavaScript
def get_enhanced_error_info():
    return __error_capture__.get_last_error()

def clear_enhanced_error():
    __error_capture__.clear_error()
`);
    },

    /**
     * Execute Python code with enhanced error capture
     */
    async executeWithErrorCapture(
      code: string,
      context?: ErrorContext
    ): Promise<{
      output: string;
      error: FormattedError | null;
      hasError: boolean;
    }> {
      if (!pyodide) {
        return {
          output: '',
          error: {
            title: 'Python Runtime Error',
            message: 'Python environment not ready',
            details:
              'The Python runtime (Pyodide) is not initialized yet. Please wait a moment and try again.',
            suggestions: [
              'Wait for the page to fully load',
              'Refresh the page if the problem persists',
            ],
            severity: 'error',
            educational: true,
          },
          hasError: true,
        };
      }

      try {
        // Clear previous error
        pyodide.runPython('clear_enhanced_error()');

        // Set up IO capture
        pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);

        let stdout = '';
        let stderr = '';
        let executionError = null;

        try {
          // Enhanced Python execution with comprehensive error handling
          pyodide.runPython(`
try:
    # Compile the code first to catch SyntaxErrors
    compiled_code = compile("""${code.replace(/"/g, '\\"').replace(/\n/g, '\\n')}""", '<user_code>', 'exec')
    # Execute the compiled code
    exec(compiled_code)
except SyntaxError as e:
    # Handle compile-time syntax errors
    import traceback
    __error_capture__.capture_exception(type(e), e, e.__traceback__)
except Exception as e:
    # Handle runtime errors  
    import traceback
    __error_capture__.capture_exception(type(e), e, e.__traceback__)
`);
        } catch (jsError) {
          // JavaScript-level execution error - get Python error info if available
          executionError = jsError;
        }

        // Always get output and error info
        stdout = pyodide.runPython('sys.stdout.getvalue()');
        stderr = pyodide.runPython('sys.stderr.getvalue()');
        const errorInfo = pyodide.runPython('get_enhanced_error_info()').toJs();

        // Check if we have any error information
        if (
          (errorInfo.traceback && errorInfo.traceback.trim()) ||
          (stderr && stderr.trim()) ||
          executionError
        ) {
          let pythonError: PythonError;

          if (errorInfo.traceback && errorInfo.traceback.trim()) {
            // Use enhanced error capture info (most reliable)
            pythonError = parseTraceback(errorInfo.traceback, context) || {
              type: errorInfo.type || 'UnknownError',
              message: errorInfo.message || 'Unknown error',
              traceback: errorInfo.traceback,
              educational: context?.isEducational !== false,
            };
          } else if (stderr && stderr.trim()) {
            // Fallback to stderr parsing
            pythonError = parseTraceback(stderr, context) || {
              type: 'RuntimeError',
              message: stderr,
              traceback: stderr,
              educational: context?.isEducational !== false,
            };
          } else if (executionError) {
            // JavaScript-level error
            const errorMessage =
              executionError instanceof Error ? executionError.message : String(executionError);
            pythonError = parseTraceback(errorMessage, context) || {
              type: 'SyntaxError',
              message: errorMessage,
              traceback: errorMessage,
              educational: context?.isEducational !== false,
            };
          } else {
            // Fallback error
            pythonError = {
              type: 'UnknownError',
              message: 'An unknown error occurred',
              traceback: 'Unknown error',
              educational: context?.isEducational !== false,
            };
          }

          const formattedError = formatEducationalError(pythonError);

          return {
            output: stdout || '',
            error: formattedError,
            hasError: true,
          };
        }

        return {
          output: stdout || 'Code executed successfully!',
          error: null,
          hasError: false,
        };
      } catch (jsError) {
        // Critical error in error handling itself
        console.error('Critical error in enhanced error capture:', jsError);
        const errorMessage = jsError instanceof Error ? jsError.message : String(jsError);

        const pythonError: PythonError = {
          type: 'CriticalError',
          message: 'Error in enhanced error handling: ' + errorMessage,
          traceback: errorMessage,
          educational: context?.isEducational !== false,
        };

        const formattedError = formatEducationalError(pythonError);

        return {
          output: '',
          error: formattedError,
          hasError: true,
        };
      }
    },
  };
}

/**
 * Quick helper for basic error formatting without full capture setup
 */
export function quickFormatError(errorText: string, context?: ErrorContext): FormattedError {
  const pythonError = parseTraceback(errorText, context) || {
    type: 'UnknownError',
    message: errorText,
    traceback: errorText,
  };

  return formatEducationalError(pythonError);
}

/**
 * Helper to determine if an error is likely a beginner mistake
 */
export function isBeginnerError(errorType: string): boolean {
  const beginnerErrorTypes = [
    'SyntaxError',
    'NameError',
    'IndentationError',
    'TypeError',
    'AttributeError',
    'IndexError',
    'KeyError',
  ];
  return beginnerErrorTypes.includes(errorType);
}

/**
 * Generate encouraging message for students based on error type
 */
export function getEncouragingMessage(errorType: string): string {
  const messages = {
    SyntaxError:
      "Don't worry! Syntax errors are very common when learning Python. Every programmer makes them! 🐍",
    NameError:
      'This is a great learning opportunity! Variable naming is an important skill in programming. 💪',
    TypeError:
      "Type errors help you understand Python's type system better. This is valuable learning! 🎯",
    AttributeError:
      "Understanding object methods takes practice. You're building important programming skills! 🔧",
    IndexError: "List indexing can be tricky at first. With practice, you'll master it! 📋",
    KeyError:
      'Dictionary key errors are common. Learning to handle them makes you a better programmer! 🗝️',
    IndentationError:
      "Python's indentation rules can seem strict, but they make code more readable! 📐",
    default: "Every error is a learning opportunity! You're on the right track. Keep coding! 🚀",
  };

  return messages[errorType as keyof typeof messages] || messages['default'];
}
