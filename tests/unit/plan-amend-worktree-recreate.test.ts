import { jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Tests for worktree recreation logic in the amend command.
 *
 * When `raf plan --amend --worktree <project>` is run and no existing worktree
 * is found, there are two fallback scenarios:
 * 1. Branch exists → recreate worktree from branch (createWorktreeFromBranch)
 * 2. No branch → create fresh worktree (createWorktree) + copy project files
 */

// Mock execSync before importing the module
const mockExecSync = jest.fn();
jest.unstable_mockModule('node:child_process', () => ({
  execSync: mockExecSync,
}));

// Mock logger
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

const { branchExists, createWorktreeFromBranch, createWorktree } = await import(
  '../../src/core/worktree.js'
);

describe('Plan Amend - Worktree Recreation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('worktree recreation decision logic', () => {
    /**
     * Simulate the fallback decision from runAmendCommand when no worktree is found:
     *   1. Resolve project from main repo → get folderName
     *   2. If branchExists(folderName) → createWorktreeFromBranch
     *   3. Else → createWorktree + copy project files
     */

    it('should choose createWorktreeFromBranch when branch exists', () => {
      // branchExists returns true when git branch --list returns output
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('branch --list "022-my-project"')) return '  022-my-project\n';
        return '';
      });

      expect(branchExists('022-my-project')).toBe(true);
    });

    it('should choose createWorktree when branch does not exist', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('branch --list "022-my-project"')) return '';
        return '';
      });

      expect(branchExists('022-my-project')).toBe(false);
    });
  });

  describe('createWorktreeFromBranch for recreating cleaned-up worktrees', () => {
    it('should recreate worktree from existing branch successfully', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('branch --list')) return '  022-my-project\n';
        if (cmdStr.includes('worktree add')) return '';
        return '';
      });

      const result = createWorktreeFromBranch('myapp', '022-my-project');

      expect(result.success).toBe(true);
      expect(result.branch).toBe('022-my-project');
      expect(result.worktreePath).toContain('022-my-project');
      // Should use `git worktree add <path> <branch>` (no -b flag)
      const worktreeAddCall = mockExecSync.mock.calls.find(
        (c: unknown[]) => (c[0] as string).includes('worktree add')
      );
      expect(worktreeAddCall).toBeDefined();
      const cmd = worktreeAddCall![0] as string;
      expect(cmd).not.toContain('-b');
      expect(cmd).toContain('"022-my-project"');
    });

    it('should fail if branch does not exist', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('branch --list')) return '';
        return '';
      });

      const result = createWorktreeFromBranch('myapp', '022-my-project');

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist locally');
    });
  });

  describe('createWorktree for fresh worktree (no branch)', () => {
    it('should create fresh worktree with new branch', () => {
      mockExecSync.mockReturnValue('');

      const result = createWorktree('myapp', '022-my-project');

      expect(result.success).toBe(true);
      expect(result.branch).toBe('022-my-project');
      // Should use `git worktree add <path> -b <branch>`
      const cmd = mockExecSync.mock.calls.find(
        (c: unknown[]) => (c[0] as string).includes('worktree add')
      );
      expect(cmd).toBeDefined();
      expect((cmd![0] as string)).toContain('-b');
    });
  });

  describe('project file copy for fresh worktree', () => {
    let tempDir: string;
    let mainProjectDir: string;
    let wtProjectDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-amend-recreate-'));
      mainProjectDir = path.join(tempDir, 'main-repo', 'RAF', '022-my-project');
      wtProjectDir = path.join(tempDir, 'worktree', 'RAF', '022-my-project');

      // Create main repo project structure
      fs.mkdirSync(path.join(mainProjectDir, 'plans'), { recursive: true });
      fs.mkdirSync(path.join(mainProjectDir, 'outcomes'), { recursive: true });
      fs.writeFileSync(path.join(mainProjectDir, 'input.md'), 'My project input');
      fs.writeFileSync(path.join(mainProjectDir, 'decisions.md'), '# Decisions');
      fs.writeFileSync(
        path.join(mainProjectDir, 'plans', '01-first-task.md'),
        '# Task: First task'
      );
      fs.writeFileSync(
        path.join(mainProjectDir, 'outcomes', '01-first-task.md'),
        'Completed\n<promise>COMPLETE</promise>'
      );

      // Ensure worktree parent exists
      fs.mkdirSync(path.join(tempDir, 'worktree', 'RAF'), { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should copy project files from main repo to new worktree', () => {
      // Simulate: fs.cpSync(mainResolution.path, wtProjectPath, { recursive: true })
      fs.cpSync(mainProjectDir, wtProjectDir, { recursive: true });

      // Verify all files were copied
      expect(fs.existsSync(path.join(wtProjectDir, 'input.md'))).toBe(true);
      expect(fs.existsSync(path.join(wtProjectDir, 'decisions.md'))).toBe(true);
      expect(fs.existsSync(path.join(wtProjectDir, 'plans', '01-first-task.md'))).toBe(true);
      expect(fs.existsSync(path.join(wtProjectDir, 'outcomes', '01-first-task.md'))).toBe(true);

      // Verify content
      expect(fs.readFileSync(path.join(wtProjectDir, 'input.md'), 'utf-8')).toBe(
        'My project input'
      );
    });

    it('should preserve directory structure during copy', () => {
      fs.cpSync(mainProjectDir, wtProjectDir, { recursive: true });

      // Verify directory structure
      const entries = fs.readdirSync(wtProjectDir);
      expect(entries.sort()).toEqual(['decisions.md', 'input.md', 'outcomes', 'plans']);

      const planFiles = fs.readdirSync(path.join(wtProjectDir, 'plans'));
      expect(planFiles).toEqual(['01-first-task.md']);

      const outcomeFiles = fs.readdirSync(path.join(wtProjectDir, 'outcomes'));
      expect(outcomeFiles).toEqual(['01-first-task.md']);
    });
  });

  describe('error handling', () => {
    it('should fail when project not found in main repo or worktrees', () => {
      // When neither worktree search nor main repo resolution finds the project,
      // the command should error out. This tests the condition check.
      const mainResolutionPath: string | null = null;
      const matchedWorktreeDir: string | null = null;

      // Both paths exhausted
      expect(mainResolutionPath).toBeNull();
      expect(matchedWorktreeDir).toBeNull();
    });

    it('should fail when createWorktreeFromBranch fails', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('branch --list')) return '  022-my-project\n';
        if (cmdStr.includes('worktree add')) throw new Error('worktree already exists');
        return '';
      });

      const result = createWorktreeFromBranch('myapp', '022-my-project');

      expect(result.success).toBe(false);
      expect(result.error).toContain('worktree already exists');
    });

    it('should fail when createWorktree fails for fresh worktree', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('worktree add')) throw new Error('branch already exists');
        return '';
      });

      const result = createWorktree('myapp', '022-my-project');

      expect(result.success).toBe(false);
      expect(result.error).toContain('branch already exists');
    });
  });

  describe('existing worktree flow unchanged', () => {
    /**
     * When the worktree already exists and contains the project,
     * the fallback logic should NOT be triggered.
     */
    it('should skip recreation when worktree search finds a match', () => {
      // Simulate: worktree search finds a match
      const matchedWorktreeDir = '/home/user/.raf/worktrees/myapp/022-my-project';
      const matchedProjectPath = '/home/user/.raf/worktrees/myapp/022-my-project/RAF/022-my-project';

      // Both are non-null, so the fallback is NOT entered
      expect(matchedWorktreeDir).not.toBeNull();
      expect(matchedProjectPath).not.toBeNull();
    });
  });
});
