import { Command } from 'commander';
import { ProjectManager } from '../core/project-manager.js';
import { ClaudeRunner } from '../core/claude-runner.js';
import { shutdownHandler } from '../core/shutdown-handler.js';
import { stashChanges, hasUncommittedChanges } from '../core/git.js';
import { getExecutionPrompt } from '../prompts/execution.js';
import { parseOutput, extractSummary, isRetryableFailure } from '../parsers/output-parser.js';
import { validatePlansExist } from '../utils/validation.js';
import { getRafDir, extractProjectNumber, extractProjectName, extractTaskNameFromPlanFile, resolveProjectIdentifier } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import { getClaudeModel, getConfig } from '../utils/config.js';
import { createTaskTimer, formatElapsedTime } from '../utils/timer.js';
import { createStatusLine } from '../utils/status-line.js';
import {
  deriveProjectState,
  getNextExecutableTask,
  getDerivedStats,
  isProjectComplete,
  hasProjectFailed,
  type DerivedTask,
  type DerivedProjectState,
} from '../core/state-derivation.js';
import type { DoCommandOptions } from '../types/config.js';

/**
 * Result of executing a single project.
 */
interface ProjectExecutionResult {
  projectName: string;
  projectPath: string;
  success: boolean;
  tasksCompleted: number;
  totalTasks: number;
  error?: string;
}

export function createDoCommand(): Command {
  const command = new Command('do')
    .description('Execute planned tasks for one or more projects')
    .argument('<projects...>', 'Project name(s) or number(s) to execute')
    .option('-t, --timeout <minutes>', 'Timeout per task in minutes', '60')
    .option('-v, --verbose', 'Show full Claude output')
    .option('-d, --debug', 'Save all logs and show debug output')
    .option('-f, --force', 'Re-run all tasks regardless of status')
    .action(async (projects: string[], options: DoCommandOptions) => {
      await runDoCommand(projects, options);
    });

  return command;
}

async function runDoCommand(projectIdentifiers: string[], options: DoCommandOptions): Promise<void> {
  const rafDir = getRafDir();

  // Handle empty project list
  if (projectIdentifiers.length === 0) {
    logger.error('No projects specified.');
    logger.info("Usage: raf do <project1> [project2] [project3] ...");
    logger.info("Examples:");
    logger.info("  raf do my-project");
    logger.info("  raf do 003 004 005");
    logger.info("  raf do 003 my-project 005");
    process.exit(1);
  }

  // Resolve all project identifiers and remove duplicates
  const resolvedProjects: Array<{ identifier: string; path: string; name: string }> = [];
  const seenPaths = new Set<string>();
  const errors: Array<{ identifier: string; error: string }> = [];

  for (const identifier of projectIdentifiers) {
    const projectPath = resolveProjectIdentifier(rafDir, identifier);

    if (!projectPath) {
      errors.push({ identifier, error: 'Project not found' });
      continue;
    }

    // Skip duplicates
    if (seenPaths.has(projectPath)) {
      logger.info(`Skipping duplicate: ${identifier}`);
      continue;
    }

    seenPaths.add(projectPath);
    const projectName = extractProjectName(projectPath) ?? identifier;
    resolvedProjects.push({ identifier, path: projectPath, name: projectName });
  }

  // Report resolution errors
  for (const { identifier, error } of errors) {
    logger.error(`${identifier}: ${error}`);
  }

  if (resolvedProjects.length === 0) {
    logger.error('No valid projects to execute.');
    logger.info("Run 'raf status' to see available projects.");
    process.exit(1);
  }

  // Get configuration
  const config = getConfig();
  const timeout = Number(options.timeout) || config.timeout;
  const verbose = options.verbose ?? false;
  const debug = options.debug ?? false;
  const force = options.force ?? false;
  const maxRetries = config.maxRetries;
  const autoCommit = config.autoCommit;

  // Configure logger
  logger.configure({ verbose, debug });

  // Log Claude model name once
  const model = getClaudeModel();
  if (model && resolvedProjects.length > 1) {
    logger.info(`Using model: ${model}`);
    logger.newline();
  }

  // Execute projects
  const results: ProjectExecutionResult[] = [];
  const isMultiProject = resolvedProjects.length > 1;

  for (const [i, project] of resolvedProjects.entries()) {
    if (isMultiProject) {
      logger.info(`=== Project ${i + 1}/${resolvedProjects.length}: ${project.name} ===`);
      logger.newline();
    }

    try {
      const result = await executeSingleProject(
        project.path,
        project.name,
        {
          timeout,
          verbose,
          debug,
          force,
          maxRetries,
          autoCommit,
          showModel: !isMultiProject, // Only show model for single project
        }
      );
      results.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        projectName: project.name,
        projectPath: project.path,
        success: false,
        tasksCompleted: 0,
        totalTasks: 0,
        error: errorMessage,
      });
      logger.error(`Project ${project.name} failed: ${errorMessage}`);
    }

    if (isMultiProject && i < resolvedProjects.length - 1) {
      logger.newline();
    }
  }

  // Show multi-project summary
  if (isMultiProject) {
    printMultiProjectSummary(results);
  }

  // Exit with appropriate code
  const anyFailed = results.some((r) => !r.success);
  if (anyFailed) {
    process.exit(1);
  }
}

interface SingleProjectOptions {
  timeout: number;
  verbose: boolean;
  debug: boolean;
  force: boolean;
  maxRetries: number;
  autoCommit: boolean;
  showModel: boolean;
}

async function executeSingleProject(
  projectPath: string,
  projectName: string,
  options: SingleProjectOptions
): Promise<ProjectExecutionResult> {
  const { timeout, verbose, debug, force, maxRetries, autoCommit, showModel } = options;

  if (!validatePlansExist(projectPath)) {
    return {
      projectName,
      projectPath,
      success: false,
      tasksCompleted: 0,
      totalTasks: 0,
      error: 'No plan files found. Run planning first.',
    };
  }

  // Derive state from folder structure
  let state = deriveProjectState(projectPath);

  // Check if project is already complete
  if (isProjectComplete(state) && !force) {
    logger.info('All tasks completed. Use --force to re-run.');
    const stats = getDerivedStats(state);
    return {
      projectName,
      projectPath,
      success: true,
      tasksCompleted: stats.completed,
      totalTasks: stats.total,
    };
  }

  // Set up shutdown handler
  const claudeRunner = new ClaudeRunner();
  const projectManager = new ProjectManager();
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);

  logger.info(`Executing project: ${projectName}`);
  logger.info(`Tasks: ${state.tasks.length}, Timeout: ${timeout} minutes`);

  // Log Claude model name
  if (showModel) {
    const model = getClaudeModel();
    if (model) {
      logger.info(`Using model: ${model}`);
    }
  }

  logger.newline();

  // Execute tasks
  const totalTasks = state.tasks.length;

  // Track tasks completed in this session (for force mode)
  const completedInSession = new Set<string>();

  // Helper function to get the next task to execute
  function getNextTask(currentState: DerivedProjectState): DerivedTask | null {
    if (force) {
      // Find first task that hasn't been executed in this session
      for (const t of currentState.tasks) {
        if (!completedInSession.has(t.id)) {
          return t;
        }
      }
      return null;
    }
    // Normal mode: get next executable task (pending or failed)
    return getNextExecutableTask(currentState);
  }

  let task = getNextTask(state);

  while (task) {
    const taskIndex = state.tasks.findIndex((t) => t.id === task!.id);
    const taskNumber = taskIndex + 1;
    const taskName = extractTaskNameFromPlanFile(task.planFile);
    const taskContext = `[Task ${taskNumber}/${totalTasks}: ${taskName ?? task.id}]`;
    logger.setContext(taskContext);

    // Log task execution status
    if (task.status === 'failed') {
      logger.info(`Retrying task ${task.id} (previously failed)...`);
    } else if (task.status === 'completed' && force) {
      logger.info(`Re-running task ${task.id} (force mode)...`);
    } else {
      logger.info(`Executing task ${task.id}...`);
    }

    // Get previous outcomes for context
    const previousOutcomes = projectManager.readOutcomes(projectPath);

    // Build execution prompt
    const prompt = getExecutionPrompt({
      projectPath,
      planPath: projectManager.getPlanPath(projectPath, task.planFile),
      taskId: task.id,
      taskNumber,
      totalTasks,
      previousOutcomes,
      autoCommit,
      projectName,
    });

    // Execute with retries
    let success = false;
    let attempts = 0;
    let lastOutput = '';
    let failureReason = '';

    // Set up timer for elapsed time tracking
    const statusLine = createStatusLine();
    const timer = createTaskTimer(verbose ? undefined : (elapsed) => {
      const formatted = formatElapsedTime(elapsed);
      statusLine.update(`  ⏱ ${formatted}`);
    });
    timer.start();

    while (!success && attempts < maxRetries) {
      attempts++;

      if (attempts > 1) {
        logger.info(`  Retry ${attempts}/${maxRetries}...`);
      }

      // Run Claude
      const result = verbose
        ? await claudeRunner.runVerbose(prompt, { timeout })
        : await claudeRunner.run(prompt, { timeout });

      lastOutput = result.output;

      // Parse result
      const parsed = parseOutput(result.output);

      if (result.timedOut) {
        failureReason = 'Task timed out';
        if (!isRetryableFailure(parsed)) {
          break;
        }
        continue;
      }

      if (result.contextOverflow || parsed.contextOverflow) {
        failureReason = 'Context overflow - task too large';
        break; // Not retryable
      }

      if (parsed.result === 'complete') {
        success = true;
      } else if (parsed.result === 'failed') {
        failureReason = parsed.failureReason ?? 'Unknown failure';
        if (!isRetryableFailure(parsed)) {
          break;
        }
      } else {
        // Unknown result - might be retryable
        failureReason = 'No completion marker found';
      }
    }

    // Stop timer and clear status line
    const elapsedMs = timer.stop();
    statusLine.clear();
    const elapsedFormatted = formatElapsedTime(elapsedMs);

    // Save log if debug mode or failure
    if (debug || !success) {
      projectManager.saveLog(projectPath, task.id, lastOutput);
    }

    if (success) {
      // Save outcome with status marker
      // Note: Claude commits its own changes during task execution (when autoCommit is enabled)
      const summary = extractSummary(lastOutput);
      const outcomeContent = `## Status: SUCCESS

# Task ${task.id} - Completed

## Summary
${summary}

## Details
- Attempts: ${attempts}
- Elapsed time: ${elapsedFormatted}
- Completed at: ${new Date().toISOString()}
`;
      projectManager.saveOutcome(projectPath, task.id, outcomeContent);

      logger.success(`  Task ${task.id} completed (${elapsedFormatted})`);
      completedInSession.add(task.id);
    } else {
      // Stash any uncommitted changes on complete failure
      let stashName: string | undefined;
      if (hasUncommittedChanges()) {
        const projectNum = extractProjectNumber(projectPath) ?? '000';
        stashName = `raf-${projectNum}-task-${task.id}-failed`;
        const stashed = stashChanges(stashName);
        if (stashed) {
          logger.info(`  Changes stashed as: ${stashName}`);
        }
      }

      logger.error(`  Task ${task.id} failed: ${failureReason} (${elapsedFormatted})`);

      // Save failure outcome with status marker
      const outcomeContent = `## Status: FAILED

# Task ${task.id} - Failed

## Failure Reason
${failureReason}

## Details
- Attempts: ${attempts}
- Elapsed time: ${elapsedFormatted}
- Failed at: ${new Date().toISOString()}
${stashName ? `- Stash: ${stashName}` : ''}
`;
      projectManager.saveOutcome(projectPath, task.id, outcomeContent);
    }

    logger.newline();

    // Clear context before next task
    logger.clearContext();

    // Re-derive state to get updated task statuses
    state = deriveProjectState(projectPath);

    // Get next task to execute
    task = getNextTask(state);
  }

  // Ensure context is cleared for summary
  logger.clearContext();

  // Generate summary
  projectManager.saveSummary(projectPath, state);

  // Get final stats
  const stats = getDerivedStats(state);

  if (isProjectComplete(state)) {
    logger.success('All tasks completed!');
  } else if (hasProjectFailed(state)) {
    logger.warn('Some tasks failed.');
  }

  // Show summary
  logger.newline();
  logger.info('Summary:');
  logger.info(`  Completed: ${stats.completed}`);
  logger.info(`  Failed: ${stats.failed}`);
  logger.info(`  Pending: ${stats.pending}`);

  return {
    projectName,
    projectPath,
    success: stats.failed === 0 && stats.pending === 0,
    tasksCompleted: stats.completed,
    totalTasks: stats.total,
  };
}

function printMultiProjectSummary(results: ProjectExecutionResult[]): void {
  logger.newline();
  logger.info('=== Multi-Project Summary ===');
  logger.newline();

  for (const result of results) {
    const statusSymbol = result.success ? '✓' : '✗';
    const statusText = result.success
      ? `Completed (${result.tasksCompleted}/${result.totalTasks} tasks)`
      : result.error
        ? `Error: ${result.error}`
        : `Failed (${result.tasksCompleted}/${result.totalTasks} tasks)`;

    logger.info(`${statusSymbol} ${result.projectName}: ${statusText}`);
  }

  const completed = results.filter((r) => r.success).length;
  const failed = results.length - completed;

  logger.newline();
  logger.info(`Total: ${completed} completed, ${failed} failed`);
}
