import { logger } from '../utils/logger.js';

export interface RetryOptions {
  maxRetries: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  attempts: number;
  lastError?: Error;
}

/**
 * Execute a function with retry logic.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<RetryResult<T>> {
  const { maxRetries, onRetry } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        result,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        logger.debug(`Attempt ${attempt} failed, retrying...`);
        onRetry?.(attempt, lastError);
      }
    }
  }

  return {
    success: false,
    attempts: maxRetries,
    lastError,
  };
}

/**
 * Determine if an error is retryable.
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Non-retryable errors
  const nonRetryable = [
    'context overflow',
    'token limit',
    'rate limit exceeded',
    'authentication failed',
    'permission denied',
  ];

  for (const pattern of nonRetryable) {
    if (message.includes(pattern)) {
      return false;
    }
  }

  return true;
}
