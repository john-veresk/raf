import { execSync } from 'node:child_process';
import * as path from 'node:path';
import { logger } from '../utils/logger.js';
import { extractProjectNumber, extractProjectName } from '../utils/paths.js';

export interface GitStatus {
  isRepo: boolean;
  hasChanges: boolean;
  branch: string | null;
}

/**
 * Check if we're in a git repository.
 */
export function isGitRepo(cwd?: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { encoding: 'utf-8', stdio: 'pipe', ...(cwd ? { cwd } : {}) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current git status.
 */
export function getGitStatus(): GitStatus {
  const status: GitStatus = {
    isRepo: false,
    hasChanges: false,
    branch: null,
  };

  try {
    execSync('git rev-parse --is-inside-work-tree', { encoding: 'utf-8', stdio: 'pipe' });
    status.isRepo = true;
  } catch {
    return status;
  }

  try {
    const branchOutput = execSync('git branch --show-current', { encoding: 'utf-8', stdio: 'pipe' });
    status.branch = branchOutput.trim() || null;
  } catch {
    // Might be in detached HEAD state
  }

  try {
    const statusOutput = execSync('git status --porcelain', { encoding: 'utf-8', stdio: 'pipe' });
    status.hasChanges = statusOutput.trim().length > 0;
  } catch {
    // Ignore errors
  }

  return status;
}

/**
 * Check if there are uncommitted changes.
 */
export function hasUncommittedChanges(cwd?: string): boolean {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8', stdio: 'pipe', ...(cwd ? { cwd } : {}) });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Parse git status --porcelain output into a list of file paths.
 * Format: XY filename (where X is index status, Y is working tree status)
 * Examples:
 *   M  file.txt     - modified, staged
 *   MM file.txt     - modified, staged, then modified again
 *    M file.txt     - modified, not staged
 *   A  file.txt     - added
 *   D  file.txt     - deleted
 *   ?? file.txt     - untracked
 *   R  old -> new   - renamed
 */
export function parseGitStatus(output: string): string[] {
  if (!output.trim()) {
    return [];
  }

  const files: string[] = [];
  // Don't trim the entire output - leading spaces are significant in git porcelain format
  // Only split by newlines, then handle each line
  const lines = output.split('\n');

  for (const line of lines) {
    if (!line || line.length < 3) continue;

    // The filename starts at position 3 (after XY and space)
    let filePath = line.slice(3);

    // Handle renamed files: "R  old -> new" or "R old -> new"
    if (line[0] === 'R' || line[1] === 'R') {
      const arrowIndex = filePath.indexOf(' -> ');
      if (arrowIndex !== -1) {
        filePath = filePath.slice(arrowIndex + 4);
      }
    }

    // Handle copied files similarly
    if (line[0] === 'C' || line[1] === 'C') {
      const arrowIndex = filePath.indexOf(' -> ');
      if (arrowIndex !== -1) {
        filePath = filePath.slice(arrowIndex + 4);
      }
    }

    // Handle quoted paths (git escapes special characters)
    if (filePath.startsWith('"') && filePath.endsWith('"')) {
      filePath = filePath.slice(1, -1);
    }

    files.push(filePath);
  }

  return files;
}

/**
 * Get list of currently changed files (both staged and unstaged).
 * Returns empty array if not in a git repo.
 */
export function getChangedFiles(): string[] {
  if (!isGitRepo()) {
    return [];
  }

  try {
    const output = execSync('git status --porcelain', { encoding: 'utf-8', stdio: 'pipe' });
    return parseGitStatus(output);
  } catch {
    return [];
  }
}

/**
 * Stash uncommitted changes with a descriptive name.
 * @param name - Name for the stash (e.g., "raf-001-task-03-failed")
 * @returns true if stash was created, false otherwise
 */
export function stashChanges(name: string, cwd?: string): boolean {
  if (!isGitRepo(cwd)) {
    logger.warn('Not in a git repository, skipping stash');
    return false;
  }

  if (!hasUncommittedChanges(cwd)) {
    logger.debug('No uncommitted changes to stash');
    return false;
  }

  try {
    execSync(`git stash push -m "${name.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...(cwd ? { cwd } : {}),
    });
    return true;
  } catch (error) {
    logger.error(`Failed to stash changes: ${error}`);
    return false;
  }
}

/**
 * Get the current HEAD commit hash.
 * Returns null if not in a git repo or HEAD doesn't exist.
 */
export function getHeadCommitHash(cwd?: string): string | null {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8', stdio: 'pipe', ...(cwd ? { cwd } : {}) }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Get the current HEAD commit message (first line only).
 * Returns null if not in a git repo or HEAD doesn't exist.
 */
export function getHeadCommitMessage(): string | null {
  try {
    return execSync('git log -1 --format=%s', { encoding: 'utf-8', stdio: 'pipe' }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Check if a file is tracked in the HEAD commit.
 * Returns true if the file appears in the latest commit's tree.
 */
export function isFileCommittedInHead(filePath: string): boolean {
  try {
    // Use git ls-tree to check if the file exists in HEAD
    // We need the path relative to the repo root
    const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    const relativePath = path.relative(repoRoot, path.resolve(filePath));
    const result = execSync(`git ls-tree HEAD -- "${relativePath.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

/**
 * Commit planning artifacts (input.md and decisions.md) for a project.
 * Uses commit message format: RAF[NNN] Plan: project-name
 * For amendments: RAF[NNN] Amend: project-name
 *
 * @param projectPath - Full path to the project folder (e.g., /path/to/RAF/017-decision-vault)
 * @param options - Optional settings
 * @param options.cwd - Working directory for git commands (worktree support)
 * @param options.additionalFiles - Extra file paths to stage (e.g., plan files for amend)
 * @param options.isAmend - Use "Amend:" prefix instead of "Plan:" in commit message
 * @returns Promise that resolves when commit is complete (or fails silently)
 */
export async function commitPlanningArtifacts(projectPath: string, options?: { cwd?: string; additionalFiles?: string[]; isAmend?: boolean }): Promise<void> {
  const execCwd = options?.cwd;

  // Check if we're in a git repository
  if (!isGitRepo(execCwd)) {
    logger.warn('Not in a git repository, skipping planning artifacts commit');
    return;
  }

  // Extract project number and name from path
  const projectNumber = extractProjectNumber(projectPath);
  const projectName = extractProjectName(projectPath);

  if (!projectNumber || !projectName) {
    logger.warn('Could not extract project number or name from path, skipping commit');
    return;
  }

  // Build absolute file paths
  const inputFile = path.join(projectPath, 'input.md');
  const decisionsFile = path.join(projectPath, 'decisions.md');

  // Build commit message
  const prefix = options?.isAmend ? 'Amend' : 'Plan';
  const commitMessage = `RAF[${projectNumber}] ${prefix}: ${projectName}`;

  // Build list of files to stage (absolute paths)
  const absoluteFiles = [inputFile, decisionsFile, ...(options?.additionalFiles ?? [])];

  // Convert to relative paths when cwd is provided (worktree mode).
  // Git resolves paths relative to the working directory. Using relative paths
  // avoids issues with symlink resolution (e.g., /tmp → /private/tmp on macOS)
  // that can cause absolute paths to not match git's internal worktree paths.
  const filesToStage = execCwd
    ? absoluteFiles.map(f => path.relative(execCwd, f))
    : absoluteFiles;

  // Stage each file individually so one missing file doesn't block the others
  let stagedCount = 0;
  for (const file of filesToStage) {
    try {
      execSync(`git add -- "${file}"`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        ...(execCwd ? { cwd: execCwd } : {}),
      });
      stagedCount++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to stage ${file}: ${msg}`);
    }
  }

  if (stagedCount === 0) {
    logger.debug('No files were staged for planning artifacts commit');
    return;
  }

  try {
    // Check if there's anything staged to commit
    const stagedStatus = execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...(execCwd ? { cwd: execCwd } : {}),
    }).trim();

    if (!stagedStatus) {
      logger.debug('No changes to planning artifacts to commit');
      return;
    }

    // Commit the staged files
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...(execCwd ? { cwd: execCwd } : {}),
    });

    logger.debug(`Committed planning artifacts: ${commitMessage}`);
  } catch (error) {
    // Handle "nothing to commit" gracefully - this is not an error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('nothing to commit')) {
      logger.debug('Planning artifacts already committed or no changes');
      return;
    }

    // Log warning for other errors, but don't throw
    logger.warn(`Failed to commit planning artifacts: ${errorMessage}`);
  }
}
