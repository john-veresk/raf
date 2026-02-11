import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { logger } from '../utils/logger.js';
import { extractProjectNumber, extractProjectName, isBase26Prefix, decodeBase26 } from '../utils/paths.js';

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
 * Used for failed-plan cleanup and post-completion cleanup.
 * The git branch is preserved — only the worktree directory is removed.
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

export interface WorktreeProjectResolution {
  /** The worktree project folder name (e.g., "ahrren-turbo-finder") */
  folder: string;
  /** The worktree root path (e.g., ~/.raf/worktrees/RAF/ahrren-turbo-finder) */
  worktreeRoot: string;
}

/**
 * Resolve a project identifier against worktree folder names.
 * Uses the same matching strategy as `resolveProjectIdentifierWithDetails`:
 * 1. Full folder name match (exact, case-insensitive)
 * 2. Base26 prefix match (6-char ID)
 * 3. Project name match (the portion after the prefix)
 *
 * @param repoBasename - The basename of the current git repo
 * @param identifier - The project identifier to resolve
 * @returns The matched worktree project info or null if not found
 */
export function resolveWorktreeProjectByIdentifier(
  repoBasename: string,
  identifier: string,
): WorktreeProjectResolution | null {
  const wtProjectDirs = listWorktreeProjects(repoBasename);
  if (wtProjectDirs.length === 0) return null;

  const lowerIdentifier = identifier.toLowerCase();

  // 1. Full folder name match (exact, case-insensitive)
  for (const dir of wtProjectDirs) {
    if (dir.toLowerCase() === lowerIdentifier) {
      return {
        folder: dir,
        worktreeRoot: computeWorktreePath(repoBasename, dir),
      };
    }
  }

  // 2. Base26 prefix match
  if (isBase26Prefix(identifier)) {
    const targetNumber = decodeBase26(identifier);
    if (targetNumber !== null) {
      for (const dir of wtProjectDirs) {
        const prefix = extractProjectNumber(dir);
        if (prefix) {
          const dirNumber = decodeBase26(prefix);
          if (dirNumber === targetNumber) {
            return {
              folder: dir,
              worktreeRoot: computeWorktreePath(repoBasename, dir),
            };
          }
        }
      }
    }
  }

  // 3. Project name match (case-insensitive)
  const nameMatches: string[] = [];
  for (const dir of wtProjectDirs) {
    const name = extractProjectName(dir);
    if (name && name.toLowerCase() === lowerIdentifier) {
      nameMatches.push(dir);
    }
  }

  if (nameMatches.length === 1) {
    return {
      folder: nameMatches[0]!,
      worktreeRoot: computeWorktreePath(repoBasename, nameMatches[0]!),
    };
  }

  // Ambiguous or no match
  return null;
}

export interface SyncMainBranchResult {
  success: boolean;
  /** The detected main branch name (e.g., 'main' or 'master') */
  mainBranch: string | null;
  /** Whether any changes were pulled */
  hadChanges: boolean;
  error?: string;
}

/**
 * Detect the main branch name from the remote.
 * Uses refs/remotes/origin/HEAD, falling back to main/master.
 * Reuses the same logic as detectBaseBranch from pull-request.ts.
 */
export function detectMainBranch(cwd?: string): string | null {
  // Try to find the default branch from the remote
  try {
    const output = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...(cwd ? { cwd } : {}),
    }).trim();
    // Output is like "refs/remotes/origin/main"
    const parts = output.split('/');
    return parts[parts.length - 1] ?? null;
  } catch {
    // Fallback: check for common branch names
  }

  // Try common default branches
  for (const branch of ['main', 'master']) {
    try {
      execSync(`git rev-parse --verify "refs/heads/${branch}"`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        ...(cwd ? { cwd } : {}),
      });
      return branch;
    } catch {
      // Try next
    }
  }

  return null;
}

/**
 * Pull the main branch from remote before worktree creation.
 * Uses fetch + merge --ff-only to safely update the main branch.
 * This ensures the worktree is created from the latest remote state.
 *
 * Only pulls if currently on the main branch or if the main branch exists.
 * Fails gracefully if there are conflicts or the branch has diverged.
 *
 * @param cwd - The directory to run git commands in (defaults to current directory)
 */
export function pullMainBranch(cwd?: string): SyncMainBranchResult {
  const mainBranch = detectMainBranch(cwd);

  if (!mainBranch) {
    return {
      success: false,
      mainBranch: null,
      hadChanges: false,
      error: 'Could not detect main branch (no origin/HEAD or main/master found)',
    };
  }

  // Get current branch to check if we need to switch
  const currentBranch = getCurrentBranch();

  // If not on main, we need to fetch and update the main branch ref
  // without checking it out (to avoid disrupting the user's work)
  if (currentBranch !== mainBranch) {
    // Fetch the main branch from origin
    try {
      execSync(`git fetch origin ${mainBranch}:${mainBranch}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        ...(cwd ? { cwd } : {}),
      });
      logger.debug(`Fetched ${mainBranch} from origin`);
      return {
        success: true,
        mainBranch,
        hadChanges: true, // We fetched updates (may or may not have actual changes)
      };
    } catch (error) {
      // This can fail if the local main has diverged from remote
      // Try a simple fetch without updating the local ref
      try {
        execSync(`git fetch origin ${mainBranch}`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          ...(cwd ? { cwd } : {}),
        });
        logger.debug(`Fetched origin/${mainBranch} (local ${mainBranch} diverged, not updated)`);
        return {
          success: false,
          mainBranch,
          hadChanges: false,
          error: `Local ${mainBranch} has diverged from origin, not updated`,
        };
      } catch (fetchError) {
        const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        return {
          success: false,
          mainBranch,
          hadChanges: false,
          error: `Failed to fetch ${mainBranch}: ${msg}`,
        };
      }
    }
  }

  // Currently on main branch - can do a regular pull with ff-only
  // First, check for uncommitted changes that would block the pull
  try {
    const status = execSync('git status --porcelain', {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...(cwd ? { cwd } : {}),
    }).trim();

    if (status) {
      return {
        success: false,
        mainBranch,
        hadChanges: false,
        error: `Cannot pull ${mainBranch}: uncommitted changes in working directory`,
      };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      mainBranch,
      hadChanges: false,
      error: `Failed to check git status: ${msg}`,
    };
  }

  // Fetch and merge with ff-only
  try {
    execSync(`git fetch origin ${mainBranch}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...(cwd ? { cwd } : {}),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      mainBranch,
      hadChanges: false,
      error: `Failed to fetch from origin: ${msg}`,
    };
  }

  try {
    const output = execSync(`git merge --ff-only origin/${mainBranch}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...(cwd ? { cwd } : {}),
    });
    const hadChanges = !output.includes('Already up to date');
    return {
      success: true,
      mainBranch,
      hadChanges,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      mainBranch,
      hadChanges: false,
      error: `Cannot fast-forward ${mainBranch}: ${msg.includes('Not possible to fast-forward') ? 'branch has diverged from origin' : msg}`,
    };
  }
}

/**
 * Push the main branch to remote before PR creation.
 * Ensures the PR base is up to date.
 *
 * @param cwd - The directory to run git commands in (defaults to current directory)
 */
export function pushMainBranch(cwd?: string): SyncMainBranchResult {
  const mainBranch = detectMainBranch(cwd);

  if (!mainBranch) {
    return {
      success: false,
      mainBranch: null,
      hadChanges: false,
      error: 'Could not detect main branch (no origin/HEAD or main/master found)',
    };
  }

  try {
    execSync(`git push origin ${mainBranch}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...(cwd ? { cwd } : {}),
    });
    return {
      success: true,
      mainBranch,
      hadChanges: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Check if it's just "already up to date"
    if (msg.includes('Everything up-to-date')) {
      return {
        success: true,
        mainBranch,
        hadChanges: false,
      };
    }
    return {
      success: false,
      mainBranch,
      hadChanges: false,
      error: `Failed to push ${mainBranch}: ${msg}`,
    };
  }
}
