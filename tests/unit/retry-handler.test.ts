import { jest } from '@jest/globals';
import { withRetry, isRetryableError } from '../../src/core/retry-handler.js';

describe('RetryHandler', () => {
  describe('withRetry', () => {
    it('should return success on first try', async () => {
      const fn = jest.fn().mockResolvedValue('result');

      const result = await withRetry(fn, { maxRetries: 3 });

      expect(result.success).toBe(true);
      expect(result.result).toBe('result');
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 3 });

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should stop after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fail'));

      const result = await withRetry(fn, { maxRetries: 3 });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.lastError?.message).toBe('always fail');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      const onRetry = jest.fn();

      await withRetry(fn, { maxRetries: 3, onRetry });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should convert non-Error rejections to Error', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce('string error')
        .mockResolvedValue('success');
      const onRetry = jest.fn();

      await withRetry(fn, { maxRetries: 3, onRetry });

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('isRetryableError', () => {
    it('should not retry context overflow', () => {
      expect(isRetryableError(new Error('context overflow detected'))).toBe(false);
      expect(isRetryableError(new Error('token limit exceeded'))).toBe(false);
    });

    it('should not retry rate limits', () => {
      expect(isRetryableError(new Error('rate limit exceeded'))).toBe(false);
    });

    it('should not retry auth failures', () => {
      expect(isRetryableError(new Error('authentication failed'))).toBe(false);
      expect(isRetryableError(new Error('permission denied'))).toBe(false);
    });

    it('should retry generic errors', () => {
      expect(isRetryableError(new Error('connection timeout'))).toBe(true);
      expect(isRetryableError(new Error('unknown error'))).toBe(true);
    });
  });
});
