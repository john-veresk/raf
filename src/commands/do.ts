import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { ProjectManager } from '../core/project-manager.js';
import { createRunner } from '../core/runner-factory.js';
import { shutdownHandler } from '../core/shutdown-handler.js';
import { waitForRateLimit } from '../core/rate-limit-waiter.js';
import { stashChanges, hasUncommittedChanges, isGitRepo, getHeadCommitHash, didHeadCommitTouchFiles } from '../core/git.js';
import { getExecutionPrompt } from '../prompts/execution.js';
import { parseOutput, isRetryableFailure } from '../parsers/output-parser.js';
import { validatePlansExist } from '../utils/validation.js';
import { getRafDir, extractProjectNumber, extractProjectName, extractTaskNameFromPlanFile, resolveProjectIdentifierWithDetails, getOutcomeFilePath } from '../utils/paths.js';
import { pickPendingProjects, getPendingProjects, getPendingWorktreeProjects } from '../ui/project-picker.js';
import type { PendingProjectInfo } from '../ui/project-picker.js';
import { logger } from '../utils/logger.js';
import { formatModelDisplay, getConfig, getResolvedConfig, getModel, getSyncMainBranch, getPushOnComplete, getCodexExecutionMode, resolveEffortToModel, applyModelCeiling, parseModelSpec } from '../utils/config.js';
import type { PlanFrontmatter } from '../utils/frontmatter.js';
import { getVersion } from '../utils/version.js';
import { createTaskTimer, formatElapsedTime } from '../utils/timer.js';
import { createStatusLine } from '../utils/status-line.js';
import {
  formatProjectHeader,
  formatModelMetadata,
  formatSummary,
  formatTaskProgress,
  formatTaskTokenSummary,
  formatTokenTotalSummary,
} from '../utils/terminal-symbols.js';
import { TokenTracker } from '../utils/token-tracker.js';
import { KeyboardController } from '../utils/keyboard-controller.js';
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
import { readProjectContext, DEFAULT_PROJECT_CONTEXT } from '../core/project-context.js';
import { analyzeFailure, detectProgrammaticFailure } from '../core/failure-analyzer.js';
import {
  getRepoRoot,
  getRepoBasename,
  getCurrentBranch,
  mergeWorktreeBranch,
  removeWorktree,
  deleteLocalBranch,
  resolveWorktreeProjectByIdentifier,
  pushMainBranch,
  pushCurrentBranch,
  pullMainBranch,
  detectMainBranch,
  rebaseOntoMain,
} from '../core/worktree.js';
import { createPullRequest, prPreflight } from '../core/pull-request.js';
import type { DoCommandOptions, ModelEntry, CodexExecutionMode } from '../types/config.js';

/**
 * Post-execution action chosen by the user before task execution begins.
 * - 'merge': merge the worktree branch into the original branch
 * - 'pr': push the branch and create a GitHub PR
 * - 'leave': do nothing, keep the branch as-is
 */
export type PostExecutionAction = 'merge' | 'pr' | 'leave';

/**
 * Result of resolving a task's model from frontmatter.
 */
interface TaskModelResolution {
  /** The resolved model entry (after ceiling is applied). */
  entry: ModelEntry;
  /** Whether a warning should be logged about missing frontmatter. */
  missingFrontmatter: boolean;
  /** Frontmatter parsing warnings to log. */
  warnings: string[];
}

/**
 * Resolve the execution model for a task from its frontmatter metadata.
 *
 * Resolution order:
 * 1. Explicit `model` in frontmatter (subject to ceiling)
 * 2. `effort` in frontmatter resolved via effortMapping (subject to ceiling)
 * 3. Fallback to models.execute (the ceiling, with a warning)
 *
 * @param frontmatter - Parsed frontmatter from the plan file
 * @param frontmatterWarnings - Warnings from frontmatter parsing
 * @param ceilingEntry - The ceiling model entry (usually models.execute from config)
 * @param isRetry - Whether this is a retry attempt (escalates to ceiling)
 */
function resolveTaskModel(
  frontmatter: PlanFrontmatter | undefined,
  frontmatterWarnings: string[] | undefined,
  ceilingEntry: ModelEntry,
  isRetry: boolean,
): TaskModelResolution {
  const warnings = frontmatterWarnings ? [...frontmatterWarnings] : [];

  // Retry escalation: always use the ceiling model on retry
  if (isRetry) {
    return { entry: ceilingEntry, missingFrontmatter: false, warnings };
  }

  // No frontmatter - fallback to ceiling with warning
  if (!frontmatter) {
    return {
      entry: ceilingEntry,
      missingFrontmatter: true,
      warnings,
    };
  }

  // Explicit model in frontmatter - apply ceiling
  if (frontmatter.model) {
    const parsed = parseModelSpec(frontmatter.model);
    const fmEntry: ModelEntry = {
      model: parsed.model,
      harness: parsed.harness,
    };
    const result = applyModelCeiling(fmEntry, ceilingEntry);
    return { entry: result, missingFrontmatter: false, warnings };
  }

  // Effort-based resolution - apply ceiling
  if (frontmatter.effort) {
    const mappedEntry = resolveEffortToModel(frontmatter.effort);
    const result = applyModelCeiling(mappedEntry, ceilingEntry);
    return { entry: result, missingFrontmatter: false, warnings };
  }

  // Frontmatter present but no effort or model - fallback to ceiling with warning
  return {
    entry: ceilingEntry,
    missingFrontmatter: true,
    warnings,
  };
}

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

export interface AutoCommitValidationInput {
  autoCommit: boolean;
  cwd?: string;
  headBefore: string | null;
  outcomeFilePath: string;
  requiredFiles: string[];
}

export interface AutoCommitValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateAutoCommitSuccess(input: AutoCommitValidationInput): AutoCommitValidationResult {
  if (!input.autoCommit) {
    return { valid: true };
  }

  if (!fs.existsSync(input.outcomeFilePath)) {
    return { valid: false, reason: `Auto-commit validation failed: outcome file was not written (${input.outcomeFilePath})` };
  }

  const outcomeStatus = parseOutcomeStatus(fs.readFileSync(input.outcomeFilePath, 'utf-8'));
  if (outcomeStatus !== 'completed') {
    return { valid: false, reason: `Auto-commit validation failed: outcome file does not contain a COMPLETE marker (${input.outcomeFilePath})` };
  }

  // Outside a git repo RAF historically allows execution to proceed; environment
  // validation reports that auto-commit is unavailable before this point.
  if (!isGitRepo(input.cwd)) {
    return { valid: true };
  }

  const headAfter = getHeadCommitHash(input.cwd);
  const headChanged = Boolean(headAfter && headAfter !== input.headBefore);
  const workingTreeClean = !hasUncommittedChanges(input.cwd);
  const latestCommitIncludesRequired = headChanged && didHeadCommitTouchFiles(input.requiredFiles, input.cwd);

  if ((headChanged && workingTreeClean) || latestCommitIncludesRequired) {
    return { valid: true };
  }

  if (!headChanged) {
    return { valid: false, reason: 'Auto-commit validation failed: HEAD did not change after the task reported COMPLETE' };
  }

  return {
    valid: false,
    reason: 'Auto-commit validation failed: uncommitted changes remain and the latest commit does not include the required task files',
  };
}

/**
 * Result of executing a single project.
 */
interface ProjectExecutionResult {
  projectName: string;
  projectPath: string;
  success: boolean;
  cancelled?: boolean;
  tasksCompleted: number;
  totalTasks: number;
  error?: string;
  retryHistory?: TaskRetryHistory[];
}

export type PostRateLimitWaitDecision =
  | { action: 'retry' }
  | { action: 'graceful-stop' }
  | { action: 'abort'; failureReason: string };

export function resolvePostRateLimitWaitDecision(waitCompleted: boolean, cancelArmed: boolean): PostRateLimitWaitDecision {
  if (!waitCompleted) {
    return { action: 'abort', failureReason: 'Rate limit wait aborted' };
  }
  if (cancelArmed) {
    return { action: 'graceful-stop' };
  }
  return { action: 'retry' };
}

export function formatResolvedTaskModel(entry: ModelEntry): string {
  return formatModelMetadata(formatModelDisplay(entry.model, entry.harness), {
    effort: entry.reasoningEffort,
    fast: entry.fast,
  });
}

export function createDoCommand(): Command {
  const command = new Command('do')
    .description('Execute planned tasks for a project')
    .alias('act')
    .argument('[projects...]', 'Project identifiers: ID, name, or folder. Multiple allowed.')
    .option('-t, --timeout <minutes>', 'Timeout per task in minutes', '60')
    .option('-v, --verbose', 'Show full LLM output')
    .option('-d, --debug', 'Save all logs and show debug output')
    .option('-f, --force', 'Re-run all tasks regardless of status')
    .action(async (projects: string[], options: DoCommandOptions) => {
      await runDoCommand(projects, options);
    });

  return command;
}

/**
 * Resolve a single project identifier to its path and metadata.
 * Handles worktree detection, ambiguous names, etc.
 */
function resolveProjectFromIdentifier(
  rafDir: string,
  projectIdentifier: string,
  knownWorktreeRoot?: string,
): { resolvedProject: { identifier: string; path: string; name: string }; worktreeRoot?: string } | null {
  if (knownWorktreeRoot) {
    // Worktree was set by the picker — resolve project inside the worktree
    const repoRoot = getRepoRoot()!;
    const rafRelativePath = path.relative(repoRoot, rafDir);
    const wtRafDir = path.join(knownWorktreeRoot, rafRelativePath);
    const result = resolveProjectIdentifierWithDetails(wtRafDir, projectIdentifier);
    if (!result.path) {
      logger.error(`Project not found in worktree: ${projectIdentifier}`);
      return null;
    }
    const projectName = extractProjectName(result.path) ?? projectIdentifier;
    return {
      resolvedProject: { identifier: projectIdentifier, path: result.path, name: projectName },
      worktreeRoot: knownWorktreeRoot,
    };
  }

  // Auto-detect: check worktrees first (worktree takes priority), then main repo
  const repoRoot = getRepoRoot();
  const repoBasename = repoRoot ? getRepoBasename() : null;

  // Try worktree resolution first (preferred when project exists in both)
  if (repoBasename) {
    const wtResolution = resolveWorktreeProjectByIdentifier(repoBasename, projectIdentifier);
    if (wtResolution) {
      const rafRelativePath = path.relative(repoRoot!, rafDir);
      const wtRafDir = path.join(wtResolution.worktreeRoot, rafRelativePath);
      const wtProjectPath = path.join(wtRafDir, wtResolution.folder);

      if (fs.existsSync(wtProjectPath)) {
        const projectName = extractProjectName(wtResolution.folder) ?? projectIdentifier;
        return {
          resolvedProject: { identifier: projectIdentifier, path: wtProjectPath, name: projectName },
          worktreeRoot: wtResolution.worktreeRoot,
        };
      }
    }
  }

  // Fall back to main repo
  const result = resolveProjectIdentifierWithDetails(rafDir, projectIdentifier);

  if (!result.path) {
    if (result.error === 'ambiguous' && result.matches) {
      const matchList = result.matches
        .map((m) => `  - ${m.folder}`)
        .join('\n');
      logger.error(`${projectIdentifier}: Ambiguous project name. Multiple projects match:\n${matchList}\nPlease specify the project ID or full folder name.`);
    } else {
      logger.error(`${projectIdentifier}: Project not found`);
    }
    logger.info("Run 'raf status' to see available projects.");
    return null;
  }

  const projectName = extractProjectName(result.path) ?? projectIdentifier;
  return {
    resolvedProject: { identifier: projectIdentifier, path: result.path, name: projectName },
  };
}

/**
 * Entry describing a project to execute, with its resolved metadata.
 */
interface ProjectToRun {
  identifier: string;
  path: string;
  name: string;
  worktreeRoot?: string;
}

async function runDoCommand(projectIdentifiersArg: string[], options: DoCommandOptions): Promise<void> {
  const rafDir = getRafDir();
  const executeEntry = getModel('execute');

  // Build the list of projects to run
  const projectsToRun: ProjectToRun[] = [];

  if (projectIdentifiersArg.length === 0) {
    // No CLI args — show interactive picker
    let worktreeProjects: PendingProjectInfo[] = [];
    const repoRoot = getRepoRoot();
    if (repoRoot) {
      const repoBasename = getRepoBasename()!;
      const rafRelativePath = path.relative(repoRoot, rafDir);
      worktreeProjects = getPendingWorktreeProjects(repoBasename, rafRelativePath);
    }

    const pendingProjects = getPendingProjects(rafDir);

    if (pendingProjects.length === 0 && worktreeProjects.length === 0) {
      logger.info('No pending projects found.');
      logger.info("Run 'raf plan' to create a new project.");
      process.exit(0);
    }

    try {
      const selectedProjects = await pickPendingProjects(rafDir, worktreeProjects);

      if (selectedProjects.length === 0) {
        logger.info('No projects selected.');
        process.exit(0);
      }

      for (const selected of selectedProjects) {
        const resolved = resolveProjectFromIdentifier(
          rafDir,
          selected.folder,
          selected.source === 'worktree' ? selected.worktreeRoot : undefined,
        );
        if (!resolved) {
          process.exit(1);
        }
        projectsToRun.push({
          identifier: resolved.resolvedProject.identifier,
          path: resolved.resolvedProject.path,
          name: resolved.resolvedProject.name,
          worktreeRoot: resolved.worktreeRoot,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('User force closed')) {
        process.exit(0);
      }
      throw error;
    }
  } else {
    // CLI args provided — resolve each
    for (const identifier of projectIdentifiersArg) {
      const resolved = resolveProjectFromIdentifier(rafDir, identifier);
      if (!resolved) {
        process.exit(1);
      }
      projectsToRun.push({
        identifier: resolved.resolvedProject.identifier,
        path: resolved.resolvedProject.path,
        name: resolved.resolvedProject.name,
        worktreeRoot: resolved.worktreeRoot,
      });
    }
  }

  // Get configuration
  const config = getConfig();
  const timeout = Number(options.timeout) || config.timeout;
  const verbose = options.verbose ?? false;
  const debug = options.debug ?? false;
  const force = options.force ?? false;
  const maxRetries = config.maxRetries;
  const autoCommit = config.autoCommit;
  const codexExecutionMode = getCodexExecutionMode();

  // Configure logger
  logger.configure({ verbose, debug });

  const originalBranch = getCurrentBranch() ?? undefined;

  // Execute each project sequentially
  const results: ProjectExecutionResult[] = [];

  // Determine post-execution action for all worktree projects upfront
  let postAction: PostExecutionAction = 'leave';
  const worktreeProjects = projectsToRun.filter(p => p.worktreeRoot);
  if (worktreeProjects.length > 0) {
    const branchNames = worktreeProjects.map(p => path.basename(p.worktreeRoot!));
    try {
      postAction = await pickPostExecutionAction(branchNames);
    } catch (error) {
      if (error instanceof Error && error.message.includes('User force closed')) {
        process.exit(0);
      }
      throw error;
    }
  }

  for (const project of projectsToRun) {
    // Worktree setup per-project
    let mainBranchName: string | null = null;

    if (project.worktreeRoot) {
      // Sync main branch before worktree operations (if enabled)
      if (getSyncMainBranch()) {
        const syncResult = pullMainBranch();
        mainBranchName = syncResult.mainBranch;
        if (syncResult.success) {
          if (syncResult.hadChanges) {
            logger.info(`Synced ${syncResult.mainBranch} from remote`);
          }
        } else {
          logger.warn(`Could not sync main branch: ${syncResult.error}`);
        }
      }

      // Rebase worktree branch onto main before execution (if sync is enabled)
      if (getSyncMainBranch()) {
        const mainBranch = mainBranchName ?? detectMainBranch();
        if (mainBranch) {
          const rebaseResult = rebaseOntoMain(mainBranch, project.worktreeRoot);
          if (rebaseResult.success) {
            logger.info(`Rebased onto ${mainBranch}`);
          } else {
            logger.warn(`Could not rebase onto ${mainBranch}: ${rebaseResult.error}`);
            logger.warn('Continuing with current branch state.');
          }
        }
      }
    }

    // Execute project
    let result: ProjectExecutionResult;

    try {
      result = await executeSingleProject(
        project.path,
        project.name,
        {
          timeout,
          verbose,
          debug,
          force,
          maxRetries,
          autoCommit,
          codexExecutionMode,
          executeEntry,
          worktreeCwd: project.worktreeRoot,
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Project ${project.name} failed: ${errorMessage}`);
      result = {
        projectName: project.name,
        projectPath: project.path,
        success: false,
        tasksCompleted: 0,
        totalTasks: 0,
        error: errorMessage,
      };
    }

    results.push(result);

    // Execute post-execution action based on picker choice
    if (project.worktreeRoot) {
      const worktreeBranch = path.basename(project.worktreeRoot);

      if (result.success && !result.cancelled) {
        await executePostAction(postAction, project.worktreeRoot, worktreeBranch, originalBranch, project.path);
      } else {
        if (postAction !== 'leave') {
          logger.newline();
          logger.info(`Skipping post-execution action — project has failures. Branch "${worktreeBranch}" is available for inspection.`);
        }
      }
    }

    // Push to remote after successful execution (if enabled, non-worktree mode)
    if (!project.worktreeRoot && result.success && !result.cancelled && getPushOnComplete()) {
      const pushResult = pushCurrentBranch();
      if (pushResult.success) {
        if (pushResult.hadChanges) {
          logger.info(`Pushed ${pushResult.mainBranch} to remote`);
        }
      } else {
        logger.warn(`Could not push to remote: ${pushResult.error}`);
      }
    }
  }

  // Batch summary (only when multiple projects were executed)
  if (results.length > 1) {
    logger.newline();
    logger.info('Batch Summary:');

    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (succeeded.length > 0) {
      logger.info(`  Completed: ${succeeded.map((r) => r.projectName).join(', ')}`);
    }
    if (failed.length > 0) {
      logger.info(`  Failed: ${failed.map((r) => r.projectName).join(', ')}`);
    }

    logger.info(`  Total: ${succeeded.length}/${results.length} succeeded`);
  }

  // Exit with appropriate code
  const anyFailed = results.some((r) => !r.success);
  if (anyFailed) {
    process.exit(1);
  }
}

/**
 * Show an interactive picker for the post-execution action in worktree mode.
 * Presented once before task execution so the user declares intent upfront.
 * The chosen action applies to all worktree projects.
 */
export async function pickPostExecutionAction(branchNames: string[]): Promise<PostExecutionAction> {
  const plural = branchNames.length > 1;
  const branchList = branchNames.map(b => `"${b}"`).join(', ');

  const chosen = await select<PostExecutionAction>({
    message: plural
      ? `After tasks complete, what should happen with branches ${branchList}?`
      : `After tasks complete, what should happen with branch ${branchList}?`,
    choices: [
      { name: 'Merge into current branch', value: 'merge' as const },
      { name: 'Create a GitHub PR', value: 'pr' as const },
      { name: plural ? 'Leave branches as-is' : 'Leave branch as-is', value: 'leave' as const },
    ],
  });

  return chosen;
}

/**
 * Execute the chosen post-execution action.
 * Called after all tasks succeed.
 */
async function executePostAction(
  action: PostExecutionAction,
  worktreeRoot: string,
  worktreeBranch: string,
  originalBranch: string | undefined,
  projectPath: string,
): Promise<void> {
  switch (action) {
    case 'merge': {
      if (!originalBranch) {
        logger.warn('Could not determine original branch for merge.');
        // Still clean up worktree
        removeWorktree(worktreeRoot);
        return;
      }

      logger.newline();
      logger.info(`Merging branch "${worktreeBranch}" into "${originalBranch}"...`);

      // Merge FIRST (needs branch to exist; worktree dir not needed for merge)
      const projectName = extractProjectName(path.basename(projectPath)) ?? path.basename(projectPath);
      const mergeResult = await mergeWorktreeBranch(worktreeBranch, originalBranch, projectName, projectPath);

      // Clean up worktree AFTER merge (regardless of outcome)
      const cleanupResult = removeWorktree(worktreeRoot);
      if (cleanupResult.success) {
        logger.info(`Cleaned up worktree: ${worktreeRoot}`);
      } else {
        logger.warn(`Could not clean up worktree: ${cleanupResult.error}`);
      }

      if (mergeResult.success) {
        const mergeType = mergeResult.fastForward ? 'fast-forward' : 'merge commit';
        logger.success(`Merged "${worktreeBranch}" into "${originalBranch}" (${mergeType})`);

        const branchDeleteResult = deleteLocalBranch(worktreeBranch);
        if (branchDeleteResult.success) {
          logger.info(`Deleted merged branch: ${worktreeBranch}`);
        } else {
          logger.warn(`Could not delete merged branch: ${branchDeleteResult.error}`);
        }

        if (getPushOnComplete()) {
          const pushResult = pushCurrentBranch();
          if (pushResult.success) {
            if (pushResult.hadChanges) {
              logger.info(`Pushed ${originalBranch} to remote`);
            }
          } else {
            logger.warn(`Could not push to remote: ${pushResult.error}`);
          }
        }
      } else {
        logger.warn(`Could not auto-merge: ${mergeResult.error}`);
        logger.warn(`You can merge manually: git merge ${worktreeBranch}`);
      }
      break;
    }

    case 'pr': {
      const preflight = prPreflight(worktreeBranch, worktreeRoot);
      if (!preflight.ready) {
        logger.warn(`PR preflight failed for "${worktreeBranch}": ${preflight.error}`);
        logger.warn('Falling back to "Leave branch" — you can create a PR manually later.');
        removeWorktree(worktreeRoot);
        logger.info(`Branch "${worktreeBranch}" preserved — worktree directory cleaned up.`);
        break;
      }

      logger.newline();

      // Push main branch to remote before PR creation (if enabled)
      if (getSyncMainBranch()) {
        const syncResult = pushMainBranch();
        if (syncResult.success) {
          if (syncResult.hadChanges) {
            logger.info(`Pushed ${syncResult.mainBranch} to remote`);
          }
        } else {
          logger.warn(`Could not push main branch: ${syncResult.error}`);
        }
      }

      logger.info(`Creating PR for branch "${worktreeBranch}"...`);

      const prResult = await createPullRequest(worktreeBranch, projectPath, { cwd: worktreeRoot });

      if (prResult.success) {
        logger.success(`PR created: ${prResult.prUrl}`);
      } else {
        logger.warn(`Could not create PR: ${prResult.error}`);
        logger.warn(`Branch "${worktreeBranch}" has been pushed. You can create a PR manually.`);
      }

      // Clean up worktree directory (branch is preserved)
      const prCleanupResult = removeWorktree(worktreeRoot);
      if (prCleanupResult.success) {
        logger.info(`Cleaned up worktree: ${worktreeRoot}`);
      } else {
        logger.warn(`Could not clean up worktree: ${prCleanupResult.error}`);
      }
      break;
    }

    case 'leave': {
      // Clean up worktree directory (branch is preserved)
      const cleanupResult = removeWorktree(worktreeRoot);
      if (cleanupResult.success) {
        logger.info(`Cleaned up worktree: ${worktreeRoot}`);
      } else {
        logger.warn(`Could not clean up worktree: ${cleanupResult.error}`);
      }
      break;
    }
  }
}

interface SingleProjectOptions {
  timeout: number;
  verbose: boolean;
  debug: boolean;
  force: boolean;
  maxRetries: number;
  autoCommit: boolean;
  codexExecutionMode: CodexExecutionMode;
  /** The resolved execute model entry (acts as ceiling for per-task resolution). */
  executeEntry: ModelEntry;
  /** Worktree root directory. When set, the runner uses cwd in the worktree. */
  worktreeCwd?: string;
}

async function executeSingleProject(
  projectPath: string,
  projectName: string,
  options: SingleProjectOptions
): Promise<ProjectExecutionResult> {
  const { timeout, verbose, debug, force, maxRetries, autoCommit, codexExecutionMode, executeEntry, worktreeCwd } = options;

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

  // Set up shutdown handler - we'll register runners dynamically per-task
  const projectManager = new ProjectManager();
  shutdownHandler.init();

  // The ceiling model entry for all tasks (can be overridden per-task, subject to this ceiling)
  const ceilingEntry = executeEntry;

  // Initialize token tracker for usage reporting
  const tokenTracker = new TokenTracker();

  // Set up runtime verbose toggle (Tab key to toggle during execution)
  const keyboard = new KeyboardController(verbose);
  shutdownHandler.onShutdown(() => keyboard.stop());

  // Start project timer
  const projectStartTime = Date.now();

  // Resolve and display version + ceiling model info (before any tasks run)
  const ceilingModelDisplay = formatModelDisplay(ceilingEntry.model, ceilingEntry.harness);
  logger.dim(`RAF v${getVersion()} | Ceiling: ${ceilingModelDisplay} (${ceilingEntry.harness})`);

  if (verbose) {
    logger.info(`Executing project: ${projectName}`);
    logger.info(`Tasks: ${state.tasks.length}, Task timeout: ${timeout} minutes`);
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
      '## Decision Updates',
      '',
      '- None. RAF blocked this task before execution started.',
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

  // Start verbose toggle listener (Tab key)
  keyboard.start();

  let task = getNextTaskToProcess(state);

  while (task) {
    const taskIndex = state.tasks.findIndex((t) => t.id === task!.id);
    const taskNumber = taskIndex + 1;
    const taskName = extractTaskNameFromPlanFile(task.planFile);
    const displayName = taskName ?? task.id;
    const taskId = task.id;  // Capture for closure
    const taskLabel = displayName !== task.id ? `${task.id} (${displayName})` : task.id;

    // Handle blocked tasks separately - skip LLM execution
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
        logger.warn(`Task ${taskLabel} blocked by failed dependency: ${blockingDep}`);
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
        logger.info(`Retrying task ${taskLabel} (previously failed)...`);
      } else if (task.status === 'completed' && force) {
        logger.info(`Re-running task ${taskLabel} (force mode)...`);
      } else {
        logger.info(`Executing task ${taskLabel}...`);
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
    const planPath = projectManager.getPlanPath(projectPath, task.planFile);

    // Execute with retries
    let success = false;
    let attempts = 0;
    let lastOutput = '';
    let failureReason = '';
    let gracefulStopBeforeRetry = false;
    // Collect usage data from all attempts (for accurate token tracking across retries)
    const attemptUsageData: import('../types/config.js').UsageData[] = [];
    // Track failure history for each attempt (attempt number -> reason)
    const failureHistory: Array<{ attempt: number; reason: string }> = [];
    // Track rate limit waits (capped to avoid infinite loops)
    let rateLimitWaits = 0;
    const maxRateLimitWaits = 3;
    // Track current model for display in status line (updated in retry loop)
    let currentModel: string | undefined;
    let currentEffort: string | undefined;
    let currentFast = false;

    // Set up timer for elapsed time tracking
    const statusLine = createStatusLine();
    logger.setActiveStatusLine(statusLine);
    const timer = createTaskTimer(verbose ? undefined : (elapsed) => {
      // When verbose is toggled ON at runtime, clear the status line and skip updates
      if (keyboard.isVerbose) {
        statusLine.clear();
        return;
      }
      // Show running status with task name and timer (updates in place)
      const modelShortName = currentModel ? formatModelDisplay(currentModel) : undefined;
      statusLine.update(formatTaskProgress(taskNumber, totalTasks, 'running', displayName, elapsed, taskId, modelShortName, {
        effort: currentEffort,
        fast: currentFast,
      }));
    });
    timer.start();

    // Log frontmatter warnings once before the retry loop
    if (task.frontmatterWarnings && task.frontmatterWarnings.length > 0) {
      for (const warning of task.frontmatterWarnings) {
        logger.warn(`  Frontmatter warning: ${warning}`);
      }
    }

    while (!success && attempts < maxRetries) {
      attempts++;
      const isRetry = attempts > 1;

      // Resolve the model for this attempt (escalates to ceiling on retry)
      const modelResolution = resolveTaskModel(
        task.frontmatter,
        undefined, // warnings already logged above
        ceilingEntry,
        isRetry,
      );

      // Update current model for timer callback display
      currentModel = modelResolution.entry.model;
      currentEffort = modelResolution.entry.reasoningEffort;
      currentFast = modelResolution.entry.fast ?? false;

      // Log missing frontmatter warning on first attempt only
      if (!isRetry && modelResolution.missingFrontmatter) {
        logger.warn(`  No effort frontmatter found — using ceiling model`);
      }

      // Create a runner for this attempt's model
      const taskRunner = createRunner({
        model: modelResolution.entry.model,
        harness: modelResolution.entry.harness,
        reasoningEffort: modelResolution.entry.reasoningEffort,
        fast: modelResolution.entry.fast,
        codexExecutionMode,
      });
      shutdownHandler.registerClaudeRunner(taskRunner);

      if (verbose && isRetry) {
        const retryModel = formatResolvedTaskModel(modelResolution.entry);
        logger.info(`  Retry ${attempts}/${maxRetries} for task ${taskLabel} (model: ${retryModel})...`);
      } else if (verbose && !isRetry) {
        const taskModel = formatResolvedTaskModel(modelResolution.entry);
        logger.info(`  Model: ${taskModel}`);
      }

      // Build execution prompt (inside loop to include retry context on retries)
      // Check if previous outcome file exists for retry context
      const previousOutcomeFileForRetry = isRetry && fs.existsSync(outcomeFilePath)
        ? outcomeFilePath
        : undefined;
      const headBeforeAttempt = autoCommit ? getHeadCommitHash(worktreeCwd) : null;

      const prompt = getExecutionPrompt({
        projectPath,
        planPath,
        taskId: task.id,
        taskNumber,
        totalTasks,
        autoCommit,
        projectNumber,
        outcomeFilePath,
        contextContent: readProjectContext(projectPath) ?? DEFAULT_PROJECT_CONTEXT,
        attemptNumber: attempts,
        previousOutcomeFile: previousOutcomeFileForRetry,
        dependencyIds,
        dependencyOutcomes,
      });

      // Run task (use worktree root as cwd if in worktree mode)
      const runnerOptions = {
        timeout,
        outcomeFilePath,
        cwd: worktreeCwd,
        verboseCheck: () => keyboard.isVerbose,
      };
      const result = verbose
        ? await taskRunner.runVerbose(prompt, runnerOptions)
        : await taskRunner.run(prompt, runnerOptions);

      lastOutput = result.output;
      if (result.usageData) {
        attemptUsageData.push(result.usageData);
      }

      // Check for rate limit — wait and retry without consuming an attempt
      const rateLimitInfo = result.rateLimitInfo;
      const isUnknownRateLimit = rateLimitInfo && rateLimitInfo.limitType === 'unknown';
      if (isUnknownRateLimit) {
        logger.debug('Ignoring unknown rate limit type — treating as normal retry');
      }
      if ((rateLimitInfo && !isUnknownRateLimit) || (!result.timedOut && detectProgrammaticFailure(result.output, '') === 'rate_limit' && !result.rateLimitInfo)) {
        if (rateLimitWaits >= maxRateLimitWaits) {
          failureReason = `Rate limit hit ${rateLimitWaits} times — giving up`;
          failureHistory.push({ attempt: attempts, reason: failureReason });
          break;
        }

        const fallbackWaitMs = getResolvedConfig().rateLimitWaitDefault * 60 * 1000;
        const limitLabel = rateLimitInfo?.limitType ?? 'unknown';

        statusLine.clear();
        const waitResult = await waitForRateLimit({
          resetsAt: rateLimitInfo?.resetsAt,
          fallbackWaitMs: rateLimitInfo ? undefined : fallbackWaitMs,
          limitType: limitLabel,
          shouldAbort: () => shutdownHandler.isShuttingDown,
          isPaused: () => keyboard.isPaused,
          waitForResume: () => keyboard.waitForResume(),
        });

        const postWaitDecision = resolvePostRateLimitWaitDecision(waitResult.completed, keyboard.isCancelled);
        if (postWaitDecision.action === 'retry') {
          logger.info(`  Rate limit reset — resuming`);
          rateLimitWaits++;
          failureHistory.push({
            attempt: attempts,
            reason: `Rate limit (${limitLabel}) — waited ${Math.round(waitResult.waitedMs / 1000)}s`,
          });
          // Don't count this as an attempt — undo the increment
          attempts--;
          continue;
        }

        if (postWaitDecision.action === 'graceful-stop') {
          logger.info('  Pending stop is armed — skipping retry for this task');
          gracefulStopBeforeRetry = true;
          break;
        }

        failureReason = postWaitDecision.failureReason;
        break;
      }

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
        const commitValidation = validateAutoCommitSuccess({
          autoCommit,
          cwd: worktreeCwd,
          headBefore: headBeforeAttempt,
          outcomeFilePath,
          requiredFiles: [outcomeFilePath, planPath],
        });
        if (!commitValidation.valid) {
          failureReason = commitValidation.reason ?? 'Auto-commit validation failed';
          failureHistory.push({ attempt: attempts, reason: failureReason });
          continue;
        }
        success = true;
      } else if (parsed.result === 'failed') {
        failureReason = parsed.failureReason ?? 'Unknown failure';
        failureHistory.push({ attempt: attempts, reason: failureReason });
        if (!isRetryableFailure(parsed)) {
          break;
        }
        continue;
      } else {
        // Unknown result - check outcome file as fallback
        if (fs.existsSync(outcomeFilePath)) {
          const outcomeContent = fs.readFileSync(outcomeFilePath, 'utf-8');
          const outcomeStatus = parseOutcomeStatus(outcomeContent);
          if (outcomeStatus === 'completed') {
            const commitValidation = validateAutoCommitSuccess({
              autoCommit,
              cwd: worktreeCwd,
              headBefore: headBeforeAttempt,
              outcomeFilePath,
              requiredFiles: [outcomeFilePath, planPath],
            });
            if (!commitValidation.valid) {
              failureReason = commitValidation.reason ?? 'Auto-commit validation failed';
              failureHistory.push({ attempt: attempts, reason: failureReason });
              continue;
            }
            success = true;
          } else if (outcomeStatus === 'failed') {
            failureReason = 'Task failed (from outcome file)';
            failureHistory.push({ attempt: attempts, reason: failureReason });
            continue;
          } else {
            failureReason = 'No completion marker found in output or outcome file';
            failureHistory.push({ attempt: attempts, reason: failureReason });
            continue;
          }
        } else {
          failureReason = 'No completion marker found';
          failureHistory.push({ attempt: attempts, reason: failureReason });
          continue;
        }
      }
    }

    // Stop timer and clear status line
    const elapsedMs = timer.stop();
    statusLine.clear();
    logger.setActiveStatusLine(null);
    const elapsedFormatted = formatElapsedTime(elapsedMs);

    // Save log if debug mode or failure
    if (debug || (!success && !gracefulStopBeforeRetry)) {
      projectManager.saveLog(projectPath, task.id, lastOutput);
    }

    // Track retry history if there were failures (for console output)
    if (failureHistory.length > 0 && !gracefulStopBeforeRetry) {
      projectRetryHistory.push({
        taskId: task.id,
        taskName: displayName,
        failureHistory,
        finalAttempt: attempts,
        success,
      });
    }

    if (success) {
      // Check if the LLM wrote an outcome file with valid marker
      // If so, keep it as-is; otherwise create fallback
      // NOTE: Successful outcomes do NOT get ## Details section appended
      let outcomeContent: string;
      const llmWroteOutcome = fs.existsSync(outcomeFilePath);

      if (llmWroteOutcome) {
        const existingContent = fs.readFileSync(outcomeFilePath, 'utf-8');
        const status = parseOutcomeStatus(existingContent);

        if (status === 'completed') {
          // LLM wrote a valid outcome - keep it as-is (no metadata added)
          outcomeContent = existingContent;
        } else {
          // Outcome file exists but no valid COMPLETE marker - create fallback
          outcomeContent = `## Status: SUCCESS

# Task ${task.id} - Completed

## Summary

Task completed. No detailed report provided.

## Key Changes

- No detailed report was provided.

## Decision Updates

- None recorded.

## Notes

- RAF generated this fallback outcome because the task did not produce a valid completion report.

<promise>COMPLETE</promise>
`;
        }
      } else {
        // No outcome file - create fallback
        outcomeContent = `## Status: SUCCESS

# Task ${task.id} - Completed

## Summary

Task completed. No detailed report provided.

## Key Changes

- No detailed report was provided.

## Decision Updates

- None recorded.

## Notes

- RAF generated this fallback outcome because the task did not produce an outcome file.

<promise>COMPLETE</promise>
`;
      }

      projectManager.saveOutcome(projectPath, task.id, outcomeContent);

      if (verbose) {
        logger.success(`  Task ${taskLabel} completed (${elapsedFormatted})`);
      } else {
        // Minimal mode: show completed task line
        const modelShortName = currentModel ? formatModelDisplay(currentModel) : undefined;
        logger.info(formatTaskProgress(taskNumber, totalTasks, 'completed', displayName, elapsedMs, task.id, modelShortName, {
          effort: currentEffort,
          fast: currentFast,
        }));
      }

      // Track and display token usage for this task
      if (attemptUsageData.length > 0) {
        const entry = tokenTracker.addTask(task.id, attemptUsageData);
        logger.dim(formatTaskTokenSummary(entry));
      }

      completedInSession.add(task.id);
    } else if (gracefulStopBeforeRetry) {
      if (verbose) {
        logger.info(`  Stop requested before retrying task ${taskLabel}; leaving task pending`);
      }
    } else {
      // Stash any uncommitted changes on complete failure
      let stashName: string | undefined;
      if (hasUncommittedChanges(worktreeCwd)) {
        const projectNum = extractProjectNumber(projectPath) ?? '000';
        stashName = `raf-${projectNum}-task-${task.id}-failed`;
        const stashed = stashChanges(stashName, worktreeCwd);
        if (verbose && stashed) {
          logger.info(`  Changes for task ${taskLabel} stashed as: ${stashName}`);
        }
      }

      if (verbose) {
        logger.error(`  Task ${taskLabel} failed: ${failureReason} (${elapsedFormatted})`);
        const analysisEntry = getModel('failureAnalysis');
        const analysisModel = formatModelDisplay(analysisEntry.model);
        logger.info(`  Analyzing failure with ${analysisModel}...`);
      } else {
        // Minimal mode: show failed task line
        const modelShortName = currentModel ? formatModelDisplay(currentModel) : undefined;
        logger.info(formatTaskProgress(taskNumber, totalTasks, 'failed', displayName, elapsedMs, task.id, modelShortName, {
          effort: currentEffort,
          fast: currentFast,
        }));
      }

      // Track token usage even for failed tasks (partial data still useful for totals)
      if (attemptUsageData.length > 0) {
        const entry = tokenTracker.addTask(task.id, attemptUsageData);
        logger.dim(formatTaskTokenSummary(entry));
      }

      // Analyze failure and generate structured report
      const analysisReport = await analyzeFailure(lastOutput, failureReason, task.id);

      // Save failure outcome with status marker, analysis, and details
      // NOTE: Failed outcomes keep ## Details section for debugging
      const outcomeContent = `## Status: FAILED

# Task ${task.id} - Failed

## Summary

Task execution failed: ${failureReason}

## Key Changes

- No completed changes were recorded in the final failed outcome.

## Decision Updates

- None recorded before failure.

## Failure Analysis

${analysisReport}

## Notes
- Attempts: ${attempts}
- Elapsed time: ${elapsedFormatted}
- Failed at: ${new Date().toISOString()}
${stashName ? `- Stash: ${stashName}` : ''}

<promise>FAILED</promise>
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

    // Check for user-requested cancellation
    if (keyboard.isCancelled) {
      const cancelStats = getDerivedStats(state);
      logger.info(`Cancelled — ${cancelStats.completed}/${cancelStats.total} tasks completed, ${cancelStats.pending + cancelStats.blocked} remaining`);
      break;
    }

    // Check for user-requested pause
    if (keyboard.isPaused) {
      logger.info('Paused. Press P to resume...');
      await keyboard.waitForResume();
      logger.info('Resumed.');
    }

    // Get next task to process
    task = getNextTaskToProcess(state);
  }

  // Stop verbose toggle listener before summary output
  keyboard.stop();

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

  // Show token usage summary if any tasks reported usage data
  const trackerEntries = tokenTracker.getEntries();
  if (trackerEntries.length > 0) {
    logger.newline();
    const totals = tokenTracker.getTotals();
    logger.dim(formatTokenTotalSummary(totals.usage, totals.cost));
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

  const cancelled = keyboard.isCancelled;

  return {
    projectName,
    projectPath,
    success: cancelled ? true : stats.failed === 0 && stats.pending === 0,
    cancelled,
    tasksCompleted: stats.completed,
    totalTasks: stats.total,
    retryHistory: projectRetryHistory,
  };
}
