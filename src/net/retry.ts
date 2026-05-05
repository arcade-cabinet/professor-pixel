/**
 * Retry Mechanism System for Pixel's PyGame Palace
 * Provides robust retry logic for failed operations with exponential backoff
 */

import React, { useState } from 'react';

/**
 * Shape we probe on a thrown value to drive retry decisions. We accept
 * `unknown` at the boundary and read these fields defensively (each access
 * uses optional chaining + nullish checks). Everything is optional because
 * the value may not even be an Error object.
 */
interface RetryErrorShape {
  name?: string;
  code?: string;
  message?: string;
  status?: number;
  type?: string;
}

function asRetryError(e: unknown): RetryErrorShape {
  return (typeof e === 'object' && e !== null ? e : {}) as RetryErrorShape;
}

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Base delay in milliseconds */
  baseDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Exponential backoff multiplier */
  backoffMultiplier?: number;
  /** Jitter to add randomness to delays */
  jitter?: boolean;
  /** Function to determine if error should trigger retry */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Callback for retry attempts */
  onRetry?: (error: unknown, attempt: number) => void;
  /** Callback for final failure */
  onFinalFailure?: (error: unknown, totalAttempts: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
  totalTime: number;
}

class RetryMechanism {
  private defaultOptions: Required<RetryOptions> = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    shouldRetry: (error: unknown, attempt: number) => this.defaultShouldRetry(error, attempt),
    onRetry: () => {},
    onFinalFailure: () => {},
  };

  private defaultShouldRetry(error: unknown, attempt: number): boolean {
    // Don't retry on final attempt
    if (attempt >= this.defaultOptions.maxAttempts) return false;

    const e = asRetryError(error);

    // Retry network errors
    if (e.name === 'NetworkError' || e.code === 'NETWORK_ERROR') return true;

    // Retry timeout errors
    if (e.name === 'TimeoutError' || e.message?.includes('timeout')) return true;

    // Retry 5xx server errors
    if (e.status !== undefined && e.status >= 500 && e.status < 600) return true;

    // Retry specific client errors that might be temporary
    if (e.status === 408 || e.status === 429) return true; // Request timeout, Too Many Requests

    // Retry connection failures
    if (
      e.message?.includes('Failed to fetch') ||
      e.message?.includes('Connection failed') ||
      e.message?.includes('ERR_NETWORK')
    )
      return true;

    // Don't retry client errors (4xx except specific ones)
    if (e.status !== undefined && e.status >= 400 && e.status < 500) return false;

    // Don't retry authentication errors
    if (e.status === 401 || e.status === 403) return false;

    // Retry unknown errors
    return true;
  }

  private calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    let delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);

    // Apply maximum delay
    delay = Math.min(delay, options.maxDelay);

    // Add jitter if enabled
    if (options.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5); // 50-100% of calculated delay
    }

    return Math.round(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry an async operation with exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    userOptions: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const options = { ...this.defaultOptions, ...userOptions };
    const startTime = Date.now();
    let lastError: unknown;

    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      try {
        const data = await operation();
        return {
          success: true,
          data,
          attempts: attempt,
          totalTime: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error;

        if (!options.shouldRetry(error, attempt)) {
          break;
        }

        if (attempt < options.maxAttempts) {
          const delay = this.calculateDelay(attempt, options);
          options.onRetry(error, attempt);

          if (import.meta.env.DEV) {
            console.warn(
              `🔄 Retry attempt ${attempt}/${options.maxAttempts} failed, retrying in ${delay}ms:`,
              error
            );
          }

          await this.sleep(delay);
        }
      }
    }

    options.onFinalFailure(lastError, options.maxAttempts);

    return {
      success: false,
      error: lastError,
      attempts: options.maxAttempts,
      totalTime: Date.now() - startTime,
    };
  }

  /**
   * Retry a fetch request with proper error handling
   */
  async fetchWithRetry(
    url: string,
    fetchOptions: RequestInit = {},
    retryOptions: RetryOptions = {}
  ): Promise<Response> {
    const result = await this.withRetry(
      async () => {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & {
            status?: number;
            statusText?: string;
          };
          error.status = response.status;
          error.statusText = response.statusText;
          throw error;
        }

        return response;
      },
      {
        ...retryOptions,
        onRetry: (error, attempt) => {
          if (import.meta.env.DEV) {
            console.warn(`🌐 Network request failed (attempt ${attempt}):`, { url, error });
          }
          retryOptions.onRetry?.(error, attempt);
        },
      }
    );

    if (!result.success) {
      throw result.error;
    }

    return result.data!;
  }

  /**
   * Retry an API call with JSON parsing
   */
  async apiCallWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retryOptions: RetryOptions = {}
  ): Promise<T> {
    const result = await this.withRetry(async () => {
      const response = await this.fetchWithRetry(url, options, { maxAttempts: 1 });
      return await response.json();
    }, retryOptions);

    if (!result.success) {
      throw result.error;
    }

    return result.data!;
  }

  /**
   * Retry Python code execution
   */
  async pythonExecutionWithRetry<T>(
    executeFn: () => Promise<T>,
    retryOptions: RetryOptions = {}
  ): Promise<T> {
    const pythonRetryOptions: RetryOptions = {
      maxAttempts: 2, // Don't retry Python errors as much
      baseDelay: 500,
      shouldRetry: (error: unknown, _attempt: number) => {
        const e = asRetryError(error);
        // Only retry on specific Python runtime errors
        if (e.message?.includes('pyodide not ready')) return true;
        if (e.message?.includes('Worker error')) return true;
        if (e.message?.includes('Memory error')) return false; // Don't retry memory errors
        if (e.type === 'SyntaxError') return false; // Don't retry syntax errors
        return false; // Don't retry most Python errors
      },
      ...retryOptions,
    };

    const result = await this.withRetry(executeFn, pythonRetryOptions);

    if (!result.success) {
      throw result.error;
    }

    return result.data!;
  }

  /**
   * Retry file operations (upload/download)
   */
  async fileOperationWithRetry<T>(
    operation: () => Promise<T>,
    retryOptions: RetryOptions = {}
  ): Promise<T> {
    const fileRetryOptions: RetryOptions = {
      maxAttempts: 3,
      baseDelay: 2000,
      shouldRetry: (error: unknown, _attempt: number) => {
        const e = asRetryError(error);
        // Retry network and server errors for file operations
        if (e.message?.includes('Failed to fetch')) return true;
        if (e.status !== undefined && e.status >= 500) return true;
        if (e.status === 408 || e.status === 429) return true;
        return false;
      },
      ...retryOptions,
    };

    const result = await this.withRetry(operation, fileRetryOptions);

    if (!result.success) {
      throw result.error;
    }

    return result.data!;
  }
}

// Create global retry mechanism instance
export const retryMechanism = new RetryMechanism();

// Convenience functions
export const withRetry = <T>(operation: () => Promise<T>, options?: RetryOptions) =>
  retryMechanism.withRetry(operation, options);

export const fetchWithRetry = (url: string, options?: RequestInit, retryOptions?: RetryOptions) =>
  retryMechanism.fetchWithRetry(url, options, retryOptions);

export const apiCallWithRetry = <T>(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
) => retryMechanism.apiCallWithRetry<T>(url, options, retryOptions);

export const pythonExecutionWithRetry = <T>(
  executeFn: () => Promise<T>,
  retryOptions?: RetryOptions
) => retryMechanism.pythonExecutionWithRetry(executeFn, retryOptions);

export const fileOperationWithRetry = <T>(
  operation: () => Promise<T>,
  retryOptions?: RetryOptions
) => retryMechanism.fileOperationWithRetry(operation, retryOptions);

// Hook for React components
export interface UseRetryState {
  isRetrying: boolean;
  retryCount: number;
  lastError: unknown;
  canRetry: boolean;
}

/**
 * React hook for retry functionality
 */
export function useRetry(maxRetries = 3) {
  const [state, setState] = useState<UseRetryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
    canRetry: true,
  });

  const retry = async <T>(operation: () => Promise<T>): Promise<T> => {
    setState((prev: UseRetryState) => ({ ...prev, isRetrying: true }));

    try {
      const result = await retryMechanism.withRetry(operation, {
        maxAttempts: maxRetries,
        onRetry: (error, attempt) => {
          setState((prev: UseRetryState) => ({
            ...prev,
            retryCount: attempt,
            lastError: error,
            canRetry: attempt < maxRetries,
          }));
        },
        onFinalFailure: (error, attempts) => {
          setState((prev: UseRetryState) => ({
            ...prev,
            lastError: error,
            canRetry: false,
            isRetrying: false,
          }));
        },
      });

      if (result.success) {
        setState((prev: UseRetryState) => ({
          ...prev,
          isRetrying: false,
          retryCount: 0,
          lastError: null,
          canRetry: true,
        }));
        return result.data!;
      } else {
        throw result.error;
      }
    } catch (error) {
      setState((prev: UseRetryState) => ({
        ...prev,
        isRetrying: false,
        lastError: error,
      }));
      throw error;
    }
  };

  const reset = () => {
    setState({
      isRetrying: false,
      retryCount: 0,
      lastError: null,
      canRetry: true,
    });
  };

  return {
    ...state,
    retry,
    reset,
  };
}

// Educational retry helpers
export const educationalRetry = {
  /**
   * Retry with user-friendly messages for students
   */
  async withEducationalFeedback<T>(
    operation: () => Promise<T>,
    context: string,
    onMessage?: (message: string) => void
  ): Promise<T> {
    const result = await retryMechanism.withRetry(operation, {
      onRetry: (error, attempt) => {
        const messages = [
          `Having trouble ${context}. Trying again... (attempt ${attempt})`,
          `Still working on ${context}. This might take a moment... (attempt ${attempt})`,
          `Almost there! One more try ${context}... (attempt ${attempt})`,
        ];
        const message = messages[Math.min(attempt - 1, messages.length - 1)];
        onMessage?.(message);
      },
      onFinalFailure: (error) => {
        onMessage?.(`Unable to complete ${context}. Please check your connection and try again.`);
      },
    });

    if (!result.success) {
      throw result.error;
    }

    return result.data!;
  },
};

export default retryMechanism;
