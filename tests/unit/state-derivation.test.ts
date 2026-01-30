import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  parseOutcomeStatus,
  deriveProjectState,
  deriveProjectStatus,
  discoverProjects,
  getNextPendingTask,
  getNextExecutableTask,
  getDerivedStats,
  isProjectComplete,
  hasProjectFailed,
  type DerivedProjectStatus,
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

  describe('discoverProjects', () => {
    it('should return empty array for non-existent directory', () => {
      const projects = discoverProjects('/non-existent-dir');
      expect(projects).toEqual([]);
    });

    it('should return empty array for empty directory', () => {
      const rafDir = path.join(tempDir, 'RAF');
      fs.mkdirSync(rafDir);
      const projects = discoverProjects(rafDir);
      expect(projects).toEqual([]);
    });

    it('should discover projects matching NNN-name pattern', () => {
      const rafDir = path.join(tempDir, 'RAF');
      fs.mkdirSync(rafDir);
      fs.mkdirSync(path.join(rafDir, '001-first-project'));
      fs.mkdirSync(path.join(rafDir, '002-second-project'));
      fs.mkdirSync(path.join(rafDir, 'not-a-project'));
      fs.writeFileSync(path.join(rafDir, 'some-file.txt'), 'content');

      const projects = discoverProjects(rafDir);
      expect(projects).toHaveLength(2);
      expect(projects[0]?.number).toBe(1);
      expect(projects[0]?.name).toBe('first-project');
      expect(projects[0]?.path).toBe(path.join(rafDir, '001-first-project'));
      expect(projects[1]?.number).toBe(2);
      expect(projects[1]?.name).toBe('second-project');
    });

    it('should sort projects by number', () => {
      const rafDir = path.join(tempDir, 'RAF');
      fs.mkdirSync(rafDir);
      fs.mkdirSync(path.join(rafDir, '003-third'));
      fs.mkdirSync(path.join(rafDir, '001-first'));
      fs.mkdirSync(path.join(rafDir, '002-second'));

      const projects = discoverProjects(rafDir);
      expect(projects.map((p) => p.number)).toEqual([1, 2, 3]);
    });
  });

  describe('deriveProjectStatus', () => {
    it('should return planning when no plans exist', () => {
      fs.rmSync(path.join(projectPath, 'plans'), { recursive: true });
      const status = deriveProjectStatus(projectPath, []);
      expect(status).toBe('planning');
    });

    it('should return planning when plans directory is empty', () => {
      const status = deriveProjectStatus(projectPath, []);
      expect(status).toBe('planning');
    });

    it('should return ready when all tasks are pending', () => {
      const tasks = [
        { id: '001', planFile: 'plans/001.md', status: 'pending' as const },
        { id: '002', planFile: 'plans/002.md', status: 'pending' as const },
      ];
      const status = deriveProjectStatus(projectPath, tasks);
      expect(status).toBe('ready');
    });

    it('should return executing when some tasks are completed', () => {
      const tasks = [
        { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
        { id: '002', planFile: 'plans/002.md', status: 'pending' as const },
      ];
      const status = deriveProjectStatus(projectPath, tasks);
      expect(status).toBe('executing');
    });

    it('should return completed when all tasks are completed', () => {
      const tasks = [
        { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
        { id: '002', planFile: 'plans/002.md', status: 'completed' as const },
      ];
      const status = deriveProjectStatus(projectPath, tasks);
      expect(status).toBe('completed');
    });

    it('should return failed when any task has failed', () => {
      const tasks = [
        { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
        { id: '002', planFile: 'plans/002.md', status: 'failed' as const },
        { id: '003', planFile: 'plans/003.md', status: 'pending' as const },
      ];
      const status = deriveProjectStatus(projectPath, tasks);
      expect(status).toBe('failed');
    });
  });

  describe('deriveProjectState', () => {
    it('should return empty tasks and planning status for empty project', () => {
      const state = deriveProjectState(projectPath);
      expect(state.tasks).toEqual([]);
      expect(state.status).toBe('planning');
    });

    it('should derive tasks from plan files with ready status', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '001-first-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '002-second-task.md'), '# Task 2');

      const state = deriveProjectState(projectPath);
      expect(state.tasks).toHaveLength(2);
      expect(state.tasks[0]?.id).toBe('001');
      expect(state.tasks[0]?.planFile).toBe('plans/001-first-task.md');
      expect(state.tasks[0]?.status).toBe('pending');
      expect(state.tasks[1]?.id).toBe('002');
      expect(state.status).toBe('ready');
    });

    it('should match outcome statuses to tasks and derive failed status', () => {
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
      expect(state.status).toBe('failed');
    });

    it('should derive completed status when all tasks completed', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '001-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '002-task.md'), '# Task 2');
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '001-task.md'),
        '## Status: SUCCESS\n\n# Task 001 - Completed'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '002-task.md'),
        '## Status: SUCCESS\n\n# Task 002 - Completed'
      );

      const state = deriveProjectState(projectPath);
      expect(state.status).toBe('completed');
    });

    it('should derive executing status when some tasks completed', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '001-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '002-task.md'), '# Task 2');
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '001-task.md'),
        '## Status: SUCCESS\n\n# Task 001 - Completed'
      );

      const state = deriveProjectState(projectPath);
      expect(state.status).toBe('executing');
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

    it('should return planning status when no plans directory exists', () => {
      fs.rmSync(path.join(projectPath, 'plans'), { recursive: true });
      const state = deriveProjectState(projectPath);
      expect(state.tasks).toEqual([]);
      expect(state.status).toBe('planning');
    });
  });

  describe('getNextPendingTask', () => {
    it('should return first pending task', () => {
      const state = {
        status: 'executing' as DerivedProjectStatus,
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
        status: 'failed' as DerivedProjectStatus,
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
        status: 'failed' as DerivedProjectStatus,
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
        status: 'failed' as DerivedProjectStatus,
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
        status: 'failed' as DerivedProjectStatus,
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
        status: 'completed' as DerivedProjectStatus,
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'completed' as const },
        ],
      };
      expect(isProjectComplete(state)).toBe(true);
    });

    it('should return false when some tasks pending', () => {
      const state = {
        status: 'executing' as DerivedProjectStatus,
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'pending' as const },
        ],
      };
      expect(isProjectComplete(state)).toBe(false);
    });

    it('should return false when some tasks failed', () => {
      const state = {
        status: 'failed' as DerivedProjectStatus,
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'failed' as const },
        ],
      };
      expect(isProjectComplete(state)).toBe(false);
    });

    it('should return true for empty project', () => {
      const state = { status: 'planning' as DerivedProjectStatus, tasks: [] };
      expect(isProjectComplete(state)).toBe(true);
    });
  });

  describe('hasProjectFailed', () => {
    it('should return true when any task failed', () => {
      const state = {
        status: 'failed' as DerivedProjectStatus,
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'failed' as const },
        ],
      };
      expect(hasProjectFailed(state)).toBe(true);
    });

    it('should return false when no tasks failed', () => {
      const state = {
        status: 'executing' as DerivedProjectStatus,
        tasks: [
          { id: '001', planFile: 'plans/001.md', status: 'completed' as const },
          { id: '002', planFile: 'plans/002.md', status: 'pending' as const },
        ],
      };
      expect(hasProjectFailed(state)).toBe(false);
    });
  });
});
