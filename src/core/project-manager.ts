import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  getRafDir,
  ensureRafDir,
  getNextProjectNumber,
  formatProjectNumber,
  getProjectDir,
  getPlansDir,
  getOutcomesDir,
  getDecisionsDir,
  getInputPath,
  getSummaryPath,
  listProjects,
  extractProjectName,
} from '../utils/paths.js';
import { sanitizeProjectName } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import {
  deriveProjectState,
  getDerivedStats,
  type DerivedProjectState,
} from './state-derivation.js';

export interface ProjectInfo {
  number: number;
  name: string;
  path: string;
  taskCount?: number;
  completedCount?: number;
  failedCount?: number;
}

export class ProjectManager {
  private rafDir: string;

  constructor() {
    this.rafDir = getRafDir();
  }

  /**
   * Create a new project folder with initial structure.
   * Returns the project path.
   */
  createProject(projectName: string): string {
    ensureRafDir();

    const sanitizedName = sanitizeProjectName(projectName);
    const projectNumber = getNextProjectNumber(this.rafDir);
    const folderName = `${formatProjectNumber(projectNumber)}-${sanitizedName}`;
    const projectPath = path.join(this.rafDir, folderName);

    // Create directory structure
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(getPlansDir(projectPath), { recursive: true });
    fs.mkdirSync(getOutcomesDir(projectPath), { recursive: true });
    fs.mkdirSync(getDecisionsDir(projectPath), { recursive: true });

    logger.debug(`Created project at ${projectPath}`);

    return projectPath;
  }

  /**
   * Find an existing project by name.
   */
  findProject(projectName: string): string | null {
    return getProjectDir(this.rafDir, projectName);
  }

  /**
   * List all projects with derived state information.
   */
  listProjects(): ProjectInfo[] {
    const projects = listProjects(this.rafDir);

    return projects.map((p) => {
      const info: ProjectInfo = {
        number: p.number,
        name: p.name,
        path: p.path,
      };

      // Derive state from folder structure
      try {
        const state = deriveProjectState(p.path);
        const stats = getDerivedStats(state);
        info.taskCount = stats.total;
        info.completedCount = stats.completed;
        info.failedCount = stats.failed;
      } catch {
        // Failed to derive state
      }

      return info;
    });
  }

  /**
   * Save user input to input.md.
   */
  saveInput(projectPath: string, content: string): void {
    const inputPath = getInputPath(projectPath);
    fs.writeFileSync(inputPath, content);
    logger.debug(`Saved input to ${inputPath}`);
  }

  /**
   * Read user input from input.md.
   */
  readInput(projectPath: string): string {
    const inputPath = getInputPath(projectPath);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }
    return fs.readFileSync(inputPath, 'utf-8');
  }

  /**
   * Save an outcome file for a completed task.
   */
  saveOutcome(projectPath: string, taskId: string, content: string): void {
    const outcomesDir = getOutcomesDir(projectPath);
    if (!fs.existsSync(outcomesDir)) {
      fs.mkdirSync(outcomesDir, { recursive: true });
    }

    // Find the plan file name to match naming convention
    const plansDir = getPlansDir(projectPath);
    const planFiles = fs.readdirSync(plansDir);
    const planFile = planFiles.find((f) => f.startsWith(`${taskId}-`));
    const outcomeName = planFile ?? `${taskId}-task.md`;

    const outcomePath = path.join(outcomesDir, outcomeName);
    fs.writeFileSync(outcomePath, content);
    logger.debug(`Saved outcome to ${outcomePath}`);
  }

  /**
   * Read all outcomes for context.
   */
  readOutcomes(projectPath: string): Array<{ taskId: string; content: string }> {
    const outcomesDir = getOutcomesDir(projectPath);
    if (!fs.existsSync(outcomesDir)) {
      return [];
    }

    const outcomes: Array<{ taskId: string; content: string }> = [];
    const files = fs.readdirSync(outcomesDir).filter((f) => f.endsWith('.md')).sort();

    for (const file of files) {
      const match = file.match(/^(\d{2,3})-/);
      if (match && match[1]) {
        const content = fs.readFileSync(path.join(outcomesDir, file), 'utf-8');
        outcomes.push({ taskId: match[1], content });
      }
    }

    return outcomes;
  }

  /**
   * Save a log file to the project's logs directory.
   */
  saveLog(projectPath: string, taskId: string, content: string): void {
    const logsDir = path.join(projectPath, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logPath = path.join(logsDir, `${taskId}-task.log`);
    fs.writeFileSync(logPath, content);
    logger.debug(`Saved log to ${logPath}`);
  }

  /**
   * Generate and save SUMMARY.md from derived state.
   */
  saveSummary(projectPath: string, state: DerivedProjectState): void {
    const stats = getDerivedStats(state);
    const projectName = extractProjectName(projectPath) ?? 'Unknown';

    // Ensure outcomes directory exists
    const outcomesDir = getOutcomesDir(projectPath);
    if (!fs.existsSync(outcomesDir)) {
      fs.mkdirSync(outcomesDir, { recursive: true });
    }

    const summaryPath = getSummaryPath(projectPath);
    const now = new Date().toISOString();

    let content = `# Project Summary: ${projectName}\n\n`;
    content += `**Generated:** ${now}\n\n`;

    content += `## Statistics\n\n`;
    content += `- Total: ${stats.total}\n`;
    content += `- Completed: ${stats.completed}\n`;
    content += `- Failed: ${stats.failed}\n`;
    content += `- Pending: ${stats.pending}\n\n`;

    content += `## Tasks\n\n`;

    for (const task of state.tasks) {
      const statusBadge = this.getStatusBadge(task.status);
      content += `### ${statusBadge} Task ${task.id}\n\n`;
      content += `- **Plan:** ${task.planFile}\n`;
      content += `- **Status:** ${task.status}\n`;
      content += '\n';
    }

    fs.writeFileSync(summaryPath, content);
    logger.debug(`Saved summary to ${summaryPath}`);
  }

  private getStatusBadge(status: string): string {
    switch (status) {
      case 'pending':
        return '[ ]';
      case 'completed':
        return '[x]';
      case 'failed':
        return '[!]';
      default:
        return '[?]';
    }
  }

  /**
   * Read a plan file.
   */
  readPlan(projectPath: string, planFile: string): string {
    const planPath = path.join(projectPath, planFile);
    if (!fs.existsSync(planPath)) {
      throw new Error(`Plan file not found: ${planPath}`);
    }
    return fs.readFileSync(planPath, 'utf-8');
  }

  /**
   * Get absolute path to a plan file.
   */
  getPlanPath(projectPath: string, planFile: string): string {
    return path.join(projectPath, planFile);
  }

  /**
   * Ensure logs directory exists in project folder.
   */
  ensureLogsDir(projectPath: string): void {
    const logsDir = path.join(projectPath, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  /**
   * Check if a project folder is empty (contains no plan files).
   * Returns true if the folder has no plan files, false otherwise.
   */
  isProjectFolderEmpty(projectPath: string): boolean {
    if (!fs.existsSync(projectPath)) {
      return true;
    }

    const plansDir = getPlansDir(projectPath);

    // If plans directory doesn't exist, consider it empty
    if (!fs.existsSync(plansDir)) {
      return true;
    }

    // Check if there are any .md files in the plans directory
    const planFiles = fs.readdirSync(plansDir).filter((f) => f.endsWith('.md'));
    return planFiles.length === 0;
  }

  /**
   * Clean up an empty project folder.
   * Only removes the folder if it contains no plan files.
   * This is idempotent - safe to call multiple times.
   */
  cleanupEmptyProject(projectPath: string): void {
    if (!fs.existsSync(projectPath)) {
      logger.debug(`Project folder does not exist: ${projectPath}`);
      return;
    }

    if (!this.isProjectFolderEmpty(projectPath)) {
      logger.debug(`Project folder is not empty (has plans), skipping cleanup: ${projectPath}`);
      return;
    }

    try {
      fs.rmSync(projectPath, { recursive: true, force: true });
      logger.debug(`Cleaned up empty project folder: ${projectPath}`);
    } catch (error) {
      logger.warn(`Failed to clean up empty project folder: ${error}`);
    }
  }
}
