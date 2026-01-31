import * as fs from 'node:fs';
import * as path from 'node:path';
import { getPlansDir, getOutcomesDir, getInputPath } from '../utils/paths.js';

export type DerivedTaskStatus = 'pending' | 'completed' | 'failed' | 'blocked';

export type DerivedProjectStatus =
  | 'planning'
  | 'ready'
  | 'executing'
  | 'completed'
  | 'failed';

export interface DerivedTask {
  id: string;
  planFile: string;
  status: DerivedTaskStatus;
  dependencies: string[];
}

export interface DerivedProjectState {
  tasks: DerivedTask[];
  status: DerivedProjectStatus;
}

export interface DiscoveredProject {
  number: number;
  name: string;
  path: string;
}

export interface DerivedStats {
  pending: number;
  completed: number;
  failed: number;
  blocked: number;
  total: number;
}

/**
 * Discover all projects in the RAF directory.
 * Projects are directories matching the pattern NNN-project-name.
 */
export function discoverProjects(rafDir: string): DiscoveredProject[] {
  if (!fs.existsSync(rafDir)) {
    return [];
  }

  const entries = fs.readdirSync(rafDir, { withFileTypes: true });
  const projects: DiscoveredProject[] = [];

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

/**
 * Parse the Dependencies section from plan file content.
 * Format: `## Dependencies\n001, 002` → ["001", "002"]
 * Returns empty array if no Dependencies section exists.
 */
export function parseDependencies(content: string): string[] {
  const dependenciesMatch = content.match(/^## Dependencies\s*\n([^\n#]+)/m);
  if (!dependenciesMatch || !dependenciesMatch[1]) {
    return [];
  }

  const dependenciesLine = dependenciesMatch[1].trim();
  if (!dependenciesLine) {
    return [];
  }

  // Parse comma-separated task IDs
  return dependenciesLine
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^\d{2,3}$/.test(id));
}

/**
 * Parse an outcome file to extract its status.
 * Status is determined by the presence of promise markers:
 * - `<promise>COMPLETE</promise>` → completed
 * - `<promise>FAILED</promise>` → failed
 * - `<promise>BLOCKED</promise>` → blocked
 * Uses the last occurrence if multiple markers exist.
 */
export function parseOutcomeStatus(content: string): DerivedTaskStatus | null {
  const markerRegex = /<promise>(COMPLETE|FAILED|BLOCKED)<\/promise>/g;
  let lastMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(content)) !== null) {
    lastMatch = match;
  }

  if (lastMatch && lastMatch[1]) {
    switch (lastMatch[1]) {
      case 'COMPLETE':
        return 'completed';
      case 'FAILED':
        return 'failed';
      case 'BLOCKED':
        return 'blocked';
    }
  }
  return null;
}

/**
 * Derive project status from tasks.
 * - planning: has input.md but no plans folder or empty plans
 * - ready: has plan files but no outcome files
 * - executing: has some outcome files but not all (or has failed outcomes without SUCCESS)
 * - completed: all plan files have corresponding SUCCESS outcomes
 * - failed: has FAILED outcome files
 */
export function deriveProjectStatus(
  projectPath: string,
  tasks: DerivedTask[]
): DerivedProjectStatus {
  const plansDir = getPlansDir(projectPath);
  const inputPath = getInputPath(projectPath);

  const hasInput = fs.existsSync(inputPath);
  const hasPlansDir = fs.existsSync(plansDir);

  // If no plans directory or empty plans
  if (!hasPlansDir || tasks.length === 0) {
    return hasInput ? 'planning' : 'planning';
  }

  const stats = {
    pending: 0,
    completed: 0,
    failed: 0,
  };

  for (const task of tasks) {
    if (task.status === 'pending') stats.pending++;
    else if (task.status === 'completed') stats.completed++;
    else if (task.status === 'failed') stats.failed++;
  }

  // If any task failed, project is failed
  if (stats.failed > 0) {
    return 'failed';
  }

  // If all tasks completed, project is completed
  if (stats.completed === tasks.length && tasks.length > 0) {
    return 'completed';
  }

  // If no tasks have been started (all pending), project is ready
  if (stats.pending === tasks.length) {
    return 'ready';
  }

  // Otherwise, project is executing
  return 'executing';
}

/**
 * Derive project state from the folder structure.
 * Scans plans/ for plan files and outcomes/ for outcome files.
 * Matches them by task ID (NNN prefix) and determines status.
 * Also parses dependencies and derives blocked status.
 */
export function deriveProjectState(projectPath: string): DerivedProjectState {
  const plansDir = getPlansDir(projectPath);
  const outcomesDir = getOutcomesDir(projectPath);

  const tasks: DerivedTask[] = [];

  // Scan plans directory for plan files
  if (!fs.existsSync(plansDir)) {
    const status = deriveProjectStatus(projectPath, tasks);
    return { tasks, status };
  }

  const planFiles = fs.readdirSync(plansDir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  // Build a map of outcome statuses
  const outcomeStatuses = new Map<string, DerivedTaskStatus>();
  if (fs.existsSync(outcomesDir)) {
    const outcomeFiles = fs.readdirSync(outcomesDir)
      .filter((f) => f.endsWith('.md'))
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

  // First pass: Match plan files to outcomes and parse dependencies
  for (const planFile of planFiles) {
    const match = planFile.match(/^(\d{2,3})-(.+)\.md$/);
    if (match && match[1]) {
      const taskId = match[1];
      const status = outcomeStatuses.get(taskId) ?? 'pending';

      // Read plan file to extract dependencies
      const planContent = fs.readFileSync(path.join(plansDir, planFile), 'utf-8');
      const dependencies = parseDependencies(planContent);

      tasks.push({
        id: taskId,
        planFile: path.join('plans', planFile),
        status,
        dependencies,
      });
    }
  }

  // Second pass: Derive blocked status for pending tasks
  // A task is blocked if any of its dependencies are failed or blocked
  const taskStatusMap = new Map<string, DerivedTaskStatus>();
  for (const task of tasks) {
    taskStatusMap.set(task.id, task.status);
  }

  // Process blocked status (may need multiple passes for transitive blocking)
  let changed = true;
  while (changed) {
    changed = false;
    for (const task of tasks) {
      if (task.status === 'pending' && task.dependencies.length > 0) {
        const isBlocked = task.dependencies.some((depId) => {
          const depStatus = taskStatusMap.get(depId);
          return depStatus === 'failed' || depStatus === 'blocked';
        });
        if (isBlocked) {
          task.status = 'blocked';
          taskStatusMap.set(task.id, 'blocked');
          changed = true;
        }
      }
    }
  }

  const projectStatus = deriveProjectStatus(projectPath, tasks);
  return { tasks, status: projectStatus };
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
 * Skips blocked tasks - they cannot be executed until their dependencies pass.
 */
export function getNextExecutableTask(state: DerivedProjectState): DerivedTask | null {
  // First try pending tasks (blocked tasks have status 'blocked', not 'pending')
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
    blocked: 0,
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
      case 'blocked':
        stats.blocked++;
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
