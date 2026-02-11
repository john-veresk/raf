import {
  SYMBOLS,
  formatTaskProgress,
  formatProjectHeader,
  formatSummary,
  formatProgressBar,
  formatNumber,
  formatCost,
  formatTaskTokenSummary,
  formatTokenTotalSummary,
  formatRateLimitPercentage,
  TokenSummaryOptions,
  TaskStatus,
} from '../../src/utils/terminal-symbols.js';
import type { UsageData } from '../../src/types/config.js';
import type { CostBreakdown, TaskUsageEntry } from '../../src/utils/token-tracker.js';

describe('Terminal Symbols', () => {
  describe('SYMBOLS', () => {
    it('should have all required symbols', () => {
      expect(SYMBOLS.running).toBe('●');
      expect(SYMBOLS.completed).toBe('✓');
      expect(SYMBOLS.failed).toBe('✗');
      expect(SYMBOLS.pending).toBe('○');
      expect(SYMBOLS.blocked).toBe('⊘');
      expect(SYMBOLS.project).toBe('▶');
    });

    it('should be a const object with correct types', () => {
      // TypeScript's 'as const' provides compile-time immutability
      // Verify all expected keys exist
      expect(Object.keys(SYMBOLS)).toEqual(['running', 'completed', 'failed', 'pending', 'blocked', 'project']);
    });
  });

  describe('formatTaskProgress', () => {
    it('should format a running task with elapsed time', () => {
      const result = formatTaskProgress(1, 5, 'running', 'auth-login', 83000);
      expect(result).toBe('● auth-login 1m 23s');
    });

    it('should format a running task without elapsed time', () => {
      const result = formatTaskProgress(1, 5, 'running', 'auth-login');
      expect(result).toBe('● auth-login 1/5');
    });

    it('should format a completed task without elapsed time', () => {
      const result = formatTaskProgress(3, 5, 'completed', 'setup-db');
      expect(result).toBe('✓ setup-db 3/5');
    });

    it('should format a completed task with elapsed time', () => {
      const result = formatTaskProgress(3, 5, 'completed', 'setup-db', 154000);
      expect(result).toBe('✓ setup-db 2m 34s');
    });

    it('should format a failed task without elapsed time', () => {
      const result = formatTaskProgress(2, 5, 'failed', 'deploy');
      expect(result).toBe('✗ deploy 2/5');
    });

    it('should format a failed task with elapsed time', () => {
      const result = formatTaskProgress(2, 5, 'failed', 'deploy', 45000);
      expect(result).toBe('✗ deploy 45s');
    });

    it('should format a pending task', () => {
      const result = formatTaskProgress(4, 5, 'pending', 'cleanup');
      expect(result).toBe('○ cleanup 4/5');
    });

    it('should truncate long task names', () => {
      const longName = 'this-is-a-very-long-task-name-that-should-be-truncated-for-display';
      const result = formatTaskProgress(1, 1, 'running', longName);
      expect(result).toContain('…');
      expect(result.length).toBeLessThan(60);
    });

    it('should handle empty task name', () => {
      const result = formatTaskProgress(1, 1, 'pending', '');
      expect(result).toBe('○ task 1/1');
    });

    it('should handle zero elapsed time for running task', () => {
      const result = formatTaskProgress(1, 1, 'running', 'test', 0);
      expect(result).toBe('● test 0s');
    });

    it('should format a blocked task', () => {
      const result = formatTaskProgress(2, 5, 'blocked', 'depends-on-failed');
      expect(result).toBe('⊘ depends-on-failed 2/5');
    });

    it('should include task ID prefix when provided', () => {
      const result = formatTaskProgress(1, 5, 'running', 'auth-login', undefined, '001');
      expect(result).toBe('● 001-auth-login 1/5');
    });

    it('should include task ID prefix with elapsed time', () => {
      const result = formatTaskProgress(1, 5, 'completed', 'auth-login', 83000, '001');
      expect(result).toBe('✓ 001-auth-login 1m 23s');
    });

    it('should include task ID prefix for blocked tasks', () => {
      const result = formatTaskProgress(2, 5, 'blocked', 'depends-on-failed', undefined, '002');
      expect(result).toBe('⊘ 002-depends-on-failed 2/5');
    });

    it('should include task ID prefix for failed tasks with elapsed time', () => {
      const result = formatTaskProgress(3, 5, 'failed', 'deploy', 45000, '003');
      expect(result).toBe('✗ 003-deploy 45s');
    });
  });

  describe('formatProjectHeader', () => {
    it('should format project header with multiple tasks', () => {
      const result = formatProjectHeader('my-project', 5);
      expect(result).toBe('▶ my-project (5 tasks)');
    });

    it('should format project header with single task', () => {
      const result = formatProjectHeader('small-project', 1);
      expect(result).toBe('▶ small-project (1 task)');
    });

    it('should format project header with zero tasks', () => {
      const result = formatProjectHeader('empty-project', 0);
      expect(result).toBe('▶ empty-project (0 tasks)');
    });

    it('should truncate long project names', () => {
      const longName = 'this-is-a-very-very-long-project-name-that-exceeds-fifty-chars';
      const result = formatProjectHeader(longName, 3);
      expect(result).toContain('…');
      expect(result.length).toBeLessThan(70);
    });

    it('should handle empty project name', () => {
      const result = formatProjectHeader('', 5);
      expect(result).toBe('▶ project (5 tasks)');
    });
  });

  describe('formatSummary', () => {
    it('should format all completed with elapsed time', () => {
      const result = formatSummary(5, 0, 0, 754000);
      expect(result).toBe('✓ 5/5 completed in 12m 34s');
    });

    it('should format all completed without elapsed time', () => {
      const result = formatSummary(5, 0, 0);
      expect(result).toBe('✓ 5/5 completed');
    });

    it('should format with failures', () => {
      const result = formatSummary(3, 2, 0);
      expect(result).toBe('✗ 3/5 (2 failed)');
    });

    it('should format single failure', () => {
      const result = formatSummary(4, 1, 0);
      expect(result).toBe('✗ 4/5 (1 failed)');
    });

    it('should format with pending tasks', () => {
      const result = formatSummary(3, 0, 2);
      expect(result).toBe('✓ 3/5 completed');
    });

    it('should format with mixed status', () => {
      const result = formatSummary(2, 1, 2);
      expect(result).toBe('✗ 2/5 (1 failed)');
    });

    it('should handle zero total tasks', () => {
      const result = formatSummary(0, 0, 0);
      expect(result).toBe('○ no tasks');
    });

    it('should ignore elapsed time when there are failures', () => {
      const result = formatSummary(3, 2, 0, 60000);
      expect(result).toBe('✗ 3/5 (2 failed)');
    });

    it('should format with blocked tasks only', () => {
      const result = formatSummary(3, 0, 0, undefined, 2);
      expect(result).toBe('✗ 3/5 (2 blocked)');
    });

    it('should format single blocked task', () => {
      const result = formatSummary(4, 0, 0, undefined, 1);
      expect(result).toBe('✗ 4/5 (1 blocked)');
    });

    it('should format with failures and blocked tasks', () => {
      const result = formatSummary(2, 1, 0, undefined, 2);
      expect(result).toBe('✗ 2/5 (1 failed, 2 blocked)');
    });

    it('should include blocked in total count', () => {
      const result = formatSummary(2, 1, 1, undefined, 1);
      expect(result).toBe('✗ 2/5 (1 failed, 1 blocked)');
    });
  });

  describe('formatProgressBar', () => {
    it('should format a sequence of task statuses', () => {
      const tasks: TaskStatus[] = ['completed', 'completed', 'running', 'pending', 'pending'];
      const result = formatProgressBar(tasks);
      expect(result).toBe('✓✓●○○');
    });

    it('should format all completed', () => {
      const tasks: TaskStatus[] = ['completed', 'completed', 'completed'];
      const result = formatProgressBar(tasks);
      expect(result).toBe('✓✓✓');
    });

    it('should format with failures', () => {
      const tasks: TaskStatus[] = ['completed', 'failed', 'pending'];
      const result = formatProgressBar(tasks);
      expect(result).toBe('✓✗○');
    });

    it('should format single task', () => {
      const tasks: TaskStatus[] = ['running'];
      const result = formatProgressBar(tasks);
      expect(result).toBe('●');
    });

    it('should handle empty array', () => {
      const result = formatProgressBar([]);
      expect(result).toBe('');
    });

    it('should format blocked tasks', () => {
      const tasks: TaskStatus[] = ['completed', 'failed', 'blocked', 'pending'];
      const result = formatProgressBar(tasks);
      expect(result).toBe('✓✗⊘○');
    });
  });

  describe('formatNumber', () => {
    it('should format small numbers without separators', () => {
      expect(formatNumber(42)).toBe('42');
    });

    it('should format numbers with thousands separators', () => {
      expect(formatNumber(12345)).toBe('12,345');
    });

    it('should format large numbers', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should format zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatCost', () => {
    it('should format zero cost', () => {
      expect(formatCost(0)).toBe('$0.00');
    });

    it('should format normal costs with 2 decimals', () => {
      expect(formatCost(1.23)).toBe('$1.23');
    });

    it('should format small costs with 4 decimals', () => {
      expect(formatCost(0.0042)).toBe('$0.0042');
    });

    it('should format costs just at the threshold', () => {
      expect(formatCost(0.01)).toBe('$0.01');
    });

    it('should format costs below threshold', () => {
      expect(formatCost(0.009)).toBe('$0.0090');
    });
  });

  describe('formatTaskTokenSummary', () => {
    const makeUsage = (overrides: Partial<UsageData> = {}): UsageData => ({
      inputTokens: 5234,
      outputTokens: 1023,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      modelUsage: {},
      ...overrides,
    });

    const makeCost = (total: number): CostBreakdown => ({
      inputCost: 0,
      outputCost: 0,
      cacheReadCost: 0,
      cacheCreateCost: 0,
      totalCost: total,
    });

    const makeEntry = (usage: UsageData, cost: CostBreakdown, attempts?: UsageData[]): TaskUsageEntry => ({
      taskId: '01',
      usage,
      cost,
      attempts: attempts ?? [usage],
    });

    describe('single-attempt tasks', () => {
      it('should format basic token summary without cache', () => {
        const usage = makeUsage();
        const result = formatTaskTokenSummary(makeEntry(usage, makeCost(0.42)));
        expect(result).toBe('  Tokens: 5,234 in / 1,023 out | Est. cost: $0.42');
      });

      it('should include cache read tokens', () => {
        const usage = makeUsage({ cacheReadInputTokens: 18500 });
        const result = formatTaskTokenSummary(makeEntry(usage, makeCost(0.42)));
        expect(result).toBe('  Tokens: 5,234 in / 1,023 out | Cache: 18,500 read | Est. cost: $0.42');
      });

      it('should include cache creation tokens', () => {
        const usage = makeUsage({ cacheCreationInputTokens: 5000 });
        const result = formatTaskTokenSummary(makeEntry(usage, makeCost(0.55)));
        expect(result).toBe('  Tokens: 5,234 in / 1,023 out | Cache: 5,000 created | Est. cost: $0.55');
      });

      it('should include both cache read and creation tokens', () => {
        const usage = makeUsage({ cacheReadInputTokens: 18500, cacheCreationInputTokens: 5000 });
        const result = formatTaskTokenSummary(makeEntry(usage, makeCost(0.75)));
        expect(result).toBe('  Tokens: 5,234 in / 1,023 out | Cache: 18,500 read / 5,000 created | Est. cost: $0.75');
      });

      it('should format small costs with 4 decimal places', () => {
        const usage = makeUsage();
        const result = formatTaskTokenSummary(makeEntry(usage, makeCost(0.0042)));
        expect(result).toBe('  Tokens: 5,234 in / 1,023 out | Est. cost: $0.0042');
      });

      it('should format single-attempt task with empty attempts array as single-line', () => {
        const usage = makeUsage();
        const result = formatTaskTokenSummary(makeEntry(usage, makeCost(0.42), []));
        expect(result).toBe('  Tokens: 5,234 in / 1,023 out | Est. cost: $0.42');
      });
    });

    describe('multi-attempt tasks', () => {
      it('should show per-attempt breakdown with costs when calculateAttemptCost provided', () => {
        const attempt1 = makeUsage({ inputTokens: 1234, outputTokens: 567 });
        const attempt2 = makeUsage({ inputTokens: 2345, outputTokens: 890 });
        const totalUsage = makeUsage({ inputTokens: 3579, outputTokens: 1457 });
        const entry = makeEntry(totalUsage, makeCost(0.06), [attempt1, attempt2]);

        const calculateCost = (usage: UsageData): CostBreakdown => ({
          inputCost: 0,
          outputCost: 0,
          cacheReadCost: 0,
          cacheCreateCost: 0,
          totalCost: usage.inputTokens === 1234 ? 0.02 : 0.04,
        });

        const result = formatTaskTokenSummary(entry, calculateCost);
        const lines = result.split('\n');

        expect(lines).toHaveLength(3);
        expect(lines[0]).toBe('    Attempt 1: 1,234 in / 567 out | Est. cost: $0.02');
        expect(lines[1]).toBe('    Attempt 2: 2,345 in / 890 out | Est. cost: $0.04');
        expect(lines[2]).toBe('    Total: 3,579 in / 1,457 out | Est. cost: $0.06');
      });

      it('should show per-attempt breakdown without costs when no calculateAttemptCost', () => {
        const attempt1 = makeUsage({ inputTokens: 1000, outputTokens: 200 });
        const attempt2 = makeUsage({ inputTokens: 2000, outputTokens: 400 });
        const totalUsage = makeUsage({ inputTokens: 3000, outputTokens: 600 });
        const entry = makeEntry(totalUsage, makeCost(0.05), [attempt1, attempt2]);

        const result = formatTaskTokenSummary(entry);
        const lines = result.split('\n');

        expect(lines).toHaveLength(3);
        expect(lines[0]).toBe('    Attempt 1: 1,000 in / 200 out | Est. cost: $0.00');
        expect(lines[1]).toBe('    Attempt 2: 2,000 in / 400 out | Est. cost: $0.00');
        expect(lines[2]).toBe('    Total: 3,000 in / 600 out | Est. cost: $0.05');
      });

      it('should include cache tokens in per-attempt breakdown', () => {
        const attempt1 = makeUsage({ inputTokens: 1000, outputTokens: 200, cacheReadInputTokens: 5000 });
        const attempt2 = makeUsage({ inputTokens: 1500, outputTokens: 300, cacheCreationInputTokens: 2000 });
        const totalUsage = makeUsage({
          inputTokens: 2500,
          outputTokens: 500,
          cacheReadInputTokens: 5000,
          cacheCreationInputTokens: 2000,
        });
        const entry = makeEntry(totalUsage, makeCost(0.08), [attempt1, attempt2]);

        const result = formatTaskTokenSummary(entry);
        const lines = result.split('\n');

        expect(lines).toHaveLength(3);
        expect(lines[0]).toContain('Cache: 5,000 read');
        expect(lines[1]).toContain('Cache: 2,000 created');
        expect(lines[2]).toContain('Cache: 5,000 read / 2,000 created');
      });

      it('should handle three or more attempts', () => {
        const attempt1 = makeUsage({ inputTokens: 500, outputTokens: 100 });
        const attempt2 = makeUsage({ inputTokens: 600, outputTokens: 120 });
        const attempt3 = makeUsage({ inputTokens: 700, outputTokens: 140 });
        const totalUsage = makeUsage({ inputTokens: 1800, outputTokens: 360 });
        const entry = makeEntry(totalUsage, makeCost(0.10), [attempt1, attempt2, attempt3]);

        const result = formatTaskTokenSummary(entry);
        const lines = result.split('\n');

        expect(lines).toHaveLength(4);
        expect(lines[0]).toContain('Attempt 1');
        expect(lines[1]).toContain('Attempt 2');
        expect(lines[2]).toContain('Attempt 3');
        expect(lines[3]).toContain('Total');
      });
    });
  });

  describe('formatTokenTotalSummary', () => {
    const makeUsage = (overrides: Partial<UsageData> = {}): UsageData => ({
      inputTokens: 45678,
      outputTokens: 12345,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      modelUsage: {},
      ...overrides,
    });

    const makeCost = (total: number): CostBreakdown => ({
      inputCost: 0,
      outputCost: 0,
      cacheReadCost: 0,
      cacheCreateCost: 0,
      totalCost: total,
    });

    it('should format total summary without cache', () => {
      const result = formatTokenTotalSummary(makeUsage(), makeCost(3.75));
      expect(result).toContain('Token Usage Summary');
      expect(result).toContain('Total tokens: 45,678 in / 12,345 out');
      expect(result).toContain('Estimated cost: $3.75');
      expect(result).not.toContain('Cache:');
    });

    it('should include cache read in total summary', () => {
      const result = formatTokenTotalSummary(
        makeUsage({ cacheReadInputTokens: 125000 }),
        makeCost(3.75)
      );
      expect(result).toContain('Cache: 125,000 read');
    });

    it('should include cache creation in total summary', () => {
      const result = formatTokenTotalSummary(
        makeUsage({ cacheCreationInputTokens: 8000 }),
        makeCost(3.75)
      );
      expect(result).toContain('Cache: 8,000 created');
    });

    it('should include both cache types in total summary', () => {
      const result = formatTokenTotalSummary(
        makeUsage({ cacheReadInputTokens: 125000, cacheCreationInputTokens: 8000 }),
        makeCost(3.75)
      );
      expect(result).toContain('Cache: 125,000 read / 8,000 created');
    });

    it('should have divider lines', () => {
      const result = formatTokenTotalSummary(makeUsage(), makeCost(3.75));
      const lines = result.split('\n');
      expect(lines[0]).toContain('──');
      expect(lines[lines.length - 1]).toContain('──');
    });

    it('should include rate limit percentage when option enabled', () => {
      const options: TokenSummaryOptions = {
        showRateLimitEstimate: true,
        rateLimitPercentage: 42.5,
      };
      const result = formatTokenTotalSummary(makeUsage(), makeCost(3.75), options);
      expect(result).toContain('~43% of 5h window');
    });

    it('should not include rate limit when option disabled', () => {
      const options: TokenSummaryOptions = {
        showRateLimitEstimate: false,
        rateLimitPercentage: 42.5,
      };
      const result = formatTokenTotalSummary(makeUsage(), makeCost(3.75), options);
      expect(result).not.toContain('5h window');
    });

    it('should hide cache tokens when option disabled', () => {
      const options: TokenSummaryOptions = {
        showCacheTokens: false,
      };
      const result = formatTokenTotalSummary(
        makeUsage({ cacheReadInputTokens: 125000 }),
        makeCost(3.75),
        options
      );
      expect(result).not.toContain('Cache:');
    });
  });

  describe('formatRateLimitPercentage', () => {
    it('should format zero percentage', () => {
      expect(formatRateLimitPercentage(0)).toBe('~0% of 5h window');
    });

    it('should format very small percentages with 2 decimals', () => {
      expect(formatRateLimitPercentage(0.05)).toBe('~0.05% of 5h window');
    });

    it('should format small percentages with 1 decimal', () => {
      expect(formatRateLimitPercentage(0.5)).toBe('~0.5% of 5h window');
    });

    it('should round percentages >= 1', () => {
      expect(formatRateLimitPercentage(1.5)).toBe('~2% of 5h window');
      expect(formatRateLimitPercentage(42.3)).toBe('~42% of 5h window');
      expect(formatRateLimitPercentage(100)).toBe('~100% of 5h window');
    });

    it('should handle percentages over 100%', () => {
      expect(formatRateLimitPercentage(150.7)).toBe('~151% of 5h window');
    });
  });

  describe('formatTaskTokenSummary with options', () => {
    const makeUsage = (overrides: Partial<UsageData> = {}): UsageData => ({
      inputTokens: 5234,
      outputTokens: 1023,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      modelUsage: {},
      ...overrides,
    });

    const makeCost = (total: number): CostBreakdown => ({
      inputCost: 0,
      outputCost: 0,
      cacheReadCost: 0,
      cacheCreateCost: 0,
      totalCost: total,
    });

    const makeEntry = (usage: UsageData, cost: CostBreakdown, attempts?: UsageData[]): TaskUsageEntry => ({
      taskId: '01',
      usage,
      cost,
      attempts: attempts ?? [usage],
    });

    it('should include rate limit percentage in single-attempt summary', () => {
      const usage = makeUsage({ cacheReadInputTokens: 18500 });
      const entry = makeEntry(usage, makeCost(0.42));
      const options: TokenSummaryOptions = {
        showRateLimitEstimate: true,
        rateLimitPercentage: 2.5,
      };

      const result = formatTaskTokenSummary(entry, undefined, options);
      expect(result).toContain('~3% of 5h window');
    });

    it('should hide cache tokens in single-attempt summary when disabled', () => {
      const usage = makeUsage({ cacheReadInputTokens: 18500 });
      const entry = makeEntry(usage, makeCost(0.42));
      const options: TokenSummaryOptions = {
        showCacheTokens: false,
      };

      const result = formatTaskTokenSummary(entry, undefined, options);
      expect(result).not.toContain('Cache:');
    });

    it('should only show rate limit on total line in multi-attempt summary', () => {
      const attempt1 = makeUsage({ inputTokens: 1000, outputTokens: 200 });
      const attempt2 = makeUsage({ inputTokens: 2000, outputTokens: 400 });
      const totalUsage = makeUsage({ inputTokens: 3000, outputTokens: 600 });
      const entry = makeEntry(totalUsage, makeCost(0.05), [attempt1, attempt2]);
      const options: TokenSummaryOptions = {
        showRateLimitEstimate: true,
        rateLimitPercentage: 1.5,
      };

      const result = formatTaskTokenSummary(entry, undefined, options);
      const lines = result.split('\n');

      // Rate limit should only appear on the Total line
      expect(lines[0]).not.toContain('5h window'); // Attempt 1
      expect(lines[1]).not.toContain('5h window'); // Attempt 2
      expect(lines[2]).toContain('~2% of 5h window'); // Total
    });

    it('should respect showCacheTokens in multi-attempt summary', () => {
      const attempt1 = makeUsage({ inputTokens: 1000, outputTokens: 200, cacheReadInputTokens: 5000 });
      const attempt2 = makeUsage({ inputTokens: 1500, outputTokens: 300, cacheCreationInputTokens: 2000 });
      const totalUsage = makeUsage({
        inputTokens: 2500,
        outputTokens: 500,
        cacheReadInputTokens: 5000,
        cacheCreationInputTokens: 2000,
      });
      const entry = makeEntry(totalUsage, makeCost(0.08), [attempt1, attempt2]);
      const options: TokenSummaryOptions = {
        showCacheTokens: false,
      };

      const result = formatTaskTokenSummary(entry, undefined, options);
      expect(result).not.toContain('Cache:');
    });
  });
});
