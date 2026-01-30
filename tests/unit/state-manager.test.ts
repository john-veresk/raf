import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { StateManager } from '../../src/core/state-manager.js';
import { createInitialState } from '../../src/types/state.js';

describe('StateManager', () => {
  let tempDir: string;
  let projectPath: string;
  let originalCwd: string;
  let rafRuntimeDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    projectPath = path.join(tempDir, 'test-project');
    rafRuntimeDir = path.join(tempDir, '.raf');
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'plans'), { recursive: true });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('initialize', () => {
    it('should create initial state file in .raf runtime directory', () => {
      const manager = StateManager.initialize(projectPath, 'test-project', 'input.md');

      // State should be created in .raf/state.json, not in projectPath
      const statePath = path.join(rafRuntimeDir, 'state.json');
      expect(fs.existsSync(statePath)).toBe(true);

      const state = manager.getState();
      expect(state.projectName).toBe('test-project');
      expect(state.status).toBe('planning');
      expect(state.tasks).toEqual([]);
    });
  });

  describe('load', () => {
    it('should load existing state from .raf runtime directory', () => {
      const initialState = createInitialState('test', 'input.md');
      // State file is in .raf/state.json
      fs.mkdirSync(rafRuntimeDir, { recursive: true });
      const statePath = path.join(rafRuntimeDir, 'state.json');
      fs.writeFileSync(statePath, JSON.stringify(initialState));

      const manager = new StateManager(projectPath);
      expect(manager.getProjectName()).toBe('test');
    });

    it('should throw if state file not found', () => {
      // Ensure .raf directory doesn't exist
      if (fs.existsSync(rafRuntimeDir)) {
        fs.rmSync(rafRuntimeDir, { recursive: true, force: true });
      }
      expect(() => new StateManager(projectPath)).toThrow('State file not found');
    });
  });

  describe('task management', () => {
    let manager: StateManager;

    beforeEach(() => {
      manager = StateManager.initialize(projectPath, 'test', 'input.md');
    });

    it('should add tasks', () => {
      manager.addTask('01', 'plans/01-task.md');
      manager.addTask('02', 'plans/02-task.md');

      const tasks = manager.getTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks[0]?.id).toBe('01');
      expect(tasks[1]?.id).toBe('02');
    });

    it('should update task status', () => {
      manager.addTask('01', 'plans/01-task.md');
      manager.updateTaskStatus('01', 'in_progress');

      const tasks = manager.getTasks();
      expect(tasks[0]?.status).toBe('in_progress');
      expect(tasks[0]?.startedAt).toBeDefined();
    });

    it('should set completedAt when completing', () => {
      manager.addTask('01', 'plans/01-task.md');
      manager.updateTaskStatus('01', 'completed');

      const tasks = manager.getTasks();
      expect(tasks[0]?.completedAt).toBeDefined();
    });

    it('should increment attempts', () => {
      manager.addTask('01', 'plans/01-task.md');

      expect(manager.incrementAttempts('01')).toBe(1);
      expect(manager.incrementAttempts('01')).toBe(2);

      const tasks = manager.getTasks();
      expect(tasks[0]?.attempts).toBe(2);
    });

    it('should get next pending task', () => {
      manager.addTask('01', 'plans/01-task.md');
      manager.addTask('02', 'plans/02-task.md');

      const task1 = manager.getNextPendingTask();
      expect(task1?.id).toBe('01');

      manager.updateTaskStatus('01', 'completed');

      const task2 = manager.getNextPendingTask();
      expect(task2?.id).toBe('02');
    });

    it('should return null when no pending tasks', () => {
      manager.addTask('01', 'plans/01-task.md');
      manager.updateTaskStatus('01', 'completed');

      const task = manager.getNextPendingTask();
      expect(task).toBeNull();
    });
  });

  describe('stats', () => {
    let manager: StateManager;

    beforeEach(() => {
      manager = StateManager.initialize(projectPath, 'test', 'input.md');
      manager.addTask('01', 'plans/01-task.md');
      manager.addTask('02', 'plans/02-task.md');
      manager.addTask('03', 'plans/03-task.md');
    });

    it('should calculate correct stats', () => {
      manager.updateTaskStatus('01', 'completed');
      manager.updateTaskStatus('02', 'failed');

      const stats = manager.getStats();
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
    });

    it('should detect completion', () => {
      expect(manager.isComplete()).toBe(false);

      manager.updateTaskStatus('01', 'completed');
      manager.updateTaskStatus('02', 'completed');
      manager.updateTaskStatus('03', 'skipped');

      expect(manager.isComplete()).toBe(true);
    });

    it('should detect failures', () => {
      expect(manager.hasFailed()).toBe(false);

      manager.updateTaskStatus('01', 'failed');

      expect(manager.hasFailed()).toBe(true);
    });
  });

  describe('syncTasksFromPlans', () => {
    let manager: StateManager;

    beforeEach(() => {
      manager = StateManager.initialize(projectPath, 'test', 'input.md');
    });

    it('should sync tasks from plan files', () => {
      // Create plan files
      fs.writeFileSync(path.join(projectPath, 'plans', '01-login.md'), '# Login');
      fs.writeFileSync(path.join(projectPath, 'plans', '02-signup.md'), '# Signup');

      manager.syncTasksFromPlans();

      const tasks = manager.getTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks[0]?.id).toBe('01');
      expect(tasks[0]?.planFile).toBe('plans/01-login.md');
      expect(tasks[1]?.id).toBe('02');
    });

    it('should clear and resync tasks', () => {
      manager.addTask('99', 'plans/99-old.md');

      fs.writeFileSync(path.join(projectPath, 'plans', '01-new.md'), '# New');

      manager.syncTasksFromPlans();

      const tasks = manager.getTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.id).toBe('01');
    });
  });

  describe('task baseline', () => {
    let manager: StateManager;

    beforeEach(() => {
      manager = StateManager.initialize(projectPath, 'test', 'input.md');
      manager.addTask('01', 'plans/01-task.md');
    });

    it('should set task baseline', () => {
      const baseline = ['file1.ts', 'file2.ts'];
      manager.setTaskBaseline('01', baseline);

      const savedBaseline = manager.getTaskBaseline('01');
      expect(savedBaseline).toEqual(baseline);
    });

    it('should return undefined for task without baseline', () => {
      const baseline = manager.getTaskBaseline('01');
      expect(baseline).toBeUndefined();
    });

    it('should throw when setting baseline for non-existent task', () => {
      expect(() => manager.setTaskBaseline('99', [])).toThrow('Task not found: 99');
    });

    it('should return undefined for non-existent task', () => {
      const baseline = manager.getTaskBaseline('99');
      expect(baseline).toBeUndefined();
    });

    it('should persist baseline to file', () => {
      const baseline = ['src/modified.ts'];
      manager.setTaskBaseline('01', baseline);

      // Load state from .raf/state.json
      const statePath = path.join(rafRuntimeDir, 'state.json');
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);

      expect(state.tasks[0].filesBeforeTask).toEqual(baseline);
    });

    it('should handle empty baseline', () => {
      manager.setTaskBaseline('01', []);
      expect(manager.getTaskBaseline('01')).toEqual([]);
    });
  });
});
