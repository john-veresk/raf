import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { ProjectManager } from '../core/project-manager.js';
import { ClaudeRunner } from '../core/claude-runner.js';
import { shutdownHandler } from '../core/shutdown-handler.js';
import { stashChanges, hasUncommittedChanges, isGitRepo, getHeadCommitHash } from '../core/git.js';
import { getExecutionPrompt } from '../prompts/execution.js';
import { parseOutput, isRetryableFailure } from '../parsers/output-parser.js';
import { validatePlansExist, resolveModelOption } from '../utils/validation.js';
import { getRafDir, extractProjectNumber, extractProjectName, extractTaskNameFromPlanFile, resolveProjectIdentifierWithDetails, getOutcomeFilePath, parseProjectPrefix } from '../utils/paths.js';
import { pickPendingProject, getPendingProjects, getPendingWorktreeProjects } from '../ui/project-picker.js';
import type { PendingProjectInfo } from '../ui/project-picker.js';
import { logger } from '../utils/logger.js';
import { getConfig, getEffort, getWorktreeDefault } from '../utils/config.js';
import { createTaskTimer, formatElapsedTime } from '../utils/timer.js';
import { createStatusLine } from '../utils/status-line.js';
import {
  formatProjectHeader,
  formatSummary,
  formatTaskProgress,
} from '../utils/terminal-symbols.js';
import {
  deriveProjectState,
  discoverProjects,
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
import {
  getRepoRoot,
  getRepoBasename,
  getCurrentBranch,
  computeWorktreePath,
  computeWorktreeBaseDir,
  validateWorktree,
  listWorktreeProjects,
  mergeWorktreeBranch,
  removeWorktree,
  resolveWorktreeProjectByIdentifier,
} from '../core/worktree.js';
import { createPullRequest, prPreflight } from '../core/pull-request.js';
import type { DoCommandOptions } from '../types/config.js';

/**
 * Post-execution action chosen by the user before task execution begins.
 * - 'merge': merge the worktree branch into the original branch
 * - 'pr': push the branch and create a GitHub PR
 * - 'leave': do nothing, keep the branch as-is
 */
export type PostExecutionAction = 'merge' | 'pr' | 'leave';

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
    .description('Execute planned tasks for a project')
    .alias('act')
    .argument('[project]', 'Project identifier: ID (00j3k1), name (my-project), or folder (00j3k1-my-project)')
    .option('-t, --timeout <minutes>', 'Timeout per task in minutes', '60')
    .option('-v, --verbose', 'Show full Claude output')
    .option('-d, --debug', 'Save all logs and show debug output')
    .option('-f, --force', 'Re-run all tasks regardless of status')
    .option('-m, --model <name>', 'Claude model to use (sonnet, haiku, opus)')
    .option('--sonnet', 'Use Sonnet model (shorthand for --model sonnet)')
    .option('-w, --worktree', 'Execute tasks in a git worktree')
    .action(async (project: string | undefined, options: DoCommandOptions) => {
      await runDoCommand(project, options);
    });

  return command;
}

async function runDoCommand(projectIdentifierArg: string | undefined, options: DoCommandOptions): Promise<void> {
  const rafDir = getRafDir();
  let projectIdentifier = projectIdentifierArg;
  let worktreeMode = options.worktree ?? getWorktreeDefault();

  // Validate and resolve model option
  let model: string;
  try {
    model = resolveModelOption(options.model as string | undefined, options.sonnet, 'execute');
  } catch (error) {
    logger.error((error as Error).message);
    process.exit(1);
  }

  // Variables for worktree context (set when --worktree is used)
  let worktreeRoot: string | undefined;
  let originalBranch: string | undefined;

  if (worktreeMode) {
    // Validate git repo
    const repoRoot = getRepoRoot();
    if (!repoRoot) {
      logger.error('--worktree requires a git repository');
      process.exit(1);
    }
    const repoBasename = getRepoBasename()!;
    const rafRelativePath = path.relative(repoRoot, rafDir);

    // Record original branch before any worktree operations
    originalBranch = getCurrentBranch() ?? undefined;

    if (!projectIdentifier) {
      // Auto-discovery flow
      const selected = await discoverAndPickWorktreeProject(repoBasename, rafDir, rafRelativePath);
      if (!selected) {
        process.exit(0);
      }
      worktreeRoot = selected.worktreeRoot;
      projectIdentifier = selected.projectFolder;
    }
  }

  // Handle no project identifier (non-worktree mode) - show interactive picker
  if (!projectIdentifier) {
    // Discover worktree projects for the current repo (if in a git repo)
    let worktreeProjects: PendingProjectInfo[] = [];
    const repoRoot = getRepoRoot();
    if (repoRoot) {
      const repoBasename = getRepoBasename()!;
      const rafRelativePath = path.relative(repoRoot, rafDir);
      worktreeProjects = getPendingWorktreeProjects(repoBasename, rafRelativePath);
    }

    // Check if there are any pending projects (local or worktree)
    const pendingProjects = getPendingProjects(rafDir);

    if (pendingProjects.length === 0 && worktreeProjects.length === 0) {
      logger.info('No pending projects found.');
      logger.info("Run 'raf plan' to create a new project.");
      process.exit(0);
    }

    try {
      const selectedProject = await pickPendingProject(rafDir, worktreeProjects);

      if (!selectedProject) {
        logger.info('No pending projects found.');
        process.exit(0);
      }

      // Use the selected project
      projectIdentifier = selectedProject.folder;

      // If a worktree project was selected, auto-switch to worktree mode
      if (selectedProject.source === 'worktree' && selectedProject.worktreeRoot) {
        worktreeMode = true;
        worktreeRoot = selectedProject.worktreeRoot;
        originalBranch = getCurrentBranch() ?? undefined;
      }
    } catch (error) {
      // Handle Ctrl+C (user cancellation)
      if (error instanceof Error && error.message.includes('User force closed')) {
        process.exit(0);
      }
      throw error;
    }
  }

  // Resolve project identifier
  let resolvedProject: { identifier: string; path: string; name: string } | undefined;

  if (worktreeMode) {
    // Worktree mode: resolve project inside the worktree
    const repoRoot = getRepoRoot()!;
    const repoBasename = getRepoBasename()!;
    const rafRelativePath = path.relative(repoRoot, rafDir);

    // If worktreeRoot was set by auto-discovery, use it directly
    if (worktreeRoot) {
      const wtRafDir = path.join(worktreeRoot, rafRelativePath);
      const result = resolveProjectIdentifierWithDetails(wtRafDir, projectIdentifier);
      if (!result.path) {
        logger.error(`Project not found in worktree: ${projectIdentifier}`);
        process.exit(1);
      }
      const projectName = extractProjectName(result.path) ?? projectIdentifier;
      resolvedProject = { identifier: projectIdentifier, path: result.path, name: projectName };
    } else {
      // Explicit identifier: resolve from main repo to get folder name, then validate worktree
      const mainResult = resolveProjectIdentifierWithDetails(rafDir, projectIdentifier);

      let projectFolderName: string;
      if (mainResult.path) {
        // Found in main repo - use its folder name
        projectFolderName = path.basename(mainResult.path);
      } else {
        // Not found in main repo - try to find it in worktrees directly
        // This handles projects that only exist in worktrees
        const worktreeBaseDir = computeWorktreeBaseDir(repoBasename);
        if (!fs.existsSync(worktreeBaseDir)) {
          logger.error(`No worktree found for project "${projectIdentifier}". Did you plan with --worktree?`);
          process.exit(1);
        }

        // Search worktrees for the project
        const wtProjects = listWorktreeProjects(repoBasename);
        let found = false;
        for (const wtProjectDir of wtProjects) {
          const wtPath = computeWorktreePath(repoBasename, wtProjectDir);
          const wtRafDir = path.join(wtPath, rafRelativePath);
          if (!fs.existsSync(wtRafDir)) continue;

          const resolution = resolveProjectIdentifierWithDetails(wtRafDir, projectIdentifier);
          if (resolution.path) {
            projectFolderName = path.basename(resolution.path);
            worktreeRoot = wtPath;
            found = true;
            break;
          }
        }

        if (!found) {
          logger.error(`No worktree found for project "${projectIdentifier}". Did you plan with --worktree?`);
          process.exit(1);
        }
      }

      // Compute worktree path if not already set
      if (!worktreeRoot) {
        worktreeRoot = computeWorktreePath(repoBasename, projectFolderName!);
      }

      // Validate the worktree
      const wtProjectRelPath = path.join(rafRelativePath, projectFolderName!);
      const validation = validateWorktree(worktreeRoot, wtProjectRelPath);

      if (!validation.exists || !validation.isValidWorktree) {
        logger.error(`No worktree found for project "${projectIdentifier}". Did you plan with --worktree?`);
        logger.error(`Expected worktree at: ${worktreeRoot}`);
        process.exit(1);
      }

      if (!validation.hasProjectFolder || !validation.hasPlans) {
        logger.error(`Worktree exists but project content is missing.`);
        logger.error(`Expected project folder at: ${validation.projectPath ?? path.join(worktreeRoot, wtProjectRelPath)}`);
        process.exit(1);
      }

      const projectPath = validation.projectPath!;
      const projectName = extractProjectName(projectPath) ?? projectIdentifier;
      resolvedProject = { identifier: projectIdentifier, path: projectPath, name: projectName };
    }
  } else {
    // Standard mode: check worktrees first (worktree takes priority), then main repo
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
          // Auto-switch to worktree mode
          worktreeMode = true;
          worktreeRoot = wtResolution.worktreeRoot;
          originalBranch = getCurrentBranch() ?? undefined;

          const projectName = extractProjectName(wtResolution.folder) ?? projectIdentifier;
          resolvedProject = { identifier: projectIdentifier, path: wtProjectPath, name: projectName };
        }
      }
    }

    // Fall back to main repo if worktree didn't match
    if (!resolvedProject) {
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
        process.exit(1);
      }

      const projectName = extractProjectName(result.path) ?? projectIdentifier;
      resolvedProject = { identifier: projectIdentifier, path: result.path, name: projectName };
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

  // Configure logger
  logger.configure({ verbose, debug });

  // Show post-execution picker before task execution (worktree mode only)
  let postAction: PostExecutionAction = 'leave';
  if (worktreeMode && worktreeRoot) {
    try {
      postAction = await pickPostExecutionAction(worktreeRoot);
    } catch (error) {
      // Handle Ctrl+C (user cancellation)
      if (error instanceof Error && error.message.includes('User force closed')) {
        process.exit(0);
      }
      throw error;
    }
  }

  // Execute project
  let result: ProjectExecutionResult;

  try {
    result = await executeSingleProject(
      resolvedProject.path,
      resolvedProject.name,
      {
        timeout,
        verbose,
        debug,
        force,
        maxRetries,
        autoCommit,
        showModel: true,
        model,
        worktreeCwd: worktreeRoot,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Project ${resolvedProject.name} failed: ${errorMessage}`);
    process.exit(1);
  }

  // Execute post-execution action based on picker choice
  if (worktreeMode && worktreeRoot) {
    const worktreeBranch = path.basename(worktreeRoot);

    if (result.success) {
      await executePostAction(postAction, worktreeRoot, worktreeBranch, originalBranch, resolvedProject.path);
    } else {
      if (postAction !== 'leave') {
        logger.newline();
        logger.info(`Skipping post-execution action — project has failures. Branch "${worktreeBranch}" is available for inspection.`);
      }
    }
  }

  // Exit with appropriate code
  if (!result.success) {
    process.exit(1);
  }
}

/**
 * Show an interactive picker for the post-execution action in worktree mode.
 * Presented before task execution so the user declares intent upfront.
 *
 * If "Create PR" is chosen, runs preflight checks immediately. If preflight fails,
 * warns the user and falls back to re-prompting.
 */
export async function pickPostExecutionAction(worktreeRoot: string): Promise<PostExecutionAction> {
  const worktreeBranch = path.basename(worktreeRoot);

  const chosen = await select<PostExecutionAction>({
    message: `After tasks complete, what should happen with branch "${worktreeBranch}"?`,
    choices: [
      { name: 'Merge into current branch', value: 'merge' as const },
      { name: 'Create a GitHub PR', value: 'pr' as const },
      { name: 'Leave branch as-is', value: 'leave' as const },
    ],
  });

  // Early preflight check for PR option
  if (chosen === 'pr') {
    const preflight = prPreflight(worktreeBranch, worktreeRoot);
    if (!preflight.ready) {
      logger.warn(`PR preflight failed: ${preflight.error}`);
      logger.warn('Falling back to "Leave branch" — you can create a PR manually later.');
      return 'leave';
    }
  }

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
      // Clean up worktree before merge (merge uses branch, not directory)
      const cleanupResult = removeWorktree(worktreeRoot);
      if (cleanupResult.success) {
        logger.info(`Cleaned up worktree: ${worktreeRoot}`);
      } else {
        logger.warn(`Could not clean up worktree: ${cleanupResult.error}`);
      }

      if (!originalBranch) {
        logger.warn('Could not determine original branch for merge.');
        return;
      }

      logger.newline();
      logger.info(`Merging branch "${worktreeBranch}" into "${originalBranch}"...`);

      const mergeResult = mergeWorktreeBranch(worktreeBranch, originalBranch);

      if (mergeResult.success) {
        const mergeType = mergeResult.fastForward ? 'fast-forward' : 'merge commit';
        logger.success(`Merged "${worktreeBranch}" into "${originalBranch}" (${mergeType})`);
      } else {
        logger.warn(`Could not auto-merge: ${mergeResult.error}`);
        logger.warn(`You can merge manually: git merge ${worktreeBranch}`);
      }
      break;
    }

    case 'pr': {
      logger.newline();
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

/**
 * Auto-discovery flow for `raf do --worktree` without a project identifier.
 * Lists worktree projects, finds latest completed main-tree project, filters,
 * and shows an interactive picker.
 *
 * @returns Selected project info or null if cancelled/no projects
 */
async function discoverAndPickWorktreeProject(
  repoBasename: string,
  rafDir: string,
  rafRelativePath: string,
): Promise<{ worktreeRoot: string; projectFolder: string } | null> {
  // List all worktree projects for this repo
  const wtProjects = listWorktreeProjects(repoBasename);

  if (wtProjects.length === 0) {
    logger.error('No worktree projects found. Did you plan with --worktree?');
    process.exit(1);
  }

  // Find the highest-numbered completed project in the MAIN tree
  const mainProjects = discoverProjects(rafDir);
  let highestCompletedNumber = 0;

  for (const project of mainProjects) {
    const state = deriveProjectState(project.path);
    if (isProjectComplete(state) && state.tasks.length > 0) {
      if (project.number > highestCompletedNumber) {
        highestCompletedNumber = project.number;
      }
    }
  }

  // Filter threshold: highest completed - 3 (or 0 if none completed)
  const threshold = highestCompletedNumber > 3 ? highestCompletedNumber - 3 : 0;

  // Filter worktree projects by number threshold and completion status
  const uncompletedProjects: Array<{
    folder: string;
    worktreeRoot: string;
    projectPath: string;
    completedTasks: number;
    totalTasks: number;
    projectNumber: number;
  }> = [];

  for (const wtProjectDir of wtProjects) {
    // Extract project number from the worktree directory name
    const numPrefix = extractProjectNumber(wtProjectDir);
    if (!numPrefix) continue;
    const projectNumber = parseProjectPrefix(numPrefix);
    if (projectNumber === null) continue;

    // Apply threshold filter
    if (projectNumber < threshold) continue;

    // Check if this worktree has a valid project
    const wtPath = computeWorktreePath(repoBasename, wtProjectDir);
    const wtProjectPath = path.join(wtPath, rafRelativePath, wtProjectDir);

    if (!fs.existsSync(wtProjectPath)) continue;

    // Derive project state from worktree
    const state = deriveProjectState(wtProjectPath);
    if (state.tasks.length === 0) continue;

    // Keep only uncompleted projects
    if (isProjectComplete(state)) continue;

    const stats = getDerivedStats(state);
    uncompletedProjects.push({
      folder: wtProjectDir,
      worktreeRoot: wtPath,
      projectPath: wtProjectPath,
      completedTasks: stats.completed,
      totalTasks: stats.total,
      projectNumber,
    });
  }

  if (uncompletedProjects.length === 0) {
    logger.info('All worktree projects are completed.');
    return null;
  }

  // Sort by project number
  uncompletedProjects.sort((a, b) => a.projectNumber - b.projectNumber);

  // Show interactive picker (even if only one project)
  const choices = uncompletedProjects.map((p) => {
    const name = extractProjectName(p.folder) ?? p.folder;
    const numPrefix = extractProjectNumber(p.folder) ?? '';
    return {
      name: `${numPrefix} ${name} (${p.completedTasks}/${p.totalTasks} tasks)`,
      value: p,
    };
  });

  try {
    const selected = await select({
      message: 'Select a worktree project to execute:',
      choices,
    });

    return {
      worktreeRoot: selected.worktreeRoot,
      projectFolder: selected.folder,
    };
  } catch (error) {
    // Handle Ctrl+C (user cancellation)
    if (error instanceof Error && error.message.includes('User force closed')) {
      return null;
    }
    throw error;
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
  /** Worktree root directory. When set, Claude runs with cwd in the worktree. */
  worktreeCwd?: string;
}

async function executeSingleProject(
  projectPath: string,
  projectName: string,
  options: SingleProjectOptions
): Promise<ProjectExecutionResult> {
  const { timeout, verbose, debug, force, maxRetries, autoCommit, showModel, model, worktreeCwd } = options;

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
    const taskLabel = displayName !== task.id ? `${task.id} (${displayName})` : task.id;

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
        logger.info(`  Retry ${attempts}/${maxRetries} for task ${taskLabel}...`);
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

      // Capture HEAD hash before execution for commit verification
      const preExecutionHead = isGitRepo(worktreeCwd) ? getHeadCommitHash(worktreeCwd) : null;
      const commitContext = preExecutionHead ? {
        preExecutionHead,
        expectedPrefix: `RAF[${projectNumber}:${task.id}]`,
        outcomeFilePath,
      } : undefined;

      // Run Claude (use worktree root as cwd if in worktree mode)
      const executeEffort = getEffort('execute');
      const result = verbose
        ? await claudeRunner.runVerbose(prompt, { timeout, outcomeFilePath, commitContext, cwd: worktreeCwd, effortLevel: executeEffort })
        : await claudeRunner.run(prompt, { timeout, outcomeFilePath, commitContext, cwd: worktreeCwd, effortLevel: executeEffort });

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
        logger.success(`  Task ${taskLabel} completed (${elapsedFormatted})`);
      } else {
        // Minimal mode: show completed task line
        logger.info(formatTaskProgress(taskNumber, totalTasks, 'completed', displayName, elapsedMs, task.id));
      }
      completedInSession.add(task.id);
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

