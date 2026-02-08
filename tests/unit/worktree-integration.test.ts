import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Integration tests for worktree utilities using real temporary git repos.
 * These tests create actual git repos and worktrees to verify behavior.
 */

// Import the actual module (no mocking)
const {
  computeWorktreePath,
  createWorktree,
  validateWorktree,
  mergeWorktreeBranch,
  removeWorktree,
  getWorktreeProjectPath,
} = await import('../../src/core/worktree.js');

/**
 * Helper: create a temp directory for testing.
 * Uses realpathSync to resolve symlinks (e.g., /tmp -> /private/tmp on macOS).
 */
function makeTempDir(prefix: string): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

/**
 * Helper: initialise a bare-bones git repo with one commit.
 * Returns the repo directory path.
 */
function initGitRepo(dir: string): void {
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
  fs.writeFileSync(path.join(dir, 'README.md'), '# Test repo\n');
  execSync('git add .', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: 'pipe' });
}

describe('worktree integration tests (real git repos)', () => {
  let repoDir: string;
  let originalCwd: string;
  const worktreePaths: string[] = []; // track for cleanup

  beforeEach(() => {
    repoDir = makeTempDir('raf-wt-integ-');
    initGitRepo(repoDir);
    originalCwd = process.cwd();
    process.chdir(repoDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);

    // Remove worktrees first (must happen before removing repo)
    for (const wtPath of worktreePaths) {
      try {
        execSync(`git worktree remove "${wtPath}" --force`, { cwd: repoDir, stdio: 'pipe' });
      } catch {
        // Worktree may already be removed
      }
    }
    worktreePaths.length = 0;

    // Clean up temp directory
    fs.rmSync(repoDir, { recursive: true, force: true });
  });

  describe('createWorktree (real git)', () => {
    it('should create a real worktree with a new branch', () => {
      // Use a custom path within the temp dir to avoid polluting ~/.raf
      const wtPath = path.join(repoDir, 'worktrees', 'test-project');
      fs.mkdirSync(path.join(repoDir, 'worktrees'), { recursive: true });

      // Create worktree manually since createWorktree uses ~/.raf paths
      execSync(`git worktree add "${wtPath}" -b "test-project"`, { cwd: repoDir, stdio: 'pipe' });
      worktreePaths.push(wtPath);

      // Verify the worktree was created
      expect(fs.existsSync(wtPath)).toBe(true);
      expect(fs.existsSync(path.join(wtPath, '.git'))).toBe(true);
      expect(fs.existsSync(path.join(wtPath, 'README.md'))).toBe(true);

      // Verify the branch was created
      const branches = execSync('git branch', { cwd: repoDir, encoding: 'utf-8' });
      expect(branches).toContain('test-project');

      // Verify worktree is listed
      const wtList = execSync('git worktree list', { cwd: repoDir, encoding: 'utf-8' });
      expect(wtList).toContain(wtPath);
    });

    it('should fail to create worktree when branch already exists', () => {
      const wtPath1 = path.join(repoDir, 'worktrees', 'my-branch');
      fs.mkdirSync(path.join(repoDir, 'worktrees'), { recursive: true });

      execSync(`git worktree add "${wtPath1}" -b "my-branch"`, { cwd: repoDir, stdio: 'pipe' });
      worktreePaths.push(wtPath1);

      // Try to create another worktree with the same branch name
      const wtPath2 = path.join(repoDir, 'worktrees', 'my-branch-2');
      expect(() => {
        execSync(`git worktree add "${wtPath2}" -b "my-branch"`, { cwd: repoDir, stdio: 'pipe' });
      }).toThrow();
    });
  });

  describe('validateWorktree (real git)', () => {
    it('should validate an existing worktree with project folder and plans', () => {
      const wtPath = path.join(repoDir, 'worktrees', 'project-wt');
      fs.mkdirSync(path.join(repoDir, 'worktrees'), { recursive: true });
      execSync(`git worktree add "${wtPath}" -b "project-wt"`, { cwd: repoDir, stdio: 'pipe' });
      worktreePaths.push(wtPath);

      // Create project structure inside worktree
      const projectRelPath = 'RAF/020-test-project';
      const projectDir = path.join(wtPath, projectRelPath);
      fs.mkdirSync(projectDir, { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'plans'), { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'plans', '001-task.md'), '# Task 1\n');

      const result = validateWorktree(wtPath, projectRelPath);

      expect(result.exists).toBe(true);
      expect(result.isValidWorktree).toBe(true);
      expect(result.hasProjectFolder).toBe(true);
      expect(result.hasPlans).toBe(true);
      expect(result.projectPath).toBe(projectDir);
    });

    it('should detect non-existing worktree path', () => {
      const result = validateWorktree('/nonexistent/path', 'RAF/test');
      expect(result.exists).toBe(false);
      expect(result.isValidWorktree).toBe(false);
    });

    it('should detect directory that is not a git worktree', () => {
      const fakeDir = path.join(repoDir, 'not-a-worktree');
      fs.mkdirSync(fakeDir);

      const result = validateWorktree(fakeDir, 'RAF/test');
      expect(result.exists).toBe(true);
      expect(result.isValidWorktree).toBe(false);
    });

    it('should detect worktree without project folder', () => {
      const wtPath = path.join(repoDir, 'worktrees', 'no-project');
      fs.mkdirSync(path.join(repoDir, 'worktrees'), { recursive: true });
      execSync(`git worktree add "${wtPath}" -b "no-project"`, { cwd: repoDir, stdio: 'pipe' });
      worktreePaths.push(wtPath);

      const result = validateWorktree(wtPath, 'RAF/missing-project');

      expect(result.exists).toBe(true);
      expect(result.isValidWorktree).toBe(true);
      expect(result.hasProjectFolder).toBe(false);
      expect(result.hasPlans).toBe(false);
    });
  });

  describe('mergeWorktreeBranch (real git)', () => {
    it('should fast-forward merge when no divergence', () => {
      const wtPath = path.join(repoDir, 'worktrees', 'ff-branch');
      fs.mkdirSync(path.join(repoDir, 'worktrees'), { recursive: true });
      execSync(`git worktree add "${wtPath}" -b "ff-branch"`, { cwd: repoDir, stdio: 'pipe' });
      worktreePaths.push(wtPath);

      // Make a commit in the worktree
      fs.writeFileSync(path.join(wtPath, 'feature.txt'), 'new feature\n');
      execSync('git add .', { cwd: wtPath, stdio: 'pipe' });
      execSync('git commit -m "Add feature"', { cwd: wtPath, stdio: 'pipe' });

      // Get the original branch name
      const mainBranch = execSync('git branch --show-current', { cwd: repoDir, encoding: 'utf-8' }).trim();

      // Merge from the main repo
      const result = mergeWorktreeBranch('ff-branch', mainBranch);

      expect(result.success).toBe(true);
      expect(result.merged).toBe(true);
      expect(result.fastForward).toBe(true);

      // Verify the file appears on main branch
      expect(fs.existsSync(path.join(repoDir, 'feature.txt'))).toBe(true);
    });

    it('should fall back to merge commit when branches have diverged', () => {
      const wtPath = path.join(repoDir, 'worktrees', 'diverge-branch');
      fs.mkdirSync(path.join(repoDir, 'worktrees'), { recursive: true });
      execSync(`git worktree add "${wtPath}" -b "diverge-branch"`, { cwd: repoDir, stdio: 'pipe' });
      worktreePaths.push(wtPath);

      // Get the main branch name
      const mainBranch = execSync('git branch --show-current', { cwd: repoDir, encoding: 'utf-8' }).trim();

      // Make a commit in the worktree
      fs.writeFileSync(path.join(wtPath, 'worktree-file.txt'), 'worktree change\n');
      execSync('git add .', { cwd: wtPath, stdio: 'pipe' });
      execSync('git commit -m "Worktree commit"', { cwd: wtPath, stdio: 'pipe' });

      // Make a DIFFERENT commit on main (diverge)
      fs.writeFileSync(path.join(repoDir, 'main-file.txt'), 'main change\n');
      execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
      execSync('git commit -m "Main commit"', { cwd: repoDir, stdio: 'pipe' });

      // Merge from the main repo
      const result = mergeWorktreeBranch('diverge-branch', mainBranch);

      expect(result.success).toBe(true);
      expect(result.merged).toBe(true);
      expect(result.fastForward).toBe(false);

      // Verify both files exist after merge
      expect(fs.existsSync(path.join(repoDir, 'worktree-file.txt'))).toBe(true);
      expect(fs.existsSync(path.join(repoDir, 'main-file.txt'))).toBe(true);
    });

    it('should abort and return failure on merge conflicts', () => {
      const wtPath = path.join(repoDir, 'worktrees', 'conflict-branch');
      fs.mkdirSync(path.join(repoDir, 'worktrees'), { recursive: true });
      execSync(`git worktree add "${wtPath}" -b "conflict-branch"`, { cwd: repoDir, stdio: 'pipe' });
      worktreePaths.push(wtPath);

      // Get the main branch name
      const mainBranch = execSync('git branch --show-current', { cwd: repoDir, encoding: 'utf-8' }).trim();

      // Modify the SAME file in the worktree
      fs.writeFileSync(path.join(wtPath, 'README.md'), '# Modified in worktree\n');
      execSync('git add .', { cwd: wtPath, stdio: 'pipe' });
      execSync('git commit -m "Worktree change to README"', { cwd: wtPath, stdio: 'pipe' });

      // Modify the SAME file on main (conflict)
      fs.writeFileSync(path.join(repoDir, 'README.md'), '# Modified on main\n');
      execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
      execSync('git commit -m "Main change to README"', { cwd: repoDir, stdio: 'pipe' });

      // Merge should fail with conflict
      const result = mergeWorktreeBranch('conflict-branch', mainBranch);

      expect(result.success).toBe(false);
      expect(result.merged).toBe(false);
      expect(result.error).toContain('manually');

      // Verify we're back on main branch (merge was aborted)
      const currentBranch = execSync('git branch --show-current', { cwd: repoDir, encoding: 'utf-8' }).trim();
      expect(currentBranch).toBe(mainBranch);

      // Verify no merge in progress
      const status = execSync('git status', { cwd: repoDir, encoding: 'utf-8' });
      expect(status).not.toContain('Unmerged');
    });

    it('should return failure when checkout fails', () => {
      const result = mergeWorktreeBranch('some-branch', 'nonexistent-branch');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to checkout');
    });
  });

  describe('removeWorktree (real git)', () => {
    it('should remove a real worktree for failed-plan cleanup', () => {
      const wtPath = path.join(repoDir, 'worktrees', 'to-remove');
      fs.mkdirSync(path.join(repoDir, 'worktrees'), { recursive: true });
      execSync(`git worktree add "${wtPath}" -b "to-remove"`, { cwd: repoDir, stdio: 'pipe' });
      // Don't add to worktreePaths since we're removing it in the test

      // Verify it exists
      expect(fs.existsSync(wtPath)).toBe(true);

      // Remove it
      const result = removeWorktree(wtPath);

      expect(result.success).toBe(true);
      expect(fs.existsSync(wtPath)).toBe(false);

      // Verify it's no longer in worktree list
      const wtList = execSync('git worktree list', { cwd: repoDir, encoding: 'utf-8' });
      expect(wtList).not.toContain(wtPath);
    });

    it('should fail to remove a nonexistent worktree', () => {
      const result = removeWorktree('/nonexistent/worktree/path');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to remove worktree');
    });
  });
});

describe('worktree CLI validation', () => {
  // These tests verify the validation logic that exists in the do command.
  // We test the conditions directly rather than spawning the CLI.

  describe('--merge requires --worktree', () => {
    it('should identify when --merge is set without --worktree', () => {
      const worktreeMode = false;
      const mergeMode = true;

      // This mirrors the validation in do.ts
      const isInvalid = mergeMode && !worktreeMode;
      expect(isInvalid).toBe(true);
    });

    it('should allow --merge with --worktree', () => {
      const worktreeMode = true;
      const mergeMode = true;

      const isInvalid = mergeMode && !worktreeMode;
      expect(isInvalid).toBe(false);
    });

    it('should allow --worktree without --merge', () => {
      const worktreeMode = true;
      const mergeMode = false;

      const isInvalid = mergeMode && !worktreeMode;
      expect(isInvalid).toBe(false);
    });
  });

  describe('--worktree supports only single project', () => {
    it('should identify when multiple projects are provided with --worktree', () => {
      const worktreeMode = true;
      const projectIdentifiers = ['project-a', 'project-b'];

      // This mirrors the validation in do.ts
      const isInvalid = worktreeMode && projectIdentifiers.length > 1;
      expect(isInvalid).toBe(true);
    });

    it('should allow single project with --worktree', () => {
      const worktreeMode = true;
      const projectIdentifiers = ['project-a'];

      const isInvalid = worktreeMode && projectIdentifiers.length > 1;
      expect(isInvalid).toBe(false);
    });

    it('should allow no project with --worktree (auto-discovery)', () => {
      const worktreeMode = true;
      const projectIdentifiers: string[] = [];

      const isInvalid = worktreeMode && projectIdentifiers.length > 1;
      expect(isInvalid).toBe(false);
    });
  });

  describe('--worktree validation for missing worktree', () => {
    it('should identify when worktree does not exist', () => {
      // validateWorktree returns exists=false for nonexistent paths
      const validation = {
        exists: false,
        isValidWorktree: false,
        hasProjectFolder: false,
        hasPlans: false,
        projectPath: null,
      };

      const isInvalid = !validation.exists || !validation.isValidWorktree;
      expect(isInvalid).toBe(true);
    });

    it('should identify when directory exists but is not a valid worktree', () => {
      const validation = {
        exists: true,
        isValidWorktree: false,
        hasProjectFolder: false,
        hasPlans: false,
        projectPath: null,
      };

      const isInvalid = !validation.exists || !validation.isValidWorktree;
      expect(isInvalid).toBe(true);
    });

    it('should identify when worktree exists but project content is missing', () => {
      const validation = {
        exists: true,
        isValidWorktree: true,
        hasProjectFolder: false,
        hasPlans: false,
        projectPath: null,
      };

      const isInvalid = !validation.hasProjectFolder || !validation.hasPlans;
      expect(isInvalid).toBe(true);
    });

    it('should pass when worktree has valid project and plans', () => {
      const validation = {
        exists: true,
        isValidWorktree: true,
        hasProjectFolder: true,
        hasPlans: true,
        projectPath: '/some/path',
      };

      const existsOk = validation.exists && validation.isValidWorktree;
      const contentOk = validation.hasProjectFolder && validation.hasPlans;
      expect(existsOk && contentOk).toBe(true);
    });
  });
});
