import {
  SYMBOLS,
  formatTaskProgress,
  formatProjectHeader,
  formatSummary,
  formatProgressBar,
  TaskStatus,
} from '../../src/utils/terminal-symbols.js';

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
});
