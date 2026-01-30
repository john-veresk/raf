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
      const projectDir = path.join(tempDir, '003-my-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '001-first-task.md'),
        '# Task: First Task\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '002-second-task.md'),
        '# Task: Second Task\n'
      );
    });

    it('should resolve project by numeric ID for amend', () => {
      const result = resolveProjectIdentifier(tempDir, '3');
      expect(result).toBe(path.join(tempDir, '003-my-project'));
    });

    it('should resolve project by name for amend', () => {
      const result = resolveProjectIdentifier(tempDir, 'my-project');
      expect(result).toBe(path.join(tempDir, '003-my-project'));
    });

    it('should resolve project by full folder name for amend', () => {
      const result = resolveProjectIdentifier(tempDir, '003-my-project');
      expect(result).toBe(path.join(tempDir, '003-my-project'));
    });

    it('should return null for non-existent project', () => {
      const result = resolveProjectIdentifier(tempDir, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Base36 Project Resolution for Amend', () => {
    beforeEach(() => {
      const projectDir = path.join(tempDir, 'a01-important-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '001-initial-task.md'),
        '# Task: Initial Task\n'
      );
    });

    it('should resolve project by base36 prefix for amend', () => {
      const result = resolveProjectIdentifier(tempDir, 'a01');
      expect(result).toBe(path.join(tempDir, 'a01-important-project'));
    });

    it('should resolve project by full base36 folder name for amend', () => {
      const result = resolveProjectIdentifier(tempDir, 'a01-important-project');
      expect(result).toBe(path.join(tempDir, 'a01-important-project'));
    });
  });

  describe('Existing Project State Loading', () => {
    it('should load pending tasks', () => {
      const projectDir = path.join(tempDir, '001-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '001-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '002-task-two.md'),
        '# Task: Task Two\n'
      );

      const state = deriveProjectState(projectDir);
      expect(state.tasks.length).toBe(2);
      expect(state.tasks[0].status).toBe('pending');
      expect(state.tasks[1].status).toBe('pending');
    });

    it('should load completed tasks', () => {
      const projectDir = path.join(tempDir, '001-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.mkdirSync(path.join(projectDir, 'outcomes'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '001-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '001-task-one.md'),
        '## Status: SUCCESS\n\nTask completed.'
      );

      const state = deriveProjectState(projectDir);
      expect(state.tasks.length).toBe(1);
      expect(state.tasks[0].status).toBe('completed');
    });

    it('should load failed tasks', () => {
      const projectDir = path.join(tempDir, '001-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.mkdirSync(path.join(projectDir, 'outcomes'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '001-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '001-task-one.md'),
        '## Status: FAILED\n\nTask failed.'
      );

      const state = deriveProjectState(projectDir);
      expect(state.tasks.length).toBe(1);
      expect(state.tasks[0].status).toBe('failed');
    });

    it('should load mixed task statuses', () => {
      const projectDir = path.join(tempDir, '001-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.mkdirSync(path.join(projectDir, 'outcomes'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '001-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '002-task-two.md'),
        '# Task: Task Two\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '003-task-three.md'),
        '# Task: Task Three\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '001-task-one.md'),
        '## Status: SUCCESS\n\nTask completed.'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '002-task-two.md'),
        '## Status: FAILED\n\nTask failed.'
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
      const projectDir = path.join(tempDir, '001-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.mkdirSync(path.join(projectDir, 'outcomes'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '001-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '002-task-two.md'),
        '# Task: Task Two\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '001-task-one.md'),
        '## Status: SUCCESS\n\nTask completed.'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '002-task-two.md'),
        '## Status: SUCCESS\n\nTask completed.'
      );

      const state = deriveProjectState(projectDir);
      expect(isProjectComplete(state)).toBe(true);
    });

    it('should not mark project as complete with pending tasks', () => {
      const projectDir = path.join(tempDir, '001-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.mkdirSync(path.join(projectDir, 'outcomes'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '001-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '002-task-two.md'),
        '# Task: Task Two\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '001-task-one.md'),
        '## Status: SUCCESS\n\nTask completed.'
      );

      const state = deriveProjectState(projectDir);
      expect(isProjectComplete(state)).toBe(false);
    });

    it('should not mark project as complete with failed tasks', () => {
      const projectDir = path.join(tempDir, '001-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.mkdirSync(path.join(projectDir, 'outcomes'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '001-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'outcomes', '001-task-one.md'),
        '## Status: FAILED\n\nTask failed.'
      );

      const state = deriveProjectState(projectDir);
      expect(isProjectComplete(state)).toBe(false);
    });
  });

  describe('Task Name Extraction', () => {
    it('should extract task name from plan file', () => {
      const name = extractTaskNameFromPlanFile('001-fix-login-bug.md');
      expect(name).toBe('fix-login-bug');
    });

    it('should extract task name from plan file with multiple hyphens', () => {
      const name = extractTaskNameFromPlanFile('002-add-user-registration-flow.md');
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
      const projectDir = path.join(tempDir, '001-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '001-task-one.md'),
        '# Task: Task One\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '002-task-two.md'),
        '# Task: Task Two\n'
      );
      fs.writeFileSync(
        path.join(projectDir, 'plans', '003-task-three.md'),
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
      const projectDir = path.join(tempDir, '001-test-project');
      fs.mkdirSync(projectDir);
      fs.mkdirSync(path.join(projectDir, 'plans'));
      fs.writeFileSync(
        path.join(projectDir, 'plans', '001-task-one.md'),
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
    it('should generate amend prompt with existing tasks context', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Original project description',
        existingTasks: [
          { id: '001', planFile: 'plans/001-first.md', status: 'completed', taskName: 'first' },
          { id: '002', planFile: 'plans/002-second.md', status: 'pending', taskName: 'second' },
        ],
        nextTaskNumber: 3,
        newTaskDescription: 'Add new feature X',
      };

      const prompt = getAmendPrompt(params);

      expect(prompt).toContain('AMENDMENT MODE');
      expect(prompt).toContain('Task 001: first [COMPLETED]');
      expect(prompt).toContain('Task 002: second [PENDING]');
      expect(prompt).toContain('starting from number 003');
      expect(prompt).toContain('Add new feature X');
      expect(prompt).toContain('Original project description');
      expect(prompt).toContain('/test/project');
    });

    it('should instruct not to modify existing tasks', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Original description',
        existingTasks: [
          { id: '001', planFile: 'plans/001-first.md', status: 'completed', taskName: 'first' },
        ],
        nextTaskNumber: 2,
        newTaskDescription: 'New tasks',
      };

      const prompt = getAmendPrompt(params);

      expect(prompt).toContain('DO NOT modify or touch existing plan files');
      expect(prompt).toContain('DO NOT renumber existing tasks');
      expect(prompt).toContain('ONLY create NEW tasks');
      expect(prompt).toContain('NEVER modify existing plan files');
    });

    it('should include failed task status in prompt', () => {
      const params: AmendPromptParams = {
        projectPath: '/test/project',
        inputContent: 'Original description',
        existingTasks: [
          { id: '001', planFile: 'plans/001-first.md', status: 'failed', taskName: 'first' },
        ],
        nextTaskNumber: 2,
        newTaskDescription: 'New tasks',
      };

      const prompt = getAmendPrompt(params);

      expect(prompt).toContain('Task 001: first [FAILED]');
    });

    it('should include correct plans directory path', () => {
      const params: AmendPromptParams = {
        projectPath: '/my/project/path',
        inputContent: 'Description',
        existingTasks: [
          { id: '001', planFile: 'plans/001-task.md', status: 'pending', taskName: 'task' },
        ],
        nextTaskNumber: 2,
        newTaskDescription: 'New tasks',
      };

      const prompt = getAmendPrompt(params);

      expect(prompt).toContain('/my/project/path/plans/002-task-name.md');
      expect(prompt).toContain('/my/project/path/plans/003-task-name.md');
    });
  });

  describe('Existing Project Detection Without Amend Flag', () => {
    it('should find existing project by name', () => {
      fs.mkdirSync(path.join(tempDir, '001-existing-project'));
      const result = resolveProjectIdentifier(tempDir, 'existing-project');
      expect(result).not.toBeNull();
    });

    it('should find existing project by number', () => {
      fs.mkdirSync(path.join(tempDir, '001-existing-project'));
      const result = resolveProjectIdentifier(tempDir, '1');
      expect(result).not.toBeNull();
    });

    it('should find existing project by full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '001-existing-project'));
      const result = resolveProjectIdentifier(tempDir, '001-existing-project');
      expect(result).not.toBeNull();
    });

    it('should return null for non-existing project', () => {
      fs.mkdirSync(path.join(tempDir, '001-existing-project'));
      const result = resolveProjectIdentifier(tempDir, 'new-project');
      expect(result).toBeNull();
    });
  });
});
