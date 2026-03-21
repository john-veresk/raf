import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export const RAF_DIR = 'RAF';

/** Regex pattern matching a numeric project folder: digits followed by hyphen and name */
const PROJECT_FOLDER_PATTERN = /^(\d+)-(.+)$/;

/** Regex pattern for matching numeric task IDs (1, 2, 12, etc.) */
export const TASK_ID_PATTERN = '\\d+';

/**
 * Encode a task number to its string representation.
 * E.g., 1 -> "1", 5 -> "5", 12 -> "12"
 */
export function encodeTaskId(num: number): string {
  if (num < 0) {
    throw new Error(`encodeTaskId only accepts non-negative integers, got ${num}`);
  }
  return num.toString();
}

/**
 * Decode a numeric task ID string back to a number.
 * E.g., "1" -> 1, "12" -> 12
 * Returns null if invalid format.
 */
export function decodeTaskId(str: string): number | null {
  if (!/^\d+$/.test(str)) {
    return null;
  }
  return parseInt(str, 10);
}

export function getRafDir(): string {
  return path.resolve(process.cwd(), RAF_DIR);
}

export function ensureRafDir(): string {
  const rafDir = getRafDir();
  if (!fs.existsSync(rafDir)) {
    fs.mkdirSync(rafDir, { recursive: true });
  }
  return rafDir;
}

/**
 * Scan a directory for project folders and extract their numeric IDs.
 */
function scanForProjectIds(dir: string): number[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const ids: number[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const match = entry.name.match(PROJECT_FOLDER_PATTERN);
        if (match && match[1]) {
          ids.push(parseInt(match[1], 10));
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  return ids;
}

/**
 * Get the next sequential project number by scanning all worktrees + main repo.
 * Returns max(existing IDs) + 1, or 1 if no projects exist.
 *
 * @param rafDir - The main repo's RAF directory
 * @param repoBasename - Optional repo basename for scanning worktrees
 */
export function getNextProjectNumber(rafDir: string, repoBasename?: string): number {
  const allIds: number[] = [];

  // Scan main repo RAF dir
  allIds.push(...scanForProjectIds(rafDir));

  // Scan all worktree directories
  if (repoBasename) {
    const worktreeBaseDir = path.join(os.homedir(), '.raf', 'worktrees', repoBasename);
    if (fs.existsSync(worktreeBaseDir)) {
      try {
        const wtEntries = fs.readdirSync(worktreeBaseDir, { withFileTypes: true });
        for (const wtEntry of wtEntries) {
          if (wtEntry.isDirectory()) {
            // Each worktree has an RAF dir at the same relative path
            const wtRafDir = path.join(worktreeBaseDir, wtEntry.name, path.basename(path.dirname(rafDir)) === '.' ? RAF_DIR : path.relative(path.resolve(rafDir, '..', '..'), rafDir).split(path.sep).slice(0).join(path.sep));
            allIds.push(...scanForProjectIds(wtRafDir));

            // Also check if the worktree directory name itself is a project folder
            const wtMatch = wtEntry.name.match(PROJECT_FOLDER_PATTERN);
            if (wtMatch && wtMatch[1]) {
              allIds.push(parseInt(wtMatch[1], 10));
            }
          }
        }
      } catch {
        // Worktree base dir doesn't exist or can't be read
      }
    }
  }

  if (allIds.length === 0) {
    return 1;
  }

  return Math.max(...allIds) + 1;
}

export function formatProjectNumber(num: number): string {
  return String(num);
}

export function getProjectDir(rafDir: string, projectName: string): string | null {
  if (!fs.existsSync(rafDir)) {
    return null;
  }

  const entries = fs.readdirSync(rafDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const match = entry.name.match(PROJECT_FOLDER_PATTERN);
      if (match && match[2] === projectName) {
        return path.join(rafDir, entry.name);
      }
    }
  }

  return null;
}

/**
 * Extract the numeric project ID prefix from a project path or folder name.
 * E.g., "/Users/foo/RAF/3-my-project" -> "3"
 * E.g., "12-auth-system" -> "12"
 * Returns the numeric prefix string or null if not found.
 */
export function extractProjectNumber(projectPath: string): string | null {
  const folderName = path.basename(projectPath);
  const match = folderName.match(/^(\d+)-/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Parse a project prefix string to its numeric value.
 * Accepts a numeric string (e.g., "3", "12").
 * Returns the numeric project number or null if invalid.
 */
export function parseProjectPrefix(prefix: string): number | null {
  if (/^\d+$/.test(prefix)) {
    return parseInt(prefix, 10);
  }
  return null;
}

/**
 * Extract project name from a project path (without number prefix).
 * E.g., "/Users/foo/RAF/3-my-project" -> "my-project"
 * Returns the project name or null if not found.
 */
export function extractProjectName(projectPath: string): string | null {
  const folderName = path.basename(projectPath);
  const match = folderName.match(PROJECT_FOLDER_PATTERN);
  if (match && match[2]) {
    return match[2];
  }
  return null;
}

/**
 * Extract task name from a plan filename (without number prefix and extension).
 * E.g., "02-fix-login-bug.md" -> "fix-login-bug"
 * Returns the task name or null if not found.
 */
export function extractTaskNameFromPlanFile(planFilename: string): string | null {
  const basename = path.basename(planFilename, '.md');
  const match = basename.match(/^\d+-(.+)$/);
  return match && match[1] ? match[1] : null;
}

export function listProjects(rafDir: string): Array<{ number: number; name: string; path: string }> {
  if (!fs.existsSync(rafDir)) {
    return [];
  }

  const entries = fs.readdirSync(rafDir, { withFileTypes: true });
  const projects: Array<{ number: number; name: string; path: string }> = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const match = entry.name.match(PROJECT_FOLDER_PATTERN);
      if (match && match[1] && match[2]) {
        projects.push({
          number: parseInt(match[1], 10),
          name: match[2],
          path: path.join(rafDir, entry.name),
        });
      }
    }
  }

  return projects.sort((a, b) => a.number - b.number);
}

/**
 * Numeric comparator for filenames with a leading integer prefix (e.g. "10-task.md").
 * Ensures files sort as 1, 2, 3, ..., 10, ... instead of 1, 10, 2, ...
 */
export function numericFileSort(a: string, b: string): number {
  const numA = parseInt(a, 10);
  const numB = parseInt(b, 10);
  return numA - numB;
}

export function getPlansDir(projectPath: string): string {
  return path.join(projectPath, 'plans');
}

export function getOutcomesDir(projectPath: string): string {
  return path.join(projectPath, 'outcomes');
}

export function getOutcomeFilePath(projectPath: string, taskId: string, taskName: string): string {
  return path.join(projectPath, 'outcomes', `${taskId}-${taskName}.md`);
}

export function getDecisionsPath(projectPath: string): string {
  return path.join(projectPath, 'decisions.md');
}

export function getLogsDir(projectPath: string): string {
  return path.join(projectPath, 'logs');
}

export function getInputPath(projectPath: string): string {
  return path.join(projectPath, 'input.md');
}

/**
 * Result of resolving a project identifier.
 */
export interface ProjectResolutionResult {
  /** Resolved project path (null if not found or ambiguous) */
  path: string | null;
  /** Error type if resolution failed */
  error?: 'not_found' | 'ambiguous';
  /** For ambiguous matches, list of matching projects */
  matches?: Array<{ number: number; name: string; path: string; folder: string }>;
}

/**
 * Parse project information from a folder name.
 * Returns null if the folder name doesn't match expected project format.
 */
function parseProjectFolder(
  rafDir: string,
  folderName: string
): { number: number; name: string; path: string; folder: string } | null {
  const match = folderName.match(PROJECT_FOLDER_PATTERN);
  if (match && match[1] && match[2]) {
    return {
      number: parseInt(match[1], 10),
      name: match[2],
      path: path.join(rafDir, folderName),
      folder: folderName,
    };
  }
  return null;
}

/**
 * Resolve a project identifier with detailed result including ambiguity detection.
 *
 * Supported identifier formats (checked in this order):
 * 1. Full folder name (e.g., "3-fix-stuff")
 *    - Must be an exact match to an existing folder
 *    - Pattern: numeric prefix, followed by hyphen and name
 * 2. Numeric prefix (e.g., "3", "12")
 *    - Looks up by project number
 * 3. Project name (e.g., "my-project", "fix-stuff")
 *    - Looks up by the name portion of the folder (after the prefix)
 *    - Case-insensitive matching
 *    - Returns error if multiple projects have the same name
 */
export function resolveProjectIdentifierWithDetails(
  rafDir: string,
  identifier: string
): ProjectResolutionResult {
  if (!fs.existsSync(rafDir)) {
    return { path: null, error: 'not_found' };
  }

  // Pattern to match full folder names: N-name (numeric prefix)
  const fullFolderPattern = /^\d+-(.+)$/;
  const fullFolderMatch = identifier.match(fullFolderPattern);

  // Check if identifier is a full folder name (exact match required)
  if (fullFolderMatch) {
    const entries = fs.readdirSync(rafDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.toLowerCase() === identifier.toLowerCase()) {
        return { path: path.join(rafDir, entry.name) };
      }
    }
    // Full folder name format but doesn't exist as a folder.
    // Fall through to name-based matching.
  }

  // Check if it's a numeric identifier (e.g., "3", "12")
  let targetNumber: number | null = null;
  if (/^\d+$/.test(identifier)) {
    targetNumber = parseInt(identifier, 10);
  }

  const entries = fs.readdirSync(rafDir, { withFileTypes: true });
  const nameMatches: Array<{ number: number; name: string; path: string; folder: string }> = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const project = parseProjectFolder(rafDir, entry.name);

      if (project) {
        if (targetNumber !== null && project.number === targetNumber) {
          // Match by number
          return { path: project.path };
        }
        // Also collect name matches (for fallback if number match fails)
        if (project.name.toLowerCase() === identifier.toLowerCase()) {
          nameMatches.push(project);
        }
      }
    }
  }

  // Handle name matches
  if (nameMatches.length === 1) {
    return { path: nameMatches[0]!.path };
  } else if (nameMatches.length > 1) {
    // Multiple projects with the same name - ambiguous
    return {
      path: null,
      error: 'ambiguous',
      matches: nameMatches.sort((a, b) => a.number - b.number),
    };
  }

  return { path: null, error: 'not_found' };
}

/**
 * Resolve a project identifier to a full project path.
 *
 * Supported identifier formats (checked in this order):
 * 1. Full folder name (e.g., "3-fix-stuff")
 * 2. Numeric prefix (e.g., "3")
 * 3. Project name (e.g., "my-project")
 */
export function resolveProjectIdentifier(
  rafDir: string,
  identifier: string
): string | null {
  const result = resolveProjectIdentifierWithDetails(rafDir, identifier);
  return result.path;
}
