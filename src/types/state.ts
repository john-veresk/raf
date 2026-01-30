export type ProjectStatus = 'planning' | 'ready' | 'executing' | 'completed' | 'failed';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface TaskState {
  id: string;
  planFile: string;
  status: TaskStatus;
  attempts: number;
  startedAt?: string;
  completedAt?: string;
  failureReason?: string;
  commitHash?: string;
  filesBeforeTask?: string[];
}

export interface ProjectConfig {
  timeout: number; // in minutes
  maxRetries: number;
  autoCommit: boolean;
}

export interface ProjectState {
  version: 1;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  inputFile: string;
  status: ProjectStatus;
  tasks: TaskState[];
  currentTaskIndex: number;
  config: ProjectConfig;
}

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  timeout: 60,
  maxRetries: 3,
  autoCommit: true,
};

export function createInitialState(projectName: string, inputFile: string): ProjectState {
  const now = new Date().toISOString();
  return {
    version: 1,
    projectName,
    createdAt: now,
    updatedAt: now,
    inputFile,
    status: 'planning',
    tasks: [],
    currentTaskIndex: 0,
    config: { ...DEFAULT_PROJECT_CONFIG },
  };
}

export function createTask(id: string, planFile: string): TaskState {
  return {
    id,
    planFile,
    status: 'pending',
    attempts: 0,
  };
}
