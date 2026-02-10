/** Short alias for a Claude model family */
export type ClaudeModelAlias = 'sonnet' | 'haiku' | 'opus';

/**
 * Accepts short aliases (`sonnet`, `haiku`, `opus`) or full model IDs
 * matching the pattern `claude-{family}-{version}` (e.g., `claude-opus-4-5-20251101`).
 */
export type ClaudeModelName = ClaudeModelAlias | (string & { __brand?: 'FullModelId' });
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

export const VALID_MODEL_ALIASES: readonly ClaudeModelAlias[] = ['sonnet', 'haiku', 'opus'];

/**
 * Regex for full Claude model IDs (e.g., `claude-sonnet-4-5-20250929`, `claude-opus-4-5-20251101`).
 * Pattern: claude-{family}-{major}(-{minor})?(-{date})?
 */
export const FULL_MODEL_ID_PATTERN = /^claude-[a-z]+-\d+(-\d+)*$/;

/** @deprecated Use VALID_MODEL_ALIASES instead */
export const VALID_MODELS = VALID_MODEL_ALIASES;
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

/** Per-model token usage breakdown from stream-json result event. */
export interface ModelTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

/** Token usage data extracted from Claude CLI stream-json result event. */
export interface UsageData {
  /** Aggregate token counts across all models. */
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  /** Per-model breakdown (e.g., { "claude-opus-4-6": { ... } }). */
  modelUsage: Record<string, ModelTokenUsage>;
}
