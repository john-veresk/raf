export type ClaudeModelName = 'sonnet' | 'haiku' | 'opus';
export type EffortLevel = 'low' | 'medium' | 'high';

export type ModelScenario = 'plan' | 'execute' | 'nameGeneration' | 'failureAnalysis' | 'prGeneration' | 'config';
export type EffortScenario = ModelScenario;
export type CommitFormatType = 'task' | 'plan' | 'amend';

export interface ModelsConfig {
  plan: ClaudeModelName;
  execute: ClaudeModelName;
  nameGeneration: ClaudeModelName;
  failureAnalysis: ClaudeModelName;
  prGeneration: ClaudeModelName;
  config: ClaudeModelName;
}

export interface EffortConfig {
  plan: EffortLevel;
  execute: EffortLevel;
  nameGeneration: EffortLevel;
  failureAnalysis: EffortLevel;
  prGeneration: EffortLevel;
  config: EffortLevel;
}

export interface CommitFormatConfig {
  task: string;
  plan: string;
  amend: string;
  prefix: string;
}

export interface RafConfig {
  models: ModelsConfig;
  effort: EffortConfig;
  timeout: number;
  maxRetries: number;
  autoCommit: boolean;
  worktree: boolean;
  commitFormat: CommitFormatConfig;
  claudeCommand: string;
}

export const DEFAULT_CONFIG: RafConfig = {
  models: {
    plan: 'opus',
    execute: 'opus',
    nameGeneration: 'sonnet',
    failureAnalysis: 'haiku',
    prGeneration: 'sonnet',
    config: 'sonnet',
  },
  effort: {
    plan: 'high',
    execute: 'medium',
    nameGeneration: 'low',
    failureAnalysis: 'low',
    prGeneration: 'medium',
    config: 'medium',
  },
  timeout: 60,
  maxRetries: 3,
  autoCommit: true,
  worktree: false,
  commitFormat: {
    task: '{prefix}[{projectId}:{taskId}] {description}',
    plan: '{prefix}[{projectId}] Plan: {projectName}',
    amend: '{prefix}[{projectId}] Amend: {projectName}',
    prefix: 'RAF',
  },
  claudeCommand: 'claude',
};

/** Deep partial type for user config files — all fields optional at every level */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type UserConfig = DeepPartial<RafConfig>;

export const VALID_MODELS: readonly ClaudeModelName[] = ['sonnet', 'haiku', 'opus'];
export const VALID_EFFORTS: readonly EffortLevel[] = ['low', 'medium', 'high'];

// Keep backward-compat exports used by other modules
/** @deprecated Use DEFAULT_CONFIG instead */
export const DEFAULT_RAF_CONFIG = {
  defaultTimeout: DEFAULT_CONFIG.timeout,
  defaultMaxRetries: DEFAULT_CONFIG.maxRetries,
  autoCommit: DEFAULT_CONFIG.autoCommit,
  claudeCommand: DEFAULT_CONFIG.claudeCommand,
};

export interface PlanCommandOptions {
  projectName?: string;
  model?: ClaudeModelName;
  sonnet?: boolean;
}

export interface DoCommandOptions {
  timeout?: number;
  verbose?: boolean;
  debug?: boolean;
  force?: boolean;
  model?: ClaudeModelName;
  sonnet?: boolean;
  worktree?: boolean;
}

export interface StatusCommandOptions {
  json?: boolean;
}

export interface MigrateCommandOptions {
  dryRun?: boolean;
  worktree?: boolean;
}
