import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  deriveProjectState,
  getNextExecutableTask,
  getDerivedStats,
  isProjectComplete,
  hasProjectFailed,
} from '../../src/core/state-derivation.js';
import { getOutcomeFilePath } from '../../src/utils/paths.js';

/**
 * Tests for blocked task handling in the do command.
 * These tests verify that tasks with failed dependencies are correctly blocked
 * and that blocked outcome files are generated properly.
 */
describe('do command blocked tasks', () => {
  let tempDir: string;
  let projectPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-do-blocked-test-'));
    projectPath = path.join(tempDir, 'aaaaab-test-project');
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'plans'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'outcomes'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'input.md'), '# Test Input');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('blocked task detection', () => {
    it('should mark task as blocked when dependency fails', () => {
      // Task 001 - no dependencies
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-setup.md'),
        '# Task: Setup\n\n## Objective\nSetup the project'
      );
      // Task 002 - depends on 001
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-build.md'),
        '# Task: Build\n\n## Objective\nBuild the project\n\n## Dependencies\n01'
      );

      // Mark task 001 as failed
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-setup.md'),
        '# Task 001 - Failed\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);

      expect(state.tasks[0]?.status).toBe('failed');
      expect(state.tasks[1]?.status).toBe('blocked');
    });

    it('should cascade blocking through multiple tasks', () => {
      // Task 001 - no dependencies
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-first.md'),
        '# Task: First'
      );
      // Task 002 - depends on 001
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-second.md'),
        '# Task: Second\n\n## Dependencies\n01'
      );
      // Task 003 - depends on 002
      fs.writeFileSync(
        path.join(projectPath, 'plans', '03-third.md'),
        '# Task: Third\n\n## Dependencies\n02'
      );

      // Mark task 001 as failed
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-first.md'),
        '# Task 001 - Failed\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);

      expect(state.tasks[0]?.status).toBe('failed');
      expect(state.tasks[1]?.status).toBe('blocked'); // Blocked by 001
      expect(state.tasks[2]?.status).toBe('blocked'); // Blocked by 002 (transitively)
    });

    it('should not block task if dependency succeeds', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-setup.md'),
        '# Task: Setup'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-build.md'),
        '# Task: Build\n\n## Dependencies\n01'
      );

      // Mark task 001 as complete
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-setup.md'),
        '# Task 001 - Complete\n\n<promise>COMPLETE</promise>'
      );

      const state = deriveProjectState(projectPath);

      expect(state.tasks[0]?.status).toBe('completed');
      expect(state.tasks[1]?.status).toBe('pending');
    });

    it('should block task when one of multiple dependencies fails', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-first.md'),
        '# Task: First'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-second.md'),
        '# Task: Second'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '03-third.md'),
        '# Task: Third\n\n## Dependencies\n01, 02'
      );

      // Mark 001 as complete, 002 as failed
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-first.md'),
        '# Task 001 - Complete\n\n<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '02-second.md'),
        '# Task 002 - Failed\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);

      expect(state.tasks[0]?.status).toBe('completed');
      expect(state.tasks[1]?.status).toBe('failed');
      expect(state.tasks[2]?.status).toBe('blocked');
    });
  });

  describe('getNextExecutableTask with blocked tasks', () => {
    it('should skip blocked tasks and return null if only blocked remain', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-setup.md'),
        '# Task: Setup'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-build.md'),
        '# Task: Build\n\n## Dependencies\n01'
      );

      // Mark task 001 as failed
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-setup.md'),
        '# Task 001 - Failed\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);
      const nextTask = getNextExecutableTask(state);

      // Should return the failed task for retry, not the blocked one
      expect(nextTask?.id).toBe('01');
      expect(nextTask?.status).toBe('failed');
    });

    it('should return pending tasks before failed tasks', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-first.md'),
        '# Task: First'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-second.md'),
        '# Task: Second'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '03-third.md'),
        '# Task: Third\n\n## Dependencies\n01'
      );

      // Mark 001 as failed, 002 remains pending
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-first.md'),
        '# Task 001 - Failed\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);
      const nextTask = getNextExecutableTask(state);

      // Should return pending task 002, not failed 001
      expect(nextTask?.id).toBe('02');
      expect(nextTask?.status).toBe('pending');
    });
  });

  describe('getDerivedStats with blocked tasks', () => {
    it('should count blocked tasks separately', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-first.md'),
        '# Task: First'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-second.md'),
        '# Task: Second\n\n## Dependencies\n01'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '03-third.md'),
        '# Task: Third\n\n## Dependencies\n02'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '04-fourth.md'),
        '# Task: Fourth'
      );

      // Mark task 001 as failed
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-first.md'),
        '# Task 001 - Failed\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);
      const stats = getDerivedStats(state);

      expect(stats.failed).toBe(1);
      expect(stats.blocked).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.completed).toBe(0);
      expect(stats.total).toBe(4);
    });
  });

  describe('isProjectComplete with blocked tasks', () => {
    it('should not consider project complete if blocked tasks exist', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-first.md'),
        '# Task: First'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-second.md'),
        '# Task: Second\n\n## Dependencies\n01'
      );

      // Mark 001 as failed (002 becomes blocked)
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-first.md'),
        '# Task 001 - Failed\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);

      expect(isProjectComplete(state)).toBe(false);
    });
  });

  describe('hasProjectFailed with blocked tasks', () => {
    it('should report project as failed when there are failed tasks', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-first.md'),
        '# Task: First'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-second.md'),
        '# Task: Second\n\n## Dependencies\n01'
      );

      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-first.md'),
        '# Task 001 - Failed\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);

      expect(hasProjectFailed(state)).toBe(true);
    });

    it('should not report project as failed with only blocked tasks', () => {
      // This is a theoretical edge case - blocked tasks always have a failed root cause
      // But if only blocked outcome files exist (without failed), hasProjectFailed should be false
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-first.md'),
        '# Task: First'
      );

      // Mark as blocked (artificial - in practice there would be a failed dep)
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-first.md'),
        '# Task 001 - Blocked\n\n<promise>BLOCKED</promise>'
      );

      const state = deriveProjectState(projectPath);

      // hasProjectFailed only checks for 'failed' status, not 'blocked'
      expect(hasProjectFailed(state)).toBe(false);
    });
  });

  describe('blocked outcome file format', () => {
    it('should recognize BLOCKED marker in outcome files', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-task.md'),
        '# Task: Task'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-task.md'),
        '# Outcome: Task 001 Blocked\n\n## Summary\n\nBlocked by dependency.\n\n<promise>BLOCKED</promise>'
      );

      const state = deriveProjectState(projectPath);

      expect(state.tasks[0]?.status).toBe('blocked');
    });
  });

  describe('getOutcomeFilePath', () => {
    it('should generate correct outcome file path', () => {
      const outcomePath = getOutcomeFilePath(projectPath, '02', 'build-project');

      expect(outcomePath).toBe(path.join(projectPath, 'outcomes', '02-build-project.md'));
    });
  });
});
