import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ProjectManager } from '../../src/core/project-manager.js';
import { encodeBase26, RAF_EPOCH } from '../../src/utils/paths.js';

describe('ProjectManager', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createProject', () => {
    it('should create project with correct structure', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('test-project');

      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'plans'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'outcomes'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'decisions.md'))).toBe(true);
    });

    it('should create projects with epoch-based IDs', () => {
      const manager = new ProjectManager();

      const path1 = manager.createProject('first');
      const path2 = manager.createProject('second');

      const folder1 = path.basename(path1);
      const folder2 = path.basename(path2);

      // Both should have 6-char base26 prefix followed by hyphen and name
      expect(folder1).toMatch(/^[a-z]{6}-first$/);
      expect(folder2).toMatch(/^[a-z]{6}-second$/);

      // Second should have equal or greater prefix than first (timestamp-based)
      const prefix1 = folder1.split('-')[0]!;
      const prefix2 = folder2.split('-')[0]!;
      expect(prefix2 >= prefix1).toBe(true);
    });

    it('should sanitize project names', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('My Project Name!');

      const folder = path.basename(projectPath);
      expect(folder).toMatch(/^[a-z]{6}-my-project-name$/);
    });
  });

  describe('findProject', () => {
    it('should find existing project by name', () => {
      const manager = new ProjectManager();
      manager.createProject('findme');

      const found = manager.findProject('findme');
      expect(found).not.toBeNull();
      expect(found).toContain('-findme');
      expect(path.basename(found!)).toMatch(/^[a-z]{6}-findme$/);
    });

    it('should return null for non-existent project', () => {
      const manager = new ProjectManager();
      const found = manager.findProject('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('listProjects', () => {
    it('should list all projects', () => {
      const manager = new ProjectManager();
      manager.createProject('alpha');
      manager.createProject('beta');

      const projects = manager.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects[0]?.name).toBe('alpha');
      expect(projects[1]?.name).toBe('beta');
    });

    it('should return empty array when no projects', () => {
      const manager = new ProjectManager();
      const projects = manager.listProjects();
      expect(projects).toEqual([]);
    });

    it('should include task counts from derived state', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('test');

      // Create plan files
      fs.writeFileSync(path.join(projectPath, 'plans', '01-task.md'), '# Task 1');
      fs.writeFileSync(path.join(projectPath, 'plans', '02-task.md'), '# Task 2');

      // Create outcome with COMPLETE promise marker
      fs.writeFileSync(
        path.join(projectPath, 'outcomes', '01-task.md'),
        '# Task 001 - Completed\n\n<promise>COMPLETE</promise>'
      );

      const projects = manager.listProjects();
      expect(projects[0]?.taskCount).toBe(2);
      expect(projects[0]?.completedCount).toBe(1);
      expect(projects[0]?.failedCount).toBe(0);
    });
  });

  describe('saveInput and readInput', () => {
    it('should save and read input', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('test');

      const content = '# My Project\n\nDescription here.';
      manager.saveInput(projectPath, content);

      const read = manager.readInput(projectPath);
      expect(read).toBe(content);
    });
  });

  describe('saveOutcome and readOutcomes', () => {
    it('should save and read outcomes', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('test');

      // Create a plan file to match naming
      fs.writeFileSync(
        path.join(projectPath, 'plans', '01-task.md'),
        '# Task'
      );

      manager.saveOutcome(projectPath, '01', 'Outcome content');

      const outcomes = manager.readOutcomes(projectPath);
      expect(outcomes).toHaveLength(1);
      expect(outcomes[0]?.taskId).toBe('01');
      expect(outcomes[0]?.content).toBe('Outcome content');
    });
  });

  describe('saveLog', () => {
    it('should create logs directory in project and save log', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('test');

      manager.saveLog(projectPath, '01', 'Log content');

      const logPath = path.join(projectPath, 'logs', '01-task.log');
      expect(fs.existsSync(logPath)).toBe(true);
      expect(fs.readFileSync(logPath, 'utf-8')).toBe('Log content');
    });
  });

  describe('isProjectFolderEmpty', () => {
    it('should return true for non-existent folder', () => {
      const manager = new ProjectManager();
      const nonExistentPath = path.join(tempDir, 'nonexistent');

      expect(manager.isProjectFolderEmpty(nonExistentPath)).toBe(true);
    });

    it('should return true when plans directory does not exist', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('test');

      // Remove plans directory
      const plansDir = path.join(projectPath, 'plans');
      fs.rmSync(plansDir, { recursive: true, force: true });

      expect(manager.isProjectFolderEmpty(projectPath)).toBe(true);
    });

    it('should return true when plans directory is empty', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('test');

      // Plans directory exists but has no files
      expect(manager.isProjectFolderEmpty(projectPath)).toBe(true);
    });

    it('should return false when at least one plan file exists', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('test');

      // Create a plan file
      const plansDir = path.join(projectPath, 'plans');
      fs.writeFileSync(path.join(plansDir, '01-task.md'), '# Task 1');

      expect(manager.isProjectFolderEmpty(projectPath)).toBe(false);
    });

    it('should ignore non-.md files in plans directory', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('test');

      // Create a non-.md file
      const plansDir = path.join(projectPath, 'plans');
      fs.writeFileSync(path.join(plansDir, 'notes.txt'), 'Notes');

      expect(manager.isProjectFolderEmpty(projectPath)).toBe(true);
    });
  });

  describe('cleanupEmptyProject', () => {
    it('should delete folder when no plans exist', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('test');

      // Verify folder exists
      expect(fs.existsSync(projectPath)).toBe(true);

      // Cleanup should remove the folder
      manager.cleanupEmptyProject(projectPath);

      expect(fs.existsSync(projectPath)).toBe(false);
    });

    it('should not delete folder when plans exist', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('test');

      // Create a plan file
      const plansDir = path.join(projectPath, 'plans');
      fs.writeFileSync(path.join(plansDir, '01-task.md'), '# Task 1');

      // Cleanup should NOT remove the folder
      manager.cleanupEmptyProject(projectPath);

      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(plansDir, '01-task.md'))).toBe(true);
    });

    it('should handle non-existent folder gracefully', () => {
      const manager = new ProjectManager();
      const nonExistentPath = path.join(tempDir, 'nonexistent');

      // Should not throw
      expect(() => {
        manager.cleanupEmptyProject(nonExistentPath);
      }).not.toThrow();
    });

    it('should be idempotent - safe to call multiple times', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('test');

      // Call cleanup multiple times
      manager.cleanupEmptyProject(projectPath);
      manager.cleanupEmptyProject(projectPath);
      manager.cleanupEmptyProject(projectPath);

      expect(fs.existsSync(projectPath)).toBe(false);
    });

    it('should delete folder even if only subdirectories exist (no plans)', () => {
      const manager = new ProjectManager();
      const projectPath = manager.createProject('test');

      // Create additional subdirectories but no plan files
      fs.mkdirSync(path.join(projectPath, 'extra'), { recursive: true });

      manager.cleanupEmptyProject(projectPath);

      expect(fs.existsSync(projectPath)).toBe(false);
    });
  });
});
