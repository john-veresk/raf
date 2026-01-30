import { Command } from 'commander';
import { ProjectManager } from '../core/project-manager.js';
import { ClaudeRunner } from '../core/claude-runner.js';
import { shutdownHandler } from '../core/shutdown-handler.js';
import { stashChanges, hasUncommittedChanges } from '../core/git.js';
import { getExecutionPrompt } from '../prompts/execution.js';
import { parseOutput, extractSummary, isRetryableFailure } from '../parsers/output-parser.js';
import { validatePlansExist } from '../utils/validation.js';
import { getRafDir, getProjectDir, extractProjectNumber, extractProjectName, extractTaskNameFromPlanFile } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import { getClaudeModel, getConfig } from '../utils/config.js';
import { createTaskTimer, formatElapsedTime } from '../utils/timer.js';
import { createStatusLine } from '../utils/status-line.js';
import {
  deriveProjectState,
  getNextPendingTask,
  getDerivedStats,
  isProjectComplete,
  hasProjectFailed,
} from '../core/state-derivation.js';
import type { DoCommandOptions } from '../types/config.js';

export function createDoCommand(): Command {
  const command = new Command('do')
    .description('Execute planned tasks for a project')
    .argument('<projectName>', 'Name of the project to execute')
    .option('-t, --timeout <minutes>', 'Timeout per task in minutes', '60')
    .option('-v, --verbose', 'Show full Claude output')
    .option('-d, --debug', 'Save all logs and show debug output')
    .action(async (projectName: string, options: DoCommandOptions) => {
      await runDoCommand(projectName, options);
    });

  return command;
}

async function runDoCommand(projectName: string, options: DoCommandOptions): Promise<void> {
  const rafDir = getRafDir();
  const projectPath = getProjectDir(rafDir, projectName);

  if (!projectPath) {
    logger.error(`Project not found: ${projectName}`);
    logger.info(`Run 'raf status' to see available projects.`);
    process.exit(1);
  }

  if (!validatePlansExist(projectPath)) {
    logger.error('No plan files found. Run planning first.');
    process.exit(1);
  }

  // Get configuration
  const config = getConfig();
  const timeout = Number(options.timeout) || config.timeout;
  const verbose = options.verbose ?? false;
  const debug = options.debug ?? false;
  const maxRetries = config.maxRetries;
  const autoCommit = config.autoCommit;

  // Configure logger
  logger.configure({ verbose, debug });

  // Derive state from folder structure
  let state = deriveProjectState(projectPath);

  // Check if project is already complete
  if (isProjectComplete(state)) {
    logger.info('Project already completed.');
    process.exit(0);
  }

  // Set up shutdown handler
  const claudeRunner = new ClaudeRunner();
  const projectManager = new ProjectManager();
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);

  const derivedProjectName = extractProjectName(projectPath) ?? projectName;

  logger.info(`Executing project: ${derivedProjectName}`);
  logger.info(`Tasks: ${state.tasks.length}, Timeout: ${timeout} minutes`);

  // Log Claude model name
  const model = getClaudeModel();
  if (model) {
    logger.info(`Using model: ${model}`);
  }

  logger.newline();

  // Execute tasks
  let task = getNextPendingTask(state);
  const totalTasks = state.tasks.length;

  while (task) {
    const taskIndex = state.tasks.findIndex((t) => t.id === task!.id);
    const taskNumber = taskIndex + 1;
    const taskName = extractTaskNameFromPlanFile(task.planFile);
    const taskContext = `[Task ${taskNumber}/${totalTasks}: ${taskName ?? task.id}]`;
    logger.setContext(taskContext);
    logger.info(`Executing task ${task.id}...`);

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
      projectName: derivedProjectName,
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

    // Get next pending task
    task = getNextPendingTask(state);
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

  if (stats.failed > 0) {
    process.exit(1);
  }
}
