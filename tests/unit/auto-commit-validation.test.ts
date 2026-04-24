import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { validateAutoCommitSuccess } from '../../src/commands/do.js';

function runGit(cwd: string, command: string): string {
  return execSync(command, { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim();
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe('validateAutoCommitSuccess', () => {
  let repoDir: string;
  let projectPath: string;
  let planPath: string;
  let outcomePath: string;

  beforeEach(() => {
    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-auto-commit-'));
    projectPath = path.join(repoDir, 'RAF', '1-test-project');
    planPath = path.join(projectPath, 'plans', '1-task.md');
    outcomePath = path.join(projectPath, 'outcomes', '1-task.md');

    runGit(repoDir, 'git init');
    runGit(repoDir, 'git config user.email "test@example.com"');
    runGit(repoDir, 'git config user.name "Test User"');

    writeFile(planPath, '# Task');
    writeFile(path.join(projectPath, 'input.md'), '# Input');
    runGit(repoDir, 'git add .');
    runGit(repoDir, 'git commit -m "Initial plan"');
  });

  afterEach(() => {
    fs.rmSync(repoDir, { recursive: true, force: true });
  });

  it('should fail when auto-commit is enabled and the outcome file is missing', () => {
    const headBefore = runGit(repoDir, 'git rev-parse HEAD');

    const result = validateAutoCommitSuccess({
      autoCommit: true,
      cwd: repoDir,
      headBefore,
      outcomeFilePath: outcomePath,
      requiredFiles: [outcomePath, planPath],
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('outcome file was not written');
  });

  it('should fail when COMPLETE was written but no commit landed', () => {
    const headBefore = runGit(repoDir, 'git rev-parse HEAD');
    writeFile(outcomePath, '# Outcome\n\n<promise>COMPLETE</promise>\n');

    const result = validateAutoCommitSuccess({
      autoCommit: true,
      cwd: repoDir,
      headBefore,
      outcomeFilePath: outcomePath,
      requiredFiles: [outcomePath, planPath],
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('HEAD did not change');
  });

  it('should pass when a new commit landed and the worktree is clean', () => {
    const headBefore = runGit(repoDir, 'git rev-parse HEAD');
    writeFile(outcomePath, '# Outcome\n\n<promise>COMPLETE</promise>\n');
    runGit(repoDir, 'git add .');
    runGit(repoDir, 'git commit -m "RAF[test-project:1] Complete task"');

    const result = validateAutoCommitSuccess({
      autoCommit: true,
      cwd: repoDir,
      headBefore,
      outcomeFilePath: outcomePath,
      requiredFiles: [outcomePath, planPath],
    });

    expect(result.valid).toBe(true);
  });

  it('should pass with remaining unrelated changes when latest commit includes required task files', () => {
    const headBefore = runGit(repoDir, 'git rev-parse HEAD');
    writeFile(outcomePath, '# Outcome\n\n<promise>COMPLETE</promise>\n');
    runGit(repoDir, `git add ${path.relative(repoDir, outcomePath)}`);
    runGit(repoDir, 'git commit -m "RAF[test-project:1] Complete task"');
    writeFile(path.join(repoDir, 'scratch.txt'), 'left over');

    const result = validateAutoCommitSuccess({
      autoCommit: true,
      cwd: repoDir,
      headBefore,
      outcomeFilePath: outcomePath,
      requiredFiles: [outcomePath],
    });

    expect(result.valid).toBe(true);
  });

  it('should skip git validation when auto-commit is disabled', () => {
    const result = validateAutoCommitSuccess({
      autoCommit: false,
      cwd: repoDir,
      headBefore: runGit(repoDir, 'git rev-parse HEAD'),
      outcomeFilePath: outcomePath,
      requiredFiles: [outcomePath, planPath],
    });

    expect(result.valid).toBe(true);
  });
});
