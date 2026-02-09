import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { getAmendPrompt, AmendPromptParams } from '../../src/prompts/amend.js';
import {
  deriveProjectState,
  isProjectComplete,
  DerivedTask,
} from '../../src/core/state-derivation.js';
import {
  resolveProjectIdentifier,
  extractTaskNameFromPlanFile,
  getPlansDir,
  getOutcomesDir,
} from '../../src/utils/paths.js';

describe('Plan Command - Amend Functionality', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-plan-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Project Resolution for Amend', () => {
    beforeEach(() => {
      // Create a project with tasks
      const projectDir = path.join(tempDir, 'aaaaad-my-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '01-first-task.md'),
        '# Task: First Task\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '02-second-task.md'),
        '# Task: Second Task\n'
      );
    });

    it('should resolve project by 6-char base26 ID for amend', () => {
      const result = resolveProjectIdentifier(tempDir, 'aaaaad');
      expect(result).toBe(path.join(tempDir, 'aaaaad-my-project'));
    });

    it('should resolve project by name for amend', () => {
      const result = resolveProjectIdentifier(tempDir, 'my-project');
      expect(result).toBe(path.join(tempDir, 'aaaaad-my-project'));
    });

    it('should resolve project by full folder name for amend', () => {
      const result = resolveProjectIdentifier(tempDir, 'aaaaad-my-project');
      expect(result).toBe(path.join(tempDir, 'aaaaad-my-project'));
    });

    it('should return null for non-existent project', () => {
      const result = resolveProjectIdentifier(tempDir, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Base36 Project Resolution for Amend', () => {
    beforeEach(() => {
      const projectDir = path.join(tempDir, 'abcdef-important-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '01-initial-task.md'),
        '# Task: Initial Task\n'
      );
    });

    it('should resolve project by 6-char base26 prefix for amend', () => {
      const result = resolveProjectIdentifier(tempDir, 'abcdef');
      expect(result).toBe(path.join(tempDir, 'abcdef-important-project'));
    });

    it('should resolve project by full base26 folder name for amend', () => {
      const result = resolveProjectIdentifier(tempDir, 'abcdef-important-project');
      expect(result).toBe(path.join(tempDir, 'abcdef-important-project'));
    });
  });

  describe('Existing Project State Loading', () => {
    it('should load pending tasks', () => {
      const projectDir = path.join(tempDir, 'aaaaab-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '01-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '02-task-two.md'),
        '# Task: Task Two\n'
      );

      const state = deriveProjectState(projectDir);
      expect(state.tasks.length).toBe(2);
      expect(state.tasks[0].status).toBe('pending');
      expect(state.tasks[1].status).toBe('pending');
    });

    it('should load completed tasks', () => {
      const projectDir = path.join(tempDir, 'aaaaab-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.mkdirSync(path.join(projectDir, 'outcomes'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '01-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '01-task-one.md'),
        'Task completed.\n\n<promise>COMPLETE</promise>'
      );

      const state = deriveProjectState(projectDir);
      expect(state.tasks.length).toBe(1);
      expect(state.tasks[0].status).toBe('completed');
    });

    it('should load failed tasks', () => {
      const projectDir = path.join(tempDir, 'aaaaab-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.mkdirSync(path.join(projectDir, 'outcomes'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '01-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '01-task-one.md'),
        'Task failed.\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectDir);
      expect(state.tasks.length).toBe(1);
      expect(state.tasks[0].status).toBe('failed');
    });

    it('should load mixed task statuses', () => {
      const projectDir = path.join(tempDir, 'aaaaab-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.mkdirSync(path.join(projectDir, 'outcomes'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '01-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '02-task-two.md'),
        '# Task: Task Two\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '03-task-three.md'),
        '# Task: Task Three\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '01-task-one.md'),
        'Task completed.\n\n<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '02-task-two.md'),
        'Task failed.\n\n<promise>FAILED</promise>'
      );
      // Task three has no outcome - pending

      const state = deriveProjectState(projectDir);
      expect(state.tasks.length).toBe(3);
      expect(state.tasks[0].status).toBe('completed');
      expect(state.tasks[1].status).toBe('failed');
      expect(state.tasks[2].status).toBe('pending');
    });
  });

  describe('Fully Completed Project Detection', () => {
    it('should detect fully completed project', () => {
      const projectDir = path.join(tempDir, 'aaaaab-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.mkdirSync(path.join(projectDir, 'outcomes'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '01-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '02-task-two.md'),
        '# Task: Task Two\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '01-task-one.md'),
        'Task completed.\n\n<promise>COMPLETE</promise>'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '02-task-two.md'),
        'Task completed.\n\n<promise>COMPLETE</promise>'
      );

      const state = deriveProjectState(projectDir);
      expect(isProjectComplete(state)).toBe(true);
    });

    it('should not mark project as complete with pending tasks', () => {
      const projectDir = path.join(tempDir, 'aaaaab-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.mkdirSync(path.join(projectDir, 'outcomes'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '01-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '02-task-two.md'),
        '# Task: Task Two\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '01-task-one.md'),
        'Task completed.\n\n<promise>COMPLETE</promise>'
      );

      const state = deriveProjectState(projectDir);
      expect(isProjectComplete(state)).toBe(false);
    });

    it('should not mark project as complete with failed tasks', () => {
      const projectDir = path.join(tempDir, 'aaaaab-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.mkdirSync(path.join(projectDir, 'outcomes'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '01-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '01-task-one.md'),
        'Task failed.\n\n<promise>FAILED</promise>'
      );

      const state = deriveProjectState(projectDir);
      expect(isProjectComplete(state)).toBe(false);
    });
  });

  describe('Task Name Extraction', () => {
    it('should extract task name from plan file', () => {
      const name = extractTaskNameFromPlanFile('01-fix-login-bug.md');
      expect(name).toBe('fix-login-bug');
    });

    it('should extract task name from plan file with multiple hyphens', () => {
      const name = extractTaskNameFromPlanFile('02-add-user-registration-flow.md');
      expect(name).toBe('add-user-registration-flow');
    });

    it('should handle 2-digit task numbers', () => {
      const name = extractTaskNameFromPlanFile('01-task.md');
      expect(name).toBe('task');
    });

    it('should return null for invalid plan file name', () => {
      const name = extractTaskNameFromPlanFile('invalid-name.md');
      expect(name).toBeNull();
    });
  });

  describe('Next Task Number Calculation', () => {
    it('should calculate next task number correctly', () => {
      const projectDir = path.join(tempDir, 'aaaaab-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '01-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '02-task-two.md'),
        '# Task: Task Two\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '03-task-three.md'),
        '# Task: Task Three\n'
      );

      const state = deriveProjectState(projectDir);
      const maxTaskNumber = Math.max(
        ...state.tasks.map((t) => parseInt(t.id, 10))
      );
      const nextTaskNumber = maxTaskNumber + 1;
      expect(nextTaskNumber).toBe(4);
    });

    it('should handle single task project', () => {
      const projectDir = path.join(tempDir, 'aaaaab-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '01-task-one.md'),
        '# Task: Task One\n'
      );

      const state = deriveProjectState(projectDir);
      const maxTaskNumber = Math.max(
        ...state.tasks.map((t) => parseInt(t.id, 10))
      );
      const nextTaskNumber = maxTaskNumber + 1;
      expect(nextTaskNumber).toBe(2);
    });
  });

  describe('Amend Prompt Generation', () => {
    it('should return systemPrompt and userMessage', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [
          { id: '01', planFile: 'plans/01-first.md', status: 'completed', taskName: 'first' },
          { id: '02', planFile: 'plans/02-second.md', status: 'pending', taskName: 'second' },
        ],
        nextTaskNumber: 3,
        newTaskDescription: 'Add new feature X',
      };

      const result = getAmendPrompt(params);

      expect(result).toHaveProperty('systemPrompt');
      expect(result).toHaveProperty('userMessage');
      expect(typeof result.systemPrompt).toBe('string');
      expect(typeof result.userMessage).toBe('string');
    });

    it('should generate amend system prompt with existing tasks context', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [
          { id: '01', planFile: 'plans/01-first.md', status: 'completed', taskName: 'first' },
          { id: '02', planFile: 'plans/02-second.md', status: 'pending', taskName: 'second' },
        ],
        nextTaskNumber: 3,
        newTaskDescription: 'Add new feature X',
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('AMENDMENT MODE');
      expect(systemPrompt).toContain('Task 01: first [COMPLETED] [PROTECTED]');
      expect(systemPrompt).toContain('Task 02: second [PENDING] [MODIFIABLE]');
      expect(systemPrompt).toContain('starting from number 03');
      expect(systemPrompt).toContain('/test/project');
    });

    it('should include new task description in user message', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [],
        nextTaskNumber: 1,
        newTaskDescription: 'Add new feature X',
      };

      const { userMessage } = getAmendPrompt(params);

      expect(userMessage).toContain('Add new feature X');
      expect(userMessage).toContain('planning interview');
    });

    it('should instruct to protect completed tasks and allow modifying pending tasks', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [
          { id: '01', planFile: 'plans/01-first.md', status: 'completed', taskName: 'first' },
        ],
        nextTaskNumber: 2,
        newTaskDescription: 'New tasks',
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('NEVER modify [PROTECTED] tasks (completed)');
      expect(systemPrompt).toContain('DO NOT renumber existing tasks');
      expect(systemPrompt).toContain('You MAY modify [MODIFIABLE] tasks (pending/failed)');
      expect(systemPrompt).toContain('NEVER modify COMPLETED task plans - they are [PROTECTED]');
      expect(systemPrompt).toContain('You MAY modify non-completed task plans (pending/failed)');
    });

    it('should include failed task status with MODIFIABLE indicator in system prompt', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [
          { id: '01', planFile: 'plans/01-first.md', status: 'failed', taskName: 'first' },
        ],
        nextTaskNumber: 2,
        newTaskDescription: 'New tasks',
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('Task 01: first [FAILED] [MODIFIABLE]');
    });

    it('should list protected tasks separately', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [
          { id: '01', planFile: 'plans/01-first.md', status: 'completed', taskName: 'first' },
          { id: '02', planFile: 'plans/02-second.md', status: 'completed', taskName: 'second' },
          { id: '03', planFile: 'plans/03-third.md', status: 'pending', taskName: 'third' },
        ],
        nextTaskNumber: 4,
        newTaskDescription: 'New tasks',
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('### Protected Tasks (COMPLETED - cannot be modified)');
      expect(systemPrompt).toContain('- Task 01: first');
      expect(systemPrompt).toContain('- Task 02: second');
    });

    it('should list modifiable tasks separately', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [
          { id: '01', planFile: 'plans/01-first.md', status: 'completed', taskName: 'first' },
          { id: '02', planFile: 'plans/02-second.md', status: 'pending', taskName: 'second' },
          { id: '03', planFile: 'plans/03-third.md', status: 'failed', taskName: 'third' },
        ],
        nextTaskNumber: 4,
        newTaskDescription: 'New tasks',
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('### Modifiable Tasks (PENDING/FAILED - can be modified if requested)');
      expect(systemPrompt).toContain('- Task 02: second');
      expect(systemPrompt).toContain('- Task 03: third');
    });

    it('should show (none) when there are no protected tasks', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [
          { id: '01', planFile: 'plans/01-first.md', status: 'pending', taskName: 'first' },
        ],
        nextTaskNumber: 2,
        newTaskDescription: 'New tasks',
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('### Protected Tasks (COMPLETED - cannot be modified)\n(none)');
    });

    it('should show (none) when there are no modifiable tasks', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [
          { id: '01', planFile: 'plans/01-first.md', status: 'completed', taskName: 'first' },
        ],
        nextTaskNumber: 2,
        newTaskDescription: 'New tasks',
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('### Modifiable Tasks (PENDING/FAILED - can be modified if requested)\n(none)');
    });

    it('should handle mixed task statuses correctly', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [
          { id: '01', planFile: 'plans/01-first.md', status: 'completed', taskName: 'setup' },
          { id: '02', planFile: 'plans/02-second.md', status: 'completed', taskName: 'database' },
          { id: '03', planFile: 'plans/03-third.md', status: 'failed', taskName: 'api' },
          { id: '04', planFile: 'plans/04-fourth.md', status: 'pending', taskName: 'tests' },
        ],
        nextTaskNumber: 5,
        newTaskDescription: 'New tasks',
      };

      const { systemPrompt } = getAmendPrompt(params);

      // Check summary list
      expect(systemPrompt).toContain('Task 01: setup [COMPLETED] [PROTECTED]');
      expect(systemPrompt).toContain('Task 02: database [COMPLETED] [PROTECTED]');
      expect(systemPrompt).toContain('Task 03: api [FAILED] [MODIFIABLE]');
      expect(systemPrompt).toContain('Task 04: tests [PENDING] [MODIFIABLE]');

      // Check separate lists
      expect(systemPrompt).toContain('### Protected Tasks (COMPLETED - cannot be modified)');
      expect(systemPrompt).toContain('### Modifiable Tasks (PENDING/FAILED - can be modified if requested)');
    });

    it('should include correct plans directory path', () => {
      const params: AmendPromptParams = {
        projectPath: '/my/project/path',
        existingTasks: [
          { id: '01', planFile: 'plans/01-task.md', status: 'pending', taskName: 'task' },
        ],
        nextTaskNumber: 2,
        newTaskDescription: 'New tasks',
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('/my/project/path/plans/02-task-name.md');
      expect(systemPrompt).toContain('/my/project/path/plans/03-task-name.md');
    });

    it('should include new task description in user message', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [],
        nextTaskNumber: 1,
        newTaskDescription: 'Add authentication and authorization',
      };

      const { userMessage } = getAmendPrompt(params);

      expect(userMessage).toContain('Add authentication and authorization');
    });

    it('should include interview instructions in system prompt', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [],
        nextTaskNumber: 1,
        newTaskDescription: 'New feature',
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('AMENDMENT MODE');
      expect(systemPrompt).toContain('AskUserQuestion');
      expect(systemPrompt).toContain('Interview the User');
    });

    it('should include new task description directly in user message', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [],
        nextTaskNumber: 1,
        newTaskDescription: 'Add a caching layer for API responses',
      };

      const { userMessage } = getAmendPrompt(params);

      expect(userMessage).toContain('Add a caching layer for API responses');
      expect(userMessage).toContain('planning interview');
    });

    it('should include outcome file paths for completed tasks in task summary', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [
          { id: '01', planFile: 'plans/01-setup.md', status: 'completed', taskName: 'setup' },
          { id: '02', planFile: 'plans/02-database.md', status: 'completed', taskName: 'database' },
        ],
        nextTaskNumber: 3,
        newTaskDescription: 'Fix setup issues',
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('Outcome: /test/project/outcomes/01-setup.md');
      expect(systemPrompt).toContain('Outcome: /test/project/outcomes/02-database.md');
    });

    it('should not include outcome file paths for non-completed tasks', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [
          { id: '01', planFile: 'plans/01-pending-task.md', status: 'pending', taskName: 'pending-task' },
          { id: '02', planFile: 'plans/02-failed-task.md', status: 'failed', taskName: 'failed-task' },
        ],
        nextTaskNumber: 3,
        newTaskDescription: 'New tasks',
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).not.toContain('Outcome: /test/project/outcomes/01-pending-task.md');
      expect(systemPrompt).not.toContain('Outcome: /test/project/outcomes/02-failed-task.md');
    });

    it('should include follow-up task instructions in system prompt', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        existingTasks: [
          { id: '01', planFile: 'plans/01-first.md', status: 'completed', taskName: 'first' },
        ],
        nextTaskNumber: 2,
        newTaskDescription: 'Fix issues from first task',
      };

      const { systemPrompt } = getAmendPrompt(params);

      expect(systemPrompt).toContain('Identifying Follow-up Tasks');
      expect(systemPrompt).toContain('follow-up to task NN');
      expect(systemPrompt).toContain('outcome file paths for completed tasks are listed above');
    });
  });

  describe('Existing Project Detection Without Amend Flag', () => {
    it('should find existing project by name', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-existing-project'));
      const result = resolveProjectIdentifier(tempDir, 'existing-project');
      expect(result).not.toBeNull();
    });

    it('should find existing project by 6-char base26 ID', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-existing-project'));
      const result = resolveProjectIdentifier(tempDir, 'aaaaab');
      expect(result).not.toBeNull();
    });

    it('should find existing project by full folder name', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-existing-project'));
      const result = resolveProjectIdentifier(tempDir, 'aaaaab-existing-project');
      expect(result).not.toBeNull();
    });

    it('should return null for non-existing project', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-existing-project'));
      const result = resolveProjectIdentifier(tempDir, 'new-project');
      expect(result).toBeNull();
    });
  });
});
