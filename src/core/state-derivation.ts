import * as fs from 'node:fs';
import * as path from 'node:path';
import { getPlansDir, getOutcomesDir } from '../utils/paths.js';

export type DerivedTaskStatus = 'pending' | 'completed' | 'failed';

export interface DerivedTask {
  id: string;
  planFile: string;
  status: DerivedTaskStatus;
}

export interface DerivedProjectState {
  tasks: DerivedTask[];
}

export interface DerivedStats {
  pending: number;
  completed: number;
  failed: number;
  total: number;
}

/**
 * Parse an outcome file to extract its status.
 * Status is expected to be in the format: "## Status: SUCCESS" or "## Status: FAILED"
 * at the beginning of the file.
 */
export function parseOutcomeStatus(content: string): DerivedTaskStatus | null {
  const statusMatch = content.match(/^## Status: (SUCCESS|FAILED)/m);
  if (statusMatch && statusMatch[1]) {
    return statusMatch[1] === 'SUCCESS' ? 'completed' : 'failed';
  }
  return null;
}

/**
 * Derive project state from the folder structure.
 * Scans plans/ for plan files and outcomes/ for outcome files.
 * Matches them by task ID (NNN prefix) and determines status.
 */
export function deriveProjectState(projectPath: string): DerivedProjectState {
  const plansDir = getPlansDir(projectPath);
  const outcomesDir = getOutcomesDir(projectPath);

  const tasks: DerivedTask[] = [];

  // Scan plans directory for plan files
  if (!fs.existsSync(plansDir)) {
    return { tasks };
  }

  const planFiles = fs.readdirSync(plansDir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  // Build a map of outcome statuses
  const outcomeStatuses = new Map<string, DerivedTaskStatus>();
  if (fs.existsSync(outcomesDir)) {
    const outcomeFiles = fs.readdirSync(outcomesDir)
      .filter((f) => f.endsWith('.md') && f !== 'SUMMARY.md')
      .sort();

    for (const outcomeFile of outcomeFiles) {
      const match = outcomeFile.match(/^(\d{2,3})-/);
      if (match && match[1]) {
        const taskId = match[1];
        const content = fs.readFileSync(path.join(outcomesDir, outcomeFile), 'utf-8');
        const status = parseOutcomeStatus(content);
        if (status) {
          outcomeStatuses.set(taskId, status);
        }
      }
    }
  }

  // Match plan files to outcomes
  for (const planFile of planFiles) {
    const match = planFile.match(/^(\d{2,3})-(.+)\.md$/);
    if (match && match[1]) {
      const taskId = match[1];
      const status = outcomeStatuses.get(taskId) ?? 'pending';
      tasks.push({
        id: taskId,
        planFile: path.join('plans', planFile),
        status,
      });
    }
  }

  return { tasks };
}

/**
 * Get the next pending task from derived state.
 */
export function getNextPendingTask(state: DerivedProjectState): DerivedTask | null {
  for (const task of state.tasks) {
    if (task.status === 'pending') {
      return task;
    }
  }
  return null;
}

/**
 * Get the next task that should be executed (pending or failed).
 */
export function getNextExecutableTask(state: DerivedProjectState): DerivedTask | null {
  // First try pending tasks
  for (const task of state.tasks) {
    if (task.status === 'pending') {
      return task;
    }
  }
  // Then try failed tasks (for retry)
  for (const task of state.tasks) {
    if (task.status === 'failed') {
      return task;
    }
  }
  return null;
}

/**
 * Calculate statistics from derived state.
 */
export function getDerivedStats(state: DerivedProjectState): DerivedStats {
  const stats: DerivedStats = {
    pending: 0,
    completed: 0,
    failed: 0,
    total: state.tasks.length,
  };

  for (const task of state.tasks) {
    switch (task.status) {
      case 'pending':
        stats.pending++;
        break;
      case 'completed':
        stats.completed++;
        break;
      case 'failed':
        stats.failed++;
        break;
    }
  }

  return stats;
}

/**
 * Check if all tasks are completed.
 */
export function isProjectComplete(state: DerivedProjectState): boolean {
  return state.tasks.every((t) => t.status === 'completed');
}

/**
 * Check if any task has failed.
 */
export function hasProjectFailed(state: DerivedProjectState): boolean {
  return state.tasks.some((t) => t.status === 'failed');
}
