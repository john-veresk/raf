import { Command } from 'commander';
import { StateManager } from '../core/state-manager.js';
import { getRafDir, getProjectDir, listProjects } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import type { StatusCommandOptions } from '../types/config.js';
import type { TaskStatus } from '../types/state.js';

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

  let stateManager: StateManager;
  try {
    stateManager = new StateManager(projectPath);
  } catch (error) {
    logger.error(`Failed to load project state: ${error}`);
    process.exit(1);
  }

  const state = stateManager.getState();
  const stats = stateManager.getStats();

  if (options?.json) {
    console.log(JSON.stringify({ state, stats }, null, 2));
    return;
  }

  // Display project status
  logger.info(`Project: ${state.projectName}`);
  logger.info(`Status: ${state.status}`);
  logger.info(`Created: ${state.createdAt}`);
  logger.info(`Updated: ${state.updatedAt}`);
  logger.newline();

  logger.info('Tasks:');
  logger.newline();

  for (const task of state.tasks) {
    const badge = getStatusBadge(task.status);
    const attempts = task.attempts > 0 ? ` (attempts: ${task.attempts})` : '';
    logger.info(`  ${badge} ${task.id}: ${task.planFile}${attempts}`);

    if (task.failureReason) {
      logger.info(`       Reason: ${task.failureReason}`);
    }
    if (task.commitHash) {
      logger.info(`       Commit: ${task.commitHash}`);
    }
  }

  logger.newline();
  logger.info('Summary:');
  logger.info(`  Completed: ${stats.completed}`);
  logger.info(`  Failed: ${stats.failed}`);
  logger.info(`  In Progress: ${stats.inProgress}`);
  logger.info(`  Pending: ${stats.pending}`);
  logger.info(`  Skipped: ${stats.skipped}`);
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
        const stateManager = new StateManager(p.path);
        return {
          ...p,
          state: stateManager.getState(),
          stats: stateManager.getStats(),
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
    let status = 'unknown';
    let taskInfo = '';

    try {
      const stateManager = new StateManager(project.path);
      status = stateManager.getStatus();
      const stats = stateManager.getStats();
      taskInfo = ` (${stats.completed}/${stateManager.getTasks().length} tasks)`;
    } catch {
      // State file might not exist
    }

    const statusBadge = getProjectStatusBadge(status);
    logger.info(`  ${statusBadge} ${project.name}${taskInfo}`);
  }

  logger.newline();
  logger.info(`Use 'raf status <projectName>' for details.`);
}

function getStatusBadge(status: TaskStatus): string {
  switch (status) {
    case 'pending':
      return '[ ]';
    case 'in_progress':
      return '[~]';
    case 'completed':
      return '[x]';
    case 'failed':
      return '[!]';
    case 'skipped':
      return '[-]';
    default:
      return '[?]';
  }
}

function getProjectStatusBadge(status: string): string {
  switch (status) {
    case 'planning':
      return '[P]';
    case 'ready':
      return '[R]';
    case 'executing':
      return '[~]';
    case 'completed':
      return '[x]';
    case 'failed':
      return '[!]';
    default:
      return '[?]';
  }
}
