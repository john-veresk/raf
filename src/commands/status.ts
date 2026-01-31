import { Command } from 'commander';
import { getRafDir, resolveProjectIdentifier, extractProjectName } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import type { StatusCommandOptions } from '../types/config.js';
import {
  deriveProjectState,
  getDerivedStats,
  discoverProjects,
  type DerivedTaskStatus,
} from '../core/state-derivation.js';
import { SYMBOLS, formatProgressBar, type TaskStatus } from '../utils/terminal-symbols.js';

export function createStatusCommand(): Command {
  const command = new Command('status')
    .description('Show status of a project or list all projects')
    .argument('[identifier]', 'Project identifier: number (3), name (my-project), or folder (001-my-project)')
    .option('--json', 'Output as JSON')
    .action(async (identifier?: string, options?: StatusCommandOptions) => {
      await runStatusCommand(identifier, options);
    });

  return command;
}

async function runStatusCommand(
  identifier?: string,
  options?: StatusCommandOptions
): Promise<void> {
  const rafDir = getRafDir();

  if (!identifier) {
    // List all projects
    await listAllProjects(rafDir, options);
    return;
  }

  // Show specific project - resolve identifier (number, name, or full folder name)
  const projectPath = resolveProjectIdentifier(rafDir, identifier);

  if (!projectPath) {
    logger.error(`Project not found: ${identifier}`);
    process.exit(1);
  }

  // Derive state from folder structure
  const state = deriveProjectState(projectPath);
  const stats = getDerivedStats(state);
  const projectName = extractProjectName(projectPath) ?? identifier;
  const projectStatus = state.status;

  if (options?.json) {
    console.log(JSON.stringify({ projectName, status: projectStatus, state, stats }, null, 2));
    return;
  }

  // Convert derived task statuses to TaskStatus for progress bar
  const taskStatuses: TaskStatus[] = state.tasks.map((t) => derivedStatusToTaskStatus(t.status));
  const progressBar = formatProgressBar(taskStatuses);

  // Display compact project status
  logger.info(`${SYMBOLS.project} ${projectName}`);
  logger.info(`${progressBar} (${stats.completed}/${stats.total})`);
}

async function listAllProjects(
  rafDir: string,
  options?: StatusCommandOptions
): Promise<void> {
  const projects = discoverProjects(rafDir);

  if (projects.length === 0) {
    logger.info('No projects found.');
    return;
  }

  if (options?.json) {
    const projectsWithState = projects.map((p) => {
      try {
        const state = deriveProjectState(p.path);
        const stats = getDerivedStats(state);
        return {
          ...p,
          status: state.status,
          state,
          stats,
        };
      } catch {
        return { ...p, status: null, state: null, stats: null };
      }
    });
    console.log(JSON.stringify(projectsWithState, null, 2));
    return;
  }

  for (const project of projects) {
    try {
      const state = deriveProjectState(project.path);
      const stats = getDerivedStats(state);

      // Convert derived task statuses to TaskStatus for progress bar
      const taskStatuses: TaskStatus[] = state.tasks.map((t) => derivedStatusToTaskStatus(t.status));
      const progressBar = formatProgressBar(taskStatuses);

      // Format: "001 my-project ✓✓●○○ (2/5)"
      const projectNumber = String(project.number).padStart(3, '0');
      const counts = `(${stats.completed}/${stats.total})`;
      logger.info(`${projectNumber} ${project.name} ${progressBar} ${counts}`);
    } catch {
      // Failed to derive state - show minimal info
      const projectNumber = String(project.number).padStart(3, '0');
      logger.info(`${projectNumber} ${project.name}`);
    }
  }
}

/**
 * Convert DerivedTaskStatus to TaskStatus for terminal symbols.
 * Note: DerivedTaskStatus doesn't have 'running' - tasks are either pending, completed, or failed.
 */
function derivedStatusToTaskStatus(status: DerivedTaskStatus): TaskStatus {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}
