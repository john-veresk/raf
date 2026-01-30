import * as fs from 'node:fs';
import * as path from 'node:path';

export const RAF_DIR = 'RAF';

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
      const match = entry.name.match(/^(\d{2,3})-/);
      if (match && match[1]) {
        numbers.push(parseInt(match[1], 10));
      }
    }
  }

  if (numbers.length === 0) {
    return 1;
  }

  return Math.max(...numbers) + 1;
}

export function formatProjectNumber(num: number): string {
  return num.toString().padStart(3, '0');
}

export function getProjectDir(rafDir: string, projectName: string): string | null {
  if (!fs.existsSync(rafDir)) {
    return null;
  }

  const entries = fs.readdirSync(rafDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const match = entry.name.match(/^\d{2,3}-(.+)$/);
      if (match && match[1] === projectName) {
        return path.join(rafDir, entry.name);
      }
    }
  }

  return null;
}

/**
 * Extract project number from a project path.
 * E.g., "/Users/foo/RAF/001-my-project" -> "001"
 * Returns the formatted number string (e.g., "001") or null if not found.
 */
export function extractProjectNumber(projectPath: string): string | null {
  const folderName = path.basename(projectPath);
  const match = folderName.match(/^(\d{2,3})-/);
  return match && match[1] ? match[1] : null;
}

/**
 * Extract project name from a project path (without number prefix).
 * E.g., "/Users/foo/RAF/001-my-project" -> "my-project"
 * Returns the project name or null if not found.
 */
export function extractProjectName(projectPath: string): string | null {
  const folderName = path.basename(projectPath);
  const match = folderName.match(/^\d{2,3}-(.+)$/);
  return match && match[1] ? match[1] : null;
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
      const match = entry.name.match(/^(\d{2,3})-(.+)$/);
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

export function getPlansDir(projectPath: string): string {
  return path.join(projectPath, 'plans');
}

export function getOutcomesDir(projectPath: string): string {
  return path.join(projectPath, 'outcomes');
}

export function getDecisionsDir(projectPath: string): string {
  return path.join(projectPath, 'decisions');
}

export function getLogsDir(projectPath: string): string {
  return path.join(projectPath, 'logs');
}

export function getInputPath(projectPath: string): string {
  return path.join(projectPath, 'input.md');
}

export function getSummaryPath(projectPath: string): string {
  return path.join(getOutcomesDir(projectPath), 'SUMMARY.md');
}
