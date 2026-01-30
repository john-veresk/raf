import { Command } from 'commander';
import { ProjectManager } from '../core/project-manager.js';
import { StateManager } from '../core/state-manager.js';
import { ClaudeRunner } from '../core/claude-runner.js';
import { shutdownHandler } from '../core/shutdown-handler.js';
import { commitTaskChanges, getChangedFiles, stashChanges, hasUncommittedChanges } from '../core/git.js';
import { getExecutionPrompt } from '../prompts/execution.js';
import { parseOutput, extractSummary, isRetryableFailure } from '../parsers/output-parser.js';
import { validatePlansExist } from '../utils/validation.js';
import { getRafDir, getProjectDir, extractProjectNumber, extractProjectName } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import { createTaskTimer, formatElapsedTime } from '../utils/timer.js';
import { createStatusLine } from '../utils/status-line.js';
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

  // Load state
  let stateManager: StateManager;
  try {
    stateManager = new StateManager(projectPath);
  } catch (error) {
    logger.error(`Failed to load project state: ${error}`);
    process.exit(1);
  }

  const state = stateManager.getState();
  const config = stateManager.getConfig();
  const timeout = Number(options.timeout) || config.timeout;
  const verbose = options.verbose ?? false;
  const debug = options.debug ?? false;

  // Configure logger
  logger.configure({ verbose, debug });

  // Check project status
  if (state.status === 'completed') {
    logger.info('Project already completed.');
    process.exit(0);
  }

  // Set up shutdown handler
  const claudeRunner = new ClaudeRunner();
  const projectManager = new ProjectManager();
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);
  shutdownHandler.registerStateManager(stateManager);

  // Update status
  stateManager.setStatus('executing');

  logger.info(`Executing project: ${state.projectName}`);
  logger.info(`Tasks: ${state.tasks.length}, Timeout: ${timeout} minutes`);
  logger.newline();

  // Execute tasks
  let task = stateManager.getNextPendingTask();
  const totalTasks = state.tasks.length;

  while (task) {
    const taskNumber = stateManager.getCurrentTaskIndex() + 1;
    logger.info(`[${taskNumber}/${totalTasks}] Executing task ${task.id}...`);

    // Capture git baseline BEFORE task execution (for smart commit filtering)
    const baselineFiles = getChangedFiles();
    stateManager.setTaskBaseline(task.id, baselineFiles);
    logger.debug(`  Captured baseline: ${baselineFiles.length} pre-existing changed files`);

    // Mark as in progress
    stateManager.updateTaskStatus(task.id, 'in_progress');

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
      autoCommit: config.autoCommit,
      projectName: extractProjectName(projectPath) ?? undefined,
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

    while (!success && attempts < config.maxRetries) {
      attempts++;
      stateManager.incrementAttempts(task.id);

      if (attempts > 1) {
        logger.info(`  Retry ${attempts}/${config.maxRetries}...`);
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
      // Commit changes if enabled (using smart filtering)
      let commitHash: string | undefined;
      if (config.autoCommit) {
        const taskBaseline = stateManager.getTaskBaseline(task.id);
        const projectName = extractProjectName(projectPath);
        const hash = commitTaskChanges(`Task ${task.id} complete`, taskBaseline, projectName ?? undefined);
        if (hash) {
          commitHash = hash;
          logger.debug(`  Committed: ${hash}`);
        }
      }

      // Save outcome
      const summary = extractSummary(lastOutput);
      const outcomeContent = `# Task ${task.id} - Completed

## Summary
${summary}

## Details
- Attempts: ${attempts}
- Elapsed time: ${elapsedFormatted}
- Completed at: ${new Date().toISOString()}
${commitHash ? `- Commit: ${commitHash}` : ''}
`;
      projectManager.saveOutcome(projectPath, task.id, outcomeContent);

      // Update state
      stateManager.updateTaskStatus(task.id, 'completed', { commitHash });
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

      // Update state with failure
      stateManager.updateTaskStatus(task.id, 'failed', { failureReason });
      logger.error(`  Task ${task.id} failed: ${failureReason} (${elapsedFormatted})`);

      // Save failure outcome
      const outcomeContent = `# Task ${task.id} - Failed

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

    // Get next task
    task = stateManager.getNextPendingTask();
  }

  // Generate summary
  projectManager.saveSummary(projectPath, stateManager);

  // Update final status
  const stats = stateManager.getStats();
  if (stateManager.isComplete()) {
    stateManager.setStatus('completed');
    logger.success('All tasks completed!');
  } else if (stateManager.hasFailed()) {
    stateManager.setStatus('failed');
    logger.warn('Some tasks failed.');
  }

  // Show summary
  logger.newline();
  logger.info('Summary:');
  logger.info(`  Completed: ${stats.completed}`);
  logger.info(`  Failed: ${stats.failed}`);
  logger.info(`  Skipped: ${stats.skipped}`);
  logger.info(`  Pending: ${stats.pending}`);

  if (stats.failed > 0) {
    process.exit(1);
  }
}
