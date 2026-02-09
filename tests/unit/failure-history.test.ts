import { formatRetryHistoryForConsole } from '../../src/commands/do.js';

/**
 * Tests for retry history formatting.
 *
 * NOTE: Retry history is now shown in console output instead of being written
 * to outcome files. This test suite verifies the console output formatting.
 */
describe('Retry History Formatting', () => {
  describe('formatRetryHistoryForConsole', () => {
    it('should return empty string when no failures occurred', () => {
      const result = formatRetryHistoryForConsole('01', 'my-task', [], 1, true);
      expect(result).toBe('');
    });

    it('should format single failure followed by success', () => {
      const failureHistory = [{ attempt: 1, reason: 'Task timed out' }];
      const result = formatRetryHistoryForConsole('01', 'my-task', failureHistory, 2, true);

      expect(result).toContain('Task 01 (my-task):');
      expect(result).toContain('Attempt 1: Failed - Task timed out');
      expect(result).toContain('Attempt 2: Succeeded');
    });

    it('should format multiple failures followed by success', () => {
      const failureHistory = [
        { attempt: 1, reason: 'Context overflow - task too large' },
        { attempt: 2, reason: 'API rate limit exceeded' },
      ];
      const result = formatRetryHistoryForConsole('01', 'my-task', failureHistory, 3, true);

      expect(result).toContain('Task 01 (my-task):');
      expect(result).toContain('Attempt 1: Failed - Context overflow - task too large');
      expect(result).toContain('Attempt 2: Failed - API rate limit exceeded');
      expect(result).toContain('Attempt 3: Succeeded');
    });

    it('should format failures without success when task ultimately failed', () => {
      const failureHistory = [
        { attempt: 1, reason: 'Task timed out' },
        { attempt: 2, reason: 'Task timed out' },
        { attempt: 3, reason: 'Context overflow' },
      ];
      const result = formatRetryHistoryForConsole('01', 'my-task', failureHistory, 3, false);

      expect(result).toContain('Task 01 (my-task):');
      expect(result).toContain('Attempt 1: Failed - Task timed out');
      expect(result).toContain('Attempt 2: Failed - Task timed out');
      expect(result).toContain('Attempt 3: Failed - Context overflow');
      expect(result).not.toContain('Succeeded');
    });

    it('should preserve failure reasons exactly as provided', () => {
      const failureHistory = [
        { attempt: 1, reason: 'No completion marker found in output or outcome file' },
      ];
      const result = formatRetryHistoryForConsole('01', 'my-task', failureHistory, 2, true);

      expect(result).toContain('Attempt 1: Failed - No completion marker found in output or outcome file');
    });

    it('should handle task name same as task id', () => {
      const failureHistory = [{ attempt: 1, reason: 'Test failure' }];
      const result = formatRetryHistoryForConsole('01', '01', failureHistory, 2, true);

      // When taskName equals taskId, should just show taskId without parentheses
      expect(result).toContain('Task 01:');
      expect(result).not.toContain('Task 01 (01):');
    });

    it('should have proper indentation structure', () => {
      const failureHistory = [
        { attempt: 1, reason: 'First failure' },
        { attempt: 2, reason: 'Second failure' },
      ];
      const result = formatRetryHistoryForConsole('01', 'my-task', failureHistory, 3, true);
      const lines = result.split('\n');

      // First line should be task header with minimal indentation
      expect(lines[0]).toMatch(/^\s{2}Task/);
      // Following lines should have more indentation for attempts
      expect(lines[1]).toMatch(/^\s{4}Attempt 1/);
      expect(lines[2]).toMatch(/^\s{4}Attempt 2/);
      expect(lines[3]).toMatch(/^\s{4}Attempt 3/);
    });

    it('should handle single failure with immediate success on retry', () => {
      const failureHistory = [{ attempt: 1, reason: 'Rate limit exceeded' }];
      const result = formatRetryHistoryForConsole('01', 'my-task', failureHistory, 2, true);

      const lines = result.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain('Task 01 (my-task):');
      expect(lines[1]).toContain('Attempt 1: Failed - Rate limit exceeded');
      expect(lines[2]).toContain('Attempt 2: Succeeded');
    });

    it('should handle maximum retries (3 failures)', () => {
      const failureHistory = [
        { attempt: 1, reason: 'API error' },
        { attempt: 2, reason: 'API error' },
        { attempt: 3, reason: 'API error' },
      ];
      const result = formatRetryHistoryForConsole('01', 'my-task', failureHistory, 3, false);

      const lines = result.split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toContain('Task 01 (my-task):');
      expect(lines[1]).toContain('Attempt 1: Failed - API error');
      expect(lines[2]).toContain('Attempt 2: Failed - API error');
      expect(lines[3]).toContain('Attempt 3: Failed - API error');
    });
  });

  describe('integration scenarios', () => {
    it('should work for clean success (no failures)', () => {
      // On first attempt success, no retry history
      const result = formatRetryHistoryForConsole('01', 'my-task', [], 1, true);
      expect(result).toBe('');
    });

    it('should work for retry after timeout then success', () => {
      const failureHistory = [{ attempt: 1, reason: 'Task timed out' }];
      const result = formatRetryHistoryForConsole('01', 'my-task', failureHistory, 2, true);

      expect(result).toContain('Attempt 1');
      expect(result).toContain('Task timed out');
      expect(result).toContain('Attempt 2');
      expect(result).toContain('Succeeded');
    });

    it('should work for ultimate failure after all retries', () => {
      const failureHistory = [
        { attempt: 1, reason: 'Context overflow - task too large' },
      ];
      const result = formatRetryHistoryForConsole('01', 'my-task', failureHistory, 1, false);

      expect(result).toContain('Attempt 1');
      expect(result).toContain('Context overflow');
      expect(result).not.toContain('Succeeded');
    });
  });
});
