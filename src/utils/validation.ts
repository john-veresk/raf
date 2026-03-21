import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { logger } from './logger.js';
import type { ClaudeModelName } from '../types/config.js';
import { isValidModelName } from './config.js';

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

  // Check that at least one supported CLI harness is installed
  try {
    execSync('which claude || which codex', { encoding: 'utf-8', stdio: 'pipe' });
  } catch {
    result.valid = false;
    result.errors.push('CLI harness not found. Please install Claude CLI or Codex CLI first.');
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
      const match = entry.name.match(/^\d+-(.+)$/);
      if (match && match[1] === projectName) {
        return path.join(rafDir, entry.name);
      }
    }
  }

  return null;
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

/** @deprecated Use ClaudeModelName from types/config.js instead */
export type ValidModelName = ClaudeModelName;

export function validateModelName(model: string): ClaudeModelName | null {
  const normalized = model.toLowerCase();
  if (isValidModelName(normalized)) {
    return normalized as ClaudeModelName;
  }
  return null;
}
