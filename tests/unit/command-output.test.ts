import { jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  SYMBOLS,
  formatTaskProgress,
  formatProjectHeader,
  formatSummary,
  formatProgressBar,
  TaskStatus,
} from '../../src/utils/terminal-symbols.js';
import { logger } from '../../src/utils/logger.js';

/**
 * Integration tests verifying that do/status commands produce expected output format.
 * These tests verify the integration between command output and terminal-symbols formatters.
 */
describe('Command Output Integration', () => {
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleWarnSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.configure({ verbose: false, debug: false });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Do Command Output Format', () => {
    describe('project header', () => {
      it('should use formatProjectHeader for project display', () => {
        const projectName = 'my-feature';
        const taskCount = 3;
        const expected = formatProjectHeader(projectName, taskCount);

        logger.info(expected);

        expect(consoleLogSpy).toHaveBeenCalledWith(`▶ ${projectName} (${taskCount} tasks)`);
      });

      it('should show singular "task" for single task project', () => {
        const output = formatProjectHeader('single-task-project', 1);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('▶ single-task-project (1 task)');
      });
    });

    describe('task progress output', () => {
      it('should show running task with elapsed time during execution', () => {
        const output = formatTaskProgress(1, 3, 'running', 'auth-login', 45000);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('● auth-login 45s');
      });

      it('should show completed task with elapsed time', () => {
        const output = formatTaskProgress(2, 3, 'completed', 'setup-db', 123000);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('✓ setup-db 2m 3s');
      });

      it('should show failed task with elapsed time', () => {
        const output = formatTaskProgress(3, 3, 'failed', 'deploy', 300000);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('✗ deploy 5m 0s');
      });

      it('should show pending task with fraction', () => {
        const output = formatTaskProgress(2, 5, 'pending', 'cleanup');
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('○ cleanup 2/5');
      });
    });

    describe('summary output', () => {
      it('should show success summary with elapsed time when all tasks complete', () => {
        const output = formatSummary(5, 0, 0, 754000);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('✓ 5/5 completed in 12m 34s');
      });

      it('should show success summary without time when time not provided', () => {
        const output = formatSummary(5, 0, 0);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('✓ 5/5 completed');
      });

      it('should show failure summary with failed count', () => {
        const output = formatSummary(3, 2, 0);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('✗ 3/5 (2 failed)');
      });

      it('should show single failure grammar', () => {
        const output = formatSummary(4, 1, 0);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('✗ 4/5 (1 failed)');
      });

      it('should show pending as success (not completed yet)', () => {
        const output = formatSummary(3, 0, 2);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('✓ 3/5 completed');
      });

      it('should show no tasks message for empty project', () => {
        const output = formatSummary(0, 0, 0);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('○ no tasks');
      });
    });

    describe('multi-project summary', () => {
      it('should show success symbol for completed project', () => {
        const symbol = SYMBOLS.completed;
        const projectName = 'feature-a';
        logger.info(`${symbol} ${projectName}`);

        expect(consoleLogSpy).toHaveBeenCalledWith('✓ feature-a');
      });

      it('should show failure symbol for failed project', () => {
        const symbol = SYMBOLS.failed;
        const projectName = 'feature-b';
        logger.info(`${symbol} ${projectName}`);

        expect(consoleLogSpy).toHaveBeenCalledWith('✗ feature-b');
      });
    });
  });

  describe('Status Command Output Format', () => {
    describe('project status display', () => {
      it('should use project symbol for project name', () => {
        const projectName = 'my-project';
        logger.info(`${SYMBOLS.project} ${projectName}`);

        expect(consoleLogSpy).toHaveBeenCalledWith('▶ my-project');
      });

      it('should show progress bar with count', () => {
        const tasks: TaskStatus[] = ['completed', 'completed', 'pending', 'pending', 'pending'];
        const progressBar = formatProgressBar(tasks);
        const counts = '(2/5)';

        logger.info(`${progressBar} ${counts}`);

        expect(consoleLogSpy).toHaveBeenCalledWith('✓✓○○○ (2/5)');
      });
    });

    describe('progress bar formats', () => {
      it('should show all completed tasks', () => {
        const tasks: TaskStatus[] = ['completed', 'completed', 'completed'];
        const output = formatProgressBar(tasks);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('✓✓✓');
      });

      it('should show mixed task states', () => {
        const tasks: TaskStatus[] = ['completed', 'failed', 'running', 'pending'];
        const output = formatProgressBar(tasks);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('✓✗●○');
      });

      it('should show all pending tasks', () => {
        const tasks: TaskStatus[] = ['pending', 'pending', 'pending'];
        const output = formatProgressBar(tasks);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('○○○');
      });

      it('should handle single running task', () => {
        const tasks: TaskStatus[] = ['running'];
        const output = formatProgressBar(tasks);
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('●');
      });
    });

    describe('project list display', () => {
      it('should format project list with progress bars', () => {
        // Simulates: "001 my-project ✓✓●○○ (2/5)"
        const projectNumber = '001';
        const projectName = 'my-project';
        const tasks: TaskStatus[] = ['completed', 'completed', 'running', 'pending', 'pending'];
        const progressBar = formatProgressBar(tasks);
        const counts = '(2/5)';

        const output = `${projectNumber} ${projectName} ${progressBar} ${counts}`;
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('001 my-project ✓✓●○○ (2/5)');
      });

      it('should format completed project in list', () => {
        const projectNumber = '002';
        const projectName = 'done-project';
        const tasks: TaskStatus[] = ['completed', 'completed', 'completed'];
        const progressBar = formatProgressBar(tasks);
        const counts = '(3/3)';

        const output = `${projectNumber} ${projectName} ${progressBar} ${counts}`;
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('002 done-project ✓✓✓ (3/3)');
      });

      it('should format project with failures in list', () => {
        const projectNumber = '003';
        const projectName = 'has-failures';
        const tasks: TaskStatus[] = ['completed', 'failed', 'pending'];
        const progressBar = formatProgressBar(tasks);
        const counts = '(1/3)';

        const output = `${projectNumber} ${projectName} ${progressBar} ${counts}`;
        logger.info(output);

        expect(consoleLogSpy).toHaveBeenCalledWith('003 has-failures ✓✗○ (1/3)');
      });
    });
  });

  describe('Symbol Consistency', () => {
    it('should use consistent symbols across all output', () => {
      // Verify all symbols are correctly defined
      expect(SYMBOLS.running).toBe('●');
      expect(SYMBOLS.completed).toBe('✓');
      expect(SYMBOLS.failed).toBe('✗');
      expect(SYMBOLS.pending).toBe('○');
      expect(SYMBOLS.project).toBe('▶');
    });

    it('should use same symbols in logger success/error', () => {
      logger.success('Task done');
      logger.error('Task failed');

      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Task done');
      expect(consoleErrorSpy).toHaveBeenCalledWith('✗ Task failed');
    });
  });

  describe('Edge Cases in Output', () => {
    it('should handle empty project name gracefully', () => {
      const output = formatProjectHeader('', 5);
      expect(output).toBe('▶ project (5 tasks)');
    });

    it('should handle zero tasks in header', () => {
      const output = formatProjectHeader('empty-project', 0);
      expect(output).toBe('▶ empty-project (0 tasks)');
    });

    it('should handle very long task name with truncation', () => {
      const longName = 'this-is-a-very-long-task-name-that-should-be-truncated-for-display';
      const output = formatTaskProgress(1, 1, 'running', longName, 1000);

      expect(output).toContain('…');
      expect(output.length).toBeLessThan(60);
    });

    it('should handle empty progress bar', () => {
      const output = formatProgressBar([]);
      expect(output).toBe('');
    });

    it('should handle zero elapsed time', () => {
      const output = formatTaskProgress(1, 1, 'running', 'test', 0);
      expect(output).toBe('● test 0s');
    });
  });
});
