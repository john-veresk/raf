import { formatRetryHistoryForConsole } from '../../src/commands/do.js';

/**
 * Tests for outcome content generation and retry history formatting.
 * Verifies:
 * - Successful outcomes do NOT contain ## Details or ## Failure History
 * - Failed outcomes DO contain ## Details (for debugging)
 * - Retry history is correctly formatted for console output
 */
describe('Outcome Content Format', () => {
  /**
   * Helper that generates a successful outcome content matching the template in do.ts.
   * NOTE: Successful outcomes no longer include ## Details section.
   */
  function generateSuccessOutcome(taskId: string): string {
    return `## Status: SUCCESS

# Task ${taskId} - Completed

Task completed. No detailed report provided.

<promise>COMPLETE</promise>
`;
  }

  /**
   * Helper that generates a failed outcome content matching the template in do.ts.
   * NOTE: Failed outcomes still include ## Details section for debugging.
   */
  function generateFailedOutcome(
    taskId: string,
    attempts: number = 1,
    elapsed: string = '1m 30s',
    stashName?: string
  ): string {
    return `## Status: FAILED

# Task ${taskId} - Failed

## Failure Reason
Task failed for some reason.

<promise>FAILED</promise>

## Details
- Attempts: ${attempts}
- Elapsed time: ${elapsed}
- Failed at: ${new Date().toISOString()}
${stashName ? `- Stash: ${stashName}` : ''}
`;
  }

  describe('successful outcomes', () => {
    it('should not contain ## Details section', () => {
      const outcome = generateSuccessOutcome('01');

      expect(outcome).not.toContain('## Details');
      expect(outcome).not.toContain('Attempts:');
      expect(outcome).not.toContain('Elapsed time:');
      expect(outcome).not.toContain('Completed at:');
    });

    it('should not contain ## Failure History section', () => {
      const outcome = generateSuccessOutcome('01');

      expect(outcome).not.toContain('## Failure History');
    });

    it('should contain the completion marker', () => {
      const outcome = generateSuccessOutcome('01');

      expect(outcome).toContain('<promise>COMPLETE</promise>');
    });

    it('should contain basic structure', () => {
      const outcome = generateSuccessOutcome('02');

      expect(outcome).toContain('## Status: SUCCESS');
      expect(outcome).toContain('# Task 02 - Completed');
    });
  });

  describe('failed outcomes', () => {
    it('should contain ## Details section for debugging', () => {
      const outcome = generateFailedOutcome('01', 3, '5m 10s');

      expect(outcome).toContain('## Details');
      expect(outcome).toContain('Attempts: 3');
      expect(outcome).toContain('Elapsed time: 5m 10s');
      expect(outcome).toContain('Failed at:');
    });

    it('should not contain ## Failure History section', () => {
      const outcome = generateFailedOutcome('01');

      expect(outcome).not.toContain('## Failure History');
    });

    it('should contain the failure marker', () => {
      const outcome = generateFailedOutcome('01');

      expect(outcome).toContain('<promise>FAILED</promise>');
    });

    it('should include stash name when provided', () => {
      const outcome = generateFailedOutcome('01', 2, '3m', 'raf-01-task-01-failed');

      expect(outcome).toContain('Stash: raf-01-task-01-failed');
    });
  });
});

describe('Retry History Console Output', () => {
  describe('formatRetryHistoryForConsole', () => {
    it('should return empty string when no failures', () => {
      const result = formatRetryHistoryForConsole('01', 'my-task', [], 1, true);
      expect(result).toBe('');
    });

    it('should format single failure with eventual success', () => {
      const failureHistory = [{ attempt: 1, reason: 'Connection timeout' }];
      const result = formatRetryHistoryForConsole('01', 'my-task', failureHistory, 2, true);

      expect(result).toContain('Task 01 (my-task):');
      expect(result).toContain('Attempt 1: Failed - Connection timeout');
      expect(result).toContain('Attempt 2: Succeeded');
    });

    it('should format multiple failures with eventual success', () => {
      const failureHistory = [
        { attempt: 1, reason: 'Connection timeout' },
        { attempt: 2, reason: 'API error' },
      ];
      const result = formatRetryHistoryForConsole('01', 'my-task', failureHistory, 3, true);

      expect(result).toContain('Task 01 (my-task):');
      expect(result).toContain('Attempt 1: Failed - Connection timeout');
      expect(result).toContain('Attempt 2: Failed - API error');
      expect(result).toContain('Attempt 3: Succeeded');
    });

    it('should format failures without success (final failure)', () => {
      const failureHistory = [
        { attempt: 1, reason: 'Connection timeout' },
        { attempt: 2, reason: 'API error' },
        { attempt: 3, reason: 'Max retries exceeded' },
      ];
      const result = formatRetryHistoryForConsole('01', 'my-task', failureHistory, 3, false);

      expect(result).toContain('Task 01 (my-task):');
      expect(result).toContain('Attempt 1: Failed - Connection timeout');
      expect(result).toContain('Attempt 2: Failed - API error');
      expect(result).toContain('Attempt 3: Failed - Max retries exceeded');
      expect(result).not.toContain('Succeeded');
    });

    it('should handle task name same as task id', () => {
      const failureHistory = [{ attempt: 1, reason: 'Error' }];
      const result = formatRetryHistoryForConsole('01', '01', failureHistory, 2, true);

      // When taskName equals taskId, should just show taskId
      expect(result).toContain('Task 01:');
      expect(result).not.toContain('Task 01 (01):');
    });
  });
});
