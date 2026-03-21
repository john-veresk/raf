import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  parseOutcomeStatus,
  parseDependencies,
  deriveProjectState,
  deriveProjectStatus,
  discoverProjects,
  getNextPendingTask,
  getNextExecutableTask,
  getDerivedStats,
  getDerivedStatsForTasks,
  isProjectComplete,
  hasProjectFailed,
  type DerivedProjectStatus,
} from '../../src/core/state-derivation.js';

describe('state-derivation', () => {
  let tempDir: string;
  let projectPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-test-'));
    projectPath = path.join(tempDir, '1-test-project');
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'plans'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'outcomes'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('parseOutcomeStatus', () => {
    it('should parse COMPLETE promise marker as completed', () => {
      const content = `# Task 001 - Completed

## Summary
Task was successful.

<promise>COMPLETE</promise>
`;
      expect(parseOutcomeStatus(content)).toBe('completed');
    });

    it('should parse FAILED promise marker as failed', () => {
      const content = `# Task 001 - Failed

## Failure Reason
Something went wrong.

<promise>FAILED</promise>
`;
      expect(parseOutcomeStatus(content)).toBe('failed');
    });

    it('should use last occurrence when multiple markers exist', () => {
      const content = `# Task 001

<promise>FAILED</promise>

Retry was successful!

<promise>COMPLETE</promise>
`;
      expect(parseOutcomeStatus(content)).toBe('completed');
    });

    it('should return null for missing promise marker', () => {
      const content = `# Task 001 - Completed

## Summary
Old format without promise marker.
`;
      expect(parseOutcomeStatus(content)).toBeNull();
    });

    it('should return null for empty content', () => {
      expect(parseOutcomeStatus('')).toBeNull();
    });

    it('should parse BLOCKED promise marker as blocked', () => {
      const content = `# Task 001 - Blocked

## Reason
Dependency failed.

<promise>BLOCKED</promise>
`;
      expect(parseOutcomeStatus(content)).toBe('blocked');
    });

    it('should use last occurrence when BLOCKED is final marker', () => {
      const content = `# Task 001

<promise>COMPLETE</promise>

Later it was blocked...

<promise>BLOCKED</promise>
`;
      expect(parseOutcomeStatus(content)).toBe('blocked');
    });
  });

  describe('parseDependencies', () => {
    it('should parse single dependency', () => {
      const content = `# Task

## Dependencies
1

## Requirements
`;
      expect(parseDependencies(content)).toEqual(['1']);
    });

    it('should parse multiple comma-separated dependencies', () => {
      const content = `# Task

## Dependencies
1, 2, 3

## Requirements
`;
      expect(parseDependencies(content)).toEqual(['1', '2', '3']);
    });

    it('should handle extra whitespace around dependencies', () => {
      const content = `# Task

## Dependencies
  1 ,  2  ,3

## Requirements
`;
      expect(parseDependencies(content)).toEqual(['1', '2', '3']);
    });

    it('should return empty array when no Dependencies section', () => {
      const content = `# Task

## Requirements
- Do something
`;
      expect(parseDependencies(content)).toEqual([]);
    });

    it('should return empty array for empty Dependencies section', () => {
      const content = `# Task

## Dependencies

## Requirements
`;
      expect(parseDependencies(content)).toEqual([]);
    });

    it('should filter out invalid task IDs', () => {
      const content = `# Task

## Dependencies
1, invalid, 2, abcd

## Requirements
`;
      expect(parseDependencies(content)).toEqual(['1', '2']);
    });

    it('should handle multi-digit numeric task IDs', () => {
      const content = `# Task

## Dependencies
10, 100, 999

## Requirements
`;
      expect(parseDependencies(content)).toEqual(['10', '100', '999']);
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

    it('should discover projects matching numeric prefix pattern', () => {
      const rafDir = path.join(tempDir, 'RAF');
      fs.mkdirSync(rafDir);
      fs.mkdirSync(path.join(rafDir, '1-first-project'));
      fs.mkdirSync(path.join(rafDir, '2-second-project'));
      fs.mkdirSync(path.join(rafDir, 'not-a-project'));
      fs.mkdirSync(path.join(rafDir, 'abcdef-old-base26'));
      fs.writeFileSync(path.join(rafDir, 'some-file.txt'), 'content');

      const projects = discoverProjects(rafDir);
      expect(projects).toHaveLength(2);
      expect(projects[0]?.number).toBe(1);
      expect(projects[0]?.name).toBe('first-project');
      expect(projects[0]?.path).toBe(path.join(rafDir, '1-first-project'));
      expect(projects[1]?.number).toBe(2);
      expect(projects[1]?.name).toBe('second-project');
    });

    it('should sort projects by number', () => {
      const rafDir = path.join(tempDir, 'RAF');
      fs.mkdirSync(rafDir);
      fs.mkdirSync(path.join(rafDir, '3-third'));
      fs.mkdirSync(path.join(rafDir, '1-first'));
      fs.mkdirSync(path.join(rafDir, '2-second'));

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
        { id: '1', planFile: 'plans/1.md', status: 'pending' as const, dependencies: [] },
        { id: '2', planFile: 'plans/2.md', status: 'pending' as const, dependencies: [] },
      ];
      const status = deriveProjectStatus(projectPath, tasks);
      expect(status).toBe('ready');
    });

    it('should return executing when some tasks are completed', () => {
      const tasks = [
        { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
        { id: '2', planFile: 'plans/2.md', status: 'pending' as const, dependencies: [] },
      ];
      const status = deriveProjectStatus(projectPath, tasks);
      expect(status).toBe('executing');
    });

    it('should return completed when all tasks are completed', () => {
      const tasks = [
        { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
        { id: '2', planFile: 'plans/2.md', status: 'completed' as const, dependencies: [] },
      ];
      const status = deriveProjectStatus(projectPath, tasks);
      expect(status).toBe('completed');
    });

    it('should return failed when any task has failed', () => {
      const tasks = [
        { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
        { id: '2', planFile: 'plans/2.md', status: 'failed' as const, dependencies: [] },
        { id: '3', planFile: 'plans/3.md', status: 'pending' as const, dependencies: [] },
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
      fs.writeFileSync(path.join(projectPath, 'plans', '1-first-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '2-second-task.md'), '# Task 2');

      const state = deriveProjectState(projectPath);
      expect(state.tasks).toHaveLength(2);
      expect(state.tasks[0]?.id).toBe('1');
      expect(state.tasks[0]?.planFile).toBe('plans/1-first-task.md');
      expect(state.tasks[0]?.status).toBe('pending');
      expect(state.tasks[1]?.id).toBe('2');
      expect(state.status).toBe('ready');
    });

    it('should match outcome statuses to tasks and derive failed status', () => {
      // Create plan files
      fs.writeFileSync(path.join(projectPath, 'plans', '1-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '2-task.md'), '# Task 2');
      fs.writeFileSync(path.join(projectPath, 'plans', '3-task.md'), '# Task 3');

      // Create outcome files with promise markers
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '1-task.md'),
        '# Task 1 - Completed\n\n<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '2-task.md'),
        '# Task 2 - Failed\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);
      expect(state.tasks).toHaveLength(3);
      expect(state.tasks[0]?.status).toBe('completed');
      expect(state.tasks[1]?.status).toBe('failed');
      expect(state.tasks[2]?.status).toBe('pending');
      expect(state.status).toBe('failed');
    });

    it('should derive completed status when all tasks completed', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '1-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '2-task.md'), '# Task 2');
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '1-task.md'),
        '# Task 1 - Completed\n\n<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '2-task.md'),
        '# Task 2 - Completed\n\n<promise>COMPLETE</promise>'
      );

      const state = deriveProjectState(projectPath);
      expect(state.status).toBe('completed');
    });

    it('should derive executing status when some tasks completed', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '1-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '2-task.md'), '# Task 2');
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '1-task.md'),
        '# Task 1 - Completed\n\n<promise>COMPLETE</promise>'
      );

      const state = deriveProjectState(projectPath);
      expect(state.status).toBe('executing');
    });

    it('should ignore outcome files without promise marker', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '1-task.md'), '# Task 1');
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '1-task.md'),
        '# Task 1 - Completed (no promise marker)'
      );

      const state = deriveProjectState(projectPath);
      expect(state.tasks[0]?.status).toBe('pending');
    });

    it('should ignore SUMMARY.md in outcomes', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '1-task.md'), '# Task 1');
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

    it('should parse dependencies from plan files', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '1-task.md'),
        '# Task 1\n\n## Dependencies\n\n## Requirements\n'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '2-task.md'),
        '# Task 2\n\n## Dependencies\n1\n\n## Requirements\n'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '3-task.md'),
        '# Task 3\n\n## Dependencies\n1, 2\n\n## Requirements\n'
      );

      const state = deriveProjectState(projectPath);
      expect(state.tasks[0]?.dependencies).toEqual([]);
      expect(state.tasks[1]?.dependencies).toEqual(['1']);
      expect(state.tasks[2]?.dependencies).toEqual(['1', '2']);
    });

    it('should derive blocked status when dependency fails', () => {
      // Task 1 has no dependencies
      fs.writeFileSync(
        path.join(projectPath, 'plans', '1-task.md'),
        '# Task 1\n\n## Requirements\n'
      );
      // Task 2 depends on 1
      fs.writeFileSync(
        path.join(projectPath, 'plans', '2-task.md'),
        '# Task 2\n\n## Dependencies\n1\n\n## Requirements\n'
      );
      // Task 1 failed
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '1-task.md'),
        '<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);
      expect(state.tasks[0]?.status).toBe('failed');
      expect(state.tasks[1]?.status).toBe('blocked');
    });

    it('should derive transitive blocked status', () => {
      // Task 1 has no dependencies
      fs.writeFileSync(
        path.join(projectPath, 'plans', '1-task.md'),
        '# Task 1\n\n## Requirements\n'
      );
      // Task 2 depends on 1
      fs.writeFileSync(
        path.join(projectPath, 'plans', '2-task.md'),
        '# Task 2\n\n## Dependencies\n1\n\n## Requirements\n'
      );
      // Task 3 depends on 2
      fs.writeFileSync(
        path.join(projectPath, 'plans', '3-task.md'),
        '# Task 3\n\n## Dependencies\n2\n\n## Requirements\n'
      );
      // Task 1 failed
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '1-task.md'),
        '<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);
      expect(state.tasks[0]?.status).toBe('failed');
      expect(state.tasks[1]?.status).toBe('blocked');
      expect(state.tasks[2]?.status).toBe('blocked');
    });

    it('should not block when all dependencies are completed', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '1-task.md'),
        '# Task 1\n\n## Requirements\n'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '2-task.md'),
        '# Task 2\n\n## Dependencies\n1\n\n## Requirements\n'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '1-task.md'),
        '<promise>COMPLETE</promise>'
      );

      const state = deriveProjectState(projectPath);
      expect(state.tasks[0]?.status).toBe('completed');
      expect(state.tasks[1]?.status).toBe('pending');
    });

    it('should block when any dependency is blocked', () => {
      // 1 fails, 2 depends on 1 (blocked), 3 depends on 2 (blocked)
      fs.writeFileSync(
        path.join(projectPath, 'plans', '1-task.md'),
        '# Task 1\n\n## Requirements\n'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '2-task.md'),
        '# Task 2\n\n## Dependencies\n1\n\n## Requirements\n'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '3-task.md'),
        '# Task 3\n\n## Dependencies\n2\n\n## Requirements\n'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '1-task.md'),
        '<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);
      expect(state.tasks[2]?.status).toBe('blocked');
    });

    it('should recognize BLOCKED marker in outcome file', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '1-task.md'),
        '# Task 1\n\n## Requirements\n'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '1-task.md'),
        '<promise>BLOCKED</promise>'
      );

      const state = deriveProjectState(projectPath);
      expect(state.tasks[0]?.status).toBe('blocked');
    });
  });

  describe('getNextPendingTask', () => {
    it('should return first pending task', () => {
      const state = {
        status: 'executing' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'pending' as const, dependencies: [] },
          { id: '3', planFile: 'plans/3.md', status: 'pending' as const, dependencies: [] },
        ],
      };
      const task = getNextPendingTask(state);
      expect(task?.id).toBe('2');
    });

    it('should return null when no pending tasks', () => {
      const state = {
        status: 'failed' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'failed' as const, dependencies: [] },
        ],
      };
      const task = getNextPendingTask(state);
      expect(task).toBeNull();
    });

    it('should skip blocked tasks', () => {
      const state = {
        status: 'failed' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'failed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'blocked' as const, dependencies: ['1'] },
          { id: '3', planFile: 'plans/3.md', status: 'pending' as const, dependencies: [] },
        ],
      };
      const task = getNextPendingTask(state);
      expect(task?.id).toBe('3');
    });
  });

  describe('getNextExecutableTask', () => {
    it('should prefer pending tasks over failed', () => {
      const state = {
        status: 'failed' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'failed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'pending' as const, dependencies: [] },
        ],
      };
      const task = getNextExecutableTask(state);
      expect(task?.id).toBe('2');
    });

    it('should return failed task when no pending', () => {
      const state = {
        status: 'failed' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'failed' as const, dependencies: [] },
        ],
      };
      const task = getNextExecutableTask(state);
      expect(task?.id).toBe('2');
    });

    it('should skip blocked tasks when looking for pending', () => {
      const state = {
        status: 'failed' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'failed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'blocked' as const, dependencies: ['1'] },
          { id: '3', planFile: 'plans/3.md', status: 'pending' as const, dependencies: [] },
        ],
      };
      const task = getNextExecutableTask(state);
      expect(task?.id).toBe('3');
    });

    it('should return null when only blocked tasks remain', () => {
      const state = {
        status: 'failed' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'blocked' as const, dependencies: ['3'] },
        ],
      };
      const task = getNextExecutableTask(state);
      expect(task).toBeNull();
    });
  });

  describe('getDerivedStats', () => {
    it('should calculate correct stats', () => {
      const state = {
        status: 'failed' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'failed' as const, dependencies: [] },
          { id: '3', planFile: 'plans/3.md', status: 'pending' as const, dependencies: [] },
          { id: '4', planFile: 'plans/4.md', status: 'pending' as const, dependencies: [] },
        ],
      };
      const stats = getDerivedStats(state);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(2);
      expect(stats.blocked).toBe(0);
      expect(stats.total).toBe(4);
    });

    it('should count blocked tasks', () => {
      const state = {
        status: 'failed' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'failed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'blocked' as const, dependencies: ['1'] },
          { id: '3', planFile: 'plans/3.md', status: 'blocked' as const, dependencies: ['2'] },
          { id: '4', planFile: 'plans/4.md', status: 'pending' as const, dependencies: [] },
        ],
      };
      const stats = getDerivedStats(state);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.blocked).toBe(2);
      expect(stats.total).toBe(4);
    });
  });

  describe('getDerivedStatsForTasks', () => {
    it('should calculate stats for a subset of tasks', () => {
      const state = {
        status: 'executing' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'failed' as const, dependencies: [] },
          { id: '3', planFile: 'plans/3.md', status: 'pending' as const, dependencies: [] },
          { id: '4', planFile: 'plans/4.md', status: 'blocked' as const, dependencies: ['2'] },
        ],
      };
      const stats = getDerivedStatsForTasks(state, ['1', '3', '4']);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.pending).toBe(1);
      expect(stats.blocked).toBe(1);
      expect(stats.total).toBe(3);
    });

    it('should ignore task IDs not present in state', () => {
      const state = {
        status: 'executing' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'failed' as const, dependencies: [] },
        ],
      };
      const stats = getDerivedStatsForTasks(state, ['999']);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.blocked).toBe(0);
      expect(stats.total).toBe(0);
    });
  });

  describe('isProjectComplete', () => {
    it('should return true when all tasks completed', () => {
      const state = {
        status: 'completed' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'completed' as const, dependencies: [] },
        ],
      };
      expect(isProjectComplete(state)).toBe(true);
    });

    it('should return false when some tasks pending', () => {
      const state = {
        status: 'executing' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'pending' as const, dependencies: [] },
        ],
      };
      expect(isProjectComplete(state)).toBe(false);
    });

    it('should return false when some tasks failed', () => {
      const state = {
        status: 'failed' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'failed' as const, dependencies: [] },
        ],
      };
      expect(isProjectComplete(state)).toBe(false);
    });

    it('should return false when some tasks blocked', () => {
      const state = {
        status: 'failed' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'blocked' as const, dependencies: ['3'] },
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
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'failed' as const, dependencies: [] },
        ],
      };
      expect(hasProjectFailed(state)).toBe(true);
    });

    it('should return false when no tasks failed', () => {
      const state = {
        status: 'executing' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'pending' as const, dependencies: [] },
        ],
      };
      expect(hasProjectFailed(state)).toBe(false);
    });

    it('should return false when tasks are only blocked (not failed)', () => {
      const state = {
        status: 'failed' as DerivedProjectStatus,
        tasks: [
          { id: '1', planFile: 'plans/1.md', status: 'completed' as const, dependencies: [] },
          { id: '2', planFile: 'plans/2.md', status: 'blocked' as const, dependencies: ['3'] },
        ],
      };
      expect(hasProjectFailed(state)).toBe(false);
    });
  });
});
