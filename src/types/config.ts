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

/** Pricing category derived from model family name. */
export type PricingCategory = 'opus' | 'sonnet' | 'haiku';

/** Per-direction pricing for a single model category, in dollars per million tokens. */
export interface ModelPricing {
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok: number;
  cacheCreatePerMTok: number;
}

/** Pricing config: per-category pricing in dollars per million tokens. */
export interface PricingConfig {
  opus: ModelPricing;
  sonnet: ModelPricing;
  haiku: ModelPricing;
}

/** Display options for token usage summaries. */
export interface DisplayConfig {
  /** Show estimated 5h rate limit window percentage. Default: true */
  showRateLimitEstimate: boolean;
  /** Show cache token counts in summaries. Default: true */
  showCacheTokens: boolean;
}

/** Rate limit window configuration. */
export interface RateLimitWindowConfig {
  /** Sonnet-equivalent token cap for the 5h window. Default: 88000 */
  sonnetTokenCap: number;
}

export interface RafConfig {
  models: ModelsConfig;
  effort: EffortConfig;
  timeout: number;
  maxRetries: number;
  autoCommit: boolean;
  worktree: boolean;
  /** Sync main branch with remote before worktree/PR operations. Default: true */
  syncMainBranch: boolean;
  commitFormat: CommitFormatConfig;
  pricing: PricingConfig;
  display: DisplayConfig;
  rateLimitWindow: RateLimitWindowConfig;
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
  syncMainBranch: true,
  commitFormat: {
    task: '{prefix}[{projectId}:{taskId}] {description}',
    plan: '{prefix}[{projectId}] Plan: {projectName}',
    amend: '{prefix}[{projectId}] Amend: {projectName}',
    prefix: 'RAF',
  },
  pricing: {
    opus: {
      inputPerMTok: 15,
      outputPerMTok: 75,
      cacheReadPerMTok: 1.5,
      cacheCreatePerMTok: 18.75,
    },
    sonnet: {
      inputPerMTok: 3,
      outputPerMTok: 15,
      cacheReadPerMTok: 0.3,
      cacheCreatePerMTok: 3.75,
    },
    haiku: {
      inputPerMTok: 1,
      outputPerMTok: 5,
      cacheReadPerMTok: 0.1,
      cacheCreatePerMTok: 1.25,
    },
  },
  display: {
    showRateLimitEstimate: true,
    showCacheTokens: true,
  },
  rateLimitWindow: {
    sonnetTokenCap: 88000,
  },
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
