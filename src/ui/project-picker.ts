import { select } from '@inquirer/prompts';
import { discoverProjects, deriveProjectState, getDerivedStats } from '../core/state-derivation.js';
import { extractProjectNumber, formatProjectNumber } from '../utils/paths.js';

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
      });
    }
  }

  // Sort by number (already sorted by discoverProjects, but ensure it)
  return pendingProjects.sort((a, b) => a.number - b.number);
}

/**
 * Format a project for display in the picker.
 * Example: "001 fix-auth-bug (2/5 tasks)"
 */
export function formatProjectChoice(project: PendingProjectInfo): string {
  const projectNumber = extractProjectNumber(project.path) ?? formatProjectNumber(project.number);
  return `${projectNumber} ${project.name} (${project.completedTasks}/${project.totalTasks} tasks)`;
}

/**
 * Display an interactive project picker for pending projects.
 * Returns the selected project folder name or null if no projects or cancelled.
 */
export async function pickPendingProject(rafDir: string): Promise<string | null> {
  const pendingProjects = getPendingProjects(rafDir);

  if (pendingProjects.length === 0) {
    return null;
  }

  const choices = pendingProjects.map((project) => ({
    name: formatProjectChoice(project),
    value: project.folder,
  }));

  const selected = await select({
    message: 'Select a project to execute:',
    choices,
  });

  return selected;
}
