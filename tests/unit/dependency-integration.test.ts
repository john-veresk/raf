import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  deriveProjectState,
  getNextExecutableTask,
  getDerivedStats,
  isProjectComplete,
  hasProjectFailed,
  parseDependencies,
  parseOutcomeStatus,
  type DerivedProjectState,
  type DerivedTask,
} from '../../src/core/state-derivation.js';
import { getOutcomeFilePath, extractTaskNameFromPlanFile } from '../../src/utils/paths.js';
import { getExecutionPrompt } from '../../src/prompts/execution.js';

/**
 * Integration tests for the complete dependency blocking flow.
 * These tests simulate a full project lifecycle with dependencies,
 * failures, and cascading blocks.
 */
describe('Dependency Integration Flow', () => {
  let tempDir: string;
  let projectPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-dep-integration-'));
    projectPath = path.join(tempDir, 'aaaaab-test-project');
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'plans'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'outcomes'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'input.md'), '# Test Input');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Complete dependency chain simulation', () => {
    /**
     * Simulates a real project with the following dependency structure:
     *
     * 001-setup (no deps)
     * 002-core (depends on 001)
     * 003-api (depends on 001, 002)
     * 004-tests (depends on 003)
     * 005-docs (depends on 003)
     * 006-deploy (depends on 004, 005)
     */
    beforeEach(() => {
      // Create plan files with dependency structure
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-setup.md'),
        '# Task: Setup\n\n## Objective\nSetup the project infrastructure.\n\n## Requirements\n- Initialize project'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-core.md'),
        '# Task: Core\n\n## Objective\nBuild core functionality.\n\n## Dependencies\n01\n\n## Requirements\n- Build core'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '03-api.md'),
        '# Task: API\n\n## Objective\nImplement API layer.\n\n## Dependencies\n01, 02\n\n## Requirements\n- Create API'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '04-tests.md'),
        '# Task: Tests\n\n## Objective\nWrite tests.\n\n## Dependencies\n03\n\n## Requirements\n- Write tests'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '05-docs.md'),
        '# Task: Docs\n\n## Objective\nWrite documentation.\n\n## Dependencies\n03\n\n## Requirements\n- Write docs'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '06-deploy.md'),
        '# Task: Deploy\n\n## Objective\nDeploy the project.\n\n## Dependencies\n04, 05\n\n## Requirements\n- Deploy'
      );
    });

    it('should correctly derive initial state with all tasks pending', () => {
      const state = deriveProjectState(projectPath);

      expect(state.tasks).toHaveLength(6);
      expect(state.tasks.every((t) => t.status === 'pending')).toBe(true);
      expect(state.status).toBe('ready');

      // Verify dependencies are parsed correctly
      expect(state.tasks[0]?.dependencies).toEqual([]);
      expect(state.tasks[1]?.dependencies).toEqual(['01']);
      expect(state.tasks[2]?.dependencies).toEqual(['01', '02']);
      expect(state.tasks[3]?.dependencies).toEqual(['03']);
      expect(state.tasks[4]?.dependencies).toEqual(['03']);
      expect(state.tasks[5]?.dependencies).toEqual(['04', '05']);
    });

    it('should return first pending task when all are pending', () => {
      const state = deriveProjectState(projectPath);
      const nextTask = getNextExecutableTask(state);

      expect(nextTask?.id).toBe('01');
      expect(nextTask?.status).toBe('pending');
    });

    it('should cascade blocks when task 001 fails', () => {
      // Task 001 fails
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-setup.md'),
        '# Outcome\n\nSetup failed.\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);

      // 001 failed, all others depending on it should be blocked
      expect(state.tasks[0]?.status).toBe('failed'); // 001
      expect(state.tasks[1]?.status).toBe('blocked'); // 002 (depends on 001)
      expect(state.tasks[2]?.status).toBe('blocked'); // 003 (depends on 001, 002)
      expect(state.tasks[3]?.status).toBe('blocked'); // 004 (depends on 003)
      expect(state.tasks[4]?.status).toBe('blocked'); // 005 (depends on 003)
      expect(state.tasks[5]?.status).toBe('blocked'); // 006 (depends on 004, 005)

      // Stats should reflect this
      const stats = getDerivedStats(state);
      expect(stats.failed).toBe(1);
      expect(stats.blocked).toBe(5);
      expect(stats.pending).toBe(0);
      expect(stats.completed).toBe(0);
    });

    it('should cascade blocks when task 002 fails (001 completed)', () => {
      // Task 001 completed
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-setup.md'),
        '# Outcome\n\nSetup complete.\n\n<promise>COMPLETE</promise>'
      );
      // Task 002 fails
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '02-core.md'),
        '# Outcome\n\nCore failed.\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);

      expect(state.tasks[0]?.status).toBe('completed'); // 001
      expect(state.tasks[1]?.status).toBe('failed'); // 002
      expect(state.tasks[2]?.status).toBe('blocked'); // 003 (depends on 002 which failed)
      expect(state.tasks[3]?.status).toBe('blocked'); // 004 (depends on 003 which is blocked)
      expect(state.tasks[4]?.status).toBe('blocked'); // 005 (depends on 003 which is blocked)
      expect(state.tasks[5]?.status).toBe('blocked'); // 006 (depends on 004, 005 which are blocked)

      // Stats
      const stats = getDerivedStats(state);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.blocked).toBe(4);
      expect(stats.pending).toBe(0);
    });

    it('should cascade blocks when task 003 fails (001, 002 completed)', () => {
      // Tasks 001 and 002 completed
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-setup.md'),
        '<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '02-core.md'),
        '<promise>COMPLETE</promise>'
      );
      // Task 003 fails
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '03-api.md'),
        '<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);

      expect(state.tasks[0]?.status).toBe('completed'); // 001
      expect(state.tasks[1]?.status).toBe('completed'); // 002
      expect(state.tasks[2]?.status).toBe('failed'); // 003
      expect(state.tasks[3]?.status).toBe('blocked'); // 004 (depends on 003)
      expect(state.tasks[4]?.status).toBe('blocked'); // 005 (depends on 003)
      expect(state.tasks[5]?.status).toBe('blocked'); // 006 (depends on 004, 005)

      const stats = getDerivedStats(state);
      expect(stats.completed).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.blocked).toBe(3);
    });

    it('should handle partial failure in parallel branches', () => {
      // Complete chain up to 003
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-setup.md'),
        '<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '02-core.md'),
        '<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '03-api.md'),
        '<promise>COMPLETE</promise>'
      );
      // 004 succeeds but 005 fails
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '04-tests.md'),
        '<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '05-docs.md'),
        '<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);

      expect(state.tasks[0]?.status).toBe('completed'); // 001
      expect(state.tasks[1]?.status).toBe('completed'); // 002
      expect(state.tasks[2]?.status).toBe('completed'); // 003
      expect(state.tasks[3]?.status).toBe('completed'); // 004
      expect(state.tasks[4]?.status).toBe('failed'); // 005
      expect(state.tasks[5]?.status).toBe('blocked'); // 006 (depends on 005 which failed)

      const stats = getDerivedStats(state);
      expect(stats.completed).toBe(4);
      expect(stats.failed).toBe(1);
      expect(stats.blocked).toBe(1);
    });

    it('should mark project complete when all tasks succeed', () => {
      // All tasks complete
      for (const taskNum of ['01', '02', '03', '04', '05', '06']) {
        const taskFile = fs.readdirSync(path.join(projectPath, 'plans'))
          .find((f) => f.startsWith(taskNum));
        const taskName = taskFile ? extractTaskNameFromPlanFile(`plans/${taskFile}`) : taskNum;
        fs.writeFileSync(
          path.join(projectPath, 'outcomes', `${taskNum}-${taskName ?? taskNum}.md`),
          `# Outcome\n\nTask ${taskNum} complete.\n\n<promise>COMPLETE</promise>`
        );
      }

      const state = deriveProjectState(projectPath);

      expect(isProjectComplete(state)).toBe(true);
      expect(hasProjectFailed(state)).toBe(false);
      expect(state.tasks.every((t) => t.status === 'completed')).toBe(true);
    });
  });

  describe('getNextExecutableTask with complex dependency states', () => {
    it('should skip blocked tasks and find next available pending task', () => {
      // Setup: 001 fails, 002 depends on 001 (blocked), 003 has no deps (pending)
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
        '# Task: Third'
      );

      // 001 fails
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-first.md'),
        '<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);
      const nextTask = getNextExecutableTask(state);

      // Should return 003 (pending) not 002 (blocked)
      expect(nextTask?.id).toBe('03');
      expect(nextTask?.status).toBe('pending');
    });

    it('should return failed task for retry when no pending tasks exist', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-first.md'),
        '# Task: First'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-second.md'),
        '# Task: Second\n\n## Dependencies\n01'
      );

      // 001 fails
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-first.md'),
        '<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectPath);
      const nextTask = getNextExecutableTask(state);

      // Should return 001 for retry (002 is blocked)
      expect(nextTask?.id).toBe('01');
      expect(nextTask?.status).toBe('failed');
    });

    it('should return null when all tasks are blocked with no failed tasks to retry', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-first.md'),
        '# Task: First'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-second.md'),
        '# Task: Second\n\n## Dependencies\n01'
      );

      // 001 completed, but 002 is marked as blocked explicitly (edge case)
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-first.md'),
        '<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '02-second.md'),
        '<promise>BLOCKED</promise>'
      );

      const state = deriveProjectState(projectPath);
      const nextTask = getNextExecutableTask(state);

      // No pending or failed tasks to return
      expect(nextTask).toBeNull();
    });
  });

  describe('Execution prompt with dependency context', () => {
    it('should include dependency outcomes in execution prompt', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-setup.md'),
        '# Task: Setup\n\n## Objective\nSetup the project.'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-build.md'),
        '# Task: Build\n\n## Objective\nBuild the project.\n\n## Dependencies\n01'
      );

      // 001 completed with outcome
      const outcome001 = '# Outcome: Task 001\n\n## Summary\n\nInitialized project with configuration files.\n\n<promise>COMPLETE</promise>';
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-setup.md'),
        outcome001
      );

      const state = deriveProjectState(projectPath);
      const task002 = state.tasks.find((t) => t.id === '02');

      expect(task002).toBeDefined();
      expect(task002?.dependencies).toEqual(['01']);

      // Build execution prompt for task 002
      const prompt = getExecutionPrompt({
        projectPath,
        planPath: path.join(projectPath, 'plans', '02-build.md'),
        taskId: '02',
        taskNumber: 2,
        totalTasks: 2,
        previousOutcomes: [{ taskId: '01', content: outcome001 }],
        autoCommit: true,
        projectNumber: '001',
        outcomeFilePath: path.join(projectPath, 'outcomes', '02-build.md'),
        dependencyIds: ['01'],
        dependencyOutcomes: [{ taskId: '01', content: outcome001 }],
      });

      expect(prompt).toContain('## Dependency Context');
      expect(prompt).toContain('**Dependencies**: 01');
      expect(prompt).toContain('### Task 01');
      expect(prompt).toContain('Initialized project with configuration files');
    });

    it('should include multiple dependency outcomes', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-setup.md'),
        '# Task: Setup'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-core.md'),
        '# Task: Core\n\n## Dependencies\n01'
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '03-api.md'),
        '# Task: API\n\n## Dependencies\n01, 02'
      );

      const outcome001 = '## Summary\n\nSetup complete.\n\n<promise>COMPLETE</promise>';
      const outcome002 = '## Summary\n\nCore complete.\n\n<promise>COMPLETE</promise>';

      fs.writeFileSync(path.join(projectPath, 'outcomes', '01-setup.md'), outcome001);
      fs.writeFileSync(path.join(projectPath, 'outcomes', '02-core.md'), outcome002);

      const prompt = getExecutionPrompt({
        projectPath,
        planPath: path.join(projectPath, 'plans', '03-api.md'),
        taskId: '03',
        taskNumber: 3,
        totalTasks: 3,
        previousOutcomes: [
          { taskId: '01', content: outcome001 },
          { taskId: '02', content: outcome002 },
        ],
        autoCommit: true,
        projectNumber: '001',
        outcomeFilePath: path.join(projectPath, 'outcomes', '03-api.md'),
        dependencyIds: ['01', '02'],
        dependencyOutcomes: [
          { taskId: '01', content: outcome001 },
          { taskId: '02', content: outcome002 },
        ],
      });

      expect(prompt).toContain('**Dependencies**: 01, 02');
      expect(prompt).toContain('### Task 01');
      expect(prompt).toContain('Setup complete');
      expect(prompt).toContain('### Task 02');
      expect(prompt).toContain('Core complete');
    });
  });

  describe('BLOCKED outcome file recognition', () => {
    it('should recognize BLOCKED marker and set status to blocked', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-task.md'),
        '# Task: Task'
      );

      // Blocked outcome file format
      const blockedContent = `# Outcome: Task 001 Blocked

## Summary

This task was automatically blocked because one or more of its dependencies failed or are blocked.

## Blocking Dependencies

**Failed dependencies**: 000

**Task dependencies**: 000

## Resolution

To unblock this task:
1. Fix the failed dependency task(s)
2. Re-run the project with \`raf do\`

<promise>BLOCKED</promise>`;

      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-task.md'),
        blockedContent
      );

      const state = deriveProjectState(projectPath);
      expect(state.tasks[0]?.status).toBe('blocked');
    });

    it('should parse BLOCKED marker correctly', () => {
      const content = `Some content\n\n<promise>BLOCKED</promise>`;
      expect(parseOutcomeStatus(content)).toBe('blocked');
    });

    it('should handle mixed markers using last one', () => {
      // If a blocked task is later retried and succeeds
      const content = `<promise>BLOCKED</promise>\n\nRetried and succeeded\n\n<promise>COMPLETE</promise>`;
      expect(parseOutcomeStatus(content)).toBe('completed');
    });
  });

  describe('Edge cases', () => {
    it('should handle circular dependency detection (prevented by lower-ID rule)', () => {
      // In practice, circular deps are prevented by only allowing deps on lower-numbered tasks
      // But if somehow created, should not infinite loop
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-first.md'),
        '# Task: First\n\n## Dependencies\n02' // Invalid: depends on higher-numbered task
      );
      fs.writeFileSync(
        path.join(projectPath, 'plans', '02-second.md'),
        '# Task: Second'
      );

      // 002 succeeds
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '02-second.md'),
        '<promise>COMPLETE</promise>'
      );

      // Should not hang/crash
      const state = deriveProjectState(projectPath);
      expect(state.tasks).toHaveLength(2);
      // Task 001 depends on 002 which is complete, so 001 is pending (dependency satisfied)
      expect(state.tasks[0]?.status).toBe('pending');
      expect(state.tasks[1]?.status).toBe('completed');
    });

    it('should handle dependency on non-existent task gracefully', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-task.md'),
        '# Task: Task\n\n## Dependencies\nzz' // 999 doesn't exist
      );

      const state = deriveProjectState(projectPath);
      // Task should be pending since the non-existent dep doesn't block it
      // (The dependency 999 just won't be found, treated as if satisfied)
      expect(state.tasks[0]?.status).toBe('pending');
      expect(state.tasks[0]?.dependencies).toEqual(['zz']);
    });

    it('should handle self-dependency gracefully', () => {
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-task.md'),
        '# Task: Task\n\n## Dependencies\n01' // Self-dependency
      );

      const state = deriveProjectState(projectPath);
      // Self-dependency is not blocked since task isn't failed yet
      expect(state.tasks[0]?.status).toBe('pending');
    });

    it('should handle empty project gracefully', () => {
      const state = deriveProjectState(projectPath);

      expect(state.tasks).toEqual([]);
      expect(state.status).toBe('planning');
      expect(isProjectComplete(state)).toBe(true);
      expect(hasProjectFailed(state)).toBe(false);
    });

    it('should handle task with all dependencies completed', () => {
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

      // Both deps complete
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-first.md'),
        '<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '02-second.md'),
        '<promise>COMPLETE</promise>'
      );

      const state = deriveProjectState(projectPath);
      expect(state.tasks[2]?.status).toBe('pending'); // Not blocked
    });
  });
});
