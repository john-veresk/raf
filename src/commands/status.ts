import { Command } from 'commander';
import { getRafDir, getProjectDir, listProjects, extractProjectName } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import type { StatusCommandOptions } from '../types/config.js';
import {
  deriveProjectState,
  getDerivedStats,
  isProjectComplete,
  hasProjectFailed,
  type DerivedTaskStatus,
} from '../core/state-derivation.js';

export function createStatusCommand(): Command {
  const command = new Command('status')
    .description('Show status of a project or list all projects')
    .argument('[projectName]', 'Name of the project (omit to list all)')
    .option('--json', 'Output as JSON')
    .action(async (projectName?: string, options?: StatusCommandOptions) => {
      await runStatusCommand(projectName, options);
    });

  return command;
}

async function runStatusCommand(
  projectName?: string,
  options?: StatusCommandOptions
): Promise<void> {
  const rafDir = getRafDir();

  if (!projectName) {
    // List all projects
    await listAllProjects(rafDir, options);
    return;
  }

  // Show specific project
  const projectPath = getProjectDir(rafDir, projectName);

  if (!projectPath) {
    logger.error(`Project not found: ${projectName}`);
    logger.info(`Run 'raf status' to see available projects.`);
    process.exit(1);
  }

  // Derive state from folder structure
  const state = deriveProjectState(projectPath);
  const stats = getDerivedStats(state);
  const derivedProjectName = extractProjectName(projectPath) ?? projectName;

  // Determine project status from task states
  const projectStatus = isProjectComplete(state) ? 'completed' :
    hasProjectFailed(state) ? 'failed' :
    stats.total === 0 ? 'ready' : 'in_progress';

  if (options?.json) {
    console.log(JSON.stringify({ projectName: derivedProjectName, status: projectStatus, state, stats }, null, 2));
    return;
  }

  // Display project status
  logger.info(`Project: ${derivedProjectName}`);
  logger.info(`Status: ${projectStatus}`);
  logger.newline();

  logger.info('Tasks:');
  logger.newline();

  for (const task of state.tasks) {
    const badge = getStatusBadge(task.status);
    logger.info(`  ${badge} ${task.id}: ${task.planFile}`);
  }

  logger.newline();
  logger.info('Summary:');
  logger.info(`  Completed: ${stats.completed}`);
  logger.info(`  Failed: ${stats.failed}`);
  logger.info(`  Pending: ${stats.pending}`);
  logger.info(`  Total: ${stats.total}`);
}

async function listAllProjects(
  rafDir: string,
  options?: StatusCommandOptions
): Promise<void> {
  const projects = listProjects(rafDir);

  if (projects.length === 0) {
    logger.info('No projects found.');
    logger.info(`Run 'raf plan' to create a new project.`);
    return;
  }

  if (options?.json) {
    const projectsWithState = projects.map((p) => {
      try {
        const state = deriveProjectState(p.path);
        const stats = getDerivedStats(state);
        return {
          ...p,
          state,
          stats,
        };
      } catch {
        return { ...p, state: null, stats: null };
      }
    });
    console.log(JSON.stringify(projectsWithState, null, 2));
    return;
  }

  logger.info('Projects:');
  logger.newline();

  for (const project of projects) {
    let taskInfo = '';
    let projectStatus = 'ready';

    try {
      const state = deriveProjectState(project.path);
      const stats = getDerivedStats(state);
      taskInfo = ` (${stats.completed}/${stats.total} tasks)`;
      projectStatus = isProjectComplete(state) ? 'completed' :
        hasProjectFailed(state) ? 'failed' :
        stats.total === 0 ? 'ready' : 'in_progress';
    } catch {
      // Failed to derive state
    }

    const statusBadge = getProjectStatusBadge(projectStatus);
    logger.info(`  ${statusBadge} ${project.name}${taskInfo}`);
  }

  logger.newline();
  logger.info(`Use 'raf status <projectName>' for details.`);
}

function getStatusBadge(status: DerivedTaskStatus): string {
  switch (status) {
    case 'pending':
      return '[ ]';
    case 'completed':
      return '[x]';
    case 'failed':
      return '[!]';
    default:
      return '[?]';
  }
}

function getProjectStatusBadge(status: string): string {
  switch (status) {
    case 'ready':
      return '[R]';
    case 'in_progress':
      return '[~]';
    case 'completed':
      return '[x]';
    case 'failed':
      return '[!]';
    default:
      return '[?]';
  }
}
