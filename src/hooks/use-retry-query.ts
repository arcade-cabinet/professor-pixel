import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { retryMechanism, type RetryOptions } from "@/lib/retry-mechanism";
import { trackNetworkError } from "@/lib/global-error-handler";
import { logger } from "@/lib/console-logger";

/**
 * Enhanced useQuery with retry mechanisms and better error handling
 */
export function useRetryQuery<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  retryOptions?: RetryOptions & {
    /** Custom error messages for different scenarios */
    errorMessages?: {
      network?: string;
      server?: string;
      timeout?: string;
      generic?: string;
    };
    /** Whether to show user-friendly error messages */
    showFriendlyErrors?: boolean;
  }
) {
  const [retryCount, setRetryCount] = useState(0);
  const [isManualRetrying, setIsManualRetrying] = useState(false);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      logger.network.info(`Starting query: ${queryKey.join('/')}`);
      
      try {
        const result = await retryMechanism.withRetry(queryFn, {
          maxAttempts: 3,
          baseDelay: 1000,
          ...retryOptions,
          onRetry: (error, attempt) => {
            setRetryCount(attempt);
            logger.network.warn(`Query retry attempt ${attempt}`, { queryKey, error: error.message });
            retryOptions?.onRetry?.(error, attempt);
          },
          onFinalFailure: (error, attempts) => {
            trackNetworkError(error, `Query failed: ${queryKey.join('/')}`);
            logger.network.error(`Query failed after ${attempts} attempts`, { queryKey, error: error.message });
            retryOptions?.onFinalFailure?.(error, attempts);
          }
        });

        if (result.success) {
          setRetryCount(0);
          logger.network.success(`Query completed successfully: ${queryKey.join('/')}`);
          return result.data;
        } else {
          throw result.error;
        }
      } catch (error) {
        // Transform error for better user experience
        if (retryOptions?.showFriendlyErrors) {
          const friendlyError = getFriendlyErrorMessage(error, retryOptions.errorMessages);
          throw new Error(friendlyError);
        }
        throw error;
      }
    },
    retry: false, // Disable React Query's built-in retry since we handle it ourselves
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const manualRetry = useCallback(async () => {
    setIsManualRetrying(true);
    try {
      await query.refetch();
    } finally {
      setIsManualRetrying(false);
    }
  }, [query]);

  return {
    ...query,
    retryCount,
    isManualRetrying,
    manualRetry,
    canRetry: !query.isLoading && !isManualRetrying,
    hasRetryableError: query.error && isRetryableError(query.error)
  };
}

/**
 * Enhanced useMutation with retry mechanisms
 */
export function useRetryMutation<T, TVariables>(
  mutationFn: (variables: TVariables) => Promise<T>,
  retryOptions?: RetryOptions & {
    /** Query keys to invalidate on success */
    invalidateQueries?: any[][];
    /** Whether to show user-friendly error messages */
    showFriendlyErrors?: boolean;
    /** Custom error messages */
    errorMessages?: {
      network?: string;
      server?: string;
      timeout?: string;
      generic?: string;
    };
  }
) {
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);

  const mutation = useMutation({
    mutationFn: async (variables: TVariables) => {
      logger.network.info('Starting mutation', { variables });
      
      try {
        const result = await retryMechanism.withRetry(() => mutationFn(variables), {
          maxAttempts: 3,
          baseDelay: 1000,
          ...retryOptions,
          onRetry: (error, attempt) => {
            setRetryCount(attempt);
            logger.network.warn(`Mutation retry attempt ${attempt}`, { variables, error: error.message });
            retryOptions?.onRetry?.(error, attempt);
          },
          onFinalFailure: (error, attempts) => {
            trackNetworkError(error, 'Mutation failed');
            logger.network.error(`Mutation failed after ${attempts} attempts`, { variables, error: error.message });
            retryOptions?.onFinalFailure?.(error, attempts);
          }
        });

        if (result.success) {
          setRetryCount(0);
          logger.network.success('Mutation completed successfully', { variables });
          
          // Invalidate specified queries
          if (retryOptions?.invalidateQueries) {
            retryOptions.invalidateQueries.forEach(queryKey => {
              queryClient.invalidateQueries({ queryKey });
            });
          }
          
          return result.data;
        } else {
          throw result.error;
        }
      } catch (error) {
        // Transform error for better user experience
        if (retryOptions?.showFriendlyErrors) {
          const friendlyError = getFriendlyErrorMessage(error, retryOptions.errorMessages);
          throw new Error(friendlyError);
        }
        throw error;
      }
    }
  });

  return {
    ...mutation,
    retryCount,
    canRetry: !mutation.isPending,
    hasRetryableError: mutation.error && isRetryableError(mutation.error)
  };
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error?.name === 'NetworkError' || 
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('ERR_NETWORK')) {
    return true;
  }

  // Server errors (5xx)
  if (error?.status >= 500 && error?.status < 600) {
    return true;
  }

  // Specific client errors that might be temporary
  if (error?.status === 408 || error?.status === 429) {
    return true;
  }

  // Timeout errors
  if (error?.name === 'TimeoutError' || 
      error?.message?.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Get user-friendly error message
 */
function getFriendlyErrorMessage(
  error: any, 
  customMessages?: {
    network?: string;
    server?: string;
    timeout?: string;
    generic?: string;
  }
): string {
  const defaults = {
    network: "Connection problem detected. Please check your internet and try again.",
    server: "Server is temporarily unavailable. Please try again in a moment.",
    timeout: "Request took too long. Please try again.",
    generic: "Something went wrong. Please try again."
  };

  const messages = { ...defaults, ...customMessages };

  // Network errors
  if (error?.name === 'NetworkError' || 
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('ERR_NETWORK')) {
    return messages.network;
  }

  // Server errors
  if (error?.status >= 500 && error?.status < 600) {
    return messages.server;
  }

  // Timeout errors
  if (error?.name === 'TimeoutError' || 
      error?.message?.includes('timeout')) {
    return messages.timeout;
  }

  // Rate limiting
  if (error?.status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }

  // Authentication errors
  if (error?.status === 401) {
    return "Please log in to continue.";
  }

  if (error?.status === 403) {
    return "You don't have permission to perform this action.";
  }

  // Not found
  if (error?.status === 404) {
    return "The requested item was not found.";
  }

  // Generic error
  return messages.generic;
}

/**
 * Hook for optimistic updates with retry on failure
 */
export function useOptimisticMutation<T, TVariables>(
  mutationFn: (variables: TVariables) => Promise<T>,
  options: {
    queryKey: any[];
    optimisticUpdateFn: (oldData: any, variables: TVariables) => any;
    retryOptions?: RetryOptions;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      // Apply optimistic update
      const previousData = queryClient.getQueryData(options.queryKey);
      const optimisticData = options.optimisticUpdateFn(previousData, variables);
      queryClient.setQueryData(options.queryKey, optimisticData);

      try {
        const result = await retryMechanism.withRetry(() => mutationFn(variables), {
          maxAttempts: 3,
          ...options.retryOptions
        });

        if (result.success) {
          return result.data;
        } else {
          throw result.error;
        }
      } catch (error) {
        // Revert optimistic update on failure
        queryClient.setQueryData(options.queryKey, previousData);
        throw error;
      }
    },
    onSuccess: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: options.queryKey });
    }
  });
}

/**
 * Hook for handling paginated queries with retry
 */
export function useRetryInfiniteQuery<T>(
  queryKey: any[],
  queryFn: ({ pageParam }: { pageParam: any }) => Promise<T>,
  retryOptions?: RetryOptions
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const result = await retryMechanism.withRetry(() => queryFn({ pageParam: 0 }), {
        maxAttempts: 3,
        ...retryOptions
      });

      if (result.success) {
        return result.data;
      } else {
        throw result.error;
      }
    },
    retry: false
  });
}