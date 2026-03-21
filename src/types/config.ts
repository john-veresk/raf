/** CLI harness provider */
export type HarnessProvider = 'claude' | 'codex';

/** Short alias for a Claude model family */
export type ClaudeModelAlias = 'sonnet' | 'haiku' | 'opus';

/** Short alias for a Codex model family */
export type CodexModelAlias = 'spark' | 'codex' | 'gpt54';

/** Provider-agnostic model alias (union of all provider aliases) */
export type ModelAlias = ClaudeModelAlias | CodexModelAlias;

/**
 * Accepts short aliases (`sonnet`, `haiku`, `opus`) or full model IDs
 * matching the pattern `claude-{family}-{version}` (e.g., `claude-opus-4-5-20251101`).
 * Also accepts harness-prefixed format: `claude/opus`, `codex/gpt-5.4`.
 */
export type ClaudeModelName = ClaudeModelAlias | (string & { __brand?: 'FullModelId' });

/** Provider-agnostic model name — accepts any alias, full ID, or harness-prefixed format */
export type ModelName = string & { __brand?: 'ModelName' };

/** Task complexity label for per-task effort frontmatter. Maps to models via effortMapping. */
export type TaskEffortLevel = 'low' | 'medium' | 'high';

export type ModelScenario = 'plan' | 'execute' | 'nameGeneration' | 'failureAnalysis' | 'prGeneration' | 'config';
export type CommitFormatType = 'task' | 'plan' | 'amend';

/**
 * A provider-aware model configuration entry.
 * Stores model, provider, and optional reasoning effort together.
 */
export interface ModelEntry {
  /** Model name: short alias (opus, sonnet, gpt-5.4) or full ID */
  model: string;
  /** Which CLI provider to use for this entry */
  provider: HarnessProvider;
  /** Optional reasoning effort hint. Codex accepts: "none", "minimal", "low", "medium", "high", "xhigh" */
  reasoningEffort?: string;
}

export interface ModelsConfig {
  plan: ModelEntry;
  execute: ModelEntry;
  nameGeneration: ModelEntry;
  failureAnalysis: ModelEntry;
  prGeneration: ModelEntry;
  config: ModelEntry;
}

/**
 * Maps task complexity labels to provider-aware model entries.
 * Used to resolve per-task effort frontmatter to a model.
 */
export interface EffortMappingConfig {
  low: ModelEntry;
  medium: ModelEntry;
  high: ModelEntry;
}

export interface CommitFormatConfig {
  task: string;
  plan: string;
  amend: string;
  prefix: string;
}

/** Display options for token usage summaries. */
export interface DisplayConfig {
  /** Show cache token counts in summaries. Default: true */
  showCacheTokens: boolean;
}

export interface RafConfig {
  models: ModelsConfig;
  /** Maps task complexity labels (low/medium/high) to model entries. Used for per-task effort frontmatter. */
  effortMapping: EffortMappingConfig;
  timeout: number;
  maxRetries: number;
  autoCommit: boolean;
  worktree: boolean;
  /** Sync main branch with remote before worktree/PR operations. Default: true */
  syncMainBranch: boolean;
  commitFormat: CommitFormatConfig;
  display: DisplayConfig;
}

export const DEFAULT_CONFIG: RafConfig = {
  models: {
    plan: { model: 'opus', provider: 'claude' },
    execute: { model: 'opus', provider: 'claude' },
    nameGeneration: { model: 'sonnet', provider: 'claude' },
    failureAnalysis: { model: 'haiku', provider: 'claude' },
    prGeneration: { model: 'sonnet', provider: 'claude' },
    config: { model: 'sonnet', provider: 'claude' },
  },
  effortMapping: {
    low: { model: 'sonnet', provider: 'claude' },
    medium: { model: 'opus', provider: 'claude' },
    high: { model: 'opus', provider: 'claude' },
  },
  timeout: 60,
  maxRetries: 3,
  autoCommit: true,
  worktree: false,
  syncMainBranch: true,
  commitFormat: {
    task: '{prefix}[{projectId}:{taskId}] {description}',
    plan: '{prefix}[{projectId}] Plan: {projectName}',
    amend: '{prefix}[{projectId}] Amend: {projectName}',
    prefix: 'RAF',
  },
  display: {
    showCacheTokens: true,
  },
};

/** Deep partial type for user config files — all fields optional at every level */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type UserConfig = DeepPartial<RafConfig>;

export const VALID_MODEL_ALIASES: readonly ClaudeModelAlias[] = ['sonnet', 'haiku', 'opus'];

export const VALID_CODEX_MODEL_ALIASES: readonly CodexModelAlias[] = ['spark', 'codex', 'gpt54'];

export const VALID_HARNESS_PROVIDERS: readonly HarnessProvider[] = ['claude', 'codex'];

/**
 * Regex for full Claude model IDs (e.g., `claude-sonnet-4-5-20250929`, `claude-opus-4-5-20251101`).
 * Pattern: claude-{family}-{major}(-{minor})?(-{date})?
 */
export const FULL_MODEL_ID_PATTERN = /^claude-[a-z]+-\d+(-\d+)*$/;

/** @deprecated Use VALID_MODEL_ALIASES instead */
export const VALID_MODELS = VALID_MODEL_ALIASES;

/** Valid task effort levels for plan frontmatter. */
export const VALID_TASK_EFFORTS: readonly TaskEffortLevel[] = ['low', 'medium', 'high'];

// Keep backward-compat exports used by other modules
/** @deprecated Use DEFAULT_CONFIG instead */
export const DEFAULT_RAF_CONFIG = {
  defaultTimeout: DEFAULT_CONFIG.timeout,
  defaultMaxRetries: DEFAULT_CONFIG.maxRetries,
  autoCommit: DEFAULT_CONFIG.autoCommit,
};

export interface PlanCommandOptions {
  projectName?: string;
  provider?: HarnessProvider;
}

export interface DoCommandOptions {
  timeout?: number;
  verbose?: boolean;
  debug?: boolean;
  force?: boolean;
  provider?: HarnessProvider;
}

export interface StatusCommandOptions {
  json?: boolean;
}

/** Per-model token usage breakdown from stream-json result event. */
export interface ModelTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  /** Cost in USD for this model's usage (provided by Claude CLI). */
  costUsd: number;
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
  /** Total cost in USD for this usage (provided by Claude CLI). */
  totalCostUsd: number;
}
