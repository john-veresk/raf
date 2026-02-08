import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';
import { getRafDir, resolveProjectIdentifier, extractProjectName, extractProjectNumber, resolveProjectIdentifierWithDetails } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import type { StatusCommandOptions } from '../types/config.js';
import {
  deriveProjectState,
  getDerivedStats,
  discoverProjects,
  type DerivedTaskStatus,
  type DerivedProjectState,
  type DerivedStats,
} from '../core/state-derivation.js';
import { SYMBOLS, formatProgressBar, type TaskStatus } from '../utils/terminal-symbols.js';
import {
  getRepoRoot,
  getRepoBasename,
  listWorktreeProjects,
  computeWorktreePath,
} from '../core/worktree.js';

/** Maximum number of projects to display in status list */
const MAX_DISPLAYED_PROJECTS = 10;

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

/** Resolved worktree context for status display */
interface WorktreeContext {
  repoBasename: string;
  rafRelativePath: string;
}

/** A worktree project with its derived state */
interface WorktreeProjectInfo {
  folder: string;
  projectPath: string;
  state: DerivedProjectState;
  stats: DerivedStats;
}

/**
 * Attempt to discover the worktree context (repo basename and RAF relative path).
 * Returns null if not in a git repo.
 */
function getWorktreeContext(rafDir: string): WorktreeContext | null {
  const repoRoot = getRepoRoot();
  if (!repoRoot) return null;

  const repoBasename = getRepoBasename();
  if (!repoBasename) return null;

  const rafRelativePath = path.relative(repoRoot, rafDir);
  return { repoBasename, rafRelativePath };
}

/**
 * Discover all worktree projects with their state.
 * Returns only projects that have valid project directories.
 */
function discoverWorktreeProjectStates(ctx: WorktreeContext): WorktreeProjectInfo[] {
  const wtProjects = listWorktreeProjects(ctx.repoBasename);
  const results: WorktreeProjectInfo[] = [];

  for (const folder of wtProjects) {
    const wtPath = computeWorktreePath(ctx.repoBasename, folder);
    const wtProjectPath = path.join(wtPath, ctx.rafRelativePath, folder);

    if (!fs.existsSync(wtProjectPath)) continue;

    try {
      const state = deriveProjectState(wtProjectPath);
      const stats = getDerivedStats(state);
      results.push({ folder, projectPath: wtProjectPath, state, stats });
    } catch {
      // Skip projects that fail to derive state
    }
  }

  return results;
}

/**
 * Check if two project states differ (different task counts or different statuses).
 */
function projectStatesDiffer(mainState: DerivedProjectState, wtState: DerivedProjectState): boolean {
  if (mainState.tasks.length !== wtState.tasks.length) return true;

  for (let i = 0; i < mainState.tasks.length; i++) {
    const mainTask = mainState.tasks[i];
    const wtTask = wtState.tasks[i];
    if (mainTask && wtTask && mainTask.status !== wtTask.status) return true;
  }

  return false;
}

async function runStatusCommand(
  identifier?: string,
  options?: StatusCommandOptions
): Promise<void> {
  const rafDir = getRafDir();
  const wtCtx = getWorktreeContext(rafDir);

  if (!identifier) {
    await listAllProjects(rafDir, options, wtCtx);
    return;
  }

  // Show specific project - resolve in main repo
  const mainProjectPath = resolveProjectIdentifier(rafDir, identifier);

  // Resolve in worktree
  let wtProject: WorktreeProjectInfo | null = null;
  if (wtCtx) {
    const wtProjects = discoverWorktreeProjectStates(wtCtx);
    for (const wp of wtProjects) {
      // Match by folder name against main project, or resolve identifier in worktree
      if (mainProjectPath && path.basename(mainProjectPath) === wp.folder) {
        wtProject = wp;
        break;
      }
      // Try matching by identifier if not found via main project
      if (!mainProjectPath) {
        const wtRafDir = path.join(computeWorktreePath(wtCtx.repoBasename, wp.folder), wtCtx.rafRelativePath);
        const resolved = resolveProjectIdentifierWithDetails(wtRafDir, identifier);
        if (resolved.path) {
          wtProject = wp;
          break;
        }
      }
    }
  }

  if (!mainProjectPath && !wtProject) {
    logger.error(`Project not found: ${identifier}`);
    process.exit(1);
  }

  // Derive main repo state (if exists)
  let mainState: DerivedProjectState | null = null;
  let mainStats: DerivedStats | null = null;
  let projectName: string;

  if (mainProjectPath) {
    mainState = deriveProjectState(mainProjectPath);
    mainStats = getDerivedStats(mainState);
    projectName = extractProjectName(mainProjectPath) ?? identifier;
  } else {
    projectName = extractProjectName(wtProject!.folder) ?? identifier;
  }

  // Determine if we need to show both views
  const showBoth = mainState && wtProject && projectStatesDiffer(mainState, wtProject.state);
  const worktreeOnly = !mainState && wtProject;

  if (options?.json) {
    const jsonData: Record<string, unknown> = {
      projectName,
      status: mainState?.status ?? wtProject!.state.status,
      state: mainState ?? wtProject!.state,
      stats: mainStats ?? wtProject!.stats,
    };
    if (wtProject) {
      jsonData.worktree = {
        folder: wtProject.folder,
        projectPath: wtProject.projectPath,
        status: wtProject.state.status,
        state: wtProject.state,
        stats: wtProject.stats,
      };
    }
    console.log(JSON.stringify(jsonData, null, 2));
    return;
  }

  if (showBoth) {
    // Show both main and worktree states
    logger.info(`${SYMBOLS.project} ${projectName}`);

    const mainTaskStatuses: TaskStatus[] = mainState!.tasks.map((t) => derivedStatusToTaskStatus(t.status));
    const mainProgressBar = formatProgressBar(mainTaskStatuses);
    logger.info(`  Main:     ${mainProgressBar} (${mainStats!.completed}/${mainStats!.total})`);

    const wtTaskStatuses: TaskStatus[] = wtProject!.state.tasks.map((t) => derivedStatusToTaskStatus(t.status));
    const wtProgressBar = formatProgressBar(wtTaskStatuses);
    logger.info(`  Worktree: ${wtProgressBar} (${wtProject!.stats.completed}/${wtProject!.stats.total})`);
  } else if (worktreeOnly) {
    // Show worktree only
    const taskStatuses: TaskStatus[] = wtProject!.state.tasks.map((t) => derivedStatusToTaskStatus(t.status));
    const progressBar = formatProgressBar(taskStatuses);
    logger.info(`${SYMBOLS.project} ${projectName}`);
    logger.info(`${progressBar} (${wtProject!.stats.completed}/${wtProject!.stats.total})`);
  } else {
    // Show main only (no worktree, or worktree is identical)
    const taskStatuses: TaskStatus[] = mainState!.tasks.map((t) => derivedStatusToTaskStatus(t.status));
    const progressBar = formatProgressBar(taskStatuses);
    logger.info(`${SYMBOLS.project} ${projectName}`);
    logger.info(`${progressBar} (${mainStats!.completed}/${mainStats!.total})`);
  }
}

async function listAllProjects(
  rafDir: string,
  options?: StatusCommandOptions,
  wtCtx?: WorktreeContext | null
): Promise<void> {
  const allProjects = discoverProjects(rafDir);

  // Discover worktree projects
  const wtProjectInfos = wtCtx ? discoverWorktreeProjectStates(wtCtx) : [];

  // Build a set of main repo folder names for fast lookup
  const mainFolderNames = new Set(allProjects.map((p) => path.basename(p.path)));

  // Determine which worktree projects to show:
  // - Worktree-only projects (no main repo counterpart) are always shown
  // - Worktree projects that differ from main repo counterpart are shown
  const worktreeToShow: WorktreeProjectInfo[] = [];
  for (const wp of wtProjectInfos) {
    if (!mainFolderNames.has(wp.folder)) {
      // Worktree-only project
      worktreeToShow.push(wp);
    } else {
      // Has main repo counterpart - check if they differ
      const mainProject = allProjects.find((p) => path.basename(p.path) === wp.folder);
      if (mainProject) {
        try {
          const mainState = deriveProjectState(mainProject.path);
          if (projectStatesDiffer(mainState, wp.state)) {
            worktreeToShow.push(wp);
          }
        } catch {
          // If we can't derive main state, show the worktree project
          worktreeToShow.push(wp);
        }
      }
    }
  }

  if (allProjects.length === 0 && worktreeToShow.length === 0) {
    logger.info('No projects found.');
    return;
  }

  if (options?.json) {
    const projectsWithState = allProjects.map((p) => {
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

    const jsonData: Record<string, unknown> = { projects: projectsWithState };
    if (worktreeToShow.length > 0) {
      jsonData.worktrees = worktreeToShow.map((wp) => ({
        folder: wp.folder,
        projectPath: wp.projectPath,
        status: wp.state.status,
        state: wp.state,
        stats: wp.stats,
      }));
    }
    console.log(JSON.stringify(jsonData, null, 2));
    return;
  }

  // Display main repo projects
  if (allProjects.length > 0) {
    // Truncate to last N projects if needed (projects are sorted by number ascending)
    const totalProjects = allProjects.length;
    const hiddenCount = Math.max(0, totalProjects - MAX_DISPLAYED_PROJECTS);
    const displayedProjects = hiddenCount > 0
      ? allProjects.slice(-MAX_DISPLAYED_PROJECTS)
      : allProjects;

    // Show truncation indicator at top if there are hidden projects
    if (hiddenCount > 0) {
      logger.dim(`... and ${hiddenCount} more project${hiddenCount === 1 ? '' : 's'}`);
    }

    for (const project of displayedProjects) {
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

  // Display worktree projects section
  if (worktreeToShow.length > 0) {
    logger.newline();
    logger.info('Worktrees:');
    for (const wp of worktreeToShow) {
      const projectNumber = extractProjectNumber(wp.folder) ?? '???';
      const projectName = extractProjectName(wp.folder) ?? wp.folder;

      const taskStatuses: TaskStatus[] = wp.state.tasks.map((t) => derivedStatusToTaskStatus(t.status));
      const progressBar = formatProgressBar(taskStatuses);
      const counts = `(${wp.stats.completed}/${wp.stats.total})`;

      logger.info(`  ${projectNumber} ${projectName} ${progressBar} ${counts}`);
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
