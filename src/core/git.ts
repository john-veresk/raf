import { execSync } from 'node:child_process';
import { logger } from '../utils/logger.js';

export interface GitStatus {
  isRepo: boolean;
  hasChanges: boolean;
  branch: string | null;
}

/**
 * Check if we're in a git repository.
 */
export function isGitRepo(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { encoding: 'utf-8', stdio: 'pipe' });
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
export function hasUncommittedChanges(): boolean {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8', stdio: 'pipe' });
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

export interface CommitResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Commit only the files in a specific project folder.
 * Used after planning to commit the project files (input, decisions, plans).
 * @param projectPath - The full path to the project folder
 * @param projectName - The project name (without number prefix)
 * @returns CommitResult indicating success or failure
 */
export function commitProjectFolder(projectPath: string, projectName: string): CommitResult {
  if (!isGitRepo()) {
    return { success: false, error: 'Not in a git repository' };
  }

  try {
    // Stage only files in the project folder
    execSync(`git add "${projectPath}"`, { encoding: 'utf-8', stdio: 'pipe' });

    // Check if there are staged changes
    const stagedStatus = execSync('git diff --cached --name-only', { encoding: 'utf-8', stdio: 'pipe' });
    if (!stagedStatus.trim()) {
      return { success: true, message: 'No changes to commit' };
    }

    // Commit with the standard format
    const commitMessage = `RAF(${projectName}): Plan complete`;
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    return { success: true, message: commitMessage };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Stash uncommitted changes with a descriptive name.
 * @param name - Name for the stash (e.g., "raf-001-task-3-failed")
 * @returns true if stash was created, false otherwise
 */
export function stashChanges(name: string): boolean {
  if (!isGitRepo()) {
    logger.warn('Not in a git repository, skipping stash');
    return false;
  }

  if (!hasUncommittedChanges()) {
    logger.debug('No uncommitted changes to stash');
    return false;
  }

  try {
    execSync(`git stash push -m "${name.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return true;
  } catch (error) {
    logger.error(`Failed to stash changes: ${error}`);
    return false;
  }
}
