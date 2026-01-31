import * as fs from 'node:fs';
import * as path from 'node:path';

export const RAF_DIR = 'RAF';

// Base36 constants
const BASE36_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';
const BASE36_START = 1000; // First base36 project number
const MAX_NUMERIC = 999; // Last numeric project number

/**
 * Encode a project number >= 1000 to a 3-character base36 string.
 * The encoding offsets by 1000, so:
 * - 1000 -> 'a00'
 * - 1001 -> 'a01'
 * - 1035 -> 'a0z'
 * - 1036 -> 'a10'
 * - etc.
 *
 * First character uses a-z (10-35 in base36, letters only).
 * Second and third characters use 0-9a-z (0-35 in base36).
 */
export function encodeBase36(num: number): string {
  if (num < BASE36_START) {
    throw new Error(`encodeBase36 only accepts numbers >= ${BASE36_START}, got ${num}`);
  }

  // Offset to get the base36 representation starting at 'a00' for 1000
  const offset = num - BASE36_START;

  // First character: 'a' + (offset / 36^2), uses only letters a-z
  // This gives us 26 possible first characters (a-z)
  const firstCharIndex = Math.floor(offset / (36 * 36));
  if (firstCharIndex >= 26) {
    throw new Error(`Project number ${num} exceeds maximum base36 capacity (max: ${BASE36_START + 26 * 36 * 36 - 1})`);
  }
  const firstChar = BASE36_CHARS[10 + firstCharIndex]; // Start from 'a' (index 10)

  // Second and third characters: remaining value in base36
  const remainder = offset % (36 * 36);
  const secondCharIndex = Math.floor(remainder / 36);
  const thirdCharIndex = remainder % 36;

  const secondChar = BASE36_CHARS[secondCharIndex];
  const thirdChar = BASE36_CHARS[thirdCharIndex];

  return `${firstChar}${secondChar}${thirdChar}`;
}

/**
 * Decode a 3-character base36 string to a project number.
 * Returns the decoded number >= 1000, or null if invalid format.
 */
export function decodeBase36(str: string): number | null {
  if (str.length !== 3) {
    return null;
  }

  const lower = str.toLowerCase();
  const firstChar = lower.charAt(0);
  const secondChar = lower.charAt(1);
  const thirdChar = lower.charAt(2);

  // First character must be a letter (a-z)
  const firstIndex = BASE36_CHARS.indexOf(firstChar);
  if (firstIndex < 10 || firstIndex > 35) {
    return null; // Not a letter
  }

  // Second and third characters can be 0-9 or a-z
  const secondIndex = BASE36_CHARS.indexOf(secondChar);
  const thirdIndex = BASE36_CHARS.indexOf(thirdChar);

  if (secondIndex === -1 || thirdIndex === -1) {
    return null;
  }

  // Calculate the offset from 1000
  const letterOffset = firstIndex - 10; // 'a' = 0, 'b' = 1, etc.
  const offset = letterOffset * 36 * 36 + secondIndex * 36 + thirdIndex;

  return BASE36_START + offset;
}

/**
 * Check if a string is a valid base36 project prefix.
 * Valid format: starts with a-z, followed by two base36 chars (0-9, a-z).
 */
export function isBase36Prefix(str: string): boolean {
  if (str.length !== 3) {
    return false;
  }
  return /^[a-z][0-9a-z]{2}$/.test(str.toLowerCase());
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
  if (!fs.existsSync(rafDir)) {
    return 1;
  }

  const entries = fs.readdirSync(rafDir, { withFileTypes: true });
  const numbers: number[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Try numeric format first (2-3 digits)
      const numericMatch = entry.name.match(/^(\d{2,3})-/);
      if (numericMatch && numericMatch[1]) {
        numbers.push(parseInt(numericMatch[1], 10));
        continue;
      }

      // Try base36 format
      const base36Match = entry.name.match(/^([a-z][0-9a-z]{2})-/i);
      if (base36Match && base36Match[1]) {
        const decoded = decodeBase36(base36Match[1].toLowerCase());
        if (decoded !== null) {
          numbers.push(decoded);
        }
      }
    }
  }

  if (numbers.length === 0) {
    return 1;
  }

  return Math.max(...numbers) + 1;
}

export function formatProjectNumber(num: number): string {
  if (num <= MAX_NUMERIC) {
    return num.toString().padStart(3, '0');
  }
  return encodeBase36(num);
}

export function getProjectDir(rafDir: string, projectName: string): string | null {
  if (!fs.existsSync(rafDir)) {
    return null;
  }

  const entries = fs.readdirSync(rafDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Try numeric format first
      const numericMatch = entry.name.match(/^\d{2,3}-(.+)$/);
      if (numericMatch && numericMatch[1] === projectName) {
        return path.join(rafDir, entry.name);
      }

      // Try base36 format
      const base36Match = entry.name.match(/^[a-z][0-9a-z]{2}-(.+)$/i);
      if (base36Match && base36Match[1] === projectName) {
        return path.join(rafDir, entry.name);
      }
    }
  }

  return null;
}

/**
 * Extract project number prefix from a project path.
 * Supports both numeric (001-999) and base36 (a00-zzz) formats.
 * E.g., "/Users/foo/RAF/001-my-project" -> "001"
 * E.g., "/Users/foo/RAF/a00-my-project" -> "a00"
 * Returns the prefix string (e.g., "001" or "a00") or null if not found.
 */
export function extractProjectNumber(projectPath: string): string | null {
  const folderName = path.basename(projectPath);

  // Try numeric format first (2-3 digits)
  const numericMatch = folderName.match(/^(\d{2,3})-/);
  if (numericMatch && numericMatch[1]) {
    return numericMatch[1];
  }

  // Try base36 format (letter followed by two alphanumeric chars)
  const base36Match = folderName.match(/^([a-z][0-9a-z]{2})-/i);
  if (base36Match && base36Match[1]) {
    return base36Match[1].toLowerCase();
  }

  return null;
}

/**
 * Parse a project prefix string to its numeric value.
 * Handles both numeric (001-999) and base36 (a00-zzz) formats.
 * Returns the numeric project number or null if invalid.
 */
export function parseProjectPrefix(prefix: string): number | null {
  // Try numeric first
  if (/^\d{2,3}$/.test(prefix)) {
    return parseInt(prefix, 10);
  }

  // Try base36
  if (isBase36Prefix(prefix)) {
    return decodeBase36(prefix);
  }

  return null;
}

/**
 * Extract project name from a project path (without number prefix).
 * Supports both numeric (001-999) and base36 (a00-zzz) formats.
 * E.g., "/Users/foo/RAF/001-my-project" -> "my-project"
 * E.g., "/Users/foo/RAF/a00-my-project" -> "my-project"
 * Returns the project name or null if not found.
 */
export function extractProjectName(projectPath: string): string | null {
  const folderName = path.basename(projectPath);

  // Try numeric format first
  const numericMatch = folderName.match(/^\d{2,3}-(.+)$/);
  if (numericMatch && numericMatch[1]) {
    return numericMatch[1];
  }

  // Try base36 format
  const base36Match = folderName.match(/^[a-z][0-9a-z]{2}-(.+)$/i);
  if (base36Match && base36Match[1]) {
    return base36Match[1];
  }

  return null;
}

/**
 * Extract task name from a plan filename (without number prefix and extension).
 * E.g., "002-fix-login-bug.md" -> "fix-login-bug"
 * Returns the task name or null if not found.
 */
export function extractTaskNameFromPlanFile(planFilename: string): string | null {
  const basename = path.basename(planFilename, '.md');
  const match = basename.match(/^\d{2,3}-(.+)$/);
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
      // Try numeric format first
      const numericMatch = entry.name.match(/^(\d{2,3})-(.+)$/);
      if (numericMatch && numericMatch[1] && numericMatch[2]) {
        projects.push({
          number: parseInt(numericMatch[1], 10),
          name: numericMatch[2],
          path: path.join(rafDir, entry.name),
        });
        continue;
      }

      // Try base36 format
      const base36Match = entry.name.match(/^([a-z][0-9a-z]{2})-(.+)$/i);
      if (base36Match && base36Match[1] && base36Match[2]) {
        const decoded = decodeBase36(base36Match[1].toLowerCase());
        if (decoded !== null) {
          projects.push({
            number: decoded,
            name: base36Match[2],
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
  // Try numeric format first
  const numericMatch = folderName.match(/^(\d{2,3})-(.+)$/);
  if (numericMatch && numericMatch[1] && numericMatch[2]) {
    return {
      number: parseInt(numericMatch[1], 10),
      name: numericMatch[2],
      path: path.join(rafDir, folderName),
      folder: folderName,
    };
  }

  // Try base36 format
  const base36Match = folderName.match(/^([a-z][0-9a-z]{2})-(.+)$/i);
  if (base36Match && base36Match[1] && base36Match[2]) {
    const decoded = decodeBase36(base36Match[1].toLowerCase());
    if (decoded !== null) {
      return {
        number: decoded,
        name: base36Match[2],
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
 * 1. Full folder name (e.g., "001-fix-stuff", "a01-important-project")
 *    - Must be an exact match to an existing folder
 *    - Pattern: numeric prefix (2-3 digits) or base36 prefix, followed by hyphen and name
 * 2. Numeric ID (e.g., "003", "3", "1000")
 *    - Looks up by project number
 * 3. Base36 prefix (e.g., "a00", "a01")
 *    - Looks up by base36 project number (for projects >= 1000)
 * 4. Project name (e.g., "my-project", "fix-stuff")
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

  // Pattern to match full folder names: NNN-name or XXX-name (base36)
  // Supports 2-3 digit numeric prefixes or 3-char base36 prefixes
  const fullFolderPattern = /^(\d{2,3}|[a-z][0-9a-z]{2})-(.+)$/i;
  const fullFolderMatch = identifier.match(fullFolderPattern);

  // Check if identifier is a full folder name (exact match required)
  if (fullFolderMatch) {
    // Check for exact case-insensitive match by listing directory
    const entries = fs.readdirSync(rafDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.toLowerCase() === identifier.toLowerCase()) {
        return { path: path.join(rafDir, entry.name) };
      }
    }
    // Full folder name format but doesn't exist as a folder.
    // Fall through to name-based matching - the entire identifier might be a project name
    // (e.g., "fix-double-summary-headers" looks like "fix-xxx" but is actually a name).
  }

  // Check if it's a numeric identifier (e.g., "003", "3", "1000")
  const isNumeric = /^\d+$/.test(identifier);

  // Check if it's a base36 identifier (e.g., "a00", "a01")
  const isBase36 = isBase36Prefix(identifier);

  // Convert base36 to numeric for matching
  let targetNumber: number | null = null;
  if (isNumeric) {
    targetNumber = parseInt(identifier, 10);
  } else if (isBase36) {
    targetNumber = decodeBase36(identifier);
  }

  const entries = fs.readdirSync(rafDir, { withFileTypes: true });
  const nameMatches: Array<{ number: number; name: string; path: string; folder: string }> = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const project = parseProjectFolder(rafDir, entry.name);

      if (project) {
        if (targetNumber !== null) {
          // Match by number (either numeric or base36 identifier)
          if (project.number === targetNumber) {
            return { path: project.path };
          }
        } else {
          // Match by name (case-insensitive)
          if (project.name.toLowerCase() === identifier.toLowerCase()) {
            nameMatches.push(project);
          }
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
 * 1. Full folder name (e.g., "001-fix-stuff", "a01-important-project")
 *    - Must be an exact match to an existing folder
 *    - Pattern: numeric prefix (2-3 digits) or base36 prefix, followed by hyphen and name
 * 2. Numeric ID (e.g., "003", "3", "1000")
 *    - Looks up by project number
 * 3. Base36 prefix (e.g., "a00", "a01")
 *    - Looks up by base36 project number (for projects >= 1000)
 * 4. Project name (e.g., "my-project", "fix-stuff")
 *    - Looks up by the name portion of the folder (after the prefix)
 *    - Case-insensitive matching
 *
 * Note: For ambiguity detection (multiple projects with same name), use
 * resolveProjectIdentifierWithDetails instead.
 *
 * This function is designed to be extensible for future task-level references
 * like "001-project/002-task".
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
