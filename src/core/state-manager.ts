import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ProjectState,
  TaskState,
  TaskStatus,
  ProjectStatus,
  createInitialState,
  createTask,
} from '../types/state.js';
import { getStatePath, getPlansDir } from '../utils/paths.js';
import { logger } from '../utils/logger.js';

export class StateManager {
  private state: ProjectState;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.state = this.load();
  }

  private load(): ProjectState {
    const statePath = getStatePath(this.projectPath);

    if (!fs.existsSync(statePath)) {
      throw new Error(`State file not found: ${statePath}`);
    }

    const content = fs.readFileSync(statePath, 'utf-8');
    return JSON.parse(content) as ProjectState;
  }

  save(): void {
    const statePath = getStatePath(this.projectPath);
    this.state.updatedAt = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(this.state, null, 2));
  }

  static initialize(projectPath: string, projectName: string, inputFile: string): StateManager {
    const statePath = getStatePath(projectPath);
    const initialState = createInitialState(projectName, inputFile);
    fs.writeFileSync(statePath, JSON.stringify(initialState, null, 2));

    return new StateManager(projectPath);
  }

  getState(): ProjectState {
    return this.state;
  }

  getProjectName(): string {
    return this.state.projectName;
  }

  getStatus(): ProjectStatus {
    return this.state.status;
  }

  setStatus(status: ProjectStatus): void {
    this.state.status = status;
    this.save();
  }

  getTasks(): TaskState[] {
    return this.state.tasks;
  }

  getCurrentTask(): TaskState | null {
    if (this.state.currentTaskIndex >= this.state.tasks.length) {
      return null;
    }
    return this.state.tasks[this.state.currentTaskIndex] ?? null;
  }

  getCurrentTaskIndex(): number {
    return this.state.currentTaskIndex;
  }

  getNextPendingTask(): TaskState | null {
    for (let i = this.state.currentTaskIndex; i < this.state.tasks.length; i++) {
      const task = this.state.tasks[i];
      if (task && (task.status === 'pending' || task.status === 'in_progress')) {
        this.state.currentTaskIndex = i;
        this.save();
        return task;
      }
    }
    return null;
  }

  addTask(id: string, planFile: string): TaskState {
    const task = createTask(id, planFile);
    this.state.tasks.push(task);
    this.save();
    return task;
  }

  updateTaskStatus(taskId: string, status: TaskStatus, extra?: Partial<TaskState>): void {
    const task = this.state.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = status;

    if (status === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date().toISOString();
    }

    if (status === 'completed' || status === 'failed') {
      task.completedAt = new Date().toISOString();
    }

    if (extra) {
      Object.assign(task, extra);
    }

    this.save();
  }

  incrementAttempts(taskId: string): number {
    const task = this.state.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.attempts += 1;
    this.save();
    return task.attempts;
  }

  getConfig(): ProjectState['config'] {
    return this.state.config;
  }

  setConfig(config: Partial<ProjectState['config']>): void {
    this.state.config = { ...this.state.config, ...config };
    this.save();
  }

  /**
   * Scan plans directory and sync tasks with state.
   * Called after planning phase to populate tasks.
   */
  syncTasksFromPlans(): void {
    const plansDir = getPlansDir(this.projectPath);

    if (!fs.existsSync(plansDir)) {
      logger.warn('Plans directory does not exist');
      return;
    }

    const planFiles = fs.readdirSync(plansDir)
      .filter((f) => f.endsWith('.md'))
      .sort();

    // Clear existing tasks and re-populate
    this.state.tasks = [];
    this.state.currentTaskIndex = 0;

    for (const planFile of planFiles) {
      const match = planFile.match(/^(\d{2})-(.+)\.md$/);
      if (match && match[1]) {
        const taskId = match[1];
        this.state.tasks.push(createTask(taskId, path.join('plans', planFile)));
      }
    }

    this.save();
    logger.debug(`Synced ${this.state.tasks.length} tasks from plans`);
  }

  /**
   * Get completion statistics.
   */
  getStats(): { pending: number; inProgress: number; completed: number; failed: number; skipped: number } {
    const stats = {
      pending: 0,
      inProgress: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
    };

    for (const task of this.state.tasks) {
      switch (task.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'in_progress':
          stats.inProgress++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'skipped':
          stats.skipped++;
          break;
      }
    }

    return stats;
  }

  /**
   * Check if all tasks are completed.
   */
  isComplete(): boolean {
    return this.state.tasks.every(
      (t) => t.status === 'completed' || t.status === 'skipped'
    );
  }

  /**
   * Check if any task has failed.
   */
  hasFailed(): boolean {
    return this.state.tasks.some((t) => t.status === 'failed');
  }
}
