import { select } from '@inquirer/prompts';
import { discoverProjects, deriveProjectState, getDerivedStats } from '../core/state-derivation.js';
import { extractProjectNumber, extractProjectName, parseProjectPrefix, formatProjectNumber } from '../utils/paths.js';
import { listWorktreeProjects, computeWorktreePath } from '../core/worktree.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Source of a pending project.
 * - 'local': project lives in the main repo's RAF directory
 * - 'worktree': project lives in a git worktree under ~/.raf/worktrees/
 */
export type ProjectSource = 'local' | 'worktree';

/**
 * Information about a pending project for display in the picker.
 */
export interface PendingProjectInfo {
  folder: string;
  number: number;
  name: string;
  path: string;
  completedTasks: number;
  totalTasks: number;
  source: ProjectSource;
  /** Worktree root directory — only set when source is 'worktree'. */
  worktreeRoot?: string;
}

/**
 * Get all projects that have pending tasks (not fully completed).
 * Returns projects sorted by number (oldest first).
 */
export function getPendingProjects(rafDir: string): PendingProjectInfo[] {
  const allProjects = discoverProjects(rafDir);
  const pendingProjects: PendingProjectInfo[] = [];

  for (const project of allProjects) {
    const state = deriveProjectState(project.path);
    const stats = getDerivedStats(state);

    // Include projects that are not fully completed (have pending or failed tasks)
    if (stats.pending > 0 || stats.failed > 0) {
      const projectNumber = extractProjectNumber(project.path);
      const formattedNumber = projectNumber ?? formatProjectNumber(project.number);

      pendingProjects.push({
        folder: `${formattedNumber}-${project.name}`,
        number: project.number,
        name: project.name,
        path: project.path,
        completedTasks: stats.completed,
        totalTasks: stats.total,
        source: 'local',
      });
    }
  }

  // Sort by number (already sorted by discoverProjects, but ensure it)
  return pendingProjects.sort((a, b) => a.number - b.number);
}

/**
 * Format a project for display in the picker.
 * Example: "aaaaab fix-auth-bug (2/5 tasks)"
 * Worktree projects get a "[worktree]" suffix: "aaaaab my-feature (2/5 tasks) [worktree]"
 */
export function formatProjectChoice(project: PendingProjectInfo): string {
  const projectNumber = extractProjectNumber(project.path) ?? formatProjectNumber(project.number);
  const base = `${projectNumber} ${project.name} (${project.completedTasks}/${project.totalTasks} tasks)`;
  return project.source === 'worktree' ? `${base} [worktree]` : base;
}

/**
 * Get pending worktree projects for the current repo.
 * Scans `~/.raf/worktrees/<repoBasename>/` for projects with pending tasks.
 *
 * @param repoBasename - The basename of the current git repo
 * @param rafRelativePath - The relative path from repo root to the RAF directory (e.g., "RAF")
 * @returns Pending worktree projects sorted by number
 */
export function getPendingWorktreeProjects(
  repoBasename: string,
  rafRelativePath: string,
): PendingProjectInfo[] {
  const wtProjectDirs = listWorktreeProjects(repoBasename);
  const pendingProjects: PendingProjectInfo[] = [];

  for (const wtProjectDir of wtProjectDirs) {
    const numPrefix = extractProjectNumber(wtProjectDir);
    if (!numPrefix) continue;
    const projectNumber = parseProjectPrefix(numPrefix);
    if (projectNumber === null) continue;

    const wtPath = computeWorktreePath(repoBasename, wtProjectDir);
    const wtProjectPath = path.join(wtPath, rafRelativePath, wtProjectDir);

    if (!fs.existsSync(wtProjectPath)) continue;

    const state = deriveProjectState(wtProjectPath);
    if (state.tasks.length === 0) continue;

    const stats = getDerivedStats(state);

    // Include projects that are not fully completed
    if (stats.pending > 0 || stats.failed > 0) {
      const name = extractProjectName(wtProjectDir) ?? wtProjectDir;
      pendingProjects.push({
        folder: wtProjectDir,
        number: projectNumber,
        name,
        path: wtProjectPath,
        completedTasks: stats.completed,
        totalTasks: stats.total,
        source: 'worktree',
        worktreeRoot: wtPath,
      });
    }
  }

  return pendingProjects.sort((a, b) => a.number - b.number);
}

/**
 * Result of the project picker — includes the selected project's folder name
 * and its source metadata so callers know whether to enable worktree mode.
 */
export interface PickerResult {
  folder: string;
  source: ProjectSource;
  worktreeRoot?: string;
}

/**
 * Display an interactive project picker for pending projects.
 * Returns the selected project info or null if no projects or cancelled.
 *
 * @param rafDir - The main repo's RAF directory
 * @param worktreeProjects - Optional worktree projects to merge into the picker
 */
export async function pickPendingProject(
  rafDir: string,
  worktreeProjects?: PendingProjectInfo[],
): Promise<PickerResult | null> {
  const localProjects = getPendingProjects(rafDir);
  const allProjects = [...localProjects, ...(worktreeProjects ?? [])];

  // Deduplicate: if a project folder appears in both local and worktree, keep only worktree
  const seen = new Map<string, PendingProjectInfo>();
  for (const project of allProjects) {
    const existing = seen.get(project.folder);
    if (!existing || project.source === 'worktree') {
      seen.set(project.folder, project);
    }
  }
  const deduped = Array.from(seen.values());

  // Sort chronologically by number
  deduped.sort((a, b) => a.number - b.number);

  if (deduped.length === 0) {
    return null;
  }

  const choices = deduped.map((project) => ({
    name: formatProjectChoice(project),
    value: project,
  }));

  const selected = await select({
    message: 'Select a project to execute:',
    choices,
  });

  return {
    folder: selected.folder,
    source: selected.source,
    worktreeRoot: selected.worktreeRoot,
  };
}
