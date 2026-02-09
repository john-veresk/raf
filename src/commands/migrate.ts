import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';
import { getRafDir, encodeBase26 } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import { getRepoBasename, computeWorktreeBaseDir } from '../core/worktree.js';
import type { MigrateCommandOptions } from '../types/config.js';

/** 3-char base36 legacy prefix: e.g., "007", "01a", "1zz" */
const LEGACY_3CHAR_PATTERN = /^([0-9a-z]{3})-(.+)$/;

/** 6-char base36 legacy prefix with at least one digit: e.g., "021h44", "00j3k1" */
const LEGACY_6CHAR_PATTERN = /^([0-9a-z]{6})-(.+)$/;

/** Already-migrated base26 prefix: all lowercase letters, no digits */
const BASE26_PATTERN = /^[a-z]{6}-/;

export interface MigrationEntry {
  oldName: string;
  newName: string;
  oldPath: string;
  newPath: string;
}

/**
 * Check if a 6-char prefix contains at least one digit (meaning it's legacy base36, not base26).
 */
function hasDigit(str: string): boolean {
  return /[0-9]/.test(str);
}

/**
 * Decode a base36 string of any length back to a number.
 */
function decodeBase36(str: string): number {
  return parseInt(str, 36);
}

/**
 * Scan a directory for legacy project folders and compute migrations.
 * Returns an array of migration entries (old name -> new name).
 */
export function detectMigrations(dirPath: string): MigrationEntry[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const migrations: MigrationEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const name = entry.name;

    // Skip already-migrated base26 folders
    if (BASE26_PATTERN.test(name)) continue;

    // Try 3-char base36 pattern first
    const match3 = name.match(LEGACY_3CHAR_PATTERN);
    if (match3 && match3[1] && match3[2]) {
      const prefix = match3[1];
      const projectName = match3[2];
      const numericValue = decodeBase36(prefix);
      const newPrefix = encodeBase26(numericValue);
      const newName = `${newPrefix}-${projectName}`;

      migrations.push({
        oldName: name,
        newName,
        oldPath: path.join(dirPath, name),
        newPath: path.join(dirPath, newName),
      });
      continue;
    }

    // Try 6-char base36 pattern (must have at least one digit to distinguish from base26)
    const match6 = name.match(LEGACY_6CHAR_PATTERN);
    if (match6 && match6[1] && match6[2]) {
      const prefix = match6[1];
      if (!hasDigit(prefix)) continue; // Pure letters = already base26

      const projectName = match6[2];
      const numericValue = decodeBase36(prefix);
      const newPrefix = encodeBase26(numericValue);
      const newName = `${newPrefix}-${projectName}`;

      migrations.push({
        oldName: name,
        newName,
        oldPath: path.join(dirPath, name),
        newPath: path.join(dirPath, newName),
      });
    }
  }

  return migrations;
}

/**
 * Check for collisions in a set of migrations (two old IDs mapping to the same base26 ID).
 * Returns an array of collision descriptions if found.
 */
function findCollisions(migrations: MigrationEntry[]): string[] {
  const targetNames = new Map<string, string[]>();
  for (const m of migrations) {
    const existing = targetNames.get(m.newName) ?? [];
    existing.push(m.oldName);
    targetNames.set(m.newName, existing);
  }

  const collisions: string[] = [];
  for (const [newName, oldNames] of targetNames) {
    if (oldNames.length > 1) {
      collisions.push(`${oldNames.join(', ')} -> ${newName}`);
    }
  }
  return collisions;
}

/**
 * Check if a target name already exists on disk (collision with existing folder).
 */
function findExistingConflicts(migrations: MigrationEntry[]): string[] {
  const conflicts: string[] = [];
  for (const m of migrations) {
    if (fs.existsSync(m.newPath)) {
      conflicts.push(`${m.oldName} -> ${m.newName} (target already exists)`);
    }
  }
  return conflicts;
}

/**
 * Execute migrations: rename folders on disk.
 * Returns count of successful renames.
 */
function executeMigrations(migrations: MigrationEntry[]): { succeeded: number; errors: string[] } {
  let succeeded = 0;
  const errors: string[] = [];

  for (const m of migrations) {
    try {
      fs.renameSync(m.oldPath, m.newPath);
      succeeded++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to rename ${m.oldName}: ${msg}`);
    }
  }

  return { succeeded, errors };
}

export function createMigrateCommand(): Command {
  const command = new Command('migrate-project-ids-base26')
    .description('Rename project folders from legacy base36 IDs to base26 encoding')
    .option('--dry-run', 'Preview changes without renaming')
    .option('--worktree', 'Also migrate worktree project directories')
    .action(async (options?: MigrateCommandOptions) => {
      await runMigrateCommand(options);
    });

  return command;
}

async function runMigrateCommand(options?: MigrateCommandOptions): Promise<void> {
  const dryRun = options?.dryRun ?? false;
  const includeWorktree = options?.worktree ?? false;

  // Collect directories to scan
  const dirsToScan: Array<{ label: string; path: string }> = [];

  // Main RAF directory
  const rafDir = getRafDir();
  dirsToScan.push({ label: 'RAF', path: rafDir });

  // Worktree directories
  if (includeWorktree) {
    const repoBasename = getRepoBasename();
    if (repoBasename) {
      const worktreeBaseDir = computeWorktreeBaseDir(repoBasename);
      if (fs.existsSync(worktreeBaseDir)) {
        const worktreeEntries = fs.readdirSync(worktreeBaseDir, { withFileTypes: true });
        for (const entry of worktreeEntries) {
          if (entry.isDirectory()) {
            const wtRafDir = path.join(worktreeBaseDir, entry.name, 'RAF');
            if (fs.existsSync(wtRafDir)) {
              dirsToScan.push({ label: `worktree:${entry.name}`, path: wtRafDir });
            }
          }
        }
      }
    } else {
      logger.warn('Not in a git repository — skipping worktree scan');
    }
  }

  // Detect all migrations
  let totalMigrations: MigrationEntry[] = [];
  const migrationsByDir: Array<{ label: string; migrations: MigrationEntry[] }> = [];

  for (const dir of dirsToScan) {
    const migrations = detectMigrations(dir.path);
    if (migrations.length > 0) {
      migrationsByDir.push({ label: dir.label, migrations });
      totalMigrations = totalMigrations.concat(migrations);
    }
  }

  if (totalMigrations.length === 0) {
    logger.info('No legacy project folders found. Nothing to migrate.');
    return;
  }

  // Check for collisions
  const collisions = findCollisions(totalMigrations);
  if (collisions.length > 0) {
    logger.error('Collision detected — multiple old IDs map to the same base26 ID:');
    for (const c of collisions) {
      logger.error(`  ${c}`);
    }
    process.exit(1);
  }

  // Check for existing conflicts (target folder already exists)
  const conflicts = findExistingConflicts(totalMigrations);
  if (conflicts.length > 0) {
    logger.error('Target folder already exists:');
    for (const c of conflicts) {
      logger.error(`  ${c}`);
    }
    process.exit(1);
  }

  // Print summary
  if (dryRun) {
    logger.info('Dry run — no changes will be made:');
  }

  for (const group of migrationsByDir) {
    if (migrationsByDir.length > 1) {
      logger.info(`\n${group.label}:`);
    }
    for (const m of group.migrations) {
      logger.info(`  ${m.oldName} -> ${m.newName}`);
    }
  }

  if (dryRun) {
    logger.info(`\n${totalMigrations.length} folder${totalMigrations.length === 1 ? '' : 's'} would be renamed.`);
    return;
  }

  // Execute migrations
  const { succeeded, errors } = executeMigrations(totalMigrations);

  if (errors.length > 0) {
    for (const e of errors) {
      logger.error(e);
    }
  }

  logger.success(`${succeeded} folder${succeeded === 1 ? '' : 's'} renamed.`);
  if (errors.length > 0) {
    logger.error(`${errors.length} rename${errors.length === 1 ? '' : 's'} failed.`);
    process.exit(1);
  }
}
