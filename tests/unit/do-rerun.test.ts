import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  deriveProjectState,
  getNextExecutableTask,
  isProjectComplete,
  type DerivedProjectState,
} from '../../src/core/state-derivation.js';

/**
 * Tests for the re-run functionality of the do command.
 * These tests verify the task selection logic used by raf do when resuming projects.
 */
describe('do command rerun functionality', () => {
  let tempDir: string;
  let projectPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-do-rerun-test-'));
    projectPath = path.join(tempDir, 'aaaaab-test-project');
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'plans'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'outcomes'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'input.md'), '# Test Input');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('skip completed tasks', () => {
    it('should skip tasks with SUCCESS outcome', () => {
      // Set up plans
      fs.writeFileSync(path.join(projectPath, 'plans', '01-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '02-task.md'), '# Task 2');
      fs.writeFileSync(path.join(projectPath, 'plans', '03-task.md'), '# Task 3');

      // Mark first task as complete
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-task.md'),
        '# Task 01 - Completed\n\n<promise>COMPLETE</promise>'
      );

      const state = deriveProjectState(projectPath);
      const nextTask = getNextExecutableTask(state);

      expect(nextTask?.id).toBe('02');
      expect(nextTask?.status).toBe('pending');
    });

    it('should skip multiple completed tasks', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '01-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '02-task.md'), '# Task 2');
      fs.writeFileSync(path.join(projectPath, 'plans', '03-task.md'), '# Task 3');

      // Mark first two tasks as complete
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-task.md'),
        '# Task 01 - Completed\n\n<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '02-task.md'),
        '# Task 02 - Completed\n\n<promise>COMPLETE</promise>'
      );

      const state = deriveProjectState(projectPath);
      const nextTask = getNextExecutableTask(state);

      expect(nextTask?.id).toBe('03');
    });
  });

  describe('retry failed tasks', () => {
    it('should retry tasks with FAILED outcome', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '01-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '02-task.md'), '# Task 2');

      // Mark first task as failed
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-task.md'),
        '# Task 01 - Failed\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);
      const nextTask = getNextExecutableTask(state);

      // Should return the pending task first, then failed
      expect(nextTask?.id).toBe('02');
      expect(nextTask?.status).toBe('pending');
    });

    it('should retry failed task when no pending tasks remain', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '01-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '02-task.md'), '# Task 2');

      // Mark first as complete, second as failed
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-task.md'),
        '# Task 01 - Completed\n\n<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '02-task.md'),
        '# Task 02 - Failed\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);
      const nextTask = getNextExecutableTask(state);

      expect(nextTask?.id).toBe('02');
      expect(nextTask?.status).toBe('failed');
    });
  });

  describe('run pending tasks', () => {
    it('should run tasks without outcome files', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '01-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '02-task.md'), '# Task 2');

      const state = deriveProjectState(projectPath);
      const nextTask = getNextExecutableTask(state);

      expect(nextTask?.id).toBe('01');
      expect(nextTask?.status).toBe('pending');
    });

    it('should handle outcome file without status marker as pending', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '01-task.md'), '# Task 1');
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-task.md'),
        '# Old format without status marker'
      );

      const state = deriveProjectState(projectPath);

      expect(state.tasks[0]?.status).toBe('pending');
    });

    it('should handle empty outcome file as pending', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '01-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'outcomes', '01-task.md'), '');

      const state = deriveProjectState(projectPath);

      expect(state.tasks[0]?.status).toBe('pending');
    });
  });

  describe('all complete detection', () => {
    it('should detect all tasks completed', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '01-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '02-task.md'), '# Task 2');

      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-task.md'),
        '# Task 01 - Completed\n\n<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '02-task.md'),
        '# Task 02 - Completed\n\n<promise>COMPLETE</promise>'
      );

      const state = deriveProjectState(projectPath);

      expect(isProjectComplete(state)).toBe(true);
      expect(getNextExecutableTask(state)).toBeNull();
    });

    it('should not report complete when failed tasks exist', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '01-task.md'), '# Task 1');
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-task.md'),
        '# Task 01 - Failed\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);

      expect(isProjectComplete(state)).toBe(false);
    });
  });

  describe('force mode task selection', () => {
    /**
     * Test that force mode logic would select all tasks regardless of status.
     * The actual force mode implementation uses a Set to track tasks completed in the current session,
     * and returns tasks that haven't been completed in this session.
     */
    it('should identify all tasks for force mode execution', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '01-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '02-task.md'), '# Task 2');
      fs.writeFileSync(path.join(projectPath, 'plans', '03-task.md'), '# Task 3');

      // All tasks completed
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-task.md'),
        '# Task 01 - Completed\n\n<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '02-task.md'),
        '# Task 02 - Completed\n\n<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '03-task.md'),
        '# Task 03 - Completed\n\n<promise>COMPLETE</promise>'
      );

      const state = deriveProjectState(projectPath);

      // In force mode, all tasks should be available regardless of status
      expect(state.tasks).toHaveLength(3);
      expect(state.tasks.every((t) => t.status === 'completed')).toBe(true);

      // Simulate force mode task selection
      const completedInSession = new Set<string>();
      function getNextForceTask(
        s: DerivedProjectState,
        completed: Set<string>
      ) {
        for (const t of s.tasks) {
          if (!completed.has(t.id)) {
            return t;
          }
        }
        return null;
      }

      // First iteration - should get task 01
      let task = getNextForceTask(state, completedInSession);
      expect(task?.id).toBe('01');
      completedInSession.add(task!.id);

      // Second iteration - should get task 02
      task = getNextForceTask(state, completedInSession);
      expect(task?.id).toBe('02');
      completedInSession.add(task!.id);

      // Third iteration - should get task 03
      task = getNextForceTask(state, completedInSession);
      expect(task?.id).toBe('03');
      completedInSession.add(task!.id);

      // Fourth iteration - no more tasks
      task = getNextForceTask(state, completedInSession);
      expect(task).toBeNull();
    });
  });

  describe('task status logging', () => {
    it('should identify failed tasks for retry logging', () => {
      fs.writeFileSync(path.join(projectPath, 'plans', '01-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '02-task.md'), '# Task 2');

      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-task.md'),
        '# Task 01 - Completed\n\n<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '02-task.md'),
        '# Task 02 - Failed\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);
      const nextTask = getNextExecutableTask(state);

      // The task being retried should have failed status
      expect(nextTask?.id).toBe('02');
      expect(nextTask?.status).toBe('failed');
    });
  });
});
