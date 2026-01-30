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
 * Stage and commit changes with a message.
 */
export function commitChanges(message: string): string | null {
  if (!isGitRepo()) {
    logger.warn('Not in a git repository, skipping commit');
    return null;
  }

  try {
    // Stage all changes
    execSync('git add -A', { encoding: 'utf-8', stdio: 'pipe' });

    // Check if there are changes to commit
    const status = execSync('git status --porcelain', { encoding: 'utf-8', stdio: 'pipe' });
    if (!status.trim()) {
      logger.debug('No changes to commit');
      return null;
    }

    // Commit
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    // Get commit hash
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', stdio: 'pipe' });
    return hash.trim();
  } catch (error) {
    logger.error(`Failed to commit: ${error}`);
    return null;
  }
}

/**
 * Get the short hash of the last commit.
 */
export function getLastCommitHash(): string | null {
  try {
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', stdio: 'pipe' });
    return hash.trim();
  } catch {
    return null;
  }
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
