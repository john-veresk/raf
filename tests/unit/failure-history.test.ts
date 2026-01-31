import { formatFailureHistory } from '../../src/commands/do.js';

describe('Failure History Formatting', () => {
  describe('formatFailureHistory', () => {
    it('should return empty string when no failures occurred', () => {
      const result = formatFailureHistory([], 1, true);
      expect(result).toBe('');
    });

    it('should format single failure followed by success', () => {
      const failureHistory = [{ attempt: 1, reason: 'Task timed out' }];
      const result = formatFailureHistory(failureHistory, 2, true);

      expect(result).toContain('## Failure History');
      expect(result).toContain('- **Attempt 1**: Task timed out');
      expect(result).toContain('- **Attempt 2**: Success');
    });

    it('should format multiple failures followed by success', () => {
      const failureHistory = [
        { attempt: 1, reason: 'Context overflow - task too large' },
        { attempt: 2, reason: 'API rate limit exceeded' },
      ];
      const result = formatFailureHistory(failureHistory, 3, true);

      expect(result).toContain('## Failure History');
      expect(result).toContain('- **Attempt 1**: Context overflow - task too large');
      expect(result).toContain('- **Attempt 2**: API rate limit exceeded');
      expect(result).toContain('- **Attempt 3**: Success');
    });

    it('should format failures without success when task ultimately failed', () => {
      const failureHistory = [
        { attempt: 1, reason: 'Task timed out' },
        { attempt: 2, reason: 'Task timed out' },
        { attempt: 3, reason: 'Context overflow' },
      ];
      const result = formatFailureHistory(failureHistory, 3, false);

      expect(result).toContain('## Failure History');
      expect(result).toContain('- **Attempt 1**: Task timed out');
      expect(result).toContain('- **Attempt 2**: Task timed out');
      expect(result).toContain('- **Attempt 3**: Context overflow');
      expect(result).not.toContain('Success');
    });

    it('should preserve failure reasons exactly as provided', () => {
      const failureHistory = [
        { attempt: 1, reason: 'No completion marker found in output or outcome file' },
      ];
      const result = formatFailureHistory(failureHistory, 2, true);

      expect(result).toContain('- **Attempt 1**: No completion marker found in output or outcome file');
    });

    it('should end with double newline for proper markdown separation', () => {
      const failureHistory = [{ attempt: 1, reason: 'Test failure' }];
      const result = formatFailureHistory(failureHistory, 2, true);

      expect(result.endsWith('\n\n')).toBe(true);
    });

    it('should have correct line structure', () => {
      const failureHistory = [
        { attempt: 1, reason: 'First failure' },
        { attempt: 2, reason: 'Second failure' },
      ];
      const result = formatFailureHistory(failureHistory, 3, true);
      const lines = result.trim().split('\n');

      expect(lines[0]).toBe('## Failure History');
      expect(lines[1]).toBe('- **Attempt 1**: First failure');
      expect(lines[2]).toBe('- **Attempt 2**: Second failure');
      expect(lines[3]).toBe('- **Attempt 3**: Success');
    });

    it('should handle single failure with immediate success on retry', () => {
      const failureHistory = [{ attempt: 1, reason: 'Rate limit exceeded' }];
      const result = formatFailureHistory(failureHistory, 2, true);

      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('## Failure History');
      expect(lines[1]).toBe('- **Attempt 1**: Rate limit exceeded');
      expect(lines[2]).toBe('- **Attempt 2**: Success');
    });

    it('should handle maximum retries (3 failures)', () => {
      const failureHistory = [
        { attempt: 1, reason: 'API error' },
        { attempt: 2, reason: 'API error' },
        { attempt: 3, reason: 'API error' },
      ];
      const result = formatFailureHistory(failureHistory, 3, false);

      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('## Failure History');
      expect(lines[1]).toBe('- **Attempt 1**: API error');
      expect(lines[2]).toBe('- **Attempt 2**: API error');
      expect(lines[3]).toBe('- **Attempt 3**: API error');
    });
  });

  describe('integration scenarios', () => {
    it('should work for clean success (no failures)', () => {
      // On first attempt success, no failure history
      const result = formatFailureHistory([], 1, true);
      expect(result).toBe('');
    });

    it('should work for retry after timeout then success', () => {
      const failureHistory = [{ attempt: 1, reason: 'Task timed out' }];
      const result = formatFailureHistory(failureHistory, 2, true);

      expect(result).toContain('Attempt 1');
      expect(result).toContain('Task timed out');
      expect(result).toContain('Attempt 2');
      expect(result).toContain('Success');
    });

    it('should work for ultimate failure after all retries', () => {
      const failureHistory = [
        { attempt: 1, reason: 'Context overflow - task too large' },
      ];
      const result = formatFailureHistory(failureHistory, 1, false);

      expect(result).toContain('Attempt 1');
      expect(result).toContain('Context overflow');
      expect(result).not.toContain('Success');
    });
  });
});
