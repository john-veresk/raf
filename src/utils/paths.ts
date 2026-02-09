import * as fs from 'node:fs';
import * as path from 'node:path';

export const RAF_DIR = 'RAF';

/** RAF epoch: 2026-01-01T00:00:00Z */
export const RAF_EPOCH = 1767225600;

/** ID width: 6 characters, zero-padded base36 */
const ID_WIDTH = 6;

/** Task ID width: 2 characters, zero-padded base36 */
const TASK_ID_WIDTH = 2;

/** Regex pattern for matching base36 task IDs (2-char: 00-zz) */
export const TASK_ID_PATTERN = '[0-9a-z]{2}';

/**
 * Encode a task number (0-based or 1-based) to a 2-character zero-padded base36 string.
 * E.g., 1 -> "01", 10 -> "0a", 36 -> "10", 1295 -> "zz"
 */
export function encodeTaskId(num: number): string {
  if (num < 0) {
    throw new Error(`encodeTaskId only accepts non-negative integers, got ${num}`);
  }
  if (num > 36 * 36 - 1) {
    throw new Error(`encodeTaskId: value ${num} exceeds max 2-char base36 (1295)`);
  }
  return num.toString(36).padStart(TASK_ID_WIDTH, '0');
}

/**
 * Decode a 2-character base36 task ID string back to a number.
 * E.g., "01" -> 1, "0a" -> 10, "10" -> 36
 * Returns null if invalid format.
 */
export function decodeTaskId(str: string): number | null {
  if (str.length !== TASK_ID_WIDTH) {
    return null;
  }
  if (!/^[0-9a-z]{2}$/.test(str.toLowerCase())) {
    return null;
  }
  return parseInt(str.toLowerCase(), 36);
}

/**
 * Encode a non-negative integer to a 6-character zero-padded base36 string.
 */
export function encodeBase36(num: number): string {
  if (num < 0) {
    throw new Error(`encodeBase36 only accepts non-negative integers, got ${num}`);
  }
  return num.toString(36).padStart(ID_WIDTH, '0');
}

/**
 * Decode a 6-character base36 string back to a non-negative integer.
 * Returns the decoded number, or null if invalid format.
 */
export function decodeBase36(str: string): number | null {
  if (str.length !== ID_WIDTH) {
    return null;
  }
  if (!/^[0-9a-z]{6}$/.test(str.toLowerCase())) {
    return null;
  }
  return parseInt(str.toLowerCase(), 36);
}

/**
 * Check if a string is a valid 6-character base36 project prefix.
 */
export function isBase36Prefix(str: string): boolean {
  if (str.length !== ID_WIDTH) {
    return false;
  }
  return /^[0-9a-z]{6}$/.test(str.toLowerCase());
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

export function getNextProjectNumber(rafDir: string): number {
  const id = Math.floor(Date.now() / 1000) - RAF_EPOCH;

  if (!fs.existsSync(rafDir)) {
    return id;
  }

  // Collect existing IDs for collision detection
  const existingIds = new Set<number>();
  const entries = fs.readdirSync(rafDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const match = entry.name.match(/^([0-9a-z]{6})-/i);
      if (match && match[1]) {
        const decoded = decodeBase36(match[1].toLowerCase());
        if (decoded !== null) {
          existingIds.add(decoded);
        }
      }
    }
  }

  // Increment until we find a free slot
  let candidate = id;
  while (existingIds.has(candidate)) {
    candidate++;
  }

  return candidate;
}

export function formatProjectNumber(num: number): string {
  return encodeBase36(num);
}

export function getProjectDir(rafDir: string, projectName: string): string | null {
  if (!fs.existsSync(rafDir)) {
    return null;
  }

  const entries = fs.readdirSync(rafDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const match = entry.name.match(/^[0-9a-z]{6}-(.+)$/i);
      if (match && match[1] === projectName) {
        return path.join(rafDir, entry.name);
      }
    }
  }

  return null;
}

/**
 * Extract project number prefix from a project path.
 * E.g., "/Users/foo/RAF/00abc0-my-project" -> "00abc0"
 * Returns the 6-char base36 prefix string or null if not found.
 */
export function extractProjectNumber(projectPath: string): string | null {
  const folderName = path.basename(projectPath);
  const match = folderName.match(/^([0-9a-z]{6})-/i);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  return null;
}

/**
 * Parse a project prefix string to its numeric value.
 * Accepts a 6-character base36 string.
 * Returns the numeric project number or null if invalid.
 */
export function parseProjectPrefix(prefix: string): number | null {
  if (isBase36Prefix(prefix)) {
    return decodeBase36(prefix);
  }
  return null;
}

/**
 * Extract project name from a project path (without number prefix).
 * E.g., "/Users/foo/RAF/00abc0-my-project" -> "my-project"
 * Returns the project name or null if not found.
 */
export function extractProjectName(projectPath: string): string | null {
  const folderName = path.basename(projectPath);
  const match = folderName.match(/^[0-9a-z]{6}-(.+)$/i);
  if (match && match[1]) {
    return match[1];
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
  const match = basename.match(/^[0-9a-z]{2}-(.+)$/);
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
      const match = entry.name.match(/^([0-9a-z]{6})-(.+)$/i);
      if (match && match[1] && match[2]) {
        const decoded = decodeBase36(match[1].toLowerCase());
        if (decoded !== null) {
          projects.push({
            number: decoded,
            name: match[2],
            path: path.join(rafDir, entry.name),
          });
        }
      }
    }
  }

  return projects.sort((a, b) => a.number - b.number);
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
  const match = folderName.match(/^([0-9a-z]{6})-(.+)$/i);
  if (match && match[1] && match[2]) {
    const decoded = decodeBase36(match[1].toLowerCase());
    if (decoded !== null) {
      return {
        number: decoded,
        name: match[2],
        path: path.join(rafDir, folderName),
        folder: folderName,
      };
    }
  }

  return null;
}

/**
 * Resolve a project identifier with detailed result including ambiguity detection.
 *
 * Supported identifier formats (checked in this order):
 * 1. Full folder name (e.g., "00abc0-fix-stuff")
 *    - Must be an exact match to an existing folder
 *    - Pattern: 6-char base36 prefix, followed by hyphen and name
 * 2. Base36 prefix (e.g., "00abc0")
 *    - Looks up by decoded project number
 * 3. Project name (e.g., "my-project", "fix-stuff")
 *    - Looks up by the name portion of the folder (after the prefix)
 *    - Case-insensitive matching
 *    - Returns error if multiple projects have the same name
 *
 * @param rafDir - The RAF directory containing project folders
 * @param identifier - The identifier to resolve
 * @returns Resolution result with path, error type, and matches for ambiguous cases
 */
export function resolveProjectIdentifierWithDetails(
  rafDir: string,
  identifier: string
): ProjectResolutionResult {
  if (!fs.existsSync(rafDir)) {
    return { path: null, error: 'not_found' };
  }

  // Pattern to match full folder names: XXXXXX-name (6-char base36 prefix)
  const fullFolderPattern = /^[0-9a-z]{6}-(.+)$/i;
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

  // Check if it's a base36 identifier (e.g., "00abc0")
  const isBase36 = isBase36Prefix(identifier);

  let targetNumber: number | null = null;
  if (isBase36) {
    targetNumber = decodeBase36(identifier);
  }

  const entries = fs.readdirSync(rafDir, { withFileTypes: true });
  const nameMatches: Array<{ number: number; name: string; path: string; folder: string }> = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const project = parseProjectFolder(rafDir, entry.name);

      if (project) {
        if (targetNumber !== null && project.number === targetNumber) {
          // Match by number (base36 identifier)
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
 * 1. Full folder name (e.g., "00abc0-fix-stuff")
 *    - Must be an exact match to an existing folder
 *    - Pattern: 6-char base36 prefix, followed by hyphen and name
 * 2. Base36 prefix (e.g., "00abc0")
 *    - Looks up by decoded project number
 * 3. Project name (e.g., "my-project", "fix-stuff")
 *    - Looks up by the name portion of the folder (after the prefix)
 *    - Case-insensitive matching
 *
 * Note: For ambiguity detection (multiple projects with same name), use
 * resolveProjectIdentifierWithDetails instead.
 *
 * @param rafDir - The RAF directory containing project folders
 * @param identifier - The identifier to resolve
 * @returns The full project path or null if not found (or ambiguous)
 */
export function resolveProjectIdentifier(
  rafDir: string,
  identifier: string
): string | null {
  const result = resolveProjectIdentifierWithDetails(rafDir, identifier);
  return result.path;
}
