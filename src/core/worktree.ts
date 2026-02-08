import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { logger } from '../utils/logger.js';

export interface WorktreeCreateResult {
  success: boolean;
  worktreePath: string;
  branch: string;
  error?: string;
}

export interface WorktreeMergeResult {
  success: boolean;
  merged: boolean;
  fastForward: boolean;
  error?: string;
}

export interface WorktreeValidation {
  exists: boolean;
  isValidWorktree: boolean;
  hasProjectFolder: boolean;
  hasPlans: boolean;
  projectPath: string | null;
}

/**
 * Get the git toplevel directory (repo root).
 * Returns null if not in a git repo.
 */
export function getRepoRoot(): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8', stdio: 'pipe' }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Get the basename of the repo root directory.
 * E.g., "/Users/me/projects/myapp" -> "myapp"
 * Returns null if not in a git repo.
 */
export function getRepoBasename(): string | null {
  const root = getRepoRoot();
  if (!root) {
    return null;
  }
  return path.basename(root);
}

/**
 * Get the current branch name.
 * Returns null if not in a git repo or in detached HEAD state.
 */
export function getCurrentBranch(): string | null {
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    return branch || null;
  } catch {
    return null;
  }
}

/**
 * Compute the worktree path for a project.
 * Returns `~/.raf/worktrees/<repo-basename>/<project-id>`.
 *
 * @param repoBasename - The basename of the repo root directory
 * @param projectId - The full project folder name (e.g., "020-worktree-weaver")
 */
export function computeWorktreePath(repoBasename: string, projectId: string): string {
  return path.join(os.homedir(), '.raf', 'worktrees', repoBasename, projectId);
}

/**
 * Compute the worktree base directory for a repo.
 * Returns `~/.raf/worktrees/<repo-basename>/`.
 *
 * @param repoBasename - The basename of the repo root directory
 */
export function computeWorktreeBaseDir(repoBasename: string): string {
  return path.join(os.homedir(), '.raf', 'worktrees', repoBasename);
}

/**
 * Get the project path inside a worktree.
 * The project folder is at the same relative path from repo root as in the main repo.
 *
 * @param worktreePath - The worktree root directory
 * @param projectRelativePath - The relative path from repo root to the project folder (e.g., "RAF/020-worktree-weaver")
 */
export function getWorktreeProjectPath(worktreePath: string, projectRelativePath: string): string {
  return path.join(worktreePath, projectRelativePath);
}

/**
 * Create a git worktree at the computed path with a new branch.
 *
 * @param repoBasename - The basename of the repo root directory
 * @param projectId - The full project folder name (used as both directory name and branch name)
 */
export function createWorktree(repoBasename: string, projectId: string): WorktreeCreateResult {
  const worktreePath = computeWorktreePath(repoBasename, projectId);
  const branch = projectId;

  // Ensure parent directory exists
  const baseDir = computeWorktreeBaseDir(repoBasename);
  try {
    fs.mkdirSync(baseDir, { recursive: true });
  } catch (error) {
    return {
      success: false,
      worktreePath,
      branch,
      error: `Failed to create parent directory ${baseDir}: ${error}`,
    };
  }

  try {
    execSync(`git worktree add "${worktreePath}" -b "${branch}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return { success: true, worktreePath, branch };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      worktreePath,
      branch,
      error: `Failed to create worktree: ${msg}`,
    };
  }
}

/**
 * Validate that a worktree exists, is a valid git worktree, and contains the expected project content.
 *
 * @param worktreePath - The worktree root directory
 * @param projectRelativePath - The relative path from repo root to the project folder
 */
export function validateWorktree(worktreePath: string, projectRelativePath: string): WorktreeValidation {
  const result: WorktreeValidation = {
    exists: false,
    isValidWorktree: false,
    hasProjectFolder: false,
    hasPlans: false,
    projectPath: null,
  };

  // Check directory exists
  if (!fs.existsSync(worktreePath)) {
    return result;
  }
  result.exists = true;

  // Check it appears in git worktree list
  try {
    const listOutput = execSync('git worktree list --porcelain', { encoding: 'utf-8', stdio: 'pipe' });
    const normalizedWorktreePath = path.resolve(worktreePath);
    const isListed = listOutput.split('\n').some(line => {
      if (line.startsWith('worktree ')) {
        const listedPath = path.resolve(line.slice('worktree '.length).trim());
        return listedPath === normalizedWorktreePath;
      }
      return false;
    });
    result.isValidWorktree = isListed;
  } catch {
    return result;
  }

  // Check project folder exists in worktree
  const projectPath = getWorktreeProjectPath(worktreePath, projectRelativePath);
  if (fs.existsSync(projectPath)) {
    result.hasProjectFolder = true;
    result.projectPath = projectPath;

    // Check for plans directory
    const plansDir = path.join(projectPath, 'plans');
    if (fs.existsSync(plansDir)) {
      result.hasPlans = true;
    }
  }

  return result;
}

/**
 * Merge a worktree branch into the current branch.
 * Attempts fast-forward first; falls back to merge commit.
 * On conflicts, aborts merge and returns failure.
 *
 * MUST be called from the original repo (not the worktree).
 *
 * @param branch - The branch name to merge (typically the project folder name)
 * @param originalBranch - The branch to merge into (the branch that was active when worktree was created)
 */
export function mergeWorktreeBranch(branch: string, originalBranch: string): WorktreeMergeResult {
  // Switch to the original branch
  try {
    execSync(`git checkout "${originalBranch}"`, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      merged: false,
      fastForward: false,
      error: `Failed to checkout ${originalBranch}: ${msg}`,
    };
  }

  // Try fast-forward merge first
  try {
    execSync(`git merge --ff-only "${branch}"`, { encoding: 'utf-8', stdio: 'pipe' });
    return { success: true, merged: true, fastForward: true };
  } catch {
    // Fast-forward not possible, try regular merge
  }

  // Try regular merge
  try {
    execSync(`git merge "${branch}"`, { encoding: 'utf-8', stdio: 'pipe' });
    return { success: true, merged: true, fastForward: false };
  } catch {
    // Merge conflicts - abort
    try {
      execSync('git merge --abort', { encoding: 'utf-8', stdio: 'pipe' });
    } catch {
      logger.warn('Failed to abort merge - repo may be in an inconsistent state');
    }

    return {
      success: false,
      merged: false,
      fastForward: false,
      error: `Merge conflicts detected. Please merge branch "${branch}" into "${originalBranch}" manually.`,
    };
  }
}

/**
 * Remove a single worktree.
 * Used only for failed-plan cleanup, NOT for post-completion cleanup.
 *
 * @param worktreePath - The worktree directory to remove
 * @returns true if removal succeeded, false otherwise
 */
export function removeWorktree(worktreePath: string): { success: boolean; error?: string } {
  try {
    execSync(`git worktree remove "${worktreePath}"`, { encoding: 'utf-8', stdio: 'pipe' });
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to remove worktree at ${worktreePath}: ${msg}`,
    };
  }
}

/**
 * Check if a local branch exists.
 *
 * @param branchName - The branch name to check
 * @returns true if the branch exists locally
 */
export function branchExists(branchName: string): boolean {
  try {
    const output = execSync(`git branch --list "${branchName}"`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
    return output.length > 0;
  } catch {
    return false;
  }
}

/**
 * Create a git worktree at the computed path from an existing branch.
 * Unlike `createWorktree()`, this does NOT create a new branch — it attaches
 * to a branch that already exists locally.
 *
 * @param repoBasename - The basename of the repo root directory
 * @param projectId - The full project folder name (used as both directory name and branch name)
 */
export function createWorktreeFromBranch(repoBasename: string, projectId: string): WorktreeCreateResult {
  const worktreePath = computeWorktreePath(repoBasename, projectId);
  const branch = projectId;

  // Check branch exists
  if (!branchExists(branch)) {
    return {
      success: false,
      worktreePath,
      branch,
      error: `Branch "${branch}" does not exist locally`,
    };
  }

  // Ensure parent directory exists
  const baseDir = computeWorktreeBaseDir(repoBasename);
  try {
    fs.mkdirSync(baseDir, { recursive: true });
  } catch (error) {
    return {
      success: false,
      worktreePath,
      branch,
      error: `Failed to create parent directory ${baseDir}: ${error}`,
    };
  }

  try {
    execSync(`git worktree add "${worktreePath}" "${branch}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return { success: true, worktreePath, branch };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      worktreePath,
      branch,
      error: `Failed to create worktree: ${msg}`,
    };
  }
}

/**
 * List all worktree project directories for the current repo.
 * Scans `~/.raf/worktrees/<repo-basename>/` and returns the list of project folder names.
 *
 * @param repoBasename - The basename of the repo root directory
 * @returns Sorted array of project folder names (e.g., ['020-worktree-weaver', '021-another-feature'])
 */
export function listWorktreeProjects(repoBasename: string): string[] {
  const baseDir = computeWorktreeBaseDir(repoBasename);

  if (!fs.existsSync(baseDir)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const projects = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort();
    return projects;
  } catch {
    return [];
  }
}
