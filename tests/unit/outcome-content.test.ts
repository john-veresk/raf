import { extractSummary } from '../../src/parsers/output-parser.js';

/**
 * Tests for outcome content generation.
 * Ensures the outcome template doesn't create duplicate Summary headers
 * when Claude's output already contains a ## Summary section.
 */
describe('Outcome Content Format', () => {
  /**
   * Helper that generates outcome content matching the template in do.ts.
   * This should be kept in sync with the actual template in src/commands/do.ts.
   */
  function generateSuccessOutcome(
    taskId: string,
    summary: string,
    attempts: number = 1,
    elapsed: string = '1m 30s'
  ): string {
    return `## Status: SUCCESS

# Task ${taskId} - Completed

${summary}

## Details
- Attempts: ${attempts}
- Elapsed time: ${elapsed}
- Completed at: ${new Date().toISOString()}
`;
  }

  describe('no duplicate Summary headers', () => {
    it('should not add duplicate ## Summary when Claude output contains summary header', () => {
      // Claude's output typically includes a ## Summary header
      const claudeOutput = `## Summary
Task completed successfully. All tests pass and the build succeeds.

The implementation followed the plan exactly as specified.

<promise>COMPLETE</promise>`;

      const summary = extractSummary(claudeOutput);
      const outcome = generateSuccessOutcome('001', summary);

      // Count occurrences of "## Summary"
      const summaryHeaders = (outcome.match(/## Summary/g) || []).length;
      expect(summaryHeaders).toBe(1);
    });

    it('should work correctly when Claude output has no summary header', () => {
      const claudeOutput = `Task completed successfully.
All tests pass and the build succeeds.

<promise>COMPLETE</promise>`;

      const summary = extractSummary(claudeOutput);
      const outcome = generateSuccessOutcome('001', summary);

      // The outcome should contain the summary content
      expect(outcome).toContain('Task completed successfully');
      // Should not have any ## Summary headers since Claude didn't provide one
      // and RAF no longer adds one
      const summaryHeaders = (outcome.match(/## Summary/g) || []).length;
      expect(summaryHeaders).toBe(0);
    });

    it('should preserve Claude summary header when present', () => {
      const claudeOutput = `## Summary
Implementation complete.

Multiple changes were made to the codebase.

<promise>COMPLETE</promise>`;

      const summary = extractSummary(claudeOutput);
      const outcome = generateSuccessOutcome('001', summary);

      // The outcome should contain exactly one ## Summary header (from Claude)
      expect(outcome).toContain('## Summary');
      expect(outcome).toContain('Implementation complete');

      const summaryHeaders = (outcome.match(/## Summary/g) || []).length;
      expect(summaryHeaders).toBe(1);
    });
  });

  describe('outcome structure', () => {
    it('should have correct section order', () => {
      const summary = 'Task summary content';
      const outcome = generateSuccessOutcome('001', summary);

      // Verify section order: Status first, then Task header, then summary, then Details
      const statusIndex = outcome.indexOf('## Status:');
      const taskIndex = outcome.indexOf('# Task');
      const detailsIndex = outcome.indexOf('## Details');

      expect(statusIndex).toBeLessThan(taskIndex);
      expect(taskIndex).toBeLessThan(detailsIndex);
    });

    it('should include all required metadata', () => {
      const summary = 'Task completed';
      const outcome = generateSuccessOutcome('002', summary, 2, '5m 10s');

      expect(outcome).toContain('## Status: SUCCESS');
      expect(outcome).toContain('# Task 002 - Completed');
      expect(outcome).toContain('Attempts: 2');
      expect(outcome).toContain('Elapsed time: 5m 10s');
      expect(outcome).toContain('Completed at:');
    });
  });
});
