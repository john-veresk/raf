import * as fs from 'node:fs';
import { Command } from 'commander';
import { ProjectManager } from '../core/project-manager.js';
import { ClaudeRunner } from '../core/claude-runner.js';
import { shutdownHandler } from '../core/shutdown-handler.js';
import { stashChanges, hasUncommittedChanges } from '../core/git.js';
import { getExecutionPrompt } from '../prompts/execution.js';
import { parseOutput, isRetryableFailure } from '../parsers/output-parser.js';
import { validatePlansExist, resolveModelOption } from '../utils/validation.js';
import { getRafDir, extractProjectNumber, extractProjectName, extractTaskNameFromPlanFile, resolveProjectIdentifierWithDetails, getOutcomeFilePath } from '../utils/paths.js';
import { pickPendingProject, getPendingProjects } from '../ui/project-picker.js';
import { logger } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';
import { createTaskTimer, formatElapsedTime } from '../utils/timer.js';
import { createStatusLine } from '../utils/status-line.js';
import {
  SYMBOLS,
  formatProjectHeader,
  formatSummary,
  formatTaskProgress,
} from '../utils/terminal-symbols.js';
import {
  deriveProjectState,
  getNextExecutableTask,
  getDerivedStats,
  getDerivedStatsForTasks,
  isProjectComplete,
  hasProjectFailed,
  parseOutcomeStatus,
  type DerivedTask,
  type DerivedProjectState,
} from '../core/state-derivation.js';
import { analyzeFailure } from '../core/failure-analyzer.js';
import type { DoCommandOptions } from '../types/config.js';

/**
 * Format failure history for console output.
 * Shows attempts that failed before eventual success or final failure.
 * Returns empty string if no failures occurred.
 */
export function formatRetryHistoryForConsole(
  taskId: string,
  taskName: string,
  failureHistory: Array<{ attempt: number; reason: string }>,
  finalAttempt: number,
  success: boolean
): string {
  if (failureHistory.length === 0) {
    return '';
  }

  const lines: string[] = [];
  const displayName = taskName !== taskId ? `${taskId} (${taskName})` : taskId;
  lines.push(`  Task ${displayName}:`);

  for (const { attempt, reason } of failureHistory) {
    lines.push(`    Attempt ${attempt}: Failed - ${reason}`);
  }

  if (success) {
    lines.push(`    Attempt ${finalAttempt}: Succeeded`);
  }

  return lines.join('\n');
}

/**
 * Retry history for a single task.
 */
interface TaskRetryHistory {
  taskId: string;
  taskName: string;
  failureHistory: Array<{ attempt: number; reason: string }>;
  finalAttempt: number;
  success: boolean;
}

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
  retryHistory?: TaskRetryHistory[];
}

export function createDoCommand(): Command {
  const command = new Command('do')
    .description('Execute planned tasks for one or more projects')
    .alias('act')
    .argument('[projects...]', 'Project identifier(s): number (3), name (my-project), or folder (001-my-project)')
    .option('-t, --timeout <minutes>', 'Timeout per task in minutes', '60')
    .option('-v, --verbose', 'Show full Claude output')
    .option('-d, --debug', 'Save all logs and show debug output')
    .option('-f, --force', 'Re-run all tasks regardless of status')
    .option('-m, --model <name>', 'Claude model to use (sonnet, haiku, opus)')
    .option('--sonnet', 'Use Sonnet model (shorthand for --model sonnet)')
    .action(async (projects: string[], options: DoCommandOptions) => {
      await runDoCommand(projects, options);
    });

  return command;
}

async function runDoCommand(projectIdentifiersArg: string[], options: DoCommandOptions): Promise<void> {
  const rafDir = getRafDir();
  let projectIdentifiers = projectIdentifiersArg;

  // Validate and resolve model option
  let model: string;
  try {
    model = resolveModelOption(options.model as string | undefined, options.sonnet);
  } catch (error) {
    logger.error((error as Error).message);
    process.exit(1);
  }

  // Handle empty project list - show interactive picker
  if (projectIdentifiers.length === 0) {
    // Check if there are any pending projects
    const pendingProjects = getPendingProjects(rafDir);

    if (pendingProjects.length === 0) {
      logger.info('No pending projects found.');
      logger.info("Run 'raf plan' to create a new project.");
      process.exit(0);
    }

    try {
      const selectedProject = await pickPendingProject(rafDir);

      if (!selectedProject) {
        // This shouldn't happen since we already checked pendingProjects.length
        logger.info('No pending projects found.');
        process.exit(0);
      }

      // Use the selected project
      projectIdentifiers = [selectedProject];
    } catch (error) {
      // Handle Ctrl+C (user cancellation)
      if (error instanceof Error && error.message.includes('User force closed')) {
        process.exit(0);
      }
      throw error;
    }
  }

  // Resolve all project identifiers and remove duplicates
  const resolvedProjects: Array<{ identifier: string; path: string; name: string }> = [];
  const seenPaths = new Set<string>();
  const errors: Array<{ identifier: string; error: string }> = [];

  for (const identifier of projectIdentifiers) {
    const result = resolveProjectIdentifierWithDetails(rafDir, identifier);

    if (!result.path) {
      if (result.error === 'ambiguous' && result.matches) {
        const matchList = result.matches
          .map((m) => `  - ${m.folder}`)
          .join('\n');
        errors.push({
          identifier,
          error: `Ambiguous project name. Multiple projects match:\n${matchList}\nPlease specify the project ID or full folder name.`,
        });
      } else {
        errors.push({ identifier, error: 'Project not found' });
      }
      continue;
    }

    const projectPath = result.path;

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

  // Log Claude model name once (verbose mode only for multi-project)
  if (verbose && model && resolvedProjects.length > 1) {
    logger.info(`Using model: ${model}`);
    logger.newline();
  }

  // Execute projects
  const results: ProjectExecutionResult[] = [];
  const isMultiProject = resolvedProjects.length > 1;

  for (const [i, project] of resolvedProjects.entries()) {
    if (isMultiProject && verbose) {
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
          model,
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
    printMultiProjectSummary(results, verbose);
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
  model: string;
}

async function executeSingleProject(
  projectPath: string,
  projectName: string,
  options: SingleProjectOptions
): Promise<ProjectExecutionResult> {
  const { timeout, verbose, debug, force, maxRetries, autoCommit, showModel, model } = options;

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
    if (verbose) {
      logger.info('All tasks completed. Use --force to re-run.');
    } else {
      const stats = getDerivedStats(state);
      logger.info(formatSummary(stats.completed, stats.failed, stats.pending, undefined, stats.blocked));
    }
    const stats = getDerivedStats(state);
    return {
      projectName,
      projectPath,
      success: true,
      tasksCompleted: stats.completed,
      totalTasks: stats.total,
    };
  }

  const sessionTaskIds = new Set<string>(
    force
      ? state.tasks.map((t) => t.id)
      : state.tasks.filter((t) => t.status !== 'completed').map((t) => t.id)
  );

  // Set up shutdown handler
  const claudeRunner = new ClaudeRunner({ model });
  const projectManager = new ProjectManager();
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);

  // Start project timer
  const projectStartTime = Date.now();

  if (verbose) {
    logger.info(`Executing project: ${projectName}`);
    logger.info(`Tasks: ${state.tasks.length}, Task timeout: ${timeout} minutes`);

    // Log Claude model name
    if (showModel && model) {
      logger.info(`Using model: ${model}`);
    }

    logger.newline();
  } else {
    // Minimal mode: show project header
    logger.info(formatProjectHeader(projectName, state.tasks.length));
  }

  // Execute tasks
  const totalTasks = state.tasks.length;

  // Track tasks completed in this session (for force mode)
  const completedInSession = new Set<string>();

  // Track retry history for console output at the end
  const projectRetryHistory: TaskRetryHistory[] = [];

  // Helper function to get the next task to process (including blocked tasks for outcome generation)
  function getNextTaskToProcess(currentState: DerivedProjectState): DerivedTask | null {
    if (force) {
      // Find first task that hasn't been executed in this session
      for (const t of currentState.tasks) {
        if (!completedInSession.has(t.id)) {
          return t;
        }
      }
      return null;
    }
    // Normal mode: first check for blocked tasks that need outcome files generated
    for (const t of currentState.tasks) {
      if (t.status === 'blocked') {
        const outcomeFilePath = getOutcomeFilePath(projectPath, t.id, extractTaskNameFromPlanFile(t.planFile) ?? t.id);
        // Only return blocked task if it doesn't have an outcome file yet
        if (!fs.existsSync(outcomeFilePath)) {
          return t;
        }
      }
    }
    // Then get next executable task (pending or failed)
    return getNextExecutableTask(currentState);
  }

  /**
   * Generate a blocked outcome file for a task.
   * @param task - The blocked task
   * @param taskState - Current state to find which dependencies caused the block
   */
  function generateBlockedOutcome(task: DerivedTask, taskState: DerivedProjectState): string {
    // Find which dependencies are failed or blocked
    const failedDeps: string[] = [];
    const blockedDeps: string[] = [];

    for (const depId of task.dependencies) {
      const depTask = taskState.tasks.find((t) => t.id === depId);
      if (depTask) {
        if (depTask.status === 'failed') {
          failedDeps.push(depId);
        } else if (depTask.status === 'blocked') {
          blockedDeps.push(depId);
        }
      }
    }

    const lines: string[] = [
      `# Outcome: Task ${task.id} Blocked`,
      '',
      '## Summary',
      '',
      'This task was automatically blocked because one or more of its dependencies failed or are blocked.',
      '',
      '## Blocking Dependencies',
      '',
    ];

    if (failedDeps.length > 0) {
      lines.push(`**Failed dependencies**: ${failedDeps.join(', ')}`);
    }
    if (blockedDeps.length > 0) {
      lines.push(`**Blocked dependencies**: ${blockedDeps.join(', ')}`);
    }

    lines.push('');
    lines.push(`**Task dependencies**: ${task.dependencies.join(', ')}`);
    lines.push('');
    lines.push('## Resolution');
    lines.push('');
    lines.push('To unblock this task:');
    lines.push('1. Fix the failed dependency task(s)');
    lines.push('2. Re-run the project with `raf do`');
    lines.push('');
    lines.push('<promise>BLOCKED</promise>');

    return lines.join('\n');
  }

  let task = getNextTaskToProcess(state);

  while (task) {
    const taskIndex = state.tasks.findIndex((t) => t.id === task!.id);
    const taskNumber = taskIndex + 1;
    const taskName = extractTaskNameFromPlanFile(task.planFile);
    const displayName = taskName ?? task.id;
    const taskId = task.id;  // Capture for closure

    // Handle blocked tasks separately - skip Claude execution
    if (task.status === 'blocked') {
      // Find which dependency caused the block for the message
      const failedOrBlockedDeps = task.dependencies.filter((depId) => {
        const depTask = state.tasks.find((t) => t.id === depId);
        return depTask && (depTask.status === 'failed' || depTask.status === 'blocked');
      });
      const blockingDep = failedOrBlockedDeps[0] ?? task.dependencies[0];

      if (verbose) {
        const taskContext = `[Task ${taskNumber}/${totalTasks}: ${displayName}]`;
        logger.setContext(taskContext);
        logger.warn(`Task ${task.id} blocked by failed dependency: ${blockingDep}`);
      } else {
        // Minimal mode: show blocked task line with distinct symbol
        logger.info(formatTaskProgress(taskNumber, totalTasks, 'blocked', displayName, undefined, task.id));
      }

      // Generate blocked outcome file
      const blockedOutcome = generateBlockedOutcome(task, state);
      projectManager.saveOutcome(projectPath, task.id, blockedOutcome);

      completedInSession.add(task.id);
      logger.clearContext();

      // Re-derive state to cascade blocking to dependent tasks
      state = deriveProjectState(projectPath);
      task = getNextTaskToProcess(state);
      continue;
    }

    if (verbose) {
      const taskContext = `[Task ${taskNumber}/${totalTasks}: ${displayName}]`;
      logger.setContext(taskContext);

      // Log task execution status
      if (task.status === 'failed') {
        logger.info(`Retrying task ${task.id} (previously failed)...`);
      } else if (task.status === 'completed' && force) {
        logger.info(`Re-running task ${task.id} (force mode)...`);
      } else {
        logger.info(`Executing task ${task.id}...`);
      }
    }

    // Get previous outcomes for context
    const previousOutcomes = projectManager.readOutcomes(projectPath);

    // Get dependency outcomes - filter to only include outcomes for tasks this task depends on
    const dependencyIds = task.dependencies;
    const dependencyOutcomes = dependencyIds.length > 0
      ? previousOutcomes.filter((o) => dependencyIds.includes(o.taskId))
      : [];

    // Extract project number for commit message
    const projectNumber = extractProjectNumber(projectPath) ?? '000';

    // Compute outcome file path for this task
    const outcomeFilePath = getOutcomeFilePath(projectPath, task.id, displayName);

    // Execute with retries
    let success = false;
    let attempts = 0;
    let lastOutput = '';
    let failureReason = '';
    // Track failure history for each attempt (attempt number -> reason)
    const failureHistory: Array<{ attempt: number; reason: string }> = [];

    // Set up timer for elapsed time tracking
    const statusLine = createStatusLine();
    const timer = createTaskTimer(verbose ? undefined : (elapsed) => {
      // Show running status with task name and timer (updates in place)
      statusLine.update(formatTaskProgress(taskNumber, totalTasks, 'running', displayName, elapsed, taskId));
    });
    timer.start();

    while (!success && attempts < maxRetries) {
      attempts++;

      if (verbose && attempts > 1) {
        logger.info(`  Retry ${attempts}/${maxRetries}...`);
      }

      // Build execution prompt (inside loop to include retry context on retries)
      // Check if previous outcome file exists for retry context
      const previousOutcomeFileForRetry = attempts > 1 && fs.existsSync(outcomeFilePath)
        ? outcomeFilePath
        : undefined;

      const prompt = getExecutionPrompt({
        projectPath,
        planPath: projectManager.getPlanPath(projectPath, task.planFile),
        taskId: task.id,
        taskNumber,
        totalTasks,
        previousOutcomes,
        autoCommit,
        projectNumber,
        outcomeFilePath,
        attemptNumber: attempts,
        previousOutcomeFile: previousOutcomeFileForRetry,
        dependencyIds,
        dependencyOutcomes,
      });

      // Run Claude
      const result = verbose
        ? await claudeRunner.runVerbose(prompt, { timeout })
        : await claudeRunner.run(prompt, { timeout });

      lastOutput = result.output;

      // Parse result
      const parsed = parseOutput(result.output);

      if (result.timedOut) {
        failureReason = 'Task timed out';
        failureHistory.push({ attempt: attempts, reason: failureReason });
        if (!isRetryableFailure(parsed)) {
          break;
        }
        continue;
      }

      if (result.contextOverflow || parsed.contextOverflow) {
        failureReason = 'Context overflow - task too large';
        failureHistory.push({ attempt: attempts, reason: failureReason });
        break; // Not retryable
      }

      if (parsed.result === 'complete') {
        success = true;
      } else if (parsed.result === 'failed') {
        failureReason = parsed.failureReason ?? 'Unknown failure';
        failureHistory.push({ attempt: attempts, reason: failureReason });
        if (!isRetryableFailure(parsed)) {
          break;
        }
      } else {
        // Unknown result - check outcome file as fallback
        if (fs.existsSync(outcomeFilePath)) {
          const outcomeContent = fs.readFileSync(outcomeFilePath, 'utf-8');
          const outcomeStatus = parseOutcomeStatus(outcomeContent);
          if (outcomeStatus === 'completed') {
            success = true;
          } else if (outcomeStatus === 'failed') {
            failureReason = 'Task failed (from outcome file)';
            failureHistory.push({ attempt: attempts, reason: failureReason });
          } else {
            failureReason = 'No completion marker found in output or outcome file';
            failureHistory.push({ attempt: attempts, reason: failureReason });
          }
        } else {
          failureReason = 'No completion marker found';
          failureHistory.push({ attempt: attempts, reason: failureReason });
        }
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

    // Track retry history if there were failures (for console output)
    if (failureHistory.length > 0) {
      projectRetryHistory.push({
        taskId: task.id,
        taskName: displayName,
        failureHistory,
        finalAttempt: attempts,
        success,
      });
    }

    if (success) {
      // Check if Claude wrote an outcome file with valid marker
      // If so, keep it as-is; otherwise create fallback
      // NOTE: Successful outcomes do NOT get ## Details section appended
      let outcomeContent: string;
      const claudeWroteOutcome = fs.existsSync(outcomeFilePath);

      if (claudeWroteOutcome) {
        const existingContent = fs.readFileSync(outcomeFilePath, 'utf-8');
        const status = parseOutcomeStatus(existingContent);

        if (status === 'completed') {
          // Claude wrote a valid outcome - keep it as-is (no metadata added)
          outcomeContent = existingContent;
        } else {
          // Outcome file exists but no valid COMPLETE marker - create fallback
          outcomeContent = `## Status: SUCCESS

# Task ${task.id} - Completed

Task completed. No detailed report provided.

<promise>COMPLETE</promise>
`;
        }
      } else {
        // No outcome file - create fallback
        outcomeContent = `## Status: SUCCESS

# Task ${task.id} - Completed

Task completed. No detailed report provided.

<promise>COMPLETE</promise>
`;
      }

      projectManager.saveOutcome(projectPath, task.id, outcomeContent);

      if (verbose) {
        logger.success(`  Task ${task.id} completed (${elapsedFormatted})`);
      } else {
        // Minimal mode: show completed task line
        logger.info(formatTaskProgress(taskNumber, totalTasks, 'completed', displayName, elapsedMs, task.id));
      }
      completedInSession.add(task.id);
    } else {
      // Stash any uncommitted changes on complete failure
      let stashName: string | undefined;
      if (hasUncommittedChanges()) {
        const projectNum = extractProjectNumber(projectPath) ?? '000';
        stashName = `raf-${projectNum}-task-${task.id}-failed`;
        const stashed = stashChanges(stashName);
        if (verbose && stashed) {
          logger.info(`  Changes stashed as: ${stashName}`);
        }
      }

      if (verbose) {
        logger.error(`  Task ${task.id} failed: ${failureReason} (${elapsedFormatted})`);
        logger.info('  Analyzing failure...');
      } else {
        // Minimal mode: show failed task line
        logger.info(formatTaskProgress(taskNumber, totalTasks, 'failed', displayName, elapsedMs, task.id));
      }

      // Analyze failure and generate structured report
      const analysisReport = await analyzeFailure(lastOutput, failureReason, task.id);

      // Save failure outcome with status marker, analysis, and details
      // NOTE: Failed outcomes keep ## Details section for debugging
      const outcomeContent = `## Status: FAILED

# Task ${task.id} - Failed

${analysisReport}

## Details
- Attempts: ${attempts}
- Elapsed time: ${elapsedFormatted}
- Failed at: ${new Date().toISOString()}
${stashName ? `- Stash: ${stashName}` : ''}
`;
      projectManager.saveOutcome(projectPath, task.id, outcomeContent);
    }

    if (verbose) {
      logger.newline();
    }

    // Clear context before next task
    logger.clearContext();

    // Re-derive state to get updated task statuses
    state = deriveProjectState(projectPath);

    // Get next task to process
    task = getNextTaskToProcess(state);
  }

  // Ensure context is cleared for summary
  logger.clearContext();

  // Get final stats
  const stats = getDerivedStats(state);
  const sessionStats = getDerivedStatsForTasks(state, sessionTaskIds);
  const projectElapsedMs = Date.now() - projectStartTime;

  if (isProjectComplete(state)) {
    if (verbose) {
      logger.success('All tasks completed!');

      // Verbose summary
      logger.newline();
      logger.info('Summary:');
      logger.info(`  Completed: ${stats.completed}`);
      logger.info(`  Failed: ${stats.failed}`);
      logger.info(`  Blocked: ${stats.blocked}`);
      logger.info(`  Pending: ${stats.pending}`);
    } else {
      // Minimal summary with elapsed time
      logger.info(formatSummary(
        sessionStats.completed,
        sessionStats.failed,
        sessionStats.pending,
        projectElapsedMs,
        sessionStats.blocked
      ));
    }
  } else if (hasProjectFailed(state)) {
    if (verbose) {
      logger.warn('Some tasks failed.');
      logger.newline();
      logger.info('Summary:');
      logger.info(`  Completed: ${stats.completed}`);
      logger.info(`  Failed: ${stats.failed}`);
      logger.info(`  Blocked: ${stats.blocked}`);
      logger.info(`  Pending: ${stats.pending}`);
    } else {
      // Minimal summary for failures
      logger.info(formatSummary(
        sessionStats.completed,
        sessionStats.failed,
        sessionStats.pending,
        projectElapsedMs,
        sessionStats.blocked
      ));
    }
  } else {
    // Project incomplete (pending tasks remain)
    if (verbose) {
      logger.newline();
      logger.info('Summary:');
      logger.info(`  Completed: ${stats.completed}`);
      logger.info(`  Failed: ${stats.failed}`);
      logger.info(`  Blocked: ${stats.blocked}`);
      logger.info(`  Pending: ${stats.pending}`);
    } else {
      logger.info(formatSummary(
        sessionStats.completed,
        sessionStats.failed,
        sessionStats.pending,
        projectElapsedMs,
        sessionStats.blocked
      ));
    }
  }

  // Show retry history for tasks that had failures (even if eventually successful)
  if (projectRetryHistory.length > 0) {
    logger.newline();
    logger.info('Retry history:');
    for (const history of projectRetryHistory) {
      const retryOutput = formatRetryHistoryForConsole(
        history.taskId,
        history.taskName,
        history.failureHistory,
        history.finalAttempt,
        history.success
      );
      if (retryOutput) {
        logger.info(retryOutput);
      }
    }
  }

  return {
    projectName,
    projectPath,
    success: stats.failed === 0 && stats.pending === 0,
    tasksCompleted: stats.completed,
    totalTasks: stats.total,
    retryHistory: projectRetryHistory,
  };
}

function printMultiProjectSummary(results: ProjectExecutionResult[], verbose: boolean): void {
  logger.newline();

  if (verbose) {
    logger.info('=== Multi-Project Summary ===');
    logger.newline();

    for (const result of results) {
      const statusSymbol = result.success ? SYMBOLS.completed : SYMBOLS.failed;
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
  } else {
    // Minimal multi-project summary: just show each project result
    for (const result of results) {
      const symbol = result.success ? SYMBOLS.completed : SYMBOLS.failed;
      logger.info(`${symbol} ${result.projectName}`);
    }
  }
}
