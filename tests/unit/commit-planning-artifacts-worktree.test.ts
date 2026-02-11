import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Integration tests for commitPlanningArtifacts in worktree scenarios.
 * Uses real git repos and worktrees to verify the commit behavior.
 */

// Import the actual module (no mocking)
const { commitPlanningArtifacts } = await import('../../src/core/git.js');

/**
 * Helper: create a temp directory for testing.
 * Uses realpathSync to resolve symlinks (e.g., /tmp -> /private/tmp on macOS).
 */
function makeTempDir(prefix: string): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

/**
 * Helper: initialise a bare-bones git repo with one commit.
 */
function initGitRepo(dir: string): void {
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
  fs.writeFileSync(path.join(dir, 'README.md'), '# Test repo\n');
  execSync('git add .', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: 'pipe' });
}

/**
 * Helper: get the last commit message.
 */
function getLastCommitMessage(cwd: string): string {
  return execSync('git log -1 --format=%s', { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim();
}

/**
 * Helper: get list of files changed in the last commit.
 */
function getLastCommitFiles(cwd: string): string[] {
  const output = execSync('git show --name-only --format=""', {
    cwd,
    encoding: 'utf-8',
    stdio: 'pipe',
  }).trim();
  return output ? output.split('\n').filter(Boolean) : [];
}

describe('commitPlanningArtifacts - worktree integration', () => {
  let repoDir: string;
  let worktreePath: string;
  const worktreePaths: string[] = [];

  beforeEach(() => {
    repoDir = makeTempDir('raf-commit-wt-');
    initGitRepo(repoDir);
  });

  afterEach(() => {
    // Clean up worktrees first (before removing repo)
    for (const wt of worktreePaths) {
      try {
        execSync(`git worktree remove "${wt}" --force`, { cwd: repoDir, stdio: 'pipe' });
      } catch {
        // Ignore cleanup errors
      }
    }
    worktreePaths.length = 0;

    // Clean up repo
    try {
      fs.rmSync(repoDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  function createInitialProject(dir: string, projectFolder: string): string {
    const projectPath = path.join(dir, 'RAF', projectFolder);
    fs.mkdirSync(path.join(projectPath, 'plans'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'outcomes'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'input.md'), 'original input');
    fs.writeFileSync(path.join(projectPath, 'decisions.md'), '# Decisions\n\n## Q1?\nA1');
    fs.writeFileSync(path.join(projectPath, 'plans', '01-first-task.md'), '# Task: First');
    return projectPath;
  }

  function createWorktreeForProject(repoDir: string, projectFolder: string): string {
    const wtPath = path.join(makeTempDir('raf-wt-'), projectFolder);
    execSync(`git worktree add "${wtPath}" -b "${projectFolder}"`, {
      cwd: repoDir,
      stdio: 'pipe',
    });
    worktreePaths.push(wtPath);
    return wtPath;
  }

  it('should commit input.md and decisions.md changes in worktree', async () => {
    const projectFolder = 'aatest-my-project';

    // Create initial project and commit
    createInitialProject(repoDir, projectFolder);
    execSync('git add -A', { cwd: repoDir, stdio: 'pipe' });
    execSync('git commit -m "Initial plan"', { cwd: repoDir, stdio: 'pipe' });

    // Create worktree
    worktreePath = createWorktreeForProject(repoDir, projectFolder);
    const wtProjectPath = path.join(worktreePath, 'RAF', projectFolder);

    // Simulate amend: update input.md and decisions.md
    fs.writeFileSync(
      path.join(wtProjectPath, 'input.md'),
      'original input\n\n---\n\nnew task description'
    );
    fs.writeFileSync(
      path.join(wtProjectPath, 'decisions.md'),
      '# Decisions\n\n## Q1?\nA1\n\n## Q2?\nA2'
    );

    // Call commitPlanningArtifacts with worktree cwd
    await commitPlanningArtifacts(wtProjectPath, {
      cwd: worktreePath,
    });

    // Verify commit was made
    const lastMsg = getLastCommitMessage(worktreePath);
    expect(lastMsg).toMatch(/RAF\[aatest\] Plan: my-project/);

    // Verify both files are in the commit
    const committedFiles = getLastCommitFiles(worktreePath);
    expect(committedFiles).toContain(`RAF/${projectFolder}/input.md`);
    expect(committedFiles).toContain(`RAF/${projectFolder}/decisions.md`);
  });

  it('should commit amend artifacts with additional plan files in worktree', async () => {
    const projectFolder = 'aatest-my-project';

    // Create initial project and commit
    createInitialProject(repoDir, projectFolder);
    execSync('git add -A', { cwd: repoDir, stdio: 'pipe' });
    execSync('git commit -m "Initial plan"', { cwd: repoDir, stdio: 'pipe' });

    // Create worktree
    worktreePath = createWorktreeForProject(repoDir, projectFolder);
    const wtProjectPath = path.join(worktreePath, 'RAF', projectFolder);

    // Simulate amend: update files and create new plan
    fs.writeFileSync(
      path.join(wtProjectPath, 'input.md'),
      'original input\n\n---\n\nnew task description'
    );
    fs.writeFileSync(
      path.join(wtProjectPath, 'decisions.md'),
      '# Decisions\n\n## Q1?\nA1\n\n## Q2?\nA2'
    );
    fs.writeFileSync(
      path.join(wtProjectPath, 'plans', '02-new-task.md'),
      '# Task: New Task'
    );

    // Call commitPlanningArtifacts (plan files not included in amend commit)
    await commitPlanningArtifacts(wtProjectPath, {
      cwd: worktreePath,
      isAmend: true,
    });

    // Verify commit was made with Amend prefix
    const lastMsg = getLastCommitMessage(worktreePath);
    expect(lastMsg).toMatch(/RAF\[aatest\] Amend: my-project/);

    // Verify only input.md and decisions.md are in the commit (not plan files)
    const committedFiles = getLastCommitFiles(worktreePath);
    expect(committedFiles).toContain(`RAF/${projectFolder}/input.md`);
    expect(committedFiles).toContain(`RAF/${projectFolder}/decisions.md`);
    expect(committedFiles).not.toContain(`RAF/${projectFolder}/plans/02-new-task.md`);
  });

  it('should commit after worktree recreation from branch', async () => {
    const projectFolder = 'aatest-my-project';

    // Create initial project, commit, and create initial worktree
    createInitialProject(repoDir, projectFolder);
    execSync('git add -A', { cwd: repoDir, stdio: 'pipe' });
    execSync('git commit -m "Initial plan"', { cwd: repoDir, stdio: 'pipe' });

    // Create worktree
    const initialWtPath = createWorktreeForProject(repoDir, projectFolder);
    const initialWtProjectPath = path.join(initialWtPath, 'RAF', projectFolder);

    // Commit something on the worktree branch (simulating initial plan commit)
    fs.writeFileSync(
      path.join(initialWtProjectPath, 'decisions.md'),
      '# Decisions\n\n## Q1?\nA1\n\n## Q2?\nA2'
    );
    execSync('git add -A', { cwd: initialWtPath, stdio: 'pipe' });
    execSync('git commit -m "Plan commit on branch"', { cwd: initialWtPath, stdio: 'pipe' });

    // Remove the worktree (simulating cleanup after execution)
    execSync(`git worktree remove "${initialWtPath}" --force`, {
      cwd: repoDir,
      stdio: 'pipe',
    });
    worktreePaths.splice(worktreePaths.indexOf(initialWtPath), 1);

    // Recreate worktree from existing branch (simulating amend --worktree)
    const recreatedWtPath = path.join(makeTempDir('raf-wt-recreated-'), projectFolder);
    execSync(`git worktree add "${recreatedWtPath}" "${projectFolder}"`, {
      cwd: repoDir,
      stdio: 'pipe',
    });
    worktreePaths.push(recreatedWtPath);

    const recreatedProjectPath = path.join(recreatedWtPath, 'RAF', projectFolder);

    // Simulate amend: update input.md, update decisions.md, create new plan
    fs.writeFileSync(
      path.join(recreatedProjectPath, 'input.md'),
      'original input\n\n---\n\namend task description'
    );
    fs.writeFileSync(
      path.join(recreatedProjectPath, 'decisions.md'),
      '# Decisions\n\n## Q1?\nA1\n\n## Q2?\nA2\n\n## Q3?\nA3'
    );
    fs.writeFileSync(
      path.join(recreatedProjectPath, 'plans', '02-new-task.md'),
      '# Task: New Task'
    );

    // Call commitPlanningArtifacts (plan files not included in amend commit)
    await commitPlanningArtifacts(recreatedProjectPath, {
      cwd: recreatedWtPath,
      isAmend: true,
    });

    // Verify commit was made
    const lastMsg = getLastCommitMessage(recreatedWtPath);
    expect(lastMsg).toMatch(/RAF\[aatest\] Amend: my-project/);

    // Verify only input.md and decisions.md are in the commit (not plan files)
    const committedFiles = getLastCommitFiles(recreatedWtPath);
    expect(committedFiles).toContain(`RAF/${projectFolder}/input.md`);
    expect(committedFiles).toContain(`RAF/${projectFolder}/decisions.md`);
    expect(committedFiles).not.toContain(`RAF/${projectFolder}/plans/02-new-task.md`);
  });

  it('should work when only some files have changed', async () => {
    const projectFolder = 'aatest-my-project';

    // Create initial project and commit
    createInitialProject(repoDir, projectFolder);
    execSync('git add -A', { cwd: repoDir, stdio: 'pipe' });
    execSync('git commit -m "Initial plan"', { cwd: repoDir, stdio: 'pipe' });

    // Create worktree
    worktreePath = createWorktreeForProject(repoDir, projectFolder);
    const wtProjectPath = path.join(worktreePath, 'RAF', projectFolder);

    // Only modify input.md (decisions.md unchanged)
    fs.writeFileSync(
      path.join(wtProjectPath, 'input.md'),
      'original input\n\n---\n\nnew task'
    );

    await commitPlanningArtifacts(wtProjectPath, {
      cwd: worktreePath,
    });

    // Verify commit was made
    const lastMsg = getLastCommitMessage(worktreePath);
    expect(lastMsg).toMatch(/RAF\[aatest\] Plan: my-project/);

    // Only input.md should be in the commit (decisions.md unchanged)
    const committedFiles = getLastCommitFiles(worktreePath);
    expect(committedFiles).toContain(`RAF/${projectFolder}/input.md`);
    expect(committedFiles).not.toContain(`RAF/${projectFolder}/decisions.md`);
  });

  it('should handle non-worktree commit (standard mode) correctly', async () => {
    const projectFolder = 'aatest-my-project';

    // Create initial project and commit
    createInitialProject(repoDir, projectFolder);
    execSync('git add -A', { cwd: repoDir, stdio: 'pipe' });
    execSync('git commit -m "Initial"', { cwd: repoDir, stdio: 'pipe' });

    const projectPath = path.join(repoDir, 'RAF', projectFolder);

    // Modify files in main repo
    fs.writeFileSync(
      path.join(projectPath, 'input.md'),
      'original input\n\n---\n\nnew task'
    );
    fs.writeFileSync(
      path.join(projectPath, 'decisions.md'),
      '# Decisions\n\n## Q1?\nA1\n\n## Q2?\nA2'
    );

    // Save and restore cwd
    const savedCwd = process.cwd();
    try {
      process.chdir(repoDir);
      await commitPlanningArtifacts(projectPath);
    } finally {
      process.chdir(savedCwd);
    }

    // Verify commit
    const lastMsg = getLastCommitMessage(repoDir);
    expect(lastMsg).toMatch(/RAF\[aatest\] Plan: my-project/);

    const committedFiles = getLastCommitFiles(repoDir);
    expect(committedFiles).toContain(`RAF/${projectFolder}/input.md`);
    expect(committedFiles).toContain(`RAF/${projectFolder}/decisions.md`);
  });
});
