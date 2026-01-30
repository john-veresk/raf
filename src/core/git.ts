import { execSync } from 'node:child_process';
import { logger } from '../utils/logger.js';

export interface GitStatus {
  isRepo: boolean;
  hasChanges: boolean;
  branch: string | null;
}

export interface FileChange {
  path: string;
  status: 'M' | 'A' | 'D' | 'R' | '?' | 'C' | 'U';
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
 * Calculate files changed during task execution by comparing current state to baseline.
 * @param currentFiles - Current list of changed files
 * @param baselineFiles - Files that were changed before task started
 * @returns Files that are new or were modified during the task
 */
export function getTaskChangedFiles(currentFiles: string[], baselineFiles: string[]): string[] {
  const baselineSet = new Set(baselineFiles);

  // Files that are now changed but weren't in the baseline
  // OR files that were in baseline AND are still changed (user might have modified same file)
  // Per the plan note: "If a file was modified before AND during the task, it should be committed"
  // But the main requirement is to NOT commit files that were ONLY in baseline and not touched by task

  // Actually, re-reading the requirements:
  // - "Only stage files that were changed during this task"
  // - "Pre-existing changes left unstaged"
  //
  // So we need: files that are currently changed AND were NOT in baseline
  // (new changes introduced by the task)
  // PLUS: the plan says "If a file was modified before AND during the task, it should be committed"
  // meaning we can't distinguish, so we commit it.
  //
  // Simplest interpretation: commit files currently changed MINUS files that were ONLY in baseline
  // This means: if file is in current AND in baseline -> we keep it (can't separate changes)
  //            if file is in current but NOT in baseline -> we keep it (new change)
  //            if file is NOT in current but in baseline -> doesn't apply (it's not changed now)

  // The core logic: return all current files that are either:
  // 1. Not in baseline (definitely new during task)
  // 2. In baseline but we can't separate changes (keep them per plan note)

  // Wait, re-reading again more carefully:
  // The plan says "Identify files changed during task: currentFiles - filesBeforeTask"
  // This is set difference: files in current that were NOT in baseline.
  // But then the note says "If a file was modified before AND during the task, it should be committed"
  //
  // These seem contradictory. Let me re-read...
  // The note is about a file that existed in baseline AND was further modified.
  // If we do strict set difference, we'd miss files that were in baseline.
  // But the note says we should include them because we can't separate changes.
  //
  // I think the safest interpretation is:
  // - Return files currently changed that were NOT in baseline (definite new changes)
  // - BUT the plan acknowledges we can't handle files modified both before and during
  //
  // For safety, let's go with the strict interpretation from the plan:
  // "currentFiles - filesBeforeTask" = files in current not in baseline
  // This is what the requirements clearly state.

  return currentFiles.filter(file => !baselineSet.has(file));
}

/**
 * Commit only specific files with a message.
 * Handles both modified/added files and deleted files.
 * @param files - List of file paths to commit
 * @param message - Commit message
 * @returns Commit hash if successful, null otherwise
 */
export function commitSpecificFiles(files: string[], message: string): string | null {
  if (!isGitRepo()) {
    logger.warn('Not in a git repository, skipping commit');
    return null;
  }

  if (files.length === 0) {
    logger.debug('No files to commit');
    return null;
  }

  try {
    // First, reset staging area to ensure clean state
    execSync('git reset HEAD', { encoding: 'utf-8', stdio: 'pipe' });
  } catch {
    // Ignore errors - might be initial commit scenario
  }

  try {
    // Stage each file - use -A behavior to handle deletions
    // git add handles deleted files correctly
    for (const file of files) {
      try {
        execSync(`git add -- "${file.replace(/"/g, '\\"')}"`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      } catch {
        // File might not exist (deleted) or other issue, try with -u
        try {
          execSync(`git add -u -- "${file.replace(/"/g, '\\"')}"`, {
            encoding: 'utf-8',
            stdio: 'pipe',
          });
        } catch {
          // Log but continue - file might have been cleaned up
          logger.debug(`Could not stage file: ${file}`);
        }
      }
    }

    // Check if there are staged changes to commit
    const stagedStatus = execSync('git diff --cached --name-only', { encoding: 'utf-8', stdio: 'pipe' });
    if (!stagedStatus.trim()) {
      logger.debug('No staged changes to commit');
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

/**
 * Format a commit message with optional project name prefix.
 * @param message - Original commit message
 * @param projectName - Optional project name to include in prefix
 * @returns Formatted commit message like "RAF(project-name): message" or original message
 */
export function formatCommitMessage(message: string, projectName?: string): string {
  if (projectName) {
    return `RAF(${projectName}): ${message}`;
  }
  return message;
}

/**
 * Smart commit: only commits files changed during task execution.
 * @param message - Commit message
 * @param baselineFiles - Files that were changed before task started (captured before execution)
 * @param projectName - Optional project name to include in commit message prefix
 * @returns Commit hash if successful, null otherwise
 */
export function commitTaskChanges(message: string, baselineFiles?: string[], projectName?: string): string | null {
  if (!isGitRepo()) {
    logger.warn('Not in a git repository, skipping commit');
    return null;
  }

  // Format the commit message with project name prefix if provided
  const formattedMessage = formatCommitMessage(message, projectName);

  // Get current changed files
  const currentFiles = getChangedFiles();

  if (!baselineFiles) {
    // No baseline captured - fallback to committing all changes
    logger.warn('No baseline captured, committing all changes');
    return commitSpecificFiles(currentFiles, formattedMessage);
  }

  // Calculate files changed during this task
  const filesToCommit = getTaskChangedFiles(currentFiles, baselineFiles);

  if (filesToCommit.length === 0) {
    logger.debug('No task-specific changes to commit');
    return null;
  }

  logger.debug(`Committing ${filesToCommit.length} task-specific files: ${filesToCommit.join(', ')}`);
  return commitSpecificFiles(filesToCommit, formattedMessage);
}
