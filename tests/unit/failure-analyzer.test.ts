import {
  detectProgrammaticFailure,
  generateProgrammaticReport,
  analyzeFailure,
  type ProgrammaticFailureType,
} from '../../src/core/failure-analyzer.js';

describe('Failure Analyzer', () => {
  describe('detectProgrammaticFailure', () => {
    describe('context overflow detection', () => {
      it('should detect "context length exceeded"', () => {
        const output = 'Error: context length exceeded';
        expect(detectProgrammaticFailure(output, '')).toBe('context_overflow');
      });

      it('should detect "token limit"', () => {
        const output = 'The token limit has been reached';
        expect(detectProgrammaticFailure(output, '')).toBe('context_overflow');
      });

      it('should detect "maximum context"', () => {
        const output = 'Maximum context size reached';
        expect(detectProgrammaticFailure(output, '')).toBe('context_overflow');
      });

      it('should detect "context window"', () => {
        const output = 'Error: context window exceeded';
        expect(detectProgrammaticFailure(output, '')).toBe('context_overflow');
      });

      it('should detect "too many tokens"', () => {
        const output = 'Error: too many tokens in request';
        expect(detectProgrammaticFailure(output, '')).toBe('context_overflow');
      });
    });

    describe('rate limit detection', () => {
      it('should detect "rate limit"', () => {
        const output = 'rate limit exceeded';
        expect(detectProgrammaticFailure(output, '')).toBe('rate_limit');
      });

      it('should detect "too many requests"', () => {
        const output = 'Error: too many requests';
        expect(detectProgrammaticFailure(output, '')).toBe('rate_limit');
      });

      it('should detect "429 too many requests"', () => {
        const output = 'HTTP 429 too many requests';
        expect(detectProgrammaticFailure(output, '')).toBe('rate_limit');
      });

      it('should detect "quota exceeded"', () => {
        const output = 'quota exceeded for this billing period';
        expect(detectProgrammaticFailure(output, '')).toBe('rate_limit');
      });

      it('should detect "throttled"', () => {
        const output = 'Request throttled due to high load';
        expect(detectProgrammaticFailure(output, '')).toBe('rate_limit');
      });
    });

    describe('API error detection', () => {
      it('should detect "api error"', () => {
        const output = 'API error occurred';
        expect(detectProgrammaticFailure(output, '')).toBe('api_error');
      });

      it('should detect "internal server error"', () => {
        const output = 'Internal Server Error';
        expect(detectProgrammaticFailure(output, '')).toBe('api_error');
      });

      it('should detect "500 server error"', () => {
        const output = 'HTTP 500 Internal Server Error';
        expect(detectProgrammaticFailure(output, '')).toBe('api_error');
      });

      it('should detect "502 bad gateway"', () => {
        const output = '502 Bad Gateway';
        expect(detectProgrammaticFailure(output, '')).toBe('api_error');
      });

      it('should detect "503 service unavailable"', () => {
        const output = '503 Service Unavailable';
        expect(detectProgrammaticFailure(output, '')).toBe('api_error');
      });

      it('should detect "APIError"', () => {
        const output = 'APIError: Something went wrong';
        expect(detectProgrammaticFailure(output, '')).toBe('api_error');
      });
    });

    describe('timeout detection', () => {
      it('should detect "timeout" in failure reason', () => {
        expect(detectProgrammaticFailure('', 'Task timeout')).toBe('timeout');
      });

      it('should detect "timed out" in failure reason', () => {
        expect(detectProgrammaticFailure('', 'Task timed out after 60 minutes')).toBe('timeout');
      });
    });

    describe('non-programmatic failures', () => {
      it('should return null for regular failures', () => {
        const output = 'Error: Could not find file foo.txt';
        expect(detectProgrammaticFailure(output, 'File not found')).toBeNull();
      });

      it('should return null for test failures', () => {
        const output = 'FAILED: 3 tests failed';
        expect(detectProgrammaticFailure(output, 'Tests failed')).toBeNull();
      });

      it('should return null for compilation errors', () => {
        const output = 'error TS2304: Cannot find name "foo"';
        expect(detectProgrammaticFailure(output, 'Compilation failed')).toBeNull();
      });
    });

    describe('priority ordering', () => {
      it('should prioritize context overflow over rate limit', () => {
        const output = 'context length exceeded, rate limit warning';
        expect(detectProgrammaticFailure(output, '')).toBe('context_overflow');
      });

      it('should prioritize rate limit over api error', () => {
        const output = 'API error: rate limit exceeded';
        expect(detectProgrammaticFailure(output, '')).toBe('rate_limit');
      });
    });
  });

  describe('generateProgrammaticReport', () => {
    describe('api_error report', () => {
      it('should generate API error report with correct structure', () => {
        const report = generateProgrammaticReport('api_error', 'API error', 'error output');

        expect(report).toContain('## Failure Reason');
        expect(report).toContain('API error occurred');
        expect(report).toContain('## Analysis');
        expect(report).toContain('## Suggested Fix');
        expect(report).toContain('## Relevant Output');
        expect(report).toContain('<promise>FAILED</promise>');
      });

      it('should include relevant output in code block', () => {
        const report = generateProgrammaticReport('api_error', 'API error', 'some error message');

        expect(report).toContain('```');
        expect(report).toContain('some error message');
      });
    });

    describe('rate_limit report', () => {
      it('should generate rate limit report with correct structure', () => {
        const report = generateProgrammaticReport('rate_limit', 'Rate limited', 'output');

        expect(report).toContain('## Failure Reason');
        expect(report).toContain('Rate limit exceeded');
        expect(report).toContain('## Analysis');
        expect(report).toContain('## Suggested Fix');
        expect(report).toContain('Wait 1-2 minutes');
        expect(report).toContain('<promise>FAILED</promise>');
      });
    });

    describe('timeout report', () => {
      it('should generate timeout report with correct structure', () => {
        const report = generateProgrammaticReport('timeout', 'Task timed out', 'output');

        expect(report).toContain('## Failure Reason');
        expect(report).toContain('timed out');
        expect(report).toContain('## Analysis');
        expect(report).toContain('## Suggested Fix');
        expect(report).toContain('--timeout');
        expect(report).toContain('<promise>FAILED</promise>');
      });
    });

    describe('context_overflow report', () => {
      it('should generate context overflow report with correct structure', () => {
        const report = generateProgrammaticReport('context_overflow', 'Context exceeded', 'output');

        expect(report).toContain('## Failure Reason');
        expect(report).toContain('Context window exceeded');
        expect(report).toContain('## Analysis');
        expect(report).toContain('## Suggested Fix');
        expect(report).toContain('smaller');
        expect(report).toContain('<promise>FAILED</promise>');
      });
    });

    describe('output truncation', () => {
      it('should truncate long output', () => {
        const longOutput = Array(100).fill('Line of output').join('\n');
        const report = generateProgrammaticReport('api_error', 'Error', longOutput);

        expect(report).toContain('...(truncated)');
      });

      it('should not truncate short output', () => {
        const shortOutput = 'Short error message';
        const report = generateProgrammaticReport('api_error', 'Error', shortOutput);

        expect(report).not.toContain('...(truncated)');
      });
    });
  });

  describe('analyzeFailure', () => {
    describe('programmatic failures', () => {
      it('should handle context overflow without API call', async () => {
        const output = 'Error: context length exceeded';
        const result = await analyzeFailure(output, 'Context overflow', '001');

        expect(result).toContain('## Failure Reason');
        expect(result).toContain('Context window exceeded');
        expect(result).toContain('<promise>FAILED</promise>');
      });

      it('should handle rate limit without API call', async () => {
        const output = 'rate limit exceeded';
        const result = await analyzeFailure(output, 'Rate limited', '002');

        expect(result).toContain('## Failure Reason');
        expect(result).toContain('Rate limit exceeded');
        expect(result).toContain('<promise>FAILED</promise>');
      });

      it('should handle timeout without API call', async () => {
        const output = 'Task running...';
        const result = await analyzeFailure(output, 'Task timed out', '003');

        expect(result).toContain('## Failure Reason');
        expect(result).toContain('timed out');
        expect(result).toContain('<promise>FAILED</promise>');
      });

      it('should handle API error without API call', async () => {
        const output = '500 Internal Server Error';
        const result = await analyzeFailure(output, 'API failed', '004');

        expect(result).toContain('## Failure Reason');
        expect(result).toContain('API error');
        expect(result).toContain('<promise>FAILED</promise>');
      });
    });

    describe('all failure reports end with FAILED marker', () => {
      const failureTypes: ProgrammaticFailureType[] = ['api_error', 'rate_limit', 'timeout', 'context_overflow'];

      for (const type of failureTypes) {
        it(`should end with <promise>FAILED</promise> for ${type}`, () => {
          const report = generateProgrammaticReport(type, 'reason', 'output');
          expect(report.trim().endsWith('<promise>FAILED</promise>')).toBe(true);
        });
      }
    });

    describe('report structure', () => {
      it('should include all required sections for programmatic failures', async () => {
        const result = await analyzeFailure('context length exceeded', 'Error', '001');

        // Check all required sections are present
        expect(result).toContain('## Failure Reason');
        expect(result).toContain('## Analysis');
        expect(result).toContain('## Suggested Fix');
        expect(result).toContain('## Relevant Output');
        expect(result).toContain('<promise>FAILED</promise>');
      });
    });
  });
});
