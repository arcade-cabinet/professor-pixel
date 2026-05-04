import { Component, ReactNode, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  RefreshCw, 
  Home, 
  Bug, 
  BookOpen, 
  AlertTriangle, 
  Code2,
  MessageCircle,
  Shield,
  Lightbulb
} from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'app' | 'page' | 'component';
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error details for debugging
    console.group(`🔴 Error Boundary Caught Error [${this.state.errorId}]`);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Context:', this.props.context || this.props.level || 'Unknown');
    console.groupEnd();

    // Track error in global error system (if available)
    if (window.__trackError) {
      window.__trackError({
        type: 'react-error',
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        context: this.props.context,
        level: this.props.level,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: ''
      });
    } else {
      // Max retries reached, reload page
      window.location.reload();
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  getEducationalMessage = (error: Error) => {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('chunk load failed') || errorMessage.includes('loading chunk')) {
      return {
        title: "Loading Issue",
        explanation: "It looks like some parts of the app didn't load properly. This can happen when your internet connection is slow or when the app is updating.",
        suggestions: [
          "Try refreshing the page",
          "Check your internet connection",
          "Clear your browser cache if the problem persists"
        ],
        severity: "warning" as const
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        title: "Connection Problem",
        explanation: "The app is having trouble connecting to our servers. This might be a temporary network issue.",
        suggestions: [
          "Check your internet connection",
          "Try again in a few seconds",
          "Contact support if the problem continues"
        ],
        severity: "error" as const
      };
    }

    if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      return {
        title: "Access Issue",
        explanation: "The app doesn't have permission to access something it needs. This is usually a browser security feature.",
        suggestions: [
          "Try refreshing the page",
          "Check if your browser is blocking any features",
          "Make sure you're logged in properly"
        ],
        severity: "warning" as const
      };
    }

    // Generic error
    return {
      title: "Something Unexpected Happened",
      explanation: "Don't worry! This is a technical issue with the app, not with your code. Our team works hard to prevent these errors, but sometimes they slip through.",
      suggestions: [
        "Try refreshing the page - this often fixes the problem",
        "Go back to the home page and try again",
        "If this keeps happening, let us know so we can fix it"
      ],
      severity: "error" as const
    };
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided for component-level errors
      if (this.props.fallback && this.props.level === 'component') {
        return this.props.fallback;
      }

      const educationalMessage = this.getEducationalMessage(this.state.error);
      const isAppLevel = this.props.level === 'app' || !this.props.level;

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-red-950 dark:via-orange-950 dark:to-amber-950 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl"
          >
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                  {educationalMessage.severity === 'warning' ? (
                    <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  ) : (
                    <Bug className="h-8 w-8 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <CardTitle className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {educationalMessage.title}
                </CardTitle>
                <CardDescription className="text-lg mt-2 text-red-700 dark:text-red-300">
                  {educationalMessage.explanation}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Educational suggestions */}
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                  <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    <div className="font-medium mb-2">What you can try:</div>
                    <ul className="space-y-1">
                      {educationalMessage.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={this.handleRetry}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-retry-error"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again {this.retryCount > 0 && `(${this.maxRetries - this.retryCount} left)`}
                  </Button>
                  
                  {isAppLevel && (
                    <Button 
                      variant="outline" 
                      onClick={this.handleGoHome}
                      data-testid="button-home-error"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Go Home
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Technical details (collapsible for advanced users) */}
                <details className="group">
                  <summary className="cursor-pointer flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                    <Code2 className="h-4 w-4" />
                    Technical Details (for developers)
                  </summary>
                  <div className="mt-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-mono">
                    <div className="space-y-2">
                      <div>
                        <Badge variant="outline" className="mb-2">Error ID: {this.state.errorId}</Badge>
                      </div>
                      <div>
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      {this.props.context && (
                        <div>
                          <strong>Context:</strong> {this.props.context}
                        </div>
                      )}
                      <div>
                        <strong>Level:</strong> {this.props.level || 'app'}
                      </div>
                      {import.meta.env.DEV && this.state.error.stack && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-gray-600 dark:text-gray-400">Stack Trace</summary>
                          <pre className="mt-2 text-xs overflow-auto max-h-40 bg-gray-200 dark:bg-gray-900 p-2 rounded">
                            {this.state.error.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </details>

                {/* Help and support */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MessageCircle className="h-4 w-4" />
                    <span>If this problem continues, please let your instructor know</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Component-level error boundary for smaller errors
export function ComponentErrorBoundary({ 
  children, 
  fallback,
  context 
}: { 
  children: ReactNode; 
  fallback?: ReactNode;
  context?: string;
}) {
  const defaultFallback = (
    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
      <AlertDescription className="text-red-800 dark:text-red-200">
        <div className="font-medium mb-1">Something went wrong with this component</div>
        <div className="text-sm">Please try refreshing the page or contact support if the problem persists.</div>
      </AlertDescription>
    </Alert>
  );

  return (
    <ErrorBoundary 
      level="component" 
      context={context}
      fallback={fallback || defaultFallback}
    >
      {children}
    </ErrorBoundary>
  );
}

// Enhanced error boundary for pages
export function PageErrorBoundary({ 
  children, 
  context 
}: { 
  children: ReactNode;
  context?: string;
}) {
  return (
    <ErrorBoundary level="page" context={context}>
      {children}
    </ErrorBoundary>
  );
}

// App-level error boundary
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="app" context="Application Root">
      {children}
    </ErrorBoundary>
  );
}