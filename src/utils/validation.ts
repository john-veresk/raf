import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { logger } from './logger.js';

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    warnings: [],
    errors: [],
  };

  // Check Claude CLI is installed
  try {
    execSync('which claude', { encoding: 'utf-8', stdio: 'pipe' });
  } catch {
    result.valid = false;
    result.errors.push('Claude CLI not found. Please install it first.');
  }

  // Check for git repo (warning only)
  try {
    execSync('git rev-parse --is-inside-work-tree', { encoding: 'utf-8', stdio: 'pipe' });
  } catch {
    result.warnings.push('Not in a git repository. Auto-commit will be disabled.');
  }

  // Check for CLAUDE.md (warning only)
  if (!fs.existsSync('CLAUDE.md')) {
    result.warnings.push('No CLAUDE.md found in current directory.');
  }

  return result;
}

export function validateProjectName(name: string): boolean {
  // Allow alphanumeric, hyphens, underscores
  const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
  return validPattern.test(name) && name.length <= 50;
}

export function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export function validateProjectExists(rafDir: string, projectName: string): string | null {
  const entries = fs.readdirSync(rafDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Match pattern like "01-project-name"
      const match = entry.name.match(/^\d{2}-(.+)$/);
      if (match && match[1] === projectName) {
        return path.join(rafDir, entry.name);
      }
    }
  }

  return null;
}

export function validateStateFile(projectPath: string): boolean {
  const statePath = path.join(projectPath, 'state.json');
  return fs.existsSync(statePath);
}

export function validatePlansExist(projectPath: string): boolean {
  const plansDir = path.join(projectPath, 'plans');
  if (!fs.existsSync(plansDir)) {
    return false;
  }

  const plans = fs.readdirSync(plansDir).filter(f => f.endsWith('.md'));
  return plans.length > 0;
}

export function reportValidation(result: ValidationResult): void {
  for (const warning of result.warnings) {
    logger.warn(warning);
  }

  for (const error of result.errors) {
    logger.error(error);
  }
}
