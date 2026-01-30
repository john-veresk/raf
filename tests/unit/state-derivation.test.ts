import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  parseOutcomeStatus,
  deriveProjectState,
  getNextPendingTask,
  getNextExecutableTask,
  getDerivedStats,
  isProjectComplete,
  hasProjectFailed,
} from '../../src/core/state-derivation.js';

describe('state-derivation', () => {
  let tempDir: string;
  let projectPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-test-'));
    projectPath = path.join(tempDir, '001-test-project');
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'plans'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'outcomes'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('parseOutcomeStatus', () => {
    it('should parse SUCCESS status', () => {
      const content = `## Status: SUCCESS

# Task 001 - Completed

## Summary
Task was successful.
`;
      expect(parseOutcomeStatus(content)).toBe('completed');
    });

    it('should parse FAILED status', () => {
      const content = `## Status: FAILED

# Task 001 - Failed

## Failure Reason
Something went wrong.
`;
      expect(parseOutcomeStatus(content)).toBe('failed');
    });

    it('should return null for missing status', () => {
      const content = `# Task 001 - Completed

## Summary
Old format without status marker.
`;
      expect(parseOutcomeStatus(content)).toBeNull();
    });

    it('should return null for empty content', () => {
      expect(parseOutcomeStatus('')).toBeNull();
    });
  });

  describe('deriveProjectState', () => {
    it('should return empty tasks for empty project', () => {
      const state = deriveProjectState(projectPath);
      expect(state.tasks).toEqual([]);
    });

    it('should derive tasks from plan files', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '001-first-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '002-second-task.md'), '# Task 2');

      const state = deriveProjectState(projectPath);
      expect(state.tasks).toHaveLength(2);
      expect(state.tasks[0]?.id).toBe('001');
      expect(state.tasks[0]?.planFile).toBe('plans/001-first-task.md');
      expect(state.tasks[0]?.status).toBe('pending');
      expect(state.tasks[1]?.id).toBe('002');
    });

    it('should match outcome statuses to tasks', () => {
      // Create plan files
      fs.writeFileSync(path.join(projectPath, 'plans', '001-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '002-task.md'), '# Task 2');
      fs.writeFileSync(path.join(projectPath, 'plans', '003-task.md'), '# Task 3');

      // Create outcome files with status markers
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '001-task.md'),
        '## Status: SUCCESS\n\n# Task 001 - Completed'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '002-task.md'),
        '## Status: FAILED\n\n# Task 002 - Failed'
      );

      const state = deriveProjectState(projectPath);
      expect(state.tasks).toHaveLength(3);
      expect(state.tasks[0]?.status).toBe('completed');
      expect(state.tasks[1]?.status).toBe('failed');
      expect(state.tasks[2]?.status).toBe('pending');
    });

    it('should ignore outcome files without status marker', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '001-task.md'), '# Task 1');
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '001-task.md'),
        '# Task 001 - Completed (old format)'
      );

      const state = deriveProjectState(projectPath);
      expect(state.tasks[0]?.status).toBe('pending');
    });

    it('should ignore SUMMARY.md in outcomes', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '001-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'outcomes', 'SUMMARY.md'), '# Summary');

      const state = deriveProjectState(projectPath);
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0]?.status).toBe('pending');
    });
  });

  describe('getNextPendingTask', () => {
    it('should return first pending task', () => {
      const state = {
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'pending' as const },
          { id: '003', planFile: 'plans/003.md', status: 'pending' as const },
        ],
      };
      const task = getNextPendingTask(state);
      expect(task?.id).toBe('002');
    });

    it('should return null when no pending tasks', () => {
      const state = {
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'failed' as const },
        ],
      };
      const task = getNextPendingTask(state);
      expect(task).toBeNull();
    });
  });

  describe('getNextExecutableTask', () => {
    it('should prefer pending tasks over failed', () => {
      const state = {
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'failed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'pending' as const },
        ],
      };
      const task = getNextExecutableTask(state);
      expect(task?.id).toBe('002');
    });

    it('should return failed task when no pending', () => {
      const state = {
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'failed' as const },
        ],
      };
      const task = getNextExecutableTask(state);
      expect(task?.id).toBe('002');
    });
  });

  describe('getDerivedStats', () => {
    it('should calculate correct stats', () => {
      const state = {
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'failed' as const },
          { id: '003', planFile: 'plans/003.md', status: 'pending' as const },
          { id: '004', planFile: 'plans/004.md', status: 'pending' as const },
        ],
      };
      const stats = getDerivedStats(state);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(2);
      expect(stats.total).toBe(4);
    });
  });

  describe('isProjectComplete', () => {
    it('should return true when all tasks completed', () => {
      const state = {
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'completed' as const },
        ],
      };
      expect(isProjectComplete(state)).toBe(true);
    });

    it('should return false when some tasks pending', () => {
      const state = {
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'pending' as const },
        ],
      };
      expect(isProjectComplete(state)).toBe(false);
    });

    it('should return false when some tasks failed', () => {
      const state = {
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'failed' as const },
        ],
      };
      expect(isProjectComplete(state)).toBe(false);
    });

    it('should return true for empty project', () => {
      const state = { tasks: [] };
      expect(isProjectComplete(state)).toBe(true);
    });
  });

  describe('hasProjectFailed', () => {
    it('should return true when any task failed', () => {
      const state = {
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'failed' as const },
        ],
      };
      expect(hasProjectFailed(state)).toBe(true);
    });

    it('should return false when no tasks failed', () => {
      const state = {
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'pending' as const },
        ],
      };
      expect(hasProjectFailed(state)).toBe(false);
    });
  });
});
