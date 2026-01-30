import {
  parseOutput,
  isRetryableFailure,
  extractSummary,
} from '../../src/parsers/output-parser.js';

describe('OutputParser', () => {
  describe('parseOutput', () => {
    it('should detect COMPLETE marker', () => {
      const output = `
        Task completed successfully.
        <promise>COMPLETE</promise>
      `;

      const result = parseOutput(output);
      expect(result.result).toBe('complete');
      expect(result.contextOverflow).toBe(false);
    });

    it('should detect FAILED marker with reason', () => {
      const output = `
        Something went wrong.
        <promise>FAILED</promise>
        Reason: Could not find required file
      `;

      const result = parseOutput(output);
      expect(result.result).toBe('failed');
      expect(result.failureReason).toBe('Could not find required file');
    });

    it('should use last marker when both present', () => {
      const output = `
        First attempt failed.
        <promise>FAILED</promise>
        Reason: First error

        Retry succeeded.
        <promise>COMPLETE</promise>
      `;

      const result = parseOutput(output);
      expect(result.result).toBe('complete');
    });

    it('should return unknown when no marker', () => {
      const output = 'Just some output without any markers';

      const result = parseOutput(output);
      expect(result.result).toBe('unknown');
    });

    it('should detect context overflow', () => {
      const patterns = [
        'context length exceeded',
        'token limit reached',
        'maximum context window',
        'too many tokens in request',
      ];

      for (const pattern of patterns) {
        const result = parseOutput(`Error: ${pattern}`);
        expect(result.contextOverflow).toBe(true);
      }
    });

    it('should handle case insensitive markers', () => {
      const output1 = '<PROMISE>complete</PROMISE>';
      const output2 = '<promise>COMPLETE</promise>';

      expect(parseOutput(output1).result).toBe('complete');
      expect(parseOutput(output2).result).toBe('complete');
    });

    it('should provide default failure reason when missing', () => {
      const output = '<promise>FAILED</promise>';

      const result = parseOutput(output);
      expect(result.result).toBe('failed');
      expect(result.failureReason).toBe('Unknown failure (no reason provided)');
    });
  });

  describe('isRetryableFailure', () => {
    it('should not retry context overflow', () => {
      const parsed = { result: 'failed' as const, contextOverflow: true };
      expect(isRetryableFailure(parsed)).toBe(false);
    });

    it('should retry unknown results', () => {
      const parsed = { result: 'unknown' as const, contextOverflow: false };
      expect(isRetryableFailure(parsed)).toBe(true);
    });

    it('should not retry "cannot be done" failures', () => {
      const parsed = {
        result: 'failed' as const,
        failureReason: 'This task cannot be done with current setup',
        contextOverflow: false,
      };
      expect(isRetryableFailure(parsed)).toBe(false);
    });

    it('should retry generic failures', () => {
      const parsed = {
        result: 'failed' as const,
        failureReason: 'Test failed with error',
        contextOverflow: false,
      };
      expect(isRetryableFailure(parsed)).toBe(true);
    });
  });

  describe('extractSummary', () => {
    it('should extract text lines', () => {
      const output = `
Starting task execution.
This is a summary of what was done.
Some more details here.
      `;

      const summary = extractSummary(output);
      expect(summary).toContain('Starting task execution');
      expect(summary).toContain('This is a summary');
    });

    it('should skip code blocks', () => {
      const output = `
Summary line.
\`\`\`javascript
const code = true;
\`\`\`
Another summary line.
      `;

      const summary = extractSummary(output);
      expect(summary).not.toContain('const code');
      expect(summary).toContain('Summary line');
      expect(summary).toContain('Another summary line');
    });

    it('should remove ANSI codes', () => {
      const output = '\x1b[32mGreen text\x1b[0m and normal';

      const summary = extractSummary(output);
      expect(summary).not.toContain('\x1b[');
      expect(summary).toContain('Green text');
    });

    it('should skip file paths and commands', () => {
      const output = `
Summary text.
/path/to/some/file.ts
$ npm install
More summary.
      `;

      const summary = extractSummary(output);
      expect(summary).not.toContain('/path/to');
      expect(summary).not.toContain('$ npm');
      expect(summary).toContain('Summary text');
    });

    it('should return default message for empty output', () => {
      const summary = extractSummary('');
      expect(summary).toBe('No summary available.');
    });

    it('should limit summary length', () => {
      const lines = Array(100).fill('This is a line of text that should be included.');
      const output = lines.join('\n');

      const summary = extractSummary(output);
      const resultLines = summary.split('\n');
      expect(resultLines.length).toBeLessThanOrEqual(50);
    });
  });
});
